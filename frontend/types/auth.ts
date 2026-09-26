export type UserRole = 'ADMINISTRATION' | 'HOD' | 'TUTOR' | 'TEACHER' | 'STUDENT';

export interface User {
  id: number;
  username: string;
  role: UserRole;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}
