/**
 * NewUserLandingView - 新用户引导页面
 *
 * 为新邀请或新注册的用户提供入门体验
 * 提示用户为首次访问或在邀请链接后设置显示名称和密码
 */
import { useState } from 'react';
import { TextField, Button, Typography, Paper, Stack, CircularProgress, Alert } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '@/auth/AuthStore';

const NewUserLandingView = () => {
  const user = useAuthStore((state) => state.user);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleUpdate = async () => {
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    
    if (!name.trim()) {
      setError('请输入姓名');
      return;
    }
    
    if (password.length < 6) {
      setError('密码长度不能少于6位');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      if (!user?.user_id) {
        throw new Error('未找到用户会话，请重新登录');
      }
      
      // 这里需要实现具体的更新逻辑
      // 目前暂时重定向到主页
      navigate('/');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || '发生错误');
      } else {
        setError('发生意外错误');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Typography variant="h4" gutterBottom>
        欢迎新用户
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        请完善您的个人资料信息
      </Typography>

      <Paper sx={{ padding: 3 }}>
        <Stack spacing={2}>
          <TextField
            label="用户名"
            value={user?.name || ''}
            variant="outlined"
            size="small"
            fullWidth
            disabled
            helperText="用户名由管理员设置"
          />

          <TextField
            label="显示名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            variant="outlined"
            size="small"
            fullWidth
            placeholder="请输入您的显示名称"
          />

          <TextField
            label="新密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            variant="outlined"
            size="small"
            fullWidth
            placeholder="请输入新密码（不少于6位）"
          />

          <TextField
            label="确认密码"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            variant="outlined"
            size="small"
            fullWidth
            placeholder="请再次输入密码"
          />

          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          {loading && <CircularProgress size={24} sx={{ alignSelf: 'center' }} />}

          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleUpdate} 
            disabled={loading || !name.trim() || !password || !confirmPassword}
            size="large"
          >
            {loading ? '更新中...' : '更新资料'}
          </Button>
        </Stack>
      </Paper>
    </>
  );
};

export default NewUserLandingView;
