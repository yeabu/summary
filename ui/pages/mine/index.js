const req = require('../../utils/request');

Page({
  data: { role: '', oldPwd: '', newPwd: '', loading: false, langs:['中文','English'], langIndex:0 },
  onShow(){
    this.setData({ role: wx.getStorageSync('role') || '' });
    const lang = (getApp().globalData.lang || 'zh');
    this.setData({ langIndex: lang==='en' ? 1 : 0 });
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
  logout(){ wx.clearStorageSync(); wx.reLaunch({ url:'/pages/login/index' }); },
  onLang(e){ const i=Number(e.detail.value); const lang=i===1?'en':'zh'; getApp().setLang(lang); wx.showToast({ title: '已切换', icon: 'success' }); },
  setTheme(e){ const color=e.currentTarget.dataset.color; getApp().setThemeColor(color); wx.showToast({ title: '主题已更新', icon: 'success' }); }
});
