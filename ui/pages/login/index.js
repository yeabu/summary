const req = require('../../utils/request');

Page({
  data: { 
    name: '', 
    pwd: '', 
    loading: false, 
    year: new Date().getFullYear(),
    nameErr: '',
    pwdErr: '',
    themeColor: '#07c160'
  },
  onLoad(){
    const app = getApp();
    if (app && app.globalData && app.globalData.themeColor) {
      this.setData({ themeColor: app.globalData.themeColor });
    }
  },
  onName(e) { this.setData({ name: e.detail.value, nameErr: '' }); },
  onPwd(e) { this.setData({ pwd: e.detail.value, pwdErr: '' }); },
  validate(){
    let ok = true;
    if(!this.data.name){ this.setData({ nameErr: '请输入用户名' }); ok = false; }
    if(!this.data.pwd){ this.setData({ pwdErr: '请输入密码' }); ok = false; }
    return ok;
  },
  async login() {
    if (!this.validate()) return;
    this.setData({ loading: true });
    try {
      const res = await req.post('/api/login', { name: this.data.name, password: this.data.pwd });
      wx.setStorageSync('token', res.token || '');
      wx.setStorageSync('role', res.role || '');
      if (res.user_id) wx.setStorageSync('user_id', res.user_id);
      if (Array.isArray(res.bases)) wx.setStorageSync('bases', res.bases);
      wx.setStorageSync('name', this.data.name || '');
      wx.switchTab({ url: '/pages/home/index' });
    } catch (e) {
      wx.showToast({ title: '登录失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
  onForgotPassword() {
    wx.showModal({
      title: '提示',
      content: '请联系管理员',
      showCancel: false
    })
  }
});
