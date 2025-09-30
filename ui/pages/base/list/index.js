const req = require('../../../utils/request');
const theme = require('../../../utils/theme');
const { canAccess } = require('../../../utils/role');
Page({
  data: { items: [], loading: true, formOpen:false, form:{ name:'', code:'', status:'active' }, statusRange:['active','inactive'], statusIndex:0, saving:false, fabStyle:'', themeColor:'#B4282D' },
  async onShow(){
    const role = (getApp().globalData && getApp().globalData.role) ? getApp().globalData.role : (wx.getStorageSync('role') || '');
    if (!canAccess(role, ['admin'])) {
      wx.showToast({ title: '无权限访问', icon: 'none' });
      setTimeout(() => { wx.switchTab({ url: '/pages/home/index' }); }, 600);
      this.setData({ loading:false });
      return;
    }
    const themeColor = theme.getThemeColor();
    this.setData({ loading:true, themeColor, fabStyle: theme.makeFabStyle(themeColor) });
    try{
      const data = await req.get('/api/base/list');
      const items = Array.isArray(data) ? data : (data.records || data || []);
      this.setData({ items });
    }catch(e){ wx.showToast({ title:'加载失败', icon:'none' }); }
    finally{ this.setData({ loading:false }); }
  },
  async onPullDownRefresh(){ try{ await this.onShow(); } finally{ wx.stopPullDownRefresh(); } },
  openCreate(){ this.setData({ formOpen:true, form:{ name:'', code:'', location:'', description:'', status:'active' }, statusIndex:0 }); },
  closeForm(){ this.setData({ formOpen:false }); },
  iName(e){ this.setData({ 'form.name': e.detail.value }); },
  iCode(e){ this.setData({ 'form.code': e.detail.value }); },
  iLocation(e){ this.setData({ 'form.location': e.detail.value }); },
  iDesc(e){ this.setData({ 'form.description': e.detail.value }); },
  onStatus(e){ const i=Number(e.detail.value); this.setData({ statusIndex:i, 'form.status': this.data.statusRange[i] }); },
  async save(){
    if(!this.data.form.name || !this.data.form.code){ wx.showToast({ title:'请填名称和代码', icon:'none' }); return; }
    this.setData({ saving:true });
    try{
      if(this.data.form.id){ await req.put('/api/base/update?id='+this.data.form.id, this.data.form); }
      else { await req.post('/api/base/create', this.data.form); }
      this.setData({ formOpen:false });
      await this.onShow();
      wx.showToast({ title:'已保存', icon:'success' });
    }catch(e){ wx.showToast({ title:'保存失败', icon:'none' }); }
    finally{ this.setData({ saving:false }); }
  },
  onEdit(e){ const id = e.currentTarget.dataset.id; const cur=this.data.items.find(x=>x.id===id); if(!cur)return; const idx=this.data.statusRange.indexOf(cur.status||'active'); this.setData({ formOpen:true, form: JSON.parse(JSON.stringify(cur)), statusIndex: idx>=0?idx:0 }); },
  onDelete(e){ const id=e.currentTarget.dataset.id; wx.showModal({ title:'确认删除', content:'删除后不可恢复', confirmText:'删除', success: async (r)=>{ if(r.confirm){ try{ await req.del('/api/base/delete?id='+id); await this.onShow(); wx.showToast({ title:'已删除' }); }catch(err){ wx.showToast({ title:'删除失败', icon:'none' }); } } } }); }
});
