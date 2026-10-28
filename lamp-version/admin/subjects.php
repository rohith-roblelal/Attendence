<?php
/**
 * Administrator - Subject Management
 */

$page_title = 'Subject Management';
require_once __DIR__ . '/../includes/header.php';
require_role(['ADMINISTRATION', 'ADMIN']);

$db = get_db();
$error = null;

// Handle Subject Creation
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'create_subject') {
    $code                  = strtoupper(trim($_POST['code'] ?? ''));
    $name                  = trim($_POST['name'] ?? '');
    $subject_type          = $_POST['subject_type'] ?? 'THEORY';
    $default_contact_hours = !empty($_POST['default_contact_hours']) ? (float)$_POST['default_contact_hours'] : 1.00;
    $credits               = !empty($_POST['credits']) ? (float)$_POST['credits'] : null;
    $description           = trim($_POST['description'] ?? '');

    if (empty($code) || empty($name)) {
        $error = 'Subject Code and Subject Name are required.';
    } else {
        try {
            $chk = $db->prepare("SELECT id FROM subjects WHERE code = ?");
            $chk->execute([$code]);
            if ($chk->fetch()) {
                throw new Exception("Subject Code '{$code}' already exists.");
            }

            $stmt = $db->prepare("
                INSERT INTO subjects (code, name, subject_type, default_contact_hours, credits, description, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
            ");
            $stmt->execute([$code, $name, $subject_type, $default_contact_hours, $credits, $description ?: null]);

            set_flash('success', "Subject '{$code}: {$name}' created successfully!");
            header('Location: ' . base_url('admin/subjects.php'));
            exit;

        } catch (Exception $e) {
            $error = $e->getMessage();
        }
    }
}

// Handle Subject Deletion
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'delete_subject') {
    $subject_id_param = isset($_POST['id']) && is_numeric($_POST['id']) ? (int)$_POST['id'] : 0;
    if ($subject_id_param > 0) {
        try {
            $db->beginTransaction();
            $sub_stmt = $db->prepare("SELECT id, code, name FROM subjects WHERE id = ?");
            $sub_stmt->execute([$subject_id_param]);
            $sub_row = $sub_stmt->fetch();

            if ($sub_row) {
                $sub_code = $sub_row['code'];
                $sub_name = $sub_row['name'];

                // 1. Delete attendance audit logs linked to sessions of this subject
                $db->prepare("
                    DELETE al FROM attendance_audit_logs al
                    JOIN attendance_records ar ON al.attendance_record_id = ar.id
                    JOIN class_sessions cs ON ar.class_session_id = cs.id
                    JOIN class_subjects csub ON cs.class_subject_id = csub.id
                    WHERE csub.subject_id = ?
                ")->execute([$subject_id_param]);

                // 2. Delete attendance records for this subject's sessions
                $db->prepare("
                    DELETE ar FROM attendance_records ar
                    JOIN class_sessions cs ON ar.class_session_id = cs.id
                    JOIN class_subjects csub ON cs.class_subject_id = csub.id
                    WHERE csub.subject_id = ?
                ")->execute([$subject_id_param]);

                // 3. Delete class sessions for this subject
                $db->prepare("
                    DELETE cs FROM class_sessions cs
                    JOIN class_subjects csub ON cs.class_subject_id = csub.id
                    WHERE csub.subject_id = ?
                ")->execute([$subject_id_param]);

                // 4. Delete allocations from class_subjects
                $db->prepare("DELETE FROM class_subjects WHERE subject_id = ?")->execute([$subject_id_param]);

                // 5. Delete subject itself
                $db->prepare("DELETE FROM subjects WHERE id = ?")->execute([$subject_id_param]);

                $db->commit();
                set_flash('success', "Subject '{$sub_code}: {$sub_name}' and all associated records deleted permanently from database.");
            } else {
                throw new Exception("Subject record not found.");
            }
        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            set_flash('error', "Failed to delete subject: " . $e->getMessage());
        }
    }
    header('Location: ' . base_url('admin/subjects.php'));
    exit;
}

// Fetch All Subjects
$subjects = $db->query("
    SELECT 
        s.*,
        (SELECT COUNT(DISTINCT class_id) FROM class_subjects cs WHERE cs.subject_id = s.id AND cs.is_active = 1) AS classes_taught,
        (SELECT COUNT(DISTINCT teacher_id) FROM class_subjects cs WHERE cs.subject_id = s.id AND cs.is_active = 1) AS faculty_count
    FROM subjects s
    ORDER BY s.is_active DESC, s.code ASC
")->fetchAll();
?>

<div class="page-header">
    <div>
        <h1 class="page-title">Subject Curriculum Management</h1>
        <p class="page-subtitle">Configure academic courses, theory/lab classifications, credits, and contact hours</p>
    </div>
    <div>
        <a href="<?= base_url('admin/assign_subject.php') ?>" class="btn btn-secondary">🔗 Assign Subjects to Classes &rarr;</a>
    </div>
</div>

<?php if ($error): ?>
    <div class="alert alert-error">
        <div><?= e($error) ?></div>
    </div>
<?php endif; ?>

<div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; align-items: start;">
    <!-- Create Subject Form -->
    <div class="card">
        <div class="card-header">
            <h2 class="card-title">+ Add New Subject</h2>
        </div>
        <form method="POST" action="<?= base_url('admin/subjects.php') ?>">
            <input type="hidden" name="action" value="create_subject">
            <div class="card-body">
                <div class="form-group">
                    <label class="form-label">Subject Code <span class="required">*</span></label>
                    <input type="text" name="code" class="form-control" required placeholder="e.g. CS401" maxlength="30">
                </div>

                <div class="form-group">
                    <label class="form-label">Subject Name <span class="required">*</span></label>
                    <input type="text" name="name" class="form-control" required placeholder="e.g. Database Management Systems" maxlength="150">
                </div>

                <div class="form-group">
                    <label class="form-label">Subject Type <span class="required">*</span></label>
                    <select name="subject_type" class="form-control">
                        <option value="THEORY">THEORY</option>
                        <option value="LAB">LAB</option>
                        <option value="ELECTIVE">ELECTIVE</option>
                        <option value="PROJECT">PROJECT</option>
                    </select>
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Contact Hours</label>
                        <input type="number" step="0.5" name="default_contact_hours" class="form-control" value="1.0" min="0.5" max="10.0">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Credits</label>
                        <input type="number" step="0.5" name="credits" class="form-control" value="3.0" min="0.5" max="10.0">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Description (Optional)</label>
                    <textarea name="description" class="form-control" rows="2" placeholder="Course syllabus overview..."></textarea>
                </div>

                <button type="submit" class="btn btn-primary" style="width: 100%;">Create Subject &rarr;</button>
            </div>
        </form>
    </div>

    <!-- Active Subjects Table -->
    <div class="card">
        <div class="card-header">
            <h2 class="card-title">Curriculum Subjects (<?= count($subjects) ?>)</h2>
        </div>
        <div class="card-body" style="padding: 0;">
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Subject Name</th>
                            <th>Type</th>
                            <th>Hours / Credits</th>
                            <th>Allocated Classes</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($subjects)): ?>
                            <tr>
                                <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                                    No subjects created yet.
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($subjects as $sub): ?>
                                <tr>
                                    <td><strong><?= e($sub['code']) ?></strong></td>
                                    <td>
                                        <strong><?= e($sub['name']) ?></strong>
                                        <?php if ($sub['description']): ?>
                                            <div style="font-size: 0.75rem; color: var(--text-muted);"><?= e($sub['description']) ?></div>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <span class="badge <?= $sub['subject_type'] === 'LAB' ? 'badge-info' : 'badge-secondary' ?>">
                                            <?= e($sub['subject_type']) ?>
                                        </span>
                                    </td>
                                    <td>
                                        <?= (float)$sub['default_contact_hours'] ?> hrs &bull; <?= (float)$sub['credits'] ?> cr
                                    </td>
                                    <td>
                                        <span class="badge badge-info">
                                            🏫 <?= $sub['classes_taught'] ?> Classes (<?= $sub['faculty_count'] ?> Faculty)
                                        </span>
                                    </td>
                                    <td>
                                        <span class="badge <?= $sub['is_active'] ? 'badge-success' : 'badge-secondary' ?>">
                                            <?= $sub['is_active'] ? 'ACTIVE' : 'INACTIVE' ?>
                                        </span>
                                    </td>
                                    <td>
                                        <form method="POST" action="<?= base_url('admin/subjects.php') ?>" onsubmit="return confirm('⚠️ Are you sure you want to PERMANENTLY delete subject <?= addslashes($sub['code']) ?>: <?= addslashes($sub['name']) ?>? This will delete all its class allocations and attendance data.');" style="margin: 0; display: inline;">
                                            <input type="hidden" name="action" value="delete_subject">
                                            <input type="hidden" name="id" value="<?= (int)$sub['id'] ?>">
                                            <button type="submit" class="btn btn-danger btn-sm" title="Delete Subject">
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
