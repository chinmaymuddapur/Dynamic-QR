import { UserProfile } from '../types';

const AUTH_USER_KEY = 'cardsync_auth_user';

const DEFAULT_ADMIN: UserProfile = {
  id: 'usr_admin_01',
  name: 'Alex Rivera',
  email: 'admin@cardsync.io',
  role: 'Super Admin',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
};

export const authService = {
  getCurrentUser(): UserProfile | null {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      if (stored) {
        return JSON.parse(stored) as UserProfile;
      }
    } catch {
      // ignore
    }
    // Default logged in user for smooth demo experience
    return DEFAULT_ADMIN;
  },

  async login(email: string, _password: string): Promise<UserProfile> {
    // Phase 1 Mock Auth
    const user: UserProfile = {
      ...DEFAULT_ADMIN,
      email: email.trim() || DEFAULT_ADMIN.email,
    };
    try {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
    return user;
  },

  async logout(): Promise<void> {
    try {
      localStorage.removeItem(AUTH_USER_KEY);
    } catch {
      // ignore
    }
  },

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  },
};
