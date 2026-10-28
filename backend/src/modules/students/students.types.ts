export interface Student {
  id: number;
  user_id: number;
  student_id: string;
  first_name: string;
  last_name: string | null;
  date_of_birth: string | null;
  admission_number: string | null;
  joined_at: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  enrollments?: StudentEnrollment[];
}

export interface StudentEnrollment {
  id: number;
  student_id: number;
  class_id: number;
  start_date: string;
  end_date: string | null;
  status: string;
  transfer_reason: string | null;
  created_at: Date;
}
