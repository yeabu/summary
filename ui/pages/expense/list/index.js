const req = require('../../../utils/request');
const { makeFabStyle } = require('../../../utils/theme');

Page({
  data: { items: [], loading: true, formOpen:false, form:{ date:'', base_id:'', category_id:'', amount:'', detail:'' }, bases:[], baseNames:[], baseIndex:0, categories:[], categoryNames:[], categoryIndex:0, saving:false, fabStyle:'' },
  async onShow() {
    this.setData({ loading: true, fabStyle: makeFabStyle(getApp().globalData.themeColor) });
    try {
      const [elist, blist, clist] = await Promise.all([
        req.get('/api/expense/list'),
        req.get('/api/base/list'),
        req.get('/api/expense-category/list')
      ]);
      const raw = Array.isArray(elist) ? elist : elist.records || [];
      const items = raw.map(it => ({
        id: it.id,
        baseName: (it.base && it.base.name) ? it.base.name : '',
        categoryName: (typeof it.category === 'string') ? it.category : ((it.category && it.category.name) ? it.category.name : ''),
        amount: it.amount,
        date: it.date,
        receipt_path: it.receipt_path || ''
      }));
      const bases = Array.isArray(blist) ? blist : (blist.records || blist || []);
      const baseNames = bases.map(b=>b.name);
      const categories = Array.isArray(clist) ? clist : (clist.records || clist || []);
      const categoryNames = categories.map(c=>c.name);
      this.setData({ items, bases, baseNames, categories, categoryNames });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  async onPullDownRefresh() { try { await this.onShow(); } finally { wx.stopPullDownRefresh(); } },
  openCreate(){ const today=new Date().toISOString().slice(0,10); this.setData({ formOpen:true, form:{ date:today, base_id:'', category_id:'', amount:'', detail:'' }, baseIndex:0, categoryIndex:0 }); },
  closeForm(){ this.setData({ formOpen:false }); },
  onDate(e){ this.setData({ 'form.date': e.detail.value }); },
  onBase(e){ const i=Number(e.detail.value); const b=this.data.bases[i]; this.setData({ baseIndex:i, 'form.base_id': (b && b.id) ? b.id : '' }); },
  onCategory(e){ const i=Number(e.detail.value); const c=this.data.categories[i]; this.setData({ categoryIndex:i, 'form.category_id': (c && c.id) ? c.id : '' }); },
  iAmount(e){ this.setData({ 'form.amount': Number(e.detail.value) }); },
  iDetail(e){ this.setData({ 'form.detail': e.detail.value }); },
  async save(){
    const f=this.data.form;
    if(!f.date || !f.base_id || !f.category_id || !f.amount){ wx.showToast({ title:'请填写必填项', icon:'none' }); return; }
    this.setData({ saving:true });
    try{
      if(f.id){ await req.put('/api/expense/update?id='+f.id, f); }
      else { await req.post('/api/expense/create', f); }
      this.setData({ formOpen:false }); await this.onShow(); wx.showToast({ title:'已保存', icon:'success' });
    }catch(e){ wx.showToast({ title:'保存失败', icon:'none' }); }
    finally{ this.setData({ saving:false }); }
  },
  onEdit(e){ const id=e.currentTarget.dataset.id; const cur=this.data.items.find(x=>x.id===id); if(!cur)return; const bi=Math.max(0,this.data.baseNames.indexOf(cur.baseName||'')); const ci=Math.max(0,this.data.categoryNames.indexOf(cur.categoryName||'')); this.setData({ formOpen:true, form:{ id:id, date:cur.date, base_id:(this.data.bases[bi]&&this.data.bases[bi].id)||'', category_id:(this.data.categories[ci]&&this.data.categories[ci].id)||'', amount:cur.amount, detail:'' }, baseIndex:bi, categoryIndex:ci }); },
  onDelete(e){ const id=e.currentTarget.dataset.id; wx.showModal({ title:'确认删除', content:'删除后不可恢复', confirmText:'删除', success: async (r)=>{ if(r.confirm){ try{ await req.del('/api/expense/delete?id='+id); await this.onShow(); wx.showToast({ title:'已删除' }); }catch(err){ wx.showToast({ title:'删除失败', icon:'none' }); } } } }); }
  ,
  async onReceiptAction(e){
    const id = e.currentTarget.dataset.id;
    const item = this.data.items.find(x=>x.id===id);
    if(!item) return;
    const hasReceipt = !!item.receipt_path;
    const actions = hasReceipt ? ['查看票据','上传/更换'] : ['上传票据'];
    try{
      const { tapIndex } = await wx.showActionSheet({ itemList: actions });
      if (hasReceipt && tapIndex === 0) {
        this.viewReceipt(item);
      } else {
        await this.chooseAndUploadReceipt(item);
      }
    }catch(err){ /* canceled */ }
  },
  viewReceipt(item){
    if(!item.receipt_path){ wx.showToast({ title:'暂无票据', icon:'none' }); return; }
    const { apiBase } = require('../../../config');
    const url = apiBase + item.receipt_path;
    wx.previewImage({ urls:[url] });
  },
  async chooseAndUploadReceipt(item){
    try{
      const choose = await wx.chooseImage({ count:1, sizeType:['compressed'], sourceType:['album','camera'] });
      const filePath = choose.tempFilePaths[0];
      wx.showLoading({ title:'上传中', mask:true });
      const resp = await req.upload('/api/expense/upload-receipt', filePath, { expense_id: item.id, date: (item.date||'').slice(0,10) });
      wx.hideLoading();
      if(resp && resp.path){
        // 更新当前项的票据路径并刷新列表项显示
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
