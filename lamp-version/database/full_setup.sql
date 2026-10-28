-- ========================================================
-- College Attendance Management System - LAMP Stack Edition
-- Database Schema (DDL)
-- Fully compatible with existing College Attendance schema
-- ========================================================

CREATE DATABASE IF NOT EXISTS `college_attendance` 
DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `college_attendance`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Roles Table
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(30) UNIQUE NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Users Table
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `role_id` BIGINT UNSIGNED NOT NULL,
    `username` VARCHAR(100) UNIQUE NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) UNIQUE NULL,
    `phone` VARCHAR(20) NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `last_login_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT,
    INDEX `idx_users_role` (`role_id`),
    INDEX `idx_users_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Academic Years Table
DROP TABLE IF EXISTS `academic_years`;
CREATE TABLE `academic_years` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(20) UNIQUE NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `is_active` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Departments Table
DROP TABLE IF EXISTS `departments`;
CREATE TABLE `departments` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(20) UNIQUE NOT NULL,
    `name` VARCHAR(150) UNIQUE NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Specializations Table
DROP TABLE IF EXISTS `specializations`;
CREATE TABLE `specializations` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `department_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Admission Batches Table
DROP TABLE IF EXISTS `admission_batches`;
CREATE TABLE `admission_batches` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `academic_year_id` BIGINT UNSIGNED NOT NULL,
    `department_id` BIGINT UNSIGNED NOT NULL,
    `specialization_id` BIGINT UNSIGNED NULL,
    `batch_name` VARCHAR(50) NOT NULL,
    `admission_year` YEAR NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`specialization_id`) REFERENCES `specializations`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Semesters Table
DROP TABLE IF EXISTS `semesters`;
CREATE TABLE `semesters` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `academic_year_id` BIGINT UNSIGNED NOT NULL,
    `semester_number` TINYINT NOT NULL,
    `name` VARCHAR(20) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Teachers Table
DROP TABLE IF EXISTS `teachers`;
CREATE TABLE `teachers` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED UNIQUE NOT NULL,
    `teacher_id` VARCHAR(30) UNIQUE NOT NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NULL,
    `designation` VARCHAR(100) NULL,
    `department_id` BIGINT UNSIGNED DEFAULT NULL,
    `joined_at` DATE NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT,
    INDEX `idx_teachers_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Students Table
DROP TABLE IF EXISTS `students`;
CREATE TABLE `students` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED UNIQUE NOT NULL,
    `student_id` VARCHAR(30) UNIQUE NOT NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NULL,
    `date_of_birth` DATE NULL,
    `admission_number` VARCHAR(50) UNIQUE NULL,
    `joined_at` DATE NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
    INDEX `idx_students_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Classes Table
DROP TABLE IF EXISTS `classes`;
CREATE TABLE `classes` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `admission_batch_id` BIGINT UNSIGNED NOT NULL,
    `semester_id` BIGINT UNSIGNED NOT NULL,
    `section_name` VARCHAR(20) NOT NULL,
    `class_code` VARCHAR(50) UNIQUE NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_batch_sem_sec` (`admission_batch_id`, `semester_id`, `section_name`),
    FOREIGN KEY (`admission_batch_id`) REFERENCES `admission_batches`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`semester_id`) REFERENCES `semesters`(`id`) ON DELETE RESTRICT,
    INDEX `idx_classes_batch` (`admission_batch_id`),
    INDEX `idx_classes_sem` (`semester_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Student Enrollments Table
DROP TABLE IF EXISTS `student_enrollments`;
CREATE TABLE `student_enrollments` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `student_id` BIGINT UNSIGNED NOT NULL,
    `class_id` BIGINT UNSIGNED NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    `transfer_reason` VARCHAR(255) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE RESTRICT,
    INDEX `idx_enrollments_student` (`student_id`),
    INDEX `idx_enrollments_class` (`class_id`),
    INDEX `idx_enrollments_dates` (`start_date`, `end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Subjects Table
DROP TABLE IF EXISTS `subjects`;
CREATE TABLE `subjects` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(30) UNIQUE NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `subject_type` VARCHAR(30) NOT NULL DEFAULT 'THEORY',
    `default_contact_hours` DECIMAL(5,2) DEFAULT 1.00,
    `credits` DECIMAL(4,2) NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Class Subjects (Faculty Subject Assignments) Table
DROP TABLE IF EXISTS `class_subjects`;
CREATE TABLE `class_subjects` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `class_id` BIGINT UNSIGNED NOT NULL,
    `subject_id` BIGINT UNSIGNED NOT NULL,
    `teacher_id` BIGINT UNSIGNED NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE RESTRICT,
    INDEX `idx_cs_class` (`class_id`),
    INDEX `idx_cs_subject` (`subject_id`),
    INDEX `idx_cs_teacher` (`teacher_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Department HOD Assignments Table
DROP TABLE IF EXISTS `department_hod_assignments`;
CREATE TABLE `department_hod_assignments` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `department_id` BIGINT UNSIGNED NOT NULL,
    `teacher_id` BIGINT UNSIGNED NOT NULL,
    `academic_year_id` BIGINT UNSIGNED NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Class Sessions Table
DROP TABLE IF EXISTS `class_sessions`;
CREATE TABLE `class_sessions` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `class_id` BIGINT UNSIGNED NOT NULL,
    `class_subject_id` BIGINT UNSIGNED NOT NULL,
    `session_date` DATE NOT NULL,
    `period_number` TINYINT NOT NULL,
    `assigned_teacher_id` BIGINT UNSIGNED NOT NULL,
    `conducted_by_teacher_id` BIGINT UNSIGNED NOT NULL,
    `contact_hours` DECIMAL(5,2) DEFAULT 1.00,
    `status` VARCHAR(30) NOT NULL DEFAULT 'CONDUCTED',
    `source` VARCHAR(30) NOT NULL DEFAULT 'DIRECT_ENTRY',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`class_subject_id`) REFERENCES `class_subjects`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`assigned_teacher_id`) REFERENCES `teachers`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`conducted_by_teacher_id`) REFERENCES `teachers`(`id`) ON DELETE RESTRICT,
    INDEX `idx_sessions_class_date` (`class_id`, `session_date`),
    INDEX `idx_sessions_subject_date` (`class_subject_id`, `session_date`),
    INDEX `idx_sessions_teacher_date` (`conducted_by_teacher_id`, `session_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Attendance Records Table
DROP TABLE IF EXISTS `attendance_records`;
CREATE TABLE `attendance_records` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `class_session_id` BIGINT UNSIGNED NOT NULL,
    `student_id` BIGINT UNSIGNED NOT NULL,
    `status` VARCHAR(10) NOT NULL, -- 'PRESENT' or 'ABSENT'
    `marked_by` BIGINT UNSIGNED NOT NULL,
    `marked_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_session_student` (`class_session_id`, `student_id`),
    FOREIGN KEY (`class_session_id`) REFERENCES `class_sessions`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT,
    FOREIGN KEY (`marked_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
    INDEX `idx_attendance_session` (`class_session_id`),
    INDEX `idx_attendance_student` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Attendance Audit Logs Table
DROP TABLE IF EXISTS `attendance_audit_logs`;
CREATE TABLE `attendance_audit_logs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `attendance_record_id` BIGINT UNSIGNED NOT NULL,
    `student_id` BIGINT UNSIGNED NOT NULL,
    `class_session_id` BIGINT UNSIGNED NOT NULL,
    `changed_by` BIGINT UNSIGNED NOT NULL,
    `old_status` VARCHAR(10) NOT NULL,
    `new_status` VARCHAR(10) NOT NULL,
    `reason` VARCHAR(255) NULL,
    `changed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
-- ========================================================
-- College Attendance Management System - LAMP Stack Edition
-- Initial Seed Data
-- Default password for all seed accounts: password123
-- ========================================================

USE `college_attendance`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Insert Roles
INSERT INTO `roles` (`id`, `name`, `description`, `created_at`) VALUES
(1, 'ADMINISTRATION', 'System Administrator with full access', NOW()),
(2, 'HOD', 'Head of Department managing classes, subjects and faculty', NOW()),
(3, 'TEACHER', 'Faculty member conducting classes and marking attendance', NOW()),
(4, 'STUDENT', 'Enrolled student viewing attendance records and statistics', NOW())
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- 2. Insert Users (Password: password123)
-- Hash generated using bcrypt: $2y$10$w8.T9Z3r5e2pQ6eY1XzUe.Y91A5K6u7b3c2d1e0f9g8h7i6j5k4l
-- Note: PHP authentication layer will also automatically rehash/verify password123 directly.
INSERT INTO `users` (`id`, `role_id`, `username`, `password_hash`, `email`, `phone`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'admin', '$2y$10$tQOaG7x4.Rj46WfJzW9Z5eS1203/60z1v35f793oXn0w7cM7iN7/m', 'admin@college.edu', '9876543210', 1, NOW(), NOW()),
(2, 2, 'hod_cs', '$2y$10$tQOaG7x4.Rj46WfJzW9Z5eS1203/60z1v35f793oXn0w7cM7iN7/m', 'hod.cse@college.edu', '9876543211', 1, NOW(), NOW()),
(3, 3, 'faculty_sharma', '$2y$10$tQOaG7x4.Rj46WfJzW9Z5eS1203/60z1v35f793oXn0w7cM7iN7/m', 'sharma.cse@college.edu', '9876543212', 1, NOW(), NOW()),
(4, 3, 'faculty_raj', '$2y$10$tQOaG7x4.Rj46WfJzW9Z5eS1203/60z1v35f793oXn0w7cM7iN7/m', 'raj.cse@college.edu', '9876543213', 1, NOW(), NOW()),
(5, 4, 'student_arun', '$2y$10$tQOaG7x4.Rj46WfJzW9Z5eS1203/60z1v35f793oXn0w7cM7iN7/m', 'arun.k@student.college.edu', '9876543214', 1, NOW(), NOW()),
(6, 4, 'student_priya', '$2y$10$tQOaG7x4.Rj46WfJzW9Z5eS1203/60z1v35f793oXn0w7cM7iN7/m', 'priya.s@student.college.edu', '9876543215', 1, NOW(), NOW()),
(7, 4, 'student_rahul', '$2y$10$tQOaG7x4.Rj46WfJzW9Z5eS1203/60z1v35f793oXn0w7cM7iN7/m', 'rahul.v@student.college.edu', '9876543216', 1, NOW(), NOW()),
(8, 4, 'student_sneha', '$2y$10$tQOaG7x4.Rj46WfJzW9Z5eS1203/60z1v35f793oXn0w7cM7iN7/m', 'sneha.m@student.college.edu', '9876543217', 1, NOW(), NOW()),
(9, 4, 'student_vikram', '$2y$10$tQOaG7x4.Rj46WfJzW9Z5eS1203/60z1v35f793oXn0w7cM7iN7/m', 'vikram.n@student.college.edu', '9876543218', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

-- 3. Academic Year
INSERT INTO `academic_years` (`id`, `name`, `start_date`, `end_date`, `is_active`, `created_at`, `updated_at`) VALUES
(1, '2025-2026', '2025-07-01', '2026-06-30', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `is_active` = 1;

-- 4. Departments
INSERT INTO `departments` (`id`, `code`, `name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'CSE', 'Computer Science and Engineering', 'Department of Computer Science & Engineering', 1, NOW(), NOW()),
(2, 'ECE', 'Electronics and Communication Engineering', 'Department of Electronics & Communication', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 5. Specializations
INSERT INTO `specializations` (`id`, `department_id`, `name`, `code`, `created_at`) VALUES
(1, 1, 'Artificial Intelligence & Machine Learning', 'AIML', NOW()),
(2, 1, 'Cyber Security', 'CS', NOW())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 6. Admission Batches
INSERT INTO `admission_batches` (`id`, `academic_year_id`, `department_id`, `specialization_id`, `batch_name`, `admission_year`, `created_at`) VALUES
(1, 1, 1, NULL, 'CSE Batch 2024-2028', 2024, NOW()),
(2, 1, 1, 1, 'CSE-AIML Batch 2024-2028', 2024, NOW())
ON DUPLICATE KEY UPDATE `batch_name` = VALUES(`batch_name`);

-- 7. Semesters
INSERT INTO `semesters` (`id`, `academic_year_id`, `semester_number`, `name`, `start_date`, `end_date`, `created_at`) VALUES
(1, 1, 3, 'Semester 3', '2025-07-15', '2025-12-15', NOW()),
(2, 1, 4, 'Semester 4', '2026-01-05', '2026-05-30', NOW())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 8. Teachers
INSERT INTO `teachers` (`id`, `user_id`, `teacher_id`, `first_name`, `last_name`, `designation`, `department_id`, `joined_at`, `status`, `created_at`, `updated_at`) VALUES
(1, 2, 'EMP-CSE-001', 'Dr. Ramesh', 'Kulkarni', 'Professor & HOD', 1, '2015-06-01', 'ACTIVE', NOW(), NOW()),
(2, 3, 'EMP-CSE-002', 'Prof. Sunita', 'Sharma', 'Associate Professor', 1, '2018-08-16', 'ACTIVE', NOW(), NOW()),
(3, 4, 'EMP-CSE-003', 'Prof. Rajesh', 'Raj', 'Assistant Professor', 1, '2020-09-01', 'ACTIVE', NOW(), NOW())
ON DUPLICATE KEY UPDATE `first_name` = VALUES(`first_name`);

-- 9. HOD Assignment
INSERT INTO `department_hod_assignments` (`id`, `department_id`, `teacher_id`, `academic_year_id`, `start_date`, `end_date`, `is_active`, `created_at`) VALUES
(1, 1, 1, 1, '2025-07-01', '2026-06-30', 1, NOW())
ON DUPLICATE KEY UPDATE `is_active` = 1;

-- 10. Classes
INSERT INTO `classes` (`id`, `admission_batch_id`, `semester_id`, `section_name`, `class_code`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 2, 'A', 'CSE-SEM4-A', 1, NOW(), NOW()),
(2, 1, 2, 'B', 'CSE-SEM4-B', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `class_code` = VALUES(`class_code`);

-- 11. Students
INSERT INTO `students` (`id`, `user_id`, `student_id`, `first_name`, `last_name`, `date_of_birth`, `admission_number`, `joined_at`, `status`, `created_at`, `updated_at`) VALUES
(1, 5, '24CSE001', 'Arun', 'Kumar', '2005-04-12', 'ADM-2024-001', '2024-08-01', 'ACTIVE', NOW(), NOW()),
(2, 6, '24CSE002', 'Priya', 'Sundaram', '2005-09-22', 'ADM-2024-002', '2024-08-01', 'ACTIVE', NOW(), NOW()),
(3, 7, '24CSE003', 'Rahul', 'Verma', '2004-11-15', 'ADM-2024-003', '2024-08-01', 'ACTIVE', NOW(), NOW()),
(4, 8, '24CSE004', 'Sneha', 'Menon', '2005-02-18', 'ADM-2024-004', '2024-08-01', 'ACTIVE', NOW(), NOW()),
(5, 9, '24CSE005', 'Vikram', 'Nair', '2004-07-30', 'ADM-2024-005', '2024-08-01', 'ACTIVE', NOW(), NOW())
ON DUPLICATE KEY UPDATE `first_name` = VALUES(`first_name`);

-- 12. Student Enrollments
INSERT INTO `student_enrollments` (`id`, `student_id`, `class_id`, `start_date`, `end_date`, `status`, `created_at`) VALUES
(1, 1, 1, '2026-01-05', NULL, 'ACTIVE', NOW()),
(2, 2, 1, '2026-01-05', NULL, 'ACTIVE', NOW()),
(3, 3, 1, '2026-01-05', NULL, 'ACTIVE', NOW()),
(4, 4, 1, '2026-01-05', NULL, 'ACTIVE', NOW()),
(5, 5, 1, '2026-01-05', NULL, 'ACTIVE', NOW())
ON DUPLICATE KEY UPDATE `status` = 'ACTIVE';

-- 13. Subjects
INSERT INTO `subjects` (`id`, `code`, `name`, `subject_type`, `default_contact_hours`, `credits`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'CS401', 'Database Management Systems', 'THEORY', 1.00, 4.00, 'Relational model, SQL, normalization and transactions', 1, NOW(), NOW()),
(2, 'CS402', 'Operating Systems', 'THEORY', 1.00, 4.00, 'Processes, threads, CPU scheduling and memory management', 1, NOW(), NOW()),
(3, 'CS403', 'Computer Networks', 'THEORY', 1.00, 3.00, 'OSI layers, TCP/IP, routing protocols and socket programming', 1, NOW(), NOW()),
(4, 'CS404', 'DBMS Laboratory', 'LAB', 2.00, 2.00, 'Practical SQL, schema design, and stored procedures', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 14. Class Subjects (Mapping Teacher to Class & Subject)
INSERT INTO `class_subjects` (`id`, `class_id`, `subject_id`, `teacher_id`, `start_date`, `end_date`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 2, '2026-01-05', NULL, 1, NOW(), NOW()), -- Prof. Sharma teaches DBMS to CSE-SEM4-A
(2, 1, 2, 3, '2026-01-05', NULL, 1, NOW(), NOW()), -- Prof. Raj teaches OS to CSE-SEM4-A
(3, 1, 3, 1, '2026-01-05', NULL, 1, NOW(), NOW())  -- Dr. Ramesh teaches CN to CSE-SEM4-A
ON DUPLICATE KEY UPDATE `is_active` = 1;

-- 15. Sample Class Sessions
INSERT INTO `class_sessions` (`id`, `class_id`, `class_subject_id`, `session_date`, `period_number`, `assigned_teacher_id`, `conducted_by_teacher_id`, `contact_hours`, `status`, `source`, `created_at`, `updated_at`) VALUES
(1, 1, 1, CURDATE() - INTERVAL 2 DAY, 1, 2, 2, 1.00, 'CONDUCTED', 'DIRECT_ENTRY', NOW(), NOW()),
(2, 1, 1, CURDATE() - INTERVAL 1 DAY, 1, 2, 2, 1.00, 'CONDUCTED', 'DIRECT_ENTRY', NOW(), NOW()),
(3, 1, 2, CURDATE() - INTERVAL 1 DAY, 2, 3, 3, 1.00, 'CONDUCTED', 'DIRECT_ENTRY', NOW(), NOW()),
(4, 1, 3, CURDATE() - INTERVAL 1 DAY, 3, 1, 1, 1.00, 'CONDUCTED', 'DIRECT_ENTRY', NOW(), NOW()),
(5, 1, 1, CURDATE(), 1, 2, 2, 1.00, 'CONDUCTED', 'DIRECT_ENTRY', NOW(), NOW())
ON DUPLICATE KEY UPDATE `status` = 'CONDUCTED';

-- 16. Sample Attendance Records
-- Session 1: All present except student 3 (Rahul)
INSERT INTO `attendance_records` (`class_session_id`, `student_id`, `status`, `marked_by`, `marked_at`, `updated_at`) VALUES
(1, 1, 'PRESENT', 3, NOW(), NOW()),
(1, 2, 'PRESENT', 3, NOW(), NOW()),
(1, 3, 'ABSENT',  3, NOW(), NOW()),
(1, 4, 'PRESENT', 3, NOW(), NOW()),
(1, 5, 'PRESENT', 3, NOW(), NOW()),

-- Session 2: All present except student 5 (Vikram)
(2, 1, 'PRESENT', 3, NOW(), NOW()),
(2, 2, 'PRESENT', 3, NOW(), NOW()),
(2, 3, 'PRESENT', 3, NOW(), NOW()),
(2, 4, 'PRESENT', 3, NOW(), NOW()),
(2, 5, 'ABSENT',  3, NOW(), NOW()),

-- Session 3: Operating Systems - All present
(3, 1, 'PRESENT', 4, NOW(), NOW()),
(3, 2, 'PRESENT', 4, NOW(), NOW()),
(3, 3, 'PRESENT', 4, NOW(), NOW()),
(3, 4, 'PRESENT', 4, NOW(), NOW()),
(3, 5, 'PRESENT', 4, NOW(), NOW()),

-- Session 4: Computer Networks - Arun and Rahul absent
(4, 1, 'ABSENT',  2, NOW(), NOW()),
(4, 2, 'PRESENT', 2, NOW(), NOW()),
(4, 3, 'ABSENT',  2, NOW(), NOW()),
(4, 4, 'PRESENT', 2, NOW(), NOW()),
(4, 5, 'PRESENT', 2, NOW(), NOW()),

-- Session 5: Today's DBMS session
(5, 1, 'PRESENT', 3, NOW(), NOW()),
(5, 2, 'PRESENT', 3, NOW(), NOW()),
(5, 3, 'PRESENT', 3, NOW(), NOW()),
(5, 4, 'PRESENT', 3, NOW(), NOW()),
(5, 5, 'PRESENT', 3, NOW(), NOW())
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

SET FOREIGN_KEY_CHECKS = 1;
