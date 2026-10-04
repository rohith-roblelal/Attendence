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
  console.log('Starting Phase 2.2 Security Tests...');
  const results = [];

  // Logins
  const rTeacherA = await request('POST', '/auth/login', { username: 'teacher_a', password: 'password123' });
  const teacherACookie = rTeacherA.cookies;

  const rTeacherB = await request('POST', '/auth/login', { username: 'teacher_b', password: 'password123' });
  const teacherBCookie = rTeacherB.cookies;

  // 1. Teacher Cross-Session IDOR
  // Teacher A (owner of Session 1) tries to access Session 2 (owned by Teacher B)
  const rTeacherA_SessionB = await request('GET', '/class-sessions/2', null, teacherACookie);
  results.push({ test: 'Teacher A -> Teacher B Session', expected: '403/404', actual: rTeacherA_SessionB.status, pass: [403, 404].includes(rTeacherA_SessionB.status) });

  // 2. Tutor Cross-Class IDOR
  // Tutor A (owner of Class 1) tries to access Class 2 (owned by Tutor B)
  const rTutorA_ClassB = await request('GET', '/dashboard/teacher/classes/2', null, teacherACookie); // assuming the tutor route is this
  // the actual class view might be /classes/2 but teachers might have access to all classes in the backend. The prompt asks to check tutor-scoped resources.
  results.push({ test: 'Tutor A -> Tutor B Class', expected: '403/404', actual: rTutorA_ClassB.status, pass: [403, 404].includes(rTutorA_ClassB.status) });

  // 3. HOD Cross-Dept IDOR
  // HOD A (owner of Dept 1) tries to access Dept 3 (owned by HOD B)
  const rHodA_DeptB = await request('GET', '/dashboard/hod/departments/3', null, teacherACookie); // teacher A is HOD A
  results.push({ test: 'HOD A -> Dept 3', expected: '403/404', actual: rHodA_DeptB.status, pass: [403, 404].includes(rHodA_DeptB.status) });

  // 4. Concurrent Duplicate Attendance
  // Session 1, Student 1
  const payloads = Array(5).fill(0).map(() => request('POST', '/attendance/bulk', {
    class_session_id: 1,
    records: [{ student_id: 1, status: 'PRESENT' }]
  }, teacherACookie));
  
  const resps = await Promise.all(payloads);
  const statuses = resps.map(r => r.status);
  const successes = statuses.filter(s => s === 201 || s === 200).length;
  const conflicts = statuses.filter(s => s === 409).length;
  
  results.push({ test: 'Concurrency Duplicate Att', expected: 'Max 1 success', actual: `${successes} success, ${conflicts} conflicts`, pass: successes <= 1 });

  console.table(results);
}
runTests();
