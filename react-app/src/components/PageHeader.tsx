import React from 'react';
import { Box, Typography } from '@mui/material';

export default function PageHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant="h5" component="h1">{title}</Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>{actions}</Box>
    </Box>
  );
}

