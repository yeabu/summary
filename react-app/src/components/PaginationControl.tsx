import React from 'react';
import {
  Box,
  Pagination,
  FormControl,
  Select,
  MenuItem,
  Typography,
  InputLabel
} from '@mui/material';

// 分页数据接口
export interface PaginationResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// 分页控件Props
interface PaginationControlProps {
  pagination: PaginationResponse;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  loading?: boolean;
}

const PaginationControl: React.FC<PaginationControlProps> = ({
  pagination,
  onPageChange,
  onPageSizeChange,
  loading = false
}) => {
  const { total, page, page_size, total_pages } = pagination;

  // 当没有数据时，不显示分页控件
  if (total === 0) {
    return null;
  }

  // 计算显示范围
  const startItem = (page - 1) * page_size + 1;
  const endItem = Math.min(page * page_size, total);

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mt: 2,
        flexWrap: 'wrap',
        gap: 2
      }}
    >
      {/* 数据统计 */}
      <Typography variant="body2" color="text.secondary">
        显示 {startItem} - {endItem} 条，共 {total} 条记录
      </Typography>

      {/* 分页控件和页大小选择 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* 页大小选择 */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>每页显示</InputLabel>
          <Select
            value={page_size}
            label="每页显示"
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={loading}
          >
            <MenuItem value={10}>10 条</MenuItem>
            <MenuItem value={20}>20 条</MenuItem>
            <MenuItem value={50}>50 条</MenuItem>
            <MenuItem value={100}>100 条</MenuItem>
          </Select>
        </FormControl>

        {/* 分页组件 */}
        {total_pages > 1 && (
          <Pagination
            count={total_pages}
            page={page}
            onChange={(_, newPage) => onPageChange(newPage)}
            disabled={loading}
            color="primary"
            showFirstButton
            showLastButton
            siblingCount={1}
            boundaryCount={1}
          />
        )}
      </Box>
    </Box>
  );
};

export default PaginationControl;