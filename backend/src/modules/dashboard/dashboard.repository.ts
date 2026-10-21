import { pool } from '../../db/pool';

export const getAdministrationStats = async () => {
  const [countsResult, attendanceResult, atRiskListResult, missedClassesListResult] = await Promise.all([
    pool.query(`
      SELECT
        (SELECT name FROM academic_years WHERE is_active = TRUE LIMIT 1) as academic_year,
        (SELECT COUNT(*) FROM departments) as departments,
        (SELECT COUNT(*) FROM classes WHERE is_active = TRUE) as active_classes,
        (SELECT COUNT(*) FROM students WHERE status = 'ACTIVE') as active_students,
        (SELECT COUNT(*) FROM teachers WHERE status = 'ACTIVE') as active_teachers,
        (SELECT COUNT(*) FROM department_hod_assignments WHERE is_active = TRUE) as active_hods,
        (SELECT COUNT(*) FROM tutor_assignments WHERE is_active = TRUE) as active_tutors,
        (SELECT COUNT(*) FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'ADMINISTRATION')) as admins,
        (SELECT COUNT(*) FROM users WHERE is_active = FALSE) as inactive_users
    `),
    pool.query(`
      SELECT 
        COUNT(a.id) as total_overall,
        COALESCE(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), 0) as present_overall,
        COALESCE(SUM(CASE WHEN cs.session_date = CURDATE() THEN 1 ELSE 0 END), 0) as total_today,
        COALESCE(SUM(CASE WHEN cs.session_date = CURDATE() AND a.status = 'PRESENT' THEN 1 ELSE 0 END), 0) as present_today,
        COALESCE(SUM(CASE WHEN cs.session_date = CURDATE() AND a.status = 'ABSENT' THEN 1 ELSE 0 END), 0) as absent_today
      FROM attendance_records a
      JOIN class_sessions cs ON a.class_session_id = cs.id
      WHERE cs.status = 'CONDUCTED'
    `),
    pool.query(`
      SELECT 
        COALESCE(st.admission_number, st.student_id) as admission_number, 
        CONCAT(st.first_name, ' ', COALESCE(st.last_name, '')) as student_name,
        c.id as class_id,
        COALESCE(c.class_code, c.section_name, 'Unassigned') as class_name,
        COALESCE(s.name, CASE WHEN s.semester_number IS NOT NULL THEN CONCAT('Sem ', s.semester_number) ELSE 'N/A' END) as semester_name,
        s.semester_number,
        COUNT(a.id) as total_sessions, 
        SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present_sessions,
        ROUND((SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) / COUNT(a.id)) * 100, 1) as attendance_percentage
      FROM attendance_records a
      JOIN class_sessions cs ON a.class_session_id = cs.id
      JOIN students st ON a.student_id = st.id
      LEFT JOIN student_enrollments se ON st.id = se.student_id AND se.status = 'ACTIVE'
      LEFT JOIN classes c ON se.class_id = c.id
      LEFT JOIN semesters s ON c.semester_id = s.id
      WHERE cs.status = 'CONDUCTED'
      GROUP BY st.id, st.admission_number, st.student_id, st.first_name, st.last_name, c.id, c.class_code, c.section_name, s.name, s.semester_number
      HAVING total_sessions > 0 AND (SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) / COUNT(a.id)) < 0.75
      ORDER BY (SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) / COUNT(a.id)) ASC
      LIMIT 25
    `),
    pool.query(`
      SELECT c.class_code, c.section_name, s.name as semester_name, b.batch_name, b.department_id
      FROM classes c
      JOIN semesters s ON c.semester_id = s.id
      JOIN admission_batches b ON c.admission_batch_id = b.id
      WHERE c.is_active = TRUE 
      AND c.id NOT IN (
        SELECT DISTINCT class_id FROM class_sessions WHERE session_date = CURDATE() AND status = 'CONDUCTED'
      )
    `)
  ]);

  const [counts] = countsResult;
  const [attendance] = attendanceResult;
  const [atRiskList] = atRiskListResult;
  const [missedClassesList] = missedClassesListResult;

  const attRow = (attendance as any[])[0];
  const totalOverall = Number(attRow.total_overall);
  const presentOverall = Number(attRow.present_overall);
  const totalToday = Number(attRow.total_today);
  const presentToday = Number(attRow.present_today);
  const absentToday = Number(attRow.absent_today);

  return {
    kpis: {
      academic_year: (counts as any[])[0].academic_year || 'N/A',
      departments: (counts as any[])[0].departments,
      active_classes: (counts as any[])[0].active_classes,
      active_students: (counts as any[])[0].active_students,
      active_teachers: (counts as any[])[0].active_teachers,
      active_hods: (counts as any[])[0].active_hods,
      active_tutors: (counts as any[])[0].active_tutors,
      admins: (counts as any[])[0].admins,
      inactive_users: (counts as any[])[0].inactive_users,
      overall_attendance: totalOverall > 0 ? `${Math.round((presentOverall / totalOverall) * 100)}%` : '0%',
      todays_attendance: totalToday > 0 ? `${Math.round((presentToday / totalToday) * 100)}%` : 'N/A',
      absent_today: absentToday,
      students_at_risk: (atRiskList as any[]).length,
      classes_missing_attendance_today: (missedClassesList as any[]).length
    },
    lists: {
      at_risk_students: atRiskList,
      missed_classes: missedClassesList
    }
  };
};

