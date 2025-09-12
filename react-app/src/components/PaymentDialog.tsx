import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Chip,
} from '@mui/material';
import { PayableRecord, CreatePaymentRequest, PaymentMethodText } from '../api/PayableApi';

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  payable: PayableRecord | null;
  onPaymentCreated: () => void;
  onCreatePayment: (data: CreatePaymentRequest) => Promise<void>;
}

export const PaymentDialog: React.FC<PaymentDialogProps> = ({
  open,
  onClose,
  payable,
  onPaymentCreated,
  onCreatePayment,
}) => {
  const [formData, setFormData] = useState<CreatePaymentRequest>({
    payable_id: 0,
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    reference: '',
    note: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 重置表单
  const resetForm = () => {
    if (payable) {
      setFormData({
        payable_id: payable.id,
        amount: 0,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'bank_transfer',
        reference: '',
        note: '',
      });
    }
    setError(null);
  };

  // 处理对话框打开
  React.useEffect(() => {
    if (open && payable) {
      resetForm();
    }
  }, [open, payable]);

  // 格式化金额
  const formatAmount = (amount: number) => {
    return amount.toLocaleString('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    });
  };

  // 表单验证
  const validateForm = () => {
    if (!formData.amount || formData.amount <= 0) {
      setError('请输入有效的还款金额');
      return false;
    }
    
    if (payable && formData.amount > payable.remaining_amount) {
      setError('还款金额不能超过剩余应付金额');
      return false;
    }
    
    if (!formData.payment_date) {
      setError('请选择还款日期');
      return false;
    }
    
    return true;
  };

  // 提交还款记录
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setError(null);
      await onCreatePayment(formData);
      onPaymentCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || '创建还款记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!payable) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        创建还款记录
      </DialogTitle>
      
      <DialogContent>
        {/* 应付款信息 */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            应付款信息
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">
                供应商
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {typeof payable.supplier === 'object' ? (payable.supplier as any).name : payable.supplier}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">
                状态
              </Typography>
              <Chip 
                label={payable.status === 'pending' ? '待付款' : payable.status === 'partial' ? '部分付款' : '已付清'}
                color={payable.status === 'pending' ? 'warning' : payable.status === 'partial' ? 'info' : 'success'}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">
                总金额
              </Typography>
              <Typography variant="body1">
                {formatAmount(payable.total_amount)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">
                已付金额
              </Typography>
              <Typography variant="body1">
                {formatAmount(payable.paid_amount)}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="textSecondary">
                剩余应付金额
              </Typography>
              <Typography variant="h6" color="warning.main" fontWeight="bold">
                {formatAmount(payable.remaining_amount)}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* 错误提示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* 还款信息表单 */}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="还款金额"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              inputProps={{ 
                min: 0.01, 
                max: payable.remaining_amount,
                step: 0.01 
              }}
              helperText={`最大可还款金额: ${formatAmount(payable.remaining_amount)}`}
              error={formData.amount > payable.remaining_amount}
              disabled={loading}
              required
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="还款日期"
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              disabled={loading}
              required
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>还款方式</InputLabel>
              <Select
                value={formData.payment_method}
                label="还款方式"
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                disabled={loading}
              >
                <MenuItem value="cash">现金</MenuItem>
                <MenuItem value="bank_transfer">银行转账</MenuItem>
                <MenuItem value="check">支票</MenuItem>
                <MenuItem value="other">其他</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="参考号/凭证号"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="如：转账凭证号、支票号等"
              disabled={loading}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="备注"
              multiline
              rows={3}
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="请输入还款备注信息"
              disabled={loading}
            />
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={handleClose}
          disabled={loading}
        >
          取消
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || payable.status === 'paid'}
        >
          {loading ? '创建中...' : '确认还款'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};