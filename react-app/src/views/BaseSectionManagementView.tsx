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
import ApiClient from '@/api/ApiClient';
import BaseSectionForm from '@/components/BaseSectionForm';
import BatchOperations, { BatchAction } from '@/components/BatchOperations';
import { useNotification } from '@/components/NotificationProvider';
import { BaseSection, Base } from '@/api/AppDtos';

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

  // 加载基地数据
  const loadBases = async () => {
    try {
      const baseList = await ApiClient.base.list({});
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

      const response = await ApiClient.baseSection.list(params);
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
        await ApiClient.baseSection.update(editingSection.id, sectionData);
        notification.showSuccess('分区信息更新成功');
      } else {
        await ApiClient.baseSection.create(sectionData);
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

  const handleDelete = async (id: number) => {
    if (!window.confirm('确认删除该分区吗？此操作不可撤销。')) {
      return;
    }
    
    try {
      await ApiClient.baseSection.delete(id);
      notification.showSuccess('删除成功');
      loadSections();
      // 清除选中项中被删除的项
      setSelectedItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除失败';
      setError(errorMessage);
      notification.showError(errorMessage);
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
        const deletePromises = ids.map(id => ApiClient.baseSection.delete(id));
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
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
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
            label="基地筛选"
            onChange={(e) => setBaseFilter(e.target.value)}
          >
            <MenuItem value="">全部基地</MenuItem>
            {bases.map((base) => (
              <MenuItem key={base.id} value={base.id}>
                {base.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="outlined" onClick={handleSearch} disabled={loading}>
          搜索
        </Button>
      </Box>
      
      {/* 批量操作 */}
      <BatchOperations
        allItems={sections}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        getItemId={getItemId}
        getItemLabel={getItemLabel}
        actions={batchActions}
        onBatchAction={handleBatchAction}
        disabled={loading}
        showSelectAll={true}
      />

      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              {/* 留空，由BatchOperations组件管理全选 */}
            </TableCell>
            <TableCell>分区名称</TableCell>
            <TableCell>所属基地</TableCell>
            <TableCell>分区队长</TableCell>
            <TableCell>描述</TableCell>
            <TableCell>操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sections.map((section) => {
            const isSelected = selectedItems.some(item => item.id === section.id);
            return (
              <TableRow key={section.id} hover selected={isSelected}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => handleItemSelect(section, e.target.checked)}
                    color="primary"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {section.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {section.base_name}
                  </Typography>
                </TableCell>
                <TableCell>
                  {section.leader_name ? (
                    <Chip label={section.leader_name} size="small" color="primary" variant="outlined" />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      未分配
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ 
                    maxWidth: 200, 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {section.description || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="编辑">
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(section)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(section.id!)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
          {sections.length === 0 && !loading && (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">
                  暂无分区记录
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* 编辑对话框 */}
      <BaseSectionForm
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingSection(null);
        }}
        onSubmit={handleSubmit}
        initial={editingSection || undefined}
        submitting={submitting}
        defaultBaseId={baseFilter ? Number(baseFilter) : undefined} // 传递默认基地ID
      />
    </Paper>
  );
};

export default BaseSectionManagementView;