export const getHodStats = async (departmentId: number, academicYearId: number) => {
  const [contextRowsResult, countsResult, attendanceResult, classesResult, attentionResult, allAcademicYearsResult] = await Promise.all([
    pool.query(
      'SELECT d.name as department_name, a.name as academic_year_name FROM departments d, academic_years a WHERE d.id = ? AND a.id = ?',
      [departmentId, academicYearId]
    ),
    pool.query(`
      SELECT
        (SELECT COUNT(c.id) FROM classes c JOIN semesters s ON c.semester_id = s.id JOIN admission_batches b ON c.admission_batch_id = b.id WHERE b.department_id = ? AND s.academic_year_id = ? AND c.is_active = TRUE) as active_classes,
        (SELECT COUNT(st.id) FROM students st JOIN student_enrollments se ON st.id = se.student_id JOIN classes c ON se.class_id = c.id JOIN semesters s ON c.semester_id = s.id JOIN admission_batches b ON c.admission_batch_id = b.id WHERE b.department_id = ? AND s.academic_year_id = ? AND st.status = 'ACTIVE' AND se.status = 'ACTIVE') as active_students,
        (SELECT COUNT(t.id) FROM teachers t WHERE t.department_id = ? AND t.status = 'ACTIVE') as active_teachers
    `, [departmentId, academicYearId, departmentId, academicYearId, departmentId]),
    pool.query(`
      SELECT 
        COUNT(a.id) as total_records,
        COALESCE(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), 0) as present_records
      FROM attendance_records a
      JOIN class_sessions cs ON a.class_session_id = cs.id
      JOIN classes c ON cs.class_id = c.id
      JOIN semesters s ON c.semester_id = s.id
      JOIN admission_batches b ON c.admission_batch_id = b.id
      WHERE cs.status = 'CONDUCTED' AND b.department_id = ? AND s.academic_year_id = ?
    `, [departmentId, academicYearId]),
    pool.query(`
      SELECT 
        c.id, CONCAT(b.batch_name, ' - ', s.name, ' - ', c.section_name) as name,
        (SELECT COUNT(*) FROM student_enrollments se WHERE se.class_id = c.id AND se.status = 'ACTIVE') as student_count,
        COUNT(a.id) as total_records,
        COALESCE(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), 0) as present_records
      FROM classes c
      JOIN semesters s ON c.semester_id = s.id
      JOIN admission_batches b ON c.admission_batch_id = b.id
      LEFT JOIN class_sessions cs ON cs.class_id = c.id AND cs.status = 'CONDUCTED'
      LEFT JOIN attendance_records a ON a.class_session_id = cs.id
      WHERE b.department_id = ? AND s.academic_year_id = ? AND c.is_active = TRUE
      GROUP BY c.id, b.batch_name, s.name, c.section_name
      ORDER BY b.batch_name ASC, s.name ASC, c.section_name ASC
    `, [departmentId, academicYearId]),
    pool.query(`
      SELECT 
        st.id, st.first_name, st.last_name, CONCAT(b.batch_name, ' - ', s.name, ' - ', c.section_name) as class_name,
        COUNT(a.id) as total_records,
        COALESCE(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), 0) as present_records
      FROM students st
      JOIN student_enrollments se ON st.id = se.student_id AND se.status = 'ACTIVE'
      JOIN classes c ON se.class_id = c.id
      JOIN semesters s ON c.semester_id = s.id
      JOIN admission_batches b ON c.admission_batch_id = b.id
      JOIN attendance_records a ON a.student_id = st.id
      JOIN class_sessions cs ON a.class_session_id = cs.id AND cs.status = 'CONDUCTED'
      WHERE b.department_id = ? AND s.academic_year_id = ? AND st.status = 'ACTIVE'
      GROUP BY st.id, st.first_name, st.last_name, class_name
      HAVING total_records > 0 AND (SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) / COUNT(a.id)) < 0.75
      ORDER BY (SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) / COUNT(a.id)) ASC
      LIMIT 10
    `, [departmentId, academicYearId]),
    pool.query('SELECT id, name FROM academic_years ORDER BY id DESC')
  ]);

  const [contextRows] = contextRowsResult;
  const context = (contextRows as any[])[0];
  const [counts] = countsResult;
  const [attendance] = attendanceResult;
  const [classes] = classesResult;
  const [attention] = attentionResult;
  const [allAcademicYears] = allAcademicYearsResult;

  return {
    context: context,
    academic_years: allAcademicYears as any[],
    counts: (counts as any[])[0],
    attendanceOverview: (attendance as any[])[0],
    classes: classes as any[],
    attention: attention as any[]
  };
};

