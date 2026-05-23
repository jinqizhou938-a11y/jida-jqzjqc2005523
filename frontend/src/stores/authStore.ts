import { create } from 'zustand';
import { clearLocalSession, getLocalUser, loginLocalUser } from '../services/localStore';

export type AppUser = {
  id: string;
  phone?: string;
  user_metadata?: { username?: string };
};

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  init: () => Promise<void>;
  loginLocal: (phone: string, username?: string) => Promise<void>;
  logout: () => Promise<void>;
}

function clearSession() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  clearLocalSession();
}

function isLocalSession(): boolean {
  const token = localStorage.getItem('auth_token');
  return Boolean(token?.startsWith('local.'));
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  init: async () => {
    if (isLocalSession()) {
      set({ user: getLocalUser(), loading: false });
      return;
    }
    set({ loading: false });
  },

  loginLocal: async (phone, username) => {
    const user = loginLocalUser(phone, username);
    set({ user });
  },

  logout: async () => {
    clearSession();
    set({ user: null });
  },
}));
