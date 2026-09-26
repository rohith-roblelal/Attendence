import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as rbacService from '../src/modules/rbac/rbac.service';
import * as repo from '../src/modules/rbac/rbac.repository';

vi.mock('../src/db/pool', () => {
  return { pool: { query: vi.fn().mockResolvedValue([[]]) } };
});

describe('RBAC Module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('canManageDepartment', () => {
    it('allows ADMINISTRATION', async () => {
      const result = await rbacService.canManageDepartment({ role: 'ADMINISTRATION' }, 1);
      expect(result).toBe(true);
    });

    it('allows HOD for their assigned department', async () => {
      vi.spyOn(repo, 'getTeacherIdByUserId').mockResolvedValue(10);
      vi.spyOn(repo, 'isHodOfDepartment').mockResolvedValue(true);
      const result = await rbacService.canManageDepartment({ id: 1, role: 'HOD' }, 1);
      expect(result).toBe(true);
    });

    it('denies HOD for unassigned department', async () => {
      vi.spyOn(repo, 'getTeacherIdByUserId').mockResolvedValue(10);
      vi.spyOn(repo, 'isHodOfDepartment').mockResolvedValue(false);
      const result = await rbacService.canManageDepartment({ id: 1, role: 'HOD' }, 2);
      expect(result).toBe(false);
    });

    it('denies TEACHER', async () => {
      const result = await rbacService.canManageDepartment({ role: 'TEACHER' }, 1);
      expect(result).toBe(false);
    });
  });

  describe('canManageClass', () => {
    it('allows ADMINISTRATION', async () => {
      const result = await rbacService.canManageClass({ role: 'ADMINISTRATION' }, 1);
      expect(result).toBe(true);
    });

    it('allows TUTOR for their assigned class', async () => {
      vi.spyOn(repo, 'getTeacherIdByUserId').mockResolvedValue(10);
      vi.spyOn(repo, 'isTutorOfClass').mockResolvedValue(true);
      const result = await rbacService.canManageClass({ id: 1, role: 'TUTOR' }, 1);
      expect(result).toBe(true);
    });

    it('denies TUTOR for unassigned class', async () => {
      vi.spyOn(repo, 'getTeacherIdByUserId').mockResolvedValue(10);
      vi.spyOn(repo, 'isTutorOfClass').mockResolvedValue(false);
      const result = await rbacService.canManageClass({ id: 1, role: 'TUTOR' }, 2);
      expect(result).toBe(false);
    });

    it('denies TEACHER', async () => {
      vi.spyOn(repo, 'getTeacherIdByUserId').mockResolvedValue(10);
      const result = await rbacService.canManageClass({ id: 1, role: 'TEACHER' }, 1);
      expect(result).toBe(false);
    });
  });

  describe('canManageSession', () => {
    it('allows ADMINISTRATION', async () => {
      const result = await rbacService.canManageSession({ role: 'ADMINISTRATION' }, 1);
      expect(result).toBe(true);
    });

    it('allows TEACHER who actually conducted the session', async () => {
      vi.spyOn(repo, 'getTeacherIdByUserId').mockResolvedValue(10);
      // Teacher 10 conducted this session
      const result = await rbacService.canManageSession({ id: 1, role: 'TEACHER' }, undefined, 1, 1, 10);
      expect(result).toBe(true);
    });

    it('allows TEACHER who is the permanently assigned teacher', async () => {
      vi.spyOn(repo, 'getTeacherIdByUserId').mockResolvedValue(10);
      vi.spyOn(repo, 'getTeacherOfClassSubject').mockResolvedValue(10);
      // Conducted teacher is someone else (20), but permanent is 10
      const result = await rbacService.canManageSession({ id: 1, role: 'TEACHER' }, undefined, 1, 1, 20);
      expect(result).toBe(true);
    });

    it('denies TEACHER out of scope', async () => {
      vi.spyOn(repo, 'getTeacherIdByUserId').mockResolvedValue(10);
      vi.spyOn(repo, 'getTeacherOfClassSubject').mockResolvedValue(30);
      // Conducted teacher is 20, permanent is 30, User is 10 -> DENY
      const result = await rbacService.canManageSession({ id: 1, role: 'TEACHER' }, undefined, 1, 1, 20);
      expect(result).toBe(false);
    });
  });
});
