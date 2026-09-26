export interface HodAssignment {
  id: number;
  department_id: number;
  teacher_id: number;
  academic_year_id: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: Date;
}
