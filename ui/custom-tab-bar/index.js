const { canAccess } = require('../utils/role');

const BASE_TAB_ITEMS = [
  { key: 'home', pagePath: 'pages/home/index', text: '首页', iconPath: '/assets/tab/home.png', roles: ['any'], type: 'tab', matchRoutes: ['pages/home/index'] },
  { key: 'product', pagePath: 'pages/product/list/index', text: '商品', iconPath: '/assets/tab/product.png', roles: ['admin'], type: 'tab', matchRoutes: ['pages/product/list/index'] },
  { key: 'purchase', pagePath: 'pages/purchase/list/index', text: '采购', iconPath: '/assets/tab/purchase.png', roles: ['admin'], type: 'tab', matchRoutes: ['pages/purchase/list/index'] },
  { key: 'inventory', pagePath: 'pages/inventory/list/index', text: '库存', iconPath: '/assets/tab/inventory.png', roles: ['admin', 'warehouse_admin', 'base_agent'], type: 'tab', matchRoutes: ['pages/inventory/list/index'] },
  { key: 'mine', pagePath: 'pages/mine/index', text: '我的', iconPath: '/assets/tab/mine.png', roles: ['any'], type: 'tab', matchRoutes: ['pages/mine/index'] }
];

const BASE_ROUTE_SET = new Set(BASE_TAB_ITEMS.map(item => item.pagePath));

const DEFAULT_DYNAMIC_CONFIG = {
  pagePath: '',
  text: '',
  iconPath: '',
  type: 'page',
  matchRoutes: []
};

const DYNAMIC_ROUTE_CONFIGS = [
  { matchRoutes: ['pages/calendar/index'], pagePath: 'pages/calendar/index', text: '日历', iconPath: '/assets/home/calendar.png', type: 'page' },
  { matchRoutes: ['pages/requisition/list/index'], pagePath: 'pages/requisition/list/index', text: '物资', iconPath: '/assets/home/inventory.png', type: 'page' },
  { matchRoutes: ['pages/purchase/list/index'], pagePath: 'pages/purchase/list/index', text: '采购', iconPath: '/assets/home/purchase.png', type: 'page' },
  { matchRoutes: ['pages/payable/list/index', 'pages/payable/detail/index'], pagePath: 'pages/payable/list/index', text: '应付', iconPath: '/assets/home/payable.png', type: 'page' },
  { matchRoutes: ['pages/supplier/list/index'], pagePath: 'pages/supplier/list/index', text: '供应', iconPath: '/assets/home/supplier.png', type: 'page' },
  { matchRoutes: ['pages/product/list/index'], pagePath: 'pages/product/list/index', text: '商品', iconPath: '/assets/home/product.png', type: 'page' },
  { matchRoutes: ['pages/base/list/index'], pagePath: 'pages/base/list/index', text: '基地', iconPath: '/assets/home/base.png', type: 'page' },
  { matchRoutes: ['pages/category/list/index'], pagePath: 'pages/category/list/index', text: '类别', iconPath: '/assets/home/category.png', type: 'page' },
  { matchRoutes: ['pages/user/list/index'], pagePath: 'pages/user/list/index', text: '人员', iconPath: '/assets/home/user.png', type: 'page' },
  { matchRoutes: ['pages/stats/index'], pagePath: 'pages/stats/index', text: '统计', iconPath: '/assets/home/stats.png', type: 'page' }
];

function getRole() {
  const app = typeof getApp === 'function' ? getApp() : null;
  if (app && app.globalData && app.globalData.role) return app.globalData.role;
  try { return wx.getStorageSync('role') || ''; } catch (e) { return ''; }
}

function getBaseTabList(role) {
  const list = BASE_TAB_ITEMS.filter(item => canAccess(role, item.roles));
  if (list.length === 0) {
    return BASE_TAB_ITEMS.filter(item => item.key === 'home' || item.key === 'mine');
  }
  return list.map(item => Object.assign({}, item));
}

function resolveDynamicConfig(route) {
  if (!route || BASE_ROUTE_SET.has(route)) {
    return DEFAULT_DYNAMIC_CONFIG;
  }
  const matched = DYNAMIC_ROUTE_CONFIGS.find(cfg =>
    (cfg.matchRoutes || []).some(match => match === route)
  );
  return matched || DEFAULT_DYNAMIC_CONFIG;
}

