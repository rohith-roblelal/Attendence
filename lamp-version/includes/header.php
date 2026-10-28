<?php
/**
 * Shared Application Header & Navigation Layout
 */

require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/auth.php';

$user = current_user();
$current_page = basename($_SERVER['PHP_SELF']);
$flash = get_flash();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= isset($page_title) ? e($page_title) . ' — ' : '' ?>AttenHubX ERP & Attendance Management</title>
    <meta name="description" content="AttenHubX Academic ERP & Real-time Attendance Management System">
    
    <!-- Google Fonts & Material Symbols (from Stitch Design) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
    
    <!-- Core Application CSS -->
    <link rel="stylesheet" href="<?= base_url('assets/css/style.css') ?>">

    <!-- Theme Initialization Script to prevent flicker -->
    <script>
        (function() {
            const savedTheme = localStorage.getItem('app_theme') || 'dark';
            document.documentElement.setAttribute('data-theme', savedTheme);
            if (savedTheme === 'light') {
                document.documentElement.classList.add('light');
                document.documentElement.classList.remove('dark');
            } else {
                document.documentElement.classList.add('dark');
                document.documentElement.classList.remove('light');
            }
        })();
    </script>
</head>
<body class="AttenHubX-app">

<?php if (is_logged_in()): ?>
<!-- Top Application Navigation Bar -->
<header class="app-header">
    <div class="header-inner">
        <div class="header-left">
            <a href="<?= base_url() ?>" class="app-brand">
                <div class="brand-icon">
                    <span class="material-symbols-outlined">school</span>
                </div>
                <div class="brand-text">
                    <span class="brand-name">AttenHubX</span>
                    <span class="brand-tag">Academic ERP</span>
                </div>
            </a>
            
            <div class="header-role-chip">
                <span class="status-pulse-dot"></span>
                <span class="role-label">Role:</span>
                <span class="role-val"><?= e($user['role'] ?? '') ?></span>
            </div>
        </div>

        <div class="header-center">
            <div class="header-search-bar">
                <span class="material-symbols-outlined search-icon">search</span>
                <input type="text" placeholder="Search Roll No, Student, Subject, Room..." id="globalSearchInput">
                <kbd class="search-kbd">⌘K</kbd>
            </div>
            <div class="header-term-chip">
                <span class="material-symbols-outlined">event_repeat</span>
                <span>Odd Sem 2024-2025</span>
                <span class="chip-active">Active</span>
            </div>
        </div>

        <div class="header-right">
            <!-- Dark / Light Mode Toggle Button -->
            <button type="button" id="themeToggleBtn" class="theme-toggle-btn" title="Toggle Light / Dark Theme" onclick="toggleAppTheme()">
                <span class="material-symbols-outlined theme-icon" id="themeToggleIcon">light_mode</span>
            </button>

            <div class="telemetry-badge">
                <span class="dot-green"></span>
                <span>94% Sensors Synced</span>
            </div>

            <div class="user-profile-menu">
                <div class="user-avatar-circle">
                    <?= strtoupper(substr($user['username'] ?? 'U', 0, 2)) ?>
                </div>
                <div class="user-meta-info">
                    <span class="user-fullname"><?= e($user['display_name'] ?? $user['username']) ?></span>
                    <span class="user-role-title"><?= e($user['role'] ?? 'User') ?></span>
                </div>
                <a href="<?= base_url('auth/logout.php') ?>" class="btn-icon-logout" title="Sign out of AttenHubX">
                    <span class="material-symbols-outlined">logout</span>
                </a>
            </div>
        </div>
    </div>

    <!-- Quick Navigation Sub-Bar -->
    <div class="nav-subbar">
        <div class="nav-subbar-inner">
            <ul class="nav-links">
                <?php if (has_role(['ADMINISTRATION', 'ADMIN'])): ?>
                    <li class="nav-item <?= $current_page === 'dashboard.php' ? 'active' : '' ?>">
                        <a href="<?= base_url('admin/dashboard.php') ?>"><span class="material-symbols-outlined">dashboard</span> Executive Dashboard</a>
                    </li>
                    <li class="nav-item <?= in_array($current_page, ['students.php', 'student_add.php', 'student_edit.php']) ? 'active' : '' ?>">
                        <a href="<?= base_url('admin/students.php') ?>"><span class="material-symbols-outlined">school</span> Student Records</a>
                    </li>
                    <li class="nav-item <?= $current_page === 'classes.php' ? 'active' : '' ?>">
                        <a href="<?= base_url('admin/classes.php') ?>"><span class="material-symbols-outlined">calendar_month</span> Classes & Schedules</a>
                    </li>
                    <li class="nav-item <?= $current_page === 'academic_setup.php' ? 'active' : '' ?>">
                        <a href="<?= base_url('admin/academic_setup.php') ?>"><span class="material-symbols-outlined">account_tree</span> Academic Setup</a>
                    </li>
                    <li class="nav-item <?= $current_page === 'subjects.php' ? 'active' : '' ?>">
                        <a href="<?= base_url('admin/subjects.php') ?>"><span class="material-symbols-outlined">menu_book</span> Subject Registry</a>
                    </li>
                    <li class="nav-item <?= $current_page === 'assign_subject.php' ? 'active' : '' ?>">
                        <a href="<?= base_url('admin/assign_subject.php') ?>"><span class="material-symbols-outlined">link</span> Allocations</a>
                    </li>
                    <li class="nav-item <?= $current_page === 'teachers.php' ? 'active' : '' ?>">
                        <a href="<?= base_url('admin/teachers.php') ?>"><span class="material-symbols-outlined">badge</span> Faculty Directory</a>
                    </li>
                    <li class="nav-item <?= $current_page === 'attendance_records.php' ? 'active' : '' ?>">
                        <a href="<?= base_url('admin/attendance_records.php') ?>"><span class="material-symbols-outlined">fingerprint</span> Live Telemetry</a>
                    </li>

                <?php elseif (has_role('HOD')): ?>
                    <li class="nav-item <?= $current_page === 'dashboard.php' ? 'active' : '' ?>">
                        <a href="<?= base_url('hod/dashboard.php') ?>"><span class="material-symbols-outlined">verified_user</span> HOD Dashboard</a>
                    </li>
                    <li class="nav-item <?= $current_page === 'classes.php' ? 'active' : '' ?>">
                        <a href="<?= base_url('hod/classes.php') ?>"><span class="material-symbols-outlined">calendar_month</span> Classes & Batches</a>
                    </li>
                    <li class="nav-item <?= $current_page === 'subjects.php' ? 'active' : '' ?>">
                        <a href="<?= base_url('hod/subjects.php') ?>"><span class="material-symbols-outlined">menu_book</span> Subject Allocations</a>
                    </li>
                    <li class="nav-item <?= $current_page === 'enroll_student.php' ? 'active' : '' ?>">
                        <a href="<?= base_url('hod/enroll_student.php') ?>"><span class="material-symbols-outlined">group_add</span> Enroll Students</a>
                    </li>
                    <li class="nav-item <?= $current_page === 'reports.php' ? 'active' : '' ?>">
                        <a href="<?= base_url('hod/reports.php') ?>"><span class="material-symbols-outlined">insights</span> Defaulter Reports</a>
                    </li>

                <?php elseif (has_role(['TEACHER', 'TUTOR'])): ?>
                    <li class="nav-item <?= $current_page === 'dashboard.php' ? 'active' : '' ?>">
                        <a href="<?= base_url('faculty/dashboard.php') ?>"><span class="material-symbols-outlined">dashboard</span> Faculty Dashboard</a>
                    </li>
                    <li class="nav-item <?= $current_page === 'take_attendance.php' ? 'active' : '' ?>">
                        <a href="<?= base_url('faculty/take_attendance.php') ?>"><span class="material-symbols-outlined">fingerprint</span> Mark Attendance</a>
                    </li>
                    <li class="nav-item <?= $current_page === 'my_classes.php' ? 'active' : '' ?>">
                        <a href="<?= base_url('faculty/my_classes.php') ?>"><span class="material-symbols-outlined">calendar_month</span> My Classes</a>
                    </li>
                    <li class="nav-item <?= $current_page === 'attendance_history.php' ? 'active' : '' ?>">
                        <a href="<?= base_url('faculty/attendance_history.php') ?>"><span class="material-symbols-outlined">history</span> Log History</a>
                    </li>

                <?php elseif (has_role('STUDENT')): ?>
                    <li class="nav-item <?= $current_page === 'dashboard.php' ? 'active' : '' ?>">
                        <a href="<?= base_url('student/dashboard.php') ?>"><span class="material-symbols-outlined">contact_page</span> Self-Service Portal</a>
                    </li>
                    <li class="nav-item <?= $current_page === 'subjects.php' ? 'active' : '' ?>">
                        <a href="<?= base_url('student/subjects.php') ?>"><span class="material-symbols-outlined">menu_book</span> Subject Breakdown</a>
                    </li>
                    <li class="nav-item <?= $current_page === 'history.php' ? 'active' : '' ?>">
                        <a href="<?= base_url('student/history.php') ?>"><span class="material-symbols-outlined">history</span> Attendance Log</a>
                    </li>
                <?php endif; ?>
            </ul>
        </div>
    </div>
</header>
<?php endif; ?>

<main class="main-content">
    <?php if ($flash): ?>
        <div class="alert alert-<?= e($flash['type']) ?> alert-dismissible">
            <span>
                <?php if ($flash['type'] === 'success'): ?>✅
                <?php elseif ($flash['type'] === 'error'): ?>❌
                <?php elseif ($flash['type'] === 'warning'): ?>⚠️
                <?php else: ?>ℹ️
                <?php endif; ?>
            </span>
            <div><?= e($flash['message']) ?></div>
        </div>
    <?php endif; ?>
