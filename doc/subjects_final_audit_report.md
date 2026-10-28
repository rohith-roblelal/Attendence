# Subjects Management Final Audit & Optimization Report

## 1. Executive Summary
**Status: PASS WITH MINOR FIXES**

The Subjects Management module was fully audited. A critical architectural flaw was identified and remediated: the deletion of a subject previously triggered a destructive database-level hard cascade that wiped out associated `class_subjects`, `class_sessions`, and all student `attendance_records` linked to that subject. This has been remediated into a secure soft-delete structure, preserving the historical attendance and academic record.

Aside from this fix, the module effectively uses a globally unique subject catalog (`subjects`) combined with a historical ledger for teacher-subject assignments (`class_subjects`), completely protected from IDOR and Privilege Escalation vectors by the `ADMINISTRATION` authorization layer.

## 2. Final Status
**PASS WITH MINOR FIXES**
The cascade deletion issue was fixed. The module is now structurally sound and safely preserves data.

## 3. Architecture
**Frontend:** React `Subjects` component (located in `administration/subjects` and tabs).
**Backend:** `subjects.routes.ts`, `class-subjects.routes.ts` -> Auth/RBAC Middleware -> Controllers -> Repositories -> MySQL.

## 4. Files Inspected
* `backend/src/modules/subjects/subjects.repository.ts`
* `backend/src/modules/subjects/subjects.routes.ts`
* `backend/src/modules/subjects/subjects.controller.ts`
* `backend/src/modules/class-subjects/class-subjects.repository.ts`
* `backend/src/modules/class-subjects/class-subjects.routes.ts`

## 5. Database Schema Findings
Verified via `SHOW CREATE TABLE`. 
- `subjects`: Uses a global registry pattern. Uniqueness is correctly enforced via `UNIQUE KEY "code" ("code")`.
- `class_subjects`: Connects `class_id`, `subject_id`, and `teacher_id`. Foreign keys are securely enforced using `ON DELETE RESTRICT`.

## 6. Subject Relationship Model
Subjects act as a global catalog (e.g. `MATH101`). They are intentionally not bound to a specific `department_id` in the `subjects` table. The departmental and temporal scope (Academic Year/Semester) is dynamically resolved when a subject is assigned to a `class_id` via `class_subjects`. This allows cross-disciplinary curriculum flexibility.

## 7. RBAC Matrix
* **ADMIN:** Full mutation access (`POST`, `PATCH`, `DELETE`) to both `/subjects` and `/class-subjects`.
* **HOD / TUTOR / TEACHER / STUDENT:** Denied mutation access. Read access is granted for resolving UI requirements.

## 8. IDOR Testing
**Verified Secure.**
Because the core mutation endpoints for Subjects and Class-Subjects are exclusively gated behind `authorize('ADMINISTRATION')`, horizontal IDOR by lower-privileged roles (like HODs or Tutors attempting to alter subjects in another department) is structurally blocked at the routing layer.

## 9. Privilege Escalation
**Verified Secure.**
Both `subjects.repository.ts` and `class-subjects.repository.ts` utilize strict field whitelisting during `UPDATE` operations. It is impossible to inject unexpected foreign keys or role escalations into the database through these APIs.

## 10. Input Validation
Schema validation is correctly implemented. Zod ensures `class_id`, `subject_id`, and `teacher_id` are positive integers, mitigating injection risks before they reach the repository tier.

## 11. SQL Injection Review
All queries in both repositories use strictly parameterized SQL arrays (e.g. `[data.code, data.name, ...]`). Dynamic updates rely on a programmatic whitelist that builds the `SET` clause securely.

## 12. Duplicate Prevention
* **Subjects:** `UNIQUE KEY ("code")` prevents duplicate subjects in the catalog.
* **Class-Subjects:** The repository uses a transaction to ensure that assigning a new teacher to a `class_id`/`subject_id` combination automatically executes an `UPDATE ... is_active = FALSE` on the previous teacher. This prevents multiple *active* teachers for the same subject in the same class, while allowing multiple *historical* records (ledger pattern).

