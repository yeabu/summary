/**
 * BaseForm - 基地信息表单组件
 * 
 * 用于新增和编辑基地信息
 * 支持基地名称、代码、位置、描述等字段的录入
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Grid,
  Alert,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import { Base } from '@/api/AppDtos';

interface BaseFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (baseData: Base) => Promise<void>;
  initial?: Base;
  submitting?: boolean;
}

const BaseForm: React.FC<BaseFormProps> = ({
  open,
  onClose,
  onSubmit,
  initial,
  submitting = false
}) => {
  const [formData, setFormData] = useState<Base>({
    name: '',
    code: '',
    location: '',
    description: '',
    status: 'active'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');

  useEffect(() => {
    if (initial) {
      setFormData({
        ...initial
      });
    } else {
      setFormData({
        name: '',
        code: '',
        location: '',
        description: '',
        status: 'active'
      });
    }
    setErrors({});
    setSubmitError('');
  }, [initial, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = '基地名称不能为空';
    }

    if (!formData.code?.trim()) {
      newErrors.code = '基地代码不能为空';
    } else if (!/^[A-Z0-9]+$/.test(formData.code.trim())) {
      newErrors.code = '基地代码只能包含大写字母和数字';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '保存失败');
    }
  };

  const handleChange = (field: keyof Base, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除相关字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {initial?.id ? '编辑基地信息' : '新增基地'}
        </DialogTitle>
        
        <DialogContent>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="基地名称"
                fullWidth
                required
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                disabled={submitting}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="基地代码"
                fullWidth
                required
                value={formData.code || ''}
                onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                error={!!errors.code}
                helperText={errors.code || '请输入大写字母和数字'}
                disabled={submitting}
                placeholder="例如：BJ001"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="基地位置"
                fullWidth
                value={formData.location || ''}
                onChange={(e) => handleChange('location', e.target.value)}
                disabled={submitting}
                placeholder="请输入基地的具体地址"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="基地描述"
                fullWidth
                multiline
                rows={3}
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={submitting}
                placeholder="请输入基地的详细描述"
              />
            </Grid>

            {initial?.id && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={formData.status || 'active'}
                    label="状态"
                    onChange={(e) => handleChange('status', e.target.value)}
                    disabled={submitting}
                  >
                    <MenuItem value="active">启用</MenuItem>
                    <MenuItem value="inactive">停用</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
          >
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default BaseForm;