export const getHodTeachersByClass = async (departmentId: number, academicYearId: number) => {
  // Get all classes in the department for the selected academic year
  const [classes] = await pool.query(`
    SELECT 
      c.id as class_id,
      CONCAT(b.batch_name, ' - ', s.name, ' - ', c.section_name) as class_name,
      c.section_name,
      b.batch_name,
      s.name as semester_name
    FROM classes c
    JOIN semesters s ON c.semester_id = s.id
    JOIN admission_batches b ON c.admission_batch_id = b.id
    WHERE b.department_id = ? AND s.academic_year_id = ? AND c.is_active = TRUE
    ORDER BY b.batch_name ASC, s.name ASC, c.section_name ASC
  `, [departmentId, academicYearId]);

  // Get all teacher-subject assignments for those classes
  const [assignments] = await pool.query(`
    SELECT 
      cs.class_id,
      t.id as teacher_id,
      CONCAT(t.first_name, ' ', COALESCE(t.last_name, '')) as teacher_name,
      t.status as teacher_status,
      sub.name as subject_name,
      sub.code as subject_code,
      cs.is_active
    FROM class_subjects cs
    JOIN teachers t ON cs.teacher_id = t.id
    JOIN subjects sub ON cs.subject_id = sub.id
    JOIN classes c ON cs.class_id = c.id
    JOIN semesters s ON c.semester_id = s.id
    JOIN admission_batches b ON c.admission_batch_id = b.id
    WHERE b.department_id = ? AND s.academic_year_id = ? AND cs.is_active = TRUE
    ORDER BY cs.class_id, sub.name ASC
  `, [departmentId, academicYearId]);

  return {
    classes: classes as any[],
    assignments: assignments as any[]
  };
};

