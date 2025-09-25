/**
 * PurchaseListView - 采购记录管理页面
 *
 * 管理员专用功能，用于记录和管理采购信息
 * 支持添加、编辑、查看采购记录
 * 支持筛选条件功能
 */
import React, { useEffect, useMemo, useState } from 'react';
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
import { ReceiptLong as ReceiptIcon, CloudUpload as UploadIcon, PhotoCamera as CameraIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import CameraCaptureDialog from '@/components/CameraCaptureDialog';
import ImageEditDialog from '@/components/ImageEditDialog';
import { Purchase, FilterOptions } from '@/api/AppDtos';
// 金额/币种展示规则：仅显示数字与英文币种代码
import PurchaseForm from '@/components/PurchaseForm';
import QueryFilter from '@/components/QueryFilter';
import { TableSkeleton } from '@/components/LoadingComponents';
import BatchOperations, { BatchAction } from '@/components/BatchOperations';
import { useNotification } from '@/components/NotificationProvider';
import dayjs from 'dayjs';
import { useLocation } from 'react-router-dom';
import { ApiClient } from '@/api/ApiClient';
import { ProductApi } from '@/api/ProductApi';
import ConfirmDialog from '@/components/ConfirmDialog';

const PurchaseListView: React.FC = () => {
  const notification = useNotification();
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDeleteId, setToDeleteId] = useState<number | null>(null);
  // 票据上传/查看
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptPurchase, setReceiptPurchase] = useState<Purchase | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const cameraSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBlob, setEditBlob] = useState<Blob | null>(null);
  const location = useLocation();
  const initialFromSearch = useMemo<FilterOptions>(() => {
    const params = new URLSearchParams(location.search);
    const f: FilterOptions = {};
    const supplier = params.get('supplier');
    const start = params.get('start_date');
    const end = params.get('end_date');
    const base = params.get('base');
    const order = params.get('order_number');
    if (supplier) f.supplier = supplier;
    if (start) f.start_date = start;
    if (end) f.end_date = end;
    if (base) f.base = base;
    if (order) f.order_number = order;
    return f;
  }, [location.search]);
  const [filters, setFilters] = useState<FilterOptions>(initialFromSearch);
  
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
  const apiClient = useMemo(() => new ApiClient(), []);
  const productApi = useMemo(() => new ProductApi(), []);
  const [hasProducts, setHasProducts] = useState<boolean>(true);

  // 检查是否已有商品数据，若没有则提示并限制新增
  useEffect(() => {
    const checkProducts = async () => {
      try {
        const res = await productApi.listProducts({ limit: 1 });
        setHasProducts((res?.total || 0) > 0);
      } catch {
        // 保守起见，认为没有
        setHasProducts(false);
      }
    };
    checkProducts();
  }, [productApi]);

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

  // 压缩图片到 <= 2MB，最长边限制 2000px
  const compressImage = (file: File, maxBytes = 2 * 1024 * 1024, maxDim = 2000): Promise<File> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) { reject(new Error('只支持图片文件')); return; }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img as any;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.round(width * scale); height = Math.round(height * scale);
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d'); if (!ctx) { URL.revokeObjectURL(url); reject(new Error('压缩失败')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const qualities = [0.92, 0.85, 0.8, 0.7, 0.6];
        (function next(i:number){
          canvas.toBlob((blob)=>{
            if (!blob) { URL.revokeObjectURL(url); reject(new Error('压缩失败')); return; }
            if (blob.size <= maxBytes || i === qualities.length - 1) {
              const out = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
              URL.revokeObjectURL(url); resolve(out);
            } else { next(i+1); }
          }, 'image/jpeg', qualities[i]);
        })(0);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('读取图片失败')); };
      img.src = url;
    });
  };

  const openReceipt = (p: Purchase) => { setReceiptPurchase(p); setUploadErr(''); setReceiptOpen(true); };
  const handleUploadReceipt = async (file: File) => {
    if (!receiptPurchase) return;
    try {
      setUploadingReceipt(true); setUploadErr('');
      const cf = await compressImage(file);
      const resp = await apiClient.uploadPurchaseReceipt({ purchase_id: receiptPurchase.id!, date: receiptPurchase.purchase_date?.slice(0,10), file: cf });
      const newPath = resp.path;
      setPurchases(prev => prev.map(it => it.id === receiptPurchase.id ? { ...it, receipt_path: newPath } : it));
      setReceiptPurchase(prev => prev ? { ...prev, receipt_path: newPath } as any : prev);
      notification.showSuccess('票据已上传');
    } catch(e:any) {
      setUploadErr(e?.message || '上传失败'); notification.showError(e?.message || '上传失败');
    } finally { setUploadingReceipt(false); }
  };

  const handleFilter = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    loadPurchases(newFilters);
  };

  useEffect(() => {
    loadPurchases(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      
      // 创建符合 ApiClient 期望的 payload
      const supplierId = (purchaseData as any).supplier_id as number | undefined;
      const purchaseEntryData: any = {
        supplier_id: supplierId, // 后端按ID识别供应商
        order_number: purchaseData.order_number,
        purchase_date: purchaseData.purchase_date,
        total_amount: purchaseData.total_amount,
        receiver: purchaseData.receiver,
        base_id: purchaseData.base?.id || 0,
        notes: purchaseData.notes,
        items: purchaseData.items.map(item => ({
          product_name: item.product_name,
          unit: (item as any).unit || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount
        }))
      };
      if (!purchaseEntryData.supplier_id) {
        console.warn('[PurchaseListView] missing supplier_id, payload:', purchaseEntryData);
        notification.showError('请先选择有效的供应商');
        setSubmitting(false);
        return;
      }
      if (!purchaseEntryData.base_id) {
        console.warn('[PurchaseListView] missing base_id, payload:', purchaseEntryData);
        notification.showError('请选择所属基地');
        setSubmitting(false);
        return;
      }
      const invalidItem = purchaseEntryData.items.find((it: any) => !it.product_name || it.quantity <= 0 || it.unit_price <= 0);
      if (invalidItem) {
        console.warn('[PurchaseListView] invalid item in payload:', invalidItem, purchaseEntryData.items);
        notification.showError('请完善明细：商品/数量/单价');
        setSubmitting(false);
        return;
      }
      
      if (isEditing) {
        console.log('更新采购记录:', editingPurchase.id, purchaseEntryData);
        // 使用实例方法而不是静态方法
        result = await apiClient.updatePurchase(editingPurchase.id!, purchaseEntryData);
        notification.showSuccess('采购记录更新成功');
      } else {
        console.log('[PurchaseListView] 创建新采购记录 payload:', purchaseEntryData);
        // 使用实例方法而不是静态方法
        result = await apiClient.createPurchase(purchaseEntryData);
        notification.showSuccess('采购记录创建成功');
      }
      
      console.log('[PurchaseListView] 采购操作结果:', result);
      
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

  const askDelete = (id: number) => { setToDeleteId(id); setConfirmOpen(true); };
  const handleDelete = async (id: number) => {
    // 验证ID的有效性
    if (!id || typeof id !== 'number' || id <= 0) {
      notification.showError('无效的记录ID，无法删除');
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
  const doDelete = async () => {
    if (!toDeleteId) return;
    await handleDelete(toDeleteId);
    setConfirmOpen(false);
    setToDeleteId(null);
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
          disabled={loading || !hasProducts}
        >
          新增采购记录
        </Button>
      </Box>

      {!hasProducts && (
        <Alert severity="info" sx={{ mb: 2 }}>
          当前暂无商品数据，请先到“商品管理”添加或导入商品后再创建采购记录。
        </Alert>
      )}

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
        initialFilters={filters}
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
        <TableSkeleton rows={5} columns={8} />
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
              <TableCell>币种</TableCell>
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
                  <TableCell>{Number(purchase.total_amount ?? 0).toFixed(2)}</TableCell>
                  <TableCell>{String((purchase as any).currency || (purchase.base as any)?.currency || 'CNY').toUpperCase()}</TableCell>
                  <TableCell>{purchase.receiver}</TableCell>
                  <TableCell>{(purchase as any).creator?.name || purchase.creator_name || '-'}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="查看商品详情">
                      <IconButton size="small" onClick={() => handleViewItems(purchase)}>
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="查看票据">
                      <IconButton size="small" onClick={() => openReceipt(purchase)}>
                        <ReceiptIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="编辑">
                      <IconButton size="small" onClick={() => handleEdit(purchase)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton size="small" color="error" onClick={() => purchase.id && askDelete(purchase.id)}>
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
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setToDeleteId(null); }}
        onConfirm={doDelete}
        title="确认删除采购记录"
        content="此操作不可撤销，确定要删除该采购记录吗？"
        confirmText="删除"
        confirmColor="error"
      />

      {/* 票据查看/上传 */}
      <Dialog open={receiptOpen} onClose={()=> setReceiptOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>查看票据</DialogTitle>
        <DialogContent>
          {receiptPurchase?.receipt_path ? (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:1 }}>
                <OpenInNewIcon fontSize="small" />
                <a href={`${import.meta.env.VITE_API_URL}${receiptPurchase.receipt_path}`} target="_blank" rel="noreferrer">在新窗口打开</a>
              </Box>
              <Box sx={{ border:'1px solid', borderColor:'divider', borderRadius:1, overflow:'hidden' }}>
                <img alt="票据" src={`${import.meta.env.VITE_API_URL}${receiptPurchase.receipt_path}`} style={{ width:'100%', display:'block' }} />
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>暂无票据</Typography>
          )}
          {uploadErr && <Alert severity="error" sx={{ mb: 1 }}>{uploadErr}</Alert>}
          <Box sx={{ display:'flex', gap:1, flexWrap:'wrap' }}>
            <Button variant="outlined" startIcon={<UploadIcon />} component="label" disabled={uploadingReceipt}>
              {receiptPurchase?.receipt_path ? '更换票据' : '上传票据'}
              <input type="file" accept="image/*" hidden onChange={(e)=>{ const f=e.target.files?.[0]; e.currentTarget.value=''; if(!f) return; if(!f.type.startsWith('image/')) { setUploadErr('只支持图片格式'); return; } setEditBlob(f); setEditOpen(true); }} />
            </Button>
            {cameraSupported && (
              <Button variant="outlined" startIcon={<CameraIcon />} disabled={uploadingReceipt} onClick={()=> setCameraOpen(true)}>
                拍照上传
              </Button>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setReceiptOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 相机拍照（即时上传） */}
      <CameraCaptureDialog
        open={cameraOpen}
        onClose={()=> setCameraOpen(false)}
        instant
        onCapture={async (blob)=>{ setEditBlob(blob); setEditOpen(true); }}
      />

      {/* 图片编辑 */}
      <ImageEditDialog
        open={editOpen}
        file={editBlob}
        onClose={()=> setEditOpen(false)}
        onDone={async (blob)=>{ const file = new File([blob], `receipt_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' }); await handleUploadReceipt(file); }}
      />

      {/* 商品详情对话框 */}
      <Dialog open={itemsDialogOpen} onClose={() => setItemsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>商品详情</DialogTitle>
        <DialogContent>
          {selectedPurchaseItems?.items && selectedPurchaseItems.items.length > 0 ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>商品名称</TableCell>
                  <TableCell>单位</TableCell>
                  <TableCell>数量</TableCell>
                  <TableCell>单价</TableCell>
                  <TableCell>金额</TableCell>
                  <TableCell>币种</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedPurchaseItems.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>{(item as any).unit || '-'}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{Number(item.unit_price ?? 0).toFixed(2)}</TableCell>
                    <TableCell>{Number(item.amount ?? 0).toFixed(2)}</TableCell>
                    <TableCell>{String((selectedPurchaseItems as any)?.currency || (selectedPurchaseItems as any)?.base?.currency || 'CNY').toUpperCase()}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} align="right"><strong>总计:</strong></TableCell>
                  <TableCell><strong>{Number(selectedPurchaseItems.total_amount ?? 0).toFixed(2)}</strong></TableCell>
                  <TableCell><strong>{String((selectedPurchaseItems as any)?.currency || (selectedPurchaseItems as any)?.base?.currency || 'CNY').toUpperCase()}</strong></TableCell>
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
