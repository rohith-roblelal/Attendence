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

describe('Timetable Module', () => {
  let adminToken: string;
  let teacherToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authUtils, 'verifyToken').mockImplementation((token: string) => {
      if (token === 'admin-token') return { id: 1, role: 'ADMINISTRATION', username: 'admin' };
      if (token === 'teacher-token') return { id: 2, role: 'TEACHER', username: 'teacher' };
      throw new Error('Invalid token');
    });
    adminToken = 'admin-token';
    teacherToken = 'teacher-token';
  });

  describe('Regular Timetable', () => {
    it('GET allows authenticated read', async () => {
      vi.spyOn(repo, 'getRegularEntries').mockResolvedValue([]);
      const res = await request(app).get('/api/v1/timetable').set('Cookie', [`token=${teacherToken}`]);
      expect(res.status).toBe(200);
    });

    it('POST enforces class conflicts (ER_DUP_ENTRY)', async () => {
      vi.spyOn(repo, 'getClassSubjectTeacherId').mockResolvedValue(10);
      vi.spyOn(repo, 'checkTeacherConflict').mockResolvedValue(false);
      (pool.query as any).mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' }); // from insert
      
      const res = await request(app).post('/api/v1/timetable').set('Cookie', [`token=${adminToken}`]).send({
        class_id: 1, day_of_week: 1, period_number: 1, class_subject_id: 1
      });
      expect(res.status).toBe(409);
    });

    it('POST enforces teacher conflicts', async () => {
      vi.spyOn(repo, 'getClassSubjectTeacherId').mockResolvedValue(10);
      vi.spyOn(repo, 'checkTeacherConflict').mockResolvedValue(true);
      
      const res = await request(app).post('/api/v1/timetable').set('Cookie', [`token=${adminToken}`]).send({
        class_id: 1, day_of_week: 1, period_number: 1, class_subject_id: 1
      });
      expect(res.status).toBe(409);
      expect(res.body.message).toContain('Teacher conflict');
    });

    it('POST creates entry', async () => {
      vi.spyOn(repo, 'getClassSubjectTeacherId').mockResolvedValue(10);
      vi.spyOn(repo, 'checkTeacherConflict').mockResolvedValue(false);
      vi.spyOn(repo, 'createRegular').mockResolvedValue(1);
      vi.spyOn(repo, 'getRegularById').mockResolvedValue({ id: 1 });
      
      const res = await request(app).post('/api/v1/timetable').set('Cookie', [`token=${adminToken}`]).send({
        class_id: 1, day_of_week: 1, period_number: 1, class_subject_id: 1
      });
      expect(res.status).toBe(201);
    });
  });

  describe('Daily Changes', () => {
    it('POST creates daily change without modifying regular timetable', async () => {
      vi.spyOn(repo, 'checkDailyConflict').mockResolvedValue(false);
      vi.spyOn(repo, 'createDaily').mockResolvedValue(1);
      vi.spyOn(repo, 'getDailyById').mockResolvedValue({ id: 1 });
      
      const updateSpy = vi.spyOn(repo, 'updateRegular').mockResolvedValue(undefined as any);
      const deactSpy = vi.spyOn(repo, 'deactivateRegular').mockResolvedValue(undefined as any);
      const res = await request(app).post('/api/v1/timetable/daily-changes').set('Cookie', [`token=${adminToken}`]).send({
        class_id: 1, change_date: '2026-09-24', original_period: 2, original_class_subject_id: 1, change_type: 'CANCELLED'
      });
      expect(res.status).toBe(201);
      // Ensure regular timetable methods were NOT called
      expect(updateSpy).not.toHaveBeenCalled();
      expect(deactSpy).not.toHaveBeenCalled();
    });

    it('POST prevents conflicting daily changes for same date and period', async () => {
      vi.spyOn(repo, 'checkDailyConflict').mockResolvedValue(true);
      const res = await request(app).post('/api/v1/timetable/daily-changes').set('Cookie', [`token=${adminToken}`]).send({
        class_id: 1, change_date: '2026-09-24', original_period: 2, original_class_subject_id: 1, change_type: 'CANCELLED'
      });
      expect(res.status).toBe(409);
    });

    it('DELETE removes daily change', async () => {
      vi.spyOn(repo, 'getDailyById').mockResolvedValue({ id: 1 });
      vi.spyOn(repo, 'deleteDaily').mockResolvedValue();
      const res = await request(app).delete('/api/v1/timetable/daily-changes/1').set('Cookie', [`token=${adminToken}`]);
      expect(res.status).toBe(204);
    });
  });
});
