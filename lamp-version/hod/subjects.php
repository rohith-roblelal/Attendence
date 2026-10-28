<?php
/**
 * HOD - Department Subject & Faculty Allocations
 */

$page_title = 'Department Subject Allocations';
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

// Handle Allocation
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'allocate') {
    $class_id   = !empty($_POST['class_id']) ? (int)$_POST['class_id'] : 0;
    $subject_id = !empty($_POST['subject_id']) ? (int)$_POST['subject_id'] : 0;
    $teacher_id = !empty($_POST['teacher_id']) ? (int)$_POST['teacher_id'] : 0;

    if ($class_id <= 0 || $subject_id <= 0 || $teacher_id <= 0) {
        $error = 'Please select a class, subject, and faculty member.';
    } else {
        try {
            $db->beginTransaction();

            // End active assignment for this class-subject if existing
            $deact = $db->prepare("
                UPDATE class_subjects 
                SET is_active = 0, end_date = CURDATE(), updated_at = NOW() 
                WHERE class_id = ? AND subject_id = ? AND is_active = 1
            ");
            $deact->execute([$class_id, $subject_id]);

            // Insert new allocation
            $ins = $db->prepare("
                INSERT INTO class_subjects (class_id, subject_id, teacher_id, start_date, is_active, created_at, updated_at)
                VALUES (?, ?, ?, CURDATE(), 1, NOW(), NOW())
            ");
            $ins->execute([$class_id, $subject_id, $teacher_id]);

            $db->commit();
            set_flash('success', 'Faculty assigned to subject successfully!');
            header('Location: ' . base_url('hod/subjects.php'));
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

// Fetch Subjects
$subjects = $db->query("SELECT id, code, name, subject_type FROM subjects WHERE is_active = 1 ORDER BY code ASC")->fetchAll();

// Fetch Department Faculty
$teachers = $db->prepare("
    SELECT t.id, t.teacher_id, t.first_name, t.last_name, t.designation
    FROM teachers t
    WHERE (t.department_id = ? OR t.department_id IS NULL) AND t.status = 'ACTIVE'
    ORDER BY t.first_name ASC
");
$teachers->execute([$department_id]);
$dept_teachers = $teachers->fetchAll();

// Fetch Current Department Allocations
$allocations = $db->prepare("
    SELECT 
        cs.id, cs.start_date, cs.is_active,
        c.class_code, c.section_name, b.batch_name, sem.name AS semester_name,
        s.code AS subject_code, s.name AS subject_name,
        CONCAT(t.first_name, ' ', COALESCE(t.last_name, '')) AS teacher_name,
        (SELECT COUNT(*) FROM class_sessions WHERE class_subject_id = cs.id) AS sessions_count
    FROM class_subjects cs
    JOIN classes c ON cs.class_id = c.id
    JOIN admission_batches b ON c.admission_batch_id = b.id
    JOIN semesters sem ON c.semester_id = sem.id
    JOIN subjects s ON cs.subject_id = s.id
    JOIN teachers t ON cs.teacher_id = t.id
    WHERE b.department_id = ?
    ORDER BY cs.is_active DESC, s.code ASC
");
$allocations->execute([$department_id]);
$dept_allocations = $allocations->fetchAll();
?>

<div class="page-header">
    <div>
        <h1 class="page-title">Department Subject Allocations</h1>
        <p class="page-subtitle">Assign faculty instructors to courses across your department classes</p>
    </div>
</div>

<?php if ($error): ?>
    <div class="alert alert-error">
        <div><?= e($error) ?></div>
    </div>
<?php endif; ?>

<div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; align-items: start;">
    <!-- Allocation Form -->
    <div class="card">
        <div class="card-header">
            <h2 class="card-title">+ Assign Faculty to Subject</h2>
        </div>
        <form method="POST" action="<?= base_url('hod/subjects.php') ?>">
            <input type="hidden" name="action" value="allocate">
            <div class="card-body">
                <div class="form-group">
                    <label class="form-label">Department Class <span class="required">*</span></label>
                    <select name="class_id" class="form-control" required>
                        <option value="">-- Select Class --</option>
                        <?php foreach ($dept_classes as $cls): ?>
                            <option value="<?= $cls['id'] ?>">
                                <?= e($cls['class_code'] ?: "{$cls['batch_name']} - {$cls['semester_name']} Sec {$cls['section_name']}") ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Subject <span class="required">*</span></label>
                    <select name="subject_id" class="form-control" required>
                        <option value="">-- Select Subject --</option>
                        <?php foreach ($subjects as $sub): ?>
                            <option value="<?= $sub['id'] ?>">
                                <?= e($sub['code']) ?>: <?= e($sub['name']) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Faculty Instructor <span class="required">*</span></label>
                    <select name="teacher_id" class="form-control" required>
                        <option value="">-- Select Faculty Member --</option>
                        <?php foreach ($dept_teachers as $t): ?>
                            <option value="<?= $t['id'] ?>">
                                <?= e($t['first_name'] . ' ' . ($t['last_name'] ?? '')) ?> 
                                (<?= e($t['designation'] ?: $t['teacher_id']) ?>)
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <button type="submit" class="btn btn-primary" style="width: 100%;">Save Allocation &rarr;</button>
            </div>
        </form>
    </div>

    <!-- Allocations Table -->
    <div class="card">
        <div class="card-header">
            <h2 class="card-title">Active Department Allocations (<?= count($dept_allocations) ?>)</h2>
        </div>
        <div class="card-body" style="padding: 0;">
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Class</th>
                            <th>Subject</th>
                            <th>Assigned Faculty</th>
                            <th>Sessions</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($dept_allocations)): ?>
                            <tr>
                                <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                                    No subject allocations found.
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($dept_allocations as $a): ?>
                                <tr>
                                    <td>
                                        <strong><?= e($a['class_code'] ?: "{$a['semester_name']} Sec {$a['section_name']}") ?></strong>
                                    </td>
                                    <td>
                                        <strong><?= e($a['subject_code']) ?></strong>
                                        <div style="font-size: 0.85rem;"><?= e($a['subject_name']) ?></div>
                                    </td>
                                    <td><?= e($a['teacher_name']) ?></td>
                                    <td>
                                        <span class="badge badge-secondary"><?= $a['sessions_count'] ?> recorded</span>
                                    </td>
                                    <td>
                                        <span class="badge <?= $a['is_active'] ? 'badge-success' : 'badge-secondary' ?>">
                                            <?= $a['is_active'] ? 'ACTIVE' : 'INACTIVE' ?>
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
