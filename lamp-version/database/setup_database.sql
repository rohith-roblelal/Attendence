-- ========================================================
-- College Attendance Management System - LAMP Stack Edition
-- Complete Database Setup (Schema + Seed Data in one file)
-- Usage: mysql -u root -p < setup_database.sql
-- ========================================================

CREATE DATABASE IF NOT EXISTS `college_attendance` 
DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `college_attendance`;

-- Source Schema
SOURCE schema.sql;

-- Source Seed Data
SOURCE seed.sql;
