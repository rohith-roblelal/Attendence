import { apiClient } from './client';

export interface DashboardContext {
  department_name: string;
  academic_year_name: string;
}

export interface DashboardCounts {
  active_classes: number;
  active_students: number;
  active_teachers: number;
}

export interface DashboardAttendanceOverview {
  total_records: number;
  present_records: number;
}

export interface DashboardClass {
  id: number;
  name: string;
  student_count: number;
  total_records: number;
  present_records: number;
}

export interface DashboardAttentionStudent {
  id: number;
  first_name: string;
  last_name: string | null;
  class_name: string;
  total_records: number;
  present_records: number;
}

export interface HodDashboardResponse {
  context: DashboardContext;
  academic_years: { id: number; name: string }[];
  counts: DashboardCounts;
  attendanceOverview: DashboardAttendanceOverview;
  classes: DashboardClass[];
  attention: DashboardAttentionStudent[];
}

export const dashboardApi = {
  getHodStats: (academicYearId?: number) => 
    apiClient.get<{ status: string; data: HodDashboardResponse }>(
      academicYearId ? `/dashboard/hod?academic_year_id=${academicYearId}` : '/dashboard/hod'
    ),
  getHodPeople: (academicYearId?: number) =>
    apiClient.get<{ status: string; data: {
      classes: { class_id: number; class_name: string; section_name: string; batch_name: string; semester_name: string }[];
      assignments: { class_id: number; teacher_id: number; teacher_name: string; teacher_status: string; subject_name: string; subject_code: string }[];
      academic_years: { id: number; name: string }[];
    }}>(
      academicYearId ? `/dashboard/hod/people?academic_year_id=${academicYearId}` : '/dashboard/hod/people'
    ),
};
