const req = require('../../utils/request');

Page({
  data: { name: '', pwd: '', loading: false, year: new Date().getFullYear() },
  onName(e) { this.setData({ name: e.detail.value }); },
  onPwd(e) { this.setData({ pwd: e.detail.value }); },
  async login() {
    if (!this.data.name || !this.data.pwd) {
      wx.showToast({ title: '请输入账号和密码', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    try {
      const res = await req.post('/api/login', { name: this.data.name, password: this.data.pwd });
      wx.setStorageSync('token', res.token || '');
      wx.setStorageSync('role', res.role || '');
      wx.switchTab({ url: '/pages/home/index' });
    } catch (e) {
      wx.showToast({ title: '登录失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
});
