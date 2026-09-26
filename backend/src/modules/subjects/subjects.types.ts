export interface Subject {
  id: number;
  code: string;
  name: string;
  subject_type: string;
  default_contact_hours: number;
  credits: number | null;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
