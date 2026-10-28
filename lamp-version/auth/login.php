<?php
/**
 * User Authentication (Login)
 */

require_once __DIR__ . '/../includes/functions.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/db.php';

// If already logged in, redirect directly to dashboard
if (is_logged_in()) {
    redirect_to_dashboard();
}

$error = null;
$username_val = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    $username_val = $username;

    if (empty($username) || empty($password)) {
        $error = 'Please provide both your username and password.';
    } else {
        $db = get_db();
        $stmt = $db->prepare("
            SELECT u.id, u.username, u.password_hash, u.email, u.is_active, r.name AS role
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.username = ?
            LIMIT 1
        ");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user && $user['is_active']) {
            if (verify_user_password($password, $user['password_hash'])) {
                // If the hash is not standard Bcrypt/Argon2 or was verified via fallback, rehash it to PASSWORD_DEFAULT
                if (!password_verify($password, $user['password_hash']) || password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
                    $new_hash = password_hash($password, PASSWORD_DEFAULT);
                    $up_stmt = $db->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
                    $up_stmt->execute([$new_hash, $user['id']]);
                }

                login_user($user);
                set_flash('success', "Welcome back, {$user['username']}! Logged in successfully.");
                redirect_to_dashboard();
            } else {
                $error = 'Invalid username or password.';
            }
        } else {
            $error = 'Invalid username or account is deactivated.';
        }
    }
}

$flash = get_flash();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In — CampusSync Academic ERP</title>
    <!-- Fonts & Icons -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
    <link rel="stylesheet" href="<?= base_url('assets/css/style.css') ?>">
</head>
<body class="campussync-app" style="display: flex; align-items: center; justify-content: center; min-height: 100vh;">

<div class="auth-wrapper" style="width: 100%; max-width: 440px; padding: 1.5rem;">
    <div class="auth-card" style="background: rgba(28, 31, 42, 0.85); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-xl); padding: 2.25rem 2rem; box-shadow: var(--shadow-card);">
        <div class="auth-header" style="text-align: center; margin-bottom: 2rem;">
            <div style="width: 48px; height: 48px; margin: 0 auto 1rem auto; border-radius: var(--radius-md); background: linear-gradient(135deg, var(--primary-container), var(--secondary-container)); color: #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(37,99,235,0.4);">
                <span class="material-symbols-outlined" style="font-size: 26px;">school</span>
            </div>
            <h1 style="font-size: 1.5rem; font-weight: 700; color: var(--on-surface); letter-spacing: -0.02em;">CampusSync</h1>
            <p style="color: var(--outline); font-size: 0.8rem; margin-top: 0.25rem;">Academic ERP & Real-time Attendance Portal</p>
        </div>

        <?php if ($flash): ?>
            <div class="alert alert-<?= e($flash['type']) ?>">
                <div><?= e($flash['message']) ?></div>
            </div>
        <?php endif; ?>

        <?php if ($error): ?>
            <div class="alert alert-error">
                <div><?= e($error) ?></div>
            </div>
        <?php endif; ?>

        <form method="POST" action="<?= base_url('auth/login.php') ?>">
            <div class="form-group">
                <label for="username" class="form-label">Username</label>
                <input type="text" id="username" name="username" class="form-control" 
                       value="<?= e($username_val) ?>" required autofocus autocomplete="username"
                       placeholder="Enter your username">
            </div>

            <div class="form-group">
                <label for="password" class="form-label">Password</label>
                <input type="password" id="password" name="password" class="form-control" 
                       required autocomplete="current-password"
                       placeholder="Enter your password">
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.75rem; font-size: 1rem; margin-top: 1rem; justify-content: center;">
                Sign In to System &rarr;
            </button>
        </form>
    </div>
</div>

<script src="<?= base_url('assets/js/app.js') ?>"></script>
</body>
</html>