export const getTutorStats = async (classId: number) => {
  const [counts] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM student_enrollments WHERE class_id = ? AND status = 'ACTIVE') as active_students
  `, [classId]);
  
  const [attendance] = await pool.query(`
    SELECT 
      COUNT(a.id) as total_records,
      COALESCE(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), 0) as present_records
    FROM attendance_records a
    JOIN class_sessions cs ON a.class_session_id = cs.id
    WHERE cs.status = 'CONDUCTED' AND cs.class_id = ?
  `, [classId]);

  const [recentSessions] = await pool.query(`
    SELECT id, session_date, period_number, status
    FROM class_sessions
    WHERE class_id = ?
    ORDER BY session_date DESC, period_number DESC
    LIMIT 5
  `, [classId]);

  return {
    counts: (counts as any[])[0],
    attendanceOverview: (attendance as any[])[0],
    recentSessions: recentSessions as any[]
  };
};

export const getTutorStudents = async (classId: number) => {
  const [students] = await pool.query(`
    SELECT
      s.id as student_id,
      s.student_id as admission_number,
      CONCAT(s.first_name, ' ', COALESCE(s.last_name, '')) as student_name,
      COUNT(a.id) as total_records,
      COALESCE(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), 0) as present_records
    FROM students s
    JOIN student_enrollments se ON se.student_id = s.id AND se.status = 'ACTIVE'
    LEFT JOIN class_sessions cs ON cs.class_id = ? AND cs.status = 'CONDUCTED'
    LEFT JOIN attendance_records a ON a.student_id = s.id AND a.class_session_id = cs.id
    WHERE se.class_id = ? AND s.status = 'ACTIVE'
    GROUP BY s.id, s.student_id, s.first_name, s.last_name
    ORDER BY s.student_id ASC
  `, [classId, classId]);

  const [timetable] = await pool.query(`
    SELECT 
      rte.id, rte.day_of_week, rte.period_number,
      sub.name as subject_name, sub.code as subject_code,
      CONCAT(t.first_name, ' ', COALESCE(t.last_name, '')) as teacher_name
    FROM regular_timetable_entries rte
    JOIN class_subjects cs ON rte.class_subject_id = cs.id
    JOIN subjects sub ON cs.subject_id = sub.id
    JOIN teachers t ON cs.teacher_id = t.id
    WHERE rte.class_id = ? AND rte.is_active = TRUE
    ORDER BY rte.day_of_week ASC, rte.period_number ASC
  `, [classId]);

  return {
    classId,
    students: students as any[],
    timetable: timetable as any[]
  };
};

export const getTeacherStats = async (teacherId: number) => {
  const [counts] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM class_subjects WHERE teacher_id = ? AND is_active = TRUE) as assigned_subjects,
      (SELECT COUNT(*) FROM class_sessions WHERE conducted_by_teacher_id = ?) as conducted_sessions
  `, [teacherId, teacherId]);

  const [attendance] = await pool.query(`
    SELECT 
      COUNT(a.id) as total_records,
      COALESCE(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), 0) as present_records
    FROM attendance_records a
    JOIN class_sessions cs ON a.class_session_id = cs.id
    WHERE cs.status = 'CONDUCTED' AND cs.conducted_by_teacher_id = ?
  `, [teacherId]);

  const [classes] = await pool.query(`
    SELECT DISTINCT
      c.id, b.batch_name, c.section_name, sem.name as semester_name, c.is_active as status
    FROM classes c
    JOIN admission_batches b ON c.admission_batch_id = b.id
    JOIN class_subjects cs ON cs.class_id = c.id
    JOIN semesters sem ON c.semester_id = sem.id
    WHERE cs.teacher_id = ? AND cs.is_active = TRUE
  `, [teacherId]);

  const [assignments] = await pool.query(`
    SELECT 
      cs.id as class_subject_id, cs.class_id, cs.subject_id, cs.is_active, cs.teacher_id
    FROM class_subjects cs
    WHERE cs.teacher_id = ? AND cs.is_active = TRUE
  `, [teacherId]);

  const [teacherRows] = await pool.query(
    'SELECT id, user_id, teacher_id, first_name, last_name, designation, status FROM teachers WHERE id = ?',
    [teacherId]
  );
  const teacher = (teacherRows as any[])[0] || { id: teacherId };

  const [pendingSwaps] = await pool.query(`
    SELECT ts.*, 
           rt.first_name as req_first_name, rt.last_name as req_last_name,
           rs.name as req_sub_name, ts2.name as tgt_sub_name,
           rc.class_code as req_class_code, rc.section_name as req_section_name,
           tc.class_code as tgt_class_code, tc.section_name as tgt_section_name
    FROM timetable_swaps ts
    JOIN teachers rt ON ts.requesting_teacher_id = rt.id
    LEFT JOIN class_subjects rcs ON ts.requesting_class_subject_id = rcs.id
    LEFT JOIN class_subjects tcs ON ts.target_class_subject_id = tcs.id
    LEFT JOIN subjects rs ON rcs.subject_id = rs.id
    LEFT JOIN subjects ts2 ON tcs.subject_id = ts2.id
    LEFT JOIN classes rc ON rcs.class_id = rc.id
    LEFT JOIN classes tc ON tcs.class_id = tc.id
    WHERE ts.target_teacher_id = ? AND ts.status = 'PENDING'
    ORDER BY ts.created_at DESC
  `, [teacherId]);

  const baseCounts = (counts as any[])[0] || {};

  return {
    teacher,
    counts: {
      ...baseCounts,
      pending_swap_requests: (pendingSwaps as any[]).length
    },
    attendanceOverview: (attendance as any[])[0],
    classes: classes as any[],
    assignments: assignments as any[],
    pendingSwaps: pendingSwaps as any[]
  };
};

