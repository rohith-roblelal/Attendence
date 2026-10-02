import { pool } from '../../db/pool';
import { Connection } from 'mysql2/promise';

export const createSwapRequest = async (data: any) => {
  const [res] = await pool.query(
    `INSERT INTO timetable_swaps (
      requesting_teacher_id, target_teacher_id, swap_date, 
      requesting_class_subject_id, requesting_period_number,
      target_class_subject_id, target_period_number,
      status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', NOW(), NOW())`,
    [
      data.requesting_teacher_id, data.target_teacher_id, data.swap_date,
      data.requesting_class_subject_id, data.requesting_period_number,
      data.target_class_subject_id, data.target_period_number
    ]
  );
  return (res as any).insertId;
};

export const getSwapsForTeacher = async (teacherId: number) => {
  const [rows] = await pool.query(
    `SELECT ts.*, 
            rt.first_name as req_first_name, rt.last_name as req_last_name,
            tt.first_name as tgt_first_name, tt.last_name as tgt_last_name,
            rcs.class_id as req_class_id, tcs.class_id as tgt_class_id,
            rs.name as req_sub_name, ts2.name as tgt_sub_name,
            rc.class_code as req_class_code, rc.section_name as req_section_name,
            tc.class_code as tgt_class_code, tc.section_name as tgt_section_name
     FROM timetable_swaps ts
     JOIN teachers rt ON ts.requesting_teacher_id = rt.id
     JOIN teachers tt ON ts.target_teacher_id = tt.id
     LEFT JOIN class_subjects rcs ON ts.requesting_class_subject_id = rcs.id
     LEFT JOIN class_subjects tcs ON ts.target_class_subject_id = tcs.id
     LEFT JOIN subjects rs ON rcs.subject_id = rs.id
     LEFT JOIN subjects ts2 ON tcs.subject_id = ts2.id
     LEFT JOIN classes rc ON rcs.class_id = rc.id
     LEFT JOIN classes tc ON tcs.class_id = tc.id
     WHERE ts.requesting_teacher_id = ? OR ts.target_teacher_id = ?
     ORDER BY ts.created_at DESC`,
    [teacherId, teacherId]
  );
  return rows;
};

export const getSwapById = async (id: number) => {
  const [rows] = await pool.query('SELECT * FROM timetable_swaps WHERE id = ?', [id]);
  return (rows as any[])[0] || null;
};

export const updateSwapStatus = async (id: number, status: string) => {
  await pool.query('UPDATE timetable_swaps SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
};

// Also we need to get class_id for daily changes
export const getClassSubjectInfo = async (classSubjectId: number) => {
  const [rows] = await pool.query('SELECT class_id, subject_id, teacher_id FROM class_subjects WHERE id = ?', [classSubjectId]);
  return (rows as any[])[0] || null;
};
