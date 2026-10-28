<?php
/**
 * Safe Database Configuration Example Template
 * Copy this file to database.php and configure your MySQL credentials.
 */

return [
    'host'     => '127.0.0.1',
    'port'     => '3306',
    'database' => 'college_attendance',
    'username' => 'your_db_user',
    'password' => 'your_secure_password',
    'charset'  => 'utf8mb4',
    'options'  => [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
    ]
];
