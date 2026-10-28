<?php
/**
 * Application Entry Point
 * Redirects authenticated users to their dashboard, or unauthenticated users to login.
 */

require_once __DIR__ . '/includes/auth.php';

if (is_logged_in()) {
    redirect_to_dashboard();
} else {
    header('Location: ' . base_url('auth/login.php'));
    exit;
}
