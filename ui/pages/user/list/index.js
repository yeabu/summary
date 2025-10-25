const req = require('../../../utils/request');
const theme = require('../../../utils/theme');
const { canAccess, getRoleLabel } = require('../../../utils/role');

const ROLE_OPTIONS = [
  { value: 'admin', label: '管理员' },
  { value: 'base_agent', label: '基地代理' },
  { value: 'captain', label: '队长' },
  { value: 'factory_manager', label: '厂长' },
  { value: 'finance', label: '财务主管' }
];

const ROLE_FILTER_OPTIONS = [{ value: 'all', label: '全部角色' }].concat(ROLE_OPTIONS);
const DEFAULT_FORM = {
  id: null,
  name: '',
  role: 'base_agent',
  base_ids: [],
  password: '',
  phone: '',
  email: '',
  join_date: '',
  visa_type: '',
  passport_no: '',
  id_card: '',
  emergency_contact: '',
  emergency_phone: '',
  remark: ''
};

function cloneForm(payload = {}) {
  return Object.assign({}, DEFAULT_FORM, payload);
}

function normaliseDate(value) {
  if (!value) return '';
  const str = String(value);
  if (str.length >= 10) return str.slice(0, 10);
  return str;
}

function mapUserRecord(user) {
  const bases = Array.isArray(user.bases) ? user.bases : [];
  const baseIds = bases.map(b => Number(b.id));
  const baseNames = bases.map(b => b.name).filter(Boolean).join('、');
  const joinDate = normaliseDate(user.join_date || user.joined_at);
  const phone = user.phone || user.mobile || '';
  return {
    id: user.id,
    name: user.name || '',
    role: user.role || '',
    roleLabel: getRoleLabel(user.role),
    baseIds,
    baseNames,
    joinDate,
    phone,
    email: user.email || '',
    visaType: user.visa_type || '',
    passportNo: user.passport_no || '',
    idCard: user.id_card || '',
    emergencyContact: user.emergency_contact || '',
    emergencyPhone: user.emergency_phone || '',
    remark: user.remark || user.notes || ''
  };
}

