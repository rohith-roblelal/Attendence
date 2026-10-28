CREATE TABLE student_enrollments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT UNSIGNED NOT NULL,
    class_id BIGINT UNSIGNED NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    status VARCHAR(30) NOT NULL,
    transfer_reason VARCHAR(255) NULL,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT,
    INDEX idx_enrollments_student (student_id),
    INDEX idx_enrollments_class (class_id),
    INDEX idx_enrollments_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
