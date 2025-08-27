/**
 * ProfileView - 用户个人资料编辑页面
 *
 * 允许已认证的用户查看和更新他们的个人信息，如姓名、
 * 邮箱（可选禁用）和密码。提供成功或错误的反馈，
 * UI使用Material UI组件构建。
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Grid, Typography, TextField, Button, Stack, Alert, Box } from '@mui/material';
import AppView from '@/components/AppView';
import UserAvatar from '@/components/UserAvatar';
import useAuthStore from '@/auth/AuthStore';

/**
 * 渲染“个人资料”页面
 * url: /profile
 * @page Profile
 */
const ProfileView = () => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const changePassword = useAuthStore((state) => state.changePassword);
  
  const [name, setNameValue] = useState(user?.name || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    // 输入验证
    if (!oldPassword.trim()) {
      setError('请输入当前密码');
      setLoading(false);
      return;
    }

    if (!newPassword.trim()) {
      setError('请输入新密码');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('新密码长度不能少于6位');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      setLoading(false);
      return;
    }

    try {
      await changePassword(oldPassword, newPassword);
      setSuccess('密码修改成功！');
      // 清空密码输入框
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppView sx={{ paddingTop: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        个人资料
      </Typography>
      
      <Card>
        <CardContent>
          <Grid container spacing={3} alignItems="flex-start">
            {/* 用户头像区域 */}
            <Grid item xs={12} md={3}>
              <Stack direction="column" alignItems="center" spacing={2}>
                <UserAvatar size={120} />
                <Box textAlign="center">
                  <Typography variant="h6" gutterBottom>
                    {user?.name || '未设置名称'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user?.role === 'admin' ? '系统管理员' : 
                     user?.role === 'factory_manager' ? '厂长' : 
                     user?.role === 'captain' ? '队长' : '基地代理'}
                  </Typography>
                  {user?.base && (
                    <Typography variant="body2" color="text.secondary">
                      所属基地：{user.base}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Grid>
            
            {/* 信息编辑区域 */}
            <Grid item xs={12} md={9}>
              <Stack spacing={3}>
                {/* 基本信息 */}
                <Box>
                  <Typography variant="h6" gutterBottom>
                    基本信息
                  </Typography>
                  <TextField
                    fullWidth
                    label="用户名"
                    value={name}
                    onChange={(e) => setNameValue(e.target.value)}
                    disabled
                    variant="outlined"
                    helperText="用户名由管理员设置，不可修改"
                  />
                </Box>

                {/* 密码修改 */}
                <Box>
                  <Typography variant="h6" gutterBottom>
                    修改密码
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label="当前密码"
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      variant="outlined"
                      placeholder="请输入当前密码"
                    />
                    <TextField
                      fullWidth
                      label="新密码"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      variant="outlined"
                      placeholder="请输入新密码（不少于6位）"
                    />
                    <TextField
                      fullWidth
                      label="确认新密码"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      variant="outlined"
                      placeholder="请再次输入新密码"
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleUpdatePassword}
                      disabled={loading || !oldPassword || !newPassword || !confirmPassword}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      {loading ? '修改中...' : '修改密码'}
                    </Button>
                  </Stack>
                </Box>

                {/* 错误和成功提示 */}
                {error && (
                  <Alert severity="error">
                    {error}
                  </Alert>
                )}
                {success && (
                  <Alert severity="success">
                    {success}
                  </Alert>
                )}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </AppView>
  );
};

export default ProfileView;
