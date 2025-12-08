export interface User {
  id: number;
  name: string;
  email: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: "STUDENT" | "TEACHER" | "ADMIN";
}
