/**
 * BaseSectionManagementView - 基地区域管理页面
 *
 * 管理员专用功能，用于管理系统中的基地区域信息
 * 支持基地区域的增删改查操作
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
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { BaseSection, Base } from '@/api/AppDtos';
import BaseSectionForm from '@/components/BaseSectionForm';
import BatchOperations, { BatchAction } from '@/components/BatchOperations';
import { useNotification } from '@/components/NotificationProvider';
import { ApiClient } from '@/api/ApiClient';
import ConfirmDialog from '@/components/ConfirmDialog';

const BaseSectionManagementView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const notification = useNotification();
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<BaseSection[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<BaseSection | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  
  // 搜索和筛选状态
  const [searchName, setSearchName] = useState('');
  const [baseFilter, setBaseFilter] = useState('');
  
  // 下拉选项数据
  const [bases, setBases] = useState<Base[]>([]);
  
  // 批量选择状态
  const [selectedItems, setSelectedItems] = useState<BaseSection[]>([]);
  
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

  // 加载基地数据
  const loadBases = async () => {
    try {
      // 使用实例方法而不是静态方法
      const baseList = await apiClient.baseList();
      setBases(baseList || []);
    } catch (err) {
      console.error('Load bases error:', err);
    }
  };

  const loadSections = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = {};
      if (searchName.trim()) {
        params.name = searchName.trim();
      }
      if (baseFilter) {
        params.base_id = baseFilter;
      }

      // 使用实例方法而不是静态方法
      const response = await apiClient.sectionList(baseFilter ? parseInt(baseFilter) : undefined);
      setSections(response || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载分区列表失败');
      console.error('Load sections error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 解析查询参数
  useEffect(() => {
    loadBases();
    
    // 解析URL查询参数
    const searchParams = new URLSearchParams(location.search);
    const baseId = searchParams.get('base_id');
    if (baseId) {
      setBaseFilter(baseId);
    }
  }, [location.search]);

  // 当筛选条件变化时重新加载数据
  useEffect(() => {
    if (bases.length > 0) { // 确保基地数据已加载
      loadSections();
    }
  }, [searchName, baseFilter, bases.length]);

  const handleSearch = () => {
    loadSections();
  };

  const handleAddNew = () => {
    setEditingSection(null);
    setEditDialogOpen(true);
  };

  const handleEdit = (section: BaseSection) => {
    setEditingSection(section);
    setEditDialogOpen(true);
  };

  const handleSubmit = async (sectionData: BaseSection) => {
    setSubmitting(true);
    try {
      if (editingSection?.id) {
        // 使用实例方法而不是静态方法
        await apiClient.sectionUpdate(editingSection.id, sectionData);
        notification.showSuccess('分区信息更新成功');
      } else {
        // 使用实例方法而不是静态方法
        await apiClient.sectionCreate(sectionData);
        notification.showSuccess('分区创建成功');
      }
      setEditDialogOpen(false);
      setEditingSection(null);
      loadSections();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '保存分区信息失败';
      setError(errorMessage);
      throw err; // 重新抛出错误，让表单组件处理
    } finally {
      setSubmitting(false);
    }
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDeleteId, setToDeleteId] = useState<number | null>(null);
  const handleDelete = (id: number) => { setToDeleteId(id); setConfirmOpen(true); };
  const doDelete = async () => {
    if (!toDeleteId) return;
    try {
      await apiClient.sectionDelete(toDeleteId);
      notification.showSuccess('删除成功');
      loadSections();
      setSelectedItems(prev => prev.filter(item => item.id !== toDeleteId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除失败';
      setError(errorMessage);
      notification.showError(errorMessage);
    } finally {
      setConfirmOpen(false);
      setToDeleteId(null);
    }
  };
  
  // 批量操作处理
  const handleBatchAction = async (actionId: string, selectedItems: BaseSection[]) => {
    console.log('BatchAction called:', { actionId, selectedItemsCount: selectedItems.length, selectedItems });
    
    try {
      const ids = selectedItems.map(item => item.id!).filter(id => id !== undefined && id !== null);
      console.log('Extracted IDs:', ids);
      
      if (ids.length === 0) {
        notification.showError('没有选择有效的记录');
        return;
      }
      
      if (actionId === 'delete') {
        // 注意：当前API没有提供批量删除分区的接口，需要逐个删除
        // 使用实例方法而不是静态方法
        const deletePromises = ids.map(id => apiClient.sectionDelete(id));
        await Promise.all(deletePromises);
        notification.showSuccess(`成功删除 ${ids.length} 个分区`);
        // 重新加载数据
        loadSections();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '批量操作失败';
      console.error('Batch action error:', err, errorMessage);
      notification.showError(errorMessage);
    }
  };
  
  // 单个选择处理
  const handleItemSelect = (item: BaseSection, checked: boolean) => {
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
  const getItemId = (item: BaseSection) => item.id || 0;
  
  // 获取项目标签
  const getItemLabel = (item: BaseSection) => {
    return `${item.name} (${item.base_name})`;
  };

  // 返回基地管理页面
  const handleBackToBaseManagement = () => {
    navigate('/base/management');
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1">
          基地区域管理
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={handleBackToBaseManagement}
          >
            返回基地管理
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadSections}
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
            新增分区
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
          label="搜索分区名称"
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
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>基地筛选</InputLabel>
          <Select
            value={baseFilter}
            onChange={(e) => setBaseFilter(e.target.value as string)}
            label="基地筛选"
          >
            <MenuItem value="">全部基地</MenuItem>
            {bases.map(base => (
              <MenuItem key={base.id} value={base.id?.toString()}>
                {base.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* 批量操作栏 */}
      <BatchOperations
        allItems={sections}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        getItemId={getItemId}
        getItemLabel={getItemLabel}
        actions={batchActions}
        onBatchAction={handleBatchAction}
        disabled={loading}
      />

      {/* 分区列表 */}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              {/* 批量操作的全选复选框由BatchOperations组件处理 */}
            </TableCell>
            <TableCell>分区名称</TableCell>
            <TableCell>所属基地</TableCell>
            <TableCell>队长</TableCell>
            <TableCell>描述</TableCell>
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
          ) : sections.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                暂无分区数据
              </TableCell>
            </TableRow>
          ) : (
            sections.map((section) => (
              <TableRow key={section.id} hover>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedItems.some(item => item.id === section.id)}
                    onChange={(e) => handleItemSelect(section, e.target.checked)}
                  />
                </TableCell>
                <TableCell>{section.name}</TableCell>
                <TableCell>{section.base_name || '-'}</TableCell>
                <TableCell>{section.leader_name || '-'}</TableCell>
                <TableCell>{section.description || '-'}</TableCell>
                <TableCell>{section.created_at ? new Date(section.created_at).toLocaleDateString() : '-'}</TableCell>
                <TableCell align="right">
                  <Tooltip title="编辑">
                    <IconButton size="small" onClick={() => handleEdit(section)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="删除">
                    <IconButton size="small" color="error" onClick={() => section.id && handleDelete(section.id)}>
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
        <BaseSectionForm
          open={editDialogOpen}
          initial={editingSection || undefined}
          onSubmit={handleSubmit}
          onClose={() => setEditDialogOpen(false)}
          submitting={submitting}
          defaultBaseId={baseFilter ? parseInt(baseFilter) : undefined}
        />
      </Dialog>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setToDeleteId(null); }}
        onConfirm={doDelete}
        title="确认删除分区"
        content="此操作不可撤销，确定要删除该分区吗？"
        confirmText="删除"
        confirmColor="error"
      />
    </Paper>
  );
};

export default BaseSectionManagementView;
