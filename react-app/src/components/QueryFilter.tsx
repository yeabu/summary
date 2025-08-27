import React, { useState } from 'react';
import {
  Paper,
  Box,
  Grid,
  TextField,
  MenuItem,
  Button,
  Collapse,
  Typography,
  Chip
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { FilterOptions } from '@/api/AppDtos';
import dayjs from 'dayjs';

// 基地列表
const baseList = [
  "北京基地",
  "上海基地", 
  "广州基地",
  "深圳基地",
  "杭州基地",
  "南京基地",
  "成都基地",
  "武汉基地",
  "西安基地",
  "青岛基地"
];

// 费用类别
const categories = ["伙食费", "修车费", "电费", "加油费", "材料费"];

// 筛选组件Props
interface QueryFilterProps {
  onFilter: (filters: FilterOptions) => void;
  loading?: boolean;
  showBaseFilter?: boolean;
  showCategoryFilter?: boolean;
  showSupplierFilter?: boolean;
  showOrderNumberFilter?: boolean;
  initialFilters?: FilterOptions;
}

const QueryFilter: React.FC<QueryFilterProps> = ({
  onFilter,
  loading = false,
  showBaseFilter = true,
  showCategoryFilter = true,
  showSupplierFilter = false,
  showOrderNumberFilter = false,
  initialFilters = {}
}) => {
  const [expanded, setExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    base: '',
    category: '',
    supplier: '',
    order_number: '',
    start_date: '',
    end_date: '',
    ...initialFilters
  });

  // 快速时间筛选
  const quickDateFilters = [
    { label: '今日', value: 'today' },
    { label: '本周', value: 'thisWeek' },
    { label: '本月', value: 'thisMonth' },
    { label: '上月', value: 'lastMonth' },
    { label: '最近3个月', value: 'last3Months' }
  ];

  const handleQuickDate = (value: string) => {
    const today = dayjs();
    let start_date = '';
    let end_date = '';

    switch (value) {
      case 'today':
        start_date = end_date = today.format('YYYY-MM-DD');
        break;
      case 'thisWeek':
        start_date = today.startOf('week').format('YYYY-MM-DD');
        end_date = today.endOf('week').format('YYYY-MM-DD');
        break;
      case 'thisMonth':
        start_date = today.startOf('month').format('YYYY-MM-DD');
        end_date = today.endOf('month').format('YYYY-MM-DD');
        break;
      case 'lastMonth':
        const lastMonth = today.subtract(1, 'month');
        start_date = lastMonth.startOf('month').format('YYYY-MM-DD');
        end_date = lastMonth.endOf('month').format('YYYY-MM-DD');
        break;
      case 'last3Months':
        start_date = today.subtract(3, 'month').format('YYYY-MM-DD');
        end_date = today.format('YYYY-MM-DD');
        break;
    }

    setFilters(prev => ({ ...prev, start_date, end_date }));
  };

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    onFilter(filters);
  };

  const handleClear = () => {
    const clearedFilters: FilterOptions = {
      base: '',
      category: '',
      supplier: '',
      order_number: '',
      start_date: '',
      end_date: ''
    };
    setFilters(clearedFilters);
    onFilter(clearedFilters);
  };

  // 获取活跃筛选条件数量
  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value && value.trim() !== '').length;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterIcon />
          <Typography variant="h6">
            筛选条件
          </Typography>
          {activeFiltersCount > 0 && (
            <Chip 
              label={`${activeFiltersCount} 个筛选条件`} 
              size="small" 
              color="primary" 
            />
          )}
        </Box>
        <Button
          variant="text"
          onClick={() => setExpanded(!expanded)}
          endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        >
          {expanded ? '收起' : '展开'}
        </Button>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ mb: 2 }}>
          <Grid container spacing={2}>
            {/* 基地筛选 */}
            {showBaseFilter && (
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  select
                  fullWidth
                  label="基地"
                  value={filters.base || ''}
                  onChange={(e) => handleFilterChange('base', e.target.value)}
                  size="small"
                >
                  <MenuItem value="">全部基地</MenuItem>
                  {baseList.map((base) => (
                    <MenuItem key={base} value={base}>
                      {base}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}

            {/* 类别筛选 */}
            {showCategoryFilter && (
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  select
                  fullWidth
                  label="类别"
                  value={filters.category || ''}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  size="small"
                >
                  <MenuItem value="">全部类别</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}

            {/* 供应商筛选 */}
            {showSupplierFilter && (
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="供应商"
                  value={filters.supplier || ''}
                  onChange={(e) => handleFilterChange('supplier', e.target.value)}
                  size="small"
                />
              </Grid>
            )}

            {/* 订单号筛选 */}
            {showOrderNumberFilter && (
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="订单号"
                  value={filters.order_number || ''}
                  onChange={(e) => handleFilterChange('order_number', e.target.value)}
                  size="small"
                />
              </Grid>
            )}

            {/* 开始日期 */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="开始日期"
                type="date"
                value={filters.start_date || ''}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>

            {/* 结束日期 */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="结束日期"
                type="date"
                value={filters.end_date || ''}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
          </Grid>

          {/* 快速日期筛选 */}
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              快速时间筛选：
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {quickDateFilters.map((filter) => (
                <Chip
                  key={filter.value}
                  label={filter.label}
                  variant="outlined"
                  size="small"
                  onClick={() => handleQuickDate(filter.value)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          </Box>

          {/* 操作按钮 */}
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={handleClear}
              disabled={loading}
            >
              清空
            </Button>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={loading}
            >
              搜索
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default QueryFilter;