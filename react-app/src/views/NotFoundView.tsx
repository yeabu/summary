/**
 * NotFoundView - 404 error page component.
 * 
 * Displays a simple explanation, a navigation button, and an alert if the user lands on an unmapped route.
 * Intended for user-friendly handling of unknown or restricted URLs.
 */
import { useNavigate } from 'react-router-dom';
import { Stack, Typography, Button, Link, Alert } from '@mui/material';
import AppView from '../components/AppView';

const NotFoundView = () => {
  const navigate = useNavigate();

  const onClose = () => {
    navigate('/', { replace: true });
  };

  return (
    <AppView>
      <Typography variant="h3">Page not found!</Typography>
      <Typography variant="body1">
        Requested address is unknown, please check your URL or go to the{' '}
        <Link href="/" underline="hover">home page</Link>.
      </Typography>
      <Alert severity="error" onClose={onClose} sx={{ mt: 2, mb: 2 }}>
        Unauthorized page.
      </Alert>
      <Stack direction="row" justifyContent="center">
        <Button variant="contained" color="primary" onClick={onClose}>
          Go to Home Page
        </Button>
      </Stack>
    </AppView>
  );
};

export default NotFoundView;