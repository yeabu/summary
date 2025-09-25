import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, MenuItem,
  IconButton, Tooltip, Alert
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Upload as UploadIcon, Download as DownloadIcon, Refresh as RefreshIcon, FileDownload as FileDownloadIcon, Tune as TuneIcon } from '@mui/icons-material';
import { ProductApi, ProductItem } from '@/api/ProductApi';
import { SupplierApi, Supplier } from '@/api/SupplierApi';
import { useNotification } from '@/components/NotificationProvider';
import PaginationControl from '@/components/PaginationControl';
import ConfirmDialog from '@/components/ConfirmDialog';

const ProductManagementView: React.FC = () => {
  const api = useMemo(() => new ProductApi(), []);
  const supplierApi = useMemo(() => new SupplierApi(), []);
  const notification = useNotification();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<{ name: string; supplier_id?: number | '' }>({ name: '' });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<ProductItem | null>(null);
  const [form, setForm] = useState<{ name: string; base_unit: string; spec: string; unit_price: string; currency: string; supplier_id: number | '' }>({ name: '', base_unit: '', spec: '', unit_price: '', currency: 'CNY', supplier_id: '' });
  const [specOpen, setSpecOpen] = useState(false);
  const [specTarget, setSpecTarget] = useState<ProductItem | null>(null);
  const [specs, setSpecs] = useState<Array<{ id:number; unit:string; factor_to_base:number; kind:string; is_default:boolean }>>([]);
  const [specForm, setSpecForm] = useState<{ unit:string; factor:number; kind:'both'|'purchase'|'usage'; is_default:boolean }>({ unit:'', factor:1, kind:'both', is_default:false });
  const [ppForm, setPpForm] = useState<{ unit:string; factor:number; price:string }>({ unit:'', factor:1, price:'' });

  const loadSuppliers = async () => {
    try {
      const res = await supplierApi.getAllSuppliers();
      setSuppliers(res);
    } catch {}
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await api.listProducts({ name: filters.name, supplier_id: filters.supplier_id as number | undefined, limit, offset: (page-1)*limit });
      setProducts(res.records);
      setTotal(res.total);
      setError(null);
    } catch (e: any) {
      setError(e.message || '加载商品失败');
      notification.showError('加载商品失败');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadSuppliers(); }, []);
  useEffect(() => { loadProducts(); }, [page, limit, filters.name, filters.supplier_id]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', base_unit: '', spec: '', unit_price: '', currency: 'CNY', supplier_id: '' });
    setOpenDialog(true);
  };
  const openEdit = (p: ProductItem) => {
    setEditing(p);
    setForm({
      name: p.name || '',
      base_unit: p.base_unit || '',
      spec: p.spec || '',
      unit_price: (p.unit_price ?? '').toString(),
      currency: p.currency || 'CNY',
      supplier_id: p.supplier_id ?? ''
    });
    setOpenDialog(true);
  };
  const closeDialog = () => { setOpenDialog(false); setEditing(null); };

  const openSpec = async (p: ProductItem) => {
    setSpecTarget(p);
    try {
      const list = await api.listUnitSpecs(p.id);
      setSpecs(list);
    } catch { setSpecs([]); }
    try {
      const pp = await api.getPurchaseParam(p.id);
      if (pp) setPpForm({ unit: pp.unit, factor: pp.factor_to_base, price: String(pp.purchase_price) });
      else setPpForm({ unit:'', factor:1, price:'' });
    } catch { setPpForm({ unit:'', factor:1, price:'' }); }
    setSpecForm({ unit:'', factor:1, kind:'both', is_default:false });
    setSpecOpen(true);
  };
  const closeSpec = () => { setSpecOpen(false); setSpecTarget(null); };
  const saveSpec = async () => {
    if (!specTarget) return;
    if (!specForm.unit || specForm.factor <= 0) { notification.showError('请填写单位与有效换算系数'); return; }
    try {
      await api.upsertUnitSpec(specTarget.id, specForm.unit.trim(), specForm.factor, specForm.kind, specForm.is_default);
      const list = await api.listUnitSpecs(specTarget.id);
      setSpecs(list);
      setSpecForm({ unit:'', factor:1, kind:'both', is_default:false });
      notification.showSuccess('规格已保存');
    } catch (e:any) { notification.showError(e.message || '保存失败'); }
  };
  const delSpec = async (id:number) => {
    if (!confirm('确定删除该规格吗？')) return;
    try {
      await api.deleteUnitSpec(id);
      if (specTarget) { const list = await api.listUnitSpecs(specTarget.id); setSpecs(list); }
    } catch (e:any) { notification.showError(e.message || '删除失败'); }
  };
  const savePurchaseParam = async () => {
    if (!specTarget) return;
    if (!ppForm.unit || ppForm.factor <= 0 || !ppForm.price || Number(ppForm.price) <= 0) {
      notification.showError('请完整填写采购参数'); return;
    }
    try {
      await api.upsertPurchaseParam({ product_id: specTarget.id, unit: ppForm.unit, factor_to_base: ppForm.factor, purchase_price: Number(ppForm.price) });
      notification.showSuccess('采购参数已保存');
    } catch (e:any) { notification.showError(e.message || '保存失败'); }
  };

  const saveProduct = async () => {
    try {
      const payload: any = {
        name: form.name.trim(),
        base_unit: form.base_unit.trim() || undefined,
        spec: form.spec.trim() || undefined,
        unit_price: form.unit_price ? Number(form.unit_price) : undefined,
        currency: form.currency || 'CNY',
        supplier_id: form.supplier_id || undefined,
      };
      if (!payload.name) { notification.showError('请填写商品名称'); return; }
      if (editing) {
        await api.updateProduct(editing.id, payload);
        notification.showSuccess('商品已更新');
      } else {
        await api.createProduct(payload);
        notification.showSuccess('商品已创建');
      }
      closeDialog();
      loadProducts();
    } catch (e: any) { notification.showError(e.message || '保存失败'); }
  };

  const [confirmProdOpen, setConfirmProdOpen] = useState(false);
  const [toDeleteProduct, setToDeleteProduct] = useState<ProductItem | null>(null);
  const askDeleteProduct = (p: ProductItem) => { setToDeleteProduct(p); setConfirmProdOpen(true); };
  const deleteProduct = async () => {
    if (!toDeleteProduct) return;
    try {
      await api.deleteProduct(toDeleteProduct.id);
      notification.showSuccess('已删除');
      loadProducts();
    } catch (e: any) { notification.showError(e.message || '删除失败'); }
    finally { setConfirmProdOpen(false); setToDeleteProduct(null); }
  };

  const downloadTemplate = async () => {
    try {
      const blob = await api.downloadImportTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'product_import_template.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { notification.showError(e.message || '下载模板失败'); }
  };

  const importCsv = async (file: File) => {
    try {
      const res = await api.importCsv(file);
      notification.showSuccess(`导入完成：新增 ${res.created}，更新 ${res.updated}`);
      loadProducts();
    } catch (e: any) { notification.showError(e.message || '导入失败'); }
  };

  const exportCsv = async () => {
    try {
      const blob = await api.exportCsv({ name: filters.name || undefined, supplier_id: (filters.supplier_id || undefined) as number | undefined });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'products.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { notification.showError(e.message || '导出失败'); }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">商品管理</Typography>
        <Box>
          <Button startIcon={<FileDownloadIcon />} onClick={exportCsv} sx={{ mr: 1 }}>导出CSV</Button>
          <Button startIcon={<DownloadIcon />} onClick={downloadTemplate} sx={{ mr: 1 }}>下载导入模板</Button>
          <Button component="label" startIcon={<UploadIcon />} sx={{ mr: 1 }}>
            导入CSV
            <input hidden type="file" accept=".csv" onChange={(e) => e.target.files && importCsv(e.target.files[0])} />
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>添加商品</Button>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="end">
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="商品名称" value={filters.name} onChange={(e) => setFilters({ ...filters, name: e.target.value })} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField select fullWidth label="供应商" value={filters.supplier_id ?? ''} onChange={(e) => setFilters({ ...filters, supplier_id: (e.target.value === '' ? '' : Number(e.target.value)) })}>
              <MenuItem value="">全部</MenuItem>
              {suppliers.map(s => (<MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" onClick={loadProducts}>搜索</Button>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { setFilters({ name: '' }); loadProducts(); }}>重置</Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {!loading && products.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          暂无商品数据。请点击“添加商品”或“导入CSV”快速录入商品。
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>名称</TableCell>
              <TableCell>规格</TableCell>
              <TableCell>单位</TableCell>
              <TableCell>单价</TableCell>
              <TableCell>币种</TableCell>
              <TableCell>供应商</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map(p => (
              <TableRow key={p.id}>
                <TableCell>{p.id}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.spec || '-'}</TableCell>
                <TableCell>{p.base_unit || '-'}</TableCell>
                <TableCell>{p.unit_price != null ? p.unit_price.toFixed(2) : '-'}</TableCell>
                <TableCell>{p.currency || 'CNY'}</TableCell>
                <TableCell>{p.supplier?.name || '-'}</TableCell>
                <TableCell align="right">
                  <Tooltip title="管理规格"><span><IconButton onClick={() => openSpec(p)}><TuneIcon /></IconButton></span></Tooltip>
                  <Tooltip title="编辑"><span><IconButton onClick={() => openEdit(p)}><EditIcon /></IconButton></span></Tooltip>
                  <Tooltip title="删除"><span><IconButton onClick={() => askDeleteProduct(p)} color="error"><DeleteIcon /></IconButton></span></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* 分页控制 */}
      <Box sx={{ p: 2 }}>
        <PaginationControl
          pagination={{
            total,
            page,
            page_size: limit,
            total_pages: Math.max(1, Math.ceil(total / limit))
          }}
          onPageChange={setPage}
          onPageSizeChange={(newLimit) => { setPage(1); setLimit(newLimit); }}
          loading={loading}
        />
      </Box>

      <Dialog open={openDialog} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? '编辑商品' : '添加商品'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="单位" value={form.base_unit} onChange={(e) => setForm({ ...form, base_unit: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="规格" value={form.spec} onChange={(e) => setForm({ ...form, spec: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="单价" type="number" inputProps={{ step: '0.01' }} value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField select fullWidth label="币种" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  <MenuItem value="CNY">CNY 人民币</MenuItem>
                  <MenuItem value="LAK">LAK 老挝基普</MenuItem>
                  <MenuItem value="THB">THB 泰铢</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={12}>
                <TextField select fullWidth label="供应商" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value === '' ? '' : Number(e.target.value) })}>
                  <MenuItem value="">未指定</MenuItem>
                  {suppliers.map(s => (<MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>))}
                </TextField>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>取消</Button>
          <Button onClick={saveProduct} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={confirmProdOpen}
        onClose={() => { setConfirmProdOpen(false); setToDeleteProduct(null); }}
        onConfirm={deleteProduct}
        title="确认删除商品"
        content={`将删除商品「${toDeleteProduct?.name || ''}」。此操作不可撤销。`}
        confirmText="删除"
        confirmColor="error"
      />
      {/* 采购参数对话框（规格内容已移除） */}
      <Dialog open={specOpen} onClose={closeSpec} fullWidth maxWidth="sm">
        <DialogTitle>采购参数：{specTarget?.name}</DialogTitle>
        <DialogContent>
          {/* 采购参数设置 */}
          <Box sx={{ mb:2, p:2, border:'1px solid', borderColor:'divider', borderRadius:1 }}>
            <Typography variant="subtitle2" sx={{ mb:1 }}>采购参数</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="采购单位" value={ppForm.unit} onChange={e=>setPpForm({ ...ppForm, unit: e.target.value })} placeholder="如：箱/袋/瓶/斤" />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth type="number" label="换算系数" inputProps={{ step:'0.0001' }} value={ppForm.factor} onChange={e=>setPpForm({ ...ppForm, factor: Number(e.target.value) })} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth type="number" label="采购单价" inputProps={{ step:'0.01' }} value={ppForm.price} onChange={e=>setPpForm({ ...ppForm, price: e.target.value })} />
              </Grid>
            </Grid>
            {/* 内部保存按钮已移除，统一使用对话框底部操作区保存 */}
          </Box>
          {/* 规格管理内容已删除，仅保留采购参数设置 */}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSpec}>关闭</Button>
          <Button variant="contained" onClick={savePurchaseParam}>保存采购参数</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductManagementView;
