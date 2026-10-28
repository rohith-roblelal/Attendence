<?php
/**
 * Administrator - Class & Semester Management
 */

$page_title = 'Class & Semester Management';
require_once __DIR__ . '/../includes/header.php';
require_role(['ADMINISTRATION', 'ADMIN']);

$db = get_db();
$error = null;

// Handle Form Submission to Create New Class
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'create_class') {
    $admission_batch_id = !empty($_POST['admission_batch_id']) ? (int)$_POST['admission_batch_id'] : 0;
    $semester_id        = !empty($_POST['semester_id']) ? (int)$_POST['semester_id'] : 0;
    $section_name       = strtoupper(trim($_POST['section_name'] ?? ''));
    $class_code         = trim($_POST['class_code'] ?? '');

    if ($admission_batch_id <= 0 || $semester_id <= 0 || empty($section_name)) {
        $error = 'Please select a batch, a semester, and provide a section name (e.g. A, B).';
    } else {
        try {
            // Check uniqueness (admission_batch_id, semester_id, section_name)
            $chk = $db->prepare("SELECT id FROM classes WHERE admission_batch_id = ? AND semester_id = ? AND section_name = ?");
            $chk->execute([$admission_batch_id, $semester_id, $section_name]);
            if ($chk->fetch()) {
                throw new Exception("Class with this Batch, Semester, and Section already exists.");
            }

            if (!empty($class_code)) {
                $chk_code = $db->prepare("SELECT id FROM classes WHERE class_code = ?");
                $chk_code->execute([$class_code]);
                if ($chk_code->fetch()) {
                    throw new Exception("Class Code '{$class_code}' is already assigned.");
                }
            } else {
                // Auto-generate code if empty
                $class_code = "CLS-" . time();
            }

            $stmt = $db->prepare("
                INSERT INTO classes (admission_batch_id, semester_id, section_name, class_code, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, 1, NOW(), NOW())
            ");
            $stmt->execute([$admission_batch_id, $semester_id, $section_name, $class_code]);

            set_flash('success', "New class '{$class_code}' (Section {$section_name}) created successfully!");
            header('Location: ' . base_url('admin/classes.php'));
            exit;

        } catch (Exception $e) {
            $error = $e->getMessage();
        }
    }
}

// Handle Class Deletion
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'delete_class') {
    $class_id_param = isset($_POST['id']) && is_numeric($_POST['id']) ? (int)$_POST['id'] : 0;
    if ($class_id_param > 0) {
        try {
            $db->beginTransaction();
            $c_stmt = $db->prepare("SELECT id, class_code, section_name FROM classes WHERE id = ?");
            $c_stmt->execute([$class_id_param]);
            $c_row = $c_stmt->fetch();

            if ($c_row) {
                $c_code = $c_row['class_code'] ?: "Section {$c_row['section_name']}";

                // 1. Delete audit logs linked to this class's sessions
                $db->prepare("
                    DELETE al FROM attendance_audit_logs al
                    JOIN attendance_records ar ON al.attendance_record_id = ar.id
                    JOIN class_sessions cs ON ar.class_session_id = cs.id
                    WHERE cs.class_id = ?
                ")->execute([$class_id_param]);

                // 2. Delete attendance records for this class's sessions
                $db->prepare("
                    DELETE ar FROM attendance_records ar
                    JOIN class_sessions cs ON ar.class_session_id = cs.id
                    WHERE cs.class_id = ?
                ")->execute([$class_id_param]);

                // 3. Delete class sessions
                $db->prepare("DELETE FROM class_sessions WHERE class_id = ?")->execute([$class_id_param]);

                // 4. Delete subject allocations
                $db->prepare("DELETE FROM class_subjects WHERE class_id = ?")->execute([$class_id_param]);

                // 5. Delete student enrollments
                $db->prepare("DELETE FROM student_enrollments WHERE class_id = ?")->execute([$class_id_param]);

                // 6. Delete class itself
                $db->prepare("DELETE FROM classes WHERE id = ?")->execute([$class_id_param]);

                $db->commit();
                set_flash('success', "Class '{$c_code}' and all associated records deleted permanently from database.");
            } else {
                throw new Exception("Class record not found.");
            }
        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            set_flash('error', "Failed to delete class: " . $e->getMessage());
        }
    }
    header('Location: ' . base_url('admin/classes.php'));
    exit;
}

// Handle Class Edit / Update
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'edit_class') {
    $class_id_param = isset($_POST['id']) && is_numeric($_POST['id']) ? (int)$_POST['id'] : 0;
    $class_code_val = trim($_POST['class_code'] ?? '');
    $section_val    = strtoupper(trim($_POST['section_name'] ?? ''));
    $is_active_val  = isset($_POST['is_active']) ? (int)$_POST['is_active'] : 1;

    if ($class_id_param > 0 && !empty($section_val)) {
        try {
            $stmt = $db->prepare("UPDATE classes SET class_code = ?, section_name = ?, is_active = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$class_code_val, $section_val, $is_active_val, $class_id_param]);
            set_flash('success', "Class '{$class_code_val}' updated successfully!");
        } catch (Exception $e) {
            set_flash('error', "Failed to update class: " . $e->getMessage());
        }
    }
    header('Location: ' . base_url('admin/classes.php'));
    exit;
}

// Fetch Batches & Semesters for creation dropdown
$batches = $db->query("
    SELECT b.id, b.batch_name, d.code AS dept_code
    FROM admission_batches b
    JOIN departments d ON b.department_id = d.id
    ORDER BY b.batch_name ASC
")->fetchAll();

$semesters = $db->query("
    SELECT s.id, s.name, s.semester_number, a.name AS academic_year
    FROM semesters s
    JOIN academic_years a ON s.academic_year_id = a.id
    ORDER BY s.semester_number ASC
")->fetchAll();

// Fetch All Classes with Enrollment Count
$classes = $db->query("
    SELECT 
        c.id, c.section_name, c.class_code, c.is_active, c.created_at,
        b.batch_name, d.name AS dept_name, d.code AS dept_code,
        sem.name AS semester_name, sem.semester_number,
        (SELECT COUNT(*) FROM student_enrollments se WHERE se.class_id = c.id AND se.status = 'ACTIVE') AS student_count,
        (SELECT COUNT(*) FROM class_subjects cs WHERE cs.class_id = c.id AND cs.is_active = 1) AS subject_count
    FROM classes c
    JOIN admission_batches b ON c.admission_batch_id = b.id
    JOIN departments d ON b.department_id = d.id
    JOIN semesters sem ON c.semester_id = sem.id
    ORDER BY d.code ASC, b.batch_name ASC, sem.semester_number ASC, c.section_name ASC
")->fetchAll();
?>

<div class="page-header">
    <div>
        <h1 class="page-title">Class & Semester Management</h1>
        <p class="page-subtitle">Configure class sections, batches, semesters, and monitor student headcounts</p>
    </div>
    <div>
        <a href="<?= base_url('admin/academic_setup.php') ?>" class="btn btn-secondary">
            <span class="material-symbols-outlined">account_tree</span> Setup Academic Years, Depts & Sems &rarr;
        </a>
    </div>
</div>

<?php if ($error): ?>
    <div class="alert alert-error">
        <div><?= e($error) ?></div>
    </div>
<?php endif; ?>

<div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; align-items: start;">
    <!-- Create Class Form -->
    <div class="card">
        <div class="card-header">
            <h2 class="card-title">+ Create New Class</h2>
        </div>
        <form method="POST" action="<?= base_url('admin/classes.php') ?>">
            <input type="hidden" name="action" value="create_class">
            <div class="card-body">
                <div class="form-group">
                    <label class="form-label">Admission Batch <span class="required">*</span></label>
                    <select name="admission_batch_id" class="form-control" required>
                        <option value="">-- Select Batch --</option>
                        <?php foreach ($batches as $b): ?>
                            <option value="<?= $b['id'] ?>"><?= e($b['batch_name']) ?> (<?= e($b['dept_code']) ?>)</option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Semester <span class="required">*</span></label>
                    <select name="semester_id" class="form-control" required>
                        <option value="">-- Select Semester --</option>
                        <?php foreach ($semesters as $s): ?>
                            <option value="<?= $s['id'] ?>"><?= e($s['name']) ?> (<?= e($s['academic_year']) ?>)</option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Section Name <span class="required">*</span></label>
                    <input type="text" name="section_name" class="form-control" required placeholder="e.g. A, B, or C" maxlength="5">
                </div>

                <div class="form-group">
                    <label class="form-label">Class Code (Optional)</label>
                    <input type="text" name="class_code" class="form-control" placeholder="e.g. CSE-SEM4-A">
                    <div class="form-help">Leave empty to auto-generate a unique code.</div>
                </div>

                <button type="submit" class="btn btn-primary" style="width: 100%;">Create Class &rarr;</button>
            </div>
        </form>
    </div>

    <!-- Active Classes List -->
    <div class="card">
        <div class="card-header">
            <h2 class="card-title">All Classes (<?= count($classes) ?>)</h2>
        </div>
        <div class="card-body" style="padding: 0;">
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Class Code</th>
                            <th>Department & Batch</th>
                            <th>Semester / Sec</th>
                            <th>Students</th>
                            <th>Subjects</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($classes)): ?>
                            <tr>
                                <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                                    No classes configured yet. Use the form on the left to create one.
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($classes as $c): ?>
                                <tr>
                                    <td>
                                        <strong><?= e($c['class_code']) ?></strong>
                                    </td>
                                    <td>
                                        <div><strong><?= e($c['dept_code']) ?></strong></div>
                                        <div style="font-size: 0.75rem; color: var(--text-muted);"><?= e($c['batch_name']) ?></div>
                                    </td>
                                    <td>
                                        <?= e($c['semester_name']) ?> &bull; <strong>Sec <?= e($c['section_name']) ?></strong>
                                    </td>
                                    <td>
                                        <a href="<?= base_url('admin/students.php?class_id=' . $c['id']) ?>" class="badge badge-info" style="text-decoration: none;">
                                            👨‍🎓 <?= $c['student_count'] ?> Students
                                        </a>
                                    </td>
                                    <td>
                                        <span class="badge badge-secondary">📚 <?= $c['subject_count'] ?> Assigned</span>
                                    </td>
                                    <td>
                                        <span class="badge <?= $c['is_active'] ? 'badge-success' : 'badge-secondary' ?>">
                                            <?= $c['is_active'] ? 'ACTIVE' : 'INACTIVE' ?>
                                        </span>
                                    </td>
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                                            <button type="button" class="btn btn-secondary btn-sm" onclick="editClass(<?= (int)$c['id'] ?>, '<?= addslashes($c['class_code']) ?>', '<?= addslashes($c['section_name']) ?>', <?= (int)$c['is_active'] ?>)">
                                                ✏️ Edit
                                            </button>
                                            <form method="POST" action="<?= base_url('admin/classes.php') ?>" onsubmit="return confirm('⚠️ Are you sure you want to PERMANENTLY delete class <?= addslashes($c['class_code']) ?>? This will delete all student enrollments and session records for this class.');" style="margin: 0; display: inline;">
                                                <input type="hidden" name="action" value="delete_class">
                                                <input type="hidden" name="id" value="<?= (int)$c['id'] ?>">
                                                <button type="submit" class="btn btn-danger btn-sm" title="Delete Class">
                                                    🗑️ Delete
                                                </button>
                                            </form>
                                        </div>
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

<!-- Quick Class Edit Modal Dialog -->
<div id="editClassModal" style="display: none; position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); align-items: center; justify-content: center; padding: 1.5rem;">
    <div style="background: var(--surface-container); border: 1px solid var(--outline-variant); border-radius: var(--radius-xl); max-width: 440px; width: 100%; padding: 1.5rem; box-shadow: var(--shadow-card);">
        <h3 style="margin-bottom: 1rem; color: var(--on-surface);">✏️ Edit Class Details</h3>
        <form method="POST" action="<?= base_url('admin/classes.php') ?>">
            <input type="hidden" name="action" value="edit_class">
            <input type="hidden" name="id" id="modalClassId">
            
            <div class="form-group">
                <label class="form-label">Class Code</label>
                <input type="text" name="class_code" id="modalClassCode" class="form-control" required>
            </div>

            <div class="form-group">
                <label class="form-label">Section Name</label>
                <input type="text" name="section_name" id="modalSectionName" class="form-control" required maxlength="10">
            </div>

            <div class="form-group">
                <label class="form-label">Status</label>
                <select name="is_active" id="modalIsActive" class="form-control">
                    <option value="1">ACTIVE</option>
                    <option value="0">INACTIVE</option>
                </select>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.25rem;">
                <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
        </form>
    </div>
</div>

<script>
function editClass(id, code, section, isActive) {
    document.getElementById('modalClassId').value = id;
    document.getElementById('modalClassCode').value = code;
    document.getElementById('modalSectionName').value = section;
    document.getElementById('modalIsActive').value = isActive;
    document.getElementById('editClassModal').style.display = 'flex';
}
function closeEditModal() {
    document.getElementById('editClassModal').style.display = 'none';
}
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
