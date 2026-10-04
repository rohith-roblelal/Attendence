const http = require('http');

const API_URL = 'http://localhost:3001/api/v1';

async function request(method, path, data, cookie, origin) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (cookie) options.headers['Cookie'] = cookie;
  if (data) options.body = JSON.stringify(data);
  if (origin) options.headers['Origin'] = origin;

  const res = await fetch(`${API_URL}${path}`, options);
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch (e) { json = { text }; }
  
  let cookies = [];
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookies = setCookie.split(',').map(s => s.split(';')[0]);

  return { status: res.status, json, cookies: cookies[0], headers: res.headers };
}

async function runTests() {
  console.log('Starting Phase 2.1 Security Tests...');
  const results = [];

  // Logins
  const rAdmin = await request('POST', '/auth/login', { username: 'admin', password: 'password123' });
  const adminCookie = rAdmin.cookies;
  
  const rTeacherA = await request('POST', '/auth/login', { username: 'teacher_a', password: 'password123' });
  const teacherACookie = rTeacherA.cookies;

  const rTeacherB = await request('POST', '/auth/login', { username: 'teacher_b', password: 'password123' });
  const teacherBCookie = rTeacherB.cookies;

  const rStudentA = await request('POST', '/auth/login', { username: 'student_a', password: 'password123' });
  const studentACookie = rStudentA.cookies;

  const rStudentB = await request('POST', '/auth/login', { username: 'student_b', password: 'password123' });
  const studentBCookie = rStudentB.cookies;

  console.log({adminStatus: rAdmin.status, stuStatus: rStudentA.status});

  // 1. Student IDOR (Real cross-student)
  const stuInfo = await request('GET', '/dashboard/student', null, studentBCookie);
  const stuB_id = stuInfo.json?.data?.student?.id || 2;
  const rStuA_StuB = await request('GET', `/students/${stuB_id}/attendance`, null, studentACookie);
  results.push({ test: 'Student A -> Student B', expected: 403, actual: rStuA_StuB.status, pass: [403, 404].includes(rStuA_StuB.status) });

  // 2. Teacher IDOR (Real cross-teacher)
  const tbSessions = await request('GET', '/dashboard/teacher/sessions', null, teacherBCookie);
  const tbSessionId = tbSessions.json?.data?.sessions?.[0]?.id || 999;
  const rTeacherA_SessionB = await request('GET', `/class-sessions/${tbSessionId}`, null, teacherACookie);
  results.push({ test: 'Teacher A -> Teacher B Session', expected: 403, actual: rTeacherA_SessionB.status, pass: [403, 404].includes(rTeacherA_SessionB.status) });

  // 3. Admin Boundaries
  const rTeacher_AdminMut = await request('POST', '/departments', { name: 'HackDept', code: 'HCK' }, teacherACookie);
  results.push({ test: 'Teacher -> Admin Mutation', expected: 403, actual: rTeacher_AdminMut.status, pass: [401, 403, 404].includes(rTeacher_AdminMut.status) });

  // 4. CORS
  const cors1 = await request('GET', '/health', null, null, 'http://localhost:3000');
  const cors2 = await request('GET', '/health', null, null, 'http://evil.com');
  results.push({ test: 'CORS valid origin', pass: cors1.headers.get('access-control-allow-origin') === 'http://localhost:3000' });
  results.push({ test: 'CORS invalid origin', pass: cors2.headers.get('access-control-allow-origin') !== 'http://evil.com' });

  // 5. Concurrency Duplicate Attendance
  const taSessions = await request('GET', '/dashboard/teacher/sessions', null, teacherACookie);
  const taSessionId = taSessions.json?.data?.sessions?.[0]?.id;
  if(taSessionId) {
    const payloads = Array(5).fill(0).map(() => request('POST', `/attendance/bulk`, {
      class_session_id: taSessionId,
      records: [{ student_id: 1, status: 'PRESENT' }]
    }, teacherACookie));
    const resps = await Promise.all(payloads);
    const successes = resps.filter(r => r.status === 201 || r.status === 200).length;
    results.push({ test: 'Concurrency Duplicate Att', pass: successes <= 1 });
  } else {
    results.push({ test: 'Concurrency Duplicate Att', pass: 'NOT TESTED (no session)' });
  }

  // 6. Expired JWT
  const rExp = await request('GET', '/dashboard/admin', null, 'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6IkFETUlOSVNUUkFUSU9OIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.X');
  results.push({ test: 'Expired/Invalid Signature JWT', expected: 401, actual: rExp.status, pass: rExp.status === 401 });

  console.table(results);
}
runTests();
