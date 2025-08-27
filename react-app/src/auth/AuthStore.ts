import { create } from 'zustand';
import ApiClient from '../api/ApiClient';

interface User {
  user_id: number;
  name: string;
  role: string;
  base?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  signIn: (name: string, password: string) => Promise<void>;
  signOut: () => void;
  changePassword: (oldPwd: string, newPwd: string) => Promise<void>;
  setSession: (token: string | null, user: User | null) => void;
}

const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('auth_token'),
  user: localStorage.getItem('auth_user') ? JSON.parse(localStorage.getItem('auth_user')!) : null,

  setSession: (token, user) => {
    set({ token, user });
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('auth_user');
    }
  },

  async signIn(name, password) {
    try {
      const result = await ApiClient.login(name, password);
      
      if (result.token && result.user_id) {
        const user: User = {
          user_id: result.user_id,
          name: name,
          role: result.role,
          base: result.base
        };
        
        get().setSession(result.token, user);
      } else {
        throw new Error('登录失败：无效的响应数据');
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '登录失败');
    }
  },

  signOut() {
    set({ token: null, user: null });
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  },

  async changePassword(oldPwd, newPwd) {
    try {
      await ApiClient.user.changePassword(oldPwd, newPwd);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '密码修改失败');
    }
  }
}));

export default useAuthStore;