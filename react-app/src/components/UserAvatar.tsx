import { Avatar } from '@mui/material';
import useAuthStore from '../auth/AuthStore';

// Helper to get initials from a name
function getInitials(name: string): string {
  if (!name) return 'U';
  const [first, last] = name.split(' ');
  return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
}

const UserAvatar = ({ size = 40 }) => {
  const user = useAuthStore((state) => state.user);
  return (
    <Avatar sx={{ 
      width: size, 
      height: size,
      backgroundColor: '#bbdefb', // 更明显的浅蓝色背景
      color: '#0d47a1', // 深蓝色文字，更好的对比度
      fontWeight: 'bold' // 字体加粗，更清晰
    }}>
      {getInitials(user?.name || 'U')}
    </Avatar>
  );
};

export default UserAvatar;