CREATE TABLE attendance_audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    attendance_record_id BIGINT UNSIGNED NOT NULL,
    student_id BIGINT UNSIGNED NOT NULL,
    class_session_id BIGINT UNSIGNED NOT NULL,
    changed_by BIGINT UNSIGNED NOT NULL,
    old_status VARCHAR(10) NOT NULL,
    new_status VARCHAR(10) NOT NULL,
    reason VARCHAR(255) NULL,
    changed_at DATETIME NOT NULL,
    FOREIGN KEY (attendance_record_id) REFERENCES attendance_records(id) ON DELETE RESTRICT,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
    FOREIGN KEY (class_session_id) REFERENCES class_sessions(id) ON DELETE RESTRICT,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_audit_student (student_id),
    INDEX idx_audit_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
