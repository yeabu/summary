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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  IconButton,
  Tooltip,
  Chip,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { SupplierApi, Supplier } from '../api/SupplierApi';
import ConfirmDialog from '@/components/ConfirmDialog';
import PaginationControl from '../components/PaginationControl';
import { PageLoading } from '../components/LoadingComponents';
import { useNotification } from '../components/NotificationProvider';

export const SupplierManagementView: React.FC = () => {
  const notification = useNotification();
  const supplierApi = new SupplierApi();

  // 状态管理
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  // 表单状态
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    settlement_type: 'flexible' as 'immediate' | 'monthly' | 'flexible',
    settlement_day: '' as number | '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
  });

  // 筛选条件
  const [filters, setFilters] = useState({
    name: '',
  });

  // 加载供应商列表
  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const response = await supplierApi.getSupplierList({
        page,
        limit,
        name: filters.name,
      });
      setSuppliers(response.records);
      setTotal(response.total);
      setError(null);
    } catch (err: any) {
      setError(err.message || '加载供应商列表失败');
      notification.showError('加载供应商列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    loadSuppliers();
    notification.showSuccess('数据已刷新');
  };

  // 打开创建对话框
  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      settlement_type: 'flexible',
      settlement_day: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
    });
    setOpenDialog(true);
  };

  // 打开编辑对话框
  const handleOpenEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      settlement_type: (supplier as any).settlement_type || 'flexible',
      settlement_day: (supplier as any).settlement_day || '',
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
    });
    setOpenDialog(true);
  };

  // 关闭对话框
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSupplier(null);
  };

  // 处理表单输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      // 构造干净的请求负载，避免空字符串类型问题
      const payload = {
        name: formData.name.trim(),
        settlement_type: formData.settlement_type,
        settlement_day: formData.settlement_type === 'monthly' && formData.settlement_day !== ''
          ? Number(formData.settlement_day) : undefined,
        contact_person: formData.contact_person.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
      };

      if (editingSupplier) {
        await supplierApi.updateSupplier(editingSupplier.id, payload);
        notification.showSuccess('供应商更新成功');
      } else {
        await supplierApi.createSupplier(payload);
        notification.showSuccess('供应商创建成功');
      }
      handleCloseDialog();
      loadSuppliers();
    } catch (err: any) {
      notification.showError(err.message || '操作失败');
    }
  };

  // 删除供应商（对话框确认）
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Supplier | null>(null);
  const askDelete = (supplier: Supplier) => { setToDelete(supplier); setConfirmOpen(true); };
  const doDelete = async () => {
    if (!toDelete) return;
    try {
      await supplierApi.deleteSupplier(toDelete.id);
      notification.showSuccess('供应商删除成功');
      setConfirmOpen(false);
      setToDelete(null);
      loadSuppliers();
    } catch (err: any) {
      notification.showError(err.message || '删除失败');
    }
  };

  // 应用筛选
  const handleApplyFilters = () => {
    setPage(1);
    loadSuppliers();
  };

  // 清除筛选
  const handleClearFilters = () => {
    setFilters({
      name: '',
    });
    setPage(1);
    loadSuppliers();
  };

  useEffect(() => {
    loadSuppliers();
  }, [page]);

  useEffect(() => {
    if (filters.name === '') {
      loadSuppliers();
    }
  }, [filters]);

  if (loading && suppliers.length === 0) {
    return <PageLoading />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 页面标题 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          供应商管理
        </Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            sx={{ mr: 1 }}
          >
            添加供应商
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
          >
            刷新
          </Button>
        </Box>
      </Box>

      {/* 筛选面板 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="end">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="供应商名称"
              value={filters.name}
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleApplyFilters()}
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" onClick={handleApplyFilters}>
                搜索
              </Button>
              <Button variant="outlined" onClick={handleClearFilters}>
                清除
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 供应商列表 */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>供应商名称</TableCell>
                <TableCell>结算方式</TableCell>
                <TableCell>月结日</TableCell>
                <TableCell>联系人</TableCell>
                <TableCell>电话</TableCell>
                <TableCell>邮箱</TableCell>
                <TableCell>地址</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>{supplier.name}</TableCell>
                  <TableCell>
                    <Chip size="small" label={(supplier as any).settlement_type === 'monthly' ? '月结' : (supplier as any).settlement_type === 'immediate' ? '即付' : '灵活'} />
                  </TableCell>
                  <TableCell>{(supplier as any).settlement_type === 'monthly' ? ((supplier as any).settlement_day || '-') : '-'}</TableCell>
                  <TableCell>{supplier.contact_person || '-'}</TableCell>
                  <TableCell>{supplier.phone || '-'}</TableCell>
                  <TableCell>{supplier.email || '-'}</TableCell>
                  <TableCell>{supplier.address || '-'}</TableCell>
                  <TableCell>
                    <Tooltip title="编辑">
                      <IconButton 
                        size="small" 
                        onClick={() => handleOpenEdit(supplier)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton 
                        size="small" 
                        onClick={() => askDelete(supplier)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {suppliers.length === 0 && !loading && (
                <TableRow>
                  {/* 自适应整表宽度：colSpan 与表头列数一致 */}
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">
                      暂无供应商数据
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
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

      {/* 创建/编辑对话框 */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingSupplier ? '编辑供应商' : '添加供应商'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="供应商名称 *"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="结算方式"
                name="settlement_type"
                value={formData.settlement_type}
                onChange={handleSelectChange}
              >
                <MenuItem value="immediate">即付</MenuItem>
                <MenuItem value="monthly">月结</MenuItem>
                <MenuItem value="flexible">灵活</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="月结日 (1-31)"
                name="settlement_day"
                value={formData.settlement_day}
                onChange={handleInputChange}
                inputProps={{ min: 1, max: 31 }}
                disabled={formData.settlement_type !== 'monthly'}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="联系人"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="电话"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="邮箱"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                type="email"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="地址"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={!formData.name.trim()}
          >
            {editingSupplier ? '更新' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setToDelete(null); }}
        onConfirm={doDelete}
        title="确认删除供应商"
        content={`将删除供应商「${toDelete?.name || ''}」。此操作不可撤销。`}
        confirmText="删除"
        confirmColor="error"
      />
    </Box>
  );
};

export default SupplierManagementView;
