<?php
/**
 * Administrator - Assign Subjects to Classes & Faculty
 */

$page_title = 'Class Subject Assignment';
require_once __DIR__ . '/../includes/header.php';
require_role(['ADMINISTRATION', 'ADMIN']);

$db = get_db();
$error = null;

// Handle Subject Assignment
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'assign_subject') {
    $class_id   = !empty($_POST['class_id']) ? (int)$_POST['class_id'] : 0;
    $subject_id = !empty($_POST['subject_id']) ? (int)$_POST['subject_id'] : 0;
    $teacher_id = !empty($_POST['teacher_id']) ? (int)$_POST['teacher_id'] : 0;

    if ($class_id <= 0 || $subject_id <= 0 || $teacher_id <= 0) {
        $error = 'Please select a class, a subject, and a faculty member.';
    } else {
        try {
            $db->beginTransaction();

            // Deactivate any currently active assignment for this class + subject
            $deact = $db->prepare("
                UPDATE class_subjects 
                SET is_active = 0, end_date = CURDATE(), updated_at = NOW() 
                WHERE class_id = ? AND subject_id = ? AND is_active = 1
            ");
            $deact->execute([$class_id, $subject_id]);

            // Insert new active assignment
            $ins = $db->prepare("
                INSERT INTO class_subjects (class_id, subject_id, teacher_id, start_date, is_active, created_at, updated_at)
                VALUES (?, ?, ?, CURDATE(), 1, NOW(), NOW())
            ");
            $ins->execute([$class_id, $subject_id, $teacher_id]);

            $db->commit();
            set_flash('success', 'Subject assigned to class and faculty successfully!');
            header('Location: ' . base_url('admin/assign_subject.php'));
            exit;

        } catch (Exception $e) {
            $db->rollBack();
            $error = $e->getMessage();
        }
    }
}

// Fetch Classes
$classes = $db->query("
    SELECT c.id, c.class_code, c.section_name, b.batch_name, sem.name AS semester_name
    FROM classes c
    JOIN admission_batches b ON c.admission_batch_id = b.id
    JOIN semesters sem ON c.semester_id = sem.id
    WHERE c.is_active = 1
    ORDER BY b.batch_name ASC, sem.semester_number ASC, c.section_name ASC
")->fetchAll();

// Fetch Subjects
$subjects = $db->query("
    SELECT id, code, name, subject_type 
    FROM subjects 
    WHERE is_active = 1 
    ORDER BY code ASC
")->fetchAll();

// Fetch Active Teachers
$teachers = $db->query("
    SELECT t.id, t.teacher_id, t.first_name, t.last_name, t.designation, d.code AS dept_code
    FROM teachers t
    LEFT JOIN departments d ON t.department_id = d.id
    WHERE t.status = 'ACTIVE'
    ORDER BY t.first_name ASC
")->fetchAll();

// Fetch All Existing Allocations
$allocations = $db->query("
    SELECT 
        cs.id, cs.start_date, cs.end_date, cs.is_active,
        c.class_code, c.section_name, b.batch_name, sem.name AS semester_name,
        s.code AS subject_code, s.name AS subject_name, s.subject_type,
        CONCAT(t.first_name, ' ', COALESCE(t.last_name, '')) AS teacher_name,
        t.teacher_id AS teacher_code,
        (SELECT COUNT(*) FROM class_sessions WHERE class_subject_id = cs.id) AS sessions_conducted
    FROM class_subjects cs
    JOIN classes c ON cs.class_id = c.id
    JOIN admission_batches b ON c.admission_batch_id = b.id
    JOIN semesters sem ON c.semester_id = sem.id
    JOIN subjects s ON cs.subject_id = s.id
    JOIN teachers t ON cs.teacher_id = t.id
    ORDER BY cs.is_active DESC, cs.start_date DESC
")->fetchAll();
?>

<div class="page-header">
    <div>
        <h1 class="page-title">Class Subject & Faculty Assignment</h1>
        <p class="page-subtitle">Map academic courses to student classes and assign authorized faculty instructors</p>
    </div>
</div>

<?php if ($error): ?>
    <div class="alert alert-error">
        <div><?= e($error) ?></div>
    </div>
<?php endif; ?>

<div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; align-items: start;">
    <!-- Assignment Form -->
    <div class="card">
        <div class="card-header">
            <h2 class="card-title">+ New Subject Allocation</h2>
        </div>
        <form method="POST" action="<?= base_url('admin/assign_subject.php') ?>">
            <input type="hidden" name="action" value="assign_subject">
            <div class="card-body">
                <div class="form-group">
                    <label class="form-label">Target Class <span class="required">*</span></label>
                    <select name="class_id" class="form-control" required>
                        <option value="">-- Select Class --</option>
                        <?php foreach ($classes as $cls): ?>
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
                        <?php foreach ($subjects as $s): ?>
                            <option value="<?= $s['id'] ?>">
                                <?= e($s['code']) ?>: <?= e($s['name']) ?> (<?= e($s['subject_type']) ?>)
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Assign Faculty Member <span class="required">*</span></label>
                    <select name="teacher_id" class="form-control" required>
                        <option value="">-- Select Faculty --</option>
                        <?php foreach ($teachers as $t): ?>
                            <option value="<?= $t['id'] ?>">
                                <?= e($t['first_name'] . ' ' . ($t['last_name'] ?? '')) ?> 
                                (<?= e($t['designation'] ?: $t['dept_code']) ?>)
                            </option>
                        <?php endforeach; ?>
                    </select>
                    <div class="form-help">Authorized faculty can record attendance for this subject in the selected class.</div>
                </div>

                <button type="submit" class="btn btn-primary" style="width: 100%;">Assign Subject &rarr;</button>
            </div>
        </form>
    </div>

    <!-- Allocations Table -->
    <div class="card">
        <div class="card-header">
            <h2 class="card-title">Subject Allocations (<?= count($allocations) ?>)</h2>
        </div>
        <div class="card-body" style="padding: 0;">
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Class</th>
                            <th>Subject</th>
                            <th>Faculty Member</th>
                            <th>Sessions</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($allocations)): ?>
                            <tr>
                                <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                                    No subject allocations found. Use the form on the left to assign subjects.
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($allocations as $a): ?>
                                <tr>
                                    <td>
                                        <strong><?= e($a['class_code'] ?: "{$a['semester_name']} Sec {$a['section_name']}") ?></strong>
                                        <div style="font-size: 0.75rem; color: var(--text-muted);"><?= e($a['batch_name']) ?></div>
                                    </td>
                                    <td>
                                        <strong><?= e($a['subject_code']) ?></strong>
                                        <div style="font-size: 0.85rem;"><?= e($a['subject_name']) ?></div>
                                    </td>
                                    <td>
                                        <strong><?= e($a['teacher_name']) ?></strong>
                                        <div style="font-size: 0.75rem; color: var(--text-muted);"><?= e($a['teacher_code']) ?></div>
                                    </td>
                                    <td>
                                        <span class="badge badge-secondary"><?= $a['sessions_conducted'] ?> Conducted</span>
                                    </td>
                                    <td>
                                        <span class="badge <?= $a['is_active'] ? 'badge-success' : 'badge-secondary' ?>">
                                            <?= $a['is_active'] ? 'ACTIVE' : 'ENDED' ?>
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
