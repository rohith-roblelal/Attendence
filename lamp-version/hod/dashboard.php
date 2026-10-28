<?php
/**
 * Head of Department (HOD) Dashboard
 */

$page_title = 'HOD Dashboard';
require_once __DIR__ . '/../includes/header.php';
require_role(['HOD', 'ADMINISTRATION', 'ADMIN']);

$db = get_db();
$user = current_user();

// Determine Department ID
$department_id = $user['department_id'] ?? null;
if (!$department_id) {
    // If Admin viewing HOD page or HOD without explicit dept_id, default to first department
    $d_row = $db->query("SELECT id FROM departments ORDER BY id ASC LIMIT 1")->fetch();
    $department_id = $d_row['id'] ?? 1;
}

// Fetch Department Context
$dept_stmt = $db->prepare("SELECT * FROM departments WHERE id = ?");
$dept_stmt->execute([$department_id]);
$department = $dept_stmt->fetch();

// 1. Department Counts
$counts_stmt = $db->prepare("
    SELECT
        (SELECT COUNT(c.id) 
         FROM classes c 
         JOIN admission_batches b ON c.admission_batch_id = b.id 
         WHERE b.department_id = ? AND c.is_active = 1) AS active_classes,
        (SELECT COUNT(DISTINCT se.student_id) 
         FROM student_enrollments se 
         JOIN classes c ON se.class_id = c.id 
         JOIN admission_batches b ON c.admission_batch_id = b.id 
         WHERE b.department_id = ? AND se.status = 'ACTIVE') AS active_students,
        (SELECT COUNT(t.id) 
         FROM teachers t 
         WHERE t.department_id = ? AND t.status = 'ACTIVE') AS active_teachers
");
$counts_stmt->execute([$department_id, $department_id, $department_id]);
$counts = $counts_stmt->fetch();

// 2. Department Attendance Overview
$att_stmt = $db->prepare("
    SELECT 
        COUNT(a.id) AS total_records,
        COALESCE(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), 0) AS present_records
    FROM attendance_records a
    JOIN class_sessions cs ON a.class_session_id = cs.id
    JOIN classes c ON cs.class_id = c.id
    JOIN admission_batches b ON c.admission_batch_id = b.id
    WHERE b.department_id = ? AND cs.status = 'CONDUCTED'
");
$att_stmt->execute([$department_id]);
$att = $att_stmt->fetch();

$total_att = (int)($att['total_records'] ?? 0);
$present_att = (int)($att['present_records'] ?? 0);
$dept_pct = $total_att > 0 ? round(($present_att / $total_att) * 100, 1) : 0;

// 3. Class Performance Summary
$classes_stmt = $db->prepare("
    SELECT 
        c.id, c.class_code, c.section_name, b.batch_name, sem.name AS semester_name,
        (SELECT COUNT(*) FROM student_enrollments se WHERE se.class_id = c.id AND se.status = 'ACTIVE') AS student_count,
        COUNT(a.id) AS total_records,
        COALESCE(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), 0) AS present_records
    FROM classes c
    JOIN admission_batches b ON c.admission_batch_id = b.id
    JOIN semesters sem ON c.semester_id = sem.id
    LEFT JOIN class_sessions cs ON cs.class_id = c.id AND cs.status = 'CONDUCTED'
    LEFT JOIN attendance_records a ON a.class_session_id = cs.id
    WHERE b.department_id = ? AND c.is_active = 1
    GROUP BY c.id, c.class_code, c.section_name, b.batch_name, sem.name
    ORDER BY b.batch_name ASC, sem.name ASC
");
$classes_stmt->execute([$department_id]);
$dept_classes = $classes_stmt->fetchAll();

// 4. Students Requiring Attention (< 75%)
$risk_stmt = $db->prepare("
    SELECT 
        st.id, st.student_id, st.admission_number,
        CONCAT(st.first_name, ' ', COALESCE(st.last_name, '')) AS student_name,
        c.class_code, c.section_name,
        COUNT(a.id) AS total_sessions,
        SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) AS present_sessions,
        ROUND((SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) / COUNT(a.id)) * 100, 1) AS attendance_pct
    FROM students st
    JOIN student_enrollments se ON st.id = se.student_id AND se.status = 'ACTIVE'
    JOIN classes c ON se.class_id = c.id
    JOIN admission_batches b ON c.admission_batch_id = b.id
    JOIN attendance_records a ON a.student_id = st.id
    JOIN class_sessions cs ON a.class_session_id = cs.id AND cs.status = 'CONDUCTED'
    WHERE b.department_id = ? AND st.status = 'ACTIVE'
    GROUP BY st.id, st.student_id, st.admission_number, st.first_name, st.last_name, c.class_code, c.section_name
    HAVING total_sessions > 0 AND attendance_pct < 75.0
    ORDER BY attendance_pct ASC
    LIMIT 10
");
$risk_stmt->execute([$department_id]);
$risk_students = $risk_stmt->fetchAll();
?>

<div class="page-header">
    <div>
        <h1 class="page-title">Head of Department Dashboard</h1>
        <p class="page-subtitle">Department of <?= e($department['name']) ?> (<?= e($department['code']) ?>)</p>
    </div>
    <div style="display: flex; gap: 0.5rem;">
        <a href="<?= base_url('hod/subjects.php') ?>" class="btn btn-primary">Allocate Subjects</a>
        <a href="<?= base_url('hod/enroll_student.php') ?>" class="btn btn-secondary">Enroll Students</a>
    </div>
</div>

<!-- Department KPI Stat Cards -->
<div class="stats-grid">
    <div class="stat-card stat-info">
        <div class="stat-header">
            <span class="stat-title">Department Students</span>
            <div class="stat-icon">👨‍🎓</div>
        </div>
        <div class="stat-value"><?= number_format($counts['active_students']) ?></div>
        <div class="stat-desc">Active in <?= $department['code'] ?> batches</div>
    </div>

    <div class="stat-card stat-primary">
        <div class="stat-header">
            <span class="stat-title">Department Faculty</span>
            <div class="stat-icon">👨‍🏫</div>
        </div>
        <div class="stat-value"><?= number_format($counts['active_teachers']) ?></div>
        <div class="stat-desc">Instructors & Professors</div>
    </div>

    <div class="stat-card stat-warning">
        <div class="stat-header">
            <span class="stat-title">Active Classes</span>
            <div class="stat-icon">🏫</div>
        </div>
        <div class="stat-value"><?= number_format($counts['active_classes']) ?></div>
        <div class="stat-desc">Sections currently in session</div>
    </div>

    <div class="stat-card <?= $dept_pct >= 75 ? 'stat-success' : 'stat-danger' ?>">
        <div class="stat-header">
            <span class="stat-title">Dept Attendance Average</span>
            <div class="stat-icon">📈</div>
        </div>
        <div class="stat-value"><?= $dept_pct ?>%</div>
        <div class="stat-desc"><?= number_format($present_att) ?> / <?= number_format($total_att) ?> marks attended</div>
    </div>
</div>

<!-- Class Breakdown -->
<div class="card">
    <div class="card-header">
        <h2 class="card-title">Class Attendance & Enrollment Breakdown</h2>
        <a href="<?= base_url('hod/classes.php') ?>" class="btn btn-secondary btn-sm">Manage Classes &rarr;</a>
    </div>
    <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Class Code / Section</th>
                        <th>Batch & Semester</th>
                        <th>Enrolled Students</th>
                        <th>Conducted Marks</th>
                        <th>Attendance %</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($dept_classes)): ?>
                        <tr>
                            <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
                                No classes registered for this department.
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($dept_classes as $cls): ?>
                            <?php 
                                $c_tot = (int)$cls['total_records'];
                                $c_prs = (int)$cls['present_records'];
                                $c_pct = $c_tot > 0 ? round(($c_prs / $c_tot) * 100, 1) : null;
                            ?>
                            <tr>
                                <td><strong><?= e($cls['class_code'] ?: "Section {$cls['section_name']}") ?></strong></td>
                                <td><?= e($cls['batch_name']) ?> &bull; <?= e($cls['semester_name']) ?></td>
                                <td>
                                    <span class="badge badge-info">👨‍🎓 <?= $cls['student_count'] ?> Students</span>
                                </td>
                                <td><?= $c_prs ?> / <?= $c_tot ?></td>
                                <td>
                                    <?php if ($c_pct !== null): ?>
                                        <span class="badge <?= $c_pct >= 75 ? 'badge-success' : 'badge-danger' ?>">
                                            <?= $c_pct ?>%
                                        </span>
                                    <?php else: ?>
                                        <span class="badge badge-secondary">No Sessions</span>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Low Attendance Alert List -->
<div class="card">
    <div class="card-header">
        <h2 class="card-title">⚠️ Students Requiring Attendance Intervention (&lt; 75%)</h2>
        <span class="badge badge-danger"><?= count($risk_students) ?> flagged in department</span>
    </div>
    <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Roll No</th>
                        <th>Student Name</th>
                        <th>Class</th>
                        <th>Attended / Total</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($risk_students)): ?>
                        <tr>
                            <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
                                ✅ Excellent! All students in <?= e($department['name']) ?> maintain at least 75% attendance.
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($risk_students as $r): ?>
                            <tr>
                                <td><code><?= e($r['student_id']) ?></code></td>
                                <td><strong><?= e($r['student_name']) ?></strong></td>
                                <td><?= e($r['class_code'] ?: "Sec {$r['section_name']}") ?></td>
                                <td><?= $r['present_sessions'] ?> / <?= $r['total_sessions'] ?></td>
                                <td>
                                    <span class="badge badge-danger"><?= $r['attendance_pct'] ?>%</span>
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
