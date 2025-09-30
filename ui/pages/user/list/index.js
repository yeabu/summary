const req = require('../../../utils/request');
const theme = require('../../../utils/theme');
const { canAccess } = require('../../../utils/role');

const ROLE_OPTIONS = [
  { value: 'admin', label: '管理员' },
  { value: 'base_agent', label: '基地代理' },
  { value: 'captain', label: '队长' },
  { value: 'factory_manager', label: '厂长' }
];

function getRoleLabel(role) {
  const opt = ROLE_OPTIONS.find(o => o.value === role);
  return opt ? opt.label : role || '';
}
Page({
  data: { items: [], loading: true, formOpen:false, form:{ name:'', role:'base_agent', base_ids:[], password:'' }, bases:[], checkedBaseIds:{}, roleOptions: ROLE_OPTIONS, roleIndex:1, saving:false, fabStyle:'', themeColor:'#B4282D' },
  async onShow(){
    const role = (getApp().globalData && getApp().globalData.role) ? getApp().globalData.role : (wx.getStorageSync('role') || '');
    if (!canAccess(role, ['admin', 'base_agent'])) {
      wx.showToast({ title: '无权限访问', icon: 'none' });
      setTimeout(() => { wx.switchTab({ url: '/pages/home/index' }); }, 600);
      this.setData({ loading:false });
      return;
    }
    const themeColor = theme.getThemeColor();
    this.setData({ loading:true, themeColor, fabStyle: theme.makeFabStyle(themeColor) });
    try{
      const [ulist, blist] = await Promise.all([
        req.get('/api/user/list'),
        req.get('/api/base/list')
      ]);
      const mapped = (Array.isArray(ulist) ? ulist : ulist.records || []).map(u => ({
        id: u.id, name: u.name, role: u.role, roleLabel: getRoleLabel(u.role),
        baseNames: (u.bases || []).map(b => b.name).join(', ')
      }));
      const bases = Array.isArray(blist) ? blist : (blist.records || blist || []);
      this.setData({ items: mapped, bases, themeColor });
    }catch(e){ wx.showToast({ title:'加载失败', icon:'none' }); }
    finally{ this.setData({ loading:false }); }
  },
  async onPullDownRefresh(){ try{ await this.onShow(); } finally{ wx.stopPullDownRefresh(); } },
  openCreate(){ this.setData({ formOpen:true, form:{ name:'', role:'base_agent', base_ids:[], password:'' }, checkedBaseIds:{}, roleIndex:1 }); },
  closeForm(){ this.setData({ formOpen:false }); },
  iName(e){ this.setData({ 'form.name': e.detail.value }); },
  iPwd(e){ this.setData({ 'form.password': e.detail.value }); },
  onRole(e){
    const i=Number(e.detail.value);
    const option = this.data.roleOptions[i];
    this.setData({ roleIndex:i, 'form.role': option ? option.value : this.data.form.role });
  },
  onBases(e){ const vals=(e.detail.value||[]).map(v=>Number(v)); const map={}; vals.forEach(id=>map[id]=true); this.setData({ checkedBaseIds: map, 'form.base_ids': vals }); },
  async save(){
    const f=this.data.form; if(!f.name || !f.role || (!f.id && !f.password)){ wx.showToast({ title:'请填必填项', icon:'none' }); return; }
    this.setData({ saving:true });
    try{
      const payload=Object.assign({}, f); if(f.id && !f.password) delete payload.password;
      if(f.id){ await req.put('/api/user/update?id='+f.id, payload); }
      else { await req.post('/api/user/create', payload); }
      this.setData({ formOpen:false }); await this.onShow(); wx.showToast({ title:'已保存', icon:'success' });
    }catch(e){ wx.showToast({ title:'保存失败', icon:'none' }); }
    finally{ this.setData({ saving:false }); }
  },
  async onEdit(e){
    const id = e.currentTarget.dataset.id;
    const curRaw=this.data.items.find(x=>x.id===id);
    if(!curRaw) return;
    try{
      const detail=await req.get('/api/user/get?id='+id);
      const base_ids=(detail.bases||[]).map(b=>b.id);
      const checked={}; base_ids.forEach(i=>checked[i]=true);
      const idx=this.data.roleOptions.findIndex(opt => opt.value === (detail.role||'base_agent'));
      this.setData({ formOpen:true, form:{ id:detail.id, name:detail.name, role:detail.role, base_ids:base_ids, password:'' }, checkedBaseIds:checked, roleIndex: idx>=0?idx:1 });
    }catch(err){ wx.showToast({ title:'加载详情失败', icon:'none' }); }
  },
  onDelete(e){ const id=e.currentTarget.dataset.id; wx.showModal({ title:'确认删除', content:'删除后不可恢复', confirmText:'删除', success: async (r)=>{ if(r.confirm){ try{ await req.del('/api/user/delete?id='+id); await this.onShow(); wx.showToast({ title:'已删除' }); }catch(err){ wx.showToast({ title:'删除失败', icon:'none' }); } } } }); }
});
