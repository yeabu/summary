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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { SupplierApi, Supplier } from '../api/SupplierApi';
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

  // 提交表单
  const handleSubmit = async () => {
    try {
      if (editingSupplier) {
        // 更新供应商
        await supplierApi.updateSupplier(editingSupplier.id, formData);
        notification.showSuccess('供应商更新成功');
      } else {
        // 创建供应商
        await supplierApi.createSupplier(formData);
        notification.showSuccess('供应商创建成功');
      }
      handleCloseDialog();
      loadSuppliers();
    } catch (err: any) {
      notification.showError(err.message || '操作失败');
    }
  };

  // 删除供应商
  const handleDelete = async (supplier: Supplier) => {
    if (!window.confirm(`确定要删除供应商 "${supplier.name}" 吗？`)) {
      return;
    }

    try {
      await supplierApi.deleteSupplier(supplier.id);
      notification.showSuccess('供应商删除成功');
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
                        onClick={() => handleDelete(supplier)}
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
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
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
    </Box>
  );
};

export default SupplierManagementView;