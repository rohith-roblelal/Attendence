<?php
/**
 * Student - Complete Attendance History Log
 */

$page_title = 'Attendance History Log';
require_once __DIR__ . '/../includes/header.php';
require_role(['STUDENT', 'ADMINISTRATION', 'ADMIN']);

$db = get_db();
$user = current_user();

$student_id = $user['student_id'] ?? null;
if (!$student_id) {
    $s_row = $db->query("SELECT id FROM students ORDER BY id ASC LIMIT 1")->fetch();
    $student_id = $s_row['id'] ?? 1;
}

$filter_subject_id = isset($_GET['subject_id']) && is_numeric($_GET['subject_id']) ? (int)$_GET['subject_id'] : 0;
$filter_status     = !empty($_GET['status']) ? $_GET['status'] : '';

// Fetch Subjects for Filter
$subjects = $db->query("SELECT id, code, name FROM subjects WHERE is_active = 1 ORDER BY code ASC")->fetchAll();

// Fetch History
$sql = "
    SELECT 
        a.id, a.status, a.marked_at,
        cs.session_date, cs.period_number, cs.contact_hours,
        sub.code AS subject_code, sub.name AS subject_name,
        CONCAT(t.first_name, ' ', COALESCE(t.last_name, '')) AS teacher_name
    FROM attendance_records a
    JOIN class_sessions cs ON a.class_session_id = cs.id
    JOIN class_subjects csub ON cs.class_subject_id = csub.id
    JOIN subjects sub ON csub.subject_id = sub.id
    JOIN teachers t ON cs.conducted_by_teacher_id = t.id
    WHERE a.student_id = ? AND cs.status = 'CONDUCTED'
";
$params = [$student_id];

if ($filter_subject_id > 0) {
    $sql .= " AND sub.id = ?";
    $params[] = $filter_subject_id;
}
if (!empty($filter_status)) {
    $sql .= " AND a.status = ?";
    $params[] = $filter_status;
}

$sql .= " ORDER BY cs.session_date DESC, cs.period_number DESC";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$history = $stmt->fetchAll();
?>

<div class="page-header">
    <div>
        <h1 class="page-title">Personal Attendance History</h1>
        <p class="page-subtitle">Full chronological audit log of all classes attended and missed</p>
    </div>
</div>

<!-- Filter Bar -->
<div class="card" style="margin-bottom: 1.5rem;">
    <div class="card-body" style="padding: 1.25rem;">
        <form method="GET" action="<?= base_url('student/history.php') ?>" style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end;">
            <div style="flex: 2; min-width: 220px;">
                <label class="form-label">Filter by Course</label>
                <select name="subject_id" class="form-control" onchange="this.form.submit()">
                    <option value="0">All Courses</option>
                    <?php foreach ($subjects as $s): ?>
                        <option value="<?= $s['id'] ?>" <?= ($filter_subject_id === (int)$s['id']) ? 'selected' : '' ?>>
                            <?= e($s['code']) ?>: <?= e($s['name']) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div style="flex: 1; min-width: 150px;">
                <label class="form-label">Status</label>
                <select name="status" class="form-control" onchange="this.form.submit()">
                    <option value="">All Records</option>
                    <option value="PRESENT" <?= ($filter_status === 'PRESENT') ? 'selected' : '' ?>>PRESENT Only</option>
                    <option value="ABSENT" <?= ($filter_status === 'ABSENT') ? 'selected' : '' ?>>ABSENT Only</option>
                </select>
            </div>

            <div style="display: flex; gap: 0.5rem;">
                <button type="submit" class="btn btn-primary">Filter</button>
                <a href="<?= base_url('student/history.php') ?>" class="btn btn-secondary">Reset</a>
            </div>
        </form>
    </div>
</div>

<!-- History Table -->
<div class="card">
    <div class="card-header">
        <h2 class="card-title">Attendance Entries (<?= count($history) ?> records)</h2>
    </div>
    <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date & Period</th>
                        <th>Subject</th>
                        <th>Faculty Member</th>
                        <th>Contact Hours</th>
                        <th>Attendance Status</th>
                        <th>Timestamp</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($history)): ?>
                        <tr>
                            <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 3rem;">
                                No attendance records match the selected filters.
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($history as $h): ?>
                            <tr>
                                <td>
                                    <strong><?= format_date($h['session_date']) ?></strong>
                                    <div style="font-size: 0.75rem; color: var(--text-muted);">Period <?= $h['period_number'] ?></div>
                                </td>
                                <td>
                                    <strong><?= e($h['subject_code']) ?></strong>
                                    <div style="font-size: 0.85rem;"><?= e($h['subject_name']) ?></div>
                                </td>
                                <td><?= e($h['teacher_name']) ?></td>
                                <td><?= (float)$h['contact_hours'] ?> contact hr</td>
                                <td>
                                    <span class="badge <?= $h['status'] === 'PRESENT' ? 'badge-success' : 'badge-danger' ?>">
                                        <?= e($h['status']) ?>
                                    </span>
                                </td>
                                <td>
                                    <span style="font-size: 0.8rem; color: var(--text-muted);"><?= format_date($h['marked_at'], 'd M Y, H:i') ?></span>
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
