const req = require('../../../utils/request');
const theme = require('../../../utils/theme');
const { canAccess } = require('../../../utils/role');

const SETTLE_OPTIONS = [
  { value: 'immediate', label: '即付' },
  { value: 'monthly', label: '月结' },
  { value: 'flexible', label: '灵活' }
];

function getSettleLabel(value) {
  const opt = SETTLE_OPTIONS.find(o => o.value === value);
  return opt ? opt.label : value || '';
}
Page({
  data: {
    items: [],
    loading: true,
    formOpen: false,
    form: { name:'', settlement_type:'flexible' },
    settleOptions: SETTLE_OPTIONS,
    settleRange: SETTLE_OPTIONS.map(o => o.label),
    settleIndex: 2,
    saving: false,
    fabStyle: '',
    themeColor: '#B4282D',
    showFallbackNav: false,
    deviceProfileClass: '',
    isTablet: false
  },
  async onShow() {
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
    try {
      const data = await req.get('/api/supplier/list', { page: 1, limit: 50 });
      const items = (data.records || []).map(item => ({
        ...item,
        settlement_label: getSettleLabel(item.settlement_type)
      }));
      this.setData({ items });
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
  onSettle(e){
    const i=Number(e.detail.value);
    const option = this.data.settleOptions[i];
    this.setData({ settleIndex:i, 'form.settlement_type': option ? option.value : this.data.form.settlement_type });
  },
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
