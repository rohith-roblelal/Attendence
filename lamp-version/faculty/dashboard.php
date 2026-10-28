<?php
/**
 * Faculty / Teacher Dashboard
 */

$page_title = 'Faculty Dashboard';
require_once __DIR__ . '/../includes/header.php';
require_role(['TEACHER', 'TUTOR', 'HOD', 'ADMINISTRATION', 'ADMIN']);

$db = get_db();
$user = current_user();

// Determine Teacher ID
$teacher_id = $user['teacher_id'] ?? null;
if (!$teacher_id) {
    // If Admin viewing faculty dashboard, pick the first teacher
    $t_row = $db->query("SELECT id FROM teachers ORDER BY id ASC LIMIT 1")->fetch();
    $teacher_id = $t_row['id'] ?? 1;
}

// 1. Fetch Teacher Stats
$stats_stmt = $db->prepare("
    SELECT 
        (SELECT COUNT(*) FROM class_subjects WHERE teacher_id = ? AND is_active = 1) AS assigned_subjects,
        (SELECT COUNT(*) FROM class_sessions WHERE conducted_by_teacher_id = ? AND status = 'CONDUCTED') AS conducted_sessions,
        (SELECT COUNT(a.id) 
         FROM attendance_records a 
         JOIN class_sessions cs ON a.class_session_id = cs.id 
         WHERE cs.conducted_by_teacher_id = ? AND cs.status = 'CONDUCTED') AS total_marks_recorded
");
$stats_stmt->execute([$teacher_id, $teacher_id, $teacher_id]);
$stats = $stats_stmt->fetch();

// 2. Fetch Assigned Courses & Classes
$assign_stmt = $db->prepare("
    SELECT 
        cs.id AS class_subject_id, cs.class_id, cs.subject_id,
        c.class_code, c.section_name, b.batch_name, sem.name AS semester_name,
        s.code AS subject_code, s.name AS subject_name, s.subject_type,
        (SELECT COUNT(*) FROM student_enrollments se WHERE se.class_id = c.id AND se.status = 'ACTIVE') AS student_count,
        (SELECT COUNT(*) FROM class_sessions sess WHERE sess.class_subject_id = cs.id AND sess.status = 'CONDUCTED') AS sessions_taken
    FROM class_subjects cs
    JOIN classes c ON cs.class_id = c.id
    JOIN admission_batches b ON c.admission_batch_id = b.id
    JOIN semesters sem ON c.semester_id = sem.id
    JOIN subjects s ON cs.subject_id = s.id
    WHERE cs.teacher_id = ? AND cs.is_active = 1
    ORDER BY c.class_code ASC, s.code ASC
");
$assign_stmt->execute([$teacher_id]);
$assignments = $assign_stmt->fetchAll();

// 3. Recent Sessions Taken by This Faculty
$sess_stmt = $db->prepare("
    SELECT 
        cs.id, cs.session_date, cs.period_number, cs.status,
        c.class_code, c.section_name,
        s.code AS subject_code, s.name AS subject_name,
        (SELECT COUNT(*) FROM attendance_records WHERE class_session_id = cs.id) AS student_count,
        (SELECT COUNT(*) FROM attendance_records WHERE class_session_id = cs.id AND status = 'PRESENT') AS present_count
    FROM class_sessions cs
    JOIN classes c ON cs.class_id = c.id
    JOIN class_subjects csub ON cs.class_subject_id = csub.id
    JOIN subjects s ON csub.subject_id = s.id
    WHERE cs.conducted_by_teacher_id = ?
    ORDER BY cs.session_date DESC, cs.period_number DESC
    LIMIT 5
");
$sess_stmt->execute([$teacher_id]);
$recent_sessions = $sess_stmt->fetchAll();
?>

<div class="page-header">
    <div>
        <h1 class="page-title">Faculty Portal & Dashboard</h1>
        <p class="page-subtitle">Welcome, <?= e($user['display_name']) ?>! Manage attendance and course sections</p>
    </div>
    <div>
        <a href="<?= base_url('faculty/take_attendance.php') ?>" class="btn btn-primary" style="font-size: 1rem; padding: 0.65rem 1.25rem;">
            ✍️ Mark Class Attendance Now
        </a>
    </div>
</div>

<!-- KPI Cards -->
<div class="stats-grid">
    <div class="stat-card stat-primary">
        <div class="stat-header">
            <span class="stat-title">Assigned Courses</span>
            <div class="stat-icon">📚</div>
        </div>
        <div class="stat-value"><?= number_format($stats['assigned_subjects']) ?></div>
        <div class="stat-desc">Active course sections assigned to you</div>
    </div>

    <div class="stat-card stat-success">
        <div class="stat-header">
            <span class="stat-title">Sessions Conducted</span>
            <div class="stat-icon">🎓</div>
        </div>
        <div class="stat-value"><?= number_format($stats['conducted_sessions']) ?></div>
        <div class="stat-desc">Completed classroom lectures & labs</div>
    </div>

    <div class="stat-card stat-info">
        <div class="stat-header">
            <span class="stat-title">Student Marks Recorded</span>
            <div class="stat-icon">📋</div>
        </div>
        <div class="stat-value"><?= number_format($stats['total_marks_recorded']) ?></div>
        <div class="stat-desc">Present and Absent marks logged</div>
    </div>
</div>

<!-- Assigned Courses Panel -->
<div class="card">
    <div class="card-header">
        <h2 class="card-title">📖 Your Assigned Classes & Courses (<?= count($assignments) ?>)</h2>
        <a href="<?= base_url('faculty/take_attendance.php') ?>" class="btn btn-primary btn-sm">+ Take Attendance</a>
    </div>
    <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Class Code / Section</th>
                        <th>Subject Name</th>
                        <th>Type</th>
                        <th>Enrolled Students</th>
                        <th>Conducted Lectures</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($assignments)): ?>
                        <tr>
                            <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                                No courses are currently assigned to your profile. Please contact your HOD or Admin.
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($assignments as $a): ?>
                            <tr>
                                <td>
                                    <strong><?= e($a['class_code'] ?: "Section {$a['section_name']}") ?></strong>
                                    <div style="font-size: 0.75rem; color: var(--text-muted);"><?= e($a['batch_name']) ?> &bull; <?= e($a['semester_name']) ?></div>
                                </td>
                                <td>
                                    <strong><?= e($a['subject_code']) ?>: <?= e($a['subject_name']) ?></strong>
                                </td>
                                <td>
                                    <span class="badge <?= $a['subject_type'] === 'LAB' ? 'badge-info' : 'badge-secondary' ?>">
                                        <?= e($a['subject_type']) ?>
                                    </span>
                                </td>
                                <td>
                                    <span class="badge badge-info">👨‍🎓 <?= $a['student_count'] ?> Students</span>
                                </td>
                                <td>
                                    <strong><?= $a['sessions_taken'] ?></strong> sessions
                                </td>
                                <td>
                                    <a href="<?= base_url('faculty/take_attendance.php?class_id=' . $a['class_id'] . '&class_subject_id=' . $a['class_subject_id']) ?>" class="btn btn-primary btn-sm">
                                        Mark Attendance &rarr;
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

<!-- Recent Sessions Table -->
<div class="card">
    <div class="card-header">
        <h2 class="card-title">🕒 Recent Sessions Logged by You</h2>
        <a href="<?= base_url('faculty/attendance_history.php') ?>" class="btn btn-secondary btn-sm">Full History &rarr;</a>
    </div>
    <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date & Period</th>
                        <th>Class & Subject</th>
                        <th>Present / Enrolled</th>
                        <th>Attendance Rate</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($recent_sessions)): ?>
                        <tr>
                            <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                                You have not marked any class sessions yet. Click "Mark Class Attendance Now" above to start!
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($recent_sessions as $s): ?>
                            <?php 
                                $pct = $s['student_count'] > 0 ? round(($s['present_count'] / $s['student_count']) * 100) : 0; 
                            ?>
                            <tr>
                                <td>
                                    <strong><?= format_date($s['session_date']) ?></strong>
                                    <div style="font-size: 0.75rem; color: var(--text-muted);">Period <?= $s['period_number'] ?></div>
                                </td>
                                <td>
                                    <strong><?= e($s['subject_code']) ?>: <?= e($s['subject_name']) ?></strong>
                                    <div style="font-size: 0.75rem; color: var(--text-muted);"><?= e($s['class_code'] ?: $s['section_name']) ?></div>
                                </td>
                                <td>
                                    <strong><?= $s['present_count'] ?></strong> / <?= $s['student_count'] ?> Present
                                </td>
                                <td>
                                    <span class="badge <?= $pct >= 75 ? 'badge-success' : 'badge-danger' ?>">
                                        <?= $pct ?>%
                                    </span>
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
