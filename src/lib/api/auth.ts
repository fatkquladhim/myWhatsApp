import { apiClient } from './client';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatar: string;
    status: string;
  };
}

export const authApi = {
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    apiClient.setToken(response.token);
    return response;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    apiClient.setToken(response.token);
    return response;
  },

  getCurrentUser: async () => {
    return apiClient.get('/auth/me');
  },

  updateStatus: async (status: 'online' | 'offline' | 'away') => {
    return apiClient.put('/auth/status', { status });
  },

  getUsers: async (): Promise<{ users: User[] }> => {
    return apiClient.get('/auth/users');
  },
};