<?php
/**
 * Faculty - Take & Mark Class Attendance
 */

$page_title = 'Mark Class Attendance';
require_once __DIR__ . '/../includes/header.php';
require_role(['TEACHER', 'TUTOR', 'HOD', 'ADMINISTRATION', 'ADMIN']);

$db = get_db();
$user = current_user();

$teacher_id = $user['teacher_id'] ?? null;
if (!$teacher_id) {
    $t_row = $db->query("SELECT id FROM teachers ORDER BY id ASC LIMIT 1")->fetch();
    $teacher_id = $t_row['id'] ?? 1;
}

$error = null;
$session_id = isset($_GET['session_id']) && is_numeric($_GET['session_id']) ? (int)$_GET['session_id'] : 0;
$selected_class_id = isset($_GET['class_id']) && is_numeric($_GET['class_id']) ? (int)$_GET['class_id'] : 0;
$selected_cs_id = isset($_GET['class_subject_id']) && is_numeric($_GET['class_subject_id']) ? (int)$_GET['class_subject_id'] : 0;
$session_date = !empty($_GET['session_date']) ? $_GET['session_date'] : date('Y-m-d');
$period_number = isset($_GET['period']) && is_numeric($_GET['period']) ? (int)$_GET['period'] : 1;

// If session_id provided, load session details
if ($session_id > 0) {
    $sess_stmt = $db->prepare("SELECT * FROM class_sessions WHERE id = ?");
    $sess_stmt->execute([$session_id]);
    $sess_row = $sess_stmt->fetch();
    if ($sess_row) {
        $selected_class_id = (int)$sess_row['class_id'];
        $selected_cs_id    = (int)$sess_row['class_subject_id'];
        $session_date      = $sess_row['session_date'];
        $period_number     = (int)$sess_row['period_number'];
    }
}

