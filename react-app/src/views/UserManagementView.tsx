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
import ApiClient from '@/api/ApiClient';
import UserForm from '@/components/UserForm';
import BatchOperations, { BatchAction } from '@/components/BatchOperations';
import { useNotification } from '@/components/NotificationProvider';
import { User } from '@/api/AppDtos';

const UserManagementView: React.FC = () => {
  const notification = useNotification();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  
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
        params.base = baseFilter;
      }

      const response = await ApiClient.userManagement.list(params);
      setUsers(response || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载用户列表失败');
      console.error('Load users error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
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
      if (editingUser?.id) {
        await ApiClient.userManagement.update(editingUser.id, userData);
        notification.showSuccess('用户信息更新成功');
      } else {
        await ApiClient.userManagement.create(userData);
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

  const handleDelete = async (id: number) => {
    if (!window.confirm('确认删除该用户吗？此操作不可撤销。')) {
      return;
    }
    
    try {
      await ApiClient.userManagement.delete(id);
      notification.showSuccess('删除成功');
      loadUsers();
      // 清除选中项中被删除的项
      setSelectedItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除失败';
      setError(errorMessage);
      notification.showError(errorMessage);
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
      await ApiClient.userManagement.resetPassword(resetUserId, newPassword);
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
        await ApiClient.userManagement.batchDelete(ids);
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
    return `${item.name} (${getRoleLabel(item.role)})`;
  };

  const getRoleChip = (role: string) => {
    switch (role) {
      case 'admin':
        return <Chip label="管理员" color="primary" size="small" />;
      case 'base_agent':
        return <Chip label="基地代理" color="secondary" size="small" />;
      case 'captain':
        return <Chip label="队长" color="info" size="small" />;
      case 'factory_manager':
        return <Chip label="厂长" color="success" size="small" />;
      default:
        return <Chip label={role} color="default" size="small" />;
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
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
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
        <Button variant="outlined" onClick={handleSearch} disabled={loading}>
          搜索
        </Button>
      </Box>
      
      {/* 批量操作 */}
      <BatchOperations
        allItems={users}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        getItemId={getItemId}
        getItemLabel={getItemLabel}
        actions={batchActions}
        onBatchAction={handleBatchAction}
        disabled={loading}
        showSelectAll={true}
      />

      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              {/* 留空，由BatchOperations组件管理全选 */}
            </TableCell>
            <TableCell>用户名</TableCell>
            <TableCell>角色</TableCell>
            <TableCell>所属基地</TableCell>
            <TableCell>手机号</TableCell>
            <TableCell>入司时间</TableCell>
            <TableCell>操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => {
            const isSelected = selectedItems.some(item => item.id === user.id);
            return (
              <TableRow key={user.id} hover selected={isSelected}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => handleItemSelect(user, e.target.checked)}
                    color="primary"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {user.name}
                  </Typography>
                </TableCell>
                <TableCell>{getRoleChip(user.role)}</TableCell>
                <TableCell>{user.base || '-'}</TableCell>
                <TableCell>{user.mobile || '-'}</TableCell>
                <TableCell>{user.join_date || '-'}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Tooltip title="编辑">
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(user)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(user.id!)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="更多操作">
                      <IconButton
                        size="small"
                        onClick={(e) => handleOpenMenu(e, user.id!)}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
          {users.length === 0 && !loading && (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">
                  暂无用户记录
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* 更多操作菜单 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => handleOpenResetPassword(selectedUserId!)}>
          <ResetPasswordIcon sx={{ mr: 1 }} fontSize="small" />
          重置密码
        </MenuItem>
      </Menu>

      {/* 编辑对话框 */}
      <UserForm
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingUser(null);
        }}
        onSubmit={handleSubmit}
        initial={editingUser || undefined}
        submitting={submitting}
      />

      {/* 密码重置对话框 */}
      <Dialog open={resetPasswordDialogOpen} onClose={() => setResetPasswordDialogOpen(false)}>
        <DialogTitle>重置用户密码</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="新密码"
            type="password"
            fullWidth
            variant="outlined"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText="密码至少6个字符"
            disabled={resetPasswordSubmitting}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetPasswordDialogOpen(false)} disabled={resetPasswordSubmitting}>
            取消
          </Button>
          <Button onClick={handleResetPassword} variant="contained" disabled={resetPasswordSubmitting}>
            {resetPasswordSubmitting ? '重置中...' : '确认重置'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default UserManagementView;