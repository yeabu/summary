/**
 * PurchaseListView - 采购记录管理页面
 *
 * 管理员专用功能，用于记录和管理采购信息
 * 支持添加、编辑、查看采购记录
 * 支持筛选条件功能
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
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  IconButton,
  Tooltip,
  Alert,
  Chip,
  Checkbox,
  Link
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { Purchase, FilterOptions } from '@/api/AppDtos';
import PurchaseForm from '@/components/PurchaseForm';
import QueryFilter from '@/components/QueryFilter';
import { TableSkeleton } from '@/components/LoadingComponents';
import BatchOperations, { BatchAction } from '@/components/BatchOperations';
import { useNotification } from '@/components/NotificationProvider';
import dayjs from 'dayjs';
import { ApiClient } from '@/api/ApiClient';

const PurchaseListView: React.FC = () => {
  const notification = useNotification();
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [filters, setFilters] = useState<FilterOptions>({});
  
  // 批量选择状态
  const [selectedItems, setSelectedItems] = useState<Purchase[]>([]);
  
  // 商品详情弹窗状态
  const [itemsDialogOpen, setItemsDialogOpen] = useState(false);
  const [selectedPurchaseItems, setSelectedPurchaseItems] = useState<Purchase | null>(null);
  
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

  const loadPurchases = async (currentFilters = filters) => {
    setLoading(true);
    setError('');
    setSelectedItems([]); // 清空选择状态
    
    try {
      console.log('加载采购数据参数:', currentFilters);
      // 使用实例方法而不是静态方法
      const response = await apiClient.listPurchase(currentFilters);
      console.log('采购API响应:', response);
      
      // 确保数据格式正确
      const dataArray = Array.isArray(response) ? response : [];
      console.log('原始采购数据数组:', dataArray);
      console.log('原始数据数量:', dataArray.length);
      
      // 类型转换：将PurchaseEntry[]转换为Purchase[]
      const purchases: Purchase[] = dataArray.map((item: any) => ({
        id: item.id,
        supplier: item.supplier || '', // 确保supplier字段不为undefined
        order_number: item.order_number,
        purchase_date: item.purchase_date,
        total_amount: item.total_amount,
        receiver: item.receiver,
        base: item.base || { id: 0, name: '', code: '' }, // 确保base字段不为undefined
        notes: item.notes,
        items: item.items || [],
        created_by: item.created_by,
        creator_name: item.creator_name,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));
      
      console.log('过滤后的有效采购数据数量:', purchases.length);
      console.log('有效采购数据:', purchases);
      
      setPurchases(purchases);
    } catch (err) {
      console.error('加载采购数据失败:', err);
      const errorMessage = err instanceof Error ? err.message : '加载采购记录失败';
      setError(errorMessage);
      notification.showError(errorMessage);
      setPurchases([]); // 确保在错误时设置为空数组
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    loadPurchases(newFilters);
  };

  useEffect(() => {
    loadPurchases();
  }, []);

  const handleAddNew = () => {
    setEditingPurchase(null);
    setEditDialogOpen(true);
  };

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setEditDialogOpen(true);
  };

  const handleSubmit = async (purchaseData: Purchase) => {
    setSubmitting(true);
    try {
      let result;
      const isEditing = editingPurchase?.id;
      
      // 创建符合ApiClient.PurchaseEntry类型的数据对象
      const purchaseEntryData = {
        supplier_id: undefined, // 如果需要supplier_id，需要额外处理
        supplier: purchaseData.supplier,
        order_number: purchaseData.order_number,
        purchase_date: purchaseData.purchase_date,
        total_amount: purchaseData.total_amount,
        receiver: purchaseData.receiver,
        base_id: purchaseData.base.id || 0, // 从base对象中提取base_id
        notes: purchaseData.notes,
        items: purchaseData.items.map(item => ({
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount
        }))
      };
      
      if (isEditing) {
        console.log('更新采购记录:', editingPurchase.id, purchaseEntryData);
        // 使用实例方法而不是静态方法
        result = await apiClient.updatePurchase(editingPurchase.id!, purchaseEntryData);
        notification.showSuccess('采购记录更新成功');
      } else {
        console.log('创建新采购记录:', purchaseEntryData);
        // 使用实例方法而不是静态方法
        result = await apiClient.createPurchase(purchaseEntryData);
        notification.showSuccess('采购记录创建成功');
      }
      
      console.log('采购操作结果:', result);
      
      // 关闭对话框
      setEditDialogOpen(false);
      setEditingPurchase(null);
      
      // 数据刷新策略优化
      if (!isEditing) {
        // 新增操作：清空筛选条件，确保能看到最新记录
        console.log('新增操作完成，清空筛选条件并刷新数据');
        setFilters({});
        
        // 使用多重延时确保数据同步
        setTimeout(() => {
          console.log('第一次延时刷新（100ms）');
          loadPurchases({});
        }, 100);
        
        setTimeout(() => {
          console.log('第二次延时刷新（500ms）');
          loadPurchases({});
        }, 500);
      } else {
        // 编辑操作：保持当前筛选条件
        console.log('编辑操作完成，保持当前筛选条件并刷新数据');
        setTimeout(() => {
          loadPurchases(filters);
        }, 100);
      }
      
    } catch (err) {
      console.error('保存采购记录失败:', err);
      const errorMessage = err instanceof Error ? err.message : '保存采购记录失败';
      setError(errorMessage);
      notification.showError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    // 验证ID的有效性
    if (!id || typeof id !== 'number' || id <= 0) {
      notification.showError('无效的记录ID，无法删除');
      return;
    }
    
    if (!window.confirm('确认删除该采购记录吗？')) {
      return;
    }
    
    try {
      console.log('删除采购记录ID:', id);
      // 使用实例方法而不是静态方法
      await apiClient.deletePurchase(id);
      notification.showSuccess('删除成功');
      loadPurchases();
    } catch (err) {
      console.error('删除采购记录失败:', err);
      const errorMessage = err instanceof Error ? err.message : '删除失败';
      setError(errorMessage);
      notification.showError(`删除失败: ${errorMessage}`);
    }
  };
  
  // 批量操作处理
  const handleBatchAction = async (actionId: string, selectedItems: Purchase[]) => {
    try {
      // 过滤出有效的ID，确保是数字且大于0
      const validIds: number[] = selectedItems
        .map(item => item.id)
        .filter((id): id is number => id !== undefined && id !== null && typeof id === 'number' && id > 0);
      
      console.log('批量操作 - 选中采购项目:', selectedItems);
      console.log('批量操作 - 有效ID列表:', validIds);
      
      if (validIds.length === 0) {
        notification.showError('没有选择有效的记录，请确保选择的是数据库中存在的记录');
        return;
      }
      
      if (actionId === 'delete') {
        // BatchOperations组件已经处理了确认对话框，这里直接执行删除
        // 使用实例方法而不是静态方法
        await apiClient.batchDeletePurchase(validIds);
        notification.showSuccess(`成功删除 ${validIds.length} 条采购记录`);
        
        // 清空选择状态
        setSelectedItems([]);
        
        // 重新加载数据
        loadPurchases();
      }
    } catch (err) {
      console.error('批量操作失败:', err);
      const errorMessage = err instanceof Error ? err.message : '批量操作失败';
      notification.showError(`删除失败: ${errorMessage}`);
    }
  };
  
  // 单个选择处理
  const handleItemSelect = (item: Purchase, checked: boolean) => {
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
  const getItemId = (item: Purchase) => item.id || 0;
  
  // 获取项目标签
  const getItemLabel = (item: Purchase) => {
    const supplierName = typeof item.supplier === 'object' ? (item.supplier as any).name : item.supplier;
    return `${item.order_number} - ${supplierName}`;
  };
  
  // 显示商品详情
  const handleViewItems = (purchase: Purchase) => {
    setSelectedPurchaseItems(purchase);
    setItemsDialogOpen(true);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1">
          采购记录管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
          disabled={loading}
        >
          新增采购记录
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <QueryFilter
        onFilter={handleFilter}
        loading={loading}
        showBaseFilter={true}
        showCategoryFilter={false}
        showSupplierFilter={true}
        showOrderNumberFilter={true}
      />
      
      {/* 批量操作栏 */}
      <BatchOperations
        allItems={purchases}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        getItemId={getItemId}
        getItemLabel={getItemLabel}
        actions={batchActions}
        onBatchAction={handleBatchAction}
        disabled={loading}
      />

      {loading ? (
        <TableSkeleton rows={5} columns={7} />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                {/* 批量操作的全选复选框由BatchOperations组件处理 */}
              </TableCell>
              <TableCell>订单号</TableCell>
              <TableCell>供应商</TableCell>
              <TableCell>采购日期</TableCell>
              <TableCell>总金额</TableCell>
              <TableCell>收货人</TableCell>
              <TableCell>创建人</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {purchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  暂无采购记录
                </TableCell>
              </TableRow>
            ) : (
              purchases.map((purchase) => (
                <TableRow key={purchase.id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedItems.some(item => item.id === purchase.id)}
                      onChange={(e) => handleItemSelect(purchase, e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>{purchase.order_number}</TableCell>
                  <TableCell>{typeof purchase.supplier === 'object' ? (purchase.supplier as any).name : purchase.supplier}</TableCell>
                  <TableCell>{purchase.purchase_date ? dayjs(purchase.purchase_date).format('YYYY-MM-DD') : '-'}</TableCell>
                  <TableCell>¥{purchase.total_amount?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell>{purchase.receiver}</TableCell>
                  <TableCell>{purchase.creator_name || '-'}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="查看商品详情">
                      <IconButton size="small" onClick={() => handleViewItems(purchase)}>
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="编辑">
                      <IconButton size="small" onClick={() => handleEdit(purchase)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton size="small" onClick={() => purchase.id && handleDelete(purchase.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <PurchaseForm
          initial={editingPurchase || undefined}
          onSubmit={handleSubmit}
          onCancel={() => setEditDialogOpen(false)}
          submitting={submitting}
        />
      </Dialog>

      {/* 商品详情对话框 */}
      <Dialog open={itemsDialogOpen} onClose={() => setItemsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>商品详情</DialogTitle>
        <DialogContent>
          {selectedPurchaseItems?.items && selectedPurchaseItems.items.length > 0 ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>商品名称</TableCell>
                  <TableCell>数量</TableCell>
                  <TableCell>单价</TableCell>
                  <TableCell>金额</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedPurchaseItems.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>¥{item.unit_price?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>¥{item.amount?.toFixed(2) || '0.00'}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} align="right"><strong>总计:</strong></TableCell>
                  <TableCell><strong>¥{selectedPurchaseItems.total_amount?.toFixed(2) || '0.00'}</strong></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <Typography>暂无商品信息</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemsDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default PurchaseListView;