// 1. Fetch authorized class-subjects for this teacher (or all if admin)
if (has_role(['ADMINISTRATION', 'ADMIN'])) {
    $cs_stmt = $db->query("
        SELECT 
            cs.id AS class_subject_id, cs.class_id, cs.subject_id, cs.teacher_id,
            c.class_code, c.section_name, b.batch_name, sem.name AS semester_name,
            s.code AS subject_code, s.name AS subject_name,
            CONCAT(t.first_name, ' ', COALESCE(t.last_name, '')) AS teacher_name
        FROM class_subjects cs
        JOIN classes c ON cs.class_id = c.id
        JOIN admission_batches b ON c.admission_batch_id = b.id
        JOIN semesters sem ON c.semester_id = sem.id
        JOIN subjects s ON cs.subject_id = s.id
        JOIN teachers t ON cs.teacher_id = t.id
        WHERE cs.is_active = 1
        ORDER BY c.class_code ASC, s.code ASC
    ");
} else {
    $cs_stmt = $db->prepare("
        SELECT 
            cs.id AS class_subject_id, cs.class_id, cs.subject_id, cs.teacher_id,
            c.class_code, c.section_name, b.batch_name, sem.name AS semester_name,
            s.code AS subject_code, s.name AS subject_name,
            CONCAT(t.first_name, ' ', COALESCE(t.last_name, '')) AS teacher_name
        FROM class_subjects cs
        JOIN classes c ON cs.class_id = c.id
        JOIN admission_batches b ON c.admission_batch_id = b.id
        JOIN semesters sem ON c.semester_id = sem.id
        JOIN subjects s ON cs.subject_id = s.id
        JOIN teachers t ON cs.teacher_id = t.id
        WHERE cs.teacher_id = ? AND cs.is_active = 1
        ORDER BY c.class_code ASC, s.code ASC
    ");
    $cs_stmt->execute([$teacher_id]);
}
$assigned_courses = $cs_stmt->fetchAll();

// If no course explicitly selected but teacher has only one, default to it
if ($selected_cs_id <= 0 && count($assigned_courses) === 1) {
    $selected_cs_id = (int)$assigned_courses[0]['class_subject_id'];
    $selected_class_id = (int)$assigned_courses[0]['class_id'];
}

// 2. Handle Attendance Submission POST
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'save_attendance') {
    $post_cs_id      = (int)($_POST['class_subject_id'] ?? 0);
    $post_class_id   = (int)($_POST['class_id'] ?? 0);
    $post_date       = trim($_POST['session_date'] ?? date('Y-m-d'));
    $post_period     = (int)($_POST['period_number'] ?? 1);
    $post_hours      = !empty($_POST['contact_hours']) ? (float)$_POST['contact_hours'] : 1.00;
    $attendance_data = $_POST['attendance'] ?? [];

    if ($post_cs_id <= 0 || $post_class_id <= 0 || empty($post_date) || empty($attendance_data)) {
        $error = 'Invalid submission. Please ensure students are enrolled and marks are provided.';
    } else {
        try {
            $db->beginTransaction();

            // Find or create the class session
            $sess_find = $db->prepare("
                SELECT id FROM class_sessions 
                WHERE class_id = ? AND class_subject_id = ? AND session_date = ? AND period_number = ?
                LIMIT 1
            ");
            $sess_find->execute([$post_class_id, $post_cs_id, $post_date, $post_period]);
            $existing_sess = $sess_find->fetch();

            $current_session_id = null;
            if ($existing_sess) {
                $current_session_id = (int)$existing_sess['id'];
                // Update conducted teacher and contact hours
                $up_s = $db->prepare("
                    UPDATE class_sessions 
                    SET conducted_by_teacher_id = ?, contact_hours = ?, status = 'CONDUCTED', updated_at = NOW() 
                    WHERE id = ?
                ");
                $up_s->execute([$teacher_id, $post_hours, $current_session_id]);
            } else {
                // Get assigned teacher for this class_subject
                $as_t = $db->prepare("SELECT teacher_id FROM class_subjects WHERE id = ?");
                $as_t->execute([$post_cs_id]);
                $as_t_row = $as_t->fetch();
                $assigned_t_id = $as_t_row ? (int)$as_t_row['teacher_id'] : $teacher_id;

                $ins_s = $db->prepare("
                    INSERT INTO class_sessions 
                    (class_id, class_subject_id, session_date, period_number, assigned_teacher_id, conducted_by_teacher_id, contact_hours, status, source, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'CONDUCTED', 'DIRECT_ENTRY', NOW(), NOW())
                ");
                $ins_s->execute([$post_class_id, $post_cs_id, $post_date, $post_period, $assigned_t_id, $teacher_id, $post_hours]);
                $current_session_id = (int)$db->lastInsertId();
            }

            // Save individual attendance records
            $att_stmt = $db->prepare("
                INSERT INTO attendance_records (class_session_id, student_id, status, marked_by, marked_at, updated_at)
                VALUES (?, ?, ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                    status = VALUES(status), 
                    marked_by = VALUES(marked_by), 
                    updated_at = NOW()
            ");

            $present_count = 0;
            $total_count = 0;

            foreach ($attendance_data as $stu_id => $status) {
                $stu_id = (int)$stu_id;
                $status = ($status === 'PRESENT') ? 'PRESENT' : 'ABSENT';
                $att_stmt->execute([$current_session_id, $stu_id, $status, $user['id']]);
                
                $total_count++;
                if ($status === 'PRESENT') $present_count++;
            }

            $db->commit();
            set_flash('success', "Attendance successfully saved! ({$present_count} Present of {$total_count} students marked on {$post_date}, Period {$post_period}).");
            header('Location: ' . base_url('faculty/attendance_history.php'));
            exit;

        } catch (Exception $e) {
            $db->rollBack();
            $error = 'Failed to record attendance: ' . $e->getMessage();
        }
    }
}

// 3. If a Course is Selected, Fetch Students & Existing Marks
$students = [];
$existing_marks = [];
$selected_course_info = null;

if ($selected_cs_id > 0) {
    foreach ($assigned_courses as $ac) {
        if ((int)$ac['class_subject_id'] === $selected_cs_id) {
            $selected_course_info = $ac;
            $selected_class_id = (int)$ac['class_id'];
            break;
        }
    }

    if ($selected_class_id > 0) {
        // Fetch active enrolled students
        $stu_stmt = $db->prepare("
            SELECT s.id, s.student_id, s.admission_number, s.first_name, s.last_name
            FROM students s
            JOIN student_enrollments se ON s.id = se.student_id
            WHERE se.class_id = ? AND se.status = 'ACTIVE' AND s.status = 'ACTIVE'
            ORDER BY CAST(s.student_id AS UNSIGNED) ASC, s.student_id ASC
        ");
        $stu_stmt->execute([$selected_class_id]);
        $students = $stu_stmt->fetchAll();

        // Check if session exists on this date and period to pre-fill marks
        $chk_sess = $db->prepare("
            SELECT id FROM class_sessions 
            WHERE class_id = ? AND class_subject_id = ? AND session_date = ? AND period_number = ?
            LIMIT 1
        ");
        $chk_sess->execute([$selected_class_id, $selected_cs_id, $session_date, $period_number]);
        $found_sess = $chk_sess->fetch();

        if ($found_sess) {
            $marks_stmt = $db->prepare("SELECT student_id, status FROM attendance_records WHERE class_session_id = ?");
            $marks_stmt->execute([$found_sess['id']]);
            while ($m = $marks_stmt->fetch()) {
                $existing_marks[(int)$m['student_id']] = $m['status'];
            }
        }
    }
}
?>

<div class="page-header">
    <div>
        <h1 class="page-title">Class Attendance Tracker</h1>
        <p class="page-subtitle">Mark present/absent status for students with instantaneous database persistence</p>
    </div>
    <div>
        <a href="<?= base_url('faculty/attendance_history.php') ?>" class="btn btn-secondary">📜 View Past Sessions</a>
    </div>
</div>

<?php if ($error): ?>
    <div class="alert alert-error">
        <div><?= e($error) ?></div>
    </div>
<?php endif; ?>

<!-- Step 1: Session Selector Card -->
<div class="card" style="margin-bottom: 1.5rem;">
    <div class="card-header">
        <h2 class="card-title">1. Select Class, Subject, Date & Period</h2>
    </div>
    <div class="card-body">
        <form method="GET" action="<?= base_url('faculty/take_attendance.php') ?>" style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end;">
            <div style="flex: 2; min-width: 280px;">
                <label class="form-label">Course & Class Section <span class="required">*</span></label>
                <select name="class_subject_id" class="form-control" required onchange="this.form.submit()">
                    <option value="">-- Choose Assigned Course --</option>
                    <?php foreach ($assigned_courses as $c): ?>
                        <option value="<?= $c['class_subject_id'] ?>" <?= ($selected_cs_id === (int)$c['class_subject_id']) ? 'selected' : '' ?>>
                            <?= e($c['class_code']) ?> &bull; <?= e($c['subject_code']) ?>: <?= e($c['subject_name']) ?>
                            <?= has_role(['ADMINISTRATION', 'ADMIN']) ? " ({$c['teacher_name']})" : '' ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div style="flex: 1; min-width: 150px;">
                <label class="form-label">Session Date <span class="required">*</span></label>
                <input type="date" name="session_date" class="form-control" required value="<?= e($session_date) ?>" onchange="this.form.submit()">
            </div>

            <div style="flex: 1; min-width: 120px;">
                <label class="form-label">Period <span class="required">*</span></label>
                <select name="period" class="form-control" onchange="this.form.submit()">
                    <?php for ($p = 1; $p <= 8; $p++): ?>
                        <option value="<?= $p ?>" <?= ($period_number === $p) ? 'selected' : '' ?>>Period <?= $p ?></option>
                    <?php endfor; ?>
                </select>
            </div>

            <div>
                <button type="submit" class="btn btn-primary">Load Class &rarr;</button>
            </div>
        </form>
    </div>
</div>

<!-- Step 2: Student Attendance Roster -->
<?php if ($selected_cs_id > 0 && $selected_course_info): ?>
    <form method="POST" action="<?= base_url('faculty/take_attendance.php') ?>">
        <input type="hidden" name="action" value="save_attendance">
        <input type="hidden" name="class_subject_id" value="<?= $selected_cs_id ?>">
        <input type="hidden" name="class_id" value="<?= $selected_class_id ?>">
        <input type="hidden" name="session_date" value="<?= e($session_date) ?>">
        <input type="hidden" name="period_number" value="<?= $period_number ?>">

        <div class="card">
            <div class="card-header" style="flex-wrap: wrap; gap: 0.75rem;">
                <div>
                    <h2 class="card-title">
                        2. Attendance Roster: <?= e($selected_course_info['class_code']) ?> &mdash; <?= e($selected_course_info['subject_code']) ?> (<?= e($selected_course_info['subject_name']) ?>)
                    </h2>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.2rem;">
                        Date: <strong><?= format_date($session_date) ?></strong> &bull; Period: <strong><?= $period_number ?></strong> &bull; 
                        Enrolled: <strong><?= count($students) ?> students</strong>
                    </p>
                </div>

                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <button type="button" id="btn-mark-all-present" class="btn btn-success btn-sm">
                        ✓ Mark All Present
                    </button>
                    <button type="button" id="btn-mark-all-absent" class="btn btn-danger btn-sm">
                        ✗ Mark All Absent
                    </button>
                </div>
            </div>

            <div class="card-body" style="padding: 0;">
                <?php if (empty($students)): ?>
                    <div style="padding: 3rem; text-align: center; color: var(--text-muted);">
                        <p style="font-size: 1.1rem; font-weight: 600;">No active students enrolled in this class section yet.</p>
                        <p style="font-size: 0.9rem; margin-top: 0.5rem;">
                            Ask your HOD or Admin to enroll students via the "Enroll Students" portal.
                        </p>
                    </div>
                <?php else: ?>
                    <div class="table-responsive">
                        <table class="data-table" id="attendance-roster-table">
                            <thead>
                                <tr>
                                    <th style="width: 80px;">#</th>
                                    <th>Roll No</th>
                                    <th>Admission No</th>
                                    <th>Student Full Name</th>
                                    <th style="text-align: center; width: 220px;">Attendance Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php $counter = 1; ?>
                                <?php foreach ($students as $stu): ?>
                                    <?php 
                                        // Default status: if already recorded, use existing; else default to PRESENT
                                        $cur_status = $existing_marks[$stu['id']] ?? 'PRESENT';
                                        $is_present = ($cur_status === 'PRESENT');
                                    ?>
                                    <tr>
                                        <td style="color: var(--text-muted);"><?= $counter++ ?></td>
                                        <td><strong><?= e($stu['student_id']) ?></strong></td>
                                        <td><code><?= e($stu['admission_number'] ?: '—') ?></code></td>
                                        <td>
                                            <strong><?= e($stu['first_name'] . ' ' . ($stu['last_name'] ?? '')) ?></strong>
                                        </td>
                                        <td style="text-align: center;">
                                            <!-- Standard Hidden Radio for form submission without JS -->
                                            <input type="radio" id="present_<?= $stu['id'] ?>" name="attendance[<?= $stu['id'] ?>]" value="PRESENT" <?= $is_present ? 'checked' : '' ?> style="display:none;">
                                            <input type="radio" id="absent_<?= $stu['id'] ?>" name="attendance[<?= $stu['id'] ?>]" value="ABSENT" <?= !$is_present ? 'checked' : '' ?> style="display:none;">

                                            <!-- Interactive Toggle Buttons -->
                                            <div class="attendance-toggle-group">
                                                <button type="button" 
                                                        class="attendance-toggle <?= $is_present ? 'active-present' : '' ?>" 
                                                        data-student-id="<?= $stu['id'] ?>" 
                                                        data-status="PRESENT">
                                                    PRESENT
                                                </button>
                                                <button type="button" 
                                                        class="attendance-toggle <?= !$is_present ? 'active-absent' : '' ?>" 
                                                        data-student-id="<?= $stu['id'] ?>" 
                                                        data-status="ABSENT">
                                                    ABSENT
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>

                    <div class="card-footer" style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-size: 0.85rem; color: var(--text-secondary);">
                            ℹ️ Review attendance marks above, then click submit to store in MySQL database.
                        </div>
                        <button type="submit" class="btn btn-primary" style="padding: 0.75rem 1.75rem; font-size: 1rem;">
                            💾 Save & Record Attendance &rarr;
                        </button>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </form>
<?php else: ?>
    <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">👆</div>
        <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">Select an Assigned Course to Begin</h3>
        <p style="color: var(--text-secondary); max-width: 500px; margin: 0 auto;">
            Choose your class section and course from the dropdown above to load the registered student roster and record today's attendance.
        </p>
    </div>
<?php endif; ?>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
