# Phase 6 — Production Architecture & Migration Planning (LAMP Edition)

## 1. Executive Summary
This document outlines the production architecture for the College Attendance System deployed on the **LAMP Stack (Linux, Apache, MySQL, PHP)**.

The primary goals of this architecture are:
* **Zero internet dependency**: Runs autonomously on private institution LAN networks without CDN or external cloud dependencies.
* **Low resource overhead**: Lightweight PHP 8.x PDO execution on standard Apache HTTP server.
* **Deterministic security**: Session-based RBAC, strict SQL prepared statements, and role-enforced page boundaries.
* **Straightforward operations**: Standard XAMPP or native Ubuntu/Debian `apt install apache2 php mysql-server` deployment.

---

## 2. Production Architecture

### A. Web Server: Apache HTTP Server (`apache2`)
* Modules required: `mod_rewrite`, `mod_headers`, `mod_authz_core`.
* Document root configured to serve `lamp-version/` directly or as `/attendance`.
* Protected directories (`config/`, `includes/`) blocked via `.htaccess` or Apache config.

### B. Application Runtime: PHP 8.1+
* Extensions: `php-pdo`, `php-mysql`, `php-mbstring`, `php-json`.
* Secure session settings: `session.cookie_httponly = 1`, `session.cookie_samesite = "Strict"`.

### C. Database: MySQL 8.0 / MariaDB 10.x
* Single database instance hosting the relational schema from `lamp-version/database/schema.sql`.
* Seed data provided via `lamp-version/database/seed.sql` for out-of-the-box role testing.


---

## 3. Environment Variables Matrix

### Local Development (XAMPP)
* **Frontend** (`.env.local`): `NEXT_PUBLIC_API_URL=https://attendence-dcaw.onrender.com/api/v1`
* **Backend** (`.env`):
  * `FRONTEND_URL=http://localhost:3000`
  * `DB_HOST=127.0.0.1` (XAMPP)
  * `DB_USER=root`
  * `NODE_ENV=development`

### Production
* **Frontend** (Vercel Dashboard): `NEXT_PUBLIC_API_URL=https://<your-render-backend-url>/api/v1`
* **Backend** (Render Dashboard):
  * `FRONTEND_URL=https://<your-vercel-frontend-url>`
  * `DB_HOST=<aiven-host>`
  * `DB_USER=<aiven-user>`
  * `DB_PASSWORD=<aiven-password>`
  * `DB_NAME=defaultdb`
  * `JWT_SECRET=<secure-random-32-char-string>`
  * `NODE_ENV=production`

---

## 4. XAMPP -> Production Migration Runbook

This runbook safely ports the database schema and seeded data to the cloud without modifying the local XAMPP environment.

### Phase A: Database Export (From Local XAMPP)
1. Ensure your local XAMPP MySQL is running.
2. Open a terminal and run the following export command to dump the schema and data (including the `timetable_swaps` table and all seed data):
   ```bash
   mysqldump -u root college_attendance > college_attendance_prod_migration.sql
   ```
3. Keep this file locally; do **not** commit it to Git as it contains active hashes and potentially sensitive audit logs.

### Phase B: Database Import (To Aiven Production)
1. Create the Free MySQL service on Aiven.
2. Obtain the connection details (`Host`, `Port`, `User`, `Password`, `Database Name`).
3. Import the local dump directly into the remote database:
   ```bash
   mysql -h <aiven-host> -P <aiven-port> -u <aiven-user> -p <aiven-database-name> < college_attendance_prod_migration.sql
   ```
4. Verify the migration by logging into the remote DB and checking the tables:
   ```sql
   SHOW TABLES;
   SELECT COUNT(*) FROM users;
   ```

### Phase C: Backend Deployment
1. Connect your GitHub repository to Render.
2. Create a new "Web Service".
3. **Build Command**: `npm install && npm run build` (Executed in the `backend/` directory).
4. **Start Command**: `npm start` (or `node dist/app.js`).
5. Inject the Aiven Database credentials and `JWT_SECRET` into the Render Environment Variables tab.
6. Deploy and verify health using `https://<render-url>/api/v1/health`.

### Phase D: Frontend Deployment
1. Connect your GitHub repository to Vercel.
2. Ensure the Framework Preset is set to "Next.js".
3. Set the `NEXT_PUBLIC_API_URL` environment variable to the Render URL.
4. Deploy.

---

## 5. Operations & Disaster Recovery

* **Backups**: Aiven automatically performs daily backups. For manual backups, run the `mysqldump` command pointing to the Aiven host.
* **Monitoring**: Vercel provides frontend web analytics. Render provides backend log streaming.
* **Rollback**: If a deployment fails, Vercel allows instant 1-click rollbacks to the previous deployment. Render allows deploying from a previous specific commit.
* **Local Dev Integrity**: Developers continue to run `npm run dev` against XAMPP on `localhost:3306`. The local `.env` files are fully git-ignored, ensuring production config never accidentally leaks into local development, and vice-versa.
