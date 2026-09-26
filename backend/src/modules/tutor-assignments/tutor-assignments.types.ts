export interface TutorAssignment {
  id: number;
  class_id: number;
  teacher_id: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  assigned_by: number | null;
  created_at: Date;
}
