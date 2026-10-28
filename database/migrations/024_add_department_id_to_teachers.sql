ALTER TABLE teachers ADD COLUMN department_id BIGINT UNSIGNED DEFAULT NULL;
ALTER TABLE teachers ADD CONSTRAINT fk_teacher_dept FOREIGN KEY (department_id) REFERENCES departments(id);
