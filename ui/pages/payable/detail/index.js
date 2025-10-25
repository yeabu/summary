const req = require('../../../utils/request');
const theme = require('../../../utils/theme');
const { canAccess } = require('../../../utils/role');

Page({
  data: {
    id: '',
    item: { supplierName:'', baseName:'', total:0, paid:0, remaining:0, status:'', dueDate:'' },
    payments: [],
    links: [],
    payOpen: false,
    payForm: { payable_record_id:'', payment_amount:'', payment_date:'', payment_method:'bank_transfer', reference_number:'', notes:'' },
    methodRange: ['现金','银行转账','支票','其他'],
    methodMap: ['cash','bank_transfer','check','other'],
    methodIndex: 1,
    saving: false,
    sortKeyOptions: ['日期','金额'],
    sortKeyIndex: 0,
    sortOrderOptions: ['降序','升序'],
    sortOrderIndex: 0,
    fabStyle: '',
    themeColor: '#B4282D',
    showFallbackNav: false,
    deviceProfileClass: '',
    isTablet: false
  },
  onLoad(options){ this.setData({ id: options.id || '' }); },
  async onShow(){
    const app = typeof getApp === 'function' ? getApp() : null;
    const role = (app && app.globalData && app.globalData.role) ? app.globalData.role : (wx.getStorageSync('role') || '');
    if (!canAccess(role, ['admin'])) {
      wx.showToast({ title: '无权限访问', icon: 'none' });
      setTimeout(() => { wx.navigateBack({ delta: 1 }); }, 600);
      return;
    }
    const themeColor = theme.getThemeColor();
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    const hasTabBar = !!(tabBar && typeof tabBar.refreshTabs === 'function');
    if (hasTabBar) {
      if (typeof tabBar.refreshTabs === 'function') { tabBar.refreshTabs(); }
      if (typeof tabBar.syncWithRoute === 'function') { tabBar.syncWithRoute(); }
      if (typeof tabBar.setThemeColor === 'function') { tabBar.setThemeColor(themeColor); }
    }
    const deviceProfileClass = app && app.globalData ? (app.globalData.deviceProfileClass || '') : (wx.getStorageSync('deviceProfileClass') || '');
    const isTablet = app && app.globalData ? !!app.globalData.isTablet : !!wx.getStorageSync('isTablet');
    this.setData({
      themeColor,
      fabStyle: theme.makeFabStyle(themeColor),
      showFallbackNav: !hasTabBar,
      deviceProfileClass,
      isTablet
    });
    wx.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#ffffff',
      animation: { duration: 0, timingFunc: 'linear' }
    });
    const fallbackNav = this.selectComponent('#fallback-nav');
    if (!hasTabBar && fallbackNav && typeof fallbackNav.setThemeColor === 'function') {
      fallbackNav.setThemeColor(themeColor);
    }
    if(!this.data.id){ wx.showToast({ title:'缺少ID', icon:'none' }); return; }
    try{
      const d = await req.get('/api/payable/detail?id='+this.data.id);
      const item = {
        supplierName: (d.supplier && d.supplier.name) ? d.supplier.name : (d.supplier || ''),
        baseName: (d.base && d.base.name) ? d.base.name : '',
        total: d.total_amount != null ? d.total_amount : 0,
        paid: d.paid_amount != null ? d.paid_amount : 0,
        remaining: d.remaining_amount != null ? d.remaining_amount : 0,
        status: d.status || '',
        dueDate: d.due_date || ''
      };
      let payments = (d.payment_records || []).map(p=>({
        id: p.id,
        payment_amount: p.payment_amount,
        payment_date: p.payment_date,
        payment_method: p.payment_method,
        reference_number: p.reference_number || ''
      }));
      payments = this.sortPayments(payments);
      const links = (d.links || []).map(l=>({
        id: l.id,
        amount: l.amount,
        purchase_id: l.purchase_entry ? l.purchase_entry.id : '',
        order_number: l.purchase_entry ? (l.purchase_entry.order_number || '') : '',
        purchase_date: l.purchase_entry ? (l.purchase_entry.purchase_date || '') : ''
      }));
      this.setData({ item, payments, links });
    }catch(e){ wx.showToast({ title:'加载失败', icon:'none' }); }
  },
  sortPayments(list){
    const key = this.data.sortKeyIndex === 0 ? 'date' : 'amount';
    const order = this.data.sortOrderIndex === 0 ? 'desc' : 'asc';
    const arr = (list || []).slice();
    arr.sort((a,b)=>{
      let av = key==='date' ? new Date(a.payment_date).getTime() : Number(a.payment_amount)||0;
      let bv = key==='date' ? new Date(b.payment_date).getTime() : Number(b.payment_amount)||0;
      return order==='desc' ? (bv-av) : (av-bv);
    });
    return arr;
  },
  onSortKey(e){ this.setData({ sortKeyIndex: Number(e.detail.value), payments: this.sortPayments(this.data.payments) }); },
  onSortOrder(e){ this.setData({ sortOrderIndex: Number(e.detail.value), payments: this.sortPayments(this.data.payments) }); },
  openPay(){ const today=new Date().toISOString().slice(0,10); this.setData({ payOpen:true, payForm:{ payable_record_id:this.data.id, payment_amount:'', payment_date:today, payment_method:'bank_transfer', reference_number:'', notes:'' }, methodIndex:1 }); },
  closePay(){ this.setData({ payOpen:false }); },
  iPayAmount(e){ this.setData({ 'payForm.payment_amount': Number(e.detail.value) }); },
  onPayDate(e){ this.setData({ 'payForm.payment_date': e.detail.value }); },
  onMethod(e){ const i=Number(e.detail.value); this.setData({ methodIndex:i, 'payForm.payment_method': this.data.methodMap[i] }); },
  iRef(e){ this.setData({ 'payForm.reference_number': e.detail.value }); },
  iNotes(e){ this.setData({ 'payForm.notes': e.detail.value }); },
  async savePayment(){ const f=this.data.payForm; if(!f.payment_amount || !f.payment_date){ wx.showToast({ title:'请填必填项', icon:'none' }); return; } this.setData({ saving:true }); try{ await req.post('/api/payment/create', f); this.setData({ payOpen:false }); await this.onShow(); wx.showToast({ title:'已保存', icon:'success' }); }catch(e){ wx.showToast({ title:'保存失败', icon:'none' }); } finally{ this.setData({ saving:false }); } }
});
