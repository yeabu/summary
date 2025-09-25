const dict = {
  zh: {
    newPurchase: '新增采购',
    editPurchase: '编辑采购',
    basicInfo: '基本信息',
    detailInfo: '明细信息',
    orderNumber: '订单号',
    date: '日期',
    selectDate: '选择日期',
    base: '基地',
    supplier: '供应商',
    receiver: '收货人',
    total: '合计',
    detail: '明细',
    productName: '商品名称',
    quantity: '数量',
    unitPrice: '单价',
    subtotal: '小计',
    remove: '移除',
    addDetail: '新增明细',
    save: '保存',
    required: '必填项不能为空',
    invalidNumber: '请输入有效数字',
  },
  en: {
    newPurchase: 'New Purchase',
    editPurchase: 'Edit Purchase',
    basicInfo: 'Basic Info',
    detailInfo: 'Details',
    orderNumber: 'Order No.',
    date: 'Date',
    selectDate: 'Select date',
    base: 'Base',
    supplier: 'Supplier',
    receiver: 'Receiver',
    total: 'Total',
    detail: 'Items',
    productName: 'Product',
    quantity: 'Qty',
    unitPrice: 'Unit Price',
    subtotal: 'Subtotal',
    remove: 'Remove',
    addDetail: 'Add Item',
    save: 'Save',
    required: 'Required field',
    invalidNumber: 'Enter a valid number',
  }
};

function getI18n(lang) {
  const l = (lang || wx.getStorageSync('lang') || 'zh');
  return dict[l] || dict.zh;
}

module.exports = { getI18n };

