/**
 * LoginView - 用户登录页面
 *
 * 使用用户名和密码进行登录，适配summary项目的后端API。
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stack, TextField, Typography, Box, Button } from '@mui/material';
import AppView from '@/components/AppView';
import useAuthStore from '@/auth/AuthStore';

const LoginView = () => {
  const navigate = useNavigate();
  const signIn = useAuthStore((state) => state.signIn);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const usernameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (usernameInputRef.current) {
      usernameInputRef.current.focus();
    }
  }, []);

  const handleEnterPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onLogin();
    }
  };

  const onLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await signIn(username.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请检查用户名和密码');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppView>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          width: '100%',
        }}
      >
        <Stack
          direction="column"
          spacing={3}
          alignItems="center"
          sx={{
            width: '100%',
            maxWidth: '400px',
            margin: '0 auto',
            p: 4,
            boxShadow: 2,
            borderRadius: 2,
            backgroundColor: 'background.paper',
          }}
        >
          <Typography variant="h4" gutterBottom color="primary">
            Summary 系统
          </Typography>
          
          <Typography variant="h6" gutterBottom>
            用户登录
          </Typography>

          <TextField
            label="用户名"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            inputRef={usernameInputRef}
            fullWidth
            onKeyDown={handleEnterPress}
            placeholder="请输入用户名"
            variant="outlined"
          />
          
          <TextField
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            fullWidth
            onKeyDown={handleEnterPress}
            placeholder="请输入密码"
            variant="outlined"
          />

          {error && (
            <Typography color="error" variant="body2" align="center">
              {error}
            </Typography>
          )}

          <Button
            color="primary"
            variant="contained"
            onClick={onLogin}
            disabled={loading}
            fullWidth
            size="large"
            sx={{ mt: 2 }}
          >
            {loading ? '登录中...' : '登录'}
          </Button>

          {/* 移除测试账户说明 */}
        </Stack>
      </Box>
    </AppView>
  );
};

export default LoginView;
