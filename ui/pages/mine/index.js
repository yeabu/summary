const req = require('../../utils/request');
const theme = require('../../utils/theme');
const { getRoleLabel } = require('../../utils/role');

Page({
  data: { role: '', roleLabel: '佳慧伙伴', oldPwd: '', newPwd: '', loading: false, langs:['中文','English'], langIndex:0, themeColors: ['#B4282D', '#1C6DD0', '#07C160', '#FFC53D'], themeActiveColor: '#B4282D', showFallbackNav: false },
  onShow(){
    const app = getApp();
    const themeColor = theme.getThemeColor();
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    const hasTabBar = !!(tabBar && typeof tabBar.refreshTabs === 'function');
    if (hasTabBar) {
      if (typeof tabBar.refreshTabs === 'function') { tabBar.refreshTabs(); }
      if (typeof tabBar.syncWithRoute === 'function') { tabBar.syncWithRoute(); }
      if (typeof tabBar.setThemeColor === 'function') { tabBar.setThemeColor(themeColor); }
    }
    const role = (app && app.globalData && app.globalData.role) ? app.globalData.role : (wx.getStorageSync('role') || '');
    const roleLabel = getRoleLabel(role);
    const lang = (app && app.globalData && app.globalData.lang) ? app.globalData.lang : 'zh';
    this.setData({ role, roleLabel, langIndex: lang==='en' ? 1 : 0, themeActiveColor: themeColor, showFallbackNav: !hasTabBar });
  },
  onOld(e){ this.setData({ oldPwd: e.detail.value }); },
  onNew(e){ this.setData({ newPwd: e.detail.value }); },
  async changePwd(){
    if(!this.data.oldPwd || !this.data.newPwd){ wx.showToast({ title:'请填写完整', icon:'none'}); return; }
    this.setData({ loading:true });
    try{
      await req.post('/api/user/change_password', { old_pwd: this.data.oldPwd, new_pwd: this.data.newPwd });
      wx.showToast({ title:'修改成功', icon:'success'});
      this.setData({ oldPwd:'', newPwd:'' });
    }catch(e){ wx.showToast({ title:'修改失败', icon:'none'}); }
    finally{ this.setData({ loading:false }); }
  },
  logout(){ const app = getApp(); wx.clearStorageSync(); if (app && app.globalData){ app.globalData.role = ''; app.globalData.roleLabel = '佳慧伙伴'; } wx.reLaunch({ url:'/pages/login/index' }); },
  onLang(e){ const i=Number(e.detail.value); const lang=i===1?'en':'zh'; getApp().setLang(lang); wx.showToast({ title: '已切换', icon: 'success' }); },
  setTheme(e){
    const color=e.currentTarget.dataset.color;
    const app = getApp();
    app.setThemeColor(color);
    this.setData({ themeActiveColor: color });
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tabBar && typeof tabBar.setThemeColor === 'function') {
      tabBar.setThemeColor(color);
    }
    const fallbackNav = this.selectComponent('#fallback-nav');
    if (fallbackNav && typeof fallbackNav.setThemeColor === 'function') {
      fallbackNav.setThemeColor(color);
    }
    wx.showToast({ title: '主题已更新', icon: 'success' });
  }
});
