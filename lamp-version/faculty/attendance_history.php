<?php
/**
 * Faculty - Attendance Session History & Audit
 */

$page_title = 'Attendance History';
require_once __DIR__ . '/../includes/header.php';
require_role(['TEACHER', 'TUTOR', 'HOD', 'ADMINISTRATION', 'ADMIN']);

$db = get_db();
$user = current_user();

$teacher_id = $user['teacher_id'] ?? null;
if (!$teacher_id) {
    $t_row = $db->query("SELECT id FROM teachers ORDER BY id ASC LIMIT 1")->fetch();
    $teacher_id = $t_row['id'] ?? 1;
}

// Fetch all sessions conducted by this teacher
$sql = "
    SELECT 
        cs.id, cs.session_date, cs.period_number, cs.contact_hours, cs.status, cs.created_at,
        c.class_code, c.section_name, b.batch_name, sem.name AS semester_name,
        s.code AS subject_code, s.name AS subject_name,
        (SELECT COUNT(*) FROM attendance_records WHERE class_session_id = cs.id) AS total_students,
        (SELECT COUNT(*) FROM attendance_records WHERE class_session_id = cs.id AND status = 'PRESENT') AS present_students
    FROM class_sessions cs
    JOIN classes c ON cs.class_id = c.id
    JOIN admission_batches b ON c.admission_batch_id = b.id
    JOIN semesters sem ON c.semester_id = sem.id
    JOIN class_subjects csub ON cs.class_subject_id = csub.id
    JOIN subjects s ON csub.subject_id = s.id
    WHERE cs.conducted_by_teacher_id = ?
    ORDER BY cs.session_date DESC, cs.period_number DESC
";
$stmt = $db->prepare($sql);
$stmt->execute([$teacher_id]);
$sessions = $stmt->fetchAll();
?>

<div class="page-header">
    <div>
        <h1 class="page-title">Attendance Session History</h1>
        <p class="page-subtitle">Review past lectures, attendance percentages, and update marks if needed</p>
    </div>
    <div>
        <a href="<?= base_url('faculty/take_attendance.php') ?>" class="btn btn-primary">+ Mark New Attendance</a>
    </div>
</div>

<div class="card">
    <div class="card-header">
        <h2 class="card-title">Conducted Sessions (<?= count($sessions) ?> recorded)</h2>
    </div>
    <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date & Period</th>
                        <th>Class Section</th>
                        <th>Subject</th>
                        <th>Present / Enrolled</th>
                        <th>Attendance Rate</th>
                        <th>Logged At</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($sessions)): ?>
                        <tr>
                            <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 3rem;">
                                No attendance sessions recorded yet. Click "+ Mark New Attendance" above.
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($sessions as $s): ?>
                            <?php 
                                $tot = (int)$s['total_students'];
                                $prs = (int)$s['present_students'];
                                $pct = $tot > 0 ? round(($prs / $tot) * 100, 1) : 0;
                            ?>
                            <tr>
                                <td>
                                    <strong><?= format_date($s['session_date']) ?></strong>
                                    <div style="font-size: 0.75rem; color: var(--text-muted);">Period <?= $s['period_number'] ?> (<?= (float)$s['contact_hours'] ?> hr)</div>
                                </td>
                                <td>
                                    <strong><?= e($s['class_code'] ?: "Section {$s['section_name']}") ?></strong>
                                    <div style="font-size: 0.75rem; color: var(--text-muted);"><?= e($s['batch_name']) ?></div>
                                </td>
                                <td>
                                    <strong><?= e($s['subject_code']) ?></strong>
                                    <div style="font-size: 0.85rem;"><?= e($s['subject_name']) ?></div>
                                </td>
                                <td>
                                    <strong><?= $prs ?></strong> / <?= $tot ?> Students
                                </td>
                                <td>
                                    <span class="badge <?= $pct >= 75 ? 'badge-success' : 'badge-danger' ?>">
                                        <?= $pct ?>%
                                    </span>
                                </td>
                                <td>
                                    <span style="font-size: 0.8rem; color: var(--text-muted);"><?= format_date($s['created_at'], 'd M Y, H:i') ?></span>
                                </td>
                                <td>
                                    <a href="<?= base_url('faculty/take_attendance.php?session_id=' . $s['id']) ?>" class="btn btn-secondary btn-sm">
                                        ✏️ Edit Marks
                                    </a>
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
