-- This script safely removes all tables in reverse order to handle failed migrations during development

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS academic_holidays;
DROP TABLE IF EXISTS attendance_audit_logs;
DROP TABLE IF EXISTS attendance_records;
DROP TABLE IF EXISTS class_sessions;
DROP TABLE IF EXISTS daily_timetable_changes;
DROP TABLE IF EXISTS regular_timetable_entries;
DROP TABLE IF EXISTS tutor_assignments;
DROP TABLE IF EXISTS department_hod_assignments;
DROP TABLE IF EXISTS class_subjects;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS student_enrollments;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS semesters;
DROP TABLE IF EXISTS admission_batches;
DROP TABLE IF EXISTS specializations;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS academic_years;
DROP TABLE IF EXISTS teachers;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;
