export interface AttendanceRecord {
  id: number;
  class_session_id: number;
  student_id: number;
  status: 'PRESENT' | 'ABSENT';
  marked_by: number;
  marked_at: Date;
  updated_at: Date;
}

export interface AttendanceAuditLog {
  id: number;
  attendance_record_id: number;
  student_id: number;
  class_session_id: number;
  changed_by: number;
  old_status: string;
  new_status: string;
  reason?: string;
  changed_at: Date;
}
