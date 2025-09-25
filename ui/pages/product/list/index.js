const req = require('../../../utils/request');
const { makeFabStyle } = require('../../../utils/theme');
Page({
  data: { items: [], loading: true, formOpen:false, form:{ name:'', base_unit:'', spec:'', unit_price:'', supplier_id:'' }, suppliers:[], supplierNames:[], supplierIndex:0, saving:false, fabStyle:'' },
  async onShow(){
    this.setData({ loading: true, fabStyle: makeFabStyle(getApp().globalData.themeColor) });
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
        supplierName: (p.supplier && p.supplier.name) ? p.supplier.name : ''
      }));
      const suppliers = slist || [];
      const supplierNames = suppliers.map(s=>s.name);
      this.setData({ items, suppliers, supplierNames });
    }catch(e){ wx.showToast({ title:'加载失败', icon:'none' }); }
    finally{ this.setData({ loading:false }); }
  },
  async onPullDownRefresh(){ try{ await this.onShow(); } finally{ wx.stopPullDownRefresh(); } },
  openCreate(){ this.setData({ formOpen:true, form:{ name:'', base_unit:'', spec:'', unit_price:'', supplier_id:'' }, supplierIndex:0 }); },
  closeForm(){ this.setData({ formOpen:false }); },
  iName(e){ this.setData({ 'form.name': e.detail.value }); },
  iUnit(e){ this.setData({ 'form.base_unit': e.detail.value }); },
  iSpec(e){ this.setData({ 'form.spec': e.detail.value }); },
  iPrice(e){ this.setData({ 'form.unit_price': e.detail.value }); },
  onSupplier(e){ const i=Number(e.detail.value); const s=this.data.suppliers[i]; this.setData({ supplierIndex:i, 'form.supplier_id': (s && s.id) ? s.id : '' }); },
  async save(){
    if(!this.data.form.name){ wx.showToast({ title:'请输入名称', icon:'none' }); return; }
    this.setData({ saving:true });
    try{
      const payload = Object.assign({}, this.data.form);
      if(payload.unit_price==='') delete payload.unit_price;
      if(payload.supplier_id==='') delete payload.supplier_id;
      if(this.data.form.id){ await req.put('/api/product/update?id='+this.data.form.id, payload); }
      else { await req.post('/api/product/create', payload); }
      this.setData({ formOpen:false });
      await this.onShow();
      wx.showToast({ title:'已保存', icon:'success' });
    }catch(e){ wx.showToast({ title:'保存失败', icon:'none' }); }
    finally{ this.setData({ saving:false }); }
  },
  onEdit(e){ const id = e.currentTarget.dataset.id; const cur = this.data.items.find(x=>x.id===id); if(!cur) return; const idx = Math.max(0, this.data.supplierNames.indexOf(cur.supplierName||'')); this.setData({ formOpen:true, form: { id:cur.id, name:cur.name, base_unit:cur.base_unit, spec:cur.spec, unit_price:cur.unit_price, supplier_id: (this.data.suppliers[idx] && this.data.suppliers[idx].id) || '' }, supplierIndex: idx }); },
  onDelete(e){ const id=e.currentTarget.dataset.id; wx.showModal({ title:'确认删除', content:'删除后不可恢复', confirmText:'删除', success: async (r)=>{ if(r.confirm){ try{ await req.del('/api/product/delete?id='+id); await this.onShow(); wx.showToast({ title:'已删除' }); }catch(err){ wx.showToast({ title:'删除失败', icon:'none' }); } } } }); }
});
