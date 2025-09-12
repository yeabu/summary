/**
 * PasswordResetView - Password reset form for users who forgot their password or need to set a new one.
 *
 * Presents fields for new password and confirmation. Handles error validation, submission state,
 * and user feedback. Utilizes standard Material UI for consistent branding.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stack, TextField, Typography, Box, Button } from '@mui/material';
import AppView from '@/components/AppView';
import useAuthStore from '@/auth/AuthStore';

const PasswordResetView = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const changePassword = useAuthStore((state) => state.changePassword);

  const handleSubmit = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 对于密码重置，我们传入空字符串作为旧密码
      // 实际应用中可能需要不同的API端点
      await changePassword('', newPassword);
      alert('Password successfully reset. You can now log in with your new password.');
      navigate('/login');
    } catch {
      setError('Failed to reset password.');
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
          spacing={2}
          alignItems="center"
          sx={{
            width: '100%',
            maxWidth: '400px',
            margin: '0 auto',
            p: 3,
          }}
        >
          <Typography variant="h5" gutterBottom>
            Reset Password
          </Typography>
          <TextField
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
          />
          <TextField
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
          />
          {error && <Typography color="error">{error}</Typography>}
          <Button color="primary" variant="contained" onClick={handleSubmit} disabled={loading} fullWidth>
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </Stack>
      </Box>
    </AppView>
  );
};

export default PasswordResetView;