Page({
  data: {
    loading: true,
    themeColor: theme.getThemeColor(),
    fabStyle: '',
    rawList: [],
    list: [],
    bases: [],
    baseFilterOptions: [{ value: 'all', label: '全部基地' }],
    baseFilterIndex: 0,
    roleFilterOptions: ROLE_FILTER_OPTIONS,
    roleFilterIndex: 0,
    filters: {
      keyword: '',
      role: 'all',
      base: 'all'
    },
    formOpen: false,
    form: cloneForm(),
    formErrors: {},
    roleOptions: ROLE_OPTIONS,
    rolePickerIndex: 1,
    checkedBaseIds: {},
    saving: false,
    showFallbackNav: false,
    deviceProfileClass: '',
    isTablet: false,
    bodyMinHeight: 0
  },
  async onShow() {
    const app = typeof getApp === 'function' ? getApp() : null;
    const role = app && app.globalData && app.globalData.role ? app.globalData.role : (wx.getStorageSync('role') || '');
    if (!canAccess(role, ['admin', 'base_agent'])) {
      wx.showToast({ title: '无权限访问', icon: 'none' });
      setTimeout(() => { wx.switchTab({ url: '/pages/home/index' }); }, 600);
      this.setData({ loading: false });
      return;
    }

    const themeColor = theme.getThemeColor();
    const fabStyle = theme.makeFabStyle(themeColor);
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    const hasTabBar = !!(tabBar && typeof tabBar.refreshTabs === 'function');
    if (hasTabBar) {
      if (typeof tabBar.refreshTabs === 'function') { tabBar.refreshTabs(); }
      if (typeof tabBar.syncWithRoute === 'function') { tabBar.syncWithRoute(); }
      if (typeof tabBar.setThemeColor === 'function') { tabBar.setThemeColor(themeColor); }
    }
    const deviceProfileClass = app && app.globalData ? (app.globalData.deviceProfileClass || '') : (wx.getStorageSync('deviceProfileClass') || '');
    const isTablet = app && app.globalData ? !!app.globalData.isTablet : !!wx.getStorageSync('isTablet');
    const sys = wx.getSystemInfoSync ? wx.getSystemInfoSync() : null;
    const windowHeight = sys && sys.windowHeight ? sys.windowHeight : 0;
    const tabBarHeight = (sys && sys.safeArea) ? (sys.screenHeight - sys.safeArea.bottom) : 0;
    const headerFooter = 140; // dialog header + footer + margins
    const reserve = tabBarHeight > 0 ? tabBarHeight : 0;
    let bodyMinHeight = windowHeight ? Math.max(windowHeight - headerFooter - reserve, 360) : 480;
    const maxHeight = Math.round(windowHeight * 0.8);
    if (maxHeight > 0 && bodyMinHeight > maxHeight) {
      bodyMinHeight = maxHeight;
    }

    this.setData({
      loading: true,
      themeColor,
      fabStyle,
      showFallbackNav: !hasTabBar,
      deviceProfileClass,
      isTablet,
      bodyMinHeight: bodyMinHeight > 0 ? bodyMinHeight : windowHeight
    });
    wx.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#ffffff',
      animation: { duration: 0, timingFunc: 'linear' }
    });

    try {
      const [ulist, blist] = await Promise.all([
        req.get('/api/user/list'),
        req.get('/api/base/list')
      ]);
      const rawUsers = (Array.isArray(ulist) ? ulist : (ulist.records || [])).map(mapUserRecord);
      const bases = Array.isArray(blist) ? blist : (blist.records || blist || []);
      const baseFilterOptions = [{ value: 'all', label: '全部基地' }].concat(
        bases.map(b => ({ value: b.id, label: b.name }))
      );
      this.setData({
        rawList: rawUsers,
        bases,
        baseFilterOptions
      });
      this.applyFilters();
    } catch (err) {
      console.error('load users failed', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ list: [] });
    } finally {
      this.setData({ loading: false });
      const fallbackNav = this.selectComponent('#fallback-nav');
      if (fallbackNav && typeof fallbackNav.setThemeColor === 'function') {
        fallbackNav.setThemeColor(themeColor);
      }
    }
  },
  onPullDownRefresh() {
    this.onShow()
      .catch(() => {})
      .finally(() => { wx.stopPullDownRefresh(); });
  },
  filterUsers(list = this.data.rawList, filters = this.data.filters) {
    const keyword = (filters.keyword || '').trim().toLowerCase();
    const role = filters.role || 'all';
    const baseRaw = filters.base || 'all';
    const base = baseRaw === 'all' ? 'all' : Number(baseRaw);
    return list.filter(item => {
      if (role !== 'all' && item.role !== role) return false;
      if (base !== 'all') {
        const ids = Array.isArray(item.baseIds) ? item.baseIds : [];
        const matched = ids.some(id => Number(id) === base);
        if (!matched) return false;
      }
      if (!keyword) return true;
      const haystack = [
        item.name,
        item.roleLabel,
        item.baseNames,
        item.phone,
        item.email,
        item.visaType,
        item.passportNo,
        item.idCard
      ].join(' ').toLowerCase();
      return haystack.includes(keyword);
    });
  },
  applyFilters() {
    const list = this.filterUsers();
    this.setData({ list });
  },
  onSearchInput(e) {
    this.setData({ 'filters.keyword': (e.detail.value || '').trim() });
    this.applyFilters();
  },
  onSearchConfirm() {
    this.applyFilters();
  },
  onRoleFilterChange(e) {
    const index = Number(e.detail.value);
    const option = this.data.roleFilterOptions[index] || this.data.roleFilterOptions[0];
    this.setData({
      roleFilterIndex: index,
      'filters.role': option.value
    });
    this.applyFilters();
  },
  onBaseFilterChange(e) {
    const index = Number(e.detail.value);
    const option = this.data.baseFilterOptions[index] || this.data.baseFilterOptions[0];
    const value = option.value === 'all' ? 'all' : Number(option.value);
    this.setData({
      baseFilterIndex: index,
      'filters.base': value
    });
    this.applyFilters();
  },
  onResetFilters() {
    this.setData({
      filters: { keyword: '', role: 'all', base: 'all' },
      roleFilterIndex: 0,
      baseFilterIndex: 0
    });
    this.applyFilters();
  },
  openCreate() {
    const baseMap = {};
    const defaultRoleIndex = this.data.roleOptions.findIndex(o => o.value === 'base_agent');
    this.setData({
      formOpen: true,
      form: cloneForm(),
      formErrors: {},
      rolePickerIndex: defaultRoleIndex >= 0 ? defaultRoleIndex : 0,
      checkedBaseIds: baseMap
    });
  },
  closeForm() {
    this.setData({ formOpen: false, formErrors: {} });
  },
  onNameInput(e) {
    this.setData({ 'form.name': e.detail.value });
  },
  onPhoneInput(e) {
    this.setData({ 'form.phone': e.detail.value });
  },
  onEmailInput(e) {
    this.setData({ 'form.email': e.detail.value });
  },
  onVisaInput(e) {
    this.setData({ 'form.visa_type': e.detail.value });
  },
  onPassportInput(e) {
    this.setData({ 'form.passport_no': e.detail.value });
  },
  onIdCardInput(e) {
    this.setData({ 'form.id_card': e.detail.value });
  },
  onEmergencyContactInput(e) {
    this.setData({ 'form.emergency_contact': e.detail.value });
  },
  onEmergencyPhoneInput(e) {
    this.setData({ 'form.emergency_phone': e.detail.value });
  },
  onRemarkInput(e) {
    this.setData({ 'form.remark': e.detail.value });
  },
  onPasswordInput(e) {
    this.setData({ 'form.password': e.detail.value });
  },
  onJoinDateChange(e) {
    this.setData({ 'form.join_date': e.detail.value });
  },
  onRoleChange(e) {
    const index = Number(e.detail.value);
    const option = this.data.roleOptions[index];
    if (option) {
      this.setData({ rolePickerIndex: index, 'form.role': option.value });
    }
  },
  onBaseCheckboxChange(e) {
    const values = (e.detail.value || []).map(val => (typeof val === 'number' ? val : Number(val)));
    const checked = {};
    values.forEach(id => { checked[id] = true; });
    this.setData({
      checkedBaseIds: checked,
      'form.base_ids': values
    });
  },
  validateForm() {
    const form = this.data.form;
    const errors = {};
    if (!form.name) {
      errors.name = '请输入用户名';
    }
    if (!form.role) {
      errors.role = '请选择角色';
    }
    if (!form.base_ids || form.base_ids.length === 0) {
      errors.base_ids = '至少选择一个基地';
    }
    if (!form.id && !form.password) {
      errors.password = '请设置初始密码';
    }
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      errors.email = '邮箱格式不正确';
    }
    if (Object.keys(errors).length) {
      this.setData({ formErrors: errors });
      const firstKey = Object.keys(errors)[0];
      wx.showToast({ title: errors[firstKey] || '请完善信息', icon: 'none' });
      return false;
    }
    this.setData({ formErrors: {} });
    return true;
  },
  async save() {
    if (!this.validateForm()) return;
    this.setData({ saving: true });
    const payload = Object.assign({}, this.data.form);
    if (payload.id && !payload.password) {
      delete payload.password;
    }
    try {
      if (payload.id) {
        await req.put('/api/user/update?id=' + payload.id, payload);
      } else {
        await req.post('/api/user/create', payload);
      }
      wx.showToast({ title: '已保存', icon: 'success' });
      this.closeForm();
      await this.onShow();
    } catch (err) {
      console.error('save user failed', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },
  async onEdit(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    try {
      const detail = await req.get('/api/user/get?id=' + id);
      const baseIds = (detail.bases || []).map(b => Number(b.id));
      const checked = {};
      baseIds.forEach(itemId => { checked[itemId] = true; });
      const roleIndex = this.data.roleOptions.findIndex(opt => opt.value === detail.role);
      const form = cloneForm({
        id: detail.id,
        name: detail.name || '',
        role: detail.role || 'base_agent',
        base_ids: baseIds,
        phone: detail.phone || detail.mobile || '',
        email: detail.email || '',
        join_date: normaliseDate(detail.join_date || detail.joined_at),
        visa_type: detail.visa_type || '',
        passport_no: detail.passport_no || '',
        id_card: detail.id_card || '',
        emergency_contact: detail.emergency_contact || '',
        emergency_phone: detail.emergency_phone || '',
        remark: detail.remark || detail.notes || ''
      });
      this.setData({
        formOpen: true,
        form,
        checkedBaseIds: checked,
        formErrors: {},
        rolePickerIndex: roleIndex >= 0 ? roleIndex : this.data.rolePickerIndex
      });
    } catch (err) {
      console.error('load user detail failed', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },
  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      confirmText: '删除',
      success: async (res) => {
        if (res.confirm) {
          try {
            await req.del('/api/user/delete?id=' + id);
            wx.showToast({ title: '已删除' });
            await this.onShow();
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  }
});
