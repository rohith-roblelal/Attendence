# Phase 26: Department-Level HOD Assignment & Multi-Year Academic Selector

**Date:** 2026-10-21  
**Author:** Senior Full-Stack Engineering Agent  
**Status:** Completed, Verified & Production Ready  

---

## 1. Executive Summary

This deliverable implements the core architecture requirement:
> **One department must have exactly one HOD responsible for that department across all academic years, semesters, and classes.**

Previously, HOD assignments were tightly coupled to individual academic years in `department_hod_assignments` (`academic_year_id NOT NULL`), necessitating separate assignment records per academic year. The system has now been upgraded to a true department-level HOD assignment model:
- Exactly **one active HOD per department** is enforced at both the database level (via a generated virtual column and unique index) and the application layer.
- The assigned HOD has complete visibility across all academic years, semesters, and classes for their department.
- A dynamic **Academic-Year Selector** is integrated across all HOD workspaces, updating dashboard KPIs, class allocations, and attendance analytics in real-time.

---

## 2. Schema Inspection & Migration Details

### 2.1 Pre-Migration Schema Inspection
Inspection of `department_hod_assignments` revealed:
- `department_id bigint unsigned NOT NULL`
- `teacher_id bigint unsigned NOT NULL`
- `academic_year_id bigint unsigned NOT NULL` (enforced by foreign key `department_hod_assignments_ibfk_3`)
- `is_active tinyint(1) DEFAULT 1`
- No unique constraint preventing multiple active HODs for the same department.

### 2.2 Safe Database Migration
A zero-downtime, non-destructive migration was executed on the database:
```sql
-- 1. Drop the restrictive foreign key
ALTER TABLE department_hod_assignments DROP FOREIGN KEY department_hod_assignments_ibfk_3;

-- 2. Modify academic_year_id to be nullable
ALTER TABLE department_hod_assignments MODIFY COLUMN academic_year_id bigint unsigned NULL;

-- 3. Re-add foreign key with ON DELETE SET NULL to preserve historical records safely
ALTER TABLE department_hod_assignments ADD CONSTRAINT department_hod_assignments_ibfk_3 
  FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE SET NULL;

-- 4. Add virtual generated column reflecting active department assignments
ALTER TABLE department_hod_assignments ADD COLUMN active_dept_id bigint unsigned 
  GENERATED ALWAYS AS (CASE WHEN is_active = 1 THEN department_id ELSE NULL END) VIRTUAL;

-- 5. Enforce single active HOD per department via unique constraint
ALTER TABLE department_hod_assignments ADD UNIQUE KEY uk_active_dept_hod (active_dept_id);
```

### 2.3 Rollback Instructions (if ever required)
```sql
ALTER TABLE department_hod_assignments DROP INDEX uk_active_dept_hod;
ALTER TABLE department_hod_assignments DROP COLUMN active_dept_id;
ALTER TABLE department_hod_assignments DROP FOREIGN KEY department_hod_assignments_ibfk_3;
ALTER TABLE department_hod_assignments MODIFY COLUMN academic_year_id bigint unsigned NOT NULL;
ALTER TABLE department_hod_assignments ADD CONSTRAINT department_hod_assignments_ibfk_3 
  FOREIGN KEY (academic_year_id) REFERENCES academic_years (id);
```

---

## 3. Backend & Security Architecture

### 3.1 Backend Files Modified
1. `backend/src/modules/hod-assignments/hod-assignments.schemas.ts`:
   - Updated `createHodAssignmentSchema` to make `academic_year_id` optional and nullable.
2. `backend/src/modules/hod-assignments/hod-assignments.types.ts`:
   - Updated `HodAssignment` interface with `academic_year_id?: number | null`.
3. `backend/src/modules/hod-assignments/hod-assignments.repository.ts`:
   - Updated `createAssignment` to insert `data.academic_year_id || null`.
   - Automatically deactivates prior active assignments for the department inside a transactional unit.
4. `backend/src/modules/hod-assignments/hod-assignments.service.ts`:
   - Catches `ER_DUP_ENTRY` from MySQL and maps it to `HTTP 409 Conflict` with message: `"This department already has an active HOD assigned."`
5. `backend/src/modules/dashboard/dashboard.controller.ts`:
   - Updated `getHodStats` and `getHodPeople` to resolve the HOD's active department assignment (`teacher_id -> department_id`).
   - Dynamically filters by `req.query.academic_year_id` (falling back to the current active academic year).
6. `backend/src/modules/reports/reports.controller.ts`:
   - Updated `getHodReport` to similarly resolve the department HOD assignment across any filtered academic year.
7. `backend/src/modules/rbac/rbac.repository.ts` & `rbac.service.ts`:
   - `isHodOfDepartment(teacherId, departmentId)` verifies that the teacher has an active assignment for that specific department, maintaining strict horizontal tenant isolation.

### 3.2 Security & Department Isolation Guarantees
- The HOD's identity is strictly resolved from the authenticated JWT session cookie (`req.user.id`).
- The HOD's department is determined server-side from `department_hod_assignments`. Client requests cannot spoof department IDs.
- If an HOD attempts to request data for another department, the backend strictly returns `HTTP 403 Forbidden`.

---

## 4. Frontend UI Implementation

1. `frontend/components/assignments/HodAssignments.tsx`:
   - Updated Admin assignment form to assign an HOD directly to a department without requiring an academic year.
   - Highlights in the department dropdown if a department already has an active HOD (`"(Replaces active HOD)"`).
   - Renders **Scope: "Entire Department"** with faculty name, ID, and tenure dates.
2. `frontend/app/dashboard/hod/page.tsx`:
   - Integrated dynamic Academic Year selector (`<Select>`) in the dashboard header.
   - Automatically populates available academic years from live database records.
   - Fetches and refreshes department stats, class summaries, and attendance rates when the user switches years.
3. `frontend/app/dashboard/hod/people/page.tsx`:
   - Added Academic Year selector to filter department classes, faculty assignments, and subject mappings.
4. `frontend/app/dashboard/hod/reports/page.tsx`:
   - Added Academic Year selector to filter class-wise and student-wise attendance reports.

---

## 5. Verification & Test Execution Results

| Test / Check | Target / Method | Result | Notes |
| :--- | :--- | :--- | :--- |
| **Active HOD Database Constraint** | MySQL duplicate `INSERT` | **PASS (Blocked)** | Threw `ER_DUP_ENTRY Duplicate entry '1' for key 'uk_active_dept_hod'`. |
| **Cross-Department RBAC Isolation** | `rbacService.canManageDepartment` | **PASS** | HOD user granted access to Department 1 (`true`), denied access to Department 2 (`false`). Admin granted access to both (`true`). |
| **Multi-Year Data Filtering** | `repo.getHodStats(1, 1)` vs `(1, 2)` | **PASS** | Year 1 returned active classes & students; Year 2 correctly returned empty sets (`0` records). |
| **Multi-Year Reports Filtering** | `repo.getHodDepartmentReport` | **PASS** | Filtered classSummary and studentSummary by academic year accurately. |
| **Backend TypeScript Build** | `npm run build` (backend) | **PASS** | 0 TypeScript errors. Clean compilation into `dist/`. |
| **Frontend Production Build** | `npm run build` (frontend) | **PASS** | All 32 pages and routes compiled and prerendered successfully with 0 errors. |
