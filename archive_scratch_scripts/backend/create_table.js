const mysql = require('mysql2/promise');

async function createTable() {
  const pool = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'college_attendance'
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS timetable_swaps (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        requesting_teacher_id BIGINT UNSIGNED NOT NULL,
        target_teacher_id BIGINT UNSIGNED NOT NULL,
        requesting_class_subject_id BIGINT UNSIGNED,
        target_class_subject_id BIGINT UNSIGNED,
        status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
        request_date DATE,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (requesting_teacher_id) REFERENCES teachers(id),
        FOREIGN KEY (target_teacher_id) REFERENCES teachers(id),
        FOREIGN KEY (requesting_class_subject_id) REFERENCES class_subjects(id),
        FOREIGN KEY (target_class_subject_id) REFERENCES class_subjects(id)
      )
    `);
    console.log('Created timetable_swaps table');
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

createTable();
