import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Info as InfoIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { PayableApi, PayableRecord, PayableSummaryResponse, PayableStatusText, CreatePaymentRequest } from '../api/PayableApi';
import PaginationControl from '../components/PaginationControl';
import { PageLoading } from '../components/LoadingComponents';
import { useNotification } from '../components/NotificationProvider';
import { PaymentDialog } from '../components/PaymentDialog';
// 图表与跨模块汇总功能已迁移至统计分析页面

export const PayableUnifiedView: React.FC = () => {
  const notification = useNotification();
  const payableApi = new PayableApi();
  const navigate = useNavigate();

  // 状态管理
  const [payables, setPayables] = useState<PayableRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  
  // 统计数据
  const [summary, setSummary] = useState<PayableSummaryResponse | null>(null);
  // 已简化：去除本页中的供应商欠款与超期列表，保留汇总卡片
  const [showStats, setShowStats] = useState(true);
  // 已移除：统计分析相关本地状态与导出函数（迁移至统计分析页面）
  // 统计清单弹窗
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [statsDialogTitle, setStatsDialogTitle] = useState('');
  const [statsDialogLoading, setStatsDialogLoading] = useState(false);
  const [statsDialogRecords, setStatsDialogRecords] = useState<PayableRecord[]>([]);
  
  // 筛选条件（支持从URL初始化）
  const location = useLocation();
  const initialFilters = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      supplier: params.get('supplier') || '',
      status: params.get('status') || '',
      base: params.get('base') || '',
      start_date: params.get('start_date') || '',
      end_date: params.get('end_date') || '',
    };
  }, [location.search]);
  const [filters, setFilters] = useState(initialFilters);
  const [showFilters, setShowFilters] = useState(false);
  
  // 详情对话框
  const [selectedPayable, setSelectedPayable] = useState<PayableRecord | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  
  // 还款对话框
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<PayableRecord | null>(null);
  
  // 已移除编辑状态功能，状态由金额自动计算

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
    loadStatistics();
    setPaymentDialog(false);
    setPaymentTarget(null);
  };

  // 无编辑状态逻辑

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

  // 结算方式展示
  const settlementLabel = (t?: string) => {
    switch (t) {
      case 'monthly': return '月结';
      case 'immediate': return '即付';
      case 'flexible': return '灵活';
      default: return '灵活';
    }
  };

  const halfLabel = (half?: string) => {
    if (!half) return '-';
    const [y, h] = half.split('-');
    return `${y}年${h === 'H1' ? '上半年' : '下半年'}`;
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

  // 删除应付款（仅admin可见入口，由后端二次校验）
  const handleDeletePayable = async (id: number) => {
    try {
      if (!confirm('确定删除该应付款记录吗？此操作不可撤销')) return;
      await payableApi.deletePayable(id);
      notification.showSuccess('删除成功');
      loadPayables();
      loadStatistics();
    } catch (e: any) {
      notification.showError(e.message || '删除失败');
    }
  };

  // 已迁移的未结货款统计逻辑删除

  // 统计清单导出（CSV）
  const exportStatsDialogCsv = () => {
    if (!statsDialogRecords || statsDialogRecords.length === 0) return;
    const headers = ['供应商','总金额','已付','剩余','状态','到期','基地'];
    const rows = statsDialogRecords.map(r => [
      typeof r.supplier === 'object' ? (r.supplier as any).name : (r.supplier as any) || '',
      r.total_amount,
      r.paid_amount,
      r.remaining_amount,
      PayableStatusText[r.status],
      r.due_date ? formatDate(r.due_date) : '-',
      r.base?.name || '-',
    ]);
    const csv = [headers, ...rows].map(cols => cols.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '统计清单.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 已迁移的按供应商清单逻辑删除

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

  // 打开统计清单（按状态或超期）
  const openStatsList = async (type: 'pending' | 'partial' | 'paid' | 'overdue') => {
    try {
      setStatsDialogLoading(true);
      setStatsDialogOpen(true);
      let title = '';
      let records: PayableRecord[] = [];
      if (type === 'overdue') {
        title = '超期应付款清单';
        records = await payableApi.getOverduePayables();
      } else {
        title = (type === 'pending' ? '待付款' : type === 'partial' ? '部分付款' : '已付清') + ' 清单';
        const res = await payableApi.getPayableList({ status: type, page: 1, limit: 100 });
        records = res.records;
      }
      setStatsDialogTitle(title);
      setStatsDialogRecords(records);
    } catch (e: any) {
      notification.showError(e.message || '加载统计清单失败');
    } finally {
      setStatsDialogLoading(false);
    }
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
            {/* 数量统计：可点击查看清单 */}
            <Grid item xs={12} md={3}>
              <Card sx={{ cursor: 'pointer' }} onClick={() => openStatsList('pending')}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>待付款数量</Typography>
                  <Typography variant="h5">{summary.pending_count}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ cursor: 'pointer' }} onClick={() => openStatsList('partial')}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>部分付款数量</Typography>
                  <Typography variant="h5">{summary.partial_count}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ cursor: 'pointer' }} onClick={() => openStatsList('paid')}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>已付清数量</Typography>
                  <Typography variant="h5">{summary.paid_count}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ cursor: 'pointer' }} onClick={() => openStatsList('overdue')}>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>超期数量</Typography>
                  <Typography variant="h5">{summary.overdue_count}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* 统计分析模块已迁移到“统计分析”页面 */}

        {/* 未结货款（按供应商）模块已迁移到“统计分析”页面 */}
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
                <TableCell>币种</TableCell>
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
                    <Box component="div" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                      <Typography component="span" variant="body2" fontWeight="medium">
                        {typeof payable.supplier === 'object' ? (payable.supplier as any).name : payable.supplier}
                      </Typography>
                      {typeof payable.supplier === 'object' && (
                        <Chip size="small" label={settlementLabel((payable.supplier as any).settlement_type)} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {Number(payable.total_amount ?? 0).toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    <Typography color="success.main">
                      {Number(payable.paid_amount ?? 0).toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography 
                      color={payable.remaining_amount > 0 ? 'warning.main' : 'success.main'}
                      fontWeight="bold"
                    >
                      {Number(payable.remaining_amount ?? 0).toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell>{String((payable as any).currency || 'CNY').toUpperCase()}</TableCell>
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
                    {payable.due_date ? (
                      formatDate(payable.due_date)
                    ) : (
                      <Tooltip title="无明确到期日（灵活/开放式结算）">
                        <Chip size="small" label="无到期" />
                      </Tooltip>
                    )}
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
                    {/* 删除（admin） */}
                    {/** 入口简单显示，由后端校验权限；如需前端基于角色隐藏，可在全局store获取user.role判断 **/}
                    <Tooltip title="删除">
                      <IconButton size="small" color="error" onClick={() => handleDeletePayable(payable.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                    {/* 编辑状态功能已移除 */}
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
                  <Typography variant="body2" component="div">
                    <strong>供应商：</strong> {typeof selectedPayable.supplier === 'object' ? (selectedPayable.supplier as any).name : selectedPayable.supplier}
                    {typeof selectedPayable.supplier === 'object' && (
                      <Chip size="small" sx={{ ml: 1 }} label={`结算方式：${settlementLabel((selectedPayable.supplier as any).settlement_type)}`}/>
                    )}
                  </Typography>
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
                  <Typography variant="body2"><strong>到期日期：</strong> {selectedPayable.due_date ? (
                    formatDate(selectedPayable.due_date)
                  ) : (
                    <span>无 <Tooltip title="此应付款为灵活/开放式结算，未设置固定到期日"><InfoIcon fontSize="small" /></Tooltip></span>
                  )}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>创建时间：</strong> {formatDate(selectedPayable.created_at)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>累计周期：</strong> {selectedPayable.period_month ? selectedPayable.period_month : halfLabel((selectedPayable as any).period_half)}</Typography>
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

              {/* 货款清单（累计来源明细） */}
              {selectedPayable.links && selectedPayable.links.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>货款清单（累计明细）</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>订单号</TableCell>
                        <TableCell>采购日期</TableCell>
                        <TableCell align="right">计入金额</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedPayable.links.map((link: any) => (
                        <TableRow key={link.id}>
                          <TableCell>{link.purchase_entry?.order_number || '-'}</TableCell>
                          <TableCell>{link.purchase_entry?.purchase_date ? formatDate(link.purchase_entry.purchase_date) : '-'}</TableCell>
                          <TableCell align="right">{formatAmount(link.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}

              {/* 变更时间线（采购计入 + 还款），支持筛选与导出 */}
              <Box sx={{ mt: 3 }}>
                <TimelineSection payable={selectedPayable} />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedPayable && (
            <Button onClick={() => window.open(`/payable/timeline/${selectedPayable.id}`, '_blank')}>独立页面打开时间线</Button>
          )}
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

      {/* 统计清单弹窗 */}
      <Dialog open={statsDialogOpen} onClose={() => setStatsDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>{statsDialogTitle || '清单'}</DialogTitle>
        <DialogContent>
          {statsDialogLoading ? (
            <Typography sx={{ p: 2 }}>加载中...</Typography>
          ) : statsDialogRecords.length === 0 ? (
            <Typography sx={{ p: 2 }}>暂无记录</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>供应商</TableCell>
                  <TableCell>总金额</TableCell>
                  <TableCell>已付</TableCell>
                  <TableCell>剩余</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>到期</TableCell>
                  <TableCell>基地</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {statsDialogRecords.map(r => (
                  <TableRow key={r.id} hover>
                    <TableCell>{typeof r.supplier === 'object' ? (r.supplier as any).name : r.supplier}</TableCell>
                    <TableCell>{formatAmount(r.total_amount)}</TableCell>
                    <TableCell>{formatAmount(r.paid_amount)}</TableCell>
                    <TableCell>{formatAmount(r.remaining_amount)}</TableCell>
                    <TableCell><Chip size="small" label={PayableStatusText[r.status]} color={getStatusColor(r.status) as any} /></TableCell>
                    <TableCell>{r.due_date ? formatDate(r.due_date) : '-'}</TableCell>
                    <TableCell>{r.base?.name || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={exportStatsDialogCsv} disabled={statsDialogRecords.length === 0}>导出CSV</Button>
          <Button onClick={() => setStatsDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
      
    </Box>
  );
};

export default PayableUnifiedView;

// 子组件：变更时间线（筛选 + 导出）
const TimelineSection: React.FC<{ payable: PayableRecord }> = ({ payable }) => {
  const [includeIn, setIncludeIn] = useState(true);   // 采购计入
  const [includeOut, setIncludeOut] = useState(true); // 还款
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const formatAmount = (amount: number) => amount.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' });
  const formatDate = (d: string) => new Date(d).toLocaleDateString('zh-CN');

  const allEvents = React.useMemo(() => {
    const ev: { time: string; type: 'in' | 'out'; label: string; delta: number }[] = [];
    if (payable.links && payable.links.length) {
      payable.links.forEach((link: any) => {
        const t = link.created_at || link.purchase_entry?.purchase_date || payable.created_at;
        ev.push({ time: t, type: 'in', label: '采购计入', delta: link.amount });
      });
    }
    if (payable.payment_records && payable.payment_records.length) {
      payable.payment_records.forEach((p: any) => {
        const t = p.payment_date || p.created_at;
        ev.push({ time: t, type: 'out', label: '还款', delta: -p.payment_amount });
      });
    }
    return ev.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [payable]);

  const filtered = allEvents.filter(e => {
    if (e.type === 'in' && !includeIn) return false;
    if (e.type === 'out' && !includeOut) return false;
    if (start && new Date(e.time) < new Date(start)) return false;
    if (end) {
      const endDate = new Date(end);
      endDate.setHours(23,59,59,999);
      if (new Date(e.time) > endDate) return false;
    }
    return true;
  });

  const exportCSV = () => {
    let running = 0;
    const rows = [['日期', '类型', '金额变化', '累计余额']];
    filtered.forEach(e => {
      running += e.delta;
      rows.push([formatDate(e.time), e.label, e.delta.toString(), running.toString()]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `应付款变更时间线_${payable.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  let running = 0;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>变更时间线</Typography>
        <FormControl size="small">
          <Stack direction="row" spacing={1} alignItems="center">
            <label><input type="checkbox" checked={includeIn} onChange={(e) => setIncludeIn(e.target.checked)} /> 采购计入</label>
            <label><input type="checkbox" checked={includeOut} onChange={(e) => setIncludeOut(e.target.checked)} /> 还款</label>
            <TextField size="small" type="date" label="开始" InputLabelProps={{ shrink: true }} value={start} onChange={e => setStart(e.target.value)} />
            <TextField size="small" type="date" label="结束" InputLabelProps={{ shrink: true }} value={end} onChange={e => setEnd(e.target.value)} />
            <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={exportCSV}>导出CSV</Button>
          </Stack>
        </FormControl>
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>日期</TableCell>
            <TableCell>类型</TableCell>
            <TableCell>金额变化</TableCell>
            <TableCell>累计余额</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center">暂无记录</TableCell>
            </TableRow>
          ) : (
            filtered.map((e, idx) => {
              running += e.delta;
              return (
                <TableRow key={idx}>
                  <TableCell>{formatDate(e.time)}</TableCell>
                  <TableCell>{e.label}</TableCell>
                  <TableCell sx={{ color: e.delta >= 0 ? 'success.main' : 'error.main' }}>{formatAmount(e.delta)}</TableCell>
                  <TableCell>{formatAmount(running)}</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Paper>
  );
};
