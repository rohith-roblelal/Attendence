<?php
/**
 * Student Dashboard & Attendance Portal
 */

$page_title = 'Student Dashboard';
require_once __DIR__ . '/../includes/header.php';
require_role(['STUDENT', 'ADMINISTRATION', 'ADMIN']);

$db = get_db();
$user = current_user();

// Determine Student ID
$student_id = $user['student_id'] ?? null;
if (!$student_id) {
    // If Admin viewing student dashboard, pick the first student
    $s_row = $db->query("SELECT id FROM students ORDER BY id ASC LIMIT 1")->fetch();
    $student_id = $s_row['id'] ?? 1;
}

// 1. Fetch Student Profile & Enrollment
$stu_stmt = $db->prepare("
    SELECT 
        s.*, u.username, u.email,
        se.class_id, c.class_code, c.section_name, b.batch_name, sem.name AS semester_name
    FROM students s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.status = 'ACTIVE'
    LEFT JOIN classes c ON se.class_id = c.id
    LEFT JOIN admission_batches b ON c.admission_batch_id = b.id
    LEFT JOIN semesters sem ON c.semester_id = sem.id
    WHERE s.id = ?
    LIMIT 1
");
$stu_stmt->execute([$student_id]);
$student = $stu_stmt->fetch();

// 2. Fetch Overall Attendance Metrics
$att_stmt = $db->prepare("
    SELECT 
        COUNT(a.id) AS total_records,
        COALESCE(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), 0) AS present_records,
        COALESCE(SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END), 0) AS absent_records
    FROM attendance_records a
    JOIN class_sessions cs ON a.class_session_id = cs.id
    WHERE a.student_id = ? AND cs.status = 'CONDUCTED'
");
$att_stmt->execute([$student_id]);
$att = $att_stmt->fetch();

$total_sessions = (int)($att['total_records'] ?? 0);
$present_sessions = (int)($att['present_records'] ?? 0);
$absent_sessions = (int)($att['absent_records'] ?? 0);
$overall_percentage = $total_sessions > 0 ? round(($present_sessions / $total_sessions) * 100, 1) : 0;
$required_percentage = 75.0;
$is_at_risk = ($total_sessions > 0 && $overall_percentage < $required_percentage);

// 3. Fetch Subject-wise Breakdown
$sub_stmt = $db->prepare("
    SELECT 
        sub.id AS subject_id, sub.code AS subject_code, sub.name AS subject_name, sub.subject_type,
        COUNT(a.id) AS total_sessions,
        COALESCE(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), 0) AS present_sessions,
        COALESCE(SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END), 0) AS absent_sessions,
        SUM(CASE WHEN a.status = 'PRESENT' THEN cs.contact_hours ELSE 0 END) AS attended_hours,
        SUM(cs.contact_hours) AS total_conducted_hours
    FROM attendance_records a
    JOIN class_sessions cs ON a.class_session_id = cs.id
    JOIN class_subjects csub ON cs.class_subject_id = csub.id
    JOIN subjects sub ON csub.subject_id = sub.id
    WHERE a.student_id = ? AND cs.status = 'CONDUCTED'
    GROUP BY sub.id, sub.code, sub.name, sub.subject_type
    ORDER BY sub.code ASC
");
$sub_stmt->execute([$student_id]);
$subjects_attendance = $sub_stmt->fetchAll();

