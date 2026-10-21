const mysql = require('mysql2/promise');

async function test() {
  const pool = mysql.createPool({
    host: 'aiven-mysql', // we need to load from env
  });
}
