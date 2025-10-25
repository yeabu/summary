const req = require('../../../utils/request');
const theme = require('../../../utils/theme');
const { canAccess } = require('../../../utils/role');
const { apiBase } = require('../../../config');

const DEFAULT_CURRENCIES = ['CNY', 'LAK', 'USD', 'THB'];

function formatAmount(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0.00';
  return num.toFixed(2);
}

function formatDate(value) {
  if (!value) return '';
  if (typeof value === 'string' && value.length >= 10) return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function createEmptyForm() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: '',
    base_id: '',
    request_date: today
  };
}

function createEmptyItem() {
  return {
    product_id: '',
    productIndex: 0,
    quantity: '',
    unit: '',
    unit_price: '',
    unitOptions: [],
    unitPickerNames: ['请选择单位'],
    unitIndex: 0,
    currency: 'CNY',
    currencyIndex: 0,
    subtotal: 0,
    subtotalFmt: '0.00'
  };
}

Page({
  data: {
    loading: true,
    themeColor: theme.getThemeColor(),
    items: [],
    bases: [],
    basePickerNames: ['请选择基地'],
    baseIndex: 0,
    products: [],
    productPickerNames: ['请选择商品'],
    productMap: {},
    purchaseParamCache: {},
    unitSpecCache: {},
    formOpen: false,
    form: createEmptyForm(),
    formItems: [],
    formCurrency: 'CNY',
    formTotal: 0,
    formTotalFmt: '0.00',
    currencyOptions: DEFAULT_CURRENCIES,
    saving: false,
    fabStyle: ''
  },
  async onShow() {
    const app = typeof getApp === 'function' ? getApp() : null;
    const role = (app && app.globalData && app.globalData.role) ? app.globalData.role : (wx.getStorageSync('role') || '');
    if (!canAccess(role, ['admin', 'base_agent'])) {
      wx.showToast({ title: '无权限访问', icon: 'none' });
      setTimeout(() => { wx.switchTab({ url: '/pages/home/index' }); }, 600);
      return;
    }
    const themeColor = theme.getThemeColor();
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tabBar) {
      if (typeof tabBar.refreshTabs === 'function') { tabBar.refreshTabs(); }
      if (typeof tabBar.syncWithRoute === 'function') { tabBar.syncWithRoute(); }
      if (typeof tabBar.setThemeColor === 'function') { tabBar.setThemeColor(themeColor); }
    }
    this.setData({ themeColor, fabStyle: theme.makeFabStyle(themeColor) });
    await this.loadAll();
  },
  async loadAll() {
    this.setData({ loading: true });
    try {
      const [basesRes, productsRes, requisitionRes] = await Promise.all([
        req.get('/api/base/list'),
        req.get('/api/product/list'),
        req.get('/api/inventory/requisition/list')
      ]);
      const bases = Array.isArray(basesRes) ? basesRes : (basesRes.records || basesRes || []);
      const basePickerNames = ['请选择基地'].concat(bases.map(b => b.name || ''));
      const prodRaw = Array.isArray(productsRes) ? productsRes : (productsRes.records || []);
      const products = prodRaw.map(p => ({
        id: p.id,
        name: p.name,
        spec: p.spec || '',
        base_unit: p.base_unit || '',
        unit_price: Number(p.unit_price != null ? p.unit_price : 0),
        currency: String(p.currency || 'CNY').toUpperCase()
      }));
      const productPickerNames = ['请选择商品'].concat(products.map(p => p.name));
      const productMap = {};
      products.forEach(p => { productMap[p.id] = p; });
      const rawList = Array.isArray(requisitionRes) ? requisitionRes : [];
      const items = rawList.map(rec => ({
        id: rec.id,
        baseName: (rec.base && rec.base.name) ? rec.base.name : (rec.base_id || ''),
        productName: rec.product_name || (rec.product && rec.product.name) || '',
        spec: rec.product && rec.product.spec ? rec.product.spec : '',
        unitPrice: Number(rec.unit_price || 0),
        unitPriceFmt: formatAmount(rec.unit_price || 0),
        quantityBase: Number(rec.quantity_base || 0),
        totalAmount: Number(rec.total_amount || (rec.unit_price || 0) * (rec.quantity_base || 0)),
        totalAmountFmt: formatAmount(rec.total_amount || (rec.unit_price || 0) * (rec.quantity_base || 0)),
        currency: String(rec.currency || 'CNY').toUpperCase(),
        requestDate: formatDate(rec.request_date),
        requesterName: rec.requester && rec.requester.name ? rec.requester.name : '',
        receipt_path: rec.receipt_path || '',
        base_id: rec.base_id,
        product_id: rec.product_id,
        unit: rec.unit || ''
      }));
      this.setData({
        bases,
        basePickerNames,
        products,
        productPickerNames,
        productMap,
        items
      });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
      wx.stopPullDownRefresh();
    }
  },
  onPullDownRefresh() {
    this.loadAll();
  },
  openCreate() {
    const form = createEmptyForm();
    this.setData({
      formOpen: true,
      form,
      baseIndex: 0,
      formItems: [createEmptyItem()],
      formCurrency: 'CNY',
      formTotal: 0,
      formTotalFmt: '0.00'
    }, () => {
      this.updateFormTotals();
    });
  },
  closeForm() {
    this.setData({ formOpen: false });
  },
  onBaseChange(e) {
    const idx = Number(e.detail.value || 0);
    if (idx <= 0) {
      this.setData({ baseIndex: 0, 'form.base_id': '' });
      return;
    }
    const base = this.data.bases[idx - 1];
    this.setData({ baseIndex: idx, 'form.base_id': base ? base.id : '' });
  },
  async onItemProductChange(e) {
    const idx = Number(e.detail.value || 0);
    const itemIndex = Number(e.currentTarget.dataset.index);
    const items = this.data.formItems.slice();
    const item = items[itemIndex];
    if (!item) return;
    if (idx <= 0) {
    items[itemIndex] = Object.assign({}, item, {
      product_id: '',
      productIndex: 0,
      unit: '',
      unit_price: '',
      unitOptions: [],
      unitPickerNames: ['请选择单位'],
      unitIndex: 0,
      currency: 'CNY',
      currencyIndex: 0,
      subtotal: 0,
      subtotalFmt: '0.00'
    });
      this.setData({ formItems: items });
      this.updateFormTotals();
      return;
    }
    const product = this.data.products[idx - 1];
    if (!product) return;
    const currencyOptions = this.data.currencyOptions || DEFAULT_CURRENCIES;
    items[itemIndex] = Object.assign({}, item, {
      product_id: product.id,
      productIndex: idx,
      currency: product.currency || 'CNY',
      currencyIndex: Math.max(0, currencyOptions.indexOf(product.currency || 'CNY'))
    });
    this.setData({ formItems: items });
    await this.applyItemDefaults(itemIndex, product);
  },
  async applyItemDefaults(itemIndex, product) {
    if (!product || !product.id) return;
    const [unitOptionsRaw, purchaseParam] = await Promise.all([
      this.ensureUnitOptions(product.id, product),
      this.ensurePurchaseParam(product.id)
    ]);
    const collected = new Set(unitOptionsRaw || []);
    if (purchaseParam && purchaseParam.unit) collected.add(purchaseParam.unit);
    if (product.base_unit) collected.add(product.base_unit);
    const items = this.data.formItems.slice();
    const existingItem = items[itemIndex] || {};
    if (existingItem.unit) collected.add(existingItem.unit);
    const unitOptions = Array.from(collected).filter(Boolean);
    let unit = existingItem.unit || (purchaseParam && purchaseParam.unit ? purchaseParam.unit : (unitOptions[0] || product.base_unit || ''));
    const unitPrice = (purchaseParam && purchaseParam.purchase_price > 0)
      ? purchaseParam.purchase_price
      : (Number(product.unit_price) || 0);
    const currency = existingItem.currency || (purchaseParam && purchaseParam.currency ? purchaseParam.currency : (product.currency || 'CNY'));
    const pickerList = ['请选择单位'].concat(unitOptions);
    const idx = unit ? unitOptions.indexOf(unit) : -1;
    const unitIndex = idx >= 0 ? idx + 1 : 0;
    const item = items[itemIndex];
    if (!item) return;
    items[itemIndex] = Object.assign({}, item, {
      unitOptions,
      unitPickerNames: pickerList,
      unitIndex,
      unit,
      unit_price: unitPrice > 0 ? unitPrice : '',
      currency,
      currencyIndex: Math.max(0, this.data.currencyOptions.indexOf(currency))
    });
    this.setData({ formItems: items }, () => {
      this.updateItemSubtotal(itemIndex);
      this.updateFormTotals();
    });
  },
  async ensurePurchaseParam(productId) {
    const cache = this.data.purchaseParamCache || {};
    const key = String(productId);
    if (Object.prototype.hasOwnProperty.call(cache, key)) {
      return cache[key];
    }
    let result = null;
    try {
      const resp = await req.get('/api/product/purchase-param?product_id=' + productId);
      let data = resp;
      if (typeof resp === 'string') {
        if (resp === 'null') {
          data = null;
        } else {
          try { data = JSON.parse(resp); } catch (err) { data = null; }
        }
      }
      if (data && typeof data === 'object') {
        result = {
          unit: data.unit || '',
          factor_to_base: Number(data.factor_to_base) || 1,
          purchase_price: Number(data.purchase_price) || 0,
          currency: String(data.currency || 'CNY').toUpperCase()
        };
      }
    } catch (err) {
      result = null;
    }
    const nextCache = Object.assign({}, cache, { [key]: result });
    this.setData({ purchaseParamCache: nextCache });
    return result;
  },
  async ensureUnitOptions(productId, product) {
    const cache = this.data.unitSpecCache || {};
    const key = String(productId);
    if (!Object.prototype.hasOwnProperty.call(cache, key)) {
      try {
        const list = await req.get('/api/product/unit-specs?product_id=' + productId);
        const options = Array.isArray(list) ? list.map(item => item.unit).filter(Boolean) : [];
        const unique = Array.from(new Set(options));
        cache[key] = unique;
        this.setData({ unitSpecCache: Object.assign({}, cache) });
      } catch (err) {
        cache[key] = [];
        this.setData({ unitSpecCache: Object.assign({}, cache) });
      }
    }
    const baseUnit = product && product.base_unit ? product.base_unit : '';
    const specUnit = product && product.spec ? product.spec : '';
    const collected = new Set();
    if (baseUnit) collected.add(baseUnit);
    if (specUnit) collected.add(specUnit);
    const cached = (this.data.unitSpecCache || {})[key] || [];
    cached.forEach(u => { if (u) collected.add(u); });
    return Array.from(collected);
  },
  onItemUnitChange(e) {
    const idx = Number(e.detail.value || 0);
    const itemIndex = Number(e.currentTarget.dataset.index);
    const items = this.data.formItems.slice();
    const item = items[itemIndex];
    if (!item) return;
    if (idx <= 0) {
      items[itemIndex] = Object.assign({}, item, { unitIndex: 0, unit: '' });
    } else {
      const unit = item.unitPickerNames[idx] || '';
      items[itemIndex] = Object.assign({}, item, { unitIndex: idx, unit });
    }
    this.setData({ formItems: items });
  },
  onItemQuantityInput(e) {
    const itemIndex = Number(e.currentTarget.dataset.index);
    const value = e.detail.value;
    const items = this.data.formItems.slice();
    const item = items[itemIndex];
    if (!item) return;
    items[itemIndex] = Object.assign({}, item, { quantity: value });
    this.setData({ formItems: items }, () => {
      this.updateItemSubtotal(itemIndex);
      this.updateFormTotals();
    });
  },
  onItemPriceInput(e) {
    const itemIndex = Number(e.currentTarget.dataset.index);
    const value = e.detail.value;
    const items = this.data.formItems.slice();
    const item = items[itemIndex];
    if (!item) return;
    items[itemIndex] = Object.assign({}, item, { unit_price: value });
    this.setData({ formItems: items }, () => {
      this.updateItemSubtotal(itemIndex);
      this.updateFormTotals();
    });
  },
  onItemCurrencyChange(e) {
    const itemIndex = Number(e.currentTarget.dataset.index);
    const idx = Number(e.detail.value || 0);
    const items = this.data.formItems.slice();
    const item = items[itemIndex];
    if (!item) return;
    const currency = this.data.currencyOptions[idx] || item.currency || 'CNY';
    items[itemIndex] = Object.assign({}, item, {
      currencyIndex: idx,
      currency
    });
    this.setData({ formItems: items }, () => {
      this.updateItemSubtotal(itemIndex);
      this.updateFormTotals();
    });
  },
  onDateChange(e) {
    this.setData({ 'form.request_date': e.detail.value });
  },
  addItem() {
    const items = this.data.formItems.slice();
    items.push(createEmptyItem());
    this.setData({ formItems: items }, () => {
      this.updateFormTotals();
    });
  },
  removeItem(e) {
    const idx = Number(e.currentTarget.dataset.index);
    const items = this.data.formItems.slice();
    if (items.length <= 1) return;
    items.splice(idx, 1);
    this.setData({ formItems: items }, () => {
      this.updateFormTotals();
    });
  },
  updateItemSubtotal(index) {
    const items = this.data.formItems.slice();
    const item = items[index];
    if (!item) return;
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    const subtotal = qty * price;
    items[index] = Object.assign({}, item, {
      subtotal,
      subtotalFmt: formatAmount(subtotal || 0)
    });
    this.setData({ formItems: items });
  },
  updateFormTotals() {
    const items = this.data.formItems || [];
    let total = 0;
    let currency = '';
    items.forEach((item) => {
      const subtotal = Number(item.subtotal);
      const derived = Number.isFinite(subtotal) ? subtotal : (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
      total += derived;
      if (!currency) {
        currency = item.currency || 'CNY';
      } else if (currency !== item.currency) {
        currency = '多币种';
      }
    });
    this.setData({
      formTotal: total,
      formTotalFmt: formatAmount(total || 0),
      formCurrency: currency || 'CNY'
    });
  },
  validateForm() {
    const form = this.data.form;
    if (!form.base_id) { wx.showToast({ title: '请选择基地', icon: 'none' }); return false; }
    if (!form.request_date) { wx.showToast({ title: '请选择日期', icon: 'none' }); return false; }
    const items = this.data.formItems || [];
    if (!items.length) { wx.showToast({ title: '请添加申领明细', icon: 'none' }); return false; }
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (!item.product_id) { wx.showToast({ title: `明细${i + 1}请选择商品`, icon: 'none' }); return false; }
      const qty = Number(item.quantity);
      if (!(Number.isFinite(qty) && qty > 0)) { wx.showToast({ title: `明细${i + 1}数量无效`, icon: 'none' }); return false; }
      const price = Number(item.unit_price);
      if (!(Number.isFinite(price) && price > 0)) { wx.showToast({ title: `明细${i + 1}单价无效`, icon: 'none' }); return false; }
    }
    return true;
  },
  async save() {
    if (!this.validateForm()) return;
    const form = this.data.form;
    const items = this.data.formItems || [];
    this.setData({ saving: true });
    try {
      if (form.id) {
        const item = items[0];
        const payload = {
          base_id: Number(form.base_id),
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
          unit: item.unit ? String(item.unit) : undefined,
          unit_price: Number(item.unit_price),
          currency: item.currency || 'CNY',
          request_date: form.request_date || undefined
        };
        await req.put('/api/inventory/requisition/update?id=' + form.id, payload);
        wx.showToast({ title: '已更新', icon: 'success' });
      } else {
        for (let i = 0; i < items.length; i += 1) {
          const item = items[i];
          const payload = {
            base_id: Number(form.base_id),
            product_id: Number(item.product_id),
            quantity: Number(item.quantity),
            unit: item.unit ? String(item.unit) : undefined,
            unit_price: Number(item.unit_price),
            currency: item.currency || 'CNY',
            request_date: form.request_date || undefined
          };
          // eslint-disable-next-line no-await-in-loop
          await req.post('/api/inventory/requisition/create', payload);
        }
        wx.showToast({ title: '已创建', icon: 'success' });
      }
      this.setData({ formOpen: false });
      await this.loadAll();
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },
  async onEdit(e) {
    const id = Number(e.currentTarget.dataset.id);
    if (!id) return;
    const item = this.data.items.find(x => x.id === id);
    if (!item) return;
    const baseIndex = this.data.bases.findIndex(b => b.id === item.base_id) + 1;
    const productIndex = this.data.products.findIndex(p => p.id === item.product_id) + 1;
    const product = this.data.products.find(p => p.id === item.product_id) || null;
    const form = Object.assign(createEmptyForm(), {
      id: item.id,
      base_id: item.base_id,
      request_date: item.requestDate || createEmptyForm().request_date
    });
    const entry = createEmptyItem();
    entry.product_id = item.product_id;
    entry.productIndex = productIndex > 0 ? productIndex : 0;
    entry.quantity = String(item.quantityBase || '');
    entry.unit_price = item.unitPrice;
    entry.unit = item.unit || '';
    entry.currency = item.currency || 'CNY';
    entry.currencyIndex = Math.max(0, this.data.currencyOptions.indexOf(entry.currency));
    entry.subtotal = Number(item.totalAmount) || 0;
    entry.subtotalFmt = item.totalAmountFmt || formatAmount(entry.subtotal);
    this.setData({
      formOpen: true,
      form,
      baseIndex: baseIndex > 0 ? baseIndex : 0,
      formItems: [entry],
      formCurrency: entry.currency,
      formTotal: Number(item.totalAmount) || 0,
      formTotalFmt: item.totalAmountFmt || formatAmount(item.totalAmount)
    });
    if (product) {
      await this.applyItemDefaults(0, product);
    }
    this.updateFormTotals();
  },
  onDelete(e) {
    const id = Number(e.currentTarget.dataset.id);
    if (!id) return;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      confirmText: '删除',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await req.del('/api/inventory/requisition/delete?id=' + id);
          wx.showToast({ title: '已删除' });
          await this.loadAll();
        } catch (err) {
          wx.showToast({ title: '删除失败', icon: 'none' });
        }
      }
    });
  },
  onReceiptAction(e) {
    const id = Number(e.currentTarget.dataset.id);
    const item = this.data.items.find(x => x.id === id);
    if (!item) return;
    const hasReceipt = !!item.receipt_path;
    const actions = hasReceipt ? ['查看票据', '从相册上传', '拍照上传'] : ['从相册上传', '拍照上传'];
    wx.showActionSheet({ itemList: actions }).then(async ({ tapIndex }) => {
      if (hasReceipt && tapIndex === 0) {
        this.viewReceipt(item);
        return;
      }
      const choice = hasReceipt ? tapIndex - 1 : tapIndex;
      if (choice === 0) {
        await this.chooseReceipt(item, 'album');
      } else if (choice === 1) {
        await this.chooseReceipt(item, 'camera');
      }
    }).catch(() => {});
  },
  viewReceipt(item) {
    if (!item.receipt_path) {
      wx.showToast({ title: '暂无票据', icon: 'none' });
      return;
    }
    wx.previewImage({ urls: [apiBase + item.receipt_path] });
  },
  async chooseReceipt(item, source) {
    try {
      const sourceType = source === 'camera' ? ['camera'] : ['album'];
      const choose = await wx.chooseImage({ count: 1, sizeType: ['compressed'], sourceType });
      const filePath = choose.tempFilePaths[0];
      wx.showLoading({ title: '上传中', mask: true });
      const resp = await req.upload('/api/inventory/requisition/upload-receipt', filePath, {
        requisition_id: item.id,
        date: item.requestDate || item.request_date || formatDate(new Date())
      });
      wx.hideLoading();
      if (resp && resp.path) {
        const updated = this.data.items.map(row => row.id === item.id ? Object.assign({}, row, { receipt_path: resp.path }) : row);
        this.setData({ items: updated });
        wx.showToast({ title: '已上传', icon: 'success' });
      } else {
        wx.showToast({ title: '上传失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '上传失败', icon: 'none' });
    }
  }
});
