import React, { useEffect, useState } from "react";
import ApiClient from "@/api/ApiClient";
import { 
  Paper, 
  Typography, 
  Table, 
  TableHead, 
  TableBody, 
  TableRow, 
  TableCell, 
  Box,
  TextField,
  Alert,
  Card,
  CardContent,
  Grid,
  ToggleButton,
  ToggleButtonGroup
} from "@mui/material";
import { 
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  TableChart as TableIcon
} from '@mui/icons-material';
import { BarChartComponent, PieChartComponent } from "../components/Charts";
import ExportButton from "../components/ExportButton";
import { useNotification } from "../components/NotificationProvider";
import dayjs from "dayjs";

interface ExpenseStats {
  base: string;
  category: string;
  month: string;
  total: number;
}

export default function BaseExpenseStatsView() {
  const notification = useNotification();
  const [data, setData] = useState<ExpenseStats[]>([]);
  const [month, setMonth] = useState(() => dayjs().format('YYYY-MM'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'charts'>('charts');

  const loadStats = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('加载统计数据, 月份:', month);
      const response = await ApiClient.expense.stats(month);
      console.log('统计API原始返回:', response);
      
      // 后端直接返回数组，不是 {data: []} 格式
      const statsArray = Array.isArray(response) ? response : (response?.data || []);
      console.log('处理后的统计数据:', statsArray);
      
      setData(statsArray);
    } catch (err) {
      console.error('加载统计数据失败:', err);
      const errorMessage = err instanceof Error ? err.message : '加载统计数据失败';
      setError(errorMessage);
      notification.showError(errorMessage);
      setData([]); // 设置为空数组防止后续错误
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [month]);

  // 计算总计，添加安全检查
  const safeData = data || [];
  const totalAmount = safeData.reduce((sum, item) => sum + (item?.total || 0), 0);
  const categoryTotals = safeData.reduce((acc, item) => {
    if (item?.category && item?.total !== undefined) {
      acc[item.category] = (acc[item.category] || 0) + (item.total || 0);
    }
    return acc;
  }, {} as Record<string, number>);
  const baseTotals = safeData.reduce((acc, item) => {
    if (item?.base && item?.total !== undefined) {
      acc[item.base] = (acc[item.base] || 0) + (item.total || 0);
    }
    return acc;
  }, {} as Record<string, number>);

  // 准备图表数据
  const prepareChartData = () => {
    // 按基地统计数据
    const baseChartData = Object.entries(baseTotals).map(([base, total]) => ({
      name: base,
      value: total,
      金额: total
    }));

    // 按类别统计数据
    const categoryChartData = Object.entries(categoryTotals).map(([category, total]) => ({
      name: category,
      value: total,
      金额: total
    }));

    return { baseChartData, categoryChartData };
  };

  const { baseChartData, categoryChartData } = prepareChartData();

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1">
            基地日常开支统计
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, newMode) => newMode && setViewMode(newMode)}
              size="small"
            >
              <ToggleButton value="charts">
                <BarChartIcon sx={{ mr: 1 }} />
                图表视图
              </ToggleButton>
              <ToggleButton value="table">
                <TableIcon sx={{ mr: 1 }} />
                表格视图
              </ToggleButton>
            </ToggleButtonGroup>
            
            <ExportButton
              data={safeData}
              type="stats"
              disabled={loading}
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
          <TextField
            type="month"
            label="查询月份"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {/* 概览卡片 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                总金额
              </Typography>
              <Typography variant="h4">
                ￥{totalAmount.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="secondary">
                记录数量
              </Typography>
              <Typography variant="h4">
                {safeData.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                平均金额
              </Typography>
              <Typography variant="h4">
                ￥{safeData.length > 0 ? (totalAmount / safeData.length).toFixed(2) : '0.00'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 图表或表格展示 */}
      {viewMode === 'charts' ? (
        <Box>
          <Grid container spacing={2}>
            {/* 按基地统计柱状图 */}
            <Grid item xs={12} lg={6}>
              <BarChartComponent
                data={baseChartData}
                xKey="name"
                yKey="金额"
                title="按基地统计"
                color="#8884d8"
              />
            </Grid>
            
            {/* 按类别统计饼图 */}
            <Grid item xs={12} lg={6}>
              <PieChartComponent
                data={categoryChartData}
                dataKey="value"
                nameKey="name"
                title="按类别统计"
              />
            </Grid>
          </Grid>
        </Box>
      ) : (
        <Paper sx={{ p: 3 }}>

      {/* 详细统计表 */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        详细统计
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>基地</TableCell>
            <TableCell>类别</TableCell>
            <TableCell>月份</TableCell>
            <TableCell align="right">总额（元）</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {safeData.map((item, idx) =>
            <TableRow key={idx} hover>
              <TableCell>{item?.base || '-'}</TableCell>
              <TableCell>{item?.category || '-'}</TableCell>
              <TableCell>{item?.month || '-'}</TableCell>
              <TableCell align="right">￥{item?.total?.toFixed(2) || '0.00'}</TableCell>
            </TableRow>
          )}
          {safeData.length === 0 && !loading && (
            <TableRow>
              <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">
                  该月份暂无统计数据
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* 按类别统计 */}
      {Object.keys(categoryTotals).length > 0 && (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            按类别统计
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>类别</TableCell>
                <TableCell align="right">总金额（元）</TableCell>
                <TableCell align="right">占比</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(categoryTotals).map(([category, total]) => (
                <TableRow key={category}>
                  <TableCell>{category}</TableCell>
                  <TableCell align="right">￥{total.toFixed(2)}</TableCell>
                  <TableCell align="right">
                    {totalAmount > 0 ? ((total / totalAmount) * 100).toFixed(1) : '0'}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {/* 按基地统计 */}
      {Object.keys(baseTotals).length > 0 && (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            按基地统计
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>基地</TableCell>
                <TableCell align="right">总金额（元）</TableCell>
                <TableCell align="right">占比</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(baseTotals).map(([base, total]) => (
                <TableRow key={base}>
                  <TableCell>{base}</TableCell>
                  <TableCell align="right">￥{total.toFixed(2)}</TableCell>
                  <TableCell align="right">
                    {totalAmount > 0 ? ((total / totalAmount) * 100).toFixed(1) : '0'}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
        </Paper>
      )}
    </Box>
  );
}
