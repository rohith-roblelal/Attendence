<?php
/**
 * HOD - Department Attendance Reports & Analytics
 */

$page_title = 'Department Attendance Reports';
require_once __DIR__ . '/../includes/header.php';
require_role(['HOD', 'ADMINISTRATION', 'ADMIN']);

$db = get_db();
$user = current_user();

$department_id = $user['department_id'] ?? null;
if (!$department_id) {
    $d_row = $db->query("SELECT id FROM departments ORDER BY id ASC LIMIT 1")->fetch();
    $department_id = $d_row['id'] ?? 1;
}

// 1. Subject-wise Attendance in Department
$sub_stmt = $db->prepare("
    SELECT 
        s.code AS subject_code, s.name AS subject_name, s.subject_type,
        COUNT(a.id) AS total_records,
        COALESCE(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), 0) AS present_records,
        COUNT(DISTINCT cs.id) AS sessions_count
    FROM subjects s
    JOIN class_subjects csub ON s.id = csub.subject_id
    JOIN classes c ON csub.class_id = c.id
    JOIN admission_batches b ON c.admission_batch_id = b.id
    LEFT JOIN class_sessions cs ON cs.class_subject_id = csub.id AND cs.status = 'CONDUCTED'
    LEFT JOIN attendance_records a ON a.class_session_id = cs.id
    WHERE b.department_id = ?
    GROUP BY s.id, s.code, s.name, s.subject_type
    ORDER BY s.code ASC
");
$sub_stmt->execute([$department_id]);
$subject_stats = $sub_stmt->fetchAll();

// 2. Class-wise Attendance in Department
$cls_stmt = $db->prepare("
    SELECT 
        c.id, c.class_code, c.section_name, b.batch_name, sem.name AS semester_name,
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
$cls_stmt->execute([$department_id]);
$class_stats = $cls_stmt->fetchAll();
?>

<div class="page-header">
    <div>
        <h1 class="page-title">Department Attendance Reports</h1>
        <p class="page-subtitle">Aggregate academic attendance statistics and course performance</p>
    </div>
</div>

<!-- Class Breakdown -->
<div class="card">
    <div class="card-header">
        <h2 class="card-title">Class-by-Class Attendance Rates</h2>
    </div>
    <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Class Code</th>
                        <th>Batch & Semester</th>
                        <th>Present Marks</th>
                        <th>Total Marks</th>
                        <th>Attendance Rate</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($class_stats as $cs): ?>
                        <?php 
                            $tot = (int)$cs['total_records'];
                            $prs = (int)$cs['present_records'];
                            $pct = $tot > 0 ? round(($prs / $tot) * 100, 1) : 0;
                        ?>
                        <tr>
                            <td><strong><?= e($cs['class_code'] ?: "Section {$cs['section_name']}") ?></strong></td>
                            <td><?= e($cs['batch_name']) ?> &bull; <?= e($cs['semester_name']) ?></td>
                            <td><?= $prs ?></td>
                            <td><?= $tot ?></td>
                            <td>
                                <span class="badge <?= $pct >= 75 ? 'badge-success' : 'badge-danger' ?>">
                                    <?= $tot > 0 ? "{$pct}%" : 'No Data' ?>
                                </span>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Subject Breakdown -->
<div class="card">
    <div class="card-header">
        <h2 class="card-title">Subject-wise Department Attendance</h2>
    </div>
    <div class="card-body" style="padding: 0;">
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Subject Name</th>
                        <th>Type</th>
                        <th>Conducted Sessions</th>
                        <th>Total Marks</th>
                        <th>Attendance %</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($subject_stats as $ss): ?>
                        <?php 
                            $s_tot = (int)$ss['total_records'];
                            $s_prs = (int)$ss['present_records'];
                            $s_pct = $s_tot > 0 ? round(($s_prs / $s_tot) * 100, 1) : 0;
                        ?>
                        <tr>
                            <td><strong><?= e($ss['subject_code']) ?></strong></td>
                            <td><?= e($ss['subject_name']) ?></td>
                            <td><span class="badge badge-secondary"><?= e($ss['subject_type']) ?></span></td>
                            <td><?= $ss['sessions_count'] ?> sessions</td>
                            <td><?= $s_prs ?> / <?= $s_tot ?></td>
                            <td>
                                <span class="badge <?= $s_pct >= 75 ? 'badge-success' : 'badge-warning' ?>">
                                    <?= $s_tot > 0 ? "{$s_pct}%" : 'No Data' ?>
                                </span>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
