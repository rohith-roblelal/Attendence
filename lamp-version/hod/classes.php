<?php
/**
 * HOD - Department Class & Batch Management
 */

$page_title = 'Department Classes';
require_once __DIR__ . '/../includes/header.php';
require_role(['HOD', 'ADMINISTRATION', 'ADMIN']);

$db = get_db();
$user = current_user();

$department_id = $user['department_id'] ?? null;
if (!$department_id) {
    $d_row = $db->query("SELECT id FROM departments ORDER BY id ASC LIMIT 1")->fetch();
    $department_id = $d_row['id'] ?? 1;
}

$error = null;

// Handle Class Creation within Department
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'create_dept_class') {
    $admission_batch_id = !empty($_POST['admission_batch_id']) ? (int)$_POST['admission_batch_id'] : 0;
    $semester_id        = !empty($_POST['semester_id']) ? (int)$_POST['semester_id'] : 0;
    $section_name       = strtoupper(trim($_POST['section_name'] ?? ''));
    $class_code         = trim($_POST['class_code'] ?? '');

    if ($admission_batch_id <= 0 || $semester_id <= 0 || empty($section_name)) {
        $error = 'Batch, Semester, and Section Name are required.';
    } else {
        try {
            $chk = $db->prepare("SELECT id FROM classes WHERE admission_batch_id = ? AND semester_id = ? AND section_name = ?");
            $chk->execute([$admission_batch_id, $semester_id, $section_name]);
            if ($chk->fetch()) {
                throw new Exception("Class section already exists for this batch and semester.");
            }

            if (empty($class_code)) {
                $class_code = "CLS-" . time();
            }

            $stmt = $db->prepare("
                INSERT INTO classes (admission_batch_id, semester_id, section_name, class_code, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, 1, NOW(), NOW())
            ");
            $stmt->execute([$admission_batch_id, $semester_id, $section_name, $class_code]);

            set_flash('success', "Class section '{$section_name}' added to department!");
            header('Location: ' . base_url('hod/classes.php'));
            exit;
        } catch (Exception $e) {
            $error = $e->getMessage();
        }
    }
}

// Fetch Batches of this Department
$batches = $db->prepare("SELECT id, batch_name FROM admission_batches WHERE department_id = ? ORDER BY batch_name ASC");
$batches->execute([$department_id]);
$dept_batches = $batches->fetchAll();

// Fetch Semesters
$semesters = $db->query("SELECT id, name, semester_number FROM semesters ORDER BY semester_number ASC")->fetchAll();

// Fetch Department Classes
$classes_stmt = $db->prepare("
    SELECT 
        c.id, c.section_name, c.class_code, c.is_active,
        b.batch_name, sem.name AS semester_name,
        (SELECT COUNT(*) FROM student_enrollments se WHERE se.class_id = c.id AND se.status = 'ACTIVE') AS student_count,
        (SELECT COUNT(*) FROM class_subjects cs WHERE cs.class_id = c.id AND cs.is_active = 1) AS subject_count
    FROM classes c
    JOIN admission_batches b ON c.admission_batch_id = b.id
    JOIN semesters sem ON c.semester_id = sem.id
    WHERE b.department_id = ?
    ORDER BY b.batch_name ASC, sem.semester_number ASC, c.section_name ASC
");
$classes_stmt->execute([$department_id]);
$classes = $classes_stmt->fetchAll();
?>

<div class="page-header">
    <div>
        <h1 class="page-title">Department Classes & Sections</h1>
        <p class="page-subtitle">Manage class sections and student enrollments for your department</p>
    </div>
    <div>
        <a href="<?= base_url('hod/enroll_student.php') ?>" class="btn btn-primary">👥 Enroll Students into Class &rarr;</a>
    </div>
</div>

<?php if ($error): ?>
    <div class="alert alert-error">
        <div><?= e($error) ?></div>
    </div>
<?php endif; ?>

<div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; align-items: start;">
    <!-- Add Class Form -->
    <div class="card">
        <div class="card-header">
            <h2 class="card-title">+ Add Class Section</h2>
        </div>
        <form method="POST" action="<?= base_url('hod/classes.php') ?>">
            <input type="hidden" name="action" value="create_dept_class">
            <div class="card-body">
                <div class="form-group">
                    <label class="form-label">Admission Batch <span class="required">*</span></label>
                    <select name="admission_batch_id" class="form-control" required>
                        <option value="">-- Select Batch --</option>
                        <?php foreach ($dept_batches as $b): ?>
                            <option value="<?= $b['id'] ?>"><?= e($b['batch_name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Semester <span class="required">*</span></label>
                    <select name="semester_id" class="form-control" required>
                        <option value="">-- Select Semester --</option>
                        <?php foreach ($semesters as $s): ?>
                            <option value="<?= $s['id'] ?>"><?= e($s['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Section Name <span class="required">*</span></label>
                    <input type="text" name="section_name" class="form-control" required placeholder="e.g. A, B" maxlength="5">
                </div>

                <div class="form-group">
                    <label class="form-label">Class Code</label>
                    <input type="text" name="class_code" class="form-control" placeholder="e.g. CSE-SEM4-C">
                </div>

                <button type="submit" class="btn btn-primary" style="width: 100%;">Create Section &rarr;</button>
            </div>
        </form>
    </div>

    <!-- Department Classes Table -->
    <div class="card">
        <div class="card-header">
            <h2 class="card-title">Department Class Sections (<?= count($classes) ?>)</h2>
        </div>
        <div class="card-body" style="padding: 0;">
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Class Code</th>
                            <th>Batch</th>
                            <th>Semester / Sec</th>
                            <th>Students</th>
                            <th>Subjects</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($classes)): ?>
                            <tr>
                                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                                    No classes configured in this department yet.
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($classes as $c): ?>
                                <tr>
                                    <td><strong><?= e($c['class_code']) ?></strong></td>
                                    <td><?= e($c['batch_name']) ?></td>
                                    <td><?= e($c['semester_name']) ?> &bull; <strong>Sec <?= e($c['section_name']) ?></strong></td>
                                    <td>
                                        <span class="badge badge-info">👨‍🎓 <?= $c['student_count'] ?> Enrolled</span>
                                    </td>
                                    <td>
                                        <span class="badge badge-secondary">📚 <?= $c['subject_count'] ?> Assigned</span>
                                    </td>
                                    <td>
                                        <span class="badge <?= $c['is_active'] ? 'badge-success' : 'badge-secondary' ?>">
                                            <?= $c['is_active'] ? 'ACTIVE' : 'INACTIVE' ?>
                                        </span>
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
