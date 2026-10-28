export interface RegularTimetableEntry {
  id: number;
  class_id: number;
  day_of_week: number;
  period_number: number;
  class_subject_id: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DailyTimetableChange {
  id: number;
  class_id: number;
  change_date: string;
  original_period: number;
  new_period: number | null;
  original_class_subject_id: number;
  new_class_subject_id: number | null;
  change_type: string;
  reason: string | null;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}
