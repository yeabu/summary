import React, { useEffect, useMemo, useState } from 'react';
import { API_URL } from '@/config';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Divider,
  InputLabel,
  FormControl,
  Select,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import dayjs from 'dayjs';
import { ApiClient, Base, InventoryRecord, MaterialRequisition } from '@/api/ApiClient';
import { Edit as EditIcon, Delete as DeleteIcon, ReceiptLong as ReceiptIcon, CloudUpload as UploadIcon, PhotoCamera as CameraIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import CameraCaptureDialog from '@/components/CameraCaptureDialog';
import ImageEditDialog from '@/components/ImageEditDialog';
import { ProductApi, ProductItem } from '@/api/ProductApi';
import { useNotification } from '@/components/NotificationProvider';

const InventoryManagementView: React.FC = () => {
  const api = useMemo(() => new ApiClient(), []);
  const productApi = useMemo(() => new ProductApi(), []);
  const notify = useNotification();

  // 库存表
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);

  // 申领
  const [bases, setBases] = useState<Base[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [requisitions, setRequisitions] = useState<MaterialRequisition[]>([]);
  const [form, setForm] = useState<{ base_id: string; product_id: string; quantity: string; unit: string; unit_price: string; request_date: string }>({
    base_id: '', product_id: '', quantity: '', unit: '', unit_price: '', request_date: dayjs().format('YYYY-MM-DD')
  });
  const [unitOptions, setUnitOptions] = useState<Array<{ unit: string; factor_to_base: number; source: 'base' | 'purchase_spec' }>>([]);
  const [purchaseParam, setPurchaseParam] = useState<{ unit: string; factor_to_base: number; purchase_price: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<MaterialRequisition | null>(null);
  // 票据
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptReq, setReceiptReq] = useState<MaterialRequisition | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const cameraSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBlob, setEditBlob] = useState<Blob | null>(null);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const data = await api.inventoryList({ q });
      setInventory(data);
    } catch (e:any) {
      notify.showError(e?.message || '加载库存失败');
    } finally {
      setLoading(false);
    }
  };

  const loadBasesAndProducts = async () => {
    try {
      const [bs, ps] = await Promise.all([
        api.baseList(),
        productApi.listProducts({ limit: 1000 })
      ]);
      setBases(bs || []);
      setProducts(ps.records || []);
    } catch (e:any) {
      // ignore
    }
  };

  const loadRequisitions = async () => {
    try {
      const items = await api.requisitionList();
      setRequisitions(items);
    } catch (e:any) {
      // ignore for now
    }
  };

  useEffect(() => {
    loadInventory();
    loadBasesAndProducts();
    loadRequisitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedProduct = products.find(p => String(p.id) === form.product_id);

  // 当选择商品时，加载单位选项与采购参数，并设置默认单位与单价
  useEffect(() => {
    const loadUnitsAndParam = async () => {
      if (!selectedProduct) {
        setUnitOptions([]);
        setPurchaseParam(null);
        return;
      }

      try {
        const [specs, param] = await Promise.all([
          productApi.listUnitSpecs(selectedProduct.id),
          productApi.getPurchaseParam(selectedProduct.id).catch(() => null)
        ]);
        setPurchaseParam(param);

        // 组装单位下拉：包含基准单位 + 采购单位规格(kind 包含 purchase)
        const opts: Array<{ unit: string; factor_to_base: number; source: 'base' | 'purchase_spec' }> = [];
        if (selectedProduct.base_unit) {
          opts.push({ unit: selectedProduct.base_unit, factor_to_base: 1, source: 'base' });
        }
        (specs || []).forEach(s => {
          if (!s.unit) return;
          const include = s.kind === 'purchase' || s.kind === 'both' || s.kind === undefined;
          if (!include) return;
          // 去重：避免和基准单位相同
          if (selectedProduct.base_unit && s.unit === selectedProduct.base_unit) return;
          opts.push({ unit: s.unit, factor_to_base: s.factor_to_base, source: 'purchase_spec' });
        });
        setUnitOptions(opts);

        // 默认单位：商品基准单位；并按单位联动单价
        const defaultUnit = selectedProduct.base_unit || '';
        let nextPrice = '';
        if (defaultUnit) {
          // 若产品有默认单价，则用之
          if (typeof selectedProduct.unit_price === 'number') {
            nextPrice = String(selectedProduct.unit_price);
          } else if (param && param.unit === defaultUnit) {
            nextPrice = String(param.purchase_price);
          }
        }
        setForm(prev => ({ ...prev, unit: defaultUnit, unit_price: nextPrice }));
      } catch {
        // 忽略错误，仅清空
        setUnitOptions(selectedProduct?.base_unit ? [{ unit: selectedProduct.base_unit, factor_to_base: 1, source: 'base' }] : []);
        setPurchaseParam(null);
        setForm(prev => ({ ...prev, unit: selectedProduct?.base_unit || '', unit_price: String(selectedProduct?.unit_price || '') }));
      }
    };
    loadUnitsAndParam();
  }, [selectedProduct, productApi]);

  // 单位变化时，联动单价
  useEffect(() => {
    if (!selectedProduct) return;
    const u = form.unit;
    if (!u) return;
    // 1) 若与采购参数单位一致，用采购价
    if (purchaseParam && purchaseParam.unit === u) {
      setForm(prev => ({ ...prev, unit_price: String(purchaseParam.purchase_price || '') }));
      return;
    }
    // 2) 若为基准单位，用商品默认单价
    if (selectedProduct.base_unit && u === selectedProduct.base_unit) {
      setForm(prev => ({ ...prev, unit_price: String(selectedProduct.unit_price || '') }));
      return;
    }
    // 3) 若有换算规格，基于基准单价换算
    const spec = unitOptions.find(x => x.unit === u);
    if (spec && typeof selectedProduct.unit_price === 'number') {
      const price = selectedProduct.unit_price * spec.factor_to_base;
      setForm(prev => ({ ...prev, unit_price: String(price) }));
    }
  }, [form.unit, selectedProduct, purchaseParam, unitOptions]);

  const handleSubmit = async () => {
    try {
      if (!form.base_id || !form.product_id || !form.quantity) {
        notify.showError('请完整填写申领表单');
        return;
      }
      setSubmitting(true);
      await api.requisitionCreate({
        base_id: Number(form.base_id),
        product_id: Number(form.product_id),
        quantity: Number(form.quantity),
        unit: form.unit || undefined,
        unit_price: form.unit_price ? Number(form.unit_price) : undefined,
        request_date: form.request_date || undefined
      });
      notify.showSuccess('申领成功');
      setForm(f => ({ ...f, quantity: '' }));
      await Promise.all([loadInventory(), loadRequisitions()]);
    } catch (e:any) {
      notify.showError(e?.message || '申领失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditOpen = (row: MaterialRequisition) => {
    setEditing(row);
    setForm({
      base_id: String(row.base_id),
      product_id: String(row.product_id),
      quantity: String(row.quantity_base),
      unit: row.product?.base_unit || '',
      unit_price: String(row.unit_price || ''),
      request_date: dayjs(row.request_date).format('YYYY-MM-DD')
    });
  };

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      setSubmitting(true);
      await api.requisitionUpdate(editing.id, {
        base_id: Number(form.base_id),
        product_id: Number(form.product_id),
        quantity: Number(form.quantity),
        unit: form.unit || undefined,
        unit_price: form.unit_price ? Number(form.unit_price) : undefined,
        request_date: form.request_date || undefined
      });
      setEditing(null);
      await loadRequisitions();
      await loadInventory();
    } catch (e:any) {
      notify.showError(e?.message || '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 压缩图片到 <= 2MB，最长边 2000px
  const compressImage = (file: File, maxBytes = 2 * 1024 * 1024, maxDim = 2000): Promise<File> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) { reject(new Error('只支持图片文件')); return; }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img as any;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.round(width * scale); height = Math.round(height * scale);
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d'); if (!ctx) { URL.revokeObjectURL(url); reject(new Error('压缩失败')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const qualities = [0.92, 0.85, 0.8, 0.7, 0.6];
        (function next(i:number){
          canvas.toBlob((blob)=>{
            if (!blob) { URL.revokeObjectURL(url); reject(new Error('压缩失败')); return; }
            if (blob.size <= maxBytes || i === qualities.length - 1) {
              const out = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
              URL.revokeObjectURL(url); resolve(out);
            } else { next(i+1); }
          }, 'image/jpeg', qualities[i]);
        })(0);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('读取图片失败')); };
      img.src = url;
    });
  };

  const openReceipt = (r: MaterialRequisition) => { setReceiptReq(r); setUploadErr(''); setReceiptOpen(true); };
  const handleUploadReceipt = async (file: File) => {
    if (!receiptReq) return;
    try { setUploadingReceipt(true); setUploadErr(''); const cf = await compressImage(file); const resp = await api.uploadRequisitionReceipt({ requisition_id: receiptReq.id!, date: dayjs(receiptReq.request_date).format('YYYY-MM-DD'), file: cf }); const newPath = resp.path; setRequisitions(prev => prev.map(it => it.id === receiptReq.id ? { ...it, receipt_path: newPath } : it)); setReceiptReq(prev => prev ? { ...prev, receipt_path: newPath } as any : prev); notify.showSuccess('票据已上传'); }
    catch(e:any){ setUploadErr(e?.message || '上传失败'); notify.showError(e?.message || '上传失败'); }
    finally { setUploadingReceipt(false); }
  };

  const handleDelete = async (id: number) => {
    try { await api.requisitionDelete(id); notify.showSuccess('删除成功'); await loadRequisitions(); await loadInventory(); }
    catch(e:any){ notify.showError(e?.message || '删除失败'); }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h6">库存管理</Typography>

      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
          <TextField size="small" label="搜索商品" value={q} onChange={e => setQ(e.target.value)} />
          <Button variant="contained" onClick={loadInventory} disabled={loading}>查询</Button>
        </Stack>
        <Table size="small" sx={{ mt: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>商品名称</TableCell>
              <TableCell>商品规格</TableCell>
              <TableCell>商品单位</TableCell>
              <TableCell align="right">单价</TableCell>
              <TableCell>币种</TableCell>
              <TableCell align="right">库存数量</TableCell>
              <TableCell>供应商</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventory.map((row, idx) => (
              <TableRow key={idx} hover>
                <TableCell>{row.product_name}</TableCell>
                <TableCell>{row.product_spec}</TableCell>
                <TableCell>{row.product_unit}</TableCell>
                <TableCell align="right">{row.unit_price?.toFixed(2)}</TableCell>
                <TableCell>{String(row.currency || 'CNY').toUpperCase()}</TableCell>
                <TableCell align="right">{row.stock_quantity}</TableCell>
                <TableCell>{row.supplier || '-'}</TableCell>
              </TableRow>
            ))}
            {inventory.length === 0 && !loading && (
              <TableRow><TableCell colSpan={7} align="center">暂无数据</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1">物资申领</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
          <TextField select label="基地" size="small" sx={{ minWidth: 160 }} value={form.base_id} onChange={e => setForm({ ...form, base_id: e.target.value })}>
            {bases.map(b => (<MenuItem key={b.id} value={String(b.id)}>{b.name}</MenuItem>))}
          </TextField>
          <TextField select label="商品" size="small" sx={{ minWidth: 220 }} value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value, unit_price: '' })}>
            {products.map(p => (<MenuItem key={p.id} value={String(p.id)}>{p.name}</MenuItem>))}
          </TextField>
          <TextField label="数量" size="small" type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="requisition-unit-label">单位</InputLabel>
            <Select
              labelId="requisition-unit-label"
              label="单位"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: String(e.target.value) })}
            >
              {unitOptions.map(opt => (
                <MenuItem key={opt.unit} value={opt.unit}>{opt.unit}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="单价" size="small" type="number" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} placeholder={String(selectedProduct?.unit_price || '')} />
          <TextField label="日期" size="small" type="date" value={form.request_date} onChange={e => setForm({ ...form, request_date: e.target.value })} InputLabelProps={{ shrink: true }} />
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>提交</Button>
        </Stack>
        {/* 本次申领总额展示 */}
        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
          本次申领总额：{(() => {
            const q = Number(form.quantity || '0');
            const p = Number(form.unit_price || '0');
            if (!isFinite(q) || !isFinite(p) || q <= 0 || p <= 0) return '-';
            return (q * p).toFixed(2);
          })()}
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1">申领记录</Typography>
        <Table size="small" sx={{ mt: 1 }}>
          <TableHead>
            <TableRow>
              <TableCell>基地</TableCell>
              <TableCell>商品名称</TableCell>
              <TableCell>商品规格</TableCell>
              <TableCell align="right">单价</TableCell>
              <TableCell align="right">申领数量</TableCell>
              <TableCell align="right">总额</TableCell>
              <TableCell>币种</TableCell>
              <TableCell>日期</TableCell>
              <TableCell>申领人</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requisitions.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.base?.name || r.base_id}</TableCell>
                <TableCell>{r.product_name}</TableCell>
                <TableCell>{r.product?.spec || ''}</TableCell>
                <TableCell align="right">{r.unit_price?.toFixed(2)}</TableCell>
                <TableCell align="right">{r.quantity_base}</TableCell>
                <TableCell align="right">{r.total_amount?.toFixed(2)}</TableCell>
                <TableCell>{String(r.currency || 'CNY').toUpperCase()}</TableCell>
                <TableCell>{dayjs(r.request_date).format('YYYY-MM-DD')}</TableCell>
                <TableCell>{r.requester?.name || '-'}</TableCell>
                <TableCell>
                  <Tooltip title="查看票据">
                    <IconButton size="small" onClick={()=> openReceipt(r)}>
                      <ReceiptIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="编辑">
                    <IconButton size="small" onClick={()=>handleEditOpen(r)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="删除">
                    <IconButton size="small" color="error" onClick={()=>handleDelete(r.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {requisitions.length === 0 && (
              <TableRow><TableCell colSpan={10} align="center">暂无申领记录</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* 票据查看/上传 */}
      <Dialog open={receiptOpen} onClose={()=> setReceiptOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>查看票据</DialogTitle>
        <DialogContent>
          {(receiptReq as any)?.receipt_path ? (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:1 }}>
                <OpenInNewIcon fontSize="small" />
                <a href={`${API_URL}${(receiptReq as any).receipt_path}`} target="_blank" rel="noreferrer">在新窗口打开</a>
              </Box>
              <Box sx={{ border:'1px solid', borderColor:'divider', borderRadius:1, overflow:'hidden' }}>
                <img alt="票据" src={`${API_URL}${(receiptReq as any).receipt_path}`} style={{ width:'100%', display:'block' }} />
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>暂无票据</Typography>
          )}
          {uploadErr && <Alert severity="error" sx={{ mb: 1 }}>{uploadErr}</Alert>}
          <Box sx={{ display:'flex', gap:1, flexWrap:'wrap' }}>
            <Button variant="outlined" startIcon={<UploadIcon />} component="label" disabled={uploadingReceipt}>
              {(receiptReq as any)?.receipt_path ? '更换票据' : '上传票据'}
              <input type="file" accept="image/*" hidden onChange={(e)=>{ const f=e.target.files?.[0]; e.currentTarget.value=''; if(!f) return; if(!f.type.startsWith('image/')) { setUploadErr('只支持图片格式'); return; } setEditBlob(f); setEditOpen(true); }} />
            </Button>
            {cameraSupported && (
              <Button variant="outlined" startIcon={<CameraIcon />} disabled={uploadingReceipt} onClick={()=> setCameraOpen(true)}>
                拍照上传
              </Button>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setReceiptOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 相机拍照（即时上传） */}
      <CameraCaptureDialog
        open={cameraOpen}
        onClose={()=> setCameraOpen(false)}
        instant
        onCapture={async (blob)=>{ setEditBlob(blob); setEditOpen(true); }}
      />

      {/* 图片编辑 */}
      <ImageEditDialog
        open={editOpen}
        file={editBlob}
        onClose={()=> setEditOpen(false)}
        onDone={async (blob)=>{ const file = new File([blob], `receipt_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' }); await handleUploadReceipt(file); }}
      />

      {/* 编辑弹窗 */}
      <Dialog open={!!editing} onClose={()=>setEditing(null)} maxWidth="md" fullWidth>
        <DialogTitle>编辑物资申领</DialogTitle>
        <DialogContent>
          <Stack direction={{ xs:'column', sm:'row' }} spacing={2} sx={{ mt:1 }}>
            <TextField select label="基地" size="small" sx={{ minWidth: 160 }} value={form.base_id} onChange={e=>setForm({ ...form, base_id:e.target.value })}>
              {bases.map(b => (<MenuItem key={b.id} value={String(b.id)}>{b.name}</MenuItem>))}
            </TextField>
            <TextField select label="商品" size="small" sx={{ minWidth: 220 }} value={form.product_id} onChange={e=>setForm({ ...form, product_id:e.target.value })}>
              {products.map(p => (<MenuItem key={p.id} value={String(p.id)}>{p.name}</MenuItem>))}
            </TextField>
            <TextField label="数量" size="small" type="number" value={form.quantity} onChange={e=>setForm({ ...form, quantity:e.target.value })} />
            <TextField label="单位(可选)" size="small" value={form.unit} onChange={e=>setForm({ ...form, unit:e.target.value })} />
            <TextField label="单价(可选)" size="small" type="number" value={form.unit_price} onChange={e=>setForm({ ...form, unit_price:e.target.value })} />
            <TextField label="日期" size="small" type="date" value={form.request_date} onChange={e=>setForm({ ...form, request_date:e.target.value })} InputLabelProps={{ shrink: true }} />
            <Button variant="contained" onClick={handleUpdate} disabled={submitting}>保存</Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
};

export default InventoryManagementView;
