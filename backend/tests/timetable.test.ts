import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';
import * as repo from '../src/modules/timetable/timetable.repository';
import * as authUtils from '../src/modules/auth/auth.utils';

vi.mock('../src/modules/rbac/rbac.service', () => ({
  canManageClass: vi.fn().mockResolvedValue(true),
  getClassByRegularTimetableId: vi.fn().mockResolvedValue(1),
  getClassByDailyChangeId: vi.fn().mockResolvedValue(1)
}));

vi.mock('../src/db/pool', () => {
  return { pool: { query: vi.fn().mockResolvedValue([[{ '1': 1 }]]) } };
});

describe('Timetable Module - Role & Authorization Tests', () => {
  let hodToken: string;
  let adminToken: string;
  let teacherToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authUtils, 'verifyToken').mockImplementation((token: string) => {
      if (token === 'hod-token') return { id: 1, role: 'HOD', username: 'hod_user' };
      if (token === 'admin-token') return { id: 2, role: 'ADMINISTRATION', username: 'admin_user' };
      if (token === 'teacher-token') return { id: 3, role: 'TEACHER', username: 'teacher_user' };
      throw new Error('Invalid token');
    });
    hodToken = 'hod-token';
    adminToken = 'admin-token';
    teacherToken = 'teacher-token';
  });

  describe('Read Access', () => {
    it('HOD can view regular timetable', async () => {
      vi.spyOn(repo, 'getRegularEntries').mockResolvedValue([{ id: 1, class_id: 1, day_of_week: 1, period_number: 1 }]);
      const res = await request(app).get('/api/v1/timetable').set('Cookie', [`token=${hodToken}`]);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('Admin can view regular timetable (read-only)', async () => {
      vi.spyOn(repo, 'getRegularEntries').mockResolvedValue([{ id: 1, class_id: 1, day_of_week: 1, period_number: 1 }]);
      const res = await request(app).get('/api/v1/timetable').set('Cookie', [`token=${adminToken}`]);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('HOD can view daily changes', async () => {
      vi.spyOn(repo, 'getDailyChanges').mockResolvedValue([{ id: 1, class_id: 1, change_date: '2026-09-24' }]);
      const res = await request(app).get('/api/v1/timetable/daily-changes').set('Cookie', [`token=${hodToken}`]);
      expect(res.status).toBe(200);
    });

    it('Admin can view daily changes (read-only)', async () => {
      vi.spyOn(repo, 'getDailyChanges').mockResolvedValue([{ id: 1, class_id: 1, change_date: '2026-09-24' }]);
      const res = await request(app).get('/api/v1/timetable/daily-changes').set('Cookie', [`token=${adminToken}`]);
      expect(res.status).toBe(200);
    });
  });

  describe('Regular Timetable Write Access', () => {
    it('HOD can create regular timetable entry', async () => {
      vi.spyOn(repo, 'getClassSubjectTeacherId').mockResolvedValue(10);
      vi.spyOn(repo, 'checkTeacherConflict').mockResolvedValue(false);
      vi.spyOn(repo, 'createRegular').mockResolvedValue(1);
      vi.spyOn(repo, 'getRegularById').mockResolvedValue({ id: 1, class_id: 1 });
      
      const res = await request(app).post('/api/v1/timetable').set('Cookie', [`token=${hodToken}`]).send({
        class_id: 1, day_of_week: 1, period_number: 1, class_subject_id: 1
      });
      expect(res.status).toBe(201);
    });

    it('HOD can update regular timetable entry', async () => {
      vi.spyOn(repo, 'getRegularById').mockResolvedValue({ id: 1, class_id: 1 });
      vi.spyOn(repo, 'getClassSubjectTeacherId').mockResolvedValue(10);
      vi.spyOn(repo, 'checkTeacherConflict').mockResolvedValue(false);
      vi.spyOn(repo, 'updateRegular').mockResolvedValue();
      
      const res = await request(app).patch('/api/v1/timetable/1').set('Cookie', [`token=${hodToken}`]).send({
        class_subject_id: 2
      });
      expect(res.status).toBe(200);
    });

    it('HOD can deactivate regular timetable entry', async () => {
      vi.spyOn(repo, 'getRegularById').mockResolvedValue({ id: 1, class_id: 1 });
      vi.spyOn(repo, 'deactivateRegular').mockResolvedValue();
      
      const res = await request(app).delete('/api/v1/timetable/1').set('Cookie', [`token=${hodToken}`]);
      expect(res.status).toBe(204);
    });

    it('Admin CANNOT create regular timetable entry (HTTP 403 Forbidden)', async () => {
      const res = await request(app).post('/api/v1/timetable').set('Cookie', [`token=${adminToken}`]).send({
        class_id: 1, day_of_week: 1, period_number: 1, class_subject_id: 1
      });
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });

    it('Admin CANNOT update regular timetable entry (HTTP 403 Forbidden)', async () => {
      const res = await request(app).patch('/api/v1/timetable/1').set('Cookie', [`token=${adminToken}`]).send({
        class_subject_id: 2
      });
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });

    it('Admin CANNOT deactivate regular timetable entry (HTTP 403 Forbidden)', async () => {
      const res = await request(app).delete('/api/v1/timetable/1').set('Cookie', [`token=${adminToken}`]);
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });
  });

  describe('Daily Changes Write Access', () => {
    it('HOD can log daily timetable change', async () => {
      vi.spyOn(repo, 'checkDailyConflict').mockResolvedValue(false);
      vi.spyOn(repo, 'createDaily').mockResolvedValue(1);
      vi.spyOn(repo, 'getDailyById').mockResolvedValue({ id: 1, class_id: 1 });
      
      const res = await request(app).post('/api/v1/timetable/daily-changes').set('Cookie', [`token=${hodToken}`]).send({
        class_id: 1, change_date: '2026-09-24', original_period: 2, original_class_subject_id: 1, change_type: 'CANCELLATION'
      });
      expect(res.status).toBe(201);
    });

    it('HOD can update daily change', async () => {
      vi.spyOn(repo, 'getDailyById').mockResolvedValue({ id: 1, class_id: 1, change_date: '2026-09-24', original_period: 2 });
      vi.spyOn(repo, 'checkDailyConflict').mockResolvedValue(false);
      vi.spyOn(repo, 'updateDaily').mockResolvedValue();
      
      const res = await request(app).patch('/api/v1/timetable/daily-changes/1').set('Cookie', [`token=${hodToken}`]).send({
        reason: 'Illness'
      });
      expect(res.status).toBe(200);
    });

    it('HOD can delete daily change', async () => {
      vi.spyOn(repo, 'getDailyById').mockResolvedValue({ id: 1, class_id: 1 });
      vi.spyOn(repo, 'deleteDaily').mockResolvedValue();
      const res = await request(app).delete('/api/v1/timetable/daily-changes/1').set('Cookie', [`token=${hodToken}`]);
      expect(res.status).toBe(204);
    });

    it('Admin CANNOT create daily timetable change (HTTP 403 Forbidden)', async () => {
      const res = await request(app).post('/api/v1/timetable/daily-changes').set('Cookie', [`token=${adminToken}`]).send({
        class_id: 1, change_date: '2026-09-24', original_period: 2, original_class_subject_id: 1, change_type: 'CANCELLATION'
      });
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });

    it('Admin CANNOT update daily timetable change (HTTP 403 Forbidden)', async () => {
      const res = await request(app).patch('/api/v1/timetable/daily-changes/1').set('Cookie', [`token=${adminToken}`]).send({
        reason: 'Illness'
      });
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });

    it('Admin CANNOT delete daily timetable change (HTTP 403 Forbidden)', async () => {
      const res = await request(app).delete('/api/v1/timetable/daily-changes/1').set('Cookie', [`token=${adminToken}`]);
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });

    it('Teacher CANNOT create daily timetable change directly (HTTP 403 Forbidden)', async () => {
      const res = await request(app).post('/api/v1/timetable/daily-changes').set('Cookie', [`token=${teacherToken}`]).send({
        class_id: 1, change_date: '2026-09-24', original_period: 2, original_class_subject_id: 1, change_type: 'CANCELLATION'
      });
      expect(res.status).toBe(403);
    });
  });
});
