App({
  globalData: {
    token: '',
    role: '',
    apiBase: '',
    themeColor: '#B4282D',
    lang: 'zh'
  },
  onLaunch() {
    const token = wx.getStorageSync('token') || '';
    const role = wx.getStorageSync('role') || '';
    const apiBase = require('./config').apiBase;
    const themeColor = wx.getStorageSync('themeColor') || '#B4282D';
    const lang = wx.getStorageSync('lang') || 'zh';
    this.globalData = { token, role, apiBase, themeColor, lang };
    // 首次进入强制路由到登录/首页
    if (!token) {
      wx.reLaunch({ url: '/pages/login/index' });
    } else {
      wx.reLaunch({ url: '/pages/home/index' });
    }
  },
  setThemeColor(color){ this.globalData.themeColor = color; try{ wx.setStorageSync('themeColor', color); }catch(e){} },
  setLang(lang){ this.globalData.lang = lang; try{ wx.setStorageSync('lang', lang); }catch(e){} }
});
