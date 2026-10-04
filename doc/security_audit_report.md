# Security Audit & Remediation Report

## 1. Executive Summary
A comprehensive security audit of the Student Attendance Management System was conducted targeting Authentication, Authorization (RBAC/IDOR), Input Validation, CORS, and Data Exposure. Critical and High severity vulnerabilities were identified and actively remediated in the codebase to bring the application up to production-grade security standards while preserving existing API contracts and functionality.

## 2. Security Issues Discovered & Fixed

### 2.1. Authentication Bypass / Sliding Session Exploit
* **Severity**: **High**
* **Issue**: The `POST /api/v1/auth/refresh` endpoint was decoding JWT tokens with `{ ignoreExpiration: true }`. This allowed an attacker with an expired or stolen token to perpetually regenerate valid tokens, effectively bypassing session expiration.
* **Fix Implemented**: Removed `ignoreExpiration: true` from `auth.controller.ts`. The API now strictly validates that a token is mathematically valid and currently unexpired before issuing a sliding-session refresh.
* **File Changed**: `backend/src/modules/auth/auth.controller.ts`

### 2.2. Insecure Direct Object Reference (IDOR) - Session Spoofing
* **Severity**: **High**
* **Issue**: In `rbac.service.ts`, the `canManageSession` function allowed a user with a `TEACHER` role to create a session for *any* class by maliciously passing their own `teacher_id` as the `conducted_by_teacher_id` in the creation payload. This bypassed HOD and permanent teacher assignments, allowing unauthorized marking of attendance.
* **Fix Implemented**: Hardened `rbac.service.ts` so that when a teacher is creating a session for a class, they *must* be the permanently assigned teacher (`permTId === teacherId`) in the database for that `class_subject_id`. Substitute overriding is strictly prevented at the creation level unless performed by an authorized HOD/ADMIN.
* **File Changed**: `backend/src/modules/rbac/rbac.service.ts`

### 2.3. Insecure Direct Object Reference (IDOR) - Student Attendance Exposure
* **Severity**: **High**
* **Issue**: The `GET /api/v1/students/:id/attendance` endpoint lacked authorization scoping. Any authenticated student could fetch the attendance records of any other student by iterating over the `:id` parameter.
* **Fix Implemented**: 
  1. Created a new `'STUDENT'` authorization scope inside `authorizeScope.ts`.
  2. Implemented `canAccessStudent` inside `rbac.service.ts` to strictly verify that `STUDENT` roles can only query their own `student_id`.
  3. Applied the `authorizeScope('STUDENT')` middleware to the vulnerable routes in `students.routes.ts`.
* **Files Changed**: 
  - `backend/src/middleware/authorizeScope.ts`
  - `backend/src/modules/rbac/rbac.service.ts`
  - `backend/src/modules/rbac/rbac.repository.ts`
  - `backend/src/modules/students/students.routes.ts`

### 2.4. Cross-Origin Resource Sharing (CORS) Misconfiguration
* **Severity**: **Medium**
* **Issue**: The production CORS configuration allowed requests with no origin (`!origin`). While meant to permit mobile apps, this inherently allows server-side proxies, curl scripts, and Postman to bypass CORS entirely in a production environment, enabling CSRF-like automated API abuse.
* **Fix Implemented**: Restricted `!origin` allowances to strictly `NODE_ENV === 'development'`. Production environments now strictly require the origin to be in the `allowedOrigins` whitelist.
* **File Changed**: `backend/src/app.ts`

### 2.5. Information Disclosure - Credential Logging
* **Severity**: **Low**
* **Issue**: `auth.controller.ts` was actively logging login attempts to standard output, including the username and the length of the password (`passwordLength: password?.length`). This is a violation of logging best practices as it exposes credential metadata to log aggregation services.
* **Fix Implemented**: Completely removed the insecure `console.log` statement from the login flow.
* **File Changed**: `backend/src/modules/auth/auth.controller.ts`

## 3. Security Validations Performed (Phase 1-12)

* **SQL Injection**: Verified all `*.repository.ts` files. The application makes robust use of the `mysql2` pool with parameterized queries `(?)`. Dynamic updates safely use whitelisted keys (e.g. `updates.join(', ')`) preventing injection payloads.
* **Password Hashing**: Verified `argon2` is safely utilized for hashing and verifying passwords in `admin.service.ts` and `auth.service.ts`. Passwords are not exposed in standard user retrieval queries.
* **Rate Limiting**: Verified `express-rate-limit` is actively protecting the application globally (1000 req / 15m) and specifically on the authentication routes (10 req / 15m), mitigating brute-force attacks.
* **Input Validation**: Verified robust `zod` schemas are bound to routes via the `validateRequest` middleware, strictly preventing NoSQL-style type confusion and parameter pollution.

## 4. Remaining Risks & Recommendations

1. **Refresh Token Architecture**: Currently, the system uses a sliding-session JWT strategy where the access token acts as its own refresh token. While we secured this by preventing expired tokens from refreshing, it is recommended to implement an opaque `refresh_tokens` table in the database to allow for explicit remote session revocation.
2. **Rate Limit Storage**: `express-rate-limit` currently uses memory storage. In a multi-instance production environment, this will reset on deployment. It is recommended to migrate to a Redis store for distributed rate-limiting.
