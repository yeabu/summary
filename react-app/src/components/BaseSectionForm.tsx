import React, { useState, useEffect, useMemo } from 'react';
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
  Select,
  Autocomplete
} from '@mui/material';
import { BaseSection, Base, User } from '@/api/AppDtos';
import { ApiClient } from '@/api/ApiClient';

interface BaseSectionFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (sectionData: BaseSection) => Promise<void>;
  initial?: BaseSection;
  submitting?: boolean;
  defaultBaseId?: number; // 添加默认基地ID属性
}

const BaseSectionForm: React.FC<BaseSectionFormProps> = ({
  open,
  onClose,
  onSubmit,
  initial,
  submitting = false,
  defaultBaseId // 接收默认基地ID
}) => {
  const [formData, setFormData] = useState<BaseSection>({
    name: '',
    base_id: 0,
    leader_id: undefined,
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');
  
  // 下拉选项数据
  const [bases, setBases] = useState<Base[]>([]);
  const [captains, setCaptains] = useState<User[]>([]);
  const [loadingBases, setLoadingBases] = useState(false);
  const [loadingCaptains, setLoadingCaptains] = useState(false);
  
  // 创建 ApiClient 实例
  const apiClient = useMemo(() => new ApiClient(), []);

  // 加载基地和队长数据
  useEffect(() => {
    const loadData = async () => {
      if (!open) return;
      
      setLoadingBases(true);
      setLoadingCaptains(true);
      
      try {
        // 加载所有基地
        const baseList = await apiClient.baseList();
        setBases(baseList || []);
        
        // 加载所有队长（captain角色的用户）
        const userList = await apiClient.userList();
        // 修复类型不匹配问题：将ApiClient.User[]转换为AppDtos.User[]
        const appDtosUsers: User[] = userList.map(user => ({
          id: user.id,
          name: user.name,
          role: user.role as 'admin' | 'warehouse_admin' | 'base_agent' | 'captain' | 'factory_manager',
          bases: user.bases || [], // 使用bases而不是base
          base_ids: user.base_ids || [], // 添加base_ids字段
          join_date: user.join_date,
          phone: user.phone || (user as any).mobile,
          email: user.email,
          passport_number: user.passport_number,
          visa_type: user.visa_type,
          visa_expiry_date: user.visa_expiry_date,
          id_card: user.id_card,
          emergency_contact: user.emergency_contact,
          emergency_phone: user.emergency_phone,
          remark: user.remark,
          created_at: user.created_at,
          updated_at: user.updated_at
        }));
        // 修复类型不匹配问题：过滤出captain角色的用户
        const captains = appDtosUsers.filter(user => user.role === 'captain') || [];
        setCaptains(captains);
      } catch (err) {
        console.error('Load data error:', err);
      } finally {
        setLoadingBases(false);
        setLoadingCaptains(false);
      }
    };
    
    loadData();
  }, [open]);

  // 当初始数据、打开状态或默认基地ID变化时更新表单数据
  useEffect(() => {
    if (initial) {
      setFormData({
        ...initial
      });
    } else {
      // 新增模式下使用默认基地ID
      const baseIdToUse = defaultBaseId && defaultBaseId > 0 ? defaultBaseId : 
                         (bases.length > 0 ? bases[0].id : 0);
      
      setFormData({
        name: '',
        base_id: baseIdToUse !== undefined ? baseIdToUse : 0,  // 确保base_id是number类型
        leader_id: undefined,
        description: ''
      });
    }
    setErrors({});
    setSubmitError('');
  }, [initial, open, defaultBaseId, bases]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = '分区名称不能为空';
    }

    // 修复验证逻辑：检查base_id是否大于0
    if (!formData.base_id || formData.base_id <= 0) {
      newErrors.base_id = '请选择所属基地';
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

  const handleChange = (field: keyof BaseSection, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除相关字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // 获取选中的基地对象
  const getSelectedBase = () => {
    return bases.find(base => base.id === formData.base_id) || null;
  };

  // 获取选中的队长对象
  const getSelectedCaptain = () => {
    if (!formData.leader_id) return null;
    return captains.find(captain => captain.id === formData.leader_id) || null;
  };

  // 处理基地选择变化
  const handleBaseChange = (event: any) => {
    const value = event.target.value;
    // 确保值是数字类型
    const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
    handleChange('base_id', isNaN(numericValue) ? 0 : numericValue);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {initial?.id ? '编辑分区信息' : '新增分区'}
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
                label="分区名称"
                fullWidth
                required
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                disabled={submitting}
                placeholder="例如：1区、2区"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required error={!!errors.base_id}>
                <InputLabel>所属基地</InputLabel>
                {/* 修复Select组件的value属性，确保正确显示选中的值 */}
                <Select
                  value={formData.base_id || ''}
                  label="所属基地"
                  onChange={handleBaseChange}
                  disabled={submitting || loadingBases}
                >
                  {loadingBases ? (
                    <MenuItem value="">
                      <em>加载中...</em>
                    </MenuItem>
                  ) : bases.length > 0 ? (
                    bases.map((base) => (
                      <MenuItem key={base.id} value={base.id}>
                        {base.name} ({base.code})
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem value="">
                      <em>暂无基地数据</em>
                    </MenuItem>
                  )}
                </Select>
                {errors.base_id && (
                  <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5, ml: 1.75 }}>
                    {errors.base_id}
                  </Box>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                options={captains}
                getOptionLabel={(option) => option.name || ''}
                value={getSelectedCaptain()}
                onChange={(event, newValue) => {
                  handleChange('leader_id', newValue?.id || null);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="分区队长"
                    fullWidth
                    disabled={submitting || loadingCaptains}
                    placeholder="请选择分区队长（可选）"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="分区描述"
                fullWidth
                multiline
                rows={3}
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={submitting}
                placeholder="请输入分区的详细描述"
              />
            </Grid>
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

export default BaseSectionForm;
