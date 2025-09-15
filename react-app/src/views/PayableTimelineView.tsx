import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Stack, Button, TextField, Table, TableHead, TableRow, TableCell, TableBody, Alert } from '@mui/material';
import { PayableApi, PayableRecord } from '../api/PayableApi';

const PayableTimelineView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const api = new PayableApi();
  const [payable, setPayable] = useState<PayableRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [includeIn, setIncludeIn] = useState(true); // 采购计入
  const [includeOut, setIncludeOut] = useState(true); // 还款
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const detail = await api.getPayableDetail(Number(id));
        setPayable(detail);
        setError(null);
      } catch (e: any) {
        setError(e.message || '加载应付款详情失败');
      }
    };
    load();
  }, [id]);

  const formatAmount = (amount: number) => amount.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' });
  const formatDate = (d: string) => new Date(d).toLocaleDateString('zh-CN');

  const events = useMemo(() => {
    if (!payable) return [] as { time: string; label: string; delta: number }[];
    const ev: { time: string; label: string; delta: number }[] = [];
    if (payable.links && payable.links.length) {
      (payable.links as any[]).forEach((link) => {
        const t = link.created_at || link.purchase_entry?.purchase_date || payable.created_at;
        ev.push({ time: t, label: '采购计入', delta: link.amount });
      });
    }
    if (payable.payment_records && payable.payment_records.length) {
      (payable.payment_records as any[]).forEach((p) => {
        const t = p.payment_date || p.created_at;
        ev.push({ time: t, label: '还款', delta: -p.payment_amount });
      });
    }
    return ev.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [payable]);

  const filtered = events.filter(e => {
    if (e.label === '采购计入' && !includeIn) return false;
    if (e.label === '还款' && !includeOut) return false;
    if (start && new Date(e.time) < new Date(start)) return false;
    if (end) {
      const endDate = new Date(end);
      endDate.setHours(23,59,59,999);
      if (new Date(e.time) > endDate) return false;
    }
    return true;
  });

  const exportCSV = () => {
    let running = 0;
    const rows = [['日期', '类型', '金额变化', '累计余额']];
    filtered.forEach(e => {
      running += e.delta;
      rows.push([formatDate(e.time), e.label, e.delta.toString(), running.toString()]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `应付款变更时间线_${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ flex: 1 }}>应付款时间线</Typography>
        <Button variant="outlined" onClick={() => navigate(-1)}>返回</Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {payable && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="body1"><strong>供应商：</strong>{typeof payable.supplier === 'object' ? (payable.supplier as any).name : payable.supplier}</Typography>
          <Typography variant="body1"><strong>基地：</strong>{payable.base?.name || '-'}</Typography>
          <Typography variant="body1"><strong>总额/已付/剩余：</strong>{formatAmount(payable.total_amount)} / {formatAmount(payable.paid_amount)} / {formatAmount(payable.remaining_amount)}</Typography>
        </Paper>
      )}

      <Paper sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <label><input type="checkbox" checked={includeIn} onChange={(e) => setIncludeIn(e.target.checked)} /> 采购计入</label>
          <label><input type="checkbox" checked={includeOut} onChange={(e) => setIncludeOut(e.target.checked)} /> 还款</label>
          <TextField size="small" type="date" label="开始" InputLabelProps={{ shrink: true }} value={start} onChange={e => setStart(e.target.value)} />
          <TextField size="small" type="date" label="结束" InputLabelProps={{ shrink: true }} value={end} onChange={e => setEnd(e.target.value)} />
          <Button variant="outlined" onClick={exportCSV}>导出CSV</Button>
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>日期</TableCell>
              <TableCell>类型</TableCell>
              <TableCell>金额变化</TableCell>
              <TableCell>累计余额</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(() => {
              let running = 0;
              if (filtered.length === 0) {
                return (
                  <TableRow>
                    <TableCell colSpan={4} align="center">暂无记录</TableCell>
                  </TableRow>
                );
              }
              return filtered.map((e, idx) => {
                running += e.delta;
                return (
                  <TableRow key={idx}>
                    <TableCell>{formatDate(e.time)}</TableCell>
                    <TableCell>{e.label}</TableCell>
                    <TableCell sx={{ color: e.delta >= 0 ? 'success.main' : 'error.main' }}>{formatAmount(e.delta)}</TableCell>
                    <TableCell>{formatAmount(running)}</TableCell>
                  </TableRow>
                );
              })
            })()}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default PayableTimelineView;

