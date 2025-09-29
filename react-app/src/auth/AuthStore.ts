import { create } from 'zustand';
import { LoginRequest, LoginResponse, ChangePasswordRequest } from '../api/AppDtos';
import { API_URL } from '@/config';

interface User {
  user_id: number;
  name: string;
  role: string;
  bases?: string[];  // 用户关联的基地代码列表
  base?: string;     // 默认基地（向后兼容）
  base_id?: number;  // 添加基地ID属性
}

interface AuthState {
  token: string | null;
  user: User | null;
  signIn: (name: string, password: string) => Promise<void>;
  signOut: () => void;
  changePassword: (oldPwd: string, newPwd: string) => Promise<void>;
  setSession: (token: string | null, user: User | null) => void;
}

// Bootstrapping: accept token and minimal user info from URL for H5 embedding
(() => {
  try {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const token = p.get('token');
      if (token) {
        const role = p.get('role') || 'base_agent';
        const user_id = Number(p.get('user_id') || '0');
        const name = p.get('name') || '用户';
        const bases = (p.get('bases') || '').split(',').filter(Boolean);
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify({ user_id, name, role, bases }));
        // 清理 URL 上的敏感参数（可选）
        try {
          const url = new URL(window.location.href);
          ['token','role','user_id','name','bases'].forEach(k=>url.searchParams.delete(k));
          window.history.replaceState({}, document.title, url.toString());
        } catch {}
      }
    }
  } catch {}
})();

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
      // 创建登录请求对象
      const loginRequest: LoginRequest = { name, password };
      
      // 直接调用登录API，不使用ApiClient类
      const apiUrl = API_URL;
      const response = await fetch(`${apiUrl}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginRequest)
      });

      if (!response.ok) {
        throw new Error('登录失败');
      }

      const data: LoginResponse = await response.json();

      if (data.token && data.user_id) {
        const user: User = {
          user_id: data.user_id,
          name: name,
          role: data.role,
          bases: data.bases,
          base: data.bases && data.bases.length > 0 ? data.bases[0] : undefined
          // 注意：登录响应中没有base_id，所以不设置
        };
        
        get().setSession(data.token, user);
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
      // 实现修改密码逻辑
      const changePwdRequest: ChangePasswordRequest = { old_pwd: oldPwd, new_pwd: newPwd };
      
      // 获取当前 token
      const token = get().token;
      if (!token) {
        throw new Error('用户未登录');
      }
      
      // 直接调用修改密码API，不使用ApiClient类
      const apiUrl = API_URL;
      const response = await fetch(`${apiUrl}/api/user/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(changePwdRequest)
      });

      if (!response.ok) {
        throw new Error('密码修改失败');
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '密码修改失败');
    }
  }
}));

export default useAuthStore;
