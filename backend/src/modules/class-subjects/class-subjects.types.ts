export interface ClassSubject {
  id: number;
  class_id: number;
  subject_id: number;
  teacher_id: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
