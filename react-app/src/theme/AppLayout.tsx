import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container, Typography } from '@mui/material';
import StandardAppBar from '../components/StandardAppBar';

const DevIndicator: React.FC = () => {
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 10,
        right: 10,
        bgcolor: 'rgba(255, 0, 0, 0.8)',
        color: 'white',
        padding: '10px 15px',
        borderRadius: '5px',
        border: '2px solid white',
        fontWeight: 'bold',
        zIndex: 1000,
      }}
    >
      <Typography variant="body1">Develop</Typography>
    </Box>
  );
};

const AppLayout: React.FC = () => {
  const isDevelop = import.meta.env.VITE_IS_DEVELOP === 'true';
  console.log('VITE_IS_DEVELOP:', import.meta.env.VITE_IS_DEVELOP, 'isDevelop:', isDevelop);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
      }}
    >
      <StandardAppBar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          paddingTop: 2,
          paddingX: 2,
          paddingBottom: 3,
          mt: { xs: 7, sm: 8 },
        }}
      >
        <Container maxWidth="lg">
          <Outlet />
        </Container>
        {isDevelop && <DevIndicator />}
      </Box>
    </Box>
  );
};

export default AppLayout;
