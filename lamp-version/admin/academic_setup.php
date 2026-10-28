<?php
/**
 * Administrator - Academic Structure Management
 * Full Control: Academic Years, Departments, Specializations, Batches, Semesters, and Classes
 */

require_once __DIR__ . '/../includes/functions.php';
require_once __DIR__ . '/../includes/auth.php';
require_role(['ADMINISTRATION', 'ADMIN']);

$db = get_db();
$error = null;

// =========================================================================
// 1. POST ACTION HANDLERS
// =========================================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    $action = $_POST['action'];

    try {
        // --- CREATE ACADEMIC YEAR ---
        if ($action === 'create_academic_year') {
            $name       = trim($_POST['name'] ?? '');
            $start_date = $_POST['start_date'] ?? '';
            $end_date   = $_POST['end_date'] ?? '';
            $is_active  = isset($_POST['is_active']) ? 1 : 0;

            if (empty($name) || empty($start_date) || empty($end_date)) {
                throw new Exception("Academic Year name (e.g. 2026-2027), Start Date, and End Date are required.");
            }

            if ($is_active) {
                // If this is active, optionally keep or reset other active years
                $db->query("UPDATE academic_years SET is_active = 0");
            }

            $stmt = $db->prepare("INSERT INTO academic_years (name, start_date, end_date, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())");
            $stmt->execute([$name, $start_date, $end_date, $is_active]);
            set_flash('success', "Academic Year '{$name}' created successfully!");
            header('Location: ' . base_url('admin/academic_setup.php'));
            exit;
        }

        // Helper function for cascading class deletion
        $cascadeDeleteClass = function($classId) use ($db) {
            $db->prepare("DELETE al FROM attendance_audit_logs al JOIN attendance_records ar ON al.attendance_record_id = ar.id JOIN class_sessions cs ON ar.class_session_id = cs.id WHERE cs.class_id = ?")->execute([$classId]);
            $db->prepare("DELETE ar FROM attendance_records ar JOIN class_sessions cs ON ar.class_session_id = cs.id WHERE cs.class_id = ?")->execute([$classId]);
            $db->prepare("DELETE FROM class_sessions WHERE class_id = ?")->execute([$classId]);
            $db->prepare("DELETE FROM class_subjects WHERE class_id = ?")->execute([$classId]);
            $db->prepare("DELETE FROM student_enrollments WHERE class_id = ?")->execute([$classId]);
            $db->prepare("DELETE FROM classes WHERE id = ?")->execute([$classId]);
        };

        // --- DELETE ACADEMIC YEAR ---
        if ($action === 'delete_academic_year') {
            $id = (int)($_POST['id'] ?? 0);
            if ($id > 0) {
                $db->beginTransaction();

                // 1. Find all admission batches under this academic year
                $b_stmt = $db->prepare("SELECT id FROM admission_batches WHERE academic_year_id = ?");
                $b_stmt->execute([$id]);
                $batch_ids = $b_stmt->fetchAll(PDO::FETCH_COLUMN);

                // 2. Find all semesters under this academic year
                $s_stmt = $db->prepare("SELECT id FROM semesters WHERE academic_year_id = ?");
                $s_stmt->execute([$id]);
                $sem_ids = $s_stmt->fetchAll(PDO::FETCH_COLUMN);

                // 3. Find all classes linked to these batches or semesters
                $classesToDelete = [];
                if (!empty($batch_ids)) {
                    $inBatches = implode(',', array_map('intval', $batch_ids));
                    $cls_stmt = $db->query("SELECT id FROM classes WHERE admission_batch_id IN ($inBatches)");
                    $classesToDelete = array_merge($classesToDelete, $cls_stmt->fetchAll(PDO::FETCH_COLUMN));
                }
                if (!empty($sem_ids)) {
                    $inSems = implode(',', array_map('intval', $sem_ids));
                    $cls_stmt = $db->query("SELECT id FROM classes WHERE semester_id IN ($inSems)");
                    $classesToDelete = array_merge($classesToDelete, $cls_stmt->fetchAll(PDO::FETCH_COLUMN));
                }
                $classesToDelete = array_unique($classesToDelete);

                // Cascade delete all identified classes
                foreach ($classesToDelete as $clsId) {
                    $cascadeDeleteClass($clsId);
                }

                // 4. Remove HOD assignments for this academic year
                $db->prepare("DELETE FROM department_hod_assignments WHERE academic_year_id = ?")->execute([$id]);

                // 5. Delete admission batches
                $db->prepare("DELETE FROM admission_batches WHERE academic_year_id = ?")->execute([$id]);

                // 6. Delete semesters
                $db->prepare("DELETE FROM semesters WHERE academic_year_id = ?")->execute([$id]);

                // 7. Delete academic year
                $db->prepare("DELETE FROM academic_years WHERE id = ?")->execute([$id]);

                $db->commit();
                set_flash('success', "Academic Year and all associated semesters, batches, and classes deleted successfully.");
            }
            header('Location: ' . base_url('admin/academic_setup.php'));
            exit;
        }

        // --- CREATE DEPARTMENT ---
        if ($action === 'create_department') {
            $code = strtoupper(trim($_POST['code'] ?? ''));
            $name = trim($_POST['name'] ?? '');
            $desc = trim($_POST['description'] ?? '');

            if (empty($code) || empty($name)) {
                throw new Exception("Department Code (e.g. MECH) and Full Department Name are required.");
            }

            $chk = $db->prepare("SELECT id FROM departments WHERE code = ?");
            $chk->execute([$code]);
            if ($chk->fetch()) {
                throw new Exception("Department Code '{$code}' already exists.");
            }

            $stmt = $db->prepare("INSERT INTO departments (code, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, NOW(), NOW())");
            $stmt->execute([$code, $name, $desc ?: null]);
            set_flash('success', "Department '{$code} - {$name}' created successfully!");
            header('Location: ' . base_url('admin/academic_setup.php#tab-departments'));
            exit;
        }

        // --- DELETE DEPARTMENT ---
        if ($action === 'delete_department') {
            $id = (int)($_POST['id'] ?? 0);
            if ($id > 0) {
                $db->beginTransaction();

                // 1. Delete HOD assignments
                $db->prepare("DELETE FROM department_hod_assignments WHERE department_id = ?")->execute([$id]);

                // 2. Batches under this department
                $b_stmt = $db->prepare("SELECT id FROM admission_batches WHERE department_id = ?");
                $b_stmt->execute([$id]);
                $dept_batches = $b_stmt->fetchAll(PDO::FETCH_COLUMN);

                if (!empty($dept_batches)) {
                    $inBatches = implode(',', array_map('intval', $dept_batches));
                    $cls_stmt = $db->query("SELECT id FROM classes WHERE admission_batch_id IN ($inBatches)");
                    $classesToDelete = $cls_stmt->fetchAll(PDO::FETCH_COLUMN);
                    foreach ($classesToDelete as $clsId) {
                        $cascadeDeleteClass($clsId);
                    }
                    $db->query("DELETE FROM admission_batches WHERE id IN ($inBatches)");
                }

                // 3. Delete specializations
                $db->prepare("DELETE FROM specializations WHERE department_id = ?")->execute([$id]);

                // 4. Nullify or reassign teachers attached to this department
                $db->prepare("UPDATE teachers SET department_id = NULL WHERE department_id = ?")->execute([$id]);

                // 5. Delete department
                $db->prepare("DELETE FROM departments WHERE id = ?")->execute([$id]);

                $db->commit();
                set_flash('success', "Department deleted successfully.");
            }
            header('Location: ' . base_url('admin/academic_setup.php#tab-departments'));
            exit;
        }

        // --- CREATE SPECIALIZATION ---
        if ($action === 'create_specialization') {
            $department_id = (int)($_POST['department_id'] ?? 0);
            $code          = strtoupper(trim($_POST['code'] ?? ''));
            $name          = trim($_POST['name'] ?? '');

            if ($department_id <= 0 || empty($code) || empty($name)) {
                throw new Exception("Department, Specialization Code (e.g. DS), and Specialization Name are required.");
            }

            $stmt = $db->prepare("INSERT INTO specializations (department_id, code, name, created_at) VALUES (?, ?, ?, NOW())");
            $stmt->execute([$department_id, $code, $name]);
            set_flash('success', "Specialization '{$code}: {$name}' created successfully!");
            header('Location: ' . base_url('admin/academic_setup.php#tab-specializations'));
            exit;
        }

        // --- DELETE SPECIALIZATION ---
        if ($action === 'delete_specialization') {
            $id = (int)($_POST['id'] ?? 0);
            if ($id > 0) {
                $db->beginTransaction();
                // Batches referencing this specialization: set specialization_id to NULL
                $db->prepare("UPDATE admission_batches SET specialization_id = NULL WHERE specialization_id = ?")->execute([$id]);
                $db->prepare("DELETE FROM specializations WHERE id = ?")->execute([$id]);
                $db->commit();
                set_flash('success', "Specialization deleted successfully.");
            }
            header('Location: ' . base_url('admin/academic_setup.php#tab-specializations'));
            exit;
        }

        // --- CREATE SEMESTER ---
        if ($action === 'create_semester') {
            $academic_year_id = (int)($_POST['academic_year_id'] ?? 0);
            $semester_number  = (int)($_POST['semester_number'] ?? 0);
            $name             = trim($_POST['name'] ?? '');
            $start_date       = $_POST['start_date'] ?? '';
            $end_date         = $_POST['end_date'] ?? '';

            if ($academic_year_id <= 0 || $semester_number <= 0 || empty($name)) {
                throw new Exception("Academic Year, Semester Number (1-8), and Semester Name (e.g. Semester 5) are required.");
            }

            $stmt = $db->prepare("INSERT INTO semesters (academic_year_id, semester_number, name, start_date, end_date, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
            $stmt->execute([$academic_year_id, $semester_number, $name, $start_date, $end_date]);
            set_flash('success', "Semester '{$name}' created successfully!");
            header('Location: ' . base_url('admin/academic_setup.php#tab-semesters'));
            exit;
        }

        // --- DELETE SEMESTER ---
        if ($action === 'delete_semester') {
            $id = (int)($_POST['id'] ?? 0);
            if ($id > 0) {
                $db->beginTransaction();
                // Find all classes under this semester
                $cls_stmt = $db->prepare("SELECT id FROM classes WHERE semester_id = ?");
                $cls_stmt->execute([$id]);
                $classesToDelete = $cls_stmt->fetchAll(PDO::FETCH_COLUMN);
                foreach ($classesToDelete as $clsId) {
                    $cascadeDeleteClass($clsId);
                }
                $db->prepare("DELETE FROM semesters WHERE id = ?")->execute([$id]);
                $db->commit();
                set_flash('success', "Semester and associated classes deleted successfully.");
            }
            header('Location: ' . base_url('admin/academic_setup.php#tab-semesters'));
            exit;
        }

        // --- CREATE ADMISSION BATCH & SPECIALIZED CLASS ---
        if ($action === 'create_batch') {
            $academic_year_id  = (int)($_POST['academic_year_id'] ?? 0);
            $department_id     = (int)($_POST['department_id'] ?? 0);
            $specialization_id = !empty($_POST['specialization_id']) ? (int)$_POST['specialization_id'] : null;
            $batch_name        = trim($_POST['batch_name'] ?? '');
            $admission_year    = (int)($_POST['admission_year'] ?? date('Y'));

            if ($academic_year_id <= 0 || $department_id <= 0 || empty($batch_name)) {
                throw new Exception("Academic Year, Department, and Batch Name (e.g. CSE 2026-2030) are required.");
            }

            $stmt = $db->prepare("INSERT INTO admission_batches (academic_year_id, department_id, specialization_id, batch_name, admission_year, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
            $stmt->execute([$academic_year_id, $department_id, $specialization_id, $batch_name, $admission_year]);
            set_flash('success', "Admission Batch '{$batch_name}' configured successfully!");
            header('Location: ' . base_url('admin/academic_setup.php#tab-batches'));
            exit;
        }

        // --- DELETE BATCH ---
        if ($action === 'delete_batch') {
            $id = (int)($_POST['id'] ?? 0);
            if ($id > 0) {
                $db->beginTransaction();
                // Find classes under this batch
                $cls_stmt = $db->prepare("SELECT id FROM classes WHERE admission_batch_id = ?");
                $cls_stmt->execute([$id]);
                $classesToDelete = $cls_stmt->fetchAll(PDO::FETCH_COLUMN);
                foreach ($classesToDelete as $clsId) {
                    $cascadeDeleteClass($clsId);
                }
                $db->prepare("DELETE FROM admission_batches WHERE id = ?")->execute([$id]);
                $db->commit();
                set_flash('success', "Batch and associated classes deleted successfully.");
            }
            header('Location: ' . base_url('admin/academic_setup.php#tab-batches'));
            exit;
        }

        // --- CREATE CLASS SECTION ---
        if ($action === 'create_class') {
            $admission_batch_id = !empty($_POST['admission_batch_id']) ? (int)$_POST['admission_batch_id'] : 0;
            $semester_id        = !empty($_POST['semester_id']) ? (int)$_POST['semester_id'] : 0;
            $section_name       = strtoupper(trim($_POST['section_name'] ?? ''));
            $class_code         = trim($_POST['class_code'] ?? '');

            if ($admission_batch_id <= 0 || $semester_id <= 0 || empty($section_name)) {
                throw new Exception("Please select a batch, a semester, and specify a section name (e.g. A, B, Sec-1).");
            }

            $chk = $db->prepare("SELECT id FROM classes WHERE admission_batch_id = ? AND semester_id = ? AND section_name = ?");
            $chk->execute([$admission_batch_id, $semester_id, $section_name]);
            if ($chk->fetch()) {
                throw new Exception("Class section '{$section_name}' already exists for this Batch and Semester.");
            }

            if (!empty($class_code)) {
                $chk_code = $db->prepare("SELECT id FROM classes WHERE class_code = ?");
                $chk_code->execute([$class_code]);
                if ($chk_code->fetch()) {
                    throw new Exception("Class Code '{$class_code}' is already taken.");
                }
            } else {
                $class_code = "CLS-" . time();
            }

            $stmt = $db->prepare("INSERT INTO classes (admission_batch_id, semester_id, section_name, class_code, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, NOW(), NOW())");
            $stmt->execute([$admission_batch_id, $semester_id, $section_name, $class_code]);
            set_flash('success', "Class section '{$class_code}' (Sec {$section_name}) created successfully!");
            header('Location: ' . base_url('admin/academic_setup.php#tab-classes'));
            exit;
        }

        // --- DELETE CLASS SECTION ---
        if ($action === 'delete_class') {
            $id = (int)($_POST['id'] ?? 0);
            if ($id > 0) {
                $db->beginTransaction();
                $cascadeDeleteClass($id);
                $db->commit();
                set_flash('success', "Class section deleted successfully.");
            }
            header('Location: ' . base_url('admin/academic_setup.php#tab-classes'));
            exit;
        }

    } catch (Exception $e) {
        $error = $e->getMessage();
    }
}

// =========================================================================
// 2. FETCH ACADEMIC STRUCTURE DATA
// =========================================================================
$academic_years = $db->query("
    SELECT ay.*, 
           (SELECT COUNT(*) FROM admission_batches ab WHERE ab.academic_year_id = ay.id) AS batches_count,
           (SELECT COUNT(*) FROM semesters s WHERE s.academic_year_id = ay.id) AS semesters_count
    FROM academic_years ay 
    ORDER BY ay.start_date DESC
")->fetchAll();

$departments = $db->query("
    SELECT d.*,
           (SELECT COUNT(*) FROM specializations sp WHERE sp.department_id = d.id) AS spec_count,
           (SELECT COUNT(*) FROM admission_batches ab WHERE ab.department_id = d.id) AS batch_count
    FROM departments d
    ORDER BY d.code ASC
")->fetchAll();

$specializations = $db->query("
    SELECT sp.*, d.name AS dept_name, d.code AS dept_code
    FROM specializations sp
    JOIN departments d ON sp.department_id = d.id
    ORDER BY d.code ASC, sp.code ASC
")->fetchAll();

$semesters = $db->query("
    SELECT s.*, ay.name AS academic_year_name
    FROM semesters s
    JOIN academic_years ay ON s.academic_year_id = ay.id
    ORDER BY ay.start_date DESC, s.semester_number ASC
")->fetchAll();

$batches = $db->query("
    SELECT b.*, ay.name AS academic_year_name, d.code AS dept_code, d.name AS dept_name,
           sp.name AS spec_name, sp.code AS spec_code,
           (SELECT COUNT(*) FROM classes c WHERE c.admission_batch_id = b.id) AS classes_count
    FROM admission_batches b
    JOIN academic_years ay ON b.academic_year_id = ay.id
    JOIN departments d ON b.department_id = d.id
    LEFT JOIN specializations sp ON b.specialization_id = sp.id
    ORDER BY b.admission_year DESC, d.code ASC
")->fetchAll();

$classes_list = $db->query("
    SELECT 
        c.id, c.section_name, c.class_code, c.is_active, c.created_at,
        b.batch_name, d.name AS dept_name, d.code AS dept_code,
        sem.name AS semester_name, sem.semester_number,
        (SELECT COUNT(*) FROM student_enrollments se WHERE se.class_id = c.id AND se.status = 'ACTIVE') AS student_count
    FROM classes c
    JOIN admission_batches b ON c.admission_batch_id = b.id
    JOIN departments d ON b.department_id = d.id
    JOIN semesters sem ON c.semester_id = sem.id
    ORDER BY d.code ASC, b.batch_name ASC, sem.semester_number ASC, c.section_name ASC
")->fetchAll();

$page_title = 'Academic Structure & Curriculum Setup';
require_once __DIR__ . '/../includes/header.php';
?>

<div class="stitch-hero">
    <div>
        <div class="hero-meta">
            <span class="status-pulse-dot"></span>
            <span>ACADEMIC INFRASTRUCTURE</span>
            <span>•</span>
            <span class="hero-telemetry-tag">CURRICULUM SETUP</span>
        </div>
        <h1 class="hero-title">Academic Structure & Cohort Setup</h1>
        <p class="hero-subtitle">
            Configure new Academic Years, Departments, Specialized Classes, Semesters, and Admission Batches
        </p>
    </div>

    <div class="hero-actions">
        <a href="<?= base_url('admin/classes.php') ?>" class="btn btn-secondary">
            <span class="material-symbols-outlined">calendar_month</span> Manage Class Sections
        </a>
    </div>
</div>

<?php if ($error): ?>
    <div class="alert alert-error">
        <div><?= e($error) ?></div>
    </div>
<?php endif; ?>

<!-- Tabs Navigation -->
<div style="display: flex; gap: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 1.5rem; overflow-x: auto; padding-bottom: 0.25rem;">
    <button type="button" class="btn btn-secondary btn-tab active" onclick="showTab('tab-years')">
        📅 Academic Years (<?= count($academic_years) ?>)
    </button>
    <button type="button" class="btn btn-secondary btn-tab" onclick="showTab('tab-departments')">
        🏛️ Departments (<?= count($departments) ?>)
    </button>
    <button type="button" class="btn btn-secondary btn-tab" onclick="showTab('tab-specializations')">
        🎯 Specialized Classes / Branches (<?= count($specializations) ?>)
    </button>
    <button type="button" class="btn btn-secondary btn-tab" onclick="showTab('tab-semesters')">
        🗓️ Semesters (<?= count($semesters) ?>)
    </button>
    <button type="button" class="btn btn-secondary btn-tab" onclick="showTab('tab-batches')">
        👥 Batches & Cohorts (<?= count($batches) ?>)
    </button>
    <button type="button" class="btn btn-secondary btn-tab" onclick="showTab('tab-classes')">
        🏫 Classes & Sections (<?= count($classes_list) ?>)
    </button>
</div>

<!-- ========================================================================= -->
<!-- TAB 1: ACADEMIC YEARS -->
<!-- ========================================================================= -->
<div id="tab-years" class="tab-content" style="display: block;">
    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; align-items: start;">
        <!-- Add Academic Year Form -->
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">+ New Academic Year</h2>
            </div>
            <form method="POST" action="<?= base_url('admin/academic_setup.php') ?>">
                <input type="hidden" name="action" value="create_academic_year">
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label">Academic Year Name <span class="required">*</span></label>
                        <input type="text" name="name" class="form-control" required placeholder="e.g. 2026-2027">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Start Date <span class="required">*</span></label>
                        <input type="date" name="start_date" class="form-control" required value="<?= date('Y') ?>-07-01">
                    </div>
                    <div class="form-group">
                        <label class="form-label">End Date <span class="required">*</span></label>
                        <input type="date" name="end_date" class="form-control" required value="<?= (date('Y') + 1) ?>-06-30">
                    </div>
                    <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" name="is_active" id="year_active" value="1" checked>
                        <label for="year_active" style="font-size: 0.85rem; color: var(--on-surface); cursor: pointer;">Set as Currently Active Academic Year</label>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">Create Academic Year &rarr;</button>
                </div>
            </form>
        </div>

        <!-- Academic Years Table -->
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Configured Academic Years</h2>
            </div>
            <div class="card-body" style="padding: 0;">
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Academic Year</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Batches / Semesters</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($academic_years as $ay): ?>
                                <tr>
                                    <td><strong><?= e($ay['name']) ?></strong></td>
                                    <td><?= e($ay['start_date']) ?></td>
                                    <td><?= e($ay['end_date']) ?></td>
                                    <td>
                                        <span class="badge badge-info"><?= $ay['batches_count'] ?> Batches</span>
                                        <span class="badge badge-secondary"><?= $ay['semesters_count'] ?> Sems</span>
                                    </td>
                                    <td>
                                        <span class="badge <?= $ay['is_active'] ? 'badge-success' : 'badge-secondary' ?>">
                                            <?= $ay['is_active'] ? 'ACTIVE' : 'INACTIVE' ?>
                                        </span>
                                    </td>
                                    <td>
                                        <form method="POST" action="<?= base_url('admin/academic_setup.php') ?>" onsubmit="return confirm('⚠️ Delete Academic Year <?= addslashes($ay['name']) ?>?');" style="margin: 0;">
                                            <input type="hidden" name="action" value="delete_academic_year">
                                            <input type="hidden" name="id" value="<?= (int)$ay['id'] ?>">
                                            <button type="submit" class="btn btn-danger btn-sm">🗑️ Delete</button>
                                        </form>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- ========================================================================= -->
<!-- TAB 2: DEPARTMENTS -->
<!-- ========================================================================= -->
<div id="tab-departments" class="tab-content" style="display: none;">
    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; align-items: start;">
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">+ New Academic Department</h2>
            </div>
            <form method="POST" action="<?= base_url('admin/academic_setup.php') ?>">
                <input type="hidden" name="action" value="create_department">
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label">Department Code <span class="required">*</span></label>
                        <input type="text" name="code" class="form-control" required placeholder="e.g. MECH, AI, CIVIL">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Department Full Name <span class="required">*</span></label>
                        <input type="text" name="name" class="form-control" required placeholder="e.g. Mechanical Engineering">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Description (Optional)</label>
                        <textarea name="description" class="form-control" rows="2" placeholder="Academic department description..."></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">Create Department &rarr;</button>
                </div>
            </form>
        </div>

        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Existing Departments</h2>
            </div>
            <div class="card-body" style="padding: 0;">
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Department Name</th>
                                <th>Specializations</th>
                                <th>Batches</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($departments as $d): ?>
                                <tr>
                                    <td><strong><?= e($d['code']) ?></strong></td>
                                    <td>
                                        <strong><?= e($d['name']) ?></strong>
                                        <?php if ($d['description']): ?>
                                            <div style="font-size: 0.75rem; color: var(--outline);"><?= e($d['description']) ?></div>
                                        <?php endif; ?>
                                    </td>
                                    <td><span class="badge badge-info"><?= $d['spec_count'] ?> Specialized</span></td>
                                    <td><span class="badge badge-secondary"><?= $d['batch_count'] ?> Batches</span></td>
                                    <td>
                                        <form method="POST" action="<?= base_url('admin/academic_setup.php') ?>" onsubmit="return confirm('⚠️ Delete Department <?= addslashes($d['code']) ?> and all its specializations?');" style="margin: 0;">
                                            <input type="hidden" name="action" value="delete_department">
                                            <input type="hidden" name="id" value="<?= (int)$d['id'] ?>">
                                            <button type="submit" class="btn btn-danger btn-sm">🗑️ Delete</button>
                                        </form>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- ========================================================================= -->
<!-- TAB 3: SPECIALIZED CLASSES & BRANCHES -->
<!-- ========================================================================= -->
<div id="tab-specializations" class="tab-content" style="display: none;">
    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; align-items: start;">
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">+ New Specialized Branch / Class</h2>
            </div>
            <form method="POST" action="<?= base_url('admin/academic_setup.php') ?>">
                <input type="hidden" name="action" value="create_specialization">
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label">Parent Department <span class="required">*</span></label>
                        <select name="department_id" class="form-control" required>
                            <option value="">-- Select Department --</option>
                            <?php foreach ($departments as $dept): ?>
                                <option value="<?= $dept['id'] ?>"><?= e($dept['name']) ?> (<?= e($dept['code']) ?>)</option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Specialization Code <span class="required">*</span></label>
                        <input type="text" name="code" class="form-control" required placeholder="e.g. AIML, DS, CS, ROBOTICS">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Specialization Name <span class="required">*</span></label>
                        <input type="text" name="name" class="form-control" required placeholder="e.g. Artificial Intelligence & Machine Learning">
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">Create Specialized Branch &rarr;</button>
                </div>
            </form>
        </div>

        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Specialized Curriculum Tracks</h2>
            </div>
            <div class="card-body" style="padding: 0;">
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Spec Code</th>
                                <th>Specialization Name</th>
                                <th>Parent Department</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($specializations)): ?>
                                <tr><td colspan="4" style="text-align: center; color: var(--outline); padding: 2rem;">No specializations configured yet.</td></tr>
                            <?php else: ?>
                                <?php foreach ($specializations as $sp): ?>
                                    <tr>
                                        <td><strong><?= e($sp['code']) ?></strong></td>
                                        <td><strong><?= e($sp['name']) ?></strong></td>
                                        <td><span class="badge badge-info"><?= e($sp['dept_code']) ?></span> <?= e($sp['dept_name']) ?></td>
                                        <td>
                                            <form method="POST" action="<?= base_url('admin/academic_setup.php') ?>" onsubmit="return confirm('⚠️ Delete Specialization <?= addslashes($sp['name']) ?>?');" style="margin: 0;">
                                                <input type="hidden" name="action" value="delete_specialization">
                                                <input type="hidden" name="id" value="<?= (int)$sp['id'] ?>">
                                                <button type="submit" class="btn btn-danger btn-sm">🗑️ Delete</button>
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
</div>

<!-- ========================================================================= -->
<!-- TAB 4: SEMESTERS -->
<!-- ========================================================================= -->
<div id="tab-semesters" class="tab-content" style="display: none;">
    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; align-items: start;">
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">+ New Semester</h2>
            </div>
            <form method="POST" action="<?= base_url('admin/academic_setup.php') ?>">
                <input type="hidden" name="action" value="create_semester">
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label">Academic Year <span class="required">*</span></label>
                        <select name="academic_year_id" class="form-control" required>
                            <?php foreach ($academic_years as $ay): ?>
                                <option value="<?= $ay['id'] ?>" <?= $ay['is_active'] ? 'selected' : '' ?>>
                                    <?= e($ay['name']) ?> <?= $ay['is_active'] ? '(Active)' : '' ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Semester Number (1 to 8) <span class="required">*</span></label>
                        <input type="number" name="semester_number" class="form-control" min="1" max="10" required placeholder="e.g. 5">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Semester Name <span class="required">*</span></label>
                        <input type="text" name="name" class="form-control" required placeholder="e.g. Semester 5">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Semester Start Date</label>
                        <input type="date" name="start_date" class="form-control" value="<?= date('Y-m-d') ?>">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Semester End Date</label>
                        <input type="date" name="end_date" class="form-control" value="<?= date('Y-m-d', strtotime('+5 months')) ?>">
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">Create Semester &rarr;</button>
                </div>
            </form>
        </div>

        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Active & Scheduled Semesters</h2>
            </div>
            <div class="card-body" style="padding: 0;">
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Academic Year</th>
                                <th>Sem #</th>
                                <th>Semester Name</th>
                                <th>Duration</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($semesters as $sm): ?>
                                <tr>
                                    <td><span class="badge badge-info"><?= e($sm['academic_year_name']) ?></span></td>
                                    <td><strong>Sem <?= $sm['semester_number'] ?></strong></td>
                                    <td><strong><?= e($sm['name']) ?></strong></td>
                                    <td><?= e($sm['start_date']) ?> to <?= e($sm['end_date']) ?></td>
                                    <td>
                                        <form method="POST" action="<?= base_url('admin/academic_setup.php') ?>" onsubmit="return confirm('⚠️ Delete Semester <?= addslashes($sm['name']) ?>?');" style="margin: 0;">
                                            <input type="hidden" name="action" value="delete_semester">
                                            <input type="hidden" name="id" value="<?= (int)$sm['id'] ?>">
                                            <button type="submit" class="btn btn-danger btn-sm">🗑️ Delete</button>
                                        </form>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- ========================================================================= -->
<!-- TAB 5: BATCHES & SPECIALIZED COHORTS -->
<!-- ========================================================================= -->
<div id="tab-batches" class="tab-content" style="display: none;">
    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; align-items: start;">
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">+ New Cohort Batch</h2>
            </div>
            <form method="POST" action="<?= base_url('admin/academic_setup.php') ?>">
                <input type="hidden" name="action" value="create_batch">
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label">Academic Year <span class="required">*</span></label>
                        <select name="academic_year_id" class="form-control" required>
                            <?php foreach ($academic_years as $ay): ?>
                                <option value="<?= $ay['id'] ?>" <?= $ay['is_active'] ? 'selected' : '' ?>>
                                    <?= e($ay['name']) ?> <?= $ay['is_active'] ? '(Active)' : '' ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Department <span class="required">*</span></label>
                        <select name="department_id" class="form-control" required>
                            <option value="">-- Select Department --</option>
                            <?php foreach ($departments as $dept): ?>
                                <option value="<?= $dept['id'] ?>"><?= e($dept['name']) ?> (<?= e($dept['code']) ?>)</option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Specialization (Optional for Core Classes)</label>
                        <select name="specialization_id" class="form-control">
                            <option value="">-- General / Core (No Specialization) --</option>
                            <?php foreach ($specializations as $sp): ?>
                                <option value="<?= $sp['id'] ?>">
                                    [<?= e($sp['dept_code']) ?>] <?= e($sp['name']) ?> (<?= e($sp['code']) ?>)
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Admission Year <span class="required">*</span></label>
                        <input type="number" name="admission_year" class="form-control" min="2020" max="2040" required value="<?= date('Y') ?>">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Batch Name <span class="required">*</span></label>
                        <input type="text" name="batch_name" class="form-control" required placeholder="e.g. CSE-AIML Batch 2026-2030">
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">Create Batch &rarr;</button>
                </div>
            </form>
        </div>

        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Configured Cohort Batches</h2>
            </div>
            <div class="card-body" style="padding: 0;">
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Batch Name</th>
                                <th>Department</th>
                                <th>Specialization</th>
                                <th>Academic Year</th>
                                <th>Classes</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($batches as $b): ?>
                                <tr>
                                    <td><strong><?= e($b['batch_name']) ?></strong></td>
                                    <td><span class="badge badge-info"><?= e($b['dept_code']) ?></span></td>
                                    <td>
                                        <?php if ($b['spec_name']): ?>
                                            <span class="badge badge-primary">🎯 <?= e($b['spec_code']) ?></span> <?= e($b['spec_name']) ?>
                                        <?php else: ?>
                                            <span class="badge badge-secondary">Core / General</span>
                                        <?php endif; ?>
                                    </td>
                                    <td><?= e($b['academic_year_name']) ?></td>
                                    <td><span class="badge badge-secondary"><?= $b['classes_count'] ?> sections</span></td>
                                    <td>
                                        <form method="POST" action="<?= base_url('admin/academic_setup.php') ?>" onsubmit="return confirm('⚠️ Delete Batch <?= addslashes($b['batch_name']) ?>?');" style="margin: 0;">
                                            <input type="hidden" name="action" value="delete_batch">
                                            <input type="hidden" name="id" value="<?= (int)$b['id'] ?>">
                                            <button type="submit" class="btn btn-danger btn-sm">🗑️ Delete</button>
                                        </form>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- ========================================================================= -->
<!-- TAB 6: CLASSES & SECTIONS -->
<!-- ========================================================================= -->
<div id="tab-classes" class="tab-content" style="display: none;">
    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; align-items: start;">
        <!-- Add Class Form -->
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">+ New Class Section</h2>
            </div>
            <form method="POST" action="<?= base_url('admin/academic_setup.php') ?>">
                <input type="hidden" name="action" value="create_class">
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label">Select Cohort Batch <span class="required">*</span></label>
                        <select name="admission_batch_id" class="form-control" required>
                            <option value="">-- Choose Batch --</option>
                            <?php foreach ($batches as $b): ?>
                                <option value="<?= $b['id'] ?>">
                                    [<?= e($b['dept_code']) ?>] <?= e($b['batch_name']) ?> (<?= e($b['academic_year_name']) ?>)
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Select Current Semester <span class="required">*</span></label>
                        <select name="semester_id" class="form-control" required>
                            <option value="">-- Choose Semester --</option>
                            <?php foreach ($semesters as $s): ?>
                                <option value="<?= $s['id'] ?>">
                                    <?= e($s['name']) ?> (Sem <?= (int)$s['semester_number'] ?>) - <?= e($s['academic_year_name']) ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Section Name <span class="required">*</span></label>
                        <input type="text" name="section_name" class="form-control" placeholder="e.g. A, B, Alpha" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Class Code (Optional)</label>
                        <input type="text" name="class_code" class="form-control" placeholder="e.g. CSE-2026-A (Auto-generated if empty)">
                    </div>

                    <button type="submit" class="btn btn-primary" style="width: 100%;">Create Class &rarr;</button>
                </div>
            </form>
        </div>

        <!-- Class List Table -->
        <div class="card">
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                <h2 class="card-title">Configured Classes & Sections</h2>
                <a href="<?= base_url('admin/classes.php') ?>" class="btn btn-secondary btn-sm">Full Class Manager &rarr;</a>
            </div>
            <div class="card-body" style="padding: 0;">
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Class Code</th>
                                <th>Batch / Dept</th>
                                <th>Semester</th>
                                <th>Section</th>
                                <th>Students</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($classes_list)): ?>
                                <tr>
                                    <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                                        No class sections created yet. Use the form on the left to create your first class (e.g. Section A).
                                    </td>
                                </tr>
                            <?php else: ?>
                                <?php foreach ($classes_list as $cls): ?>
                                    <tr>
                                        <td><strong><?= e($cls['class_code']) ?></strong></td>
                                        <td>
                                            <span class="badge badge-info"><?= e($cls['dept_code']) ?></span>
                                            <span style="font-size: 0.82rem; margin-left: 0.25rem;"><?= e($cls['batch_name']) ?></span>
                                        </td>
                                        <td><?= e($cls['semester_name']) ?></td>
                                        <td><span class="badge badge-primary">Sec <?= e($cls['section_name']) ?></span></td>
                                        <td><?= (int)$cls['student_count'] ?> active</td>
                                        <td>
                                            <form method="POST" action="<?= base_url('admin/academic_setup.php') ?>" onsubmit="return confirm('⚠️ Delete Class Section <?= addslashes($cls['class_code']) ?>?');" style="margin: 0;">
                                                <input type="hidden" name="action" value="delete_class">
                                                <input type="hidden" name="id" value="<?= (int)$cls['id'] ?>">
                                                <button type="submit" class="btn btn-danger btn-sm">🗑️ Delete</button>
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
</div>

<script>
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    document.querySelectorAll('.btn-tab').forEach(btn => btn.classList.remove('active'));
    
    const target = document.getElementById(tabId);
    if (target) {
        target.style.display = 'block';
    }

    event?.currentTarget?.classList?.add('active');
    window.location.hash = tabId;
}

// Auto open tab from URL hash if provided
document.addEventListener('DOMContentLoaded', function() {
    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(hash)) {
        showTab(hash);
    }
});
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
