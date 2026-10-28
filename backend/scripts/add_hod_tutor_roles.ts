import { pool } from '../src/db/pool';

async function main() {
  await pool.query(`
    INSERT IGNORE INTO roles (name, description, created_at) VALUES 
    ('HOD', 'Head of Department', NOW()), 
    ('TUTOR', 'Class Tutor', NOW())
  `);
  const [roles] = await pool.query('SELECT * FROM roles');
  console.log('UPDATED ROLES:', roles);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
