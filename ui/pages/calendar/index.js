const req = require('../../utils/request');
const theme = require('../../utils/theme');

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

function pad(num) {
  return num < 10 ? '0' + num : String(num);
}

function normalizeDate(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    if (value.length >= 10) return value.slice(0, 10);
    return value;
  }
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return '';
}

function toTimestamp(value) {
  if (!value) return 0;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function formatMonthText(year, month) {
  return `${year}年${month}月`;
}

function monthLastDate(year, month) {
  const lastDay = new Date(year, month, 0);
  return `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}`;
}

function normalizeList(resp) {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp.records)) return resp.records;
  if (Array.isArray(resp.data)) return resp.data;
  return [];
}

function formatAmount(amount, currency) {
  if (amount === undefined || amount === null) return '';
  const num = Number(amount);
  const formatted = Number.isFinite(num) ? num.toFixed(2) : String(amount);
  const unit = currency && typeof currency === 'string' && currency.trim() ? currency : 'CNY';
  return `${unit} ${formatted}`;
}

function pushRecord(map, date, record) {
  if (!date) return;
  if (!map[date]) map[date] = [];
  map[date].push(record);
}

function buildRecordMap(expenses, purchases) {
  const map = {};
  const stats = { expenseCount: 0, purchaseCount: 0 };

  expenses.forEach((item, idx) => {
    const date = normalizeDate(item.date);
    const categoryName = typeof item.category === 'string'
      ? item.category
      : (item.category && item.category.name) ? item.category.name : '';
    const baseName = item.base && item.base.name ? item.base.name : (item.base_name || '');
    const amountText = formatAmount(item.amount, item.currency);
    const detail = item.detail || '';
    const creatorName = item.creator_name || item.CreatorName || '';
    const subtitleParts = [];
    if (baseName) subtitleParts.push(baseName);
    if (creatorName) subtitleParts.push(creatorName);

    const record = {
      uid: `expense-${item.id || idx}`,
      id: item.id,
      type: 'expense',
      typeLabel: '开支',
      date,
      title: categoryName || '开支',
      subtitle: subtitleParts.join(' · '),
      amountText,
      detail,
      timestamp: toTimestamp(item.created_at || item.date),
    };
    pushRecord(map, date, record);
    stats.expenseCount += 1;
  });

  purchases.forEach((item, idx) => {
    const date = normalizeDate(item.purchase_date);
    const baseName = item.base && item.base.name ? item.base.name : (item.base_name || '');
    const supplierName = item.supplier && item.supplier.name ? item.supplier.name : (item.supplier_name || '');
    const amountText = formatAmount(item.total_amount, item.currency);
    const receiver = item.receiver || '';
    const itemsCount = Array.isArray(item.items) ? item.items.length : 0;
    const subtitleParts = [];
    if (baseName) subtitleParts.push(baseName);
    if (supplierName) subtitleParts.push(supplierName);
    const detailParts = [];
    if (receiver) detailParts.push(`领用人：${receiver}`);
    if (itemsCount) detailParts.push(`明细 ${itemsCount} 项`);

    const record = {
      uid: `purchase-${item.id || idx}`,
      id: item.id,
      type: 'purchase',
      typeLabel: '申领',
      date,
      title: item.order_number || '物资申领',
      subtitle: subtitleParts.join(' · '),
      amountText,
      detail: detailParts.join(' ｜ '),
      timestamp: toTimestamp(item.created_at || item.purchase_date),
    };
    pushRecord(map, date, record);
    stats.purchaseCount += 1;
  });

  Object.keys(map).forEach((key) => {
    map[key].sort((a, b) => b.timestamp - a.timestamp);
  });

  return { map, stats };
}

