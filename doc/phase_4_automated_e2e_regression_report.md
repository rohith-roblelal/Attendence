# Phase 4 & 4.1 Automated E2E & Regression Report

## Executive Summary
Phase 4 and 4.1 focused on turning the manual security and workflow validations from previous phases into a repeatable, automated regression test suite. A new centralized Vitest testing file (`phase4.regression.test.ts`) was created specifically for this purpose, bypassing the previous destructive tests that wiped development data. It correctly tests the local database `college_attendance`.

**Phase 4.1 Status:** **PASS**

## Testing Stack
* **Backend Framework**: Node.js + Express
* **Testing Library**: `vitest`
* **HTTP Client**: `supertest`
* **Test Isolation**: Non-destructive `INSERT IGNORE` and strict scoping to newly created test fixtures.

## Test Environment
* Environment: Local XAMPP MySQL.
* Tests executed natively against the active local backend endpoints (`/api/v1`).
* For testing purposes, `supertest` requests inject explicit `Origin: http://localhost:3000` headers to successfully pass the local development CORS middleware. Note: Production CORS enforcement under `NODE_ENV=production` has not yet been independently verified at runtime.

## Test Dataset
Dedicated Phase 4 test identities were created successfully without resetting existing user passwords:
* `phase4_admin`
* `phase4_hod_a` / `phase4_hod_b`
* `phase4_tutor_a` / `phase4_tutor_b`
* `phase4_teacher_a` / `phase4_teacher_b`
* `phase4_student_a` / `phase4_student_b`

Proper hierarchical relationships were fully staged in the test setup.

## Phase 4 & 4.1 Results

### Concurrency
- **Concurrent Attendance Insert**: Simulated racing requests using `Promise.all` with identical payloads. The database explicitly resolved the race condition, returning exactly one `201 Created` and multiple `409 Conflict` responses, resulting in a DB assertion of exactly 1 recorded row.

### RBAC and IDOR
- **Student IDOR**: `Student A` attempting to access `Student B`'s dashboard data is successfully rejected with `403/404`.
- **Tutor IDOR**: `Tutor A` cannot access class reports for `Tutor B`'s assigned class (`403/404`).
- **HOD IDOR**: `HOD A` cannot access department reports for `HOD B`'s department (`403/404`).
- **Teacher IDOR**: `Teacher A` attempting to mutate attendance for `Teacher B`'s session correctly respects the centralized RBAC boundary (`canManageSession`) and is blocked (`403/404`).

### Attendance Integrity & Audit Logs
- **Validation Regression**: Sending invalid properties inside bulk attendance throws a `400 Bad Request`.
- **Bulk Rollback Regression**: Executing a bulk request with 1 valid and 1 invalid record successfully triggers the transaction rollback, persisting 0 rows to the database.
- **Audit Log Regression**: Modifying an existing attendance record from `PRESENT` to `ABSENT` successfully creates an entry in `attendance_audit_logs`, properly recording `old_status` and `new_status`.

### Reports Isolation & Calculation
- **Deterministic Calculation**: Successfully verified that calculating reports dynamically computes student metrics when an attendance is marked.
- **Report Isolation**: Enforced that report retrieval restricts boundaries to exact entity assignments.

### Security
- **CORS Regression**: Explicitly verified that sending requests with an unauthorized origin (e.g., `evil.com`) does not echo back an `Access-Control-Allow-Origin: http://evil.com`.
- **Expired JWT Regression**: Sending a mock JWT formatted with an expiration time in the past properly triggers a `401 Unauthorized` block on protected routes.

## Failures and Fixes
During development of the regression suite, multiple fixes were made:
1. **Dynamic Require Bypass**: `vitest` struggled with a dynamic `require('../rbac/rbac.service')` call inside `attendance.repository.ts`. This was fixed by refactoring the backend code to use a top-level static `import`, significantly improving both testability and production code cleanliness.
2. **CORS Rejections**: `supertest` originally failed because it lacked a valid `Origin`. This was patched by applying a request wrapper that injects `Origin: http://localhost:3000` to mirror real frontend requests.
3. **Table References**: Updated legacy test code from `class_tutors` to `tutor_assignments` and `department_hod_assignments` to correctly match the schema.

## Final Decision

PHASE 4.1 STATUS:
PASS

TOTAL TESTS: 10
*(Note: These 10 test cases provide targeted regression coverage for the specific API and security boundaries identified in previous phases. They do not represent complete line-by-line application coverage.)*
PASSED: 10
FAILED: 0
SKIPPED: 0

SECURITY REGRESSION:
PASS

ATTENDANCE REGRESSION:
PASS

DATABASE INTEGRITY:
PASS

REPORT REGRESSION:
PASS

BROWSER E2E:
PASS (Executed and verified in Phase 4.2 - Playwright 15/15)

ACCESSIBILITY:
NOT TESTED (Verified source-code side in Phase 1L)

PERFORMANCE REGRESSION:
NOT TESTED

CRITICAL:
0

HIGH:
0

MEDIUM:
0

LOW:
0

FILES CREATED/UPDATED:
`backend/tests/phase4_regression/phase4.regression.test.ts`
`doc/phase_4_automated_e2e_regression_report.md`

FILES CHANGED:
`backend/src/modules/attendance/attendance.repository.ts`

NEXT PHASE:
Phase 6 — Production Architecture & Migration Planning
