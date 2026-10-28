<?php
/**
 * College Attendance Management System - Database Configuration
 * Windows XAMPP Setup  |  Apache: 80  |  MySQL: 3306
 *
 * Using XAMPP defaults: root user, no password.
 * Change DB_USER / DB_PASS env vars on production server.
 */

// Prevent direct script access if called directly
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    http_response_code(403);
    exit('Access Denied');
}

return [
    'host'     => getenv('DB_HOST') ?: '127.0.0.1',
    'port'     => getenv('DB_PORT') ?: '3306',           // XAMPP MySQL default
    'database' => getenv('DB_NAME') ?: 'college_attendance',
    'username' => getenv('DB_USER') ?: 'root',           // XAMPP default user
    'password' => getenv('DB_PASS') ?: '',               // XAMPP default: no password
    'charset'  => 'utf8mb4',
    'options'  => [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
    ]
];
