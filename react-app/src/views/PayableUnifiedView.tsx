import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Alert,
  Tooltip,
  Stack,
  Collapse,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Payment as PaymentIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  Assignment as AssignmentIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  FileDownload as FileDownloadIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { PayableApi, PayableRecord, PayableSummaryResponse, SupplierPayableStats, PayableStatusText, CreatePaymentRequest } from '../api/PayableApi';
import PaginationControl from '../components/PaginationControl';
import { PageLoading } from '../components/LoadingComponents';
import { useNotification } from '../components/NotificationProvider';
import { PaymentDialog } from '../components/PaymentDialog';

export const PayableUnifiedView: React.FC = () => {
  const notification = useNotification();
  const payableApi = new PayableApi();

  // 状态管理
  const [payables, setPayables] = useState<PayableRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  
  // 统计数据
  const [summary, setSummary] = useState<PayableSummaryResponse | null>(null);
  const [supplierStats, setSupplierStats] = useState<SupplierPayableStats[]>([]);
  const [overduePayables, setOverduePayables] = useState<PayableRecord[]>([]);
  const [showStats, setShowStats] = useState(true);
  
  // 筛选条件
  const [filters, setFilters] = useState({
    supplier: '',
    status: '',
    base: '',
    start_date: '',
    end_date: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // 详情对话框
  const [selectedPayable, setSelectedPayable] = useState<PayableRecord | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  
  // 还款对话框
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<PayableRecord | null>(null);
  
  // 编辑状态对话框
  const [editStatusDialog, setEditStatusDialog] = useState(false);
  const [editingPayable, setEditingPayable] = useState<PayableRecord | null>(null);
  const [newStatus, setNewStatus] = useState('');

  // 加载应付款列表
  const loadPayables = async () => {
    try {
      setLoading(true);
      const response = await payableApi.getPayableList({
        page,
        limit,
        ...filters,
      });
      setPayables(response.records);
      setTotal(response.total);
      setError(null);
    } catch (err: any) {
      setError(err.message || '加载应付款列表失败');
      notification.showError('加载应付款列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载统计数据
  const loadStatistics = async () => {
    try {
      const [summaryData, supplierData, overdueData] = await Promise.all([
        payableApi.getPayableSummary(),
        payableApi.getPayableBySupplier(),
        payableApi.getOverduePayables(),
      ]);
      
      setSummary(summaryData);
      setSupplierStats(supplierData);
      setOverduePayables(overdueData);
    } catch (err: any) {
      console.error('加载统计数据失败:', err);
    }
  };

  // 查看详情
  const handleViewDetail = async (payable: PayableRecord) => {
    try {
      const detail = await payableApi.getPayableDetail(payable.id);
      setSelectedPayable(detail);
      setDetailDialog(true);
    } catch (err: any) {
      notification.showError('加载应付款详情失败');
    }
  };

  // 开始还款
  const handleStartPayment = (payable: PayableRecord) => {
    setPaymentTarget(payable);
    setPaymentDialog(true);
  };

  // 创建还款记录
  const handleCreatePayment = async (data: CreatePaymentRequest) => {
    await payableApi.createPayment(data);
    notification.showSuccess('还款记录创建成功');
  };

  // 还款完成后刷新数据
  const handlePaymentCreated = () => {
    loadPayables();
    loadStatistics();
    setPaymentDialog(false);
    setPaymentTarget(null);
  };

  // 编辑状态
  const handleEditStatus = (payable: PayableRecord) => {
    setEditingPayable(payable);
    setNewStatus(payable.status);
    setEditStatusDialog(true);
  };

  // 保存状态修改
  const handleSaveStatus = async () => {
    if (!editingPayable) return;
    
    try {
      await payableApi.updatePayableStatus(editingPayable.id, newStatus);
      notification.showSuccess('状态更新成功');
      setEditStatusDialog(false);
      setEditingPayable(null);
      // 刷新数据
      loadPayables();
      loadStatistics();
    } catch (err: any) {
      notification.showError('更新状态失败: ' + (err.message || '未知错误'));
    }
  };

  // 状态颜色映射
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'partial': return 'info';
      case 'paid': return 'success';
      default: return 'default';
    }
  };

  // 判断是否超期
  const isOverdue = (dueDate?: string, status?: string) => {
    if (!dueDate || status === 'paid') return false;
    return new Date(dueDate) < new Date();
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

  // 应用筛选
  const handleApplyFilters = () => {
    setPage(1);
    loadPayables();
    setShowFilters(false);
  };

  // 清除筛选
  const handleClearFilters = () => {
    setFilters({
      supplier: '',
      status: '',
      base: '',
      start_date: '',
      end_date: '',
    });
    setPage(1);
  };

  // 刷新数据
  const handleRefresh = () => {
    loadPayables();
    loadStatistics();
    notification.showSuccess('数据已刷新');
  };

  // 导出数据
  const handleExport = () => {
    if (!payables.length) {
      notification.showWarning('暂无数据可导出');
      return;
    }

    // 创建CSV内容
    const headers = ['供应商', '货款总额', '已付金额', '总欠款', '基地', '状态', '到期日期'];
    const csvContent = [
      headers.join(','),
      ...payables.map(payable => [
        payable.supplier,
        payable.total_amount,
        payable.paid_amount,
        payable.remaining_amount,
        payable.base?.name || '-',
        PayableStatusText[payable.status],
        payable.due_date ? formatDate(payable.due_date) : '-'
      ].join(','))
    ].join('\n');

    // 下载文件
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `应付款管理_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    notification.showSuccess('数据导出成功');
  };

  useEffect(() => {
    loadPayables();
    loadStatistics();
  }, [page]);

  if (loading && payables.length === 0) {
    return <PageLoading />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 页面标题 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentIcon color="primary" />
          应付款管理
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={showStats ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setShowStats(!showStats)}
          >
            {showStats ? '隐藏统计' : '显示统计'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            筛选
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExport}
          >
            导出
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

      {/* 统计信息区域 */}
      <Collapse in={showStats}>
        {summary && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        应付总额
                      </Typography>
                      <Typography variant="h6">
                        {formatAmount(summary.total_payable)}
                      </Typography>
                    </Box>
                    <TrendingUpIcon sx={{ fontSize: 40, color: 'info.main' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        已付金额
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        {formatAmount(summary.total_paid)}
                      </Typography>
                    </Box>
                    <AssessmentIcon sx={{ fontSize: 40, color: 'success.main' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="textSecondary" gutterBottom>
                        剩余欠款
                      </Typography>
                      <Typography variant="h6" color="warning.main">
                        {formatAmount(summary.total_remaining)}
                      </Typography>
                    </Box>
                    <WarningIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Collapse>

      {/* 筛选条件 */}
      <Collapse in={showFilters}>
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="end">
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>状态</InputLabel>
                <Select
                  value={filters.status}
                  label="状态"
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <MenuItem value="">全部</MenuItem>
                  <MenuItem value="pending">待付款</MenuItem>
                  <MenuItem value="partial">部分付款</MenuItem>
                  <MenuItem value="paid">已付清</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="供应商"
                value={filters.supplier}
                onChange={(e) => setFilters({ ...filters, supplier: e.target.value })}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="基地"
                value={filters.base}
                onChange={(e) => setFilters({ ...filters, base: e.target.value })}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="开始日期"
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="结束日期"
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={handleApplyFilters} size="small">
                  搜索
                </Button>
                <Button variant="outlined" onClick={handleClearFilters} size="small">
                  清除
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Collapse>

      {/* 应付款列表 */}
      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>供应商</TableCell>
                <TableCell align="right">货款总额</TableCell>
                <TableCell align="right">已付金额</TableCell>
                <TableCell align="right">总欠款</TableCell>
                <TableCell>基地</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>到期日期</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payables.map((payable) => (
                <TableRow key={payable.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {typeof payable.supplier === 'object' ? (payable.supplier as any).name : payable.supplier}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {formatAmount(payable.total_amount)}
                  </TableCell>
                  <TableCell align="right">
                    <Typography color="success.main">
                      {formatAmount(payable.paid_amount)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography 
                      color={payable.remaining_amount > 0 ? 'warning.main' : 'success.main'}
                      fontWeight="bold"
                    >
                      {formatAmount(payable.remaining_amount)}
                    </Typography>
                  </TableCell>
                  <TableCell>{payable.base?.name || '-'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={PayableStatusText[payable.status]}
                      color={getStatusColor(payable.status) as any}
                      size="small"
                    />
                    {isOverdue(payable.due_date, payable.status) && (
                      <Chip label="超期" color="error" size="small" sx={{ ml: 1 }} />
                    )}
                  </TableCell>
                  <TableCell>
                    {payable.due_date ? formatDate(payable.due_date) : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="查看详情">
                      <IconButton 
                        size="small" 
                        onClick={() => handleViewDetail(payable)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    {payable.remaining_amount > 0 && (
                      <Tooltip title="还款">
                        <IconButton 
                          size="small" 
                          onClick={() => handleStartPayment(payable)}
                          color="primary"
                        >
                          <PaymentIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="编辑状态">
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditStatus(payable)}
                        color="secondary"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {payables.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      暂无应付款记录
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 分页控件 */}
        {total > 0 && (
          <Box sx={{ p: 2 }}>
            <PaginationControl
              pagination={{
                total,
                page,
                page_size: limit,
                total_pages: Math.ceil(total / limit)
              }}
              onPageChange={setPage}
              onPageSizeChange={() => {}} // 暂时不支持修改页面大小
            />
          </Box>
        )}
      </Paper>

      {/* 详情对话框 */}
      <Dialog 
        open={detailDialog} 
        onClose={() => setDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>应付款详情</DialogTitle>
        <DialogContent>
          {selectedPayable && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>供应商：</strong> {typeof selectedPayable.supplier === 'object' ? (selectedPayable.supplier as any).name : selectedPayable.supplier}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>基地：</strong> {selectedPayable.base?.name || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>货款总额：</strong> {formatAmount(selectedPayable.total_amount)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>已付金额：</strong> {formatAmount(selectedPayable.paid_amount)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>剩余欠款：</strong> {formatAmount(selectedPayable.remaining_amount)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>状态：</strong> {PayableStatusText[selectedPayable.status]}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>到期日期：</strong> {selectedPayable.due_date ? formatDate(selectedPayable.due_date) : '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>创建时间：</strong> {formatDate(selectedPayable.created_at)}</Typography>
                </Grid>
              </Grid>

              {/* 还款记录 */}
              {selectedPayable.payment_records && selectedPayable.payment_records.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>还款记录</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>还款日期</TableCell>
                        <TableCell align="right">还款金额</TableCell>
                        <TableCell>还款方式</TableCell>
                        <TableCell>操作人</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedPayable.payment_records.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDate(payment.payment_date)}</TableCell>
                          <TableCell align="right">{formatAmount(payment.payment_amount)}</TableCell>
                          <TableCell>{payment.payment_method}</TableCell>
                          <TableCell>{payment.creator?.name || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 还款对话框 */}
      {paymentTarget && (
        <PaymentDialog
          open={paymentDialog}
          payable={paymentTarget}
          onClose={() => setPaymentDialog(false)}
          onPaymentCreated={handlePaymentCreated}
          onCreatePayment={handleCreatePayment}
        />
      )}
      
      {/* 编辑状态对话框 */}
      <Dialog open={editStatusDialog} onClose={() => setEditStatusDialog(false)}>
        <DialogTitle>编辑应付款状态</DialogTitle>
        <DialogContent>
          {editingPayable && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body1">
                    <strong>供应商:</strong> {typeof editingPayable.supplier === 'object' ? (editingPayable.supplier as any).name : editingPayable.supplier}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body1">
                    <strong>当前状态:</strong> {PayableStatusText[editingPayable.status]}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>新状态</InputLabel>
                    <Select
                      value={newStatus}
                      label="新状态"
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <MenuItem value="pending">待付款</MenuItem>
                      <MenuItem value="partial">部分付款</MenuItem>
                      <MenuItem value="paid">已付清</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditStatusDialog(false)}>取消</Button>
          <Button onClick={handleSaveStatus} variant="contained" color="primary">保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PayableUnifiedView;