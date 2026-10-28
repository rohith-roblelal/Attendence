export interface UserPayload {
  id: number;
  role: string;
  username: string;
}

export interface LoginResponse {
  user: {
    id: number;
    username: string;
    role: string;
  };
}
