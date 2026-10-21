import { pool } from './src/db/pool';

async function test() {
  const [users] = await pool.query('SELECT u.id, u.username, r.name as role FROM users u JOIN roles r ON u.role_id = r.id');
  const [teachers] = await pool.query('SELECT id, user_id, first_name FROM teachers');
  
  console.log('Users:');
  console.log(users);
  
  console.log('Teachers:');
  console.log(teachers);
  
  process.exit(0);
}
test();
