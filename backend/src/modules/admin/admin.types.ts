export interface CreateUserDTO {
  username: string;
  password?: string;
  role: string;
  email?: string | null;
  phone?: string | null;
}

export interface UpdateUserDTO {
  username?: string;
  password?: string;
  role?: string;
  email?: string | null;
  phone?: string | null;
  is_active?: boolean;
}

export interface UserResponse {
  id: number;
  username: string;
  role: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
