const mysql = require('mysql2/promise');

async function setupTestDb() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: ''
  });

  try {
    console.log('Dropping existing test DB...');
    await conn.query('DROP DATABASE IF EXISTS college_attendance_test');
    
    console.log('Creating test DB...');
    await conn.query('CREATE DATABASE college_attendance_test');
    
    console.log('Connecting to primary DB to fetch schema...');
    const dbConn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      database: 'college_attendance'
    });

    const [tables] = await dbConn.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
    const tableNames = tables.map(t => Object.values(t)[0]);

    console.log(`Found ${tableNames.length} tables. Cloning schema...`);
    
    await conn.query('USE college_attendance_test');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    
    for (const tableName of tableNames) {
      const [createRow] = await dbConn.query(`SHOW CREATE TABLE \`${tableName}\``);
      const createSql = createRow[0]['Create Table'];
      await conn.query(createSql);
      console.log(`Cloned table: ${tableName}`);
    }
    
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Test database setup complete.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to setup test database:', error);
    process.exit(1);
  }
}

setupTestDb();
