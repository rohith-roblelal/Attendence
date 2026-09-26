export interface ClassSection {
  id: number;
  admission_batch_id: number;
  semester_id: number;
  section_name: string;
  class_code: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}