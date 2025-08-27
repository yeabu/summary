import { ReactNode } from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // 简化的AuthProvider，不需要刷新会话逻辑
  // 用户状态已经从localStorage中恢复
  return <>{children}</>;
};
