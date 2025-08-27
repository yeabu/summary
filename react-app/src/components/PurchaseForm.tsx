import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
  MenuItem,
  Alert,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { Purchase, PurchaseItem } from '@/api/AppDtos';
import useAuthStore from '@/auth/AuthStore';

// 基地列表
const baseList = [
  "北京基地",
  "上海基地",
  "广州基地",
  "深圳基地",
  "杭州基地",
  "南京基地",
  "成都基地",
  "武汉基地",
  "西安基地",
  "青岛基地"
];

interface PurchaseFormProps {
  initial?: Purchase;
  onSubmit: (data: Purchase) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

const PurchaseForm: React.FC<PurchaseFormProps> = ({
  initial,
  onSubmit,
  onCancel,
  submitting = false
}) => {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';
  const userBase = user?.base || '';
  
  const [formData, setFormData] = useState<Purchase>({
    supplier: '',
    order_number: '',
    purchase_date: dayjs().format('YYYY-MM-DD'),
    total_amount: 0,
    receiver: '',
    base: isAdmin ? '' : userBase, // 管理员默认空，基地代理使用自己的基地
    notes: '',
    items: [
      {
        product_name: '',
        quantity: 1,
        unit_price: 0,
        amount: 0
      }
    ]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');

  useEffect(() => {
    if (initial) {
      setFormData({
        ...initial,
        base: initial.base || (isAdmin ? '' : userBase), // 确保 base 字段正确设置
        items: initial.items?.length > 0 ? initial.items : [{
          product_name: '',
          quantity: 1,
          unit_price: 0,
          amount: 0
        }]
      });
    }
  }, [initial, isAdmin, userBase]);

  // 更新采购项
  const updateItem = (index: number, field: keyof PurchaseItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // 自动计算金额
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].amount = newItems[index].quantity * newItems[index].unit_price;
    }
    
    const newFormData = { ...formData, items: newItems };
    
    // 重新计算总金额
    const totalAmount = newItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    newFormData.total_amount = totalAmount;
    
    setFormData(newFormData);
  };

  // 添加新的采购项
  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          product_name: '',
          quantity: 1,
          unit_price: 0,
          amount: 0
        }
      ]
    });
  };

  // 删除采购项
  const removeItem = (index: number) => {
    if (formData.items.length === 1) return; // 至少保留一项
    
    const newItems = formData.items.filter((_, i) => i !== index);
    const totalAmount = newItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    setFormData({
      ...formData,
      items: newItems,
      total_amount: totalAmount
    });
  };

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.supplier.trim()) {
      newErrors.supplier = '供应商名称不能为空';
    }

    if (!formData.order_number.trim()) {
      newErrors.order_number = '订单号不能为空';
    }

    if (!formData.purchase_date) {
      newErrors.purchase_date = '采购日期不能为空';
    }

    if (!formData.receiver.trim()) {
      newErrors.receiver = '收货人不能为空';
    }

    if (!formData.base.trim()) {
      newErrors.base = '所属基地不能为空';
    }

    // 验证采购项
    formData.items.forEach((item, index) => {
      if (!item.product_name.trim()) {
        newErrors[`item_${index}_product_name`] = '商品名称不能为空';
      }
      if (item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = '数量必须大于0';
      }
      if (item.unit_price <= 0) {
        newErrors[`item_${index}_unit_price`] = '单价必须大于0';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 清除之前的错误
    setSubmitError('');
    
    if (!validateForm()) {
      return;
    }

    try {
      console.log('Submitting purchase data:', formData);
      await onSubmit(formData);
    } catch (error) {
      console.error('Submit error:', error);
      const errorMessage = error instanceof Error ? error.message : '提交失败，请重试';
      setSubmitError(errorMessage);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {initial?.id ? '编辑采购记录' : '新增采购记录'}
      </Typography>

      {Object.keys(errors).length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          请检查表单中的错误信息
        </Alert>
      )}

      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* 基本信息 */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            基本信息
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="供应商名称"
            value={formData.supplier}
            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
            error={!!errors.supplier}
            helperText={errors.supplier}
            required
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="订单号"
            value={formData.order_number}
            onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
            error={!!errors.order_number}
            helperText={errors.order_number}
            required
          />
        </Grid>

        {/* 基地选择：管理员可选择，基地代理只显示 */}
        <Grid item xs={12} md={6}>
          {isAdmin ? (
            <TextField
              fullWidth
              select
              label="所属基地"
              value={formData.base}
              onChange={(e) => setFormData({ ...formData, base: e.target.value })}
              error={!!errors.base}
              helperText={errors.base || '请选择采购记录所属的基地'}
              required
            >
              {baseList.map(base =>
                <MenuItem value={base} key={base}>{base}</MenuItem>
              )}
            </TextField>
          ) : (
            <TextField
              fullWidth
              label="所属基地"
              value={userBase}
              disabled
              helperText="基地代理只能为自己的基地添加采购记录"
            />
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="date"
            label="采购日期"
            value={formData.purchase_date}
            onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
            error={!!errors.purchase_date}
            helperText={errors.purchase_date}
            InputLabelProps={{ shrink: true }}
            required
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="收货人"
            value={formData.receiver}
            onChange={(e) => setFormData({ ...formData, receiver: e.target.value })}
            error={!!errors.receiver}
            helperText={errors.receiver}
            required
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="备注"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="可填写其他相关信息..."
          />
        </Grid>

        {/* 采购明细 */}
        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">
              采购明细
            </Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={addItem}
              variant="outlined"
              size="small"
            >
              添加商品
            </Button>
          </Box>
        </Grid>

        {formData.items.map((item, index) => (
          <Grid item xs={12} key={index}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    商品 #{index + 1}
                  </Typography>
                  {formData.items.length > 1 && (
                    <IconButton
                      onClick={() => removeItem(index)}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="商品名称"
                      value={item.product_name}
                      onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                      error={!!errors[`item_${index}_product_name`]}
                      helperText={errors[`item_${index}_product_name`]}
                      required
                    />
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      type="number"
                      label="数量"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                      error={!!errors[`item_${index}_quantity`]}
                      helperText={errors[`item_${index}_quantity`]}
                      inputProps={{ min: 0, step: 1 }}
                      required
                    />
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      type="number"
                      label="单价"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                      error={!!errors[`item_${index}_unit_price`]}
                      helperText={errors[`item_${index}_unit_price`]}
                      inputProps={{ min: 0, step: 0.01 }}
                      required
                    />
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      label="小计"
                      value={item.amount.toFixed(2)}
                      disabled
                      InputProps={{
                        startAdornment: '¥'
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* 总计 */}
        <Grid item xs={12}>
          <Box sx={{ textAlign: 'right', mt: 2 }}>
            <Typography variant="h6" color="primary">
              总金额: ¥{formData.total_amount.toFixed(2)}
            </Typography>
          </Box>
        </Grid>

        {/* 操作按钮 */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
            <Button onClick={onCancel} disabled={submitting}>
              取消
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
            >
              {submitting ? '提交中...' : (initial?.id ? '更新' : '创建')}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PurchaseForm;