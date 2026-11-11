export interface User {
  id: string;
  email?: string;
  name: string;
  avatar_url: string | null;
  provider: 'local' | 'google' | 'github';
  onboarded: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

export interface CommunityUser {
  id: string;
  name: string;
  avatar_url: string | null;
  provider: string;
  created_at: string;
  stats: {
    total: number;
    completed: number;
    playing: number;
    backlog: number;
  };
}
