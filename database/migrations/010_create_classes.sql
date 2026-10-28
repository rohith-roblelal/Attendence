CREATE TABLE classes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admission_batch_id BIGINT UNSIGNED NOT NULL,
    semester_id BIGINT UNSIGNED NOT NULL,
    section_name VARCHAR(20) NOT NULL,
    class_code VARCHAR(50) UNIQUE NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uk_batch_sem_sec (admission_batch_id, semester_id, section_name),
    FOREIGN KEY (admission_batch_id) REFERENCES admission_batches(id) ON DELETE RESTRICT,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE RESTRICT,
    INDEX idx_classes_batch (admission_batch_id),
    INDEX idx_classes_sem (semester_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
