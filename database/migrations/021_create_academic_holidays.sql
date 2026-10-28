CREATE TABLE academic_holidays (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    academic_year_id BIGINT UNSIGNED NOT NULL,
    holiday_date DATE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(255) NULL,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
