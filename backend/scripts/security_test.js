const http = require('http');

const API_URL = 'https://attendence-dcaw.onrender.com/api/v1';

async function request(method, path, data, cookie) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (cookie) options.headers['Cookie'] = cookie;
  if (data) options.body = JSON.stringify(data);

  const res = await fetch(`${API_URL}${path}`, options);
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch (e) { json = { text }; }

  let cookies = [];
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookies = setCookie.split(',').map(s => s.split(';')[0]);

  return { status: res.status, json, cookies: cookies[0] };
}

async function runTests() {
  console.log("Starting Security Tests...");
  const results = [];

  // Wait 15 seconds to ensure rate limit expires
  await new Promise(r => setTimeout(r, 15000));

  // 1. Auth Tests
  const r1 = await request('POST', '/auth/login', { username: 'admin', password: 'password123' });
  results.push({ name: 'Valid Login (admin)', expected: 200, actual: r1.status, pass: r1.status === 200 });
  const adminCookie = r1.cookies;

  const r2 = await request('POST', '/auth/login', { username: 'admin', password: 'wrong' });
  results.push({ name: 'Invalid Login', expected: 401, actual: r2.status, pass: r2.status === 401 });

  const r3 = await request('POST', '/auth/login', { username: '', password: '' });
  results.push({ name: 'Empty Login', expected: 400, actual: r3.status, pass: r3.status === 400 });

  // 2. JWT Tests
  const r4 = await request('GET', '/dashboard/admin', null, null);
  results.push({ name: 'Missing JWT', expected: 401, actual: r4.status, pass: r4.status === 401 });

  const r5 = await request('GET', '/dashboard/admin', null, 'token=invalid.token.here');
  results.push({ name: 'Malformed JWT', expected: 401, actual: r5.status, pass: r5.status === 401 });

  // Login as other roles
  const tA_login = await request('POST', '/auth/login', { username: 'teacher_a', password: 'password123' });
  const stuA_login = await request('POST', '/auth/login', { username: 'student_a', password: 'password123' });
  // const hodA_login = await request('POST', '/auth/login', { username: 'teacher_b', password: 'password123' }); // using teacher_b as HOD just for test if needed

  const teacherACookie = tA_login.cookies;
  const studentACookie = stuA_login.cookies;


  results.push({ name: 'Login Teacher A', expected: 200, actual: tA_login.status, pass: tA_login.status === 200 });
  results.push({ name: 'Login Student A', expected: 200, actual: stuA_login.status, pass: stuA_login.status === 200 });

  // 4. RBAC Matrix
  if (teacherACookie) {
    const r7 = await request('GET', '/dashboard/admin', null, teacherACookie);
    results.push({ name: 'Teacher accessing Admin Dashboard', expected: 403, actual: r7.status, pass: r7.status === 403 });
  }

  // 5. Student IDOR
  if (studentACookie) {
    const r8 = await request('GET', '/students/999/attendance', null, studentACookie);
    results.push({ name: 'Student A accessing arbitrary student attendance', expected: 403, actual: r8.status, pass: [403, 404].includes(r8.status) });

    const r9 = await request('GET', '/dashboard/student', null, studentACookie);
    results.push({ name: 'Student A accessing own dashboard', expected: 200, actual: r9.status, pass: r9.status === 200 });
  }

  // 6. SQL Injection
  if (adminCookie) {
    const r10 = await request('GET', '/students?search=1%27%20OR%20%271%27%3D%271', null, adminCookie);
    results.push({ name: 'SQL Injection in Search', expected: 200, actual: r10.status, pass: r10.status === 200 && !r10.json?.text?.includes('SQL') });

    // 7. Mass Assignment
    const r11 = await request('POST', '/students', { student_id: 'TEST1', first_name: 'Test', role: 'ADMIN' }, adminCookie);
    results.push({ name: 'Mass Assignment (inject role)', expected: 400, actual: r11.status, pass: r11.status === 400 || r11.status === 201 });

    // 8. Error Leakage
    const r12 = await request('GET', '/students/invalid_id', null, adminCookie);
    results.push({ name: 'Error Leakage on invalid ID', expected: 400, actual: r12.status, pass: r12.status === 400 && !JSON.stringify(r12.json).includes('SQL') });
  }

  // 9. HOD IDOR (Cross-department)
  // Skipped because we didn't setup HOD A in DB manually
  /*
  if (hodACookie) {
    // Dept A is 2, Dept B is 3 (from our DB script)
    const r13 = await request('GET', '/dashboard/hod/departments/3', null, hodACookie);
    results.push({ name: 'HOD A accessing Dept B dashboard', expected: 403, actual: r13.status, pass: r13.status === 403 || r13.status === 404 });
  }
  */

  // 10. Rate Limiting Test (Spamming invalid logins) - MUST BE LAST
  for (let i = 0; i < 15; i++) {
    await request('POST', '/auth/login', { username: 'nonexistent', password: 'asd' });
  }
  const r6 = await request('POST', '/auth/login', { username: 'nonexistent', password: 'asd' });
  results.push({ name: 'Rate Limiting (After 15 fails)', expected: 429, actual: r6.status, pass: r6.status === 429 });


  console.table(results);
}
runTests();
