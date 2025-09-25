const req = require('../../../utils/request');
const { makeFabStyle } = require('../../../utils/theme');
Page({
  data: { items: [], loading: true, formOpen:false, form:{ name:'', status:'active' }, statusRange:['active','inactive'], statusIndex:0, saving:false, fabStyle:'' },
  async onShow(){
    this.setData({ loading:true, fabStyle: makeFabStyle(getApp().globalData.themeColor) });
    try{
      const items = await req.get('/api/expense-category/list');
      this.setData({ items: (Array.isArray(items) ? items : (items.records || [])) });
    }catch(e){ wx.showToast({ title:'加载失败', icon:'none' }); }
    finally{ this.setData({ loading:false }); }
  },
  async onPullDownRefresh(){ try{ await this.onShow(); } finally{ wx.stopPullDownRefresh(); } },
  openCreate(){ this.setData({ formOpen:true, form:{ name:'', status:'active' }, statusIndex:0 }); },
  closeForm(){ this.setData({ formOpen:false }); },
  iName(e){ this.setData({ 'form.name': e.detail.value }); },
  onStatus(e){ const i=Number(e.detail.value); this.setData({ statusIndex:i, 'form.status': this.data.statusRange[i] }); },
  async save(){
    if(!this.data.form.name){ wx.showToast({ title:'请输入名称', icon:'none' }); return; }
    this.setData({ saving:true });
    try{
      if(this.data.form.id){ await req.put('/api/expense-category/update?id='+this.data.form.id, this.data.form); }
      else { await req.post('/api/expense-category/create', this.data.form); }
      this.setData({ formOpen:false });
      await this.onShow();
      wx.showToast({ title:'已保存', icon:'success' });
    }catch(e){ wx.showToast({ title:'保存失败', icon:'none' }); }
    finally{ this.setData({ saving:false }); }
  },
  onEdit(e){
    const id = e.currentTarget.dataset.id; const cur = this.data.items.find(x=>x.id===id);
    if(!cur) return;
    const idx = this.data.statusRange.indexOf(cur.status||'active');
    this.setData({ formOpen:true, form: JSON.parse(JSON.stringify(cur)), statusIndex: idx>=0?idx:0 });
  },
  onDelete(e){
    const id = e.currentTarget.dataset.id;
    wx.showModal({ title:'确认删除', content:'删除后不可恢复', confirmText:'删除', success: async (r)=>{
      if(r.confirm){ try{ await req.del('/api/expense-category/delete?id='+id); await this.onShow(); wx.showToast({ title:'已删除' }); }catch(err){ wx.showToast({ title:'删除失败', icon:'none' }); } }
    }});
  }
});
