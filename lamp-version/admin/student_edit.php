<?php
/**
 * Administrator - Edit Student & Class Assignment
 */

$page_title = 'Edit Student';
require_once __DIR__ . '/../includes/header.php';
require_role(['ADMINISTRATION', 'ADMIN']);

$db = get_db();
$error = null;

$student_id_param = isset($_GET['id']) && is_numeric($_GET['id']) ? (int)$_GET['id'] : 0;

if ($student_id_param <= 0) {
    set_flash('error', 'Invalid student ID specified.');
    header('Location: ' . base_url('admin/students.php'));
    exit;
}

// 1. Fetch Student Details
$stu_stmt = $db->prepare("
    SELECT s.*, u.username, u.email, u.phone, se.class_id, se.id AS enrollment_id
    FROM students s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.status = 'ACTIVE'
    WHERE s.id = ?
    LIMIT 1
");
$stu_stmt->execute([$student_id_param]);
$student = $stu_stmt->fetch();

if (!$student) {
    set_flash('error', 'Student not found.');
    header('Location: ' . base_url('admin/students.php'));
    exit;
}

// 2. Fetch Active Classes
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
    $student_id       = trim($_POST['student_id'] ?? '');
    $admission_number = trim($_POST['admission_number'] ?? '');
    $status           = $_POST['status'] ?? 'ACTIVE';
    $email            = trim($_POST['email'] ?? '');
    $phone            = trim($_POST['phone'] ?? '');
    $date_of_birth    = !empty($_POST['date_of_birth']) ? $_POST['date_of_birth'] : null;
    $new_class_id     = !empty($_POST['class_id']) ? (int)$_POST['class_id'] : null;

    if (empty($first_name) || empty($student_id)) {
        $error = 'First name and Roll Number (Student ID) cannot be empty.';
    } else {
        try {
            $db->beginTransaction();

            // Check duplicate roll number on other students
            $chk = $db->prepare("SELECT id FROM students WHERE student_id = ? AND id != ?");
            $chk->execute([$student_id, $student['id']]);
            if ($chk->fetch()) {
                throw new Exception("Student Roll Number '{$student_id}' is already used by another student.");
            }

            // Update student
            $up_stu = $db->prepare("
                UPDATE students 
                SET first_name = ?, last_name = ?, student_id = ?, admission_number = ?, date_of_birth = ?, status = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $up_stu->execute([$first_name, $last_name ?: null, $student_id, $admission_number ?: null, $date_of_birth, $status, $student['id']]);

            // Update user contact details
            $up_user = $db->prepare("
                UPDATE users
                SET email = ?, phone = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $up_user->execute([$email ?: null, $phone ?: null, $student['user_id']]);

            // Update or create class enrollment
            $current_class_id = (int)($student['class_id'] ?? 0);
            if ($new_class_id !== $current_class_id) {
                // Deactivate previous active enrollments
                $deact = $db->prepare("
                    UPDATE student_enrollments 
                    SET status = 'TRANSFERRED', end_date = CURDATE()
                    WHERE student_id = ? AND status = 'ACTIVE'
                ");
                $deact->execute([$student['id']]);

                // Create new enrollment
                if ($new_class_id > 0) {
                    $ins_enr = $db->prepare("
                        INSERT INTO student_enrollments (student_id, class_id, start_date, status, created_at)
                        VALUES (?, ?, CURDATE(), 'ACTIVE', NOW())
                    ");
                    $ins_enr->execute([$student['id'], $new_class_id]);
                }
            }

            $db->commit();
            set_flash('success', "Student profile for '{$first_name}' updated successfully.");
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
        <h1 class="page-title">Edit Student Profile & Class</h1>
        <p class="page-subtitle">Update student information, status, and class enrollment</p>
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
        <h2 class="card-title">Modify Student: <?= e($student['first_name'] . ' ' . ($student['last_name'] ?? '')) ?></h2>
        <span class="badge badge-info">ID: <?= e($student['student_id']) ?></span>
    </div>
    <form method="POST" action="<?= base_url('admin/student_edit.php?id=' . $student['id']) ?>">
        <div class="card-body">
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">First Name <span class="required">*</span></label>
                    <input type="text" name="first_name" class="form-control" required value="<?= e($student['first_name']) ?>">
                </div>

                <div class="form-group">
                    <label class="form-label">Last Name</label>
                    <input type="text" name="last_name" class="form-control" value="<?= e($student['last_name'] ?? '') ?>">
                </div>

                <div class="form-group">
                    <label class="form-label">Roll Number (Student ID) <span class="required">*</span></label>
                    <input type="text" name="student_id" class="form-control" required value="<?= e($student['student_id']) ?>">
                </div>

                <div class="form-group">
                    <label class="form-label">Admission Number</label>
                    <input type="text" name="admission_number" class="form-control" value="<?= e($student['admission_number'] ?? '') ?>">
                </div>

                <div class="form-group">
                    <label class="form-label">Date of Birth</label>
                    <input type="date" name="date_of_birth" class="form-control" value="<?= e($student['date_of_birth'] ?? '') ?>">
                </div>

                <div class="form-group">
                    <label class="form-label">Enrollment Status</label>
                    <select name="status" class="form-control">
                        <option value="ACTIVE" <?= $student['status'] === 'ACTIVE' ? 'selected' : '' ?>>ACTIVE</option>
                        <option value="INACTIVE" <?= $student['status'] === 'INACTIVE' ? 'selected' : '' ?>>INACTIVE</option>
                        <option value="GRADUATED" <?= $student['status'] === 'GRADUATED' ? 'selected' : '' ?>>GRADUATED</option>
                    </select>
                </div>

                <div class="form-group" style="grid-column: 1 / -1;">
                    <label class="form-label">Class Assignment</label>
                    <select name="class_id" class="form-control">
                        <option value="">-- No Class Assigned --</option>
                        <?php foreach ($classes as $cls): ?>
                            <option value="<?= $cls['id'] ?>" <?= ((int)$student['class_id'] === (int)$cls['id']) ? 'selected' : '' ?>>
                                <?= e($cls['class_code'] ?: "{$cls['batch_name']} - {$cls['semester_name']} Sec {$cls['section_name']}") ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                    <div class="form-help">Changing the class updates the student's active enrollment for attendance taking.</div>
                </div>

                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" name="email" class="form-control" value="<?= e($student['email'] ?? '') ?>">
                </div>

                <div class="form-group">
                    <label class="form-label">Phone</label>
                    <input type="tel" name="phone" class="form-control" value="<?= e($student['phone'] ?? '') ?>">
                </div>
            </div>
        <div class="card-footer" style="display: flex; justify-content: space-between; align-items: center;">
            <a href="<?= base_url('admin/students.php') ?>" class="btn btn-secondary">Cancel</a>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
                <button type="submit" class="btn btn-primary">Save Changes &rarr;</button>
            </div>
        </div>
    </form>
    
    <div style="margin-top: 1.5rem; padding: 1rem 1.25rem; background: rgba(147, 0, 10, 0.15); border: 1px solid var(--error-container); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
        <div>
            <strong style="color: var(--error);">Delete Student Record</strong>
            <p style="font-size: 0.75rem; color: var(--on-surface-variant); margin: 0.2rem 0 0 0;">
                Permanently purge this student, their attendance history, and user credentials from the database.
            </p>
        </div>
        <form method="POST" action="<?= base_url('admin/student_delete.php') ?>" onsubmit="return confirm('⚠️ Are you sure you want to PERMANENTLY delete <?= addslashes($student['first_name'] . ' ' . ($student['last_name'] ?? '')) ?>? This cannot be undone.');" style="margin: 0;">
            <input type="hidden" name="id" value="<?= (int)$student['id'] ?>">
            <button type="submit" class="btn btn-danger">
                🗑️ Delete Student
            </button>
        </form>
    </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
