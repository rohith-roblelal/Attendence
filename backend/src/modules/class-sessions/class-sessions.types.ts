export interface ClassSession {
  id: number;
  class_id: number;
  class_subject_id: number;
  session_date: string;
  period_number: number;
  assigned_teacher_id: number;
  conducted_by_teacher_id: number;
  contact_hours: number;
  status: string;
  source: string;
  created_at: Date;
  updated_at: Date;
}
