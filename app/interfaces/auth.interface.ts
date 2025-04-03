export interface RegisterUserInput {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: "admin" | "user";
  }

  export interface LoginCredentials {
    email: string;
    password: string;
  }

  export interface AuthResponse {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
    };
    token: string;
  }
