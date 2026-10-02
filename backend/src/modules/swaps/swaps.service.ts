import * as repo from './swaps.repository';
import { pool } from '../../db/pool';

export const createSwapRequest = async (data: any, teacherId: number) => {
  if (data.requesting_teacher_id !== teacherId) {
    throw { status: 403, message: 'You can only request swaps for yourself' };
  }
  const id = await repo.createSwapRequest(data);
  return await repo.getSwapById(id);
};

export const getMySwaps = async (teacherId: number) => {
  return await repo.getSwapsForTeacher(teacherId);
};

export const respondToSwap = async (id: number, status: string, teacherId: number, userId: number) => {
  const swap = await repo.getSwapById(id);
  if (!swap) throw { status: 404, message: 'Swap request not found' };
  
  if (swap.target_teacher_id !== teacherId) {
    throw { status: 403, message: 'You can only respond to swaps requested of you' };
  }
  if (swap.status !== 'PENDING') {
    throw { status: 400, message: 'Swap is already ' + swap.status };
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query('UPDATE timetable_swaps SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);

    if (status === 'APPROVED') {
      const reqInfo = await repo.getClassSubjectInfo(swap.requesting_class_subject_id);
      const tgtInfo = await repo.getClassSubjectInfo(swap.target_class_subject_id);

      // Create daily change 1: Requesting teacher's period becomes Target teacher's subject
      await connection.query(
        `INSERT INTO daily_timetable_changes (
          class_id, change_date, original_period, new_period, 
          original_class_subject_id, new_class_subject_id, change_type, reason, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, NULL, ?, ?, 'SUBSTITUTION', 'Approved Swap', ?, NOW(), NOW())`,
        [
          reqInfo.class_id, swap.swap_date, swap.requesting_period_number, 
          swap.requesting_class_subject_id, swap.target_class_subject_id, userId
        ]
      );

      // Create daily change 2: Target teacher's period becomes Requesting teacher's subject
      await connection.query(
        `INSERT INTO daily_timetable_changes (
          class_id, change_date, original_period, new_period, 
          original_class_subject_id, new_class_subject_id, change_type, reason, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, NULL, ?, ?, 'SUBSTITUTION', 'Approved Swap', ?, NOW(), NOW())`,
        [
          tgtInfo.class_id, swap.swap_date, swap.target_period_number, 
          swap.target_class_subject_id, swap.requesting_class_subject_id, userId
        ]
      );
    }

    await connection.commit();
    return await repo.getSwapById(id);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};