function buildDynamicItem(route) {
  const cfg = resolveDynamicConfig(route);
  const pagePath = cfg.pagePath || '';
  const type = cfg.type || (BASE_ROUTE_SET.has(pagePath) ? 'tab' : 'page');
  return {
    key: 'dynamic',
    pagePath,
    text: cfg.text || '',
    iconPath: cfg.iconPath || '',
    roles: ['any'],
    type,
    matchRoutes: cfg.matchRoutes && cfg.matchRoutes.length ? cfg.matchRoutes.slice() : []
  };
}

function composeList(role, currentRoute) {
  const baseList = getBaseTabList(role);
  const list = baseList.slice();
  let dynamicItem = null;

  const needDynamic = list.length === 0
    ? false
    : (currentRoute && !BASE_ROUTE_SET.has(currentRoute));

  if (needDynamic) {
    dynamicItem = buildDynamicItem(currentRoute);
    const insertIndex = Math.min(1, list.length);
    list.splice(insertIndex, 0, dynamicItem);
  }

  return {
    list,
    dynamicItem
  };
}

function isTabPage(path) {
  return BASE_ROUTE_SET.has(path);
}

function matchesRoute(item, route) {
  if (!item || !route) return false;
  if (item.matchRoutes && item.matchRoutes.length) {
    return item.matchRoutes.includes(route);
  }
  return item.pagePath === route;
}

function getDeviceProfileClass() {
  const app = typeof getApp === 'function' ? getApp() : null;
  if (app && app.globalData && app.globalData.deviceProfileClass) {
    return app.globalData.deviceProfileClass;
  }
  try {
    return wx.getStorageSync('deviceProfileClass') || '';
  } catch (e) {
    return '';
  }
}

Component({
  data: {
    selected: 0,
    themeColor: '#B4282D',
    list: composeList(getRole(), '').list,
    dynamicItem: buildDynamicItem(''),
    currentRoute: '',
    deviceProfileClass: ''
  },
  lifetimes: {
    attached() {
      this.refreshTabs();
      this.syncWithRoute();
      this.syncDeviceProfileClass();
    }
  },
  pageLifetimes: {
    show() {
      this.refreshTabs();
      this.syncWithRoute();
      this.syncDeviceProfileClass();
    }
  },
  methods: {
    syncDeviceProfileClass() {
      const cls = getDeviceProfileClass();
      if (cls && this.data.deviceProfileClass !== cls) {
        this.setData({ deviceProfileClass: cls });
      }
    },
    refreshTabs() {
      const role = getRole();
      const { list, dynamicItem } = composeList(role, this.data.currentRoute);
      this.setData({ list, dynamicItem });
    },
    onSwitch(e) {
      const index = Number(e.currentTarget.dataset.index || 0);
      const target = (this.data.list || [])[index];
      if (!target) return;
      if (index !== this.data.selected) {
        this.setData({ selected: index });
      }
      const url = `/${target.pagePath}`;
      if (target.type === 'tab' || isTabPage(target.pagePath)) {
        wx.switchTab({ url });
      } else if (target.pagePath) {
        const pages = getCurrentPages();
        const currentRoute = pages.length ? pages[pages.length - 1].route : '';
        if (currentRoute === target.pagePath) return;
        wx.navigateTo({ url });
      }
    },
    syncWithRoute() {
      const role = getRole();
      const pages = getCurrentPages();
      const currentRoute = pages.length ? pages[pages.length - 1].route : '';
      const app = getApp ? getApp() : null;
      const themeColor = app && app.globalData ? (app.globalData.themeColor || '#B4282D') : '#B4282D';
      const { list, dynamicItem } = composeList(role, currentRoute);
      let selected = this.data.selected;
      const idx = list.findIndex(item => matchesRoute(item, currentRoute));
      if (idx !== -1) {
        selected = idx;
      } else if (selected >= list.length) {
        selected = 0;
      }
      this.setData({
        list,
        dynamicItem,
        selected,
        currentRoute,
        themeColor
      });
    },
    setThemeColor(color) {
      if (color && color !== this.data.themeColor) {
        this.setData({ themeColor: color });
      }
    }
  }
});
