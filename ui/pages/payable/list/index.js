const req = require('../../../utils/request');
const theme = require('../../../utils/theme');
const { canAccess } = require('../../../utils/role');

Page({
  data: {
    items: [],
    loading: true,
    payOpen: false,
    payForm: { payable_record_id:'', payment_amount:'', payment_date:'', payment_method:'bank_transfer', reference_number:'', notes:'' },
    methodRange: ['现金','银行转账','支票','其他'],
    methodMap: ['cash','bank_transfer','check','other'],
    methodIndex: 1,
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
    if (!canAccess(role, ['admin'])) {
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
      const data = await req.get('/api/payable/list');
      const raw = Array.isArray(data) ? data : (data.records || []);
      // 预计算展示字段，避免 WXML 表达式复杂度
      const items = raw.map(it => ({
        id: it.id,
        supplierName: (typeof it.supplier === 'object' && it.supplier) ? (it.supplier.name || '') : (it.supplier || ''),
        baseName: (it.base && it.base.name) ? it.base.name : '',
        remaining: (it.remaining_amount != null ? it.remaining_amount : it.remainingAmount) || 0,
        status: it.status
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
  goCreatePurchase(){ wx.navigateTo({ url:'/pages/purchase/list/index' }); },
  openPay(e){ const id=e.currentTarget.dataset.id; const today=new Date().toISOString().slice(0,10); this.setData({ payOpen:true, payForm:{ payable_record_id:id, payment_amount:'', payment_date:today, payment_method:'bank_transfer', reference_number:'', notes:'' }, methodIndex:1 }); },
  closePay(){ this.setData({ payOpen:false }); },
  iPayAmount(e){ this.setData({ 'payForm.payment_amount': Number(e.detail.value) }); },
  onPayDate(e){ this.setData({ 'payForm.payment_date': e.detail.value }); },
  onMethod(e){ const i=Number(e.detail.value); this.setData({ methodIndex:i, 'payForm.payment_method': this.data.methodMap[i] }); },
  iRef(e){ this.setData({ 'payForm.reference_number': e.detail.value }); },
  iNotes(e){ this.setData({ 'payForm.notes': e.detail.value }); },
  async savePayment(){ const f=this.data.payForm; if(!f.payable_record_id || !f.payment_amount || !f.payment_date){ wx.showToast({ title:'请填必填项', icon:'none' }); return; } this.setData({ saving:true }); try{ await req.post('/api/payment/create', f); this.setData({ payOpen:false }); await this.onShow(); wx.showToast({ title:'已保存', icon:'success' }); }catch(e){ wx.showToast({ title:'保存失败', icon:'none' }); } finally{ this.setData({ saving:false }); } },
  openDetail(e){ const id=e.currentTarget.dataset.id; wx.navigateTo({ url:'/pages/payable/detail/index?id='+id }); },
  explainDelete(){ wx.showToast({ title:'应付款由采购/还款自动维护，不能直接删除', icon:'none' }); }
});
