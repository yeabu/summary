import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  TextField,
  Stack,
} from '@mui/material';
import { Tooltip as ReTooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { FileDownload as FileDownloadIcon, Refresh as RefreshIcon, Assessment as AssessmentIcon } from '@mui/icons-material';
import { getValidAccessTokenOrRefresh } from '../utils/authToken';
import { PayableApi, SupplierPayableStats } from '../api/PayableApi';

interface ExpenseByBase { base: string; total: number }
interface PurchaseBySupplier { supplier: string; total: number; count: number }
interface PurchaseByBase { base: string; total: number }
interface TimeRangeSummaryResponse {
  start_date: string;
  end_date: string;
  total_expense: number;
  expense_by_base: ExpenseByBase[];
  total_purchase: number;
  purchase_by_supplier: PurchaseBySupplier[];
  purchase_by_base: PurchaseByBase[];
}

const SUPPLIER_COLORS = ['#4caf50','#2196f3','#ff9800','#e91e63','#9c27b0','#00bcd4','#8bc34a','#ffc107','#795548','#607d8b','#3f51b5','#f44336'];

const AnalyticsView: React.FC = () => {
  const navigate = useNavigate();
  const payableApi = useMemo(() => new PayableApi(), []);

  // 时间段汇总
  const [rangeStart, setRangeStart] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
  });
  const [rangeEnd, setRangeEnd] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState<string|undefined>();
  const [rangeData, setRangeData] = useState<TimeRangeSummaryResponse | null>(null);

  // 未结货款
  const [supplierMonth, setSupplierMonth] = useState<string>(new Date().toISOString().slice(0,7));
  const [supplierStatsList, setSupplierStatsList] = useState<SupplierPayableStats[]>([]);
  const [supplierStatsLoading, setSupplierStatsLoading] = useState(false);
  const [supplierStatsError, setSupplierStatsError] = useState<string | null>(null);

  // 导航：采购列表（带供应商和时间范围）
  const openPurchaseListBySupplier = (supplierName: string) => {
    if (!supplierName) return;
    const params = new URLSearchParams();
    params.set('supplier', supplierName);
    if (rangeStart) params.set('start_date', rangeStart);
    if (rangeEnd) params.set('end_date', rangeEnd);
    navigate(`/purchase/list?${params.toString()}`);
  };

  // 导航：应付款列表（带供应商）
  const openSupplierList = (supplierName: string) => {
    if (!supplierName) return;
    const params = new URLSearchParams();
    params.set('supplier', supplierName);
    navigate(`/payable/list?${params.toString()}`);
  };

  const loadTimeRangeSummary = async () => {
    try {
      setRangeLoading(true);
      setRangeError(undefined);
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = await getValidAccessTokenOrRefresh();
      const url = `${apiUrl}/api/analytics/summary?start_date=${encodeURIComponent(rangeStart)}&end_date=${encodeURIComponent(rangeEnd)}`;
      const res = await fetch(url, { headers: { 'Authorization': token ? `Bearer ${token}` : '' } });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as TimeRangeSummaryResponse;
      setRangeData(data);
    } catch (e:any) {
      setRangeError(e.message || '加载汇总失败');
      setRangeData(null);
    } finally {
      setRangeLoading(false);
    }
  };

  const loadSupplierStats = async () => {
    try {
      setSupplierStatsLoading(true);
      setSupplierStatsError(null);
      const data = await payableApi.getPayableBySupplier({ month: supplierMonth });
      setSupplierStatsList(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setSupplierStatsError(e.message || '加载未结货款统计失败');
      setSupplierStatsList([]);
    } finally {
      setSupplierStatsLoading(false);
    }
  };

  useEffect(() => {
    loadTimeRangeSummary();
    loadSupplierStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 导出工具
  const exportCsv = (filename: string, headers: (string|number)[], rows: (string|number)[][]) => {
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPurchaseBySupplierCsv = () => {
    if (!rangeData?.purchase_by_supplier?.length) return;
    const headers = ['供应商','采购额','笔数'];
    const rows = rangeData.purchase_by_supplier.map(x => [x.supplier || '-', x.total, x.count]);
    exportCsv(`各供应商采购_${rangeStart}_至_${rangeEnd}.csv`, headers, rows);
  };

  const exportPurchaseByBaseCsv = () => {
    if (!rangeData?.purchase_by_base?.length) return;
    const headers = ['基地','采购额'];
    const rows = rangeData.purchase_by_base.map(x => [x.base || '-', x.total]);
    exportCsv(`各基地采购_${rangeStart}_至_${rangeEnd}.csv`, headers, rows);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentIcon color="primary" />
          统计分析
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { loadTimeRangeSummary(); loadSupplierStats(); }}>刷新</Button>
        </Stack>
      </Box>

      {/* 时间段汇总分析 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Typography variant="h6">时间段汇总分析</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField size="small" type="date" label="开始日期" value={rangeStart} onChange={e=>setRangeStart(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField size="small" type="date" label="结束日期" value={rangeEnd} onChange={e=>setRangeEnd(e.target.value)} InputLabelProps={{ shrink: true }} />
            <Button variant="outlined" onClick={loadTimeRangeSummary} disabled={rangeLoading}>查询</Button>
          </Box>
        </Box>
        {rangeError && <Alert severity="error" sx={{ mb: 2 }}>{rangeError}</Alert>}
        <Grid container spacing={2}>
          {/* 各供应商采购总额（表格 + 柱状图） */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1">各供应商采购总额</Typography>
              <Button size="small" onClick={exportPurchaseBySupplierCsv} disabled={!rangeData?.purchase_by_supplier?.length}>导出CSV</Button>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>供应商</TableCell>
                  <TableCell align="right">采购额</TableCell>
                  <TableCell align="right">笔数</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(rangeData?.purchase_by_supplier || []).map((row, idx) => (
                  <TableRow key={row.supplier + idx} hover sx={{ cursor: 'pointer' }} onClick={() => openPurchaseListBySupplier(row.supplier)}>
                    <TableCell>{row.supplier || '-'}</TableCell>
                    <TableCell align="right">{(row.total || 0).toLocaleString('zh-CN',{style:'currency',currency:'CNY'})}</TableCell>
                    <TableCell align="right">{row.count || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={(rangeData?.purchase_by_supplier || []).map(x => ({ name: x.supplier, total: x.total }))} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} height={60} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ReTooltip formatter={(v:any)=> (v as number).toLocaleString('zh-CN',{style:'currency',currency:'CNY'})} />
                  <Bar dataKey="total" fill="#9c27b0" onClick={(data:any)=> data?.activePayload?.[0]?.payload?.name && openPurchaseListBySupplier(data.activePayload[0].payload.name)} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* 各基地采购总额（表格 + 柱状图） */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1">各基地采购总额</Typography>
              <Button size="small" onClick={exportPurchaseByBaseCsv} disabled={!rangeData?.purchase_by_base?.length}>导出CSV</Button>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>基地</TableCell>
                  <TableCell align="right">采购额</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(rangeData?.purchase_by_base || []).map((row, idx) => (
                  <TableRow key={row.base + idx}>
                    <TableCell>{row.base || '-'}</TableCell>
                    <TableCell align="right">{(row.total || 0).toLocaleString('zh-CN',{style:'currency',currency:'CNY'})}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={(rangeData?.purchase_by_base || []).map(x => ({ name: x.base, total: x.total }))} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} height={60} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ReTooltip formatter={(v:any)=> (v as number).toLocaleString('zh-CN',{style:'currency',currency:'CNY'})} />
                  <Bar dataKey="total" fill="#2196f3" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 未结货款（按供应商） */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6">未结货款（按供应商）</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              size="small"
              type="month"
              label="月份"
              value={supplierMonth}
              onChange={(e) => setSupplierMonth(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <Button variant="outlined" onClick={loadSupplierStats} disabled={supplierStatsLoading}>查询</Button>
          </Box>
        </Box>
        {supplierStatsError && (
          <Alert severity="error" sx={{ mb: 2 }}>{supplierStatsError}</Alert>
        )}
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
                {(supplierStatsList || []).map((row, idx) => (
                  <TableRow key={row.supplier + idx} hover sx={{ cursor: 'pointer' }} onClick={() => openSupplierList(row.supplier)}>
                    <TableCell>{row.supplier}</TableCell>
                    <TableCell align="right">{row.remaining_amount.toLocaleString('zh-CN',{style:'currency',currency:'CNY'})}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell><strong>合计</strong></TableCell>
                  <TableCell align="right"><strong>{(supplierStatsList || []).reduce((s, x) => s + (x?.remaining_amount || 0), 0).toLocaleString('zh-CN',{style:'currency',currency:'CNY'})}</strong></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ height: 360 }}>
              <ResponsiveContainer>
                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Pie
                    data={(() => {
                      const arr = (supplierStatsList || []).slice().sort((a,b)=> b.remaining_amount - a.remaining_amount);
                      const N = 10;
                      const top = arr.slice(0,N).map(x => ({ name: x.supplier, value: x.remaining_amount }));
                      const others = arr.slice(N).reduce((s,x)=> s + x.remaining_amount, 0);
                      return others>0 ? [...top, { name: '其它', value: others }] : top;
                    })()}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={80}
                    outerRadius={130}
                    label={false}
                    labelLine={false}
                    paddingAngle={1}
                    onClick={(data:any) => data?.name && data.name !== '其它' && openSupplierList(data.name)}
                  >
                    {(supplierStatsList || []).map((_, index) => (
                      <Cell key={index} fill={SUPPLIER_COLORS[index % SUPPLIER_COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip formatter={(v:any,n:any,p:any)=>{
                    const val = v as number;
                    const totalVal = (supplierStatsList || []).reduce((s,x)=> s + (x?.remaining_amount||0), 0);
                    const percent = totalVal>0 ? `${((val/totalVal)*100).toFixed(1)}%` : '0%';
                    return [`${val.toLocaleString('zh-CN',{style:'currency',currency:'CNY'})} (${percent})`, p?.payload?.name];
                  }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default AnalyticsView;

