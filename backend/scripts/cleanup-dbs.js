const mysql = require('mysql2/promise');

async function dropDatabases() {
  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: ''
    });

    const databasesToDrop = [
      'attendance_system',
      'college_attendance_restore_test',
      'college_attendance_test'
    ];

    for (const db of databasesToDrop) {
      try {
        await connection.query(`DROP DATABASE IF EXISTS \`${db}\``);
        console.log(`Dropped database: ${db}`);
      } catch (err) {
        console.error(`Failed to drop ${db}:`, err.message);
      }
    }

    await connection.end();
    console.log('Cleanup complete.');
  } catch (error) {
    console.error('Error connecting to MySQL:', error.message);
  }
}

dropDatabases();