function buildWeeks(year, month, recordMap, todayStr) {
  const weeks = [];
  const firstDay = new Date(year, month - 1, 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  for (let w = 0; w < 6; w += 1) {
    const week = [];
    for (let d = 0; d < 7; d += 1) {
      const current = new Date(start);
      current.setDate(start.getDate() + w * 7 + d);
      const cy = current.getFullYear();
      const cm = current.getMonth() + 1;
      const cd = current.getDate();
      const dateStr = `${cy}-${pad(cm)}-${pad(cd)}`;
      const isCurrentMonth = cy === year && cm === month;
      const records = recordMap[dateStr] || [];
      week.push({
        date: dateStr,
        day: cd,
        inMonth: isCurrentMonth,
        total: records.length,
        isToday: dateStr === todayStr,
      });
    }
    weeks.push(week);
  }
  return weeks;
}

function firstAvailableDate(year, month, recordMap, todayStr) {
  const prefix = `${year}-${pad(month)}-`;
  if (todayStr.startsWith(prefix) && Array.isArray(recordMap[todayStr]) && recordMap[todayStr].length > 0) {
    return todayStr;
  }
  const keys = Object.keys(recordMap).filter((k) => k.startsWith(prefix)).sort();
  if (keys.length > 0) return keys[0];
  return `${prefix}01`;
}

Page({
  data: {
    weekDays: WEEK_DAYS,
    year: 0,
    month: 0,
    monthText: '',
    weeks: [],
    selectedDate: '',
    selectedRecords: [],
    dayRecords: {},
    summary: { expenseCount: 0, purchaseCount: 0 },
    themeColor: '#B4282D',
    today: normalizeDate(new Date()),
    showFallbackNav: false,
    deviceProfileClass: '',
    isTablet: false
  },

  onLoad() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const themeColor = theme.getThemeColor();
    this.setData({
      year,
      month,
      monthText: formatMonthText(year, month),
      themeColor,
    });
    this.loadMonth(year, month, true);
  },

  onShow() {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    const hasTabBar = !!(tabBar && typeof tabBar.refreshTabs === 'function');
    const themeColor = theme.getThemeColor();
    if (hasTabBar) {
      if (typeof tabBar.refreshTabs === 'function') { tabBar.refreshTabs(); }
      if (typeof tabBar.syncWithRoute === 'function') { tabBar.syncWithRoute(); }
      if (typeof tabBar.setThemeColor === 'function') { tabBar.setThemeColor(themeColor); }
    }
    const app = typeof getApp === 'function' ? getApp() : null;
    const deviceProfileClass = app && app.globalData ? (app.globalData.deviceProfileClass || '') : (wx.getStorageSync('deviceProfileClass') || '');
    const isTablet = app && app.globalData ? !!app.globalData.isTablet : !!wx.getStorageSync('isTablet');
    this.setData({
      showFallbackNav: !hasTabBar,
      themeColor,
      deviceProfileClass,
      isTablet
    });
    const fallback = this.selectComponent('#fallback-nav');
    if (!hasTabBar && fallback && typeof fallback.setThemeColor === 'function') {
      fallback.setThemeColor(themeColor);
    }
  },

  onPullDownRefresh() {
    const { year, month } = this.data;
    this.loadMonth(year, month, false).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  loadMonth(year, month, useToday) {
    const monthStr = `${year}-${pad(month)}`;
    const startDate = `${monthStr}-01`;
    const endDate = monthLastDate(year, month);
    const todayStr = normalizeDate(new Date());
    const prevSelected = this.data.selectedDate || '';
    wx.showLoading({ title: '加载中', mask: true });
    return Promise.all([
      req.get('/api/expense/list', { month: monthStr, created_by: 'me' }),
      req.get('/api/purchase/list', { start_date: startDate, end_date: endDate, created_by: 'me' })
    ]).then(([expenseResp, purchaseResp]) => {
      const expenses = normalizeList(expenseResp);
      const purchases = normalizeList(purchaseResp);
      const { map, stats } = buildRecordMap(expenses, purchases);
      const weeks = buildWeeks(year, month, map, todayStr);
      const prefix = `${year}-${pad(month)}-`;
      let selectedDate;
      if (useToday) {
        selectedDate = firstAvailableDate(year, month, map, todayStr);
      } else if (prevSelected.startsWith(prefix)) {
        selectedDate = prevSelected;
      } else {
        const keys = Object.keys(map).filter((k) => k.startsWith(prefix)).sort();
        selectedDate = keys.length > 0 ? keys[0] : `${prefix}01`;
      }
      this.setData({
        year,
        month,
        monthText: formatMonthText(year, month),
        weeks,
        dayRecords: map,
        summary: stats,
        selectedDate,
        selectedRecords: map[selectedDate] || [],
      });
    }).catch(() => {
      wx.showToast({ title: '数据加载失败', icon: 'none' });
      const weeks = buildWeeks(year, month, {}, todayStr);
      this.setData({
        year,
        month,
        monthText: formatMonthText(year, month),
        weeks,
        dayRecords: {},
        summary: { expenseCount: 0, purchaseCount: 0 },
        selectedDate: `${year}-${pad(month)}-01`,
        selectedRecords: [],
      });
    }).finally(() => {
      wx.hideLoading();
    });
  },

  changeMonth(offset) {
    let { year, month } = this.data;
    month += offset;
    if (month <= 0) {
      month = 12;
      year -= 1;
    } else if (month > 12) {
      month = 1;
      year += 1;
    }
    this.loadMonth(year, month, false);
  },

  prevMonth() {
    this.changeMonth(-1);
  },

  nextMonth() {
    this.changeMonth(1);
  },

  goToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    this.loadMonth(year, month, true);
  },

  onSelectDay(e) {
    const { date } = e.currentTarget.dataset;
    if (!date) return;
    const records = this.data.dayRecords[date] || [];
    this.setData({ selectedDate: date, selectedRecords: records });
  }
});
