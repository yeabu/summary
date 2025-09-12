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
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Payment as PaymentIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { PayableApi, PayableRecord, PayableSummaryResponse, PayableStatusText, CreatePaymentRequest } from '../api/PayableApi';
import PaginationControl from '../components/PaginationControl';
import { PageLoading } from '../components/LoadingComponents';
import { useNotification } from '../components/NotificationProvider';
import { PaymentDialog } from '../components/PaymentDialog';

export const PayableManagementView: React.FC = () => {
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
  const loadSummary = async () => {
    try {
      const summaryData = await payableApi.getPayableSummary();
      setSummary(summaryData);
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
    loadSummary();
    setPaymentDialog(false);
    setPaymentTarget(null);
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
    loadSummary();
    notification.showSuccess('数据已刷新');
  };

  useEffect(() => {
    loadPayables();
    loadSummary();
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
            startIcon={<FilterListIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            筛选
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

      {/* 统计卡片 */}
      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  总应付款
                </Typography>
                <Typography variant="h5" color="primary">
                  {formatAmount(summary.total_payable)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  已付金额
                </Typography>
                <Typography variant="h5" color="success.main">
                  {formatAmount(summary.total_paid)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  剩余欠款
                </Typography>
                <Typography variant="h5" color="warning.main">
                  {formatAmount(summary.total_remaining)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 筛选面板 */}
      {showFilters && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="供应商"
                value={filters.supplier}
                onChange={(e) => setFilters({ ...filters, supplier: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
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
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="开始日期"
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="结束日期"
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button variant="contained" onClick={handleApplyFilters}>
              应用筛选
            </Button>
            <Button variant="outlined" onClick={handleClearFilters}>
              清除筛选
            </Button>
          </Box>
        </Paper>
      )}

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 应付款列表 */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>供应商</TableCell>
                <TableCell>总金额</TableCell>
                <TableCell>已付金额</TableCell>
                <TableCell>剩余金额</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>到期日期</TableCell>
                <TableCell>基地</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payables.map((payable) => (
                <TableRow 
                  key={payable.id}
                  sx={{ 
                    backgroundColor: isOverdue(payable.due_date, payable.status) ? 'error.light' : 'inherit',
                    opacity: isOverdue(payable.due_date, payable.status) ? 0.8 : 1
                  }}
                >
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {typeof payable.supplier === 'object' ? (payable.supplier as any).name : payable.supplier}
                      </Typography>
                      {payable.purchase_entry && (
                        <Typography variant="caption" color="textSecondary">
                          订单号: {payable.purchase_entry.order_number}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{formatAmount(payable.total_amount)}</TableCell>
                  <TableCell>{formatAmount(payable.paid_amount)}</TableCell>
                  <TableCell>
                    <Typography 
                      color={payable.remaining_amount > 0 ? 'warning.main' : 'success.main'}
                      fontWeight="bold"
                    >
                      {formatAmount(payable.remaining_amount)}
                    </Typography>
                  </TableCell>
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
                  <TableCell>{payable.base?.name || '-'}</TableCell>
                  <TableCell>
                    <Tooltip title="查看详情">
                      <IconButton 
                        size="small" 
                        onClick={() => handleViewDetail(payable)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    {payable.status !== 'paid' && (
                      <Tooltip title="还款">
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleStartPayment(payable)}
                        >
                          <PaymentIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 分页控制 */}
        <Box sx={{ p: 2 }}>
          <PaginationControl
            pagination={{
              total: total,
              page: page,
              page_size: limit,
              total_pages: Math.ceil(total / limit)
            }}
            onPageChange={setPage}
            onPageSizeChange={(newLimit) => {
              // 如果需要支持动态修改每页数量，可以在这里处理
              console.log('New page size:', newLimit);
            }}
            loading={loading}
          />
        </Box>
      </Paper>

      {/* 详情对话框 */}
      <Dialog 
        open={detailDialog} 
        onClose={() => setDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          应付款详情
        </DialogTitle>
        <DialogContent>
          {selectedPayable && (
            <Box>
              {/* 基本信息 */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">供应商</Typography>
                  <Typography variant="body1">{typeof selectedPayable.supplier === 'object' ? (selectedPayable.supplier as any).name : selectedPayable.supplier}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">状态</Typography>
                  <Chip 
                    label={PayableStatusText[selectedPayable.status]}
                    color={getStatusColor(selectedPayable.status) as any}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">总金额</Typography>
                  <Typography variant="body1">{formatAmount(selectedPayable.total_amount)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">已付金额</Typography>
                  <Typography variant="body1">{formatAmount(selectedPayable.paid_amount)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">剩余金额</Typography>
                  <Typography variant="body1" color="warning.main" fontWeight="bold">
                    {formatAmount(selectedPayable.remaining_amount)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">到期日期</Typography>
                  <Typography variant="body1">
                    {selectedPayable.due_date ? formatDate(selectedPayable.due_date) : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">订单号</Typography>
                  <Typography variant="body1">{selectedPayable.purchase_entry?.order_number || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">采购日期</Typography>
                  <Typography variant="body1">
                    {selectedPayable.purchase_entry?.purchase_date ? formatDate(selectedPayable.purchase_entry.purchase_date) : '-'}
                  </Typography>
                </Grid>
                {/* 添加采购商品详情 */}
                {selectedPayable.purchase_entry?.items && selectedPayable.purchase_entry.items.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">采购商品</Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>商品名称</TableCell>
                            <TableCell>数量</TableCell>
                            <TableCell>单价</TableCell>
                            <TableCell>金额</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedPayable.purchase_entry.items.map((item: { id: number; product_name: string; quantity: number; unit_price: number; amount: number; }) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.product_name}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>{formatAmount(item.unit_price)}</TableCell>
                              <TableCell>{formatAmount(item.amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                )}
              </Grid>

              {/* 还款记录 */}
              {selectedPayable.payment_records && selectedPayable.payment_records.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>还款记录</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>还款日期</TableCell>
                          <TableCell>还款金额</TableCell>
                          <TableCell>还款方式</TableCell>
                          <TableCell>参考号</TableCell>
                          <TableCell>备注</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedPayable.payment_records.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{formatDate(payment.payment_date)}</TableCell>
                            <TableCell>{formatAmount(payment.payment_amount)}</TableCell>
                            <TableCell>{payment.payment_method}</TableCell>
                            <TableCell>{payment.reference_number || '-'}</TableCell>
                            <TableCell>{payment.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
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
      <PaymentDialog
        open={paymentDialog}
        onClose={() => {
          setPaymentDialog(false);
          setPaymentTarget(null);
        }}
        payable={paymentTarget}
        onPaymentCreated={handlePaymentCreated}
        onCreatePayment={handleCreatePayment}
      />
    </Box>
  );
};