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
