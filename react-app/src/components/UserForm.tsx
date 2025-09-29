/**
 * UserForm - 用户信息表单组件
 * 
 * 用于新增和编辑用户信息
 * 支持用户名、角色、基地、密码等字段的录入
 */
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
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { User } from '@/api/AppDtos';
import { ApiClient } from '@/api/ApiClient';
import useAuthStore from '@/auth/AuthStore';

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (userData: User) => Promise<void>;
  initial?: User;
  submitting?: boolean;
}

// 添加Base接口定义
interface Base {
  id: number;
  name: string;
  code: string;
  location?: string;
  description?: string;
  status?: string;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

const UserForm: React.FC<UserFormProps> = ({
  open,
  onClose,
  onSubmit,
  initial,
  submitting = false
}) => {
  const [formData, setFormData] = useState<User>({
    name: '',
    role: 'captain' as User['role'],
    bases: [], // 使用bases数组而不是单个base
    base_ids: [], // 添加base_ids字段
    password: '',
    join_date: '',
    mobile: '',
    passport_number: '',
    visa_expiry_date: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [availableBases, setAvailableBases] = useState<string[]>([]);
  const [allBases, setAllBases] = useState<Base[]>([]); // 存储所有基地对象
  
  // 创建 ApiClient 实例（保持稳定引用，避免 useEffect 反复触发）
  const apiClient = useMemo(() => new ApiClient(), []);
  const authUser = useAuthStore((s) => s.user);
  const isBaseAgent = authUser?.role === 'base_agent';

  // 可选角色列表：基地代理仅可创建队长
  const roleOptions = useMemo(() => (
    isBaseAgent ? ['captain'] : ['admin', 'base_agent', 'captain', 'factory_manager']
  ), [isBaseAgent]);

  const effectiveRole = useMemo(() => {
    if (formData.role && roleOptions.includes(formData.role)) {
      return formData.role;
    }
    return (roleOptions[0] as User['role'] | undefined) || '';
  }, [formData.role, roleOptions]);

  // 加载可用基地列表
  useEffect(() => {
    const loadBases = async () => {
      try {
        const bases = await apiClient.baseList();
        console.log('Loaded bases:', bases);
        // 若为基地代理，仅允许选择自己负责的基地
        const filtered = isBaseAgent && authUser?.bases && authUser.bases.length > 0
          ? bases.filter((b: Base) => b.code && authUser.bases!.includes(b.code))
          : bases;
        setAllBases(filtered); // 保存可选基地对象
        const baseNames = filtered.map((base: Base) => base.name).filter((name: string) => name);
        setAvailableBases(baseNames);
        console.log('Available base names:', baseNames);
      } catch (err) {
        console.error('Load bases error:', err);
        // 如果基地API失败，使用默认基地列表
        const defaultBases = [
          "北京基地", "上海基地", "广州基地", "深圳基地", "杭州基地",
          "南京基地", "成都基地", "武汉基地", "西安基地", "青岛基地"
        ];
        setAvailableBases(defaultBases);
        console.log('Using default bases:', defaultBases);
      }
    };
    
    if (open) {
      loadBases();
    }
  }, [open, isBaseAgent, authUser]);

  useEffect(() => {
    if (initial) {
      const nextRole = (initial.role && roleOptions.includes(initial.role)) ? initial.role : (roleOptions[0] as User['role']);
      setFormData({
        ...initial,
        role: nextRole,
        password: '' // 编辑时不显示原密码
      });
    } else {
      setFormData({
        name: '',
        role: roleOptions[0] as User['role'],
        bases: [], // 使用bases数组而不是单个base
        base_ids: [], // 初始化base_ids字段
        password: '',
        join_date: '',
        mobile: '',
        passport_number: '',
        visa_expiry_date: ''
      });
    }
    setErrors({});
    setSubmitError('');
    setShowPassword(false);
  }, [initial, open, roleOptions]);

  useEffect(() => {
    if (!effectiveRole || formData.role === effectiveRole) {
      return;
    }

    setFormData(prev => ({
      ...prev,
      role: effectiveRole as User['role'],
      bases: effectiveRole === 'admin' ? [] : prev.bases,
      base_ids: effectiveRole === 'admin' ? [] : prev.base_ids
    }));
  }, [effectiveRole, formData.role]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = '用户名不能为空';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = '用户名至少3个字符';
    }

    if (!formData.role) {
      newErrors.role = '请选择用户角色';
    }

    // 非管理员角色必须选择基地
    if (formData.role && formData.role !== 'admin' && (!formData.bases || formData.bases.length === 0)) {
      newErrors.bases = '非管理员角色必须选择至少一个基地';
    }

    // 新增用户时密码必填，编辑时密码可选
    if (!initial?.id && !formData.password) {
      newErrors.password = '密码不能为空';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = '密码至少6个字符';
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
      // 准备提交数据
      const submitData: User = {
        ...formData,
        base_ids: formData.bases?.map(base => base.id).filter(id => id !== undefined) as number[] || [] // 从bases对象提取base_ids并过滤undefined值
      };
      
      // 如果是管理员角色，清空基地字段
      if (submitData.role === 'admin') {
        submitData.bases = [];
        submitData.base_ids = [];
      }
      
      // 如果是编辑且密码为空，则不提交密码字段
      if (initial?.id && !submitData.password) {
        delete (submitData as any).password;
      }

      await onSubmit(submitData);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '保存失败');
    }
  };

  const handleChange = (field: keyof User, value: string | Base[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除相关字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleRoleChange = (role: string) => {
    const nextRole = role as User['role'];
    setFormData(prev => ({
      ...prev,
      role: nextRole,
      bases: nextRole === 'admin' ? [] : prev.bases, // 管理员清空基地
      base_ids: nextRole === 'admin' ? [] : prev.base_ids
    }));
    if (errors.role) {
      setErrors(prev => ({ ...prev, role: '' }));
    }
    if (nextRole === 'admin' && errors.bases) {
      setErrors(prev => ({ ...prev, bases: '' }));
    }
  };

  // 处理基地选择变化
  const handleBaseChange = (baseNames: string[]) => {
    // 根据基地名称找到对应的基地对象
    const selectedBases = allBases.filter(base => baseNames.includes(base.name));
    const selectedBaseIds = selectedBases.map(base => base.id).filter((id): id is number => id !== undefined);
    setFormData(prev => ({ ...prev, bases: selectedBases, base_ids: selectedBaseIds }));
    if (errors.bases) {
      setErrors(prev => ({ ...prev, bases: '' }));
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return '管理员';
      case 'base_agent':
        return '基地代理';
      case 'captain':
        return '队长';
      case 'factory_manager':
        return '厂长';
      default:
        return role;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {initial?.id ? '编辑用户信息' : '新增用户'}
        </DialogTitle>
        
        <DialogContent>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}

          {/* 调试信息 */}
          {process.env.NODE_ENV === 'development' && availableBases.length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              已加载基地: {availableBases.join(', ')}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="用户名"
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
              <FormControl fullWidth required error={!!errors.role}>
                <InputLabel>用户角色</InputLabel>
                <Select
                  value={effectiveRole}
                  label="用户角色"
                  onChange={(e) => handleRoleChange(e.target.value)}
                  disabled={submitting || roleOptions.length === 0}
                >
                  {roleOptions.length === 0 ? (
                    <MenuItem value="" disabled>
                      暂无可选角色
                    </MenuItem>
                  ) : (
                    roleOptions.map((role) => (
                      <MenuItem key={role} value={role}>
                        {getRoleLabel(role)}
                      </MenuItem>
                    ))
                  )}
                </Select>
                {errors.role && (
                  <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5, ml: 1.75 }}>
                    {errors.role}
                  </Box>
                )}
              </FormControl>
            </Grid>

            {formData.role && formData.role !== 'admin' && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required error={!!errors.bases}>
                  <InputLabel>所属基地</InputLabel>
                  <Select
                    multiple
                    value={formData.bases?.map(base => base.name) || []}
                    label="所属基地"
                    onChange={(e) => handleBaseChange(e.target.value as string[])}
                    disabled={submitting || availableBases.length === 0}
                    renderValue={(selected) => (selected as string[]).join(', ')}
                  >
                    {availableBases.length === 0 ? (
                      <MenuItem value="" disabled>
                        正在加载基地数据...
                      </MenuItem>
                    ) : (
                      availableBases.map((baseName) => (
                        <MenuItem key={baseName} value={baseName}>
                          {baseName}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                  {errors.bases && (
                    <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5, ml: 1.75 }}>
                      {errors.bases}
                    </Box>
                  )}
                  {availableBases.length === 0 && (
                    <Box sx={{ color: 'text.secondary', fontSize: '0.75rem', mt: 0.5, ml: 1.75 }}>
                      暂无可用基地，请先创建基地或检查网络连接
                    </Box>
                  )}
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                label={initial?.id ? "新密码（留空不修改）" : "登录密码"}
                fullWidth
                required={!initial?.id}
                type={showPassword ? 'text' : 'password'}
                value={formData.password || ''}
                onChange={(e) => handleChange('password', e.target.value)}
                error={!!errors.password}
                helperText={errors.password}
                disabled={submitting}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* 新增的人员信息字段 */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="入司时间"
                fullWidth
                type="date"
                value={formData.join_date || ''}
                onChange={(e) => handleChange('join_date', e.target.value)}
                disabled={submitting}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="手机号"
                fullWidth
                value={formData.mobile || ''}
                onChange={(e) => handleChange('mobile', e.target.value)}
                disabled={submitting}
                placeholder="请输入手机号"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="护照号"
                fullWidth
                value={formData.passport_number || ''}
                onChange={(e) => handleChange('passport_number', e.target.value)}
                disabled={submitting}
                placeholder="请输入护照号"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="签证到期时间"
                fullWidth
                type="date"
                value={formData.visa_expiry_date || ''}
                onChange={(e) => handleChange('visa_expiry_date', e.target.value)}
                disabled={submitting}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            {/* 角色说明 */}
            {formData.role && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 1 }}>
                  <strong>{getRoleLabel(formData.role)}角色说明：</strong>
                  {formData.role === 'admin' && ' 拥有系统所有权限，可以管理基地、用户和查看所有数据。'}
                  {formData.role === 'base_agent' && ' 只能管理自己基地的费用记录，无法访问其他基地数据。'}
                  {formData.role === 'captain' && ' 队长角色，具有特定的团队管理权限。'}
                  {formData.role === 'factory_manager' && ' 厂长角色，负责工厂的整体管理和运营。'}
                </Alert>
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

export default UserForm;
