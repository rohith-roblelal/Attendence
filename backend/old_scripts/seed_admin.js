/**
 * DEVELOPMENT ONLY — DO NOT RUN IN PRODUCTION
 *
 * This script seeds a local development admin account.
 * The credential produced by this script (admin / admin123) is a DEV-ONLY credential.
 * It MUST NOT be used in any production or staging environment.
 * Before production deployment, create a proper admin account with a strong unique password
 * via the admin API and remove or disable this account.
 */
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const argon2 = require('argon2');

dotenv.config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'attendance_db',
    ssl: { rejectUnauthorized: false }
  });

  try {
    const [roles] = await connection.query('SELECT id, name FROM roles');
    const adminRole = roles.find(r => r.name === 'ADMINISTRATION');
    if (!adminRole) {
      console.log('Role ADMINISTRATION not found.');
      return;
    }

    const passwordHash = await argon2.hash('admin123');
    await connection.query(
      'INSERT INTO users (role_id, username, password_hash, email, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [adminRole.id, 'admin', passwordHash, 'admin@example.com']
    );

    console.log('Successfully created admin user:');
    console.log('Username: admin');
    console.log('Password: admin123');
  } catch (err) {
    console.error('Error creating user:', err.message);
  } finally {
    await connection.end();
  }
}

run().catch(console.error);