// 4. Fetch Recent 10 Logged Sessions
$recent_stmt = $db->prepare("
    SELECT 
        a.status, a.marked_at,
        cs.session_date, cs.period_number, cs.contact_hours,
        sub.code AS subject_code, sub.name AS subject_name,
        CONCAT(t.first_name, ' ', COALESCE(t.last_name, '')) AS teacher_name
    FROM attendance_records a
    JOIN class_sessions cs ON a.class_session_id = cs.id
    JOIN class_subjects csub ON cs.class_subject_id = csub.id
    JOIN subjects sub ON csub.subject_id = sub.id
    JOIN teachers t ON cs.conducted_by_teacher_id = t.id
    WHERE a.student_id = ? AND cs.status = 'CONDUCTED'
    ORDER BY cs.session_date DESC, cs.period_number DESC
    LIMIT 10
");
$recent_stmt->execute([$student_id]);
$recent_sessions = $recent_stmt->fetchAll();
?>

<div class="page-header">
    <div>
        <h1 class="page-title">Student Academic & Attendance Dashboard</h1>
        <p class="page-subtitle">
            Student: <strong><?= e($student['first_name'] . ' ' . ($student['last_name'] ?? '')) ?></strong> &bull; 
            Roll No: <strong><?= e($student['student_id']) ?></strong> &bull; 
            Admission No: <strong><?= e($student['admission_number'] ?: '—') ?></strong> &bull; 
            Class: <strong><?= e($student['class_code'] ?: 'Unassigned') ?></strong>
        </p>
    </div>
</div>

<!-- Attendance Threshold Banner -->
<?php if ($total_sessions > 0): ?>
    <?php if ($is_at_risk): ?>
        <div class="alert alert-error" style="font-size: 1rem; padding: 1.25rem;">
            <span>⚠️</span>
            <div>
                <strong>Attendance Shortage Warning!</strong>
                Your current overall attendance is <strong><?= $overall_percentage ?>%</strong>, which falls below the mandatory <strong>75%</strong> requirement. Please attend regular classes to avoid examination debarment.
            </div>
        </div>
    <?php else: ?>
        <div class="alert alert-success">
            <span>✅</span>
            <div>
                <strong>Good Standing!</strong> Your overall attendance is <strong><?= $overall_percentage ?>%</strong>, safely maintaining the required 75% threshold.
            </div>
        </div>
    <?php endif; ?>
<?php endif; ?>

<!-- KPI Metrics Grid -->
<div class="stats-grid">
    <div class="stat-card <?= $is_at_risk ? 'stat-danger' : 'stat-success' ?>">
        <div class="stat-header">
            <span class="stat-title">Overall Attendance</span>
            <div class="stat-icon"><?= $is_at_risk ? '⚠️' : '🎯' ?></div>
        </div>
        <div class="stat-value"><?= $overall_percentage ?>%</div>
        <div class="stat-desc">Minimum 75% mandatory</div>
    </div>

    <div class="stat-card stat-success">
        <div class="stat-header">
            <span class="stat-title">Attended Lectures</span>
            <div class="stat-icon">✅</div>
        </div>
        <div class="stat-value"><?= number_format($present_sessions) ?></div>
        <div class="stat-desc">Classes marked PRESENT</div>
    </div>

    <div class="stat-card stat-danger">
        <div class="stat-header">
            <span class="stat-title">Missed Lectures</span>
            <div class="stat-icon">❌</div>
        </div>
        <div class="stat-value"><?= number_format($absent_sessions) ?></div>
        <div class="stat-desc">Classes marked ABSENT</div>
    </div>

    <div class="stat-card stat-info">
        <div class="stat-header">
            <span class="stat-title">Total Conducted</span>
            <div class="stat-icon">📅</div>
        </div>
        <div class="stat-value"><?= number_format($total_sessions) ?></div>
        <div class="stat-desc">Total class sessions held</div>
    </div>
</div>

<!-- Subject-Wise Attendance Breakdown Table -->
<div class="card">
    <div class="card-header">
        <h2 class="card-title">📚 Course-by-Course Attendance Breakdown</h2>
        <a href="<?= base_url('student/subjects.php') ?>" class="btn btn-secondary btn-sm">Full Report &rarr;</a>
    </div>
    <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Subject Code</th>
                        <th>Subject Name</th>
                        <th>Type</th>
                        <th>Present / Conducted</th>
                        <th>Hours Attended</th>
                        <th>Attendance %</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($subjects_attendance)): ?>
                        <tr>
                            <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                                No subject sessions have been recorded for your class yet.
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($subjects_attendance as $sub): ?>
                            <?php 
                                $s_pct = $sub['total_sessions'] > 0 ? round(($sub['present_sessions'] / $sub['total_sessions']) * 100, 1) : 0;
                                $s_safe = ($s_pct >= 75.0);
                            ?>
                            <tr>
                                <td><strong><?= e($sub['subject_code']) ?></strong></td>
                                <td><strong><?= e($sub['subject_name']) ?></strong></td>
                                <td><span class="badge badge-secondary"><?= e($sub['subject_type']) ?></span></td>
                                <td>
                                    <strong><?= $sub['present_sessions'] ?></strong> / <?= $sub['total_sessions'] ?> lectures
                                </td>
                                <td>
                                    <?= (float)$sub['attended_hours'] ?> / <?= (float)$sub['total_conducted_hours'] ?> hrs
                                </td>
                                <td>
                                    <strong style="font-size: 1.05rem; color: <?= $s_safe ? 'var(--success)' : 'var(--danger)' ?>;">
                                        <?= $s_pct ?>%
                                    </strong>
                                </td>
                                <td>
                                    <span class="badge <?= $s_safe ? 'badge-success' : 'badge-danger' ?>">
                                        <?= $s_safe ? 'Safe' : 'Shortage' ?>
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

<!-- Recent Session Attendance History -->
<div class="card">
    <div class="card-header">
        <h2 class="card-title">🕒 Recent Classroom Attendance Activity</h2>
        <a href="<?= base_url('student/history.php') ?>" class="btn btn-secondary btn-sm">Full History Log &rarr;</a>
    </div>
    <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date & Period</th>
                        <th>Subject</th>
                        <th>Faculty Instructor</th>
                        <th>Your Status</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($recent_sessions)): ?>
                        <tr>
                            <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                                No attendance records available.
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($recent_sessions as $sess): ?>
                            <tr>
                                <td>
                                    <strong><?= format_date($sess['session_date']) ?></strong>
                                    <div style="font-size: 0.75rem; color: var(--text-muted);">Period <?= $sess['period_number'] ?> (<?= (float)$sess['contact_hours'] ?> hr)</div>
                                </td>
                                <td>
                                    <strong><?= e($sess['subject_code']) ?>: <?= e($sess['subject_name']) ?></strong>
                                </td>
                                <td><?= e($sess['teacher_name']) ?></td>
                                <td>
                                    <span class="badge <?= $sess['status'] === 'PRESENT' ? 'badge-success' : 'badge-danger' ?>">
                                        <?= e($sess['status']) ?>
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
