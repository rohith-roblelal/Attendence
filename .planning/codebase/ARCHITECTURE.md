# Architecture Map

## Stack
- Frontend: Next.js 15, React 19, Tailwind CSS 4, Shadcn UI
- Backend: Node.js, Express 5, TypeScript
- Database: MySQL (using mysql2 driver, direct queries without an ORM)
- Validation: Zod
- Logging: Pino

## Testing
- Backend: Vitest (runner configured in vitest.config.ts) and Supertest for integration.
- Frontend: Playwright for E2E tests (configured in playwright.config.ts).
