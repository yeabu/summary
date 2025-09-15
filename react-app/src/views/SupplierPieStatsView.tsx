import React, { useEffect, useMemo, useState } from 'react';
import { Box, Paper, Typography, Grid, TextField, Button, Table, TableHead, TableRow, TableCell, TableBody, Alert } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip as ReTooltip, Legend, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';
import { PayableApi, SupplierPayableStats } from '../api/PayableApi';

const COLORS = ['#4caf50','#2196f3','#ff9800','#e91e63','#9c27b0','#00bcd4','#8bc34a','#ffc107','#795548','#607d8b','#3f51b5','#f44336'];

const SupplierPieStatsView: React.FC = () => {
  const api = new PayableApi();
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [list, setList] = useState<SupplierPayableStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPayableBySupplier({ month });
      setList(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const total = useMemo(() => (Array.isArray(list) ? list : []).reduce((s, x) => s + (x?.remaining_amount || 0), 0), [list]);
  // Top-N 聚合，减少扇区数量，避免重叠
  const chartData = useMemo(() => {
    const arr = (Array.isArray(list) ? [...list] : []).sort((a,b)=> b.remaining_amount - a.remaining_amount);
    const N = 10;
    const top = arr.slice(0, N).map(x => ({ name: x.supplier, value: x.remaining_amount }));
    const othersSum = arr.slice(N).reduce((s,x)=> s + x.remaining_amount, 0);
    return othersSum > 0 ? [...top, { name: '其它', value: othersSum }] : top;
  }, [list]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>总未结货款</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <TextField
              label="月份"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item>
            <Button variant="contained" onClick={load} disabled={loading}>查询</Button>
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>{dayjs(month + '-01').format('M月')}未结汇总</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>合计：{total.toLocaleString('zh-CN',{style:'currency',currency:'CNY'})}</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>供应商</TableCell>
                  <TableCell align="right">未结金额</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.map((row, i) => (
                  <TableRow key={row.supplier}>
                    <TableCell>{row.supplier}</TableCell>
                    <TableCell align="right">{row.remaining_amount.toLocaleString('zh-CN',{style:'currency',currency:'CNY'})}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell><strong>合计</strong></TableCell>
                  <TableCell align="right"><strong>{total.toLocaleString('zh-CN',{style:'currency',currency:'CNY'})}</strong></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ height: 360 }}>
              <ResponsiveContainer>
                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={80}
                    outerRadius={130}
                    label={false}
                    labelLine={false}
                    paddingAngle={1}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip formatter={(v:any, n:any, p:any)=>{
                    const val = v as number;
                    const percent = total > 0 ? `${((val/total)*100).toFixed(1)}%` : '0%';
                    return [`${val.toLocaleString('zh-CN',{style:'currency',currency:'CNY'})} (${percent})`, p?.payload?.name];
                  }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Alert severity="info">计划：规划一个管理平台，标准化数据录入。</Alert>
    </Box>
  );
};

export default SupplierPieStatsView;
