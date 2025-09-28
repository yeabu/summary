import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
  MenuItem,
  Alert,
  Divider,
  Autocomplete,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { Purchase, PurchaseItem, Base } from '@/api/AppDtos';
import { ProductApi } from '@/api/ProductApi';
import { ApiClient } from '@/api/ApiClient';
import useAuthStore from '@/auth/AuthStore';
import { SupplierApi, Supplier } from '@/api/SupplierApi';
import { PurchaseSuggestApi, ProductSuggestion } from '@/api/PurchaseSuggestApi';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '@/config';

// 从后端加载全量基地，替代本地静态列表

interface PurchaseFormProps {
  initial?: Purchase;
  onSubmit: (data: Purchase) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

const PurchaseForm: React.FC<PurchaseFormProps> = ({
  initial,
  onSubmit,
  onCancel,
  submitting = false
}) => {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';
  const userBase = user?.base || '';
  
  // 辅助函数：获取基地名称
  const getBaseName = (base: Base | undefined): string => {
    if (!base) return '';
    return base.name || '';
  };

  const [formData, setFormData] = useState<Purchase>({
    supplier: '',
    order_number: '',
    purchase_date: dayjs().format('YYYY-MM-DD'),
    total_amount: 0,
    receiver: '',
    base: isAdmin ? undefined : (initial?.base || { name: userBase } as Base), // 管理员默认不选；基地代理使用自己的基地
    notes: '',
    items: [
      {
        product_name: '',
        quantity: 1,
        unit_price: 0,
        amount: 0
      }
    ]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');
  const [baseOptions, setBaseOptions] = useState<Base[]>([]);
  const [basesLoading, setBasesLoading] = useState(false);
  const [supplierOptions, setSupplierOptions] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [productOptions, setProductOptions] = useState<ProductSuggestion[]>([]);
  const [unitOptionsByIndex, setUnitOptionsByIndex] = useState<Record<number, string[]>>({});
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  // 移除“管理规格”功能，不再维护本地规格弹窗状态
  const navigate = useNavigate();

  // 辅助：根据商品名称+供应商，补全单价与单位（在选择或失焦时调用）
  const fillPriceAndUnits = async (index: number, name: string, productId?: number) => {
    const supplierId = selectedSupplier?.id;
    if (!name || !supplierId) return;
    try {
      const api = new ProductApi();
      const res = await api.listProducts({ name, supplier_id: supplierId, limit: 1 });
      const rec = res.records && res.records.length ? res.records[0] : null;
      if (rec) {
        // 先尝试读取显式采购参数（优先于建议价与商品基准单价）
        try {
          const pp = await api.getPurchaseParam(productId ?? rec.id);
          if (pp) {
            // 使用采购参数优先设置单位与单价
            setUnitOptionsByIndex(prev => ({ ...prev, [index]: [pp.unit] }));
            if (!(formData.items[index] as any).unit) {
              updateItem(index, 'unit' as any, pp.unit);
            }
            updateItem(index, 'unit_price', pp.purchase_price);
          }
        } catch {}
        // 拉取规格作为单位选项
        try {
          const token = await (await import('@/utils/authToken')).getValidAccessTokenOrRefresh();
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const res2 = await fetch(`${API_URL}/api/product/unit-specs?product_id=${productId ?? rec.id}`, { headers });
          if (res2.ok) {
            const specs = await res2.json() as Array<{ unit: string; kind?: string; is_default?: boolean }>;
            let units = Array.from(new Set(specs.map(s => s.unit))).filter(Boolean);
            // 选择默认单位优先级：purchase+default > any purchase > any default > first > base_unit
            let pick: string | undefined;
            const by = (pred: (s:any)=>boolean) => specs.find(pred)?.unit;
            pick = by(s => (s.kind === 'purchase') && !!s.is_default);
            if (!pick) pick = by(s => s.kind === 'purchase');
            if (!pick) pick = by(s => !!s.is_default);
            if (!pick) pick = units[0];
            if ((!units || units.length === 0) && rec.base_unit) {
              units = [rec.base_unit];
              pick = rec.base_unit;
            }
            setUnitOptionsByIndex(prev => ({ ...prev, [index]: units }));
            if (pick && !(formData.items[index] as any).unit) {
              updateItem(index, 'unit' as any, pick);
            }
          }
        } catch {}
      }
    } catch (e) {
      // 忽略静默失败
    }
  };

  // 只有在选了供应商且选了基地后，才允许选择商品
  const canChooseProduct = !!selectedSupplier?.id && !!getBaseName(formData.base).trim();

  // 当切换供应商或基地时，清空当前明细的商品选择与单位选项，避免脏数据
  useEffect(() => {
    setFormData(fd => ({
      ...fd,
      items: fd.items.map(it => ({ ...it, product_name: '', unit: '', unit_price: 0, amount: 0 }))
    }));
    setUnitOptionsByIndex({});
  }, [selectedSupplier?.id, (formData.base as any)?.id]);

  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        // 优先用常用供应商建议；若失败则fallback到全部供应商前15
        const suggestApi = new PurchaseSuggestApi();
        const supplierApi = new SupplierApi();
        try {
          const hot = await suggestApi.supplierSuggestions(15);
          setSupplierOptions(hot.map(h => ({ id: h.id, name: h.name, created_at: '', updated_at: '' } as any)));
        } catch {
          const all = await supplierApi.getSupplierList({ page: 1, limit: 15 });
          setSupplierOptions(all.records);
        }
      } catch (e) {
        console.warn('加载供应商建议失败', e);
      }
    };
    loadSuggestions();
  }, []);

  // 当是“编辑”模式时，根据初始供应商名称预选中供应商，触发商品建议加载
  useEffect(() => {
    const ensureSelectedSupplier = async () => {
      if (selectedSupplier || !formData.supplier || !formData.supplier.trim()) return;
      // 先在已加载的options中查找
      const found = supplierOptions.find(s => s.name === formData.supplier);
      if (found) {
        setSelectedSupplier(found);
        return;
      }
      // 回退：按名称请求一次列表
      try {
        const api = new SupplierApi();
        const res = await api.getSupplierList({ page: 1, limit: 15, name: formData.supplier });
        if (res.records && res.records.length > 0) {
          setSelectedSupplier(res.records[0]);
        }
      } catch (e) {
        console.warn('按名称加载供应商失败', e);
      }
    };
    ensureSelectedSupplier();
  }, [supplierOptions, formData.supplier, selectedSupplier]);

  // 选择供应商后加载该供应商常用商品，并合并商品库中的商品
  useEffect(() => {
    const loadProducts = async () => {
      if (!selectedSupplier?.id) { setProductOptions([]); return; }
      try {
        const suggestApi = new PurchaseSuggestApi();
        const productApi = new ProductApi();
        const [suggestList, productList] = await Promise.all([
          suggestApi.productSuggestions(selectedSupplier.id, 50).catch(() => [] as ProductSuggestion[]),
          productApi.listProducts({ supplier_id: selectedSupplier.id, limit: 500 }).catch(() => ({ records: [] as any[], total: 0 })),
        ]);
        const safeSuggestList: ProductSuggestion[] = Array.isArray(suggestList) ? suggestList : [];
        const safeProductRecords: any[] = productList && Array.isArray((productList as any).records) ? (productList as any).records : [];
        // 将 productList 映射为与建议相同的结构，便于统一使用
        const mappedFromProducts: ProductSuggestion[] = safeProductRecords.map((p: any) => ({
          product_id: p.id,
          product_name: p.name,
          avg_price: typeof p.unit_price === 'number' ? p.unit_price : 0,
          times: 0,
          last_date: '',
        }));
        // 合并去重（按名称）
        const map = new Map<string, ProductSuggestion>();
        [...safeSuggestList, ...mappedFromProducts].forEach(it => {
          if (!map.has(it.product_name)) map.set(it.product_name, it);
        });
        setProductOptions(Array.from(map.values()));
      } catch (e) {
        console.warn('加载商品建议失败', e);
        setProductOptions([]);
      }
    };
    loadProducts();
  }, [selectedSupplier?.id]);

  useEffect(() => {
    // 加载全量基地（管理员选择下拉使用，支持滚动）
    const loadBases = async () => {
      try {
        setBasesLoading(true);
        const api = new ApiClient();
        const list = await api.baseList();
        setBaseOptions(list);
      } catch (e) {
        console.warn('加载基地列表失败', e);
        setBaseOptions([]);
      } finally {
        setBasesLoading(false);
      }
    };
    loadBases();

    if (initial) {
      // 处理供应商字段，如果它是对象则提取名称
      let supplierValue = initial.supplier || '';
      if (typeof initial.supplier === 'object' && initial.supplier !== null) {
        supplierValue = (initial.supplier as any).name || (initial.supplier as any).toString();
      }
      
      setFormData({
        ...initial,
        supplier: supplierValue,
        base: initial.base || (isAdmin ? undefined : ({ name: userBase } as Base)), // 确保 base 字段正确设置
        // 更新记录时默认带入当前日期（可修改）
        purchase_date: dayjs().format('YYYY-MM-DD'),
        items: initial.items?.length > 0 ? initial.items : [{
          product_name: '',
          quantity: 1,
          unit_price: 0,
          amount: 0
        }]
      });
    }
  }, [initial, isAdmin, userBase]);

  // 更新采购项
  const updateItem = (index: number, field: keyof PurchaseItem, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      const current = { ...newItems[index], [field]: value } as PurchaseItem;
      // 自动计算金额
      if (field === 'quantity' || field === 'unit_price') {
        current.amount = (current.quantity || 0) * (current.unit_price || 0);
      }
      newItems[index] = current;
      const totalAmount = newItems.reduce((sum, it) => sum + (it.amount || 0), 0);
      return { ...prev, items: newItems, total_amount: totalAmount } as any;
    });
  };

  // 添加新的采购项
  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          product_name: '',
          unit: '',
          quantity: 1,
          unit_price: 0,
          amount: 0
        }
      ]
    });
  };

  // 删除采购项
  const removeItem = (index: number) => {
    if (formData.items.length === 1) return; // 至少保留一项
    
    const newItems = formData.items.filter((_, i) => i !== index);
    const totalAmount = newItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    setFormData({
      ...formData,
      items: newItems,
      total_amount: totalAmount
    });
  };

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    console.log('[PurchaseForm] validateForm() input:', {
      supplier: selectedSupplier,
      order_number: formData.order_number,
      base: formData.base,
      receiver: formData.receiver,
      items: formData.items,
    });
    if (!selectedSupplier?.id) {
      setSupplierDialogOpen(true);
      return false;
    }

    if (!formData.order_number.trim()) {
      newErrors.order_number = '订单号不能为空';
    }

    if (!formData.purchase_date) {
      newErrors.purchase_date = '采购日期不能为空';
    }

    if (!formData.receiver.trim()) {
      newErrors.receiver = '收货人不能为空';
    }

    if (!getBaseName(formData.base).trim()) {
      newErrors.base = '所属基地不能为空';
    }

    // 验证采购项
    formData.items.forEach((item, index) => {
      const name = (item.product_name || '').trim();
      if (!name) {
        newErrors[`item_${index}_product_name`] = '商品名称不能为空';
      }
      if (item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = '数量必须大于0';
      }
      if (item.unit_price <= 0) {
        newErrors[`item_${index}_unit_price`] = '单价必须大于0';
      }
    });

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      console.warn('[PurchaseForm] validation errors:', newErrors);
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 清除之前的错误
    setSubmitError('');
    setErrors({});

    // 强制提交前同步正在编辑的输入（如 Autocomplete 仍在焦点中）
    (document.activeElement as HTMLElement)?.blur?.();
    // 从输入元素兜底读取商品名称，构造用于校验和提交的临时items
    const effectiveItems = (formData.items || []).map((it, i) => {
      const el = document.getElementById(`product-name-${i}`) as HTMLInputElement | null;
      const name = (el?.value || it.product_name || '').trim();
      return {
        ...it,
        product_name: name,
      } as PurchaseItem;
    });

    // 本地校验（避免依赖异步状态更新）
    const localErrors: Record<string, string> = {};
    console.log('[PurchaseForm] validateForm() input:', {
      supplier: selectedSupplier,
      order_number: formData.order_number,
      base: formData.base,
      receiver: formData.receiver,
      items: effectiveItems,
    });
    if (!selectedSupplier?.id) {
      setSupplierDialogOpen(true);
      return;
    }
    if (!formData.order_number.trim()) {
      localErrors.order_number = '订单号不能为空';
    }
    if (!formData.purchase_date) {
      localErrors.purchase_date = '采购日期不能为空';
    }
    if (!formData.receiver.trim()) {
      localErrors.receiver = '收货人不能为空';
    }
    if (!getBaseName(formData.base).trim()) {
      localErrors.base = '所属基地不能为空';
    }
    const allowedNames = new Set(productOptions.map(p => p.product_name));
    effectiveItems.forEach((item, index) => {
      const name = (item.product_name || '').trim();
      if (!name) {
        localErrors[`item_${index}_product_name`] = '商品名称不能为空';
      }
      if (name && !allowedNames.has(name)) {
        localErrors[`item_${index}_product_name`] = '请从供应商的商品清单下拉选择';
      }
      if (item.quantity <= 0) {
        localErrors[`item_${index}_quantity`] = '数量必须大于0';
      }
      if (item.unit_price <= 0) {
        localErrors[`item_${index}_unit_price`] = '单价必须大于0';
      }
    });
    setErrors(localErrors);
    if (Object.keys(localErrors).length > 0) {
      console.warn('[PurchaseForm] validation errors:', localErrors);
      return;
    }

    try {
      // 在提交前确保base_id字段正确设置
      // 再次稳妥地根据明细计算合计
      const items = effectiveItems.map(it => ({
        ...it,
        amount: Number(((it.quantity || 0) * (it.unit_price || 0)).toFixed(2))
      }));
      const total = items.reduce((s, it) => s + (it.amount || 0), 0);

      const submitData: any = {
        ...formData,
        items,
        total_amount: Number(total.toFixed(2)),
        base_id: formData.base?.id || 0,  // 添加base_id字段
        supplier_id: selectedSupplier?.id || undefined
      };
      
      console.log('[PurchaseForm] submitting payload:', submitData);
      await onSubmit(submitData as Purchase);
    } catch (error) {
      console.error('[PurchaseForm] submit error:', error);
      const errorMessage = error instanceof Error ? error.message : '提交失败，请重试';
      setSubmitError(errorMessage);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {initial?.id ? '编辑采购记录' : '新增采购记录'}
      </Typography>

      {Object.keys(errors).length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          请检查表单中的错误信息
        </Alert>
      )}

      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* 基本信息 */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            基本信息
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <Autocomplete
            options={supplierOptions}
            getOptionLabel={(o) => (typeof o === 'string' ? o : (o as Supplier)?.name || '')}
            isOptionEqualToValue={(option, value) => {
              const oid = (option as Supplier)?.id;
              const vid = (value as Supplier)?.id;
              return !!oid && !!vid && oid === vid;
            }}
            value={selectedSupplier}
            onChange={(_, val) => {
              setSelectedSupplier(val as Supplier | null);
              setFormData({ ...formData, supplier: (val as Supplier | null)?.name || '' });
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="供应商（常用推荐）"
                error={!!errors.supplier}
                helperText={errors.supplier || '从下拉列表选择。如不存在，请先在供应商管理中添加'}
                required
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="订单号"
            value={formData.order_number}
            onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
            error={!!errors.order_number}
            helperText={errors.order_number}
            required
          />
        </Grid>

        {/* 基地选择：管理员可选择，基地代理只显示 */}
        <Grid item xs={12} md={6}>
          {isAdmin ? (
            <TextField
              fullWidth
              select
              label="所属基地"
              value={formData.base?.id || ''}
              onChange={(e) => {
                const id = Number(e.target.value);
                const sel = baseOptions.find(b => b.id === id);
                setFormData({ ...formData, base: sel });
              }}
              error={!!errors.base}
              helperText={errors.base || '请选择采购记录所属的基地'}
              id="base-select"
              SelectProps={{
                MenuProps: {
                  PaperProps: { style: { maxHeight: 320, width: 300 } }
                }
              }}
              required
            >
              {baseOptions.map(b => (
                <MenuItem key={b.id} value={b.id}>
                  {b.name}{b.code ? `（${b.code}）` : ''}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              fullWidth
              label="所属基地"
              value={userBase}
              disabled
              helperText="基地代理只能为自己的基地添加采购记录"
            />
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="date"
            label="采购日期"
            value={formData.purchase_date}
            onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
            error={!!errors.purchase_date}
            helperText={errors.purchase_date}
            InputLabelProps={{ shrink: true }}
            id="purchase-date"
            required
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="收货人"
            value={formData.receiver}
            onChange={(e) => setFormData({ ...formData, receiver: e.target.value })}
            error={!!errors.receiver}
            helperText={errors.receiver}
            id="receiver"
            required
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="备注"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            id="notes"
            placeholder="可填写其他相关信息..."
          />
        </Grid>

        {/* 采购明细 */}
        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">
              采购明细
            </Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={addItem}
              variant="outlined"
              size="small"
              disabled={!canChooseProduct}
            >
              添加商品
            </Button>
          </Box>
        </Grid>

        {formData.items.map((item, index) => (
          <Grid item xs={12} key={index}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    商品 #{index + 1}
                  </Typography>
                  {formData.items.length > 1 && (
                    <IconButton
                      onClick={() => removeItem(index)}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Autocomplete
                      freeSolo={false}
                      selectOnFocus
                      clearOnBlur
                      handleHomeEndKeys
                      blurOnSelect
                      options={(
                        () => {
                          const names = Array.from(new Set(productOptions.map(p => p.product_name)));
                          if (item.product_name && !names.includes(item.product_name)) names.unshift(item.product_name);
                          return names;
                        }
                      )()}
                      value={(item.product_name as any) || null}
                      isOptionEqualToValue={(option, value) => option === value}
                      disabled={!canChooseProduct}
                      noOptionsText={!selectedSupplier ? '请先选择供应商' : (!getBaseName(formData.base).trim() ? '请先选择所属基地' : '该供应商未绑定任何商品，请到“商品管理”将商品关联到该供应商后再试。')}
                      onChange={async (_, val) => {
                        const name = (val as string) || '';
                        updateItem(index, 'product_name', name);
                        const ps = productOptions.find(p => p.product_name === name);
                        await fillPriceAndUnits(index, name, ps?.product_id);
                      }}
                      onInputChange={(_, newInput) => {
                        // 禁止自由输入，强制从下拉选择
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="商品名称"
                          error={!!errors[`item_${index}_product_name`]}
                          helperText={
                            errors[`item_${index}_product_name`] 
                              || (!selectedSupplier ? '请先选择供应商' 
                                  : (!getBaseName(formData.base).trim() ? '请先选择所属基地' : '从下拉列表选择供应商的商品，自动带出单位与单价'))
                          }
                          required
                          // 确保把 id 绑定到真实的 input 上，而不是容器
                          inputProps={{
                            ...params.inputProps,
                            id: `product-name-${index}`,
                          }}
                          onBlur={undefined}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <Autocomplete
                      freeSolo
                      options={(
                        () => {
                          const units = Array.from(new Set(unitOptionsByIndex[index] || []));
                          const u = (item as any).unit as string | undefined;
                          if (u && !units.includes(u)) units.unshift(u);
                          return units;
                        }
                      )()}
                      value={((item as any).unit as any) || null}
                      isOptionEqualToValue={(option, value) => option === value}
                      onInputChange={(_, v) => updateItem(index, 'unit' as any, v)}
                      onChange={(_, v) => updateItem(index, 'unit' as any, (v as string) || '')}
                      renderInput={(params) => (
                        <TextField {...params} fullWidth label="单位" placeholder="箱/袋/吨..." id={`unit-${index}`} disabled={!item.product_name} />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      type="number"
                      label="数量"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                      onFocus={(e) => (e.target as HTMLInputElement).select()}
                      error={!!errors[`item_${index}_quantity`]}
                      helperText={errors[`item_${index}_quantity`]}
                      inputProps={{ min: 0, step: 1 }}
                      id={`quantity-${index}`}
                      required
                      disabled={!item.product_name}
                      />
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <Tooltip title="建议价已自动带出；可按需调整本次采购单价">
                      <TextField
                        fullWidth
                        type="number"
                        label="单价"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                        onFocus={(e) => (e.target as HTMLInputElement).select()}
                        inputProps={{ min: 0, step: 0.01 }}
                        id={`unit-price-${index}`}
                        required
                      />
                    </Tooltip>
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      label="小计"
                      value={item.amount.toFixed(2)}
                      disabled
                      InputProps={{
                        startAdornment: '¥'
                      }}
                      id={`amount-${index}`}
                    />
                  </Grid>
                  
                  {/* 管理规格入口已移除 */}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* 总计 */}
        <Grid item xs={12}>
          <Box sx={{ textAlign: 'right', mt: 2 }}>
            <Typography variant="h6" color="primary">
              总金额: ¥{formData.total_amount.toFixed(2)}
            </Typography>
          </Box>
        </Grid>

        {/* 操作按钮 */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
            <Button onClick={onCancel} disabled={submitting}>
              取消
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
            >
              {submitting ? '提交中...' : (initial?.id ? '更新' : '创建')}
            </Button>
          </Box>
        </Grid>
      </Grid>
      {/* 管理规格弹窗已移除 */}
      {/* 供应商缺失提示 */}
      <Dialog open={supplierDialogOpen} onClose={() => setSupplierDialogOpen(false)}>
        <DialogTitle>请先添加供应商</DialogTitle>
        <DialogContent>
          当前未选择有效的供应商，请先在“供应商管理”中添加后再选择。
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupplierDialogOpen(false)}>知道了</Button>
          <Button onClick={() => navigate('/supplier/management')} variant="contained">前往供应商管理</Button>
        </DialogActions>
      </Dialog>

      {/* 商品缺失提示 */}
      <Dialog open={productDialogOpen} onClose={() => setProductDialogOpen(false)}>
        <DialogTitle>请先添加商品并关联供应商</DialogTitle>
        <DialogContent>
          未找到该供应商的常用商品。请先在商品库中添加商品，并与供应商建立关联，然后再回来选择。
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProductDialogOpen(false)} variant="contained">我知道了</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PurchaseForm;
