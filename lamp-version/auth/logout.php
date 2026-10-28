<?php
/**
 * Logout Handler
 */

require_once __DIR__ . '/../includes/functions.php';
require_once __DIR__ . '/../includes/auth.php';

logout_user();
set_flash('info', 'You have been signed out successfully.');
header('Location: ' . base_url('auth/login.php'));
exit;
