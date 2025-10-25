const req = require('../../../utils/request');
const { getI18n } = require('../../../utils/i18n');
const theme = require('../../../utils/theme');
const { canAccess } = require('../../../utils/role');

const CURRENCY_CODES = ['CNY', 'LAK', 'THB'];
const CURRENCY_LABELS = ['CNY 人民币', 'LAK 老挝基普（金额按“万”显示）', 'THB 泰铢'];

function createEmptyDetailItem() {
  return {
    product_id: '',
    product_name: '',
    product_picker_index: 0,
    quantity: '',
    unit_price: '',
    unit: '',
    unit_label: '',
    amount: 0,
    amount_fmt: '0.00'
  };
}

function withProductPlaceholder(list) {
  const items = Array.isArray(list) ? list : [];
  return [{ id: '', name: '请选择商品', unit_price: '', base_unit: '', currency: 'CNY' }].concat(items);
}

function formatAmount(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0.00';
  return num.toFixed(2);
}

function normalizePurchaseParam(raw) {
  if(!raw || typeof raw !== 'object') return null;
  const factorNum = Number(raw.factor_to_base);
  const priceNum = Number(raw.purchase_price);
  return {
    unit: raw.unit || '',
    factor_to_base: Number.isFinite(factorNum) && factorNum > 0 ? factorNum : 1,
    purchase_price: Number.isFinite(priceNum) && priceNum >= 0 ? priceNum : 0,
    currency: (raw.currency || 'CNY').toUpperCase()
  };
}
Page({
  data: { 
    items: [], loading: true,
    formOpen:false,
    form:{ order_number:'', purchase_date:'', base_id:'', supplier_id:'', receiver:'', remark:'', currency:'CNY', items:[createEmptyDetailItem()] },
    bases:[], baseNames:[], basePickerNames:['请选择基地'], baseIndex:0,
    suppliers:[], supplierNames:[], supplierPickerNames:['请选择供应商'], supplierIndex:0,
    products:[], productsBySupplier:{}, productMap:{}, productPickerList: withProductPlaceholder([]), purchaseParams:{},
    errors: { order_number:'', purchase_date:'', base_id:'', supplier_id:'', items:[{}] },
    i18n: {}, themeColor: '#B4282D', fabStyle: '',
    currencyCodes: CURRENCY_CODES, currencyLabels: CURRENCY_LABELS, currencyIndex: 0,
    saving:false,
    showFallbackNav: false,
    deviceProfileClass: '',
    isTablet: false
  },
  async onShow() {
    const app = getApp();
    const role = (app && app.globalData && app.globalData.role) ? app.globalData.role : (wx.getStorageSync('role') || '');
    if (!canAccess(role, ['admin', 'warehouse_admin'])) {
      wx.showToast({ title: '无权限访问', icon: 'none' });
      setTimeout(() => { wx.switchTab({ url: '/pages/home/index' }); }, 600);
      this.setData({ loading: false });
      return;
    }
    const themeColor = theme.getThemeColor();
    const lang = app && app.globalData ? app.globalData.lang : 'zh';
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    const hasTabBar = !!(tabBar && typeof tabBar.refreshTabs === 'function');
    if (hasTabBar) {
      if (typeof tabBar.refreshTabs === 'function') { tabBar.refreshTabs(); }
      if (typeof tabBar.syncWithRoute === 'function') { tabBar.syncWithRoute(); }
      if (typeof tabBar.setThemeColor === 'function') { tabBar.setThemeColor(themeColor); }
    }
    const deviceProfileClass = app && app.globalData ? (app.globalData.deviceProfileClass || '') : (wx.getStorageSync('deviceProfileClass') || '');
    const isTablet = app && app.globalData ? !!app.globalData.isTablet : !!wx.getStorageSync('isTablet');
    this.setData({
      loading: true,
      i18n: getI18n(lang),
      themeColor,
      fabStyle: theme.makeFabStyle(themeColor),
      showFallbackNav: !hasTabBar,
      deviceProfileClass,
      isTablet
    });
    const fallbackNav = this.selectComponent('#fallback-nav');
    if (!hasTabBar && fallbackNav && typeof fallbackNav.setThemeColor === 'function') {
      fallbackNav.setThemeColor(themeColor);
    }
    wx.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#ffffff',
      animation: { duration: 0, timingFunc: 'linear' }
    });
    try {
      const [plist, blist, slist, prods] = await Promise.all([
        req.get('/api/purchase/list'),
        req.get('/api/base/list'),
        req.get('/api/supplier/all'),
        req.get('/api/product/list')
      ]);
      const raw = Array.isArray(plist) ? plist : plist.records || [];
      const items = raw.map(it => ({
        id: it.id,
        orderNumber: it.order_number || it.orderNumber,
        supplierName: (typeof it.supplier === 'object' && it.supplier) ? (it.supplier.name || '') : (it.supplier || ''),
        baseName: (it.base && it.base.name) ? it.base.name : '',
        totalAmount: Number(it.total_amount != null ? it.total_amount : it.totalAmount || 0),
        totalAmountFmt: formatAmount(it.total_amount != null ? it.total_amount : it.totalAmount),
        currency: String(it.currency || (it.base && it.base.currency) || 'CNY').toUpperCase(),
        purchaseDate: it.purchase_date || it.purchaseDate,
        receipt_path: it.receipt_path || ''
      }));
      const bases = Array.isArray(blist) ? blist : (blist.records || blist || []);
      const baseNames = bases.map(b=>b.name);
      const basePickerNames = ['请选择基地'].concat(baseNames);
      const suppliers = slist || [];
      const supplierNames = suppliers.map(s=>s.name);
      const supplierPickerNames = ['请选择供应商'].concat(supplierNames);
      const prodRaw = Array.isArray(prods) ? prods : (prods.records || []);
      const products = prodRaw.map(p=>({
        id: p.id,
        name: p.name,
        unit_price: Number(p.unit_price != null ? p.unit_price : 0),
        supplier_id: p.supplier_id || '',
        base_unit: p.base_unit || '',
        spec: p.spec || '',
        currency: String(p.currency || 'CNY').toUpperCase()
      }));
      const productMap = {};
      const productsBySupplier = { all: [] };
      products.forEach(p=>{
        const key = p.supplier_id ? String(p.supplier_id) : 'none';
        if(!productsBySupplier[key]) productsBySupplier[key] = [];
        productsBySupplier[key].push(p);
        productsBySupplier.all.push(p);
        productMap[p.id] = p;
      });
      this.setData({ items, bases, baseNames, basePickerNames, suppliers, supplierNames, supplierPickerNames, products, productsBySupplier, productMap, productPickerList: withProductPlaceholder([]), purchaseParams:{} });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  async onPullDownRefresh() { try { await this.onShow(); } finally { wx.stopPullDownRefresh(); } },
  openCreate(){ const today=new Date().toISOString().slice(0,10); this.setData({ formOpen:true, form:{ order_number:'', purchase_date:today, base_id:'', supplier_id:'', receiver:'', remark:'', currency:'CNY', items:[createEmptyDetailItem()] }, baseIndex:0, supplierIndex:0, currencyIndex:0, errors:{ order_number:'', purchase_date:'', base_id:'', supplier_id:'', items:[{}] }, productPickerList: withProductPlaceholder([]), purchaseParams:{} }); },
  closeForm(){ this.setData({ formOpen:false }); },
  iOrder(e){ this.setData({ 'form.order_number': e.detail.value }); this.validateForm(); },
  onDate(e){ this.setData({ 'form.purchase_date': e.detail.value }); this.validateForm(); },
  onBase(e){
    const i=Number(e.detail.value);
    if(i <= 0){ this.setData({ baseIndex:0, 'form.base_id':'', }); this.validateForm(); return; }
    const b=this.data.bases[i-1];
    this.setData({ baseIndex:i, 'form.base_id': (b && b.id) ? b.id : '' });
    this.validateForm();
  },
  onSupplier(e){
    const i=Number(e.detail.value);
    let supplierId = '';
    if(i > 0){ const s=this.data.suppliers[i-1]; supplierId = s && s.id ? s.id : ''; }
    const currentItems = this.data.form.items || [];
    let resetItems = currentItems.map(()=>createEmptyDetailItem());
    if(resetItems.length === 0){ resetItems = [createEmptyDetailItem()]; }
    const errs = this.data.errors || {};
    const newErrors = Object.assign({}, errs, { items: resetItems.map(()=>({})) });
    const defaultCurrency = this.data.currencyCodes && this.data.currencyCodes.length > 0 ? this.data.currencyCodes[0] : 'CNY';
    const defaultCurrencyIndex = this.data.currencyCodes.indexOf(defaultCurrency);
    const supplierKey = supplierId ? String(supplierId) : '';
    const productOptions = supplierKey ? withProductPlaceholder(this.getProductsForSupplier(supplierKey)) : withProductPlaceholder([]);
    this.setData({
      supplierIndex:i,
      'form.supplier_id': supplierId,
      'form.items': resetItems,
      errors: newErrors,
      productPickerList: productOptions,
      currencyIndex: defaultCurrencyIndex >= 0 ? defaultCurrencyIndex : this.data.currencyIndex,
      'form.currency': defaultCurrency,
      purchaseParams: {}
    });
    this.updateTotals();
    this.validateForm();
  },
  iReceiver(e){ this.setData({ 'form.receiver': e.detail.value }); },
  iRemark(e){ this.setData({ 'form.remark': e.detail.value }); },
  onCurrency(e){ const idx = Number(e.detail.value); const code = this.data.currencyCodes[idx] || 'CNY'; this.setData({ currencyIndex: idx, 'form.currency': code }); },
  addItem(){ const arr=this.data.form.items.slice(); arr.push(createEmptyDetailItem()); const errs=this.data.errors; if(!errs.items) errs.items=[]; errs.items.push({}); this.setData({ 'form.items': arr, errors: errs }); },
  removeItem(e){
    const i=Number(e.currentTarget.dataset.index);
    const arr=this.data.form.items.slice();
    arr.splice(i,1);
    if(arr.length===0) arr.push(createEmptyDetailItem());
    const nextErrors = Object.assign({}, this.data.errors || {});
    nextErrors.items = arr.map(()=>({}));
    this.setData({ 'form.items': arr, errors: nextErrors });
    this.updateTotals();
  },
  async ensurePurchaseParam(productId){
    const cache = this.data.purchaseParams || {};
    const key = String(productId);
    if(Object.prototype.hasOwnProperty.call(cache, key)){
      return cache[key];
    }
    let normalized = null;
    try{
      const resp = await req.get('/api/product/purchase-param?product_id=' + productId);
      let data = resp;
      if(typeof resp === 'string'){
        if(resp === 'null'){ data = null; }
        else {
          try{ data = JSON.parse(resp); }catch{ data = null; }
        }
      }
      normalized = normalizePurchaseParam(data);
    }catch(err){ normalized = null; }
    const nextCache = Object.assign({}, cache, { [key]: normalized });
    this.setData({ purchaseParams: nextCache });
    return normalized;
  },
  async onProductPick(e){
    const idx = Number(e.currentTarget.dataset.index);
    if(isNaN(idx) || idx < 0){ return; }
    const pickIndex = Number(e.detail.value);
    const arr = this.data.form.items.slice();
    if(!arr[idx]){ return; }
    const list = this.data.productPickerList || [];
    const selected = list[pickIndex];
    if(!selected || !selected.id){
      const previousQuantity = arr[idx].quantity;
      arr[idx] = createEmptyDetailItem();
      arr[idx].quantity = previousQuantity;
      arr[idx].product_picker_index = 0;
      this.setData({ 'form.items': arr });
      this.updateTotals();
      this.validateForm();
      return;
    }
    let purchaseParam = null;
    if(selected.id){
      purchaseParam = await this.ensurePurchaseParam(selected.id);
    }
    const priceSource = (purchaseParam && purchaseParam.purchase_price != null) ? purchaseParam.purchase_price : selected.unit_price;
    let price = Number(priceSource);
    if(!Number.isFinite(price) || price < 0){ price = 0; }
    const qty = Number(arr[idx].quantity) || 0;
    const amount = qty * price;
    arr[idx].product_id = selected.id;
    arr[idx].product_name = selected.name || '';
    arr[idx].product_picker_index = pickIndex;
    arr[idx].unit_price = price;
    const unitLabelRaw = purchaseParam && purchaseParam.unit ? purchaseParam.unit : (selected.base_unit || selected.spec || '');
    const unitLabel = unitLabelRaw || '';
    arr[idx].unit_label = unitLabel;
    arr[idx].unit = unitLabel;
    arr[idx].amount = amount;
    arr[idx].amount_fmt = (isFinite(amount) ? amount.toFixed(2) : '0.00');
    const updates = { 'form.items': arr };
    const currencySource = (purchaseParam && purchaseParam.currency) ? purchaseParam.currency : (selected.currency || 'CNY');
    if(currencySource){
      const upperCurrency = String(currencySource).toUpperCase();
      const currencyIdx = this.data.currencyCodes.indexOf(upperCurrency);
      updates['form.currency'] = upperCurrency;
      if(currencyIdx >= 0){ updates.currencyIndex = currencyIdx; }
    }
    this.setData(updates);
    this.updateTotals();
    this.validateForm();
  },
  iItemQty(e){ const i=Number(e.currentTarget.dataset.index); const arr=this.data.form.items.slice(); const qty=Number(e.detail.value); arr[i].quantity=qty; const amt = (qty||0) * (Number(arr[i].unit_price)||0); arr[i].amount = amt; arr[i].amount_fmt = (isFinite(amt) ? amt.toFixed(2) : '0.00'); this.setData({ 'form.items': arr }); this.updateTotals(); this.validateForm(); },
  iItemPrice(e){ const i=Number(e.currentTarget.dataset.index); const arr=this.data.form.items.slice(); const price=Number(e.detail.value); arr[i].unit_price=price; const qty=Number(arr[i].quantity)||0; const amt = qty * (price||0); arr[i].amount = amt; arr[i].amount_fmt = (isFinite(amt) ? amt.toFixed(2) : '0.00'); this.setData({ 'form.items': arr }); this.updateTotals(); this.validateForm(); },
  updateTotals(){ /* total retained for potential summary; no direct field update needed */ },
  getProductsForSupplier(supplierId){
    const map = this.data.productsBySupplier || {};
    if(supplierId){
      return map[String(supplierId)] || [];
    }
    return map.all || this.data.products || [];
  },
  validateForm(){
    const i18n = this.data.i18n || {};
    const f=this.data.form; const errs={ order_number:'', purchase_date:'', base_id:'', supplier_id:'', items:[] };
    if(!f.order_number) errs.order_number = i18n.required || '必填项不能为空';
    if(!f.purchase_date) errs.purchase_date = i18n.required || '必填项不能为空';
    if(!f.base_id) errs.base_id = i18n.required || '必填项不能为空';
    if(!f.supplier_id) errs.supplier_id = i18n.required || '必填项不能为空';
    (f.items||[]).forEach((it,idx)=>{
      const ei={};
      if(!it.product_name) ei.product_name = i18n.required || '必填项不能为空';
      if(!(Number(it.quantity)>0)) ei.quantity = i18n.invalidNumber || '请输入有效数字';
      if(!(Number(it.unit_price)>=0)) ei.unit_price = i18n.invalidNumber || '请输入有效数字';
      errs.items[idx]=ei;
    });
    this.setData({ errors: errs });
    return errs;
  },
  async save(){
    const f=this.data.form; const errs=this.validateForm();
    const hasError = errs.order_number || errs.purchase_date || errs.base_id || errs.supplier_id || (errs.items||[]).some(e=>e && (e.product_name||e.quantity||e.unit_price));
    if(hasError){ wx.showToast({ title:'请检查表单输入', icon:'none' }); return; }
    const items=f.items.map(it=>({
      product_name: it.product_name,
      quantity: Number(it.quantity)||0,
      unit_price: Number(it.unit_price)||0,
      unit: (it.unit && typeof it.unit === 'string') ? it.unit : (it.unit_label || ''),
      amount: (Number(it.quantity)||0)*(Number(it.unit_price)||0)
    }));
    const total = items.reduce((sum, it)=> sum + (it.amount || 0), 0);
    const payload=Object.assign({}, f, { items, total_amount: Number(total.toFixed(2)), currency: String(f.currency || 'CNY').toUpperCase() });
    this.setData({ saving:true });
    try{
      if(f.id){ await req.put('/api/purchase/update?id='+f.id, payload); }
      else { await req.post('/api/purchase/create', payload); }
      this.setData({ formOpen:false }); await this.onShow(); wx.showToast({ title:'已保存', icon:'success' });
    }catch(e){ wx.showToast({ title:'保存失败', icon:'none' }); }
    finally{ this.setData({ saving:false }); }
  },
  onEdit(e){
    const id=e.currentTarget.dataset.id;
    const cur=this.data.items.find(x=>x.id===id);
    if(!cur)return;
    const baseIdx = this.data.baseNames.indexOf(cur.baseName||'');
    const supplierIdx = this.data.supplierNames.indexOf(cur.supplierName||'');
    const currencyCode = cur.currency || 'CNY';
    const cidx = Math.max(0, this.data.currencyCodes.indexOf(currencyCode));
    const baseId = baseIdx >=0 ? (this.data.bases[baseIdx] && this.data.bases[baseIdx].id) : '';
    const supplier = supplierIdx >=0 ? this.data.suppliers[supplierIdx] : null;
    this.setData({
      formOpen:true,
      form:{ id:id, order_number:cur.orderNumber, purchase_date:cur.purchaseDate, base_id:baseId||'', supplier_id:(supplier && supplier.id) ? supplier.id : '', receiver:'', remark:cur.remark || '', currency: currencyCode, items:[createEmptyDetailItem()] },
      baseIndex: baseIdx >=0 ? baseIdx + 1 : 0,
      supplierIndex: supplierIdx >=0 ? supplierIdx + 1 : 0,
      currencyIndex:cidx,
      productPickerList: (supplier && supplier.id) ? withProductPlaceholder(this.getProductsForSupplier(String(supplier.id))) : withProductPlaceholder([]),
      purchaseParams: {}
    });
  },
  onDelete(e){ const id=e.currentTarget.dataset.id; wx.showModal({ title:'确认删除', content:'删除后不可恢复', confirmText:'删除', success: async (r)=>{ if(r.confirm){ try{ await req.del('/api/purchase/delete?id='+id); await this.onShow(); wx.showToast({ title:'已删除' }); }catch(err){ wx.showToast({ title:'删除失败', icon:'none' }); } } } }); }
  ,
  async onReceiptAction(e){
    const id = e.currentTarget.dataset.id;
    const item = this.data.items.find(x=>x.id===id);
    if(!item) return;
    const hasReceipt = !!item.receipt_path;
    const actions = hasReceipt ? ['查看票据','从相册上传','拍照上传'] : ['从相册上传','拍照上传'];
    try{
      const { tapIndex } = await wx.showActionSheet({ itemList: actions });
      if (hasReceipt && tapIndex === 0) {
        this.viewReceipt(item);
        return;
      }
      const offset = hasReceipt ? 1 : 0;
      const choice = tapIndex - offset;
      if (choice === 0) {
        await this.chooseAndUploadReceipt(item, 'album');
      } else if (choice === 1) {
        await this.chooseAndUploadReceipt(item, 'camera');
      }
    }catch(err){ /* canceled */ }
  },
  viewReceipt(item){
    if(!item.receipt_path){ wx.showToast({ title:'暂无票据', icon:'none' }); return; }
    const { apiBase } = require('../../../config');
    const url = apiBase + item.receipt_path;
    wx.previewImage({ urls:[url] });
  },
  async chooseAndUploadReceipt(item, source){
    try{
      const sourceType = source === 'camera' ? ['camera'] : ['album'];
      const choose = await wx.chooseImage({ count:1, sizeType:['compressed'], sourceType });
      const filePath = choose.tempFilePaths[0];
      wx.showLoading({ title:'上传中', mask:true });
      const resp = await req.upload('/api/purchase/upload-receipt', filePath, { purchase_id: item.id, date: (item.purchaseDate||'').slice(0,10) });
      wx.hideLoading();
      if(resp && resp.path){
        const items = this.data.items.map(it => it.id===item.id ? { ...it, receipt_path: resp.path } : it);
        this.setData({ items });
        wx.showToast({ title:'已上传', icon:'success' });
      } else {
        wx.showToast({ title:'上传失败', icon:'none' });
      }
    }catch(err){
      wx.hideLoading();
      wx.showToast({ title:'上传失败', icon:'none' });
    }
  }
});
