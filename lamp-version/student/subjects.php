<?php
/**
 * Student - Subject-wise Attendance Breakdown
 */

$page_title = 'My Subject Attendance';
require_once __DIR__ . '/../includes/header.php';
require_role(['STUDENT', 'ADMINISTRATION', 'ADMIN']);

$db = get_db();
$user = current_user();

$student_id = $user['student_id'] ?? null;
if (!$student_id) {
    $s_row = $db->query("SELECT id FROM students ORDER BY id ASC LIMIT 1")->fetch();
    $student_id = $s_row['id'] ?? 1;
}

// Fetch Detailed Subject-wise Stats
$sub_stmt = $db->prepare("
    SELECT 
        sub.id AS subject_id, sub.code AS subject_code, sub.name AS subject_name, 
        sub.subject_type, sub.credits, sub.default_contact_hours,
        COUNT(a.id) AS total_sessions,
        COALESCE(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), 0) AS present_sessions,
        COALESCE(SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END), 0) AS absent_sessions,
        COALESCE(SUM(CASE WHEN a.status = 'PRESENT' THEN cs.contact_hours ELSE 0 END), 0) AS attended_hours,
        COALESCE(SUM(cs.contact_hours), 0) AS total_conducted_hours
    FROM attendance_records a
    JOIN class_sessions cs ON a.class_session_id = cs.id
    JOIN class_subjects csub ON cs.class_subject_id = csub.id
    JOIN subjects sub ON csub.subject_id = sub.id
    WHERE a.student_id = ? AND cs.status = 'CONDUCTED'
    GROUP BY sub.id, sub.code, sub.name, sub.subject_type, sub.credits, sub.default_contact_hours
    ORDER BY sub.code ASC
");
$sub_stmt->execute([$student_id]);
$subjects = $sub_stmt->fetchAll();
?>

<div class="page-header">
    <div>
        <h1 class="page-title">Subject-wise Attendance Breakdown</h1>
        <p class="page-subtitle">Detailed breakdown of conducted lectures, contact hours, and attendance standing per course</p>
    </div>
    <div>
        <a href="<?= base_url('student/history.php') ?>" class="btn btn-secondary">📜 View Complete History Log &rarr;</a>
    </div>
</div>

<div class="card">
    <div class="card-header">
        <h2 class="card-title">Enrolled Courses Attendance (<?= count($subjects) ?> courses)</h2>
    </div>
    <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Subject Code</th>
                        <th>Course Title</th>
                        <th>Type</th>
                        <th>Conducted Lectures</th>
                        <th>Lectures Attended</th>
                        <th>Missed (Absent)</th>
                        <th>Contact Hours Attended</th>
                        <th>Attendance %</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($subjects)): ?>
                        <tr>
                            <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 3rem;">
                                No subject records found.
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($subjects as $s): ?>
                            <?php 
                                $pct = $s['total_sessions'] > 0 ? round(($s['present_sessions'] / $s['total_sessions']) * 100, 1) : 0;
                                $is_safe = ($pct >= 75.0);
                            ?>
                            <tr>
                                <td><strong><?= e($s['subject_code']) ?></strong></td>
                                <td>
                                    <strong><?= e($s['subject_name']) ?></strong>
                                    <div style="font-size: 0.75rem; color: var(--text-muted);"><?= (float)$s['credits'] ?> Credits</div>
                                </td>
                                <td><span class="badge badge-secondary"><?= e($s['subject_type']) ?></span></td>
                                <td><strong><?= $s['total_sessions'] ?></strong></td>
                                <td style="color: var(--success); font-weight: 700;"><?= $s['present_sessions'] ?></td>
                                <td style="color: var(--danger); font-weight: 700;"><?= $s['absent_sessions'] ?></td>
                                <td><?= (float)$s['attended_hours'] ?> / <?= (float)$s['total_conducted_hours'] ?> hrs</td>
                                <td>
                                    <strong style="font-size: 1.1rem; color: <?= $is_safe ? 'var(--success)' : 'var(--danger)' ?>;">
                                        <?= $pct ?>%
                                    </strong>
                                </td>
                                <td>
                                    <span class="badge <?= $is_safe ? 'badge-success' : 'badge-danger' ?>">
                                        <?= $is_safe ? 'Eligible' : 'Shortage' ?>
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

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
