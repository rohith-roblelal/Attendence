# Onboarding Summary

## Verified Findings
1. **Architecture**: Express/TypeScript backend with MySQL, Next.js frontend with Tailwind and Shadcn UI.
2. **Scripts & Tests**: Backend uses `vitest` via `npm run test` (not Jest, although Jest types exist). Frontend has `playwright.config.ts` but no explicit `test` script in `package.json`.
3. **Database Migrations**: Strictly numerical order (`001_create_roles.sql` to `024_add_department_id_to_teachers.sql`).
4. **Mismatch Source**: The script `backend/scripts/seeder_2_2.js` attempts to insert `is_current` into `academic_years` (which actually expects `is_active`) and `status` into `semesters` (which has no status column).
5. **Authorization**: Strongly enforced RBAC. `ADMINISTRATION` has full rights. `HOD`, `TUTOR`, and `TEACHER` permissions are dynamically validated against database relationships (e.g., `isHodOfDepartment`, `isTutorOfClass`, `isTeacherAuthorizedForSession`).

## Unresolved Questions
- Should `seeder_2_2.js` be updated to match the migrations, or should it be deleted/deprecated in favor of `seed.ts`?
- Should we add a `test` script in the frontend `package.json` to wrap `playwright test`?

## Prioritized Plan for First Phase
1. Fix or deprecate `seeder_2_2.js` to eliminate the schema/seed mismatch.
2. Standardize test scripts across frontend and backend `package.json` files.
3. Validate DB schemas against the updated seed scripts in an integration environment.
