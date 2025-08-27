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
import ApiClient from '@/api/ApiClient';
import PurchaseForm from '@/components/PurchaseForm';
import QueryFilter from '@/components/QueryFilter';
import { TableSkeleton } from '@/components/LoadingComponents';
import BatchOperations, { BatchAction } from '@/components/BatchOperations';
import { useNotification } from '@/components/NotificationProvider';
import { Purchase, FilterOptions } from '@/api/AppDtos';
import dayjs from 'dayjs';

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

  const loadPurchases = async (currentFilters = filters) => {
    setLoading(true);
    setError('');
    setSelectedItems([]); // 清空选择状态
    
    try {
      console.log('加载采购数据参数:', currentFilters);
      const response = await ApiClient.purchase.list(currentFilters);
      console.log('采购API响应:', response);
      
      // 确保数据格式正确
      const dataArray = Array.isArray(response.data) ? response.data : 
                       Array.isArray(response) ? response : [];
      console.log('原始采购数据数组:', dataArray);
      console.log('原始数据数量:', dataArray.length);
      
      // 优化数据验证，只验证真正必需的业务字段
      // 根据数据库字段完整性规范，只验证必填字段
      const validData = dataArray.filter(item => {
        if (!item || typeof item !== 'object') {
          console.warn('无效的采购数据项（非对象）:', item);
          return false;
        }
        
        // 只验证业务必需字段，不验证id等技术字段
        const hasRequiredFields = (
          item.supplier &&                        // 供应商必须存在
          item.order_number &&                    // 订单号必须存在
          item.purchase_date &&                   // 采购日期必须存在
          typeof item.total_amount === 'number' && // 总金额必须是数字
          item.total_amount >= 0 &&               // 总金额不能为负数
          item.receiver                           // 收货人必须存在
        );
        
        if (!hasRequiredFields) {
          console.warn('采购数据项缺少必需字段:', {
            item,
            checks: {
              supplier: !!item.supplier,
              order_number: !!item.order_number,
              purchase_date: !!item.purchase_date,
              total_amount: typeof item.total_amount === 'number' && item.total_amount >= 0,
              receiver: !!item.receiver
            }
          });
          return false;
        }
        
        console.log('有效的采购数据项:', item);
        return true;
      });
      
      console.log('过滤后的有效采购数据数量:', validData.length);
      console.log('有效采购数据:', validData);
      
      setPurchases(validData);
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
      
      if (isEditing) {
        console.log('更新采购记录:', editingPurchase.id, purchaseData);
        result = await ApiClient.purchase.update(editingPurchase.id!, purchaseData);
        notification.showSuccess('采购记录更新成功');
      } else {
        console.log('创建新采购记录:', purchaseData);
        result = await ApiClient.purchase.create(purchaseData);
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
      await ApiClient.purchase.delete(id);
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
        await ApiClient.purchase.batchDelete(validIds);
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
    return `${item.order_number} - ${item.supplier} ￥${item.total_amount?.toFixed(2)}`;
  };

  // 显示商品详情
  const handleShowItems = (purchase: Purchase) => {
    setSelectedPurchaseItems(purchase);
    setItemsDialogOpen(true);
  };

  // 关闭商品详情弹窗
  const handleCloseItemsDialog = () => {
    setItemsDialogOpen(false);
    setSelectedPurchaseItems(null);
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
          新增采购
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* 筛选条件 */}
      <QueryFilter
        onFilter={handleFilter}
        loading={loading}
        showBaseFilter={true}
        showCategoryFilter={false}
        showSupplierFilter={true}
        showOrderNumberFilter={true}
      />
      
      {/* 批量操作 */}
      <BatchOperations
        allItems={purchases}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        getItemId={getItemId}
        getItemLabel={getItemLabel}
        actions={batchActions}
        onBatchAction={handleBatchAction}
        disabled={loading}
        showSelectAll={true}
      />

      {loading ? (
        <TableSkeleton rows={5} columns={10} />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                {/* 留空，由BatchOperations组件管理全选 */}
              </TableCell>
              <TableCell>采购日期</TableCell>
              <TableCell>供应商</TableCell>
              <TableCell>订单号</TableCell>
              <TableCell>基地</TableCell>
              <TableCell>总金额</TableCell>
              <TableCell>收货人</TableCell>
              <TableCell>商品数量</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {purchases.map((purchase) => {
              const isSelected = selectedItems.some(item => item.id === purchase.id);
              return (
                <TableRow key={purchase.id} hover selected={isSelected}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => handleItemSelect(purchase, e.target.checked)}
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>
                    {dayjs(purchase.purchase_date).format('YYYY-MM-DD')}
                  </TableCell>
                  <TableCell>{purchase.supplier}</TableCell>
                  <TableCell>{purchase.order_number}</TableCell>
                  <TableCell>{purchase.base || '-'}</TableCell>
                  <TableCell>¥{purchase.total_amount?.toFixed(2)}</TableCell>
                  <TableCell>{purchase.receiver}</TableCell>
                  <TableCell>
                    <Link
                      component="button"
                      variant="body2"
                      onClick={() => handleShowItems(purchase)}
                      sx={{
                        color: 'primary.main',
                        textDecoration: 'none',
                        cursor: 'pointer',
                        '&:hover': {
                          textDecoration: 'underline'
                        }
                      }}
                    >
                      {purchase.items?.length || 0} 种商品
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="编辑">
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(purchase)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(purchase.id!)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {purchases.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary" variant="h6">
                    🛒 暂无记录
                  </Typography>
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                    当前没有采购记录，点击上方"新增采购"按钮创建第一条记录
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="lg" fullWidth>
        <PurchaseForm
          initial={editingPurchase || undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setEditDialogOpen(false);
            setEditingPurchase(null);
          }}
          submitting={submitting}
        />
      </Dialog>

      {/* 商品详情弹窗 */}
      <Dialog 
        open={itemsDialogOpen} 
        onClose={handleCloseItemsDialog} 
        maxWidth="md" 
        fullWidth
        aria-labelledby="items-dialog-title"
      >
        <DialogTitle id="items-dialog-title">
          商品清单 - {selectedPurchaseItems?.order_number}
        </DialogTitle>
        <DialogContent>
          {selectedPurchaseItems && (
            <Box sx={{ mt: 1 }}>
              {/* 基本信息 */}
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>采购信息</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                  <Typography variant="body2"><strong>供应商：</strong> {selectedPurchaseItems.supplier}</Typography>
                  <Typography variant="body2"><strong>订单号：</strong> {selectedPurchaseItems.order_number}</Typography>
                  <Typography variant="body2"><strong>采购日期：</strong> {dayjs(selectedPurchaseItems.purchase_date).format('YYYY-MM-DD')}</Typography>
                  <Typography variant="body2"><strong>收货人：</strong> {selectedPurchaseItems.receiver}</Typography>
                  <Typography variant="body2"><strong>基地：</strong> {selectedPurchaseItems.base}</Typography>
                  <Typography variant="body2"><strong>总金额：</strong> ￥{selectedPurchaseItems.total_amount?.toFixed(2)}</Typography>
                </Box>
              </Box>

              {/* 商品列表 */}
              <Typography variant="subtitle2" gutterBottom>商品明细</Typography>
              {selectedPurchaseItems.items && selectedPurchaseItems.items.length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>序号</TableCell>
                      <TableCell>商品名称</TableCell>
                      <TableCell align="right">数量</TableCell>
                      <TableCell align="right">单价</TableCell>
                      <TableCell align="right">金额</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedPurchaseItems.items.map((item, index) => (
                      <TableRow key={item.id || index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">￥{item.unit_price?.toFixed(2)}</TableCell>
                        <TableCell align="right">￥{item.amount?.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} align="right" sx={{ fontWeight: 'bold' }}>
                        合计：
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        ￥{selectedPurchaseItems.items.reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                  暂无商品信息
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseItemsDialog} color="primary">
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default PurchaseListView;