import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import * as authUtils from '../src/modules/auth/auth.utils';
import * as rbacService from '../src/modules/rbac/rbac.service';

async function runTests() {
  console.log('=== STARTING AUTOMATED PERMISSION TEST SUITE ===');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
    }
  }

  // Create JWT tokens
  const hodToken = authUtils.generateToken({ id: 1, role: 'HOD', username: 'hod_user' });
  const adminToken = authUtils.generateToken({ id: 2, role: 'ADMINISTRATION', username: 'admin_user' });
  const teacherToken = authUtils.generateToken({ id: 3, role: 'TEACHER', username: 'teacher_user' });

  // Mock pool.query cleanly
  pool.query = (async (sql: string, values?: any[]) => {
    const s = typeof sql === 'string' ? sql.toUpperCase() : '';
    if (s.includes('FROM SUBJECTS WHERE ID =')) {
      return [[{ id: 10, code: 'MATH101', name: 'Mathematics', subject_type: 'THEORY', is_active: 1 }]];
    }
    if (s.includes('FROM SUBJECTS')) {
      return [[{ id: 10, code: 'MATH101', name: 'Mathematics', subject_type: 'THEORY', is_active: 1 }]];
    }
    if (s.includes('INSERT INTO SUBJECTS')) {
      return [{ insertId: 10, affectedRows: 1 }];
    }
    if (s.includes('UPDATE SUBJECTS')) {
      return [{ affectedRows: 1 }];
    }
    if (s.includes('COUNT(*) AS CNT FROM REGULAR_TIMETABLE_ENTRIES')) {
      return [[{ cnt: 0 }]];
    }
    if (s.includes('FROM REGULAR_TIMETABLE_ENTRIES WHERE ID =')) {
      return [[{ id: 20, class_id: 1, day_of_week: 1, period_number: 1, class_subject_id: 1, is_active: 1 }]];
    }
    if (s.includes('FROM REGULAR_TIMETABLE_ENTRIES')) {
      return [[{ id: 20, class_id: 1, day_of_week: 1, period_number: 1, class_subject_id: 1, is_active: 1 }]];
    }
    if (s.includes('INSERT INTO REGULAR_TIMETABLE_ENTRIES')) {
      return [{ insertId: 20, affectedRows: 1 }];
    }
    if (s.includes('UPDATE REGULAR_TIMETABLE_ENTRIES')) {
      return [{ affectedRows: 1 }];
    }
    if (s.includes('COUNT(*) AS CNT FROM DAILY_TIMETABLE_CHANGES')) {
      return [[{ cnt: 0 }]];
    }
    if (s.includes('FROM DAILY_TIMETABLE_CHANGES WHERE ID =')) {
      return [[{ id: 30, class_id: 1, change_date: '2026-10-21', original_period: 1, original_class_subject_id: 1, change_type: 'CANCELLATION' }]];
    }
    if (s.includes('FROM DAILY_TIMETABLE_CHANGES')) {
      return [[{ id: 30, class_id: 1, change_date: '2026-10-21', original_period: 1, original_class_subject_id: 1, change_type: 'CANCELLATION' }]];
    }
    if (s.includes('INSERT INTO DAILY_TIMETABLE_CHANGES')) {
      return [{ insertId: 30, affectedRows: 1 }];
    }
    if (s.includes('UPDATE DAILY_TIMETABLE_CHANGES')) {
      return [{ affectedRows: 1 }];
    }
    if (s.includes('DELETE FROM DAILY_TIMETABLE_CHANGES')) {
      return [{ affectedRows: 1 }];
    }
    if (s.includes('FROM CLASS_SUBJECTS')) {
      return [[{ teacher_id: 10 }]];
    }
    if (s.includes('FROM TEACHERS WHERE USER_ID =')) {
      return [[{ id: 10 }]];
    }
    if (s.includes('FROM CLASSES C') || s.includes('FROM CLASSES WHERE ID =')) {
      return [[{ id: 1, department_id: 1 }]];
    }
    if (s.includes('FROM DEPARTMENT_HOD_ASSIGNMENTS')) {
      return [[{ id: 1 }]];
    }
    return [[]];
  }) as any;

  (rbacService as any).canManageClass = async () => true;
  (rbacService as any).getClassByRegularTimetableId = async () => 1;
  (rbacService as any).getClassByDailyChangeId = async () => 1;

  console.log('\n--- 1. SUBJECTS PERMISSION TESTS ---');
  // 1.1 HOD list and view
  const resHodList = await request(app).get('/api/v1/subjects').set('Cookie', [`token=${hodToken}`]);
  assert(resHodList.status === 200 && resHodList.body.data.length > 0, 'HOD can list subjects');

  const resHodGet = await request(app).get('/api/v1/subjects/10').set('Cookie', [`token=${hodToken}`]);
  assert(resHodGet.status === 200, 'HOD can get subject by id');

  // 1.2 Admin list and view (read-only)
  const resAdminList = await request(app).get('/api/v1/subjects').set('Cookie', [`token=${adminToken}`]);
  assert(resAdminList.status === 200 && resAdminList.body.data.length > 0, 'Admin can list subjects');

  const resAdminGet = await request(app).get('/api/v1/subjects/10').set('Cookie', [`token=${adminToken}`]);
  assert(resAdminGet.status === 200, 'Admin can get subject by id');

  // 1.3 HOD Create, Update, Delete
  const resHodCreateSub = await request(app).post('/api/v1/subjects').set('Cookie', [`token=${hodToken}`]).send({
    code: 'MATH101', name: 'Mathematics', subject_type: 'THEORY'
  });
  assert(resHodCreateSub.status === 201, 'HOD can create subjects');

  const resHodUpdateSub = await request(app).patch('/api/v1/subjects/10').set('Cookie', [`token=${hodToken}`]).send({
    name: 'Advanced Mathematics'
  });
  assert(resHodUpdateSub.status === 200, 'HOD can update subjects');

  const resHodDeleteSub = await request(app).delete('/api/v1/subjects/10').set('Cookie', [`token=${hodToken}`]);
  assert(resHodDeleteSub.status === 204, 'HOD can delete subjects');

  // 1.4 Admin Create, Update, Delete (MUST BE 403)
  const resAdminCreateSub = await request(app).post('/api/v1/subjects').set('Cookie', [`token=${adminToken}`]).send({
    code: 'ADMIN101', name: 'Admin Subject', subject_type: 'THEORY'
  });
  assert(resAdminCreateSub.status === 403, 'Admin cannot create subjects (HTTP 403)');

  const resAdminUpdateSub = await request(app).patch('/api/v1/subjects/10').set('Cookie', [`token=${adminToken}`]).send({
    name: 'Admin Modified'
  });
  assert(resAdminUpdateSub.status === 403, 'Admin cannot update subjects (HTTP 403)');

  const resAdminDeleteSub = await request(app).delete('/api/v1/subjects/10').set('Cookie', [`token=${adminToken}`]);
  assert(resAdminDeleteSub.status === 403, 'Admin cannot delete subjects (HTTP 403)');

  // 1.5 Teacher Create (MUST BE 403)
  const resTeacherCreateSub = await request(app).post('/api/v1/subjects').set('Cookie', [`token=${teacherToken}`]).send({
    code: 'TCH101', name: 'Teacher Subject', subject_type: 'THEORY'
  });
  assert(resTeacherCreateSub.status === 403, 'Teacher cannot create subjects (HTTP 403)');

  console.log('\n--- 2. REGULAR TIMETABLE PERMISSION TESTS ---');
  // 2.1 HOD & Admin read
  const resHodReadTT = await request(app).get('/api/v1/timetable').set('Cookie', [`token=${hodToken}`]);
  assert(resHodReadTT.status === 200, 'HOD can view regular timetable');

  const resAdminReadTT = await request(app).get('/api/v1/timetable').set('Cookie', [`token=${adminToken}`]);
  assert(resAdminReadTT.status === 200, 'Admin can view regular timetable');

  // 2.2 HOD Create, Update, Delete
  const resHodCreateTT = await request(app).post('/api/v1/timetable').set('Cookie', [`token=${hodToken}`]).send({
    class_id: 1, day_of_week: 1, period_number: 1, class_subject_id: 1
  });
  assert(resHodCreateTT.status === 201, 'HOD can create regular timetable entry');

  const resHodUpdateTT = await request(app).patch('/api/v1/timetable/20').set('Cookie', [`token=${hodToken}`]).send({
    class_subject_id: 2
  });
  assert(resHodUpdateTT.status === 200, 'HOD can update regular timetable entry');

  const resHodDeleteTT = await request(app).delete('/api/v1/timetable/20').set('Cookie', [`token=${hodToken}`]);
  assert(resHodDeleteTT.status === 204, 'HOD can delete (deactivate) regular timetable entry');

  // 2.3 Admin Create, Update, Delete (MUST BE 403)
  const resAdminCreateTT = await request(app).post('/api/v1/timetable').set('Cookie', [`token=${adminToken}`]).send({
    class_id: 1, day_of_week: 1, period_number: 1, class_subject_id: 1
  });
  assert(resAdminCreateTT.status === 403, 'Admin cannot create regular timetable entry (HTTP 403)');

  const resAdminUpdateTT = await request(app).patch('/api/v1/timetable/20').set('Cookie', [`token=${adminToken}`]).send({
    class_subject_id: 2
  });
  assert(resAdminUpdateTT.status === 403, 'Admin cannot update regular timetable entry (HTTP 403)');

  const resAdminDeleteTT = await request(app).delete('/api/v1/timetable/20').set('Cookie', [`token=${adminToken}`]);
  assert(resAdminDeleteTT.status === 403, 'Admin cannot delete regular timetable entry (HTTP 403)');

  // 2.4 Teacher Create (MUST BE 403)
  const resTeacherCreateTT = await request(app).post('/api/v1/timetable').set('Cookie', [`token=${teacherToken}`]).send({
    class_id: 1, day_of_week: 1, period_number: 1, class_subject_id: 1
  });
  assert(resTeacherCreateTT.status === 403, 'Teacher cannot create regular timetable entry (HTTP 403)');

  console.log('\n--- 3. DAILY TIMETABLE CHANGES PERMISSION TESTS ---');
  // 3.1 HOD & Admin read
  const resHodReadDaily = await request(app).get('/api/v1/timetable/daily-changes').set('Cookie', [`token=${hodToken}`]);
  assert(resHodReadDaily.status === 200, 'HOD can view daily changes');

  const resAdminReadDaily = await request(app).get('/api/v1/timetable/daily-changes').set('Cookie', [`token=${adminToken}`]);
  assert(resAdminReadDaily.status === 200, 'Admin can view daily changes');

  // 3.2 HOD Create, Update, Delete
  const resHodCreateDaily = await request(app).post('/api/v1/timetable/daily-changes').set('Cookie', [`token=${hodToken}`]).send({
    class_id: 1, change_date: '2026-10-21', original_period: 1, original_class_subject_id: 1, change_type: 'CANCELLATION'
  });
  assert(resHodCreateDaily.status === 201, 'HOD can log daily timetable change');

  const resHodUpdateDaily = await request(app).patch('/api/v1/timetable/daily-changes/30').set('Cookie', [`token=${hodToken}`]).send({
    reason: 'Updated Reason'
  });
  assert(resHodUpdateDaily.status === 200, 'HOD can update daily timetable change');

  const resHodDeleteDaily = await request(app).delete('/api/v1/timetable/daily-changes/30').set('Cookie', [`token=${hodToken}`]);
  assert(resHodDeleteDaily.status === 204, 'HOD can delete daily timetable change');

  // 3.3 Admin Create, Update, Delete (MUST BE 403)
  const resAdminCreateDaily = await request(app).post('/api/v1/timetable/daily-changes').set('Cookie', [`token=${adminToken}`]).send({
    class_id: 1, change_date: '2026-10-21', original_period: 1, original_class_subject_id: 1, change_type: 'CANCELLATION'
  });
  assert(resAdminCreateDaily.status === 403, 'Admin cannot create daily timetable change (HTTP 403)');

  const resAdminUpdateDaily = await request(app).patch('/api/v1/timetable/daily-changes/30').set('Cookie', [`token=${adminToken}`]).send({
    reason: 'Admin Attempt'
  });
  assert(resAdminUpdateDaily.status === 403, 'Admin cannot update daily timetable change (HTTP 403)');

  const resAdminDeleteDaily = await request(app).delete('/api/v1/timetable/daily-changes/30').set('Cookie', [`token=${adminToken}`]);
  assert(resAdminDeleteDaily.status === 403, 'Admin cannot delete daily timetable change (HTTP 403)');

  // 3.4 Teacher Create (MUST BE 403)
  const resTeacherCreateDaily = await request(app).post('/api/v1/timetable/daily-changes').set('Cookie', [`token=${teacherToken}`]).send({
    class_id: 1, change_date: '2026-10-21', original_period: 1, original_class_subject_id: 1, change_type: 'CANCELLATION'
  });
  assert(resTeacherCreateDaily.status === 403, 'Teacher cannot create daily timetable change (HTTP 403)');

  console.log(`\n========================================`);
  console.log(`SUMMARY: ${passed}/${total} assertions passed.`);
  console.log(`========================================`);

  if (passed !== total) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
