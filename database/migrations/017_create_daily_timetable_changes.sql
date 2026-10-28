CREATE TABLE daily_timetable_changes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    class_id BIGINT UNSIGNED NOT NULL,
    change_date DATE NOT NULL,
    original_period TINYINT NOT NULL,
    new_period TINYINT NULL,
    original_class_subject_id BIGINT UNSIGNED NOT NULL,
    new_class_subject_id BIGINT UNSIGNED NULL,
    change_type VARCHAR(30) NOT NULL,
    reason VARCHAR(255) NULL,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT,
    FOREIGN KEY (original_class_subject_id) REFERENCES class_subjects(id) ON DELETE RESTRICT,
    FOREIGN KEY (new_class_subject_id) REFERENCES class_subjects(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_dtc_class_date (class_id, change_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
