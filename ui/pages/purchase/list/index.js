const req = require('../../../utils/request');
const { getI18n } = require('../../../utils/i18n');
const { makeFabStyle } = require('../../../utils/theme');
Page({
  data: { 
    items: [], loading: true,
    formOpen:false,
    form:{ order_number:'', purchase_date:'', base_id:'', supplier_id:'', receiver:'', total_amount:'', items:[{ product_name:'', quantity:'', unit_price:'', amount:0, amount_fmt:'0.00' }] },
    bases:[], baseNames:[], baseIndex:0,
    suppliers:[], supplierNames:[], supplierIndex:0,
    products:[], productNames:[], productMap:{},
    activeSuggestIndex: -1, suggestList: [], _blurTimer: null,
    errors: { order_number:'', purchase_date:'', base_id:'', supplier_id:'', items:[{}] },
    i18n: {}, themeColor: '#B4282D', fabStyle: '',
    saving:false 
  },
  async onShow() {
    const themeColor = getApp().globalData.themeColor;
    this.setData({ loading: true, i18n: getI18n(getApp().globalData.lang), themeColor, fabStyle: makeFabStyle(themeColor) });
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
        totalAmount: it.total_amount != null ? it.total_amount : it.totalAmount,
        purchaseDate: it.purchase_date || it.purchaseDate
      }));
      const bases = Array.isArray(blist) ? blist : (blist.records || blist || []);
      const baseNames = bases.map(b=>b.name);
      const suppliers = slist || [];
      const supplierNames = suppliers.map(s=>s.name);
      const prodRaw = Array.isArray(prods) ? prods : (prods.records || []);
      const products = prodRaw.map(p=>({ id:p.id, name:p.name, unit_price:(p.unit_price!=null?p.unit_price:0) }));
      const productNames = products.map(p=>p.name);
      const productMap = {};
      products.forEach(p=>{ productMap[p.name]=p; });
      this.setData({ items, bases, baseNames, suppliers, supplierNames, products, productNames, productMap });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  async onPullDownRefresh() { try { await this.onShow(); } finally { wx.stopPullDownRefresh(); } },
  openCreate(){ const today=new Date().toISOString().slice(0,10); this.setData({ formOpen:true, form:{ order_number:'', purchase_date:today, base_id:'', supplier_id:'', receiver:'', total_amount:'', items:[{ product_name:'', quantity:'', unit_price:'', amount:0, amount_fmt:'0.00' }] }, baseIndex:0, supplierIndex:0, errors:{ order_number:'', purchase_date:'', base_id:'', supplier_id:'', items:[{}] } }); },
  closeForm(){ this.setData({ formOpen:false }); },
  iOrder(e){ this.setData({ 'form.order_number': e.detail.value }); this.validateForm(); },
  onDate(e){ this.setData({ 'form.purchase_date': e.detail.value }); this.validateForm(); },
  onBase(e){ const i=Number(e.detail.value); const b=this.data.bases[i]; this.setData({ baseIndex:i, 'form.base_id': (b && b.id) ? b.id : '' }); this.validateForm(); },
  onSupplier(e){ const i=Number(e.detail.value); const s=this.data.suppliers[i]; this.setData({ supplierIndex:i, 'form.supplier_id': (s && s.id) ? s.id : '' }); this.validateForm(); },
  iReceiver(e){ this.setData({ 'form.receiver': e.detail.value }); },
  iTotal(e){ this.setData({ 'form.total_amount': Number(e.detail.value) }); },
  addItem(){ const arr=this.data.form.items.slice(); arr.push({ product_name:'', quantity:'', unit_price:'', amount:0, amount_fmt:'0.00' }); const errs=this.data.errors; if(!errs.items) errs.items=[]; errs.items.push({}); this.setData({ 'form.items': arr, errors: errs }); },
  removeItem(e){ const i=Number(e.currentTarget.dataset.index); const arr=this.data.form.items.slice(); arr.splice(i,1); if(arr.length===0) arr.push({ product_name:'', quantity:'', unit_price:'', amount:0 }); const errs=this.data.errors; if(errs.items && errs.items.length>i){ errs.items.splice(i,1); } this.setData({ 'form.items': arr, errors: errs }); this.updateTotals(); },
  iItemName(e){ const i=Number(e.currentTarget.dataset.index); const val=e.detail.value; const arr=this.data.form.items.slice(); arr[i].product_name=val; this.setData({ 'form.items': arr });
    // suggestions
    const list = val ? this.data.products.filter(p=>p.name.indexOf(val)>=0).slice(0,8) : [];
    this.setData({ activeSuggestIndex: i, suggestList: list });
    this.validateForm();
  },
  onNameFocus(e){ const i=Number(e.currentTarget.dataset.index||0); this.setData({ activeSuggestIndex: i }); },
  onNameBlur(){ if(this.data._blurTimer) clearTimeout(this.data._blurTimer); const t=setTimeout(()=>{ this.setData({ activeSuggestIndex: -1, suggestList: [] }); }, 150); this.setData({ _blurTimer: t }); },
  chooseProduct(e){ const name=e.currentTarget.dataset.name; const price=Number(e.currentTarget.dataset.price||0); const i=Number(e.currentTarget.dataset.index); const arr=this.data.form.items.slice(); arr[i].product_name=name; if(!arr[i].unit_price) arr[i].unit_price=price; // default price if empty
    // recompute amount
    const qty=Number(arr[i].quantity)||0; const amt = qty * (Number(arr[i].unit_price)||0); arr[i].amount = amt; arr[i].amount_fmt = (isFinite(amt) ? amt.toFixed(2) : '0.00');
    this.setData({ 'form.items': arr, activeSuggestIndex: -1, suggestList: [] }); this.updateTotals(); this.validateForm(); },
  iItemQty(e){ const i=Number(e.currentTarget.dataset.index); const arr=this.data.form.items.slice(); const qty=Number(e.detail.value); arr[i].quantity=qty; const amt = (qty||0) * (Number(arr[i].unit_price)||0); arr[i].amount = amt; arr[i].amount_fmt = (isFinite(amt) ? amt.toFixed(2) : '0.00'); this.setData({ 'form.items': arr }); this.updateTotals(); this.validateForm(); },
  iItemPrice(e){ const i=Number(e.currentTarget.dataset.index); const arr=this.data.form.items.slice(); const price=Number(e.detail.value); arr[i].unit_price=price; const qty=Number(arr[i].quantity)||0; const amt = qty * (price||0); arr[i].amount = amt; arr[i].amount_fmt = (isFinite(amt) ? amt.toFixed(2) : '0.00'); this.setData({ 'form.items': arr }); this.updateTotals(); this.validateForm(); },
  updateTotals(){ const arr=this.data.form.items||[]; const total = arr.reduce((s,it)=> s + (Number(it.amount)||0), 0); this.setData({ 'form.total_amount': Number(total.toFixed(2)) }); },
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
    const items=f.items.map(it=>({ product_name:it.product_name, quantity:Number(it.quantity)||0, unit_price:Number(it.unit_price)||0, amount: (Number(it.quantity)||0)*(Number(it.unit_price)||0) }));
    const total=items.reduce((s,it)=>s+(it.amount||0),0);
    const payload=Object.assign({}, f, { items, total_amount: f.total_amount||total });
    this.setData({ saving:true });
    try{
      if(f.id){ await req.put('/api/purchase/update?id='+f.id, payload); }
      else { await req.post('/api/purchase/create', payload); }
      this.setData({ formOpen:false }); await this.onShow(); wx.showToast({ title:'已保存', icon:'success' });
    }catch(e){ wx.showToast({ title:'保存失败', icon:'none' }); }
    finally{ this.setData({ saving:false }); }
  },
  onEdit(e){ const id=e.currentTarget.dataset.id; const cur=this.data.items.find(x=>x.id===id); if(!cur)return; const bi=Math.max(0,this.data.baseNames.indexOf(cur.baseName||'')); const si=Math.max(0,this.data.supplierNames.indexOf(cur.supplierName||'')); this.setData({ formOpen:true, form:{ id:id, order_number:cur.orderNumber, purchase_date:cur.purchaseDate, base_id:(this.data.bases[bi]&&this.data.bases[bi].id)||'', supplier_id:(this.data.suppliers[si]&&this.data.suppliers[si].id)||'', receiver:'', total_amount:cur.totalAmount, items:[{ product_name:'', quantity:'', unit_price:'', amount:0 }] }, baseIndex:bi, supplierIndex:si }); },
  onDelete(e){ const id=e.currentTarget.dataset.id; wx.showModal({ title:'确认删除', content:'删除后不可恢复', confirmText:'删除', success: async (r)=>{ if(r.confirm){ try{ await req.del('/api/purchase/delete?id='+id); await this.onShow(); wx.showToast({ title:'已删除' }); }catch(err){ wx.showToast({ title:'删除失败', icon:'none' }); } } } }); }
});
