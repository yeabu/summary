/**
 * BaseManagementView - 基地管理页面
 *
 * 管理员专用功能，用于管理系统中的基地信息
 * 支持基地的增删改查操作
 */
import React, { useEffect, useState } from 'react';
import {
  Paper,
  Box,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  Typography,
  IconButton,
  Tooltip,
  Alert,
  Chip,
  Checkbox,
  TextField,
  InputAdornment,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Base } from '@/api/AppDtos';
import BaseForm from '@/components/BaseForm';
import BatchOperations, { BatchAction } from '@/components/BatchOperations';
import { useNotification } from '@/components/NotificationProvider';
import { ApiClient } from '@/api/ApiClient';

const BaseManagementView: React.FC = () => {
  const navigate = useNavigate();
  const notification = useNotification();
  const [loading, setLoading] = useState(false);
  const [bases, setBases] = useState<Base[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBase, setEditingBase] = useState<Base | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  
  // 搜索和筛选状态
  const [searchName, setSearchName] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // 批量选择状态
  const [selectedItems, setSelectedItems] = useState<Base[]>([]);
  
  // 批量操作定义
  const batchActions: BatchAction[] = [
    {
      id: 'delete',
      label: '批量删除',
      icon: <DeleteIcon />,
      color: 'error',
      dangerous: true
    }
  ];
  
  // 创建 ApiClient 实例
  const apiClient = new ApiClient();

  const loadBases = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = {};
      if (searchName.trim()) {
        params.name = searchName.trim();
      }
      if (statusFilter) {
        params.status = statusFilter;
      }

      // 使用实例方法而不是静态方法
      const response = await apiClient.baseList();
      setBases(response || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载基地列表失败');
      console.error('Load bases error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBases();
  }, []);

  const handleSearch = () => {
    loadBases();
  };

  const handleAddNew = () => {
    setEditingBase(null);
    setEditDialogOpen(true);
  };

  const handleEdit = (base: Base) => {
    setEditingBase(base);
    setEditDialogOpen(true);
  };

  const handleManageSections = (base: Base) => {
    // 使用React Router导航到分区管理页面，并传递基地ID作为查询参数
    navigate(`/base/section-management?base_id=${base.id}`);
  };

  const handleSubmit = async (baseData: Base) => {
    setSubmitting(true);
    try {
      // 创建一个符合ApiClient.Base类型的新对象
      const apiBaseData = {
        name: baseData.name,
        code: baseData.code,
        location: baseData.location,
        description: baseData.description,
        status: baseData.status || 'active', // 确保status字段不为undefined
        created_by: 1 // 添加created_by字段，这里使用默认值1，实际应该从认证信息中获取
      };
      
      if (editingBase?.id) {
        // 使用实例方法而不是静态方法
        await apiClient.baseUpdate(editingBase.id, apiBaseData);
        notification.showSuccess('基地信息更新成功');
      } else {
        // 使用实例方法而不是静态方法
        await apiClient.baseCreate(apiBaseData);
        notification.showSuccess('基地创建成功');
      }
      setEditDialogOpen(false);
      setEditingBase(null);
      loadBases();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '保存基地信息失败';
      setError(errorMessage);
      throw err; // 重新抛出错误，让表单组件处理
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('确认删除该基地吗？此操作不可撤销。')) {
      return;
    }
    
    try {
      // 使用实例方法而不是静态方法
      await apiClient.baseDelete(id);
      notification.showSuccess('删除成功');
      loadBases();
      // 清除选中项中被删除的项
      setSelectedItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除失败';
      setError(errorMessage);
      notification.showError(errorMessage);
    }
  };
  
  // 批量操作处理
  const handleBatchAction = async (actionId: string, selectedItems: Base[]) => {
    console.log('BatchAction called:', { actionId, selectedItemsCount: selectedItems.length, selectedItems });
    
    try {
      const ids = selectedItems.map(item => item.id!).filter(id => id !== undefined && id !== null);
      console.log('Extracted IDs:', ids);
      
      if (ids.length === 0) {
        notification.showError('没有选择有效的记录');
        return;
      }
      
      if (actionId === 'delete') {
        console.log('Calling batchDelete with IDs:', ids);
        // 使用实例方法而不是静态方法
        await apiClient.baseBatchDelete(ids);
        notification.showSuccess(`成功删除 ${ids.length} 个基地`);
        // 重新加载数据
        loadBases();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '批量操作失败';
      console.error('Batch action error:', err, errorMessage);
      notification.showError(errorMessage);
    }
  };
  
  // 单个选择处理
  const handleItemSelect = (item: Base, checked: boolean) => {
    console.log('handleItemSelect called:', {
      itemId: item.id,
      checked,
      currentSelectedCount: selectedItems.length
    });
    
    if (checked) {
      const newSelection = [...selectedItems, item];
      console.log('Adding item, new selection:', newSelection);
      setSelectedItems(newSelection);
    } else {
      const newSelection = selectedItems.filter(selected => selected.id !== item.id);
      console.log('Removing item, new selection:', newSelection);
      setSelectedItems(newSelection);
    }
  };
  
  // 获取项目ID
  const getItemId = (item: Base) => item.id || 0;
  
  // 获取项目标签
  const getItemLabel = (item: Base) => {
    return `${item.name} (${item.code})`;
  };

  const getStatusChip = (status?: string) => {
    switch (status) {
      case 'active':
        return <Chip label="启用" color="success" size="small" />;
      case 'inactive':
        return <Chip label="停用" color="default" size="small" />;
      default:
        return <Chip label="未知" color="warning" size="small" />;
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1">
          基地管理
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadBases}
            disabled={loading}
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddNew}
            disabled={loading}
          >
            新增基地
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 搜索筛选栏 */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          label="搜索基地名称"
          size="small"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={handleSearch} size="small">
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          label="状态筛选"
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">全部状态</MenuItem>
          <MenuItem value="active">启用</MenuItem>
          <MenuItem value="inactive">停用</MenuItem>
        </TextField>
      </Box>

      {/* 批量操作栏 */}
      <BatchOperations
        allItems={bases}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        getItemId={getItemId}
        getItemLabel={getItemLabel}
        actions={batchActions}
        onBatchAction={handleBatchAction}
        disabled={loading}
      />

      {/* 基地列表 */}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              {/* 批量操作的全选复选框由BatchOperations组件处理 */}
            </TableCell>
            <TableCell>基地名称</TableCell>
            <TableCell>基地代码</TableCell>
            <TableCell>位置</TableCell>
            <TableCell>状态</TableCell>
            <TableCell>创建时间</TableCell>
            <TableCell align="right">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                加载中...
              </TableCell>
            </TableRow>
          ) : bases.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                暂无基地数据
              </TableCell>
            </TableRow>
          ) : (
            bases.map((base) => (
              <TableRow key={base.id} hover>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedItems.some(item => item.id === base.id)}
                    onChange={(e) => handleItemSelect(base, e.target.checked)}
                  />
                </TableCell>
                <TableCell>{base.name}</TableCell>
                <TableCell>{base.code}</TableCell>
                <TableCell>{base.location || '-'}</TableCell>
                <TableCell>{getStatusChip(base.status)}</TableCell>
                <TableCell>{base.created_at ? new Date(base.created_at).toLocaleDateString() : '-'}</TableCell>
                <TableCell align="right">
                  <Tooltip title="管理分区">
                    <IconButton size="small" onClick={() => handleManageSections(base)}>
                      <PeopleIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="编辑">
                    <IconButton size="small" onClick={() => handleEdit(base)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="删除">
                    <IconButton size="small" onClick={() => base.id && handleDelete(base.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <BaseForm
          open={editDialogOpen}
          initial={editingBase || undefined}
          onSubmit={handleSubmit}
          onClose={() => setEditDialogOpen(false)}
          submitting={submitting}
        />
      </Dialog>
    </Paper>
  );
};

export default BaseManagementView;