<?php
/**
 * Administrator - Add New Student
 */

$page_title = 'Register New Student';
require_once __DIR__ . '/../includes/header.php';
require_role(['ADMINISTRATION', 'ADMIN']);

$db = get_db();
$error = null;

// Fetch active classes for assignment
$classes = $db->query("
    SELECT c.id, c.class_code, c.section_name, b.batch_name, sem.name AS semester_name
    FROM classes c
    JOIN admission_batches b ON c.admission_batch_id = b.id
    JOIN semesters sem ON c.semester_id = sem.id
    WHERE c.is_active = 1
    ORDER BY b.batch_name ASC, sem.semester_number ASC, c.section_name ASC
")->fetchAll();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $first_name       = trim($_POST['first_name'] ?? '');
    $last_name        = trim($_POST['last_name'] ?? '');
    $student_id       = trim($_POST['student_id'] ?? ''); // Roll number
    $admission_number = trim($_POST['admission_number'] ?? '');
    $username         = trim($_POST['username'] ?? '');
    $email            = trim($_POST['email'] ?? '');
    $phone            = trim($_POST['phone'] ?? '');
    $date_of_birth    = !empty($_POST['date_of_birth']) ? $_POST['date_of_birth'] : null;
    $class_id         = !empty($_POST['class_id']) ? (int)$_POST['class_id'] : null;
    $password         = !empty($_POST['password']) ? $_POST['password'] : 'password123';

    if (empty($first_name) || empty($student_id) || empty($username)) {
        $error = 'First name, Roll Number (Student ID), and Username are required fields.';
    } else {
        try {
            $db->beginTransaction();

            // 1. Check duplicate username or roll number
            $chk = $db->prepare("SELECT id FROM users WHERE username = ?");
            $chk->execute([$username]);
            if ($chk->fetch()) {
                throw new Exception("Username '@{$username}' is already taken. Please choose another.");
            }

            $chk_stu = $db->prepare("SELECT id FROM students WHERE student_id = ?");
            $chk_stu->execute([$student_id]);
            if ($chk_stu->fetch()) {
                throw new Exception("Student Roll Number '{$student_id}' is already registered.");
            }

            if (!empty($admission_number)) {
                $chk_adm = $db->prepare("SELECT id FROM students WHERE admission_number = ?");
                $chk_adm->execute([$admission_number]);
                if ($chk_adm->fetch()) {
                    throw new Exception("Admission Number '{$admission_number}' is already registered.");
                }
            }

            // 2. Insert User
            $role_id = 4; // STUDENT
            $pass_hash = password_hash($password, PASSWORD_DEFAULT);
            $u_stmt = $db->prepare("
                INSERT INTO users (role_id, username, password_hash, email, phone, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())
            ");
            $u_stmt->execute([$role_id, $username, $pass_hash, $email ?: null, $phone ?: null]);
            $user_id = $db->lastInsertId();

            // 3. Insert Student Record
            $s_stmt = $db->prepare("
                INSERT INTO students (user_id, student_id, first_name, last_name, date_of_birth, admission_number, joined_at, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURDATE(), 'ACTIVE', NOW(), NOW())
            ");
            $s_stmt->execute([$user_id, $student_id, $first_name, $last_name ?: null, $date_of_birth, $admission_number ?: null]);
            $new_student_id = $db->lastInsertId();

            // 4. Enroll in class if selected
            if ($class_id) {
                $e_stmt = $db->prepare("
                    INSERT INTO student_enrollments (student_id, class_id, start_date, status, created_at)
                    VALUES (?, ?, CURDATE(), 'ACTIVE', NOW())
                ");
                $e_stmt->execute([$new_student_id, $class_id]);
            }

            $db->commit();
            set_flash('success', "Student '{$first_name} {$last_name}' (ID: {$student_id}) registered successfully!");
            header('Location: ' . base_url('admin/students.php'));
            exit;

        } catch (Exception $e) {
            $db->rollBack();
            $error = $e->getMessage();
        }
    }
}
?>

<div class="page-header">
    <div>
        <h1 class="page-title">Register New Student</h1>
        <p class="page-subtitle">Create student credentials, academic details, and class enrollment</p>
    </div>
    <div>
        <a href="<?= base_url('admin/students.php') ?>" class="btn btn-secondary">&larr; Back to Student List</a>
    </div>
</div>

<?php if ($error): ?>
    <div class="alert alert-error">
        <div><?= e($error) ?></div>
    </div>
<?php endif; ?>

<div class="card" style="max-width: 800px;">
    <div class="card-header">
        <h2 class="card-title">Student Profile & Enrollment Form</h2>
    </div>
    <form method="POST" action="<?= base_url('admin/student_add.php') ?>">
        <div class="card-body">
            <h3 style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">
                1. Personal & Academic Identification
            </h3>
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">First Name <span class="required">*</span></label>
                    <input type="text" name="first_name" class="form-control" required placeholder="e.g. Arun" value="<?= e($_POST['first_name'] ?? '') ?>">
                </div>

                <div class="form-group">
                    <label class="form-label">Last Name</label>
                    <input type="text" name="last_name" class="form-control" placeholder="e.g. Kumar" value="<?= e($_POST['last_name'] ?? '') ?>">
                </div>

                <div class="form-group">
                    <label class="form-label">Roll Number / Student ID <span class="required">*</span></label>
                    <input type="text" name="student_id" class="form-control" required placeholder="e.g. 24CSE006" value="<?= e($_POST['student_id'] ?? '') ?>">
                </div>

                <div class="form-group">
                    <label class="form-label">Admission Number</label>
                    <input type="text" name="admission_number" class="form-control" placeholder="e.g. ADM-2024-006" value="<?= e($_POST['admission_number'] ?? '') ?>">
                </div>

                <div class="form-group">
                    <label class="form-label">Date of Birth</label>
                    <input type="date" name="date_of_birth" class="form-control" value="<?= e($_POST['date_of_birth'] ?? '') ?>">
                </div>

                <div class="form-group">
                    <label class="form-label">Assign Class & Section</label>
                    <?php if (empty($classes)): ?>
                        <div style="background: rgba(239, 68, 68, 0.1); border: 1px dashed rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 0.6rem 0.8rem; font-size: 0.85rem; color: var(--danger, #f87171);">
                            ⚠️ No active classes exist yet. <a href="<?= base_url('admin/academic_setup.php#tab-classes') ?>" style="color: var(--primary); text-decoration: underline; font-weight: 600;">Click here to create a Class Section &rarr;</a>
                        </div>
                        <input type="hidden" name="class_id" value="">
                    <?php else: ?>
                        <select name="class_id" class="form-control">
                            <option value="">-- Assign Later --</option>
                            <?php foreach ($classes as $cls): ?>
                                <option value="<?= $cls['id'] ?>" <?= (isset($_POST['class_id']) && (int)$_POST['class_id'] === (int)$cls['id']) ? 'selected' : '' ?>>
                                    <?= e($cls['class_code'] ?: "{$cls['batch_name']} - {$cls['semester_name']} Sec {$cls['section_name']}") ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    <?php endif; ?>
                </div>
            </div>

            <h3 style="font-size: 1rem; color: var(--text-secondary); margin: 1.5rem 0 1rem 0; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">
                2. User Account & Authentication
            </h3>
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">System Username <span class="required">*</span></label>
                    <input type="text" name="username" class="form-control" required placeholder="e.g. student_arun" value="<?= e($_POST['username'] ?? '') ?>">
                </div>

                <div class="form-group">
                    <label class="form-label">Initial Password</label>
                    <input type="password" name="password" class="form-control" placeholder="Default: password123">
                    <div class="form-help">Leave empty to use default password: <code>password123</code></div>
                </div>

                <div class="form-group">
                    <label class="form-label">Email Address</label>
                    <input type="email" name="email" class="form-control" placeholder="e.g. student@college.edu" value="<?= e($_POST['email'] ?? '') ?>">
                </div>

                <div class="form-group">
                    <label class="form-label">Phone Number</label>
                    <input type="tel" name="phone" class="form-control" placeholder="e.g. 9876543210" value="<?= e($_POST['phone'] ?? '') ?>">
                </div>
            </div>
        </div>
        <div class="card-footer">
            <a href="<?= base_url('admin/students.php') ?>" class="btn btn-secondary">Cancel</a>
            <button type="submit" class="btn btn-primary">Create Student Record &rarr;</button>
        </div>
    </form>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
