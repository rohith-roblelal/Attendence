<?php
/**
 * Faculty - My Assigned Classes & Course Rosters
 */

$page_title = 'My Assigned Classes';
require_once __DIR__ . '/../includes/header.php';
require_role(['TEACHER', 'TUTOR', 'HOD', 'ADMINISTRATION', 'ADMIN']);

$db = get_db();
$user = current_user();

$teacher_id = $user['teacher_id'] ?? null;
if (!$teacher_id) {
    $t_row = $db->query("SELECT id FROM teachers ORDER BY id ASC LIMIT 1")->fetch();
    $teacher_id = $t_row['id'] ?? 1;
}

// Fetch assigned courses
$cs_stmt = $db->prepare("
    SELECT 
        cs.id AS class_subject_id, cs.class_id, cs.subject_id,
        c.class_code, c.section_name, b.batch_name, sem.name AS semester_name,
        s.code AS subject_code, s.name AS subject_name, s.subject_type, s.default_contact_hours, s.credits,
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
$cs_stmt->execute([$teacher_id]);
$courses = $cs_stmt->fetchAll();
?>

<div class="page-header">
    <div>
        <h1 class="page-title">My Teaching Allocations</h1>
        <p class="page-subtitle">Academic sections and student rosters authorized for your faculty profile</p>
    </div>
</div>

<div class="stats-grid">
    <?php foreach ($courses as $course): ?>
        <div class="card" style="margin-bottom: 0;">
            <div class="card-header">
                <div>
                    <h3 class="card-title"><?= e($course['subject_code']) ?>: <?= e($course['subject_name']) ?></h3>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;">
                        Class: <strong><?= e($course['class_code'] ?: "Sec {$course['section_name']}") ?></strong> &bull; <?= e($course['batch_name']) ?>
                    </div>
                </div>
                <span class="badge <?= $course['subject_type'] === 'LAB' ? 'badge-info' : 'badge-secondary' ?>">
                    <?= e($course['subject_type']) ?>
                </span>
            </div>
            <div class="card-body">
                <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Enrolled Students</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">👨‍🎓 <?= $course['student_count'] ?></div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Sessions Conducted</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">📅 <?= $course['sessions_taken'] ?></div>
                    </div>
                </div>
                <a href="<?= base_url('faculty/take_attendance.php?class_id=' . $course['class_id'] . '&class_subject_id=' . $course['class_subject_id']) ?>" class="btn btn-primary" style="width: 100%;">
                    ✍️ Take Attendance &rarr;
                </a>
            </div>
        </div>
    <?php endforeach; ?>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
