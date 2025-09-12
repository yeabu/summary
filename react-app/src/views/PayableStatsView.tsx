import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  BarChart,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  FileDownload as FileDownloadIcon,
} from '@mui/icons-material';
import { 
  PayableApi, 
  PayableSummaryResponse, 
  SupplierPayableStats, 
  PayableRecord,
  PayableStatusText 
} from '../api/PayableApi';
import { PageLoading } from '../components/LoadingComponents';
import { useNotification } from '../components/NotificationProvider';

export const PayableStatsView: React.FC = () => {
  const notification = useNotification();
  const payableApi = new PayableApi();

  // 状态管理
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 统计数据
  const [summary, setSummary] = useState<PayableSummaryResponse | null>(null);
  const [supplierStats, setSupplierStats] = useState<SupplierPayableStats[]>([]);
  const [overduePayables, setOverduePayables] = useState<PayableRecord[]>([]);
  
  // 筛选条件
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: '',
  });

  // 加载所有统计数据
  const loadAllStats = async () => {
    try {
      setLoading(true);
      const [summaryData, supplierData, overdueData] = await Promise.all([
        payableApi.getPayableSummary(),
        payableApi.getPayableBySupplier(),
        payableApi.getOverduePayables(),
      ]);
      
      setSummary(summaryData);
      setSupplierStats(supplierData);
      setOverduePayables(overdueData);
      setError(null);
    } catch (err: any) {
      setError(err.message || '加载统计数据失败');
      notification.showError('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 格式化金额
  const formatAmount = (amount: number) => {
    return amount.toLocaleString('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    });
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 计算付款率
  const getPaymentRate = (totalAmount: number, paidAmount: number) => {
    if (totalAmount === 0) return 0;
    return Math.round((paidAmount / totalAmount) * 100);
  };

  // 获取风险等级颜色
  const getRiskColor = (remainingAmount: number, totalAmount: number) => {
    const ratio = remainingAmount / totalAmount;
    if (ratio > 0.8) return 'error';
    if (ratio > 0.5) return 'warning';
    if (ratio > 0.2) return 'info';
    return 'success';
  };

  // 刷新数据
  const handleRefresh = () => {
    loadAllStats();
    notification.showSuccess('数据已刷新');
  };

  // 导出数据（简单实现）
  const handleExport = () => {
    if (!supplierStats.length) {
      notification.showWarning('暂无数据可导出');
      return;
    }

    // 创建CSV内容
    const headers = ['供应商', '总金额', '已付金额', '剩余金额', '付款率', '记录数'];
    const csvContent = [
      headers.join(','),
      ...supplierStats.map(stat => [
        stat.supplier,
        stat.total_amount,
        stat.paid_amount,
        stat.remaining_amount,
        getPaymentRate(stat.total_amount, stat.paid_amount) + '%',
        stat.record_count
      ].join(','))
    ].join('\n');

    // 下载文件
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `供应商欠款统计_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    notification.showSuccess('数据导出成功');
  };

  useEffect(() => {
    loadAllStats();
  }, []);

  if (loading) {
    return <PageLoading />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 页面标题 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentIcon color="primary" />
          欠款统计报表
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExport}
          >
            导出数据
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
          >
            刷新
          </Button>
        </Stack>
      </Box>

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 总体统计卡片 */}
      {summary && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      总应付款
                    </Typography>
                    <Typography variant="h5" color="primary">
                      {formatAmount(summary.total_payable)}
                    </Typography>
                  </Box>
                  <TrendingUpIcon color="primary" fontSize="large" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      已付款总额
                    </Typography>
                    <Typography variant="h5" color="success.main">
                      {formatAmount(summary.total_paid)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      付款率: {getPaymentRate(summary.total_payable, summary.total_paid)}%
                    </Typography>
                  </Box>
                  <BarChart color="success" fontSize="large" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      剩余欠款
                    </Typography>
                    <Typography variant="h5" color="warning.main">
                      {formatAmount(summary.total_remaining)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      欠款率: {getPaymentRate(summary.total_payable, summary.total_remaining)}%
                    </Typography>
                  </Box>
                  <WarningIcon color="warning" fontSize="large" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      超期记录
                    </Typography>
                    <Typography variant="h5" color="error.main">
                      {summary.overdue_count}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      待付: {summary.pending_count} | 部分: {summary.partial_count}
                    </Typography>
                  </Box>
                  <WarningIcon color="error" fontSize="large" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={3}>
        {/* 供应商欠款统计 */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BarChart />
              供应商欠款排行
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>供应商</TableCell>
                    <TableCell align="right">总金额</TableCell>
                    <TableCell align="right">已付金额</TableCell>
                    <TableCell align="right">剩余欠款</TableCell>
                    <TableCell align="center">付款率</TableCell>
                    <TableCell align="center">风险等级</TableCell>
                    <TableCell align="center">记录数</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {supplierStats.slice(0, 10).map((stat, index) => {
                    const paymentRate = getPaymentRate(stat.total_amount, stat.paid_amount);
                    const riskColor = getRiskColor(stat.remaining_amount, stat.total_amount);
                    
                    return (
                      <TableRow key={stat.supplier}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="textSecondary">
                              #{index + 1}
                            </Typography>
                            <Typography fontWeight="bold">
                              {typeof stat.supplier === 'object' ? (stat.supplier as any).name : stat.supplier}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {formatAmount(stat.total_amount)}
                        </TableCell>
                        <TableCell align="right">
                          {formatAmount(stat.paid_amount)}
                        </TableCell>
                        <TableCell align="right">
                          <Typography color="warning.main" fontWeight="bold">
                            {formatAmount(stat.remaining_amount)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={`${paymentRate}%`}
                            color={paymentRate >= 80 ? 'success' : paymentRate >= 50 ? 'warning' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={
                              riskColor === 'error' ? '高风险' :
                              riskColor === 'warning' ? '中风险' :
                              riskColor === 'info' ? '低风险' : '安全'
                            }
                            color={riskColor as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          {stat.record_count}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        
        {/* 超期应付款 */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon color="error" />
              超期应付款
            </Typography>
            
            {overduePayables.length > 0 ? (
              <Box>
                {overduePayables.slice(0, 8).map((payable) => (
                  <Card key={payable.id} sx={{ mb: 1, bgcolor: 'error.light', opacity: 0.9 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {typeof payable.supplier === 'object' ? (payable.supplier as any).name : payable.supplier}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {payable.base?.name}
                          </Typography>
                          <Typography variant="body2" color="error.main" fontWeight="bold">
                            欠款: {formatAmount(payable.remaining_amount)}
                          </Typography>
                          {payable.due_date && (
                            <Typography variant="caption" color="textSecondary">
                              到期: {formatDate(payable.due_date)}
                            </Typography>
                          )}
                        </Box>
                        <Chip 
                          label={PayableStatusText[payable.status]}
                          color="error"
                          size="small"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
                
                {overduePayables.length > 8 && (
                  <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 1 }}>
                    还有 {overduePayables.length - 8} 条超期记录...
                  </Typography>
                )}
              </Box>
            ) : (
              <Alert severity="success">
                🎉 暂无超期应付款
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};