import React from 'react';
import {
  Box,
  CircularProgress,
  Skeleton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Card,
  CardContent,
  Typography
} from '@mui/material';

// 页面加载组件
export const PageLoading: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        flexDirection: 'column',
        gap: 2
      }}
    >
      <CircularProgress size={40} />
      <Typography variant="body2" color="text.secondary">
        正在加载...
      </Typography>
    </Box>
  );
};

// 按钮加载状态
interface ButtonLoadingProps {
  loading: boolean;
  children: React.ReactNode;
}

export const ButtonLoading: React.FC<ButtonLoadingProps> = ({ loading, children }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {loading && <CircularProgress size={16} />}
      {children}
    </Box>
  );
};

// 表格骨架屏
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ 
  rows = 5, 
  columns = 4 
}) => {
  return (
    <Table>
      <TableHead>
        <TableRow>
          {Array.from({ length: columns }).map((_, index) => (
            <TableCell key={index}>
              <Skeleton variant="text" width="80%" />
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <TableCell key={colIndex}>
                <Skeleton variant="text" width="60%" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

// 卡片骨架屏
export const CardSkeleton: React.FC = () => {
  return (
    <Card>
      <CardContent>
        <Skeleton variant="text" width="40%" height={32} />
        <Skeleton variant="text" width="60%" height={24} sx={{ mt: 1 }} />
        <Skeleton variant="rectangular" width="100%" height={60} sx={{ mt: 2 }} />
      </CardContent>
    </Card>
  );
};

// 统计卡片骨架屏
export const StatCardSkeleton: React.FC = () => {
  return (
    <Card sx={{ textAlign: 'center' }}>
      <CardContent>
        <Skeleton variant="text" width="60%" height={24} sx={{ mx: 'auto' }} />
        <Skeleton variant="text" width="80%" height={40} sx={{ mt: 1, mx: 'auto' }} />
      </CardContent>
    </Card>
  );
};

// 列表项骨架屏
interface ListSkeletonProps {
  items?: number;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({ items = 3 }) => {
  return (
    <Box>
      {Array.from({ length: items }).map((_, index) => (
        <Box key={index} sx={{ display: 'flex', alignItems: 'center', p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="30%" height={20} />
            <Skeleton variant="text" width="60%" height={16} sx={{ mt: 0.5 }} />
          </Box>
          <Skeleton variant="rectangular" width={80} height={32} />
        </Box>
      ))}
    </Box>
  );
};

// 图表骨架屏
export const ChartSkeleton: React.FC = () => {
  return (
    <Card>
      <CardContent>
        <Skeleton variant="text" width="40%" height={32} />
        <Skeleton variant="rectangular" width="100%" height={300} sx={{ mt: 2 }} />
      </CardContent>
    </Card>
  );
};