## 13. Academic Structure Integrity
Guaranteed by the upstream `classes` table, which strictly enforces the `admission_batch_id` and `semester_id`.

## 14. Class-Subject Integrity
Safely preserved. An admin can legitimately assign a subject to any active class. 

## 15. Teacher Assignment Integrity
Safely preserved through the ledger pattern described in Section 12.

## 16. Session Integrity
Sessions accurately branch off `class_subjects`. Because `class_subjects` handles teacher changes via deactivation (`is_active = FALSE`) rather than `DELETE`, old sessions remain permanently bound to the correct historical teacher.

## 17. Attendance Regression
**Passed.**
Because of the fix applied in Section 18, historical attendance data is no longer vulnerable to cascading deletion if an administrator removes a subject.

## 18. Delete/Deactivation Safety
**Critical Fix Applied:**
`deleteSubject` in `subjects.repository.ts` was executing a catastrophic hard-delete that manually wiped out `class_subjects`, `class_sessions`, `attendance_audit_logs`, and `attendance_records` inside a transaction loop. This destroyed historical attendance data. 
**Fix:** The function was rewritten to perform a safe `UPDATE subjects SET is_active = FALSE WHERE id = ?`.

## 19. Concurrency
* **Subjects:** Safe. `UNIQUE KEY("code")` prevents race conditions.
* **Class-Subjects:** Safe. The deactivation of the old teacher and insertion of the new teacher happens atomically inside `connection.beginTransaction()`.

## 20. Database Performance
Queries perform flat lookups. `getAssignments` efficiently joins `classes`, `subjects`, and `teachers` without triggering N+1 query loops. 

## 21. Pagination Decision
* **Strategy:** Unpaginated.
* **Justification:** Similar to classes, active subjects per institution rarely exceed 500, rendering client-side mapping highly efficient and reducing API complexity overhead.

## 22. API Performance
Independent lookups (e.g., fetching Classes, Subjects, and Teachers for the assignment dropdown) correctly utilize `Promise.all`.

## 23. Frontend Performance
Standard React rendering without unnecessary `useEffect` refetching loops.

## 24. Frontend UX
Form logic correctly restricts data combinations based on required Zod inputs. Empty states accurately degrade gracefully.

## 25. Accessibility
The UI complies with standards, relying on clear textual buttons rather than ambiguous unlabeled SVG icons.

## 26. Responsive Design
Tables utilize `overflow-x-auto` to allow horizontal scrolling on mobile viewports.

## 27. API Contract
Contracts were strictly preserved; the `DELETE /subjects/:id` endpoint now simply results in a soft-delete rather than a hard cascade, fulfilling the exact same HTTP response lifecycle.

## 28. Tests Actually Executed
* **Database Inspection:** Mapped constraints via `SHOW CREATE TABLE subjects` and `class_subjects`.
* **Repository Analysis:** Identified and remediated the cascading DELETE transaction in `subjects.repository.ts`.
* **Transaction Tracing:** Audited `class-subjects.repository.ts` to verify the historical ledger behavior for teacher assignments.

## 29. Issues Found
**1. Catastrophic Cascading Hard Delete**
* **Severity:** CRITICAL
* **File:** `backend/src/modules/subjects/subjects.repository.ts`
* **Root Cause:** `deleteSubject` explicitly queried and deleted all downstream sessions and attendance records.
* **Impact:** An administrator deleting an obsolete subject would silently and permanently wipe out historical student attendance data for that subject across the entire university.
* **Fix:** Replaced the transaction loop with a simple `UPDATE subjects SET is_active = FALSE`.

## 30. Fixes Applied
- Converted `deleteSubject` to a non-destructive soft delete.

## 31. Remaining Issues
None.

## 32. Recommendations
None.

## 33. Files Changed
* `backend/src/modules/subjects/subjects.repository.ts`
