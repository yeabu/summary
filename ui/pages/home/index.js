const theme = require('../../utils/theme');
const { getRoleLabel, canAccess } = require('../../utils/role');

const defaultThemeColor = '#B4282D';
const tileGradientPairs = [
  [0.65, 0.45],
  [0.6, 0.4],
  [0.55, 0.35],
  [0.5, 0.3],
  [0.58, 0.38],
  [0.62, 0.42],
  [0.56, 0.36],
  [0.54, 0.34]
];

const TILE_CONFIGS = [
  { key: 'expense', label: '开支管理', icon: '/assets/home/expense.png', url: '/pages/expense/list/index', type: 'tab', roles: ['any'], skipFor: ['warehouse_admin'] },
  { key: 'calendar', label: '我的日历', icon: '/assets/home/calendar.png', url: '/pages/calendar/index', type: 'page', roles: ['any'], skipFor: ['warehouse_admin'] },
  { key: 'inventory', label: '库存管理', icon: '/assets/home/inventory.png', url: '/pages/inventory/list/index', type: 'tab', roles: ['admin', 'warehouse_admin', 'base_agent'] },
  { key: 'requisition', label: '物资申领', icon: '/assets/home/inventory.png', url: '/pages/requisition/list/index', type: 'page', roles: ['admin', 'base_agent'] },
  { key: 'payable', label: '应付款管理', icon: '/assets/home/payable.png', url: '/pages/payable/list/index', type: 'page', roles: ['admin'] },
  { key: 'supplier', label: '供应商管理', icon: '/assets/home/supplier.png', url: '/pages/supplier/list/index', type: 'page', roles: ['admin', 'warehouse_admin'] },
  { key: 'product', label: '商品管理', icon: '/assets/home/product.png', url: '/pages/product/list/index', type: 'page', roles: ['admin', 'warehouse_admin'] },
  { key: 'purchase', label: '采购管理', icon: '/assets/home/purchase.png', url: '/pages/purchase/list/index', type: 'page', roles: ['admin', 'warehouse_admin'] },
  { key: 'base', label: '基地管理', icon: '/assets/home/base.png', url: '/pages/base/list/index', type: 'page', roles: ['admin'] },
  { key: 'stats', label: '统计分析', icon: '/assets/home/stats.png', url: '/pages/stats/index', type: 'page', roles: ['admin'] },
  { key: 'user', label: '人员管理', icon: '/assets/home/user.png', url: '/pages/user/list/index', type: 'page', roles: ['admin', 'base_agent'] },
  { key: 'category', label: '类别管理', icon: '/assets/home/category.png', url: '/pages/category/list/index', type: 'page', roles: ['admin'] }
];

function buildTileBackgrounds(color) {
  return tileGradientPairs.map(([startRatio, endRatio]) => {
    const start = theme.lighten(color, startRatio);
    const end = theme.lighten(color, endRatio);
    return `background: linear-gradient(135deg, ${start}, ${end}); color: #1F2D3D;`;
  });
}

function buildWelcomeStyle(color) {
  const gradEnd = theme.lighten(color, 0.25);
  const shadow = theme.alpha(color, 0.35);
  return `background: linear-gradient(135deg, ${color}, ${gradEnd}); box-shadow: 0 16rpx 48rpx ${shadow}; color: #FFFFFF;`;
}

function buildNoticeStyle(color) {
  const bg = theme.lighten(color, 0.85);
  const border = theme.alpha(color, 0.35);
  return `border: 1rpx dashed ${border}; background: ${bg}; color: ${color};`;
}

function buildTiles(role, themeColor) {
  const backgrounds = buildTileBackgrounds(themeColor);
  const tiles = [];
  TILE_CONFIGS.forEach(cfg => {
    if (canAccess(role, cfg.roles) && (!cfg.skipFor || !cfg.skipFor.includes(role))) {
      tiles.push({
        key: cfg.key,
        label: cfg.label,
        icon: cfg.icon,
        url: cfg.url,
        type: cfg.type,
        background: backgrounds[tiles.length % backgrounds.length]
      });
    }
  });
  return tiles;
}

Page({
  data: {
    welcomeName: '佳慧伙伴',
    themeColor: defaultThemeColor,
    welcomeStyle: buildWelcomeStyle(defaultThemeColor),
    noticeStyle: buildNoticeStyle(defaultThemeColor),
    tileIconColor: defaultThemeColor,
    tiles: buildTiles('', defaultThemeColor),
    showFallbackNav: false
  },
  onShow() {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    const hasTabBar = !!(tabBar && typeof tabBar.refreshTabs === 'function');
    const themeColor = theme.getThemeColor();
    if (hasTabBar) {
      if (typeof tabBar.refreshTabs === 'function') { tabBar.refreshTabs(); }
      if (typeof tabBar.syncWithRoute === 'function') { tabBar.syncWithRoute(); }
      if (typeof tabBar.setThemeColor === 'function') { tabBar.setThemeColor(themeColor); }
    }

    const app = typeof getApp === 'function' ? getApp() : null;
    const role = (app && app.globalData && app.globalData.role) ? app.globalData.role : (wx.getStorageSync('role') || '');
    const welcomeName = getRoleLabel(role);
    const tiles = buildTiles(role, themeColor);

    this.setData({
      welcomeName,
      themeColor,
      welcomeStyle: buildWelcomeStyle(themeColor),
      noticeStyle: buildNoticeStyle(themeColor),
      tileIconColor: themeColor,
      tiles,
      showFallbackNav: !hasTabBar
    });
  },
  onTileTap(e) {
    const { url, type } = e.currentTarget.dataset;
    if (!url) return;
    if (type === 'tab') {
      wx.switchTab({ url });
    } else {
      wx.navigateTo({ url });
    }
  }
});
