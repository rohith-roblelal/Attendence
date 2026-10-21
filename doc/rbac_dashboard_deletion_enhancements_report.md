# RBAC Restriction, Dashboard Enhancement & Academic Deletion Audit Report

**Date:** 2026-10-21  
**Project:** College Attendance Management System  
**Auditor:** Senior Full-Stack Engineering Agent  

---

## 1. Executive Summary

This audit report documents three critical system enhancements implemented across the College Attendance Management System:
1. **RBAC Restriction for Subject and Timetable Management**: Restricting all write mutations (Create, Update, Delete) for Subjects and Timetables strictly to the **HOD** role, while maintaining read-only visibility for **ADMINISTRATION**.
2. **Admin Dashboard Enhancement**: Upgrading the "Students with < 75% Attendance" card to display detailed student information, classes, semesters, session counts, percentages, and status in a responsive table.
3. **Academic Structure Permanent Deletion**: Enabling genuine database deletion (`DELETE FROM ... WHERE id = ?`) for Classes, Departments, and Specializations from the database table rather than passive soft deactivation.
4. **Authentication Hash Guarding**: Fixing raw Argon2 library exceptions (`pchstr must contain a $ as first char`) by ensuring safe format verification before verification and restoring a valid Argon2id hash for the administrative account.

---

## 2. Module 1: HOD Role Restriction (Subjects & Timetable)

### 2.1 Backend Route Hardening
- **Subjects API (`/api/v1/subjects`)**:
  - `POST /api/v1/subjects`: Protected by `authorize('HOD')`. Admin write requests return `HTTP 403 Forbidden`.
  - `PATCH /api/v1/subjects/:id`: Protected by `authorize('HOD')`. Admin write requests return `HTTP 403 Forbidden`.
  - `DELETE /api/v1/subjects/:id`: Protected by `authorize('HOD')`. Admin write requests return `HTTP 403 Forbidden`.
  - `GET /api/v1/subjects` & `GET /api/v1/subjects/:id`: Accessible to authenticated users (`HOD`, `ADMINISTRATION`, etc.).
- **Timetable API (`/api/v1/timetable`)**:
  - Regular Timetable (`POST /`, `PATCH /:id`, `DELETE /:id`): Protected by `authorize('HOD')` + `authorizeScope('TIMETABLE')`.
  - Daily Changes (`POST /daily-changes`, `PATCH /daily-changes/:id`, `DELETE /daily-changes/:id`): Protected by `authorize('HOD')` + `authorizeScope('TIMETABLE')`.
  - Reordered `/daily-changes` routes above `/:id` routes to eliminate route collision where Express treated the string `"daily-changes"` as a parameter ID.

### 2.2 Frontend Role Isolation
- **`Subjects.tsx`**:
  - Sourced authentication context via `useAuth()`.
  - Hidden the Create Subject card form for non-HOD users.
  - Hidden the "Actions" table column and action buttons for non-HOD users.
  - Added programmatic guards in `onSubmit`, `editSubject`, and `handleDelete` ensuring non-HOD users cannot mutate records.
- **`RegularTimetable.tsx` & `DailyTimetableChanges.tsx`**:
  - Conditionally rendered Add/Edit forms and action buttons strictly when `user?.role === 'HOD'`.
  - Guarded submission and deactivation handlers.
- **HOD Navigation & Pages**:
  - Registered `/dashboard/hod/subjects` and `/dashboard/hod/timetable` in the dashboard sidebar layout.
  - Created dedicated HOD pages hosting the management components.

---

## 3. Module 2: Admin Dashboard At-Risk Students Card

### 3.1 Backend Aggregation
- Updated `getAdministrationStats()` in `dashboard.repository.ts`.
- Sourced student information by joining `attendance_records`, `class_sessions` (`status = 'CONDUCTED'`), `students`, `student_enrollments` (`status = 'ACTIVE'`), `classes`, and `semesters`.
- Returns:
  - `admission_number`: Coalesced from `admission_number` or `student_id`.
  - `student_name`: Concatenated full name.
  - `class_name`: Resolved class code or section name (fallback `'Unassigned'`).
  - `semester_name`: Resolved semester name or number (fallback `'N/A'`).
  - `total_sessions`: Total conducted eligible attendance sessions.
  - `present_sessions`: Total attended sessions.
  - `attendance_percentage`: Accurately calculated percentage (`ROUND((present / total) * 100, 1)`).
- Filter criteria strictly enforced: `total_sessions > 0 AND (present / total) < 0.75`.

### 3.2 Frontend Display
- Enhanced the `at_risk` tab in `/dashboard/administration/page.tsx`.
- Formatted as an `overflow-x-auto` responsive table with clean typography, numeric alignment, and a red destructive badge: `<Badge variant="destructive">At Risk</Badge>`.
- Preserved existing layout, empty-state message (`"No students are currently at risk."`), loading skeletons, and error alerts.

---

## 4. Module 3: Academic Structure Deletions

### 4.1 Transition from Soft-Deactivate to Database Deletion
- **Classes (`classes.repository.ts`)**:
  - Converted `UPDATE classes SET is_active = FALSE` to `DELETE FROM classes WHERE id = ?`.
  - Added confirmation dialog and `deleteClass` trigger to the table actions column in `Classes.tsx`.
- **Departments (`academic.repository.ts`)**:
  - Converted `UPDATE departments SET is_active = FALSE` to `DELETE FROM departments WHERE id = ?`.
  - Added confirmation dialog, `deleteDept` trigger, and Delete button to `Departments.tsx`.
- **Specializations (`academic.repository.ts`)**:
  - Converted `UPDATE specializations SET is_active = FALSE` to `DELETE FROM specializations WHERE id = ?`.
  - Added `deleteSpec` action with `fetchData` refresh in `Specializations.tsx`.

### 4.2 Relational Integrity & Safeguards
- Foreign key constraints (`ON DELETE RESTRICT`) remain active in the database schema.
- If an entity is actively referenced by child sessions, attendance records, or enrollments, MySQL blocks deletion (`ER_ROW_IS_REFERENCED_2`), and the service translates this into a clean HTTP 409 Conflict message:
  `"Cannot delete record because it is referenced elsewhere"`.
- If an entity has no active references, it is cleanly purged from the database table.

---

## 5. Verification & Testing Matrix

| Test Suite / Operation | Command / Target | Outcome | Details |
| :--- | :--- | :--- | :--- |
| **RBAC Unit & Integration Tests** | `tests/verify_permissions.ts` | **PASS (29/29)** | Verified HOD write access and Admin 403 Forbidden across all subject and timetable endpoints. |
| **Admin Dashboard At-Risk Payload** | `tests/dashboard.test.ts` | **PASS** | Validated `lists.at_risk_students` fields, calculations, and empty-state contracts. |
| **Backend TypeScript Compilation** | `npm run build` (backend) | **PASS** | 0 TypeScript errors. Clean compilation into `dist/`. |
| **Frontend Production Build** | `npm run build` (frontend) | **PASS** | 30 static and dynamic routes compiled with 0 errors. |
| **Database Class Purge Verification** | Direct SQL query | **PASS** | Inserted and deleted class; record verified deleted (`0` remaining). |
| **Database Dept Purge Verification** | Direct HTTP delete | **PASS** | Tested `DELETE /api/v1/departments/3` on live server; verified `204 No Content` and row deleted from MySQL. |
| **Argon2 Password Hash Verification** | Direct HTTP login | **PASS** | Tested `POST /api/v1/auth/login` with `admin`/`admin123`; verified `200 OK` and session token generated. |
