const mysql = require('mysql2/promise');

const API_URL = 'http://localhost:3001/api/v1';

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

async function runPhase3_1() {
  console.log('Starting Phase 3.1 Strict API E2E Verification...');
  const results = [];
  let dbConn = await mysql.createConnection({host: '127.0.0.1', user: 'root', password: '', database: 'college_attendance'});
  
  const extractId = (res) => res?.data?.id || res?.id || res?.data?.[Object.keys(res.data)[0]]?.id || null;

  try {
    // 0. Login
    const rAdmin = await request('POST', '/auth/login', { username: 'admin', password: 'password123' });
    const adminToken = rAdmin.cookies;

    const rTeacher = await request('POST', '/auth/login', { username: 'teacher_a', password: 'password123' });
    const teacherToken = rTeacher.cookies;

    const ts = Date.now().toString().slice(-6); // short unique

    // 1. Academic Year
    const rAY = await request('POST', '/academic-years', { name: `AY202${ts}`, start_date: '2026-08-01', end_date: '2027-05-31', is_active: true }, adminToken);
    results.push({ step: '1. Create Academic Year', expected: 201, actual: rAY.status, pass: rAY.status === 201 });
    const ayId = extractId(rAY.json);

    // 2. Department
    const rDept = await request('POST', '/departments', { name: `Dept ${ts}`, code: `D${ts}`, is_active: true }, adminToken);
    results.push({ step: '2. Create Department', expected: 201, actual: rDept.status, pass: rDept.status === 201 });
    const deptId = extractId(rDept.json);

    // 3. Admission Batch
    const rBatch = await request('POST', '/admission-batches', { academic_year_id: ayId, department_id: deptId, batch_name: `B${ts}`, admission_year: 2026 }, adminToken);
    results.push({ step: '3. Create Batch', expected: 201, actual: rBatch.status, pass: rBatch.status === 201 });
    if (rBatch.status !== 201) console.dir(rBatch.json, {depth: null});
    const batchId = extractId(rBatch.json);

    // 4. Semester
    const rSem = await request('POST', '/semesters', { academic_year_id: ayId, semester_number: 1, name: 'Sem 1', start_date: '2026-08-01', end_date: '2026-12-31' }, adminToken);
    results.push({ step: '4. Create Semester', expected: 201, actual: rSem.status, pass: rSem.status === 201 });
    if(rSem.status !== 201) console.log('SEM ERR:', rSem.json);
    const semId = extractId(rSem.json);

    console.log('batchId:', batchId, 'semId:', semId);

    // 5. Class
    const rClass = await request('POST', '/classes', { admission_batch_id: batchId, semester_id: semId, section_name: 'A', class_code: `C${ts}` }, adminToken);
    results.push({ step: '5. Create Class', expected: 201, actual: rClass.status, pass: rClass.status === 201 });
    if(rClass.status !== 201) console.dir(rClass.json, {depth: null});
    const classId = extractId(rClass.json);
    if (!classId) throw new Error('Class ID is null');

    // 6. Subject
    const rSubj = await request('POST', '/subjects', { code: `S${ts}`, name: `Subj ${ts}`, subject_type: 'CORE', default_contact_hours: 1, department_id: deptId }, adminToken);
    results.push({ step: '6. Create Subject', expected: 201, actual: rSubj.status, pass: rSubj.status === 201 });
    const subjId = extractId(rSubj.json);

    // 7. Class Subject (requires teacher)
    // Teacher A is teacher_id=1. 
    const rCS = await request('POST', '/class-subjects', { class_id: classId, subject_id: subjId, teacher_id: 1 }, adminToken);
    results.push({ step: '7. Create Class-Subject', expected: 201, actual: rCS.status, pass: rCS.status === 201 });
    const csId = extractId(rCS.json);

    // 8. DB: Create Student & Enroll
    // Since there's no POST /students/1/enrollments, do it via DB to enable E2E testing
    const [resRole] = await dbConn.execute("SELECT id FROM roles WHERE name = 'STUDENT'");
    const studentRoleId = resRole[0].id;
    const [resUser] = await dbConn.execute("INSERT INTO users (username, password_hash, role_id) VALUES (?, 'hash', ?)", [`U${ts}`, studentRoleId]);
    const [resStudent] = await dbConn.execute("INSERT INTO students (user_id, student_id, first_name) VALUES (?, ?, 'Student E2E')", [resUser.insertId, `ST${ts}`]);
    const studentId = resStudent.insertId;
    await dbConn.execute("INSERT INTO student_enrollments (student_id, class_id) VALUES (?, ?)", [studentId, classId]);
    results.push({ step: '8. DB Student Enrollment', expected: 'OK', actual: 'OK', pass: true });

    // 9. Session (by admin or teacher?) We'll use admin for creation
    const rSess = await request('POST', '/class-sessions', { class_id: classId, class_subject_id: csId, session_date: '2026-10-04', period_number: 1, conducted_by_teacher_id: 1, contact_hours: 1, status: 'SCHEDULED', source: 'MANUAL' }, adminToken);
    results.push({ step: '9. Create Session', expected: 201, actual: rSess.status, pass: rSess.status === 201 });
    const sessId = extractId(rSess.json);

    // 10. Mark Fresh Attendance
    const rAtt = await request('POST', '/attendance/bulk', { class_session_id: sessId, records: [{ student_id: studentId, status: 'PRESENT' }] }, teacherToken);
    results.push({ step: '10. Mark Attendance', expected: 201, actual: rAtt.status, pass: rAtt.status === 201 });

    // 11. Correct Attendance (if PUT /attendance/bulk doesn't exist, try DB or see if PATCH works)
    // Actually /attendance/bulk typically does upsert. Let's send ABSENT.
    const rAttCorrect = await request('POST', '/attendance/bulk', { class_session_id: sessId, records: [{ student_id: studentId, status: 'ABSENT' }] }, teacherToken);
    // In Phase 3 we saw POST on duplicate gives 409! So correction must be PATCH or PUT, let's try PUT /attendance/:id
    let updatedStatus = 'NOT_UPDATED';
    let attId = 0;
    const [attRows] = await dbConn.execute('SELECT id, status FROM attendance_records WHERE class_session_id = ? AND student_id = ?', [sessId, studentId]);
    if (attRows.length) {
      attId = attRows[0].id;
      // Try PATCH
      const rPatch = await request('PATCH', `/attendance/${attId}`, { status: 'ABSENT' }, teacherToken);
      if(rPatch.status === 200) {
        const [attRows2] = await dbConn.execute('SELECT id, status FROM attendance_records WHERE id = ?', [attId]);
        updatedStatus = attRows2[0].status;
      }
    }
    results.push({ step: '11. Correct Attendance (PATCH)', expected: 'ABSENT', actual: updatedStatus, pass: updatedStatus === 'ABSENT' });

    // 12. Verify Audit Log
    const [auditRows] = await dbConn.execute('SELECT * FROM attendance_audit_logs WHERE attendance_record_id = ?', [attId]);
    results.push({ step: '12. Audit Log Exists', expected: '>0', actual: auditRows.length, pass: auditRows.length > 0 });

    // 13. Cancel Session & Attempt Attendance
    await dbConn.execute('UPDATE class_sessions SET status = "CANCELLED" WHERE id = ?', [sessId]);
    const rAttCancel = await request('POST', '/attendance/bulk', { class_session_id: sessId, records: [{ student_id: studentId, status: 'PRESENT' }] }, teacherToken);
    results.push({ step: '13. Cancelled Session Rejection', expected: '4xx', actual: rAttCancel.status, pass: rAttCancel.status >= 400 });

    // 14. Bulk Rollback (Send one valid, one invalid to see if everything rolls back)
    // Create new session
    const rSess2 = await request('POST', '/class-sessions', { class_id: classId, class_subject_id: csId, session_date: '2026-10-05', period_number: 2, conducted_by_teacher_id: 1, contact_hours: 1, status: 'SCHEDULED', source: 'MANUAL' }, adminToken);
    const sessId2 = extractId(rSess2.json);
    
    // Attempt bulk insert where one is missing status
    const rBulkFail = await request('POST', '/attendance/bulk', { 
      class_session_id: sessId2, 
      records: [
        { student_id: studentId, status: 'PRESENT' }, 
        { student_id: 9999, status: 'INVALID_STATUS' }
      ] 
    }, teacherToken);
    
    const [dbBulkCheck] = await dbConn.execute('SELECT * FROM attendance_records WHERE class_session_id = ?', [sessId2]);
    results.push({ step: '14. Bulk Partial Rollback', expected: '0 records (rolled back)', actual: `${dbBulkCheck.length} records`, pass: dbBulkCheck.length === 0 });

    console.table(results);
    
  } catch(e) {
    console.error(e);
  } finally {
    dbConn.end();
  }
}
runPhase3_1();
