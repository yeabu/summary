import React from 'react';
import { Chip, Box, Typography } from '@mui/material';
import { getCurrency, getCurrencyLabel } from '@/utils/currency';

const CurrencyBadge: React.FC = () => {
  const code = getCurrency();
  const label = getCurrencyLabel(code);
  const isLAK = code === 'LAK';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip size="small" label={`币种：${label}`} />
      {isLAK && (
        <Typography variant="caption" color="text.secondary">
          LAK 金额以万为单位显示
        </Typography>
      )}
    </Box>
  );
};

export default CurrencyBadge;
