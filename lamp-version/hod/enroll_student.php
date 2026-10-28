<?php
/**
 * HOD - Student Class Enrollment & Section Assignment
 */

$page_title = 'Student Enrollment';
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

// Handle Enrollment Assignment
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'enroll_student') {
    $student_id = !empty($_POST['student_id']) ? (int)$_POST['student_id'] : 0;
    $class_id   = !empty($_POST['class_id']) ? (int)$_POST['class_id'] : 0;

    if ($student_id <= 0 || $class_id <= 0) {
        $error = 'Please select a student and target class.';
    } else {
        try {
            $db->beginTransaction();

            // End active enrollment if any
            $deact = $db->prepare("UPDATE student_enrollments SET status = 'TRANSFERRED', end_date = CURDATE() WHERE student_id = ? AND status = 'ACTIVE'");
            $deact->execute([$student_id]);

            // Add new active enrollment
            $ins = $db->prepare("INSERT INTO student_enrollments (student_id, class_id, start_date, status, created_at) VALUES (?, ?, CURDATE(), 'ACTIVE', NOW())");
            $ins->execute([$student_id, $class_id]);

            $db->commit();
            set_flash('success', 'Student successfully enrolled into class!');
            header('Location: ' . base_url('hod/enroll_student.php'));
            exit;

        } catch (Exception $e) {
            $db->rollBack();
            $error = $e->getMessage();
        }
    }
}

// Fetch Department Classes
$classes = $db->prepare("
    SELECT c.id, c.class_code, c.section_name, b.batch_name, sem.name AS semester_name
    FROM classes c
    JOIN admission_batches b ON c.admission_batch_id = b.id
    JOIN semesters sem ON c.semester_id = sem.id
    WHERE b.department_id = ? AND c.is_active = 1
    ORDER BY b.batch_name ASC, sem.semester_number ASC, c.section_name ASC
");
$classes->execute([$department_id]);
$dept_classes = $classes->fetchAll();

// Fetch All Students with Current Enrollment
$students = $db->query("
    SELECT 
        s.id, s.student_id, s.admission_number, s.first_name, s.last_name, s.status,
        se.class_id, c.class_code, c.section_name, b.batch_name, sem.name AS semester_name
    FROM students s
    LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.status = 'ACTIVE'
    LEFT JOIN classes c ON se.class_id = c.id
    LEFT JOIN admission_batches b ON c.admission_batch_id = b.id
    LEFT JOIN semesters sem ON c.semester_id = sem.id
    ORDER BY (se.class_id IS NULL) DESC, CAST(s.student_id AS UNSIGNED) ASC, s.student_id ASC
")->fetchAll();
?>

<div class="page-header">
    <div>
        <h1 class="page-title">Student Class Enrollment & Assignment</h1>
        <p class="page-subtitle">Assign registered students to classes and manage transfers between sections</p>
    </div>
</div>

<?php if ($error): ?>
    <div class="alert alert-error">
        <div><?= e($error) ?></div>
    </div>
<?php endif; ?>

<div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; align-items: start;">
    <!-- Enrollment Form -->
    <div class="card">
        <div class="card-header">
            <h2 class="card-title">Enroll / Transfer Student</h2>
        </div>
        <form method="POST" action="<?= base_url('hod/enroll_student.php') ?>">
            <input type="hidden" name="action" value="enroll_student">
            <div class="card-body">
                <div class="form-group">
                    <label class="form-label">Select Student <span class="required">*</span></label>
                    <select name="student_id" class="form-control" required>
                        <option value="">-- Select Student --</option>
                        <?php foreach ($students as $stu): ?>
                            <option value="<?= $stu['id'] ?>">
                                <?= e($stu['student_id']) ?>: <?= e($stu['first_name'] . ' ' . ($stu['last_name'] ?? '')) ?> 
                                <?= $stu['class_id'] ? "(Current: {$stu['class_code']})" : "(UNASSIGNED)" ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Target Class Section <span class="required">*</span></label>
                    <select name="class_id" class="form-control" required>
                        <option value="">-- Select Target Class --</option>
                        <?php foreach ($dept_classes as $cls): ?>
                            <option value="<?= $cls['id'] ?>">
                                <?= e($cls['class_code'] ?: "{$cls['batch_name']} - {$cls['semester_name']} Sec {$cls['section_name']}") ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <button type="submit" class="btn btn-primary" style="width: 100%;">Confirm Enrollment &rarr;</button>
            </div>
        </form>
    </div>

    <!-- Student Enrollment Directory -->
    <div class="card">
        <div class="card-header">
            <h2 class="card-title">Student Directory & Current Classes (<?= count($students) ?>)</h2>
        </div>
        <div class="card-body" style="padding: 0;">
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Roll No</th>
                            <th>Student Name</th>
                            <th>Admission No</th>
                            <th>Current Class</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($students as $stu): ?>
                            <tr>
                                <td><strong><?= e($stu['student_id']) ?></strong></td>
                                <td><?= e($stu['first_name'] . ' ' . ($stu['last_name'] ?? '')) ?></td>
                                <td><code><?= e($stu['admission_number'] ?: '—') ?></code></td>
                                <td>
                                    <?php if ($stu['class_id']): ?>
                                        <span class="badge badge-info">
                                            <?= e($stu['class_code'] ?: "{$stu['semester_name']} Sec {$stu['section_name']}") ?>
                                        </span>
                                    <?php else: ?>
                                        <span class="badge badge-warning">Unassigned</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <span class="badge <?= $stu['status'] === 'ACTIVE' ? 'badge-success' : 'badge-secondary' ?>">
                                        <?= e($stu['status']) ?>
                                    </span>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
