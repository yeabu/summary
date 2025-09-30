const { canAccess } = require('../utils/role');

const TAB_ITEMS = [
  { key: 'home', pagePath: 'pages/home/index', text: '首页', iconPath: '/assets/tab/home.png', roles: ['any'] },
  { key: 'expense', pagePath: 'pages/expense/list/index', text: '开支', iconPath: '/assets/tab/expense.png', roles: ['any'] },
  { key: 'inventory', pagePath: 'pages/inventory/list/index', text: '库存', iconPath: '/assets/tab/inventory.png', roles: ['admin', 'base_agent'] },
  { key: 'mine', pagePath: 'pages/mine/index', text: '我的', iconPath: '/assets/tab/mine.png', roles: ['any'] }
];

function getRole() {
  const app = typeof getApp === 'function' ? getApp() : null;
  if (app && app.globalData && app.globalData.role) return app.globalData.role;
  try { return wx.getStorageSync('role') || ''; } catch (e) { return ''; }
}

function getTabList(role) {
  const list = TAB_ITEMS.filter(item => canAccess(role, item.roles));
  if (list.length === 0) {
    return TAB_ITEMS.filter(item => item.key === 'home' || item.key === 'mine');
  }
  return list;
}

Component({
  data: {
    selected: 0,
    themeColor: '#B4282D',
    list: getTabList(getRole())
  },
  lifetimes: {
    attached() {
      this.refreshTabs();
      this.syncWithRoute();
    }
  },
  pageLifetimes: {
    show() {
      this.refreshTabs();
      this.syncWithRoute();
    }
  },
  methods: {
    refreshTabs() {
      const role = getRole();
      const list = getTabList(role);
      const current = this.data.list || [];
      if (JSON.stringify(list) !== JSON.stringify(current)) {
        this.setData({ list, selected: 0 });
      }
    },
    onSwitch(e) {
      const { path } = e.currentTarget.dataset;
      const index = Number(e.currentTarget.dataset.index || 0);
      if (index !== this.data.selected) {
        this.setData({ selected: index });
      }
      wx.switchTab({ url: `/${path}` });
    },
    syncWithRoute() {
      const role = getRole();
      const list = getTabList(role);
      if (JSON.stringify(list) !== JSON.stringify(this.data.list || [])) {
        this.setData({ list, selected: 0 });
      }
      const pages = getCurrentPages();
      const currentRoute = pages.length ? pages[pages.length - 1].route : '';
      const idx = this.data.list.findIndex(item => item.pagePath === currentRoute);
      if (idx !== -1 && idx !== this.data.selected) {
        this.setData({ selected: idx });
      }
      const app = getApp ? getApp() : null;
      const themeColor = app && app.globalData ? (app.globalData.themeColor || '#B4282D') : '#B4282D';
      if (themeColor !== this.data.themeColor) {
        this.setData({ themeColor });
      }
    },
    setThemeColor(color) {
      if (color && color !== this.data.themeColor) {
        this.setData({ themeColor: color });
      }
    }
  }
});
