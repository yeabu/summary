const req = require('../../../utils/request');
const theme = require('../../../utils/theme');
const { canAccess } = require('../../../utils/role');

const CURRENCY_CODES = ['CNY', 'LAK', 'THB'];
const CURRENCY_LABELS = ['CNY 人民币', 'LAK 老挝基普（金额按“万”显示）', 'THB 泰铢'];

function formatAmount(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0.00';
  return num.toFixed(2);
}

function createEmptyPurchaseForm() {
  return {
    product_id: '',
    product_name: '',
    base_unit: '',
    unit: '',
    factor: '1',
    price: '',
    currency: 'CNY'
  };
}
Page({
  data: {
    items: [],
    loading: true,
    formOpen: false,
    form: { name:'', base_unit:'', spec:'', unit_price:'', currency:'CNY', supplier_id:'' },
    suppliers: [],
    supplierNames: [],
    supplierIndex: 0,
    currencyCodes: CURRENCY_CODES,
    currencyLabels: CURRENCY_LABELS,
    currencyIndex: 0,
    saving: false,
    fabStyle: '',
    themeColor: '#B4282D',
    purchaseFormOpen: false,
    purchaseForm: createEmptyPurchaseForm(),
    purchaseSaving: false,
    showFallbackNav: false,
    deviceProfileClass: '',
    isTablet: false
  },
  async onShow(){
    const app = typeof getApp === 'function' ? getApp() : null;
    const role = (app && app.globalData && app.globalData.role) ? app.globalData.role : (wx.getStorageSync('role') || '');
    if (!canAccess(role, ['admin', 'warehouse_admin'])) {
      wx.showToast({ title: '无权限访问', icon: 'none' });
      setTimeout(() => { wx.switchTab({ url: '/pages/home/index' }); }, 600);
      this.setData({ loading: false });
      return;
    }
    const themeColor = theme.getThemeColor();
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
      themeColor,
      fabStyle: theme.makeFabStyle(themeColor),
      showFallbackNav: !hasTabBar,
      deviceProfileClass,
      isTablet
    });
    wx.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#ffffff',
      animation: { duration: 0, timingFunc: 'linear' }
    });
    const fallbackNav = this.selectComponent('#fallback-nav');
    if (!hasTabBar && fallbackNav && typeof fallbackNav.setThemeColor === 'function') {
      fallbackNav.setThemeColor(themeColor);
    }
    try{
      const [plist, slist] = await Promise.all([
        req.get('/api/product/list'),
        req.get('/api/supplier/all')
      ]);
      const raw = Array.isArray(plist) ? plist : plist.records || [];
      const items = raw.map(p => ({
        id: p.id,
        name: p.name,
        spec: p.spec,
        base_unit: p.base_unit,
        unit_price: (p.unit_price != null ? p.unit_price : ''),
        unit_price_fmt: formatAmount(p.unit_price != null ? p.unit_price : 0),
        currency: String(p.currency || 'CNY').toUpperCase(),
        supplierName: (p.supplier && p.supplier.name) ? p.supplier.name : ''
      }));
      const suppliers = slist || [];
      const supplierNames = suppliers.map(s=>s.name);
      this.setData({ items, suppliers, supplierNames, themeColor });
    }catch(e){ wx.showToast({ title:'加载失败', icon:'none' }); }
    finally{ this.setData({ loading:false }); }
  },
  async onPullDownRefresh(){ try{ await this.onShow(); } finally{ wx.stopPullDownRefresh(); } },
  openCreate(){ this.setData({ formOpen:true, form:{ name:'', base_unit:'', spec:'', unit_price:'', currency:'CNY', supplier_id:'' }, supplierIndex:0, currencyIndex:0 }); },
  closeForm(){ this.setData({ formOpen:false }); },
  iName(e){ this.setData({ 'form.name': e.detail.value }); },
  iUnit(e){ this.setData({ 'form.base_unit': e.detail.value }); },
  iSpec(e){ this.setData({ 'form.spec': e.detail.value }); },
  iPrice(e){ this.setData({ 'form.unit_price': e.detail.value }); },
  onCurrency(e){ const idx = Number(e.detail.value); const code = this.data.currencyCodes[idx] || 'CNY'; this.setData({ currencyIndex: idx, 'form.currency': code }); },
  onSupplier(e){ const i=Number(e.detail.value); const s=this.data.suppliers[i]; this.setData({ supplierIndex:i, 'form.supplier_id': (s && s.id) ? s.id : '' }); },
  async save(){
    if(!this.data.form.name){ wx.showToast({ title:'请输入名称', icon:'none' }); return; }
    this.setData({ saving:true });
    try{
      const payload = Object.assign({}, this.data.form, { currency: String(this.data.form.currency || 'CNY').toUpperCase() });
      if(payload.unit_price === '') {
        delete payload.unit_price;
      } else if (payload.unit_price != null) {
        const priceNum = Number(payload.unit_price);
        if (Number.isFinite(priceNum)) {
          payload.unit_price = priceNum;
        } else {
          delete payload.unit_price;
        }
      }
      if(payload.supplier_id === '' || payload.supplier_id == null) {
        delete payload.supplier_id;
      } else {
        const sid = Number(payload.supplier_id);
        if (Number.isFinite(sid) && sid > 0) {
          payload.supplier_id = sid;
        } else {
          delete payload.supplier_id;
        }
      }
      if(this.data.form.id){ await req.put('/api/product/update?id='+this.data.form.id, payload); }
      else { await req.post('/api/product/create', payload); }
      this.setData({ formOpen:false });
      await this.onShow();
      wx.showToast({ title:'已保存', icon:'success' });
    }catch(e){ wx.showToast({ title:'保存失败', icon:'none' }); }
    finally{ this.setData({ saving:false }); }
  },
  onEdit(e){ const id = e.currentTarget.dataset.id; const cur = this.data.items.find(x=>x.id===id); if(!cur) return; const idx = Math.max(0, this.data.supplierNames.indexOf(cur.supplierName||'')); const currencyCode = cur.currency || 'CNY'; const cidx = Math.max(0, this.data.currencyCodes.indexOf(currencyCode)); this.setData({ formOpen:true, form: { id:cur.id, name:cur.name, base_unit:cur.base_unit, spec:cur.spec, unit_price:cur.unit_price, currency: currencyCode, supplier_id: (this.data.suppliers[idx] && this.data.suppliers[idx].id) || '' }, supplierIndex: idx, currencyIndex:cidx }); },
  onDelete(e){ const id=e.currentTarget.dataset.id; wx.showModal({ title:'确认删除', content:'删除后不可恢复', confirmText:'删除', success: async (r)=>{ if(r.confirm){ try{ await req.del('/api/product/delete?id='+id); await this.onShow(); wx.showToast({ title:'已删除' }); }catch(err){ wx.showToast({ title:'删除失败', icon:'none' }); } } } }); },
  async openPurchaseParam(e){
    const id = Number(e.currentTarget.dataset.id);
    const product = this.data.items.find(x => x.id === id);
    if(!product){ wx.showToast({ title:'未找到商品', icon:'none' }); return; }
    const form = createEmptyPurchaseForm();
    form.product_id = id;
    form.product_name = product.name || '';
    form.base_unit = product.base_unit || '';
    form.currency = product.currency || 'CNY';
    this.setData({ purchaseFormOpen:true, purchaseForm: form, purchaseSaving:false });
    try{
      const detail = await req.get('/api/product/purchase-param?product_id='+id);
      let info = detail;
      if(typeof detail === 'string'){
        if(detail === 'null'){ info = null; }
        else{
          try{ info = JSON.parse(detail); }catch{ info = null; }
        }
      }
      if(info && typeof info === 'object'){
        const next = Object.assign({}, form, {
          unit: info.unit || form.unit,
          factor: String(info.factor_to_base != null ? info.factor_to_base : form.factor),
          price: info.purchase_price != null ? String(info.purchase_price) : form.price,
          currency: info.currency || form.currency
        });
        this.setData({ purchaseForm: next });
      }
    }catch(err){ wx.showToast({ title:'采购参数加载失败', icon:'none' }); }
  },
  closePurchaseForm(){ this.setData({ purchaseFormOpen:false }); },
  iPurchaseUnit(e){ this.setData({ 'purchaseForm.unit': e.detail.value }); },
  iPurchaseFactor(e){ this.setData({ 'purchaseForm.factor': e.detail.value }); },
  iPurchasePrice(e){ this.setData({ 'purchaseForm.price': e.detail.value }); },
  async savePurchaseParam(){
    const form = this.data.purchaseForm || createEmptyPurchaseForm();
    if(!form.product_id){ wx.showToast({ title:'未选择商品', icon:'none' }); return; }
    const unit = (form.unit || '').trim();
    const factor = Number(form.factor);
    const price = Number(form.price);
    if(!unit){ wx.showToast({ title:'请输入采购单位', icon:'none' }); return; }
    if(!(Number.isFinite(factor) && factor > 0)){ wx.showToast({ title:'请填写有效换算系数', icon:'none' }); return; }
    if(!(Number.isFinite(price) && price > 0)){ wx.showToast({ title:'请填写有效采购单价', icon:'none' }); return; }
    this.setData({ purchaseSaving:true });
    try{
      await req.post('/api/product/purchase-param/upsert', {
        product_id: form.product_id,
        unit,
        factor_to_base: factor,
        purchase_price: price
      });
      wx.showToast({ title:'采购参数已保存', icon:'success' });
      this.setData({ purchaseFormOpen:false });
    }catch(err){ wx.showToast({ title:'保存失败', icon:'none' }); }
    finally{ this.setData({ purchaseSaving:false }); }
  }
});
