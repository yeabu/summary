const req = require('../../../utils/request');
const { makeFabStyle } = require('../../../utils/theme');
Page({
  data: { items: [], loading: true, formOpen: false, form: { name:'', settlement_type:'flexible' }, settleRange:['即付','月结','灵活'], settleIndex:2, saving:false, fabStyle:'' },
  async onShow() {
    this.setData({ loading: true, fabStyle: makeFabStyle(getApp().globalData.themeColor) });
    try {
      const data = await req.get('/api/supplier/list', { page: 1, limit: 50 });
      this.setData({ items: data.records || [] });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  async onPullDownRefresh() {
    try {
      await this.onShow();
    } finally {
      wx.stopPullDownRefresh();
    }
  },
  openCreate(){ this.setData({ formOpen:true, form:{ name:'', settlement_type:'flexible' }, settleIndex:2 }); },
  closeForm(){ this.setData({ formOpen:false }); },
  iName(e){ this.setData({ 'form.name': e.detail.value }); },
  iContact(e){ this.setData({ 'form.contact_person': e.detail.value }); },
  iPhone(e){ this.setData({ 'form.phone': e.detail.value }); },
  iEmail(e){ this.setData({ 'form.email': e.detail.value }); },
  iAddress(e){ this.setData({ 'form.address': e.detail.value }); },
  onSettle(e){ const i=Number(e.detail.value); const map=['immediate','monthly','flexible']; this.setData({ settleIndex:i, 'form.settlement_type': map[i] }); },
  iDay(e){ this.setData({ 'form.settlement_day': Number(e.detail.value) }); },
  async save(){
    if(!this.data.form.name){ wx.showToast({ title:'请输入名称', icon:'none' }); return; }
    this.setData({ saving:true });
    try{
      if(this.data.form.id){
        await req.put('/api/supplier/update?id='+this.data.form.id, this.data.form);
      }else{
        await req.post('/api/supplier/create', this.data.form);
      }
      this.setData({ formOpen:false });
      await this.onShow();
      wx.showToast({ title:'已保存', icon:'success' });
    }catch(e){ wx.showToast({ title:'保存失败', icon:'none' }); }
    finally{ this.setData({ saving:false }); }
  },
  async onEdit(e){
    const id = e.currentTarget.dataset.id;
    const cur = this.data.items.find(x=>x.id===id);
    if(!cur){ return; }
    const mapIndex = { 'immediate':0, 'monthly':1, 'flexible':2 };
    this.setData({ formOpen:true, form: JSON.parse(JSON.stringify(cur)), settleIndex: mapIndex[cur.settlement_type||'flexible']||2 });
  },
  async onDelete(e){
    const id = e.currentTarget.dataset.id;
    wx.showModal({ title:'确认删除', content:'删除后不可恢复', confirmText:'删除', success: async (r)=>{
      if(r.confirm){
        try{ await req.del('/api/supplier/delete?id='+id); await this.onShow(); wx.showToast({ title:'已删除' }); }catch(err){ wx.showToast({ title:'删除失败', icon:'none' }); }
      }
    }});
  }
});
