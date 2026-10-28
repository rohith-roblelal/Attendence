<?php
/**
 * Administrator - Delete Student Record
 */

require_once __DIR__ . '/../includes/functions.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/db.php';

require_role(['ADMINISTRATION', 'ADMIN']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    set_flash('error', 'Invalid request method.');
    header('Location: ' . base_url('admin/students.php'));
    exit;
}

$student_id_param = isset($_POST['id']) && is_numeric($_POST['id']) ? (int)$_POST['id'] : 0;

if ($student_id_param <= 0) {
    set_flash('error', 'Invalid student identifier.');
    header('Location: ' . base_url('admin/students.php'));
    exit;
}

$db = get_db();

try {
    $db->beginTransaction();

    // 1. Fetch Student details to get user_id and name
    $stmt = $db->prepare("SELECT id, user_id, student_id, first_name, last_name FROM students WHERE id = ?");
    $stmt->execute([$student_id_param]);
    $student = $stmt->fetch();

    if (!$student) {
        throw new Exception("Student not found in database.");
    }

    $fullName = trim($student['first_name'] . ' ' . ($student['last_name'] ?? ''));
    $rollNo = $student['student_id'];
    $userId = (int)$student['user_id'];

    // 2. Delete related attendance audit logs for this student's records
    $db->prepare("
        DELETE al FROM attendance_audit_logs al
        JOIN attendance_records ar ON al.attendance_record_id = ar.id
        WHERE ar.student_id = ?
    ")->execute([$student_id_param]);

    // 3. Delete attendance records
    $db->prepare("DELETE FROM attendance_records WHERE student_id = ?")->execute([$student_id_param]);

    // 4. Delete student enrollments
    $db->prepare("DELETE FROM student_enrollments WHERE student_id = ?")->execute([$student_id_param]);

    // 5. Delete the student profile record
    $db->prepare("DELETE FROM students WHERE id = ?")->execute([$student_id_param]);

    // 6. Delete the associated user login account if not admin
    if ($userId > 1) {
        $db->prepare("DELETE FROM users WHERE id = ? AND username != 'admin'")->execute([$userId]);
    }

    $db->commit();
    set_flash('success', "Student '{$fullName}' ({$rollNo}) and login account successfully deleted from database.");
} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    set_flash('error', "Failed to delete student: " . $e->getMessage());
}

header('Location: ' . base_url('admin/students.php'));
exit;
