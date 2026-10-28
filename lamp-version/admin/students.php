<?php
/**
 * Administrator - Student Management
 */

$page_title = 'Student Management';
require_once __DIR__ . '/../includes/header.php';
require_role(['ADMINISTRATION', 'ADMIN']);

$db = get_db();

// 1. Fetch available classes for filtering
$classes_stmt = $db->query("
    SELECT c.id, c.class_code, c.section_name, b.batch_name, sem.name AS semester_name
    FROM classes c
    JOIN admission_batches b ON c.admission_batch_id = b.id
    JOIN semesters sem ON c.semester_id = sem.id
    WHERE c.is_active = 1
    ORDER BY b.batch_name ASC, sem.semester_number ASC, c.section_name ASC
");
$classes = $classes_stmt->fetchAll();

// 2. Filter logic
$selected_class_id = isset($_GET['class_id']) && is_numeric($_GET['class_id']) ? (int)$_GET['class_id'] : 0;
$search_query = trim($_GET['search'] ?? '');

$sql = "
    SELECT 
        s.id, s.user_id, s.student_id, s.admission_number, s.first_name, s.last_name, 
        s.date_of_birth, s.status, s.joined_at,
        u.username, u.email, u.phone,
        se.class_id, c.class_code, c.section_name, b.batch_name, sem.name AS semester_name,
        (SELECT COUNT(*) FROM attendance_records WHERE student_id = s.id) AS total_sessions,
        (SELECT COUNT(*) FROM attendance_records WHERE student_id = s.id AND status = 'PRESENT') AS present_sessions
    FROM students s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.status = 'ACTIVE'
    LEFT JOIN classes c ON se.class_id = c.id
    LEFT JOIN admission_batches b ON c.admission_batch_id = b.id
    LEFT JOIN semesters sem ON c.semester_id = sem.id
    WHERE 1=1
";
$params = [];

if ($selected_class_id > 0) {
    $sql .= " AND se.class_id = ?";
    $params[] = $selected_class_id;
}

if ($search_query !== '') {
    $sql .= " AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.student_id LIKE ? OR s.admission_number LIKE ? OR u.email LIKE ?)";
    $like = "%{$search_query}%";
    $params = array_merge($params, [$like, $like, $like, $like, $like]);
}

$sql .= " ORDER BY CAST(s.student_id AS UNSIGNED) ASC, s.student_id ASC";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$students = $stmt->fetchAll();
?>

<div class="page-header">
    <div>
        <h1 class="page-title">Student Records Management</h1>
        <p class="page-subtitle">View, search, register, and update student profiles and class assignments</p>
    </div>
    <div>
        <a href="<?= base_url('admin/student_add.php') ?>" class="btn btn-primary">+ Add New Student</a>
    </div>
</div>

<!-- Search & Filter Controls -->
<div class="card" style="margin-bottom: 1.5rem;">
    <div class="card-body" style="padding: 1.25rem;">
        <form method="GET" action="<?= base_url('admin/students.php') ?>" style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end;">
            <div style="flex: 2; min-width: 250px;">
                <label class="form-label">Search Students</label>
                <input type="text" name="search" class="form-control" placeholder="Search by name, roll no, admission no..." value="<?= e($search_query) ?>">
            </div>

            <div style="flex: 1; min-width: 200px;">
                <label class="form-label">Filter by Class</label>
                <select name="class_id" class="form-control" onchange="this.form.submit()">
                    <option value="0">All Classes</option>
                    <?php foreach ($classes as $cls): ?>
                        <option value="<?= $cls['id'] ?>" <?= $selected_class_id === (int)$cls['id'] ? 'selected' : '' ?>>
                            <?= e($cls['class_code'] ?: "{$cls['batch_name']} - {$cls['semester_name']} Sec {$cls['section_name']}") ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div style="display: flex; gap: 0.5rem;">
                <button type="submit" class="btn btn-primary">Filter</button>
                <?php if ($selected_class_id > 0 || $search_query !== ''): ?>
                    <a href="<?= base_url('admin/students.php') ?>" class="btn btn-secondary">Reset</a>
                <?php endif; ?>
            </div>
        </form>
    </div>
</div>

<!-- Student List Table -->
<div class="card">
    <div class="card-header">
        <h2 class="card-title">Enrolled Students (<?= count($students) ?> found)</h2>
    </div>
    <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Roll No / ID</th>
                        <th>Admission No</th>
                        <th>Student Name</th>
                        <th>Class Assigned</th>
                        <th>Email / Contact</th>
                        <th>Attendance %</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($students)): ?>
                        <tr>
                            <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                                No students match the selected criteria.
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($students as $stu): ?>
                            <?php 
                                $tot = (int)$stu['total_sessions'];
                                $prs = (int)$stu['present_sessions'];
                                $pct = $tot > 0 ? round(($prs / $tot) * 100, 1) : null;
                            ?>
                            <tr>
                                <td><strong><?= e($stu['student_id']) ?></strong></td>
                                <td><code><?= e($stu['admission_number'] ?: '—') ?></code></td>
                                <td>
                                    <strong><?= e($stu['first_name'] . ' ' . ($stu['last_name'] ?? '')) ?></strong>
                                    <div style="font-size: 0.75rem; color: var(--text-muted);">User: @<?= e($stu['username']) ?></div>
                                </td>
                                <td>
                                    <?php if ($stu['class_id']): ?>
                                        <span class="badge badge-info">
                                            <?= e($stu['class_code'] ?: "{$stu['semester_name']} - Sec {$stu['section_name']}") ?>
                                        </span>
                                    <?php else: ?>
                                        <span class="badge badge-secondary">Unassigned</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <div><?= e($stu['email'] ?: '—') ?></div>
                                    <?php if ($stu['phone']): ?>
                                        <div style="font-size: 0.75rem; color: var(--text-muted);"><?= e($stu['phone']) ?></div>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?php if ($pct !== null): ?>
                                        <span class="badge <?= $pct >= 75 ? 'badge-success' : 'badge-danger' ?>">
                                            <?= $pct ?>% (<?= $prs ?>/<?= $tot ?>)
                                        </span>
                                    <?php else: ?>
                                        <span class="badge badge-secondary">No Sessions</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <span class="badge <?= $stu['status'] === 'ACTIVE' ? 'badge-success' : 'badge-secondary' ?>">
                                        <?= e($stu['status']) ?>
                                    </span>
                                </td>
                                <td>
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <a href="<?= base_url('admin/student_edit.php?id=' . $stu['id']) ?>" class="btn btn-secondary btn-sm">
                                            ✏️ Edit
                                        </a>
                                        <form method="POST" action="<?= base_url('admin/student_delete.php') ?>" onsubmit="return confirm('⚠️ Are you sure you want to PERMANENTLY delete student <?= addslashes($stu['first_name'] . ' ' . ($stu['last_name'] ?? '')) ?> (<?= addslashes($stu['student_id']) ?>)? This will remove all their records from the database.');" style="margin: 0; display: inline;">
                                            <input type="hidden" name="id" value="<?= (int)$stu['id'] ?>">
                                            <button type="submit" class="btn btn-danger btn-sm" title="Permanently delete student">
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

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
