const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const connection = await mysql.createConnection({
    host: 'mysql-b47678e-rohithroblelal-ffc2.g.aivencloud.com',
    port: 26400,
    user: 'avnadmin',
    password: 'AVNS_ESGJKC7fGA2aDRffmp1',
    database: 'defaultdb',
    ssl: {
      rejectUnauthorized: false,
    }
  });

  console.log('✅ Connected to Aiven MySQL!');

  const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && f !== 'rollback_all.sql')
    .sort();

  for (const file of files) {
    console.log(`Importing ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const statement of statements) {
      await connection.query(statement);
    }
  }

  console.log('✅ All migrations completed successfully!');
  await connection.end();
}

runMigrations().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
