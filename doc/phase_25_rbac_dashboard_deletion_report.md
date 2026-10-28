# Phase 25: RBAC Role Restriction, Dashboard Analytics & Permanent Academic Deletion

**Date:** 2026-10-21  
**Author:** Antigravity Engineering Agent  
**Status:** Completed & Verified  

---

## 1. Overview & Context

This phase was executed to address four targeted enhancements and operational fixes requested for the College Attendance Management System:
1. **HOD Exclusive Authority on Subjects & Timetables**: Restricting mutation permissions (Create, Update, Delete) strictly to the `HOD` role, allowing `ADMINISTRATION` read-only visibility.
2. **Admin Dashboard At-Risk Student Analytics**: Upgrading the "Students with < 75% Attendance" card to display comprehensive student records in a responsive table.
3. **Permanent Academic Deletions**: Transitioning from soft-deactivation (`is_active = FALSE`) to true database deletions (`DELETE FROM ... WHERE id = ?`) for Classes, Departments, and Specializations.
4. **Authentication Hash Guarding**: Resolving unhandled Argon2 library verification exceptions (`pchstr must contain a $ as first char`) and restoring valid Argon2 credentials for the administrator account.

---

## 2. Changes Implemented

### 2.1 RBAC Hardening (Subjects & Timetable)
- **Backend Route Protection**:
  - `backend/src/modules/subjects/subjects.routes.ts`: Wrapped `POST /`, `PATCH /:id`, and `DELETE /:id` with `authorize('HOD')`.
  - `backend/src/modules/timetable/timetable.routes.ts`: Restricted both regular timetables and daily timetable changes mutations to `authorize('HOD')` with `authorizeScope('TIMETABLE')`.
  - Reordered the Express route definition for `/daily-changes` before `/:id` to eliminate route parameter shadowing.
- **Frontend UI & Action Isolation**:
  - `frontend/components/academic/Subjects.tsx`: Sourced user role from `useAuth()`. Hidden create forms and delete/edit buttons for non-HOD users. Guarded mutation handlers to return early if role is not `HOD`.
  - `frontend/components/academic/RegularTimetable.tsx`: Concealed creation forms and action controls for non-HOD users.
  - `frontend/components/academic/DailyTimetableChanges.tsx`: Hidden daily change entry controls and mutation triggers for non-HOD users.
  - `frontend/app/dashboard/layout.tsx`: Registered `/dashboard/hod/subjects` and `/dashboard/hod/timetable` navigation links.
  - Created dedicated HOD dashboard pages:
    - `frontend/app/dashboard/hod/subjects/page.tsx`
    - `frontend/app/dashboard/hod/timetable/page.tsx`

### 2.2 Admin Dashboard At-Risk Analytics Table
- **Backend Query Enhancement**:
  - `backend/src/modules/dashboard/dashboard.repository.ts`: Expanded `getAdministrationStats()`. Joined `attendance_records`, conducted `class_sessions`, `students`, active `student_enrollments`, `classes`, and `semesters`.
  - Sourced payload fields: `admission_number`, `student_name`, `class_name`, `semester_name`, `total_sessions`, `present_sessions`, and `attendance_percentage`.
  - Filter rule: `total_sessions > 0 AND (present_sessions / total_sessions) < 0.75`.
- **Frontend Responsive Table**:
  - `frontend/app/dashboard/administration/page.tsx`: Updated the `at_risk` tab with an interactive, responsive `<Table>` displaying student identity, class, semester, attendance fraction, percentage, and a red `<Badge variant="destructive">At Risk</Badge>`.
  - Preserved loading skeletons and empty states.
- **Unit & Integration Tests**:
  - `backend/tests/dashboard.test.ts`: Updated test mocks and assertions to validate the structured student payload.

### 2.3 Permanent Database Deletions for Academic Structures
- **Database Repositories**:
  - `backend/src/modules/classes/classes.repository.ts`: Replaced soft delete with `DELETE FROM classes WHERE id = ?`.
  - `backend/src/modules/academic/academic.repository.ts`: Replaced `deleteDepartment` and `deleteSpecialization` with physical `DELETE FROM ... WHERE id = ?`.
- **Frontend Action Binding & Confirmation**:
  - `frontend/components/academic/Classes.tsx`: Added `deleteClass` handler and Delete button in table rows with user confirmation.
  - `frontend/components/academic/Departments.tsx`: Added `deleteDept` handler and Delete button in table rows with user confirmation.
  - `frontend/components/academic/Specializations.tsx`: Added `deleteSpec` handler and Delete button in table rows with user confirmation.
- **Relational Integrity Guarantees**:
  - Foreign key constraints (`ON DELETE RESTRICT`) are respected. Child record conflicts return HTTP 409 Conflict with an informative message. Unreferenced records are cleanly deleted from the database.

### 2.4 Argon2 Authentication Guarding
- `backend/src/modules/auth/auth.service.ts`:
  - Added prefix validation ensuring `user.password_hash.startsWith('$')` before executing `argon2.verify()`.
  - Wrapped password verification in `try...catch` block to handle any malformed hashes gracefully by returning `HTTP 401 Unauthorized` instead of throwing an unhandled 500 error.
  - Restored a valid Argon2id hash for the `admin` account in MySQL.

---

## 3. Verification & Test Results

| Check / Test | Command / Method | Result | Notes |
| :--- | :--- | :--- | :--- |
| **HOD RBAC Permissions** | Automated test suite | **PASS (29/29)** | HOD granted full write permissions; Administration and other roles restricted with 403 Forbidden. |
| **Dashboard Analytics Payload** | `npm test` (dashboard suite) | **PASS** | Validated accurate calculation and structure of at-risk students. |
| **Backend TypeScript Compilation** | `npm run build` | **PASS** | 0 TypeScript errors. Output built into `dist/`. |
| **Frontend Production Build** | `npm run build` | **PASS** | Compiled all 30 static and dynamic routes with 0 errors. |
| **Physical Class Deletion** | MySQL DB Query | **PASS** | Class deleted from database (`0` records remaining). |
| **Physical Department Deletion** | Live HTTP DELETE | **PASS** | `DELETE /api/v1/departments/:id` returned `204 No Content`; row purged from MySQL. |
| **Admin Login & Auth** | Live HTTP POST | **PASS** | `POST /api/v1/auth/login` returned `200 OK` with valid JWT session cookie. |

---

## 4. File Integrity & Governance

- No pre-existing documentation files in `doc/` were overwritten or truncated.
- All historical audit reports and specifications remain intact.
