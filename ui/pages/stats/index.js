const req = require('../../utils/request');
const theme = require('../../utils/theme');
const { canAccess } = require('../../utils/role');

Page({
  data: {
    start: '',
    end: '',
    totalExpense: 0,
    totalPurchase: 0,
    expenseByBase: [],
    showFallbackNav: false,
    deviceProfileClass: '',
    isTablet: false
  },
  onShow(){
    const app = typeof getApp === 'function' ? getApp() : null;
    const role = (app && app.globalData && app.globalData.role) ? app.globalData.role : (wx.getStorageSync('role') || '');
    if (!canAccess(role, ['admin'])) {
      wx.showToast({ title: '无权限访问', icon: 'none' });
      setTimeout(() => { wx.switchTab({ url: '/pages/home/index' }); }, 600);
      return;
    }
    const themeColor = theme.getThemeColor();
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    const hasTabBar = !!(tabBar && typeof tabBar.refreshTabs === 'function');
    if (hasTabBar) {
      if (typeof tabBar.refreshTabs === 'function') { tabBar.refreshTabs(); }
      if (typeof tabBar.syncWithRoute === 'function') { tabBar.syncWithRoute(); }
    }
    const deviceProfileClass = app && app.globalData ? (app.globalData.deviceProfileClass || '') : (wx.getStorageSync('deviceProfileClass') || '');
    const isTablet = app && app.globalData ? !!app.globalData.isTablet : !!wx.getStorageSync('isTablet');
    this.setData({ showFallbackNav: !hasTabBar, deviceProfileClass, isTablet });
    const fallbackNav = this.selectComponent('#fallback-nav');
    if (!hasTabBar && fallbackNav && typeof fallbackNav.setThemeColor === 'function') {
      fallbackNav.setThemeColor(themeColor);
    }
    wx.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#ffffff',
      animation: { duration: 0, timingFunc: 'linear' }
    });
    const t=new Date();
    const start=new Date(t.getFullYear(), t.getMonth(), 1).toISOString().slice(0,10);
    const end=new Date(t.getFullYear(), t.getMonth()+1, 0).toISOString().slice(0,10);
    this.setData({ start, end });
    this.load();
  },
  onStart(e){ this.setData({ start: e.detail.value }); },
  onEnd(e){ this.setData({ end: e.detail.value }); },
  async load(){
    try{
      const { start, end } = this.data;
      const params = `?start_date=${start}&end_date=${end}&prefer_mv=true`;
      const data = await req.get('/api/analytics/summary'+params);
      this.setData({
        totalExpense: data.total_expense || 0,
        totalPurchase: data.total_purchase || 0,
        expenseByBase: data.expense_by_base || []
      });
    }catch(e){ wx.showToast({ title: '统计失败', icon: 'none' }); }
  }
});
