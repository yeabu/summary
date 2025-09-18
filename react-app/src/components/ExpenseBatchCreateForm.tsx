import React, { useEffect, useMemo, useState } from 'react';
import { Box, Grid, TextField, MenuItem, Button, IconButton, Tooltip, Alert } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import useAuthStore from '@/auth/AuthStore';
import { ApiClient, ExpenseCategory, Base } from '@/api/ApiClient';

type Item = { category_id: number | ''; amount: string; detail: string };

export default function ExpenseBatchCreateForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const api = useMemo(() => new ApiClient(), []);
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'admin';

  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [bases, setBases] = useState<Base[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [baseId, setBaseId] = useState<number | ''>('');
  const [items, setItems] = useState<Item[]>([{ category_id: '', amount: '', detail: '' }]);
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try { const cats = await api.listExpenseCategories('active'); setCategories(cats || []); } catch {}
      if (isAdmin) {
        try { const bs = await api.baseList(); setBases(bs || []); } catch {}
      }
    })();
  }, [api, isAdmin]);

  const addRow = () => setItems(prev => [...prev, { category_id: '', amount: '', detail: '' }]);
  const removeRow = (idx: number) => setItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  const updateRow = (idx: number, patch: Partial<Item>) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const submit = async () => {
    try {
      setError('');
      // validate
      if (!date) { setError('请选择开支日期'); return; }
      if (isAdmin && !baseId) { setError('请选择所属基地'); return; }
      const invalid = items.find(it => !it.category_id || !it.amount || Number(it.amount) <= 0);
      if (invalid) { setError('请完善每条记录：类别与金额必填且金额>0'); return; }
      setSubmitting(true);
      const payload: any = { items: items.map(it => ({ date, category_id: Number(it.category_id), amount: Number(it.amount), detail: it.detail || '' })) };
      if (isAdmin && baseId) payload.base_id = Number(baseId);
      await api.batchCreateExpense(payload);
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e.message || '提交失败');
    } finally { setSubmitting(false); }
  };

  return (
    <Box sx={{ p: 1 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="开支日期" type="date" value={date} onChange={e=>setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} md={8}>
          {isAdmin ? (
            <TextField select fullWidth label="所属基地" value={baseId} onChange={e=>setBaseId(e.target.value === '' ? '' : Number(e.target.value))}>
              <MenuItem value="">请选择基地</MenuItem>
              {bases.map(b => (<MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>))}
            </TextField>
          ) : (
            <TextField fullWidth label="所属基地" value={user?.base || ''} disabled />
          )}
        </Grid>
      </Grid>

      <Box sx={{ mt: 2 }}>
        {items.map((it, idx) => (
          <Grid key={idx} container spacing={2} alignItems="center" sx={{ mb: 1 }}>
            <Grid item xs={12} md={4}>
              <TextField select fullWidth label="费用类别" value={it.category_id} onChange={e=>updateRow(idx, { category_id: e.target.value as any })}>
                <MenuItem value="">请选择类别</MenuItem>
                {categories.map(c => (<MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth type="number" label="金额" value={it.amount}
                onChange={e=>updateRow(idx, { amount: e.target.value })}
                onFocus={(e)=> (e.target as HTMLInputElement).select()}
                inputProps={{ min: 0, step: 0.01 }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="备注" value={it.detail} onChange={e=>updateRow(idx, { detail: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={1}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="添加一行"><span><IconButton size="small" onClick={addRow}><AddIcon /></IconButton></span></Tooltip>
                <Tooltip title="删除本行"><span><IconButton size="small" color="error" onClick={()=>removeRow(idx)} disabled={items.length<=1}><DeleteIcon /></IconButton></span></Tooltip>
              </Box>
            </Grid>
          </Grid>
        ))}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={submit} disabled={submitting}>提交</Button>
      </Box>
    </Box>
  );
}

