import React, { useEffect, useMemo, useState } from 'react';
import { Box, Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, IconButton, Tooltip, Alert, Grid, MenuItem } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { ApiClient, ExpenseCategory } from '@/api/ApiClient';
import { useNotification } from '@/components/NotificationProvider';
import ConfirmDialog from '@/components/ConfirmDialog';

const ExpenseCategoryManagementView: React.FC = () => {
  const api = useMemo(() => new ApiClient(), []);
  const notification = useNotification();

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all'|'active'|'inactive'>('all');

  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);
  const [form, setForm] = useState<{ name: string; code: string; status: 'active'|'inactive' }>(
    { name: '', code: '', status: 'active' }
  );

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await api.listExpenseCategories(statusFilter === 'all' ? undefined : statusFilter);
      setCategories(list);
    } catch (e: any) {
      setError(e.message || '加载费用类别失败');
      notification.showError('加载费用类别失败');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadCategories(); }, [statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', code: '', status: 'active' });
    setOpenDialog(true);
  };
  const openEdit = (c: ExpenseCategory) => {
    setEditing(c);
    setForm({ name: c.name, code: (c as any).code || '', status: c.status });
    setOpenDialog(true);
  };
  const closeDialog = () => { setOpenDialog(false); setEditing(null); };

  const save = async () => {
    try {
      if (!form.name.trim()) { notification.showError('请输入类别名称'); return; }
      if (editing) {
        await api.updateExpenseCategory(editing.id, { name: form.name.trim(), code: form.code.trim() || undefined, status: form.status });
        notification.showSuccess('类别已更新');
      } else {
        await api.createExpenseCategory({ name: form.name.trim(), status: form.status, code: form.code.trim() || undefined } as any);
        notification.showSuccess('类别已创建');
      }
      closeDialog();
      loadCategories();
    } catch (e: any) {
      notification.showError(e.message || '保存失败');
    }
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ExpenseCategory | null>(null);
  const askDelete = (c: ExpenseCategory) => { setToDelete(c); setConfirmOpen(true); };
  const del = async () => {
    if (!toDelete) return;
    try {
      await api.deleteExpenseCategory(toDelete.id);
      notification.showSuccess('类别已删除');
      setConfirmOpen(false);
      setToDelete(null);
      loadCategories();
    } catch (e: any) { notification.showError(e.message || '删除失败'); }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">费用类别管理</Typography>
        <Box>
          <Button startIcon={<RefreshIcon />} sx={{ mr:1 }} onClick={loadCategories}>刷新</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>新增类别</Button>
        </Box>
      </Box>

      <Paper sx={{ p:2, mb:2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <TextField select label="状态" size="small" value={statusFilter} onChange={e=>setStatusFilter(e.target.value as any)}>
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="active">启用</MenuItem>
              <MenuItem value="inactive">停用</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb:2 }}>{error}</Alert>}

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>名称</TableCell>
              <TableCell>代码</TableCell>
              <TableCell>状态</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map(c => (
              <TableRow key={c.id}>
                <TableCell>{c.id}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell>{(c as any).code || '-'}</TableCell>
                <TableCell>
                  <Chip label={c.status === 'active' ? '启用' : '停用'} color={c.status==='active' ? 'success' : 'default'} size="small" />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="编辑"><span><IconButton onClick={()=>openEdit(c)}><EditIcon /></IconButton></span></Tooltip>
                  <Tooltip title="删除"><span><IconButton onClick={()=>askDelete(c)} color="error"><DeleteIcon /></IconButton></span></Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && !loading && (
              <TableRow><TableCell colSpan={5} align="center">暂无数据</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={openDialog} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? '编辑类别' : '新增类别'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt:1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}><TextField fullWidth label="名称" value={form.name} onChange={e=>setForm({ ...form, name: e.target.value })} /></Grid>
              <Grid item xs={12} md={6}><TextField fullWidth label="代码" value={form.code} onChange={e=>setForm({ ...form, code: e.target.value })} /></Grid>
              <Grid item xs={12} md={6}>
                <TextField select fullWidth label="状态" value={form.status} onChange={e=>setForm({ ...form, status: e.target.value as any })}>
                  <MenuItem value="active">启用</MenuItem>
                  <MenuItem value="inactive">停用</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>取消</Button>
          <Button variant="contained" onClick={save}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setToDelete(null); }}
        onConfirm={del}
        title="确认删除类别"
        content={`将删除类别「${toDelete?.name || ''}」。此操作不可撤销。`}
        confirmText="删除"
        confirmColor="error"
      />
    </Box>
  );
};

export default ExpenseCategoryManagementView;
