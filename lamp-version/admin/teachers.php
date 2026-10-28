<?php
/**
 * Administrator - Faculty Management
 */

$page_title = 'Faculty Management';
require_once __DIR__ . '/../includes/header.php';
require_role(['ADMINISTRATION', 'ADMIN']);

$db = get_db();
$error = null;

// Handle Faculty Creation
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'create_teacher') {
    $first_name    = trim($_POST['first_name'] ?? '');
    $last_name     = trim($_POST['last_name'] ?? '');
    $teacher_id    = trim($_POST['teacher_id'] ?? ''); // Employee ID
    $designation   = trim($_POST['designation'] ?? '');
    $department_id = !empty($_POST['department_id']) ? (int)$_POST['department_id'] : null;
    $username      = trim($_POST['username'] ?? '');
    $email         = trim($_POST['email'] ?? '');
    $phone         = trim($_POST['phone'] ?? '');
    $password      = !empty($_POST['password']) ? $_POST['password'] : 'password123';

    if (empty($first_name) || empty($teacher_id) || empty($username)) {
        $error = 'First Name, Employee Code (Teacher ID), and Username are required.';
    } else {
        try {
            $db->beginTransaction();

            // Check duplicate username
            $chk = $db->prepare("SELECT id FROM users WHERE username = ?");
            $chk->execute([$username]);
            if ($chk->fetch()) {
                throw new Exception("Username '@{$username}' is already taken.");
            }

            // Check duplicate teacher code
            $chk_t = $db->prepare("SELECT id FROM teachers WHERE teacher_id = ?");
            $chk_t->execute([$teacher_id]);
            if ($chk_t->fetch()) {
                throw new Exception("Employee ID '{$teacher_id}' is already registered.");
            }

            // Insert User (Role ID 3 = TEACHER)
            $pass_hash = password_hash($password, PASSWORD_DEFAULT);
            $u_stmt = $db->prepare("
                INSERT INTO users (role_id, username, password_hash, email, phone, is_active, created_at, updated_at)
                VALUES (3, ?, ?, ?, ?, 1, NOW(), NOW())
            ");
            $u_stmt->execute([$username, $pass_hash, $email ?: null, $phone ?: null]);
            $user_id = $db->lastInsertId();

            // Insert Teacher
            $t_stmt = $db->prepare("
                INSERT INTO teachers (user_id, teacher_id, first_name, last_name, designation, department_id, joined_at, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURDATE(), 'ACTIVE', NOW(), NOW())
            ");
            $t_stmt->execute([$user_id, $teacher_id, $first_name, $last_name ?: null, $designation ?: null, $department_id]);

            $db->commit();
            set_flash('success', "Faculty member '{$first_name} {$last_name}' registered successfully!");
            header('Location: ' . base_url('admin/teachers.php'));
            exit;

        } catch (Exception $e) {
            $db->rollBack();
            $error = $e->getMessage();
        }
    }
}

// Handle Faculty Deletion
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'delete_teacher') {
    $teacher_id_param = isset($_POST['id']) && is_numeric($_POST['id']) ? (int)$_POST['id'] : 0;
    if ($teacher_id_param > 0) {
        try {
            $db->beginTransaction();
            $t_stmt = $db->prepare("SELECT id, user_id, first_name, last_name FROM teachers WHERE id = ?");
            $t_stmt->execute([$teacher_id_param]);
            $t_row = $t_stmt->fetch();

            if ($t_row) {
                $user_id_to_del = (int)$t_row['user_id'];
                $t_name = trim($t_row['first_name'] . ' ' . ($t_row['last_name'] ?? ''));

                // Detach from class_subjects
                $db->prepare("UPDATE class_subjects SET teacher_id = NULL WHERE teacher_id = ?")->execute([$teacher_id_param]);
                // Delete teacher
                $db->prepare("DELETE FROM teachers WHERE id = ?")->execute([$teacher_id_param]);
                // Delete user account
                if ($user_id_to_del > 1) {
                    $db->prepare("DELETE FROM users WHERE id = ? AND username != 'admin'")->execute([$user_id_to_del]);
                }
                $db->commit();
                set_flash('success', "Faculty member '{$t_name}' deleted successfully from database.");
            } else {
                throw new Exception("Faculty record not found.");
            }
        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            set_flash('error', "Failed to delete faculty member: " . $e->getMessage());
        }
    }
    header('Location: ' . base_url('admin/teachers.php'));
    exit;
}

// Fetch Departments
$departments = $db->query("SELECT id, code, name FROM departments WHERE is_active = 1 ORDER BY name ASC")->fetchAll();

// Fetch Teachers
$teachers = $db->query("
    SELECT 
        t.id, t.teacher_id, t.first_name, t.last_name, t.designation, t.status, t.joined_at,
        u.username, u.email, u.phone,
        d.name AS dept_name, d.code AS dept_code,
        (SELECT COUNT(*) FROM class_subjects cs WHERE cs.teacher_id = t.id AND cs.is_active = 1) AS assigned_classes,
        (SELECT COUNT(*) FROM class_sessions cs WHERE cs.conducted_by_teacher_id = t.id) AS conducted_sessions
    FROM teachers t
    JOIN users u ON t.user_id = u.id
    LEFT JOIN departments d ON t.department_id = d.id
    ORDER BY t.status ASC, t.first_name ASC
")->fetchAll();
?>

<div class="page-header">
    <div>
        <h1 class="page-title">Faculty Member Directory</h1>
        <p class="page-subtitle">Manage professors, assistant professors, and academic instructors</p>
    </div>
</div>

<?php if ($error): ?>
    <div class="alert alert-error">
        <div><?= e($error) ?></div>
    </div>
<?php endif; ?>

<div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; align-items: start;">
    <!-- Add Faculty Form -->
    <div class="card">
        <div class="card-header">
            <h2 class="card-title">+ Add New Faculty</h2>
        </div>
        <form method="POST" action="<?= base_url('admin/teachers.php') ?>">
            <input type="hidden" name="action" value="create_teacher">
            <div class="card-body">
                <div class="form-group">
                    <label class="form-label">First Name <span class="required">*</span></label>
                    <input type="text" name="first_name" class="form-control" required placeholder="e.g. Ramesh">
                </div>

                <div class="form-group">
                    <label class="form-label">Last Name</label>
                    <input type="text" name="last_name" class="form-control" placeholder="e.g. Kulkarni">
                </div>

                <div class="form-group">
                    <label class="form-label">Employee Code / ID <span class="required">*</span></label>
                    <input type="text" name="teacher_id" class="form-control" required placeholder="e.g. EMP-CSE-004">
                </div>

                <div class="form-group">
                    <label class="form-label">Designation</label>
                    <input type="text" name="designation" class="form-control" placeholder="e.g. Assistant Professor">
                </div>

                <div class="form-group">
                    <label class="form-label">Department</label>
                    <select name="department_id" class="form-control">
                        <option value="">-- Select Department --</option>
                        <?php foreach ($departments as $dept): ?>
                            <option value="<?= $dept['id'] ?>"><?= e($dept['name']) ?> (<?= e($dept['code']) ?>)</option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">System Username <span class="required">*</span></label>
                    <input type="text" name="username" class="form-control" required placeholder="e.g. faculty_ramesh">
                </div>

                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" name="password" class="form-control" placeholder="Default: password123">
                    <div class="form-help">Leave empty for <code>password123</code></div>
                </div>

                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" name="email" class="form-control" placeholder="e.g. faculty@college.edu">
                </div>

                <button type="submit" class="btn btn-primary" style="width: 100%;">Create Faculty &rarr;</button>
            </div>
        </form>
    </div>

    <!-- Faculty List Table -->
    <div class="card">
        <div class="card-header">
            <h2 class="card-title">Registered Faculty (<?= count($teachers) ?>)</h2>
        </div>
        <div class="card-body" style="padding: 0;">
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Faculty Name</th>
                            <th>Employee Code</th>
                            <th>Department</th>
                            <th>Classes / Sessions</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($teachers)): ?>
                            <tr>
                                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                                    No faculty members found.
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($teachers as $t): ?>
                                <tr>
                                    <td>
                                        <strong><?= e($t['first_name'] . ' ' . ($t['last_name'] ?? '')) ?></strong>
                                        <div style="font-size: 0.75rem; color: var(--text-muted);"><?= e($t['designation'] ?: 'Faculty') ?> &bull; @<?= e($t['username']) ?></div>
                                    </td>
                                    <td><code><?= e($t['teacher_id']) ?></code></td>
                                    <td>
                                        <span class="badge badge-info"><?= e($t['dept_code'] ?: 'General') ?></span>
                                    </td>
                                    <td>
                                        <?= $t['assigned_classes'] ?> classes &bull; <strong><?= $t['conducted_sessions'] ?> conducted</strong>
                                    </td>
                                    <td>
                                        <span class="badge <?= $t['status'] === 'ACTIVE' ? 'badge-success' : 'badge-secondary' ?>">
                                            <?= e($t['status']) ?>
                                        </span>
                                    </td>
                                    <td>
                                        <form method="POST" action="<?= base_url('admin/teachers.php') ?>" onsubmit="return confirm('⚠️ Are you sure you want to PERMANENTLY delete faculty member <?= addslashes($t['first_name'] . ' ' . ($t['last_name'] ?? '')) ?>?');" style="margin: 0; display: inline;">
                                            <input type="hidden" name="action" value="delete_teacher">
                                            <input type="hidden" name="id" value="<?= (int)$t['id'] ?>">
                                            <button type="submit" class="btn btn-danger btn-sm" title="Delete Faculty Member">
                                                🗑️ Delete
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
