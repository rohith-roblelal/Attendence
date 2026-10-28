export interface AcademicYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Department {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Specialization {
  id: number;
  department_id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AdmissionBatch {
  id: number;
  academic_year_id: number;
  department_id: number;
  specialization_id: number | null;
  batch_name: string;
  admission_year: number;
  created_at: Date;
}

export interface Semester {
  id: number;
  academic_year_id: number;
  semester_number: number;
  name: string;
  start_date: string;
  end_date: string;
  created_at: Date;
}
