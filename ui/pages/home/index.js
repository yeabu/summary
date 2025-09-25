Page({
  goPayable() { wx.navigateTo({ url: '/pages/payable/list/index' }); },
  goSupplier() { wx.navigateTo({ url: '/pages/supplier/list/index' }); },
  goProduct() { wx.navigateTo({ url: '/pages/product/list/index' }); },
  goBase() { wx.navigateTo({ url: '/pages/base/list/index' }); },
  goUser() { wx.navigateTo({ url: '/pages/user/list/index' }); },
  goCategory() { wx.navigateTo({ url: '/pages/category/list/index' }); }
});
