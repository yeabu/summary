import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '@/auth/AuthStore';

interface ProtectedRouteProps {
  roles?: string[];
}

const ProtectedRoute = ({ roles }: ProtectedRouteProps) => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  console.log('=== ProtectedRoute Debug ===');
  console.log('User:', user);
  console.log('Token:', token);
  console.log('Required roles:', roles);
  console.log('Current location:', window.location.pathname);

  if (!user) {
    console.log('❌ No user found, redirecting to login');
    return <Navigate to="/login" />;
  }

  if (!token) {
    console.log('❌ No token found, redirecting to login');
    return <Navigate to="/login" />;
  }

  // 调试日志：打印用户角色
  console.log('✅ User authenticated. Role:', user.role, 'Name:', user.name);
  
  if (roles && roles.length > 0) {
    const hasAccess = roles.includes(user.role);
    console.log('🔒 Role check - Required:', roles, 'User role:', user.role, 'Has access:', hasAccess);
    
    if (!hasAccess) {
      // 用户角色不在允许的角色列表中
      console.log('❌ Access denied. Redirecting to home.');
      return <Navigate to="/" />; // 重定向到主页而不是未授权页面
    }
  }

  console.log('✅ Access granted, rendering protected content');
  return <Outlet />;
};

export default ProtectedRoute;
