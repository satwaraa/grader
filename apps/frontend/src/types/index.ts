export interface User {
  name: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}

export interface AuthResponse {
  token: string;
  // reqres.in specific response structure
  id?: string;
  error?: string;
}

export interface UserCredentials {
  email: string;
  password?: string;
}
