const req = require('../../utils/request');

Page({
  data: { start: '', end: '', totalExpense: 0, totalPurchase: 0, expenseByBase: [] },
  onShow(){
    const t=new Date();
    const start=new Date(t.getFullYear(), t.getMonth(), 1).toISOString().slice(0,10);
    const end=new Date(t.getFullYear(), t.getMonth()+1, 0).toISOString().slice(0,10);
    this.setData({ start, end });
    this.load();
  },
  onStart(e){ this.setData({ start: e.detail.value }); },
  onEnd(e){ this.setData({ end: e.detail.value }); },
  async load(){
    try{
      const { start, end } = this.data;
      const params = `?start_date=${start}&end_date=${end}&prefer_mv=true`;
      const data = await req.get('/api/analytics/summary'+params);
      this.setData({
        totalExpense: data.total_expense || 0,
        totalPurchase: data.total_purchase || 0,
        expenseByBase: data.expense_by_base || []
      });
    }catch(e){ wx.showToast({ title: '统计失败', icon: 'none' }); }
  }
});
