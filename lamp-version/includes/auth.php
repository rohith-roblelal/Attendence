<?php
/**
 * Authentication and Role-Based Authorization
 */

require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/db.php';

/**
 * Check if a user is currently authenticated
 */
function is_logged_in(): bool {
    return isset($_SESSION['user']) && !empty($_SESSION['user']['id']);
}

/**
 * Get current authenticated user details
 */
function current_user(): ?array {
    return $_SESSION['user'] ?? null;
}

/**
 * Check if the user has a specific role or one of multiple roles
 */
function has_role($roles): bool {
    if (!is_logged_in()) return false;
    $user_role = strtoupper($_SESSION['user']['role'] ?? '');
    
    if (is_array($roles)) {
        $allowed = array_map('strtoupper', $roles);
        return in_array($user_role, $allowed, true);
    }
    return $user_role === strtoupper($roles);
}

/**
 * Ensure user is logged in, otherwise redirect to login page
 */
function require_login(): void {
    if (!is_logged_in()) {
        set_flash('error', 'Please log in to access this page.');
        header('Location: ' . base_url('auth/login.php'));
        exit;
    }
}

/**
 * Ensure user is logged in and possesses one of the allowed roles
 */
function require_role($roles): void {
    require_login();

    if (!has_role($roles)) {
        http_response_code(403);
        set_flash('error', 'Unauthorized access: You do not have permission to view that section.');
        redirect_to_dashboard();
        exit;
    }
}

/**
 * Redirect user to appropriate dashboard based on their role
 */
function redirect_to_dashboard(): void {
    if (!is_logged_in()) {
        header('Location: ' . base_url('auth/login.php'));
        exit;
    }

    $role = strtoupper($_SESSION['user']['role'] ?? '');

    switch ($role) {
        case 'ADMINISTRATION':
        case 'ADMIN':
            header('Location: ' . base_url('admin/dashboard.php'));
            break;
        case 'HOD':
            header('Location: ' . base_url('hod/dashboard.php'));
            break;
        case 'TEACHER':
        case 'TUTOR':
            header('Location: ' . base_url('faculty/dashboard.php'));
            break;
        case 'STUDENT':
            header('Location: ' . base_url('student/dashboard.php'));
            break;
        default:
            header('Location: ' . base_url('auth/login.php'));
            break;
    }
    exit;
}

/**
 * Authenticate and initialize session for a user
 */
function login_user(array $user_row): void {
    session_regenerate_id(true);

    $db = get_db();
    
    // Fetch profile details depending on role
    $profile = [];
    $teacher_id = null;
    $student_id = null;
    $department_id = null;

    if (in_array(strtoupper($user_row['role']), ['TEACHER', 'HOD', 'TUTOR'])) {
        $stmt = $db->prepare("SELECT * FROM teachers WHERE user_id = ? LIMIT 1");
        $stmt->execute([$user_row['id']]);
        $teacher = $stmt->fetch();
        if ($teacher) {
            $profile = $teacher;
            $teacher_id = $teacher['id'];
            $department_id = $teacher['department_id'];
        }

        // Check if teacher is assigned as an active HOD
        $hod_stmt = $db->prepare("SELECT department_id FROM department_hod_assignments WHERE teacher_id = ? AND is_active = 1 LIMIT 1");
        $hod_stmt->execute([$teacher_id]);
        $hod_assign = $hod_stmt->fetch();
        if ($hod_assign) {
            $department_id = $hod_assign['department_id'];
            // If they are assigned as HOD, ensure their effective role is HOD
            if (strtoupper($user_row['role']) === 'TEACHER') {
                $user_row['role'] = 'HOD';
            }
        }
    } elseif (strtoupper($user_row['role']) === 'STUDENT') {
        $stmt = $db->prepare("
            SELECT s.*, se.class_id, c.section_name, c.class_code, b.batch_name
            FROM students s
            LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.status = 'ACTIVE'
            LEFT JOIN classes c ON se.class_id = c.id
            LEFT JOIN admission_batches b ON c.admission_batch_id = b.id
            WHERE s.user_id = ?
            LIMIT 1
        ");
        $stmt->execute([$user_row['id']]);
        $student = $stmt->fetch();
        if ($student) {
            $profile = $student;
            $student_id = $student['id'];
        }
    }

    // Update last_login_at
    $update_stmt = $db->prepare("UPDATE users SET last_login_at = NOW() WHERE id = ?");
    $update_stmt->execute([$user_row['id']]);

    $_SESSION['user'] = [
        'id'            => (int)$user_row['id'],
        'username'      => $user_row['username'],
        'email'         => $user_row['email'] ?? '',
        'role'          => $user_row['role'],
        'teacher_id'    => $teacher_id,
        'student_id'    => $student_id,
        'department_id' => $department_id,
        'profile'       => $profile,
        'display_name'  => !empty($profile['first_name']) 
                           ? $profile['first_name'] . ' ' . ($profile['last_name'] ?? '') 
                           : $user_row['username']
    ];
}

/**
 * Log out user and destroy session
 */
function logout_user(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    session_destroy();
}
