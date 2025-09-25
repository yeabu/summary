import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
  Autocomplete,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { ApiClient } from '@/api/ApiClient';
import { useMemo } from 'react';
import { useNotification } from '@/components/NotificationProvider';
import { Base } from '@/api/AppDtos';

interface PurchaseItem {
  product_name: string;
  quantity: number | string;
  unit_price: number | string;
  amount: number;
}

interface PurchaseForm {
  supplier_id: number | null; // 供应商ID
  order_number: string;
  purchase_date: string;
  total_amount: number;
  receiver: string;
  base_id: number | string;
  items: PurchaseItem[];
}

export const PurchaseCreateView: React.FC = () => {
  const apiClient = useMemo(() => new ApiClient(), []);
  const notification = useNotification();

  // 状态管理
  const [bases, setBases] = useState<Base[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]); // 供应商列表
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 表单状态
  const [form, setForm] = useState<PurchaseForm>({
    supplier_id: null,
    order_number: '',
    purchase_date: new Date().toISOString().split('T')[0],
    total_amount: 0,
    receiver: '',
    base_id: '',
    items: [
      { product_name: '', quantity: '', unit_price: '', amount: 0 }
    ]
  });

  // 加载基础数据
  const loadData = async () => {
    try {
      setLoading(true);
      const [basesData, suppliersData] = await Promise.all([
        apiClient.baseList(),
        apiClient.getAllSuppliers() // 获取所有供应商
      ]);
      setBases(basesData);
      setSuppliers(suppliersData);
      setError(null);
    } catch (err: any) {
      setError(err.message || '加载数据失败');
      notification.showError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    loadData();
    notification.showSuccess('数据已刷新');
  };

  // 处理表单字段变化
  const handleFormChange = (field: keyof PurchaseForm, value: any) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 处理单项字段变化
  const handleItemChange = (index: number, field: keyof PurchaseItem, value: any) => {
    const items = [...form.items];
    const item = { ...items[index], [field]: value };
    
    // 自动计算金额
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = parseFloat(item.quantity.toString()) || 0;
      const unitPrice = parseFloat(item.unit_price.toString()) || 0;
      item.amount = parseFloat((quantity * unitPrice).toFixed(2));
    }
    
    items[index] = item;
    setForm(prev => ({
      ...prev,
      items,
      total_amount: parseFloat(items.reduce((sum, item) => sum + item.amount, 0).toFixed(2))
    }));
  };

  // 添加新项
  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { product_name: '', quantity: '', unit_price: '', amount: 0 }
      ]
    }));
  };

  // 删除项
  const removeItem = (index: number) => {
    if (form.items.length <= 1) {
      notification.showWarning('至少需要保留一项');
      return;
    }
    
    const items = [...form.items];
    items.splice(index, 1);
    setForm(prev => ({
      ...prev,
      items,
      total_amount: parseFloat(items.reduce((sum, item) => sum + item.amount, 0).toFixed(2))
    }));
  };

  // 提交表单
  const handleSubmit = async () => {
    // 验证必填字段
    if (!form.supplier_id) {
      notification.showWarning('请选择供应商');
      return;
    }
    
    if (!form.order_number.trim()) {
      notification.showWarning('请输入订单号');
      return;
    }
    
    // 修复基地ID验证逻辑
    let baseId = 0;
    if (typeof form.base_id === 'string') {
      baseId = parseInt(form.base_id, 10);
    } else if (typeof form.base_id === 'number') {
      baseId = form.base_id;
    }
    
    // 确保基地ID有效
    if (!baseId || baseId <= 0) {
      notification.showWarning('请选择基地');
      return;
    }
    
    if (!form.receiver.trim()) {
      notification.showWarning('请输入收货人');
      return;
    }
    
    // 验证商品明细
    for (let i = 0; i < form.items.length; i++) {
      const item = form.items[i];
      if (!item.product_name.trim()) {
        notification.showWarning(`第${i + 1}行商品名称不能为空`);
        return;
      }
      if (!item.quantity || parseFloat(item.quantity.toString()) <= 0) {
        notification.showWarning(`第${i + 1}行商品数量必须大于0`);
        return;
      }
      if (!item.unit_price || parseFloat(item.unit_price.toString()) <= 0) {
        notification.showWarning(`第${i + 1}行商品单价必须大于0`);
        return;
      }
    }

    try {
      setSubmitting(true);
      await apiClient.createPurchase({
        supplier_id: form.supplier_id, // 使用supplier_id而不是supplier
        order_number: form.order_number,
        purchase_date: form.purchase_date,
        total_amount: form.total_amount,
        receiver: form.receiver,
        base_id: baseId, // 使用验证后的基地ID
        items: form.items.map(item => ({
          product_name: item.product_name,
          quantity: parseFloat(item.quantity.toString()),
          unit_price: parseFloat(item.unit_price.toString()),
          amount: item.amount
        }))
      });
      
      notification.showSuccess('采购记录创建成功');
      
      // 重置表单
      setForm({
        supplier_id: null,
        order_number: '',
        purchase_date: new Date().toISOString().split('T')[0],
        total_amount: 0,
        receiver: '',
        base_id: '',
        items: [
          { product_name: '', quantity: '', unit_price: '', amount: 0 }
        ]
      });
    } catch (err: any) {
      notification.showError(err.message || '创建采购记录失败');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Typography>加载中...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 页面标题 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          创建采购记录
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
        >
          刷新
        </Button>
      </Box>

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 采购表单 */}
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* 供应商选择 */}
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={suppliers}
              getOptionLabel={(option) => option.name}
              value={suppliers.find(s => s.id === form.supplier_id) || null}
              onChange={(event, newValue) => {
                handleFormChange('supplier_id', newValue ? newValue.id : null);
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="供应商 *" 
                  required 
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip 
                    label={option.name} 
                    {...getTagProps({ index })} 
                    key={option.id} 
                  />
                ))
              }
            />
          </Grid>

          {/* 订单号 */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="订单号 *"
              value={form.order_number}
              onChange={(e) => handleFormChange('order_number', e.target.value)}
              required
            />
          </Grid>

          {/* 采购日期 */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="采购日期"
              type="date"
              value={form.purchase_date}
              onChange={(e) => handleFormChange('purchase_date', e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          {/* 基地选择 */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>基地 *</InputLabel>
              <Select
                value={form.base_id}
                onChange={(e) => handleFormChange('base_id', e.target.value)}
                label="基地 *"
                required
              >
                {bases.map(base => (
                  <MenuItem key={base.id} value={base.id}>
                    {base.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* 收货人 */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="收货人 *"
              value={form.receiver}
              onChange={(e) => handleFormChange('receiver', e.target.value)}
              required
            />
          </Grid>

          {/* 总金额（只读） */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="总金额"
              value={form.total_amount.toFixed(2)}
              InputProps={{
                readOnly: true,
              }}
              sx={{ fontWeight: 'bold' }}
            />
          </Grid>
        </Grid>

        {/* 商品明细 */}
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">商品明细</Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addItem}
            >
              添加商品
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width="30%">商品名称</TableCell>
                  <TableCell width="20%">数量</TableCell>
                  <TableCell width="20%">单价</TableCell>
                  <TableCell width="20%">金额</TableCell>
                  <TableCell width="10%">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {form.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <TextField
                        fullWidth
                        value={item.product_name}
                        onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        onFocus={(e) => (e.target as HTMLInputElement).select()}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                        onFocus={(e) => (e.target as HTMLInputElement).select()}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        type="number"
                        value={item.amount.toFixed(2)}
                        InputProps={{
                          readOnly: true,
                        }}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => removeItem(index)}
                        disabled={form.items.length <= 1}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* 提交按钮 */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? '提交中...' : '提交'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default PurchaseCreateView;