export const getTeacherTimetable = async (teacherId: number) => {
  const [timetable] = await pool.query(`
    SELECT 
      rte.id, rte.day_of_week, rte.period_number, rte.class_id, rte.class_subject_id, rte.is_active,
      sub.name as subject_name, sub.code as subject_code,
      CONCAT(b.batch_name, ' - ', sem.name, ' - ', c.section_name) as class_name
    FROM regular_timetable_entries rte
    JOIN class_subjects cs ON rte.class_subject_id = cs.id
    JOIN subjects sub ON cs.subject_id = sub.id
    JOIN classes c ON rte.class_id = c.id
    JOIN semesters sem ON c.semester_id = sem.id
    JOIN admission_batches b ON c.admission_batch_id = b.id
    WHERE cs.teacher_id = ? AND rte.is_active = TRUE
    ORDER BY rte.day_of_week ASC, rte.period_number ASC
  `, [teacherId]);

  return timetable as any[];
};

export const getTeacherSessions = async (teacherId: number) => {
  const [sessions] = await pool.query(`
    SELECT 
      cs.id, cs.session_date, cs.period_number, cs.status,
      CONCAT(b.batch_name, ' - ', sem.name, ' - ', c.section_name) as class_name,
      sub.name as subject_name, sub.code as subject_code,
      (SELECT COUNT(*) FROM attendance_records WHERE class_session_id = cs.id) as total_attendance
    FROM class_sessions cs
    JOIN classes c ON cs.class_id = c.id
    JOIN semesters sem ON c.semester_id = sem.id
    JOIN admission_batches b ON c.admission_batch_id = b.id
    JOIN class_subjects csub ON cs.class_subject_id = csub.id
    JOIN subjects sub ON csub.subject_id = sub.id
    WHERE cs.conducted_by_teacher_id = ?
    ORDER BY cs.session_date DESC, cs.period_number DESC
    LIMIT 20
  `, [teacherId]);

  return sessions as any[];
};


export const getStudentStats = async (studentId: number) => {
  // Get the student's active class enrollment
  const [enrollmentRows] = await pool.query(
    'SELECT class_id FROM student_enrollments WHERE student_id = ? AND status = ? ORDER BY start_date DESC LIMIT 1',
    [studentId, 'ACTIVE']
  );
  const classId = (enrollmentRows as any[])[0]?.class_id || null;

  const [attendance] = await pool.query(`
    SELECT 
      COUNT(a.id) as total_records,
      COALESCE(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), 0) as present_records
    FROM attendance_records a
    JOIN class_sessions cs ON a.class_session_id = cs.id
    WHERE cs.status = 'CONDUCTED' AND a.student_id = ?
  `, [studentId]);

  const [recentAttendance] = await pool.query(`
    SELECT a.status, cs.session_date, cs.period_number, sub.name as subject_name
    FROM attendance_records a
    JOIN class_sessions cs ON a.class_session_id = cs.id
    JOIN class_subjects csj ON cs.class_subject_id = csj.id
    JOIN subjects sub ON csj.subject_id = sub.id
    WHERE a.student_id = ? AND cs.status = 'CONDUCTED'
    ORDER BY cs.session_date DESC, cs.period_number DESC
    LIMIT 10
  `, [studentId]);

  // Subject-wise attendance
  let subjectAttendance: any[] = [];
  if (classId) {
    const [rows] = await pool.query(`
      SELECT 
        sub.id as subject_id,
        sub.name as subject_name,
        sub.code as subject_code,
        COUNT(cs.id) as total_sessions,
        SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present_sessions,
        SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) as absent_sessions
      FROM class_subjects csj
      JOIN subjects sub ON csj.subject_id = sub.id
      LEFT JOIN class_sessions cs ON cs.class_subject_id = csj.id AND cs.status = 'CONDUCTED'
      LEFT JOIN attendance_records a ON a.class_session_id = cs.id AND a.student_id = ?
      WHERE csj.class_id = ? AND csj.is_active = TRUE
      GROUP BY sub.id, sub.name, sub.code
      HAVING COUNT(cs.id) > 0
      ORDER BY sub.name ASC
    `, [studentId, classId]);
    subjectAttendance = rows as any[];
  } else {
    // Fallback if classId not found (e.g. graduated student)
    const [rows] = await pool.query(`
      SELECT 
        sub.id as subject_id,
        sub.name as subject_name,
        sub.code as subject_code,
        COUNT(a.id) as total_sessions,
        SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as present_sessions,
        SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) as absent_sessions
      FROM attendance_records a
      JOIN class_sessions cs ON a.class_session_id = cs.id
      JOIN class_subjects csj ON cs.class_subject_id = csj.id
      JOIN subjects sub ON csj.subject_id = sub.id
      WHERE a.student_id = ? AND cs.status = 'CONDUCTED'
      GROUP BY sub.id, sub.name, sub.code
      ORDER BY sub.name ASC
    `, [studentId]);
    subjectAttendance = rows as any[];
  }

  const requiredPercentage = 75.00;
  const total = Number((attendance as any[])[0]?.total_records || 0);
  const present = Number((attendance as any[])[0]?.present_records || 0);
  const currentPercentage = total > 0 ? (present / total) * 100 : 0;

  return {
    classId,
    attendance: {
      total_records: total,
      present_records: present,
      current_percentage: currentPercentage,
      required_percentage: requiredPercentage,
      warning_status: currentPercentage < requiredPercentage
    },
    subjectAttendance: subjectAttendance as any[],
    recentAttendance: recentAttendance as any[]
  };
};

export const getStudentTimetable = async (classId: number) => {
  const [classInfo] = await pool.query('SELECT class_code, section_name FROM classes WHERE id = ?', [classId]);
  const cInfo = (classInfo as any[])[0];
  const className = cInfo ? (cInfo.class_code || cInfo.section_name) : 'Unknown Class';

  const [entries] = await pool.query(`
    SELECT 
      rte.id, rte.day_of_week, rte.period_number,
      sub.name as subject_name, sub.code as subject_code,
      CONCAT(t.first_name, ' ', COALESCE(t.last_name, '')) as teacher_name
    FROM regular_timetable_entries rte
    JOIN class_subjects cs ON rte.class_subject_id = cs.id
    JOIN subjects sub ON cs.subject_id = sub.id
    JOIN teachers t ON cs.teacher_id = t.id
    WHERE rte.class_id = ? AND rte.is_active = TRUE
    ORDER BY rte.day_of_week ASC, rte.period_number ASC
  `, [classId]);
  return { class_name: className, timetable: entries as any[] };
};
