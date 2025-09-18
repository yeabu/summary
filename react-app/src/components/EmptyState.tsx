import React from 'react';
import { Box, Typography } from '@mui/material';

export default function EmptyState({ title = '暂无数据', description, action }: { title?: string; description?: string; action?: React.ReactNode }) {
  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <Typography variant="h6" color="text.secondary">{title}</Typography>
      {description && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{description}</Typography>}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  );
}

