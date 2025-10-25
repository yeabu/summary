const { getRoleLabel } = require('./utils/role');

const originalPage = Page;

function resolveDeviceProfileClass() {
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

function ensureDeviceProfileClass(ctx) {
  if (!ctx) return;
  const cls = resolveDeviceProfileClass();
  if (cls && ctx.data && ctx.data.deviceProfileClass !== cls) {
    if (typeof ctx.setData === 'function') {
      ctx.setData({ deviceProfileClass: cls });
    } else {
      ctx.data.deviceProfileClass = cls;
    }
  }
}

Page = function(config = {}) {
  const originalOnLoad = config.onLoad;
  const originalOnShow = config.onShow;
  const originalData = config.data || {};
  config.data = Object.assign({ deviceProfileClass: '' }, originalData);

  config.onLoad = function(...args) {
    ensureDeviceProfileClass(this);
    if (typeof originalOnLoad === 'function') {
      originalOnLoad.apply(this, args);
    }
  };

  config.onShow = function(...args) {
    ensureDeviceProfileClass(this);
    if (typeof originalOnShow === 'function') {
      originalOnShow.apply(this, args);
    }
  };

  return originalPage(config);
};

const DEVICE_PROFILES = [
  { key: 'phone-compact', className: 'device-phone-compact', ratio: 1.78 }, // 16:9
  { key: 'phone-tall', className: 'device-phone-tall', ratio: 2.17 }, // 19.5:9
  { key: 'tablet-10', className: 'device-tablet-10', ratio: 1.5 }, // 3:2 tablets
  { key: 'tablet-11', className: 'device-tablet-11', ratio: 1.33 }, // 4:3 iPad 11"
  { key: 'tablet-11-pro', className: 'device-tablet-11-pro', ratio: 1.5 }, // 11.2" high-res tablets
  { key: 'tablet-wide', className: 'device-tablet-wide', ratio: 1.25 } // wider tablets
];

function pickDeviceProfile(aspectRatio, metrics = {}) {
  if (!aspectRatio || !Number.isFinite(aspectRatio)) {
    return DEVICE_PROFILES[0];
  }
  const {
    shortSideDp = 0,
    longSideDp = 0,
    widthPx = 0,
    heightPx = 0
  } = metrics || {};

  const maxSidePx = Math.max(widthPx, heightPx);
  const minSidePx = Math.min(widthPx, heightPx);
  const looksLikeHighResTablet =
    (shortSideDp >= 1000 && longSideDp >= 1500) ||
    (maxSidePx >= 2800 && minSidePx >= 1900 && aspectRatio >= 1.4 && aspectRatio <= 1.6);

  if (looksLikeHighResTablet) {
    const proProfile = DEVICE_PROFILES.find(profile => profile.key === 'tablet-11-pro');
    if (proProfile) return proProfile;
  }

  let closest = DEVICE_PROFILES[0];
  let minDiff = Math.abs(aspectRatio - closest.ratio);
  DEVICE_PROFILES.forEach(profile => {
    const diff = Math.abs(aspectRatio - profile.ratio);
    if (diff < minDiff) {
      closest = profile;
      minDiff = diff;
    }
  });
  return closest;
}

App({
  globalData: {
    token: '',
    role: '',
    roleLabel: '佳慧伙伴',
    apiBase: '',
    themeColor: '#B4282D',
    lang: 'zh',
    isTablet: false,
    deviceInfo: {},
    deviceProfile: '',
    deviceProfileClass: '',
    uiScale: 1
  },
  onLaunch() {
    const token = wx.getStorageSync('token') || '';
    const role = wx.getStorageSync('role') || '';
    const apiBase = require('./config').apiBase;
    const themeColor = wx.getStorageSync('themeColor') || '#B4282D';
    const lang = wx.getStorageSync('lang') || 'zh';
    const roleLabel = getRoleLabel(role);
    let deviceInfo = {};
    let isTablet = false;
    let deviceProfile = DEVICE_PROFILES[0];
    try {
      const sys = wx.getSystemInfoSync();
      const { windowWidth = 0, windowHeight = 0, pixelRatio = 2, model = '' } = sys || {};
      const shortSideDp = Math.min(windowWidth, windowHeight) / pixelRatio;
      const longSideDp = Math.max(windowWidth, windowHeight) / pixelRatio;
      const aspectRatio = windowHeight >= windowWidth
        ? windowHeight / windowWidth
        : windowWidth / windowHeight;
      isTablet = shortSideDp >= 768 || longSideDp >= 1024 || /iPad/i.test(model);
      deviceProfile = pickDeviceProfile(aspectRatio, {
        shortSideDp,
        longSideDp,
        widthPx: windowWidth,
        heightPx: windowHeight
      });
      deviceInfo = {
        windowWidth,
        windowHeight,
        pixelRatio,
        model,
        shortSideDp,
        longSideDp,
        aspectRatio,
        deviceProfile: deviceProfile.key
      };
    } catch (err) {
      console.warn('getSystemInfo failed', err);
    }
    const scaleClass = (deviceProfile.key === 'tablet-11' || deviceProfile.key === 'tablet-11-pro') ? 'scale-half' : '';
    const deviceProfileClass = [deviceProfile.className, scaleClass].filter(Boolean).join(' ');
    const uiScale = scaleClass ? 0.5 : 1;

    this.globalData = {
      token,
      role,
      roleLabel,
      apiBase,
      themeColor,
      lang,
      isTablet,
      deviceInfo,
      deviceProfile: deviceProfile.key,
      deviceProfileClass,
      uiScale
    };
    try {
      wx.setStorageSync('roleLabel', roleLabel);
      wx.setStorageSync('isTablet', isTablet);
      wx.setStorageSync('deviceInfo', deviceInfo);
      wx.setStorageSync('deviceProfile', deviceProfile.key);
      wx.setStorageSync('deviceProfileClass', deviceProfileClass);
      wx.setStorageSync('uiScale', uiScale);
    } catch (e) {}
    if (!token) {
      wx.reLaunch({ url: '/pages/login/index' });
    } else {
      wx.reLaunch({ url: '/pages/home/index' });
    }
  },
  setThemeColor(color) {
    this.globalData.themeColor = color;
    try { wx.setStorageSync('themeColor', color); } catch (e) {}
  },
  setLang(lang) {
    this.globalData.lang = lang;
    try { wx.setStorageSync('lang', lang); } catch (e) {}
  }
});
