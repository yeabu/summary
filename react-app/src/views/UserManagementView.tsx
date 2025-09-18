/**
 * UserManagementView - 人员管理页面
 *
 * 管理员专用功能，用于管理系统中的用户信息
 * 支持用户的增删改查和角色管理
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
  TextField,
  InputAdornment,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  VpnKey as ResetPasswordIcon
} from '@mui/icons-material';
import { User, Base } from '@/api/AppDtos'; // 添加Base类型导入
import UserForm from '@/components/UserForm';
import BatchOperations, { BatchAction } from '@/components/BatchOperations';
import { useNotification } from '@/components/NotificationProvider';
import { ApiClient } from '@/api/ApiClient';

const UserManagementView: React.FC = () => {
  const notification = useNotification();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [bases, setBases] = useState<Base[]>([]); // 添加基地状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  // 删除确认对话框
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  
  // 密码重置对话框
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetPasswordSubmitting, setResetPasswordSubmitting] = useState(false);
  
  // 搜索和筛选状态
  const [searchName, setSearchName] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [baseFilter, setBaseFilter] = useState('');
  
  // 批量选择状态
  const [selectedItems, setSelectedItems] = useState<User[]>([]);
  
  // 更多操作菜单
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
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

  const loadBases = async () => {
    try {
      const response = await apiClient.baseList();
      setBases(response || []);
    } catch (err) {
      console.error('Load bases error:', err);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = {};
      if (searchName.trim()) {
        params.name = searchName.trim();
      }
      if (roleFilter) {
        params.role = roleFilter;
      }
      if (baseFilter) {
        params.base_id = bases.find((b: Base) => b.name === baseFilter)?.id; // 使用base_id而不是base
      }

      // 使用实例方法而不是静态方法
      const response = await apiClient.userList();
      // 类型转换：将ApiClient.User[]转换为AppDtos.User[]
      const appDtosUsers: User[] = response.map(user => ({
        id: user.id,
        name: user.name,
        role: user.role as 'admin' | 'base_agent' | 'captain' | 'factory_manager',
        bases: user.bases || [], // 使用bases字段而不是base字段
        base_ids: user.base_ids || [], // 添加base_ids字段
        join_date: user.join_date,
        mobile: user.mobile,
        passport_number: user.passport_number,
        visa_expiry_date: user.visa_expiry_date,
        created_at: user.created_at,
        updated_at: user.updated_at
      }));
      setUsers(appDtosUsers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载用户列表失败');
      console.error('Load users error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadBases(); // 加载基地数据
  }, []);

  const handleSearch = () => {
    loadUsers();
  };

  const handleAddNew = () => {
    setEditingUser(null);
    setEditDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditDialogOpen(true);
  };

  const handleSubmit = async (userData: User) => {
    setSubmitting(true);
    try {
      // 创建符合ApiClient.User类型的数据对象
      const apiUserData = {
        name: userData.name,
        role: userData.role,
        base_ids: userData.bases?.map(base => base.id).filter(id => id !== undefined) as number[] || [], // 使用bases提取base_ids并过滤undefined值
        join_date: userData.join_date,
        mobile: userData.mobile,
        passport_number: userData.passport_number,
        visa_expiry_date: userData.visa_expiry_date
      };
    
      if (editingUser?.id) {
        // 使用实例方法而不是静态方法
        await apiClient.userUpdate(editingUser.id, apiUserData);
        notification.showSuccess('用户信息更新成功');
      } else {
        // 添加密码字段用于创建新用户
        const newUser = {
          ...apiUserData,
          password: userData.password || ''
        };
        // 使用实例方法而不是静态方法
        await apiClient.userCreate(newUser);
        notification.showSuccess('用户创建成功');
      }
      setEditDialogOpen(false);
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '保存用户信息失败';
      setError(errorMessage);
      throw err; // 重新抛出错误，让表单组件处理
    } finally {
      setSubmitting(false);
    }
  };

  const friendlyDeleteError = (msg: string) => {
    if (!msg) return '删除失败';
    if (msg.includes('费用记录')) return '该用户下还有费用记录，无法删除。请先处理相关开支记录后再试。';
    if (msg.includes('采购记录')) return '该用户下还有采购记录，无法删除。请先处理相关采购记录后再试。';
    if (msg.includes('分区队长') || msg.includes('base_sections')) return '该用户担任分区队长关联已处理后再删除。请重试。';
    return msg;
  };

  const askDelete = (userId: number) => {
    const u = users.find(x => x.id === userId) || null;
    setConfirmUser(u);
    setConfirmOpen(true);
    handleCloseMenu();
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.userDelete(id);
      notification.showSuccess('删除成功');
      setConfirmOpen(false);
      setConfirmUser(null);
      loadUsers();
      setSelectedItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '删除失败';
      const friendly = friendlyDeleteError(msg);
      setError(friendly);
      notification.showError(friendly);
    }
  };

  const handleResetPassword = async () => {
    if (!resetUserId || !newPassword.trim()) {
      notification.showError('请输入新密码');
      return;
    }

    if (newPassword.length < 6) {
      notification.showError('密码至少6个字符');
      return;
    }

    setResetPasswordSubmitting(true);
    try {
      // 使用实例方法而不是静态方法
      await apiClient.userResetPassword(resetUserId, newPassword);
      notification.showSuccess('密码重置成功');
      setResetPasswordDialogOpen(false);
      setResetUserId(null);
      setNewPassword('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '密码重置失败';
      notification.showError(errorMessage);
    } finally {
      setResetPasswordSubmitting(false);
    }
  };

  const handleOpenResetPassword = (userId: number) => {
    setResetUserId(userId);
    setNewPassword('');
    setResetPasswordDialogOpen(true);
    handleCloseMenu();
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, userId: number) => {
    setAnchorEl(event.currentTarget);
    setSelectedUserId(userId);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedUserId(null);
  };
  
  // 批量操作处理
  const handleBatchAction = async (actionId: string, selectedItems: User[]) => {
    console.log('BatchAction called:', { actionId, selectedItemsCount: selectedItems.length, selectedItems });
    
    try {
      const ids = selectedItems.map(item => item.id!).filter(id => id !== undefined && id !== null);
      console.log('Extracted IDs:', ids);
      
      if (ids.length === 0) {
        notification.showError('没有选择有效的记录');
        return;
      }
      
      if (actionId === 'delete') {
        console.log('Calling batchDelete with IDs:', ids);
        // 使用实例方法而不是静态方法
        await apiClient.userBatchDelete(ids);
        notification.showSuccess(`成功删除 ${ids.length} 个用户`);
        // 重新加载数据
        loadUsers();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '批量操作失败';
      console.error('Batch action error:', err, errorMessage);
      notification.showError(errorMessage);
    }
  };
  
  // 单个选择处理
  const handleItemSelect = (item: User, checked: boolean) => {
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
  const getItemId = (item: User) => item.id || 0;
  
  // 获取项目标签
  const getItemLabel = (item: User) => {
    return `${item.name} (${item.role})`;
  };

  const getRoleChip = (role?: string) => {
    switch (role) {
      case 'admin':
        return <Chip label="管理员" color="primary" size="small" />;
      case 'base_agent':
        return <Chip label="基地代理" color="secondary" size="small" />;
      case 'captain':
        return <Chip label="队长" color="success" size="small" />;
      case 'factory_manager':
        return <Chip label="厂长" color="warning" size="small" />;
      default:
        return <Chip label={role || '未知'} color="default" size="small" />;
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1">
          人员管理
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadUsers}
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
            新增用户
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 搜索筛选栏 */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          label="搜索用户名"
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
        <TextField
          select
          label="角色筛选"
          size="small"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">全部角色</MenuItem>
          <MenuItem value="admin">管理员</MenuItem>
          <MenuItem value="base_agent">基地代理</MenuItem>
          <MenuItem value="captain">队长</MenuItem>
          <MenuItem value="factory_manager">厂长</MenuItem>
        </TextField>
        <TextField
          label="基地筛选"
          size="small"
          value={baseFilter}
          onChange={(e) => setBaseFilter(e.target.value)}
          sx={{ minWidth: 120 }}
        />
      </Box>

      {/* 批量操作栏 */}
      <BatchOperations
        allItems={users}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        getItemId={getItemId}
        getItemLabel={getItemLabel}
        actions={batchActions}
        onBatchAction={handleBatchAction}
        disabled={loading}
      />

      {/* 用户列表 */}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              {/* 批量操作的全选复选框由BatchOperations组件处理 */}
            </TableCell>
            <TableCell>用户名</TableCell>
            <TableCell>角色</TableCell>
            <TableCell>基地</TableCell>
            <TableCell>入职时间</TableCell>
            <TableCell>手机号</TableCell>
            <TableCell align="right">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                加载中...
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                暂无用户数据
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedItems.some(item => item.id === user.id)}
                    onChange={(e) => handleItemSelect(user, e.target.checked)}
                  />
                </TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>{getRoleChip(user.role)}</TableCell>
                <TableCell>{user.bases?.map(base => base.name).join(', ') || '-'}</TableCell>
                <TableCell>{user.join_date ? new Date(user.join_date).toLocaleDateString() : '-'}</TableCell>
                <TableCell>{user.mobile || '-'}</TableCell>
                <TableCell align="right">
                  <Tooltip title="编辑">
                    <IconButton size="small" onClick={() => handleEdit(user)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="删除">
                    <IconButton 
                      size="small" 
                      color="error" 
                      onClick={() => askDelete(user.id!)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="更多操作">
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleOpenMenu(e, user.id!)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <UserForm
          open={editDialogOpen}
          initial={editingUser || undefined}
          onSubmit={handleSubmit}
          onClose={() => setEditDialogOpen(false)}
          submitting={submitting}
        />
      </Dialog>

      {/* 更多操作菜单 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => selectedUserId && handleOpenResetPassword(selectedUserId)}>
          <ResetPasswordIcon sx={{ mr: 1 }} />
          重置密码
        </MenuItem>
        {/* 删除入口统一为行内红色垃圾桶按钮，这里不再提供 */}
      </Menu>

      {/* 删除确认对话框 */}
      <Dialog open={confirmOpen} onClose={()=>{ setConfirmOpen(false); setConfirmUser(null); }}>
        <DialogTitle>确认删除用户</DialogTitle>
        <DialogContent>
          <Typography>将删除用户「{confirmUser?.name || '-'}」。此操作不可撤销。</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            提示：若该用户存在开支/采购记录，将无法删除。若担任分区队长，系统会自动解除关联后再删除。
          </Typography>
          {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>{ setConfirmOpen(false); setConfirmUser(null); }}>取消</Button>
          <Button variant="contained" color="error" onClick={()=> confirmUser?.id && handleDelete(confirmUser.id)}>删除</Button>
        </DialogActions>
      </Dialog>

      {/* 重置密码对话框 */}
      <Dialog open={resetPasswordDialogOpen} onClose={() => setResetPasswordDialogOpen(false)}>
        <DialogTitle>重置用户密码</DialogTitle>
        <DialogContent>
          <TextField
            label="新密码"
            type="password"
            fullWidth
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            margin="normal"
            helperText="密码至少6个字符"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetPasswordDialogOpen(false)}>取消</Button>
          <Button 
            onClick={handleResetPassword} 
            variant="contained" 
            disabled={resetPasswordSubmitting}
          >
            {resetPasswordSubmitting ? '重置中...' : '重置密码'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default UserManagementView;
