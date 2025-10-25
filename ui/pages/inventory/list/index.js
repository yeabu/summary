const req = require('../../../utils/request');
const theme = require('../../../utils/theme');
const { canAccess } = require('../../../utils/role');

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || value === '') return '--';
  const num = Number(value);
  if (!isFinite(num)) return '--';
  const fixed = num.toFixed(digits);
  return fixed.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

Page({
  data: {
    loading: true,
    list: [],
    q: '',
    themeColor: theme.getThemeColor(),
    showFallbackNav: false,
    deviceProfileClass: '',
    isTablet: false
  },
  onShow() {
    const role = (getApp().globalData && getApp().globalData.role) ? getApp().globalData.role : (wx.getStorageSync('role') || '');
    if (!canAccess(role, ['admin', 'warehouse_admin', 'base_agent'])) {
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
      if (typeof tabBar.setThemeColor === 'function') { tabBar.setThemeColor(themeColor); }
    }
    const app = typeof getApp === 'function' ? getApp() : null;
    const deviceProfileClass = app && app.globalData ? (app.globalData.deviceProfileClass || '') : (wx.getStorageSync('deviceProfileClass') || '');
    const isTablet = app && app.globalData ? !!app.globalData.isTablet : !!wx.getStorageSync('isTablet');
    this.setData({ themeColor, showFallbackNav: !hasTabBar, deviceProfileClass, isTablet });
    const fallbackNav = this.selectComponent('#fallback-nav');
    if (fallbackNav && typeof fallbackNav.setThemeColor === 'function') {
      fallbackNav.setThemeColor(themeColor);
    }
    this.loadInventory();
  },
  async loadInventory() {
    this.setData({ loading: true });
    try {
      const keyword = (this.data.q || '').trim();
      const params = keyword ? { q: keyword } : {};
      const data = await req.get('/api/inventory/list', params);
      const list = (Array.isArray(data) ? data : []).map((item, idx) => {
        const name = item.product_name || '';
        const spec = item.product_spec || '';
        const unit = item.product_unit || '';
        const keyBase = (name + '-' + spec).trim();
        const stockVal = typeof item.stock_quantity === 'number' ? item.stock_quantity : Number(item.stock_quantity) || 0;
        return {
          key: keyBase || ('inv-' + idx),
          name,
          spec,
          unit,
          supplier: item.supplier || '',
          currency: item.currency || '',
          stock: stockVal,
          stockText: formatNumber(stockVal, 2),
          unitPriceText: formatNumber(item.unit_price, 2)
        };
      });
      this.setData({ list });
    } catch (e) {
      wx.showToast({ title: '库存加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
      wx.stopPullDownRefresh();
    }
  },
  onPullDownRefresh() {
    this.loadInventory();
  },
  onSearchInput(e) {
    this.setData({ q: e.detail.value });
  },
  onSearchConfirm() {
    this.loadInventory();
  },
  onClearSearch() {
    this.setData({ q: '' });
    this.loadInventory();
  }
});
