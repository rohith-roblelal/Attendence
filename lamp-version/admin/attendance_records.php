<?php
/**
 * Administrator - System-wide Attendance Records
 */

$page_title = 'Attendance Records';
require_once __DIR__ . '/../includes/header.php';
require_role(['ADMINISTRATION', 'ADMIN']);

$db = get_db();

// Filter parameters
$filter_class_id   = isset($_GET['class_id']) && is_numeric($_GET['class_id']) ? (int)$_GET['class_id'] : 0;
$filter_subject_id = isset($_GET['subject_id']) && is_numeric($_GET['subject_id']) ? (int)$_GET['subject_id'] : 0;
$filter_date       = !empty($_GET['session_date']) ? $_GET['session_date'] : '';
$filter_status     = !empty($_GET['status']) ? $_GET['status'] : '';

// Fetch filter options
$classes = $db->query("
    SELECT c.id, c.class_code, c.section_name, b.batch_name, sem.name AS semester_name
    FROM classes c
    JOIN admission_batches b ON c.admission_batch_id = b.id
    JOIN semesters sem ON c.semester_id = sem.id
    WHERE c.is_active = 1
    ORDER BY b.batch_name ASC, sem.semester_number ASC, c.section_name ASC
")->fetchAll();

$subjects = $db->query("SELECT id, code, name FROM subjects WHERE is_active = 1 ORDER BY code ASC")->fetchAll();

// Build Query
$sql = "
    SELECT 
        a.id, a.status, a.marked_at,
        s.student_id, s.admission_number, CONCAT(s.first_name, ' ', COALESCE(s.last_name, '')) AS student_name,
        cs.session_date, cs.period_number, cs.contact_hours,
        c.class_code, c.section_name,
        sub.code AS subject_code, sub.name AS subject_name,
        u.username AS marked_by_user
    FROM attendance_records a
    JOIN class_sessions cs ON a.class_session_id = cs.id
    JOIN students s ON a.student_id = s.id
    JOIN classes c ON cs.class_id = c.id
    JOIN class_subjects csub ON cs.class_subject_id = csub.id
    JOIN subjects sub ON csub.subject_id = sub.id
    JOIN users u ON a.marked_by = u.id
    WHERE 1=1
";
$params = [];

if ($filter_class_id > 0) {
    $sql .= " AND cs.class_id = ?";
    $params[] = $filter_class_id;
}
if ($filter_subject_id > 0) {
    $sql .= " AND csub.subject_id = ?";
    $params[] = $filter_subject_id;
}
if (!empty($filter_date)) {
    $sql .= " AND cs.session_date = ?";
    $params[] = $filter_date;
}
if (!empty($filter_status)) {
    $sql .= " AND a.status = ?";
    $params[] = $filter_status;
}

$sql .= " ORDER BY cs.session_date DESC, cs.period_number DESC, CAST(s.student_id AS UNSIGNED) ASC LIMIT 200";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$records = $stmt->fetchAll();
?>

<div class="page-header">
    <div>
        <h1 class="page-title">System Attendance Records</h1>
        <p class="page-subtitle">Search, filter, and audit all recorded attendance marks across college classes</p>
    </div>
</div>

<!-- Filters -->
<div class="card" style="margin-bottom: 1.5rem;">
    <div class="card-body" style="padding: 1.25rem;">
        <form method="GET" action="<?= base_url('admin/attendance_records.php') ?>" style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end;">
            <div style="flex: 1; min-width: 180px;">
                <label class="form-label">Class</label>
                <select name="class_id" class="form-control">
                    <option value="0">All Classes</option>
                    <?php foreach ($classes as $c): ?>
                        <option value="<?= $c['id'] ?>" <?= $filter_class_id === (int)$c['id'] ? 'selected' : '' ?>>
                            <?= e($c['class_code'] ?: "{$c['batch_name']} - {$c['semester_name']} Sec {$c['section_name']}") ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div style="flex: 1; min-width: 180px;">
                <label class="form-label">Subject</label>
                <select name="subject_id" class="form-control">
                    <option value="0">All Subjects</option>
                    <?php foreach ($subjects as $s): ?>
                        <option value="<?= $s['id'] ?>" <?= $filter_subject_id === (int)$s['id'] ? 'selected' : '' ?>>
                            <?= e($s['code']) ?>: <?= e($s['name']) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div style="flex: 1; min-width: 140px;">
                <label class="form-label">Date</label>
                <input type="date" name="session_date" class="form-control" value="<?= e($filter_date) ?>">
            </div>

            <div style="flex: 1; min-width: 120px;">
                <label class="form-label">Status</label>
                <select name="status" class="form-control">
                    <option value="">All Statuses</option>
                    <option value="PRESENT" <?= $filter_status === 'PRESENT' ? 'selected' : '' ?>>PRESENT</option>
                    <option value="ABSENT" <?= $filter_status === 'ABSENT' ? 'selected' : '' ?>>ABSENT</option>
                </select>
            </div>

            <div style="display: flex; gap: 0.5rem;">
                <button type="submit" class="btn btn-primary">Filter</button>
                <a href="<?= base_url('admin/attendance_records.php') ?>" class="btn btn-secondary">Reset</a>
            </div>
        </form>
    </div>
</div>

<!-- Table -->
<div class="card">
    <div class="card-header">
        <h2 class="card-title">Attendance Entries (<?= count($records) ?> records displayed)</h2>
    </div>
    <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date & Period</th>
                        <th>Student</th>
                        <th>Class</th>
                        <th>Subject</th>
                        <th>Status</th>
                        <th>Marked By</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($records)): ?>
                        <tr>
                            <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                                No attendance records match the specified filters.
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($records as $r): ?>
                            <tr>
                                <td>
                                    <strong><?= format_date($r['session_date']) ?></strong>
                                    <div style="font-size: 0.75rem; color: var(--text-muted);">Period <?= $r['period_number'] ?> (<?= (float)$r['contact_hours'] ?> hr)</div>
                                </td>
                                <td>
                                    <strong><?= e($r['student_name']) ?></strong>
                                    <div style="font-size: 0.75rem; color: var(--text-muted);"><?= e($r['student_id']) ?> &bull; <?= e($r['admission_number']) ?></div>
                                </td>
                                <td><?= e($r['class_code'] ?: "Sec {$r['section_name']}") ?></td>
                                <td>
                                    <strong><?= e($r['subject_code']) ?></strong>
                                    <div style="font-size: 0.75rem; color: var(--text-muted);"><?= e($r['subject_name']) ?></div>
                                </td>
                                <td>
                                    <span class="badge <?= $r['status'] === 'PRESENT' ? 'badge-success' : 'badge-danger' ?>">
                                        <?= e($r['status']) ?>
                                    </span>
                                </td>
                                <td>
                                    <span style="font-size: 0.85rem; color: var(--text-secondary);">@<?= e($r['marked_by_user']) ?></span>
                                    <div style="font-size: 0.75rem; color: var(--text-muted);"><?= format_date($r['marked_at'], 'd M, H:i') ?></div>
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
