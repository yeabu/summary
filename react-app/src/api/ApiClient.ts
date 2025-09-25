import { getValidAccessTokenOrRefresh } from "../utils/authToken";

// 基地类型定义
export interface Base {
  id: number;
  name: string;
  code: string;
  location?: string;
  description?: string;
  status: string;
  currency?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

// 基地区域类型定义
export interface BaseSection {
  id: number;
  name: string;
  base_id: number;
  base?: Base;
  captain_id?: number;
  captain_name?: string;
  area?: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

// 用户类型定义
export interface User {
  id: number;
  name: string;
  role: string;
  base_ids?: number[];  // 用户关联的基地ID列表
  bases?: Base[];       // 用户关联的基地列表
  join_date?: string;
  mobile?: string;
  passport_number?: string;
  visa_expiry_date?: string;
  created_at: string;
  updated_at: string;
}

// 采购记录类型定义
export interface PurchaseEntry {
  id: number;
  supplier_id?: number; // 供应商ID
  supplier?: string; // 供应商名称（关联字段）
  order_number: string;
  purchase_date: string;
  total_amount: number;
  currency?: string;
  receiver: string;
  base_id: number;
  base?: Base;
  created_by: number;
  creator_name: string;
  created_at: string;
  updated_at: string;
  items: PurchaseEntryItem[];
  receipt_path?: string;
}

// 采购明细类型定义
export interface PurchaseEntryItem {
  id: number;
  purchase_entry_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

// 费用记录类型定义
export interface ExpenseEntry {
  id: number;
  date: string;
  category: string;
  category_id: number;  // 添加category_id字段
  amount: number;
  currency?: string;
  detail: string;
  base_id: number;
  base?: Base;
  created_by: number;
  creator_name: string;
  created_at: string;
  updated_at: string;
  receipt_path?: string;
}

// 供应商类型定义
export interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

// 库存记录
export interface InventoryRecord {
  product_name: string;
  product_spec: string;
  product_unit: string;
  unit_price: number;
  currency?: string;
  stock_quantity: number;
  supplier: string;
}

// 物资申领记录
export interface MaterialRequisition {
  id: number;
  base_id: number;
  base?: Base;
  product_id: number;
  product?: { id: number; name: string; spec: string; base_unit: string };
  product_name: string;
  unit_price: number;
  quantity_base: number;
  total_amount: number;
  currency?: string;
  request_date: string;
  requested_by: number;
  requester?: User;
  created_at: string;
  updated_at: string;
  receipt_path?: string;
}

// 费用类别类型定义
export interface ExpenseCategory {
  id: number;
  name: string;
  code?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export class ApiClient {
  private apiUrl = import.meta.env.VITE_API_URL;

  // 基地管理API
  async baseCreate(data: Omit<Base, 'id' | 'created_at' | 'updated_at'>): Promise<Base> {
    return this.apiCall<Base>('/api/base/create', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async baseList(): Promise<Base[]> {
    return this.apiCall<Base[]>('/api/base/list');
  }

  async baseGet(id: number): Promise<Base> {
    return this.apiCall<Base>(`/api/base/get?id=${id}`);
  }

  async baseUpdate(id: number, data: Partial<Omit<Base, 'id' | 'created_at' | 'updated_at'>>): Promise<Base> {
    return this.apiCall<Base>(`/api/base/update?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async baseDelete(id: number): Promise<void> {
    await this.apiCall(`/api/base/delete?id=${id}`, {
      method: 'DELETE'
    });
  }

  async baseBatchDelete(ids: number[]): Promise<{ deleted_count: number }> {
    return this.apiCall<{ deleted_count: number }>('/api/base/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids })
    });
  }

  // 基地区域管理API
  async sectionCreate(data: Omit<BaseSection, 'id' | 'created_at' | 'updated_at'>): Promise<BaseSection> {
    return this.apiCall<BaseSection>('/api/base-section/create', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async sectionList(base_id?: number): Promise<BaseSection[]> {
    const params = new URLSearchParams();
    if (base_id) params.append('base_id', base_id.toString());
    return this.apiCall<BaseSection[]>(`/api/base-section/list?${params.toString()}`);
  }

  async sectionGet(id: number): Promise<BaseSection> {
    return this.apiCall<BaseSection>(`/api/base-section/get?id=${id}`);
  }

  async sectionUpdate(id: number, data: Partial<Omit<BaseSection, 'id' | 'created_at' | 'updated_at'>>): Promise<BaseSection> {
    return this.apiCall<BaseSection>(`/api/base-section/update?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async sectionDelete(id: number): Promise<void> {
    await this.apiCall(`/api/base-section/delete?id=${id}`, {
      method: 'DELETE'
    });
  }

  // 用户管理API
  async userCreate(data: Omit<User, 'id' | 'created_at' | 'updated_at' | 'bases'> & { 
    base_ids?: number[];
    password: string;
  }): Promise<User> {
    // 转换数据结构以匹配后端API
    const requestData = {
      name: data.name,
      role: data.role,
      base_ids: data.base_ids || [], // 使用base_ids而不是base_id
      password: data.password,
      join_date: data.join_date,
      mobile: data.mobile,
      passport_number: data.passport_number,
      visa_expiry_date: data.visa_expiry_date
    };
    
    return this.apiCall<User>('/api/user/create', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  }

  async userList(): Promise<User[]> {
    return this.apiCall<User[]>('/api/user/list');
  }

  async userGet(id: number): Promise<User> {
    return this.apiCall<User>(`/api/user/get?id=${id}`);
  }

  async userUpdate(id: number, data: Partial<Omit<User, 'id' | 'created_at' | 'updated_at' | 'bases'>> & { 
    base_ids?: number[];
    password?: string; // 添加password字段到类型定义中
  }): Promise<User> {
    // 转换数据结构以匹配后端API
    const requestData = {
      name: data.name,
      role: data.role,
      base_ids: data.base_ids || [], // 使用base_ids而不是base_id
      join_date: data.join_date,
      mobile: data.mobile,
      passport_number: data.passport_number,
      visa_expiry_date: data.visa_expiry_date
    };
    
    // 只有在密码不为空时才添加到请求数据中
    if (data.password) {
      (requestData as any).password = data.password;
    }
    
    return this.apiCall<User>(`/api/user/update?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(requestData)
    });
  }

  // 库存相关API
  async inventoryList(params?: { q?: string }): Promise<InventoryRecord[]> {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    const qs = search.toString();
    return this.apiCall<InventoryRecord[]>(`/api/inventory/list${qs ? `?${qs}` : ''}`);
  }

  async requisitionCreate(data: { base_id: number; product_id: number; quantity: number; unit?: string; unit_price?: number; request_date?: string; }): Promise<MaterialRequisition> {
    return this.apiCall<MaterialRequisition>(`/api/inventory/requisition/create`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async requisitionUpdate(id: number, data: { base_id: number; product_id: number; quantity: number; unit?: string; unit_price?: number; request_date?: string; }): Promise<MaterialRequisition> {
    return this.apiCall<MaterialRequisition>(`/api/inventory/requisition/update?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async requisitionDelete(id: number): Promise<void> {
    await this.apiCall(`/api/inventory/requisition/delete?id=${id}`, { method: 'DELETE' });
  }

  async requisitionList(params?: { base_id?: number; product_id?: number; q?: string; date_from?: string; date_to?: string; }): Promise<MaterialRequisition[]> {
    const search = new URLSearchParams();
    if (params?.base_id) search.set('base_id', String(params.base_id));
    if (params?.product_id) search.set('product_id', String(params.product_id));
    if (params?.q) search.set('q', params.q);
    if (params?.date_from) search.set('date_from', params.date_from);
    if (params?.date_to) search.set('date_to', params.date_to);
    const qs = search.toString();
    return this.apiCall<MaterialRequisition[]>(`/api/inventory/requisition/list${qs ? `?${qs}` : ''}`);
  }

  // 上传采购票据
  async uploadPurchaseReceipt(params: { purchase_id?: number; date?: string; file: File }): Promise<{ path: string; purchase?: PurchaseEntry }> {
    const token = await getValidAccessTokenOrRefresh();
    const form = new FormData();
    if (params.purchase_id) form.append('purchase_id', String(params.purchase_id));
    if (params.date) form.append('date', params.date);
    form.append('file', params.file);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${this.apiUrl}/api/purchase/upload-receipt`, { method: 'POST', headers, body: form });
    if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
    return res.json();
  }

  // 上传申领票据
  async uploadRequisitionReceipt(params: { requisition_id?: number; date?: string; file: File }): Promise<{ path: string; requisition?: MaterialRequisition }> {
    const token = await getValidAccessTokenOrRefresh();
    const form = new FormData();
    if (params.requisition_id) form.append('requisition_id', String(params.requisition_id));
    if (params.date) form.append('date', params.date);
    form.append('file', params.file);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${this.apiUrl}/api/inventory/requisition/upload-receipt`, { method: 'POST', headers, body: form });
    if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
    return res.json();
  }

  async userDelete(id: number): Promise<void> {
    await this.apiCall(`/api/user/delete?id=${id}`, {
      method: 'DELETE'
    });
  }

  async userBatchDelete(ids: number[]): Promise<{ deleted_count: number }> {
    return this.apiCall<{ deleted_count: number }>('/api/user/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids })
    });
  }

  async userResetPassword(id: number, password: string): Promise<void> {
    await this.apiCall(`/api/user/reset-password?id=${id}`, {
      method: 'POST',
      body: JSON.stringify({ password })
    });
  }

  // 采购管理API
  async createPurchase(data: Omit<PurchaseEntry, 'id' | 'created_at' | 'updated_at' | 'items' | 'creator_name' | 'created_by'> & { 
    items: Omit<PurchaseEntryItem, 'id' | 'purchase_entry_id'>[] 
  }): Promise<PurchaseEntry> {
    // 转换数据结构以匹配后端API
    const requestData = {
      supplier_id: data.supplier_id,
      order_number: data.order_number,
      purchase_date: data.purchase_date,
      total_amount: data.total_amount,
      currency: data.currency,
      receiver: data.receiver,
      base_id: data.base_id, // 使用base_id而不是base对象
      items: data.items
    };
    
    return this.apiCall<PurchaseEntry>('/api/purchase/create', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  }

  async listPurchase(filters?: {
    base?: string;
    supplier?: string;
    order_number?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<PurchaseEntry[]> {
    const params = new URLSearchParams();
    if (filters?.base) params.append('base', filters.base);
    if (filters?.supplier) params.append('supplier', filters.supplier);
    if (filters?.order_number) params.append('order_number', filters.order_number);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    
    return this.apiCall<PurchaseEntry[]>(`/api/purchase/list?${params.toString()}`);
  }

  async deletePurchase(id: number): Promise<void> {
    await this.apiCall(`/api/purchase/delete?id=${id}`, {
      method: 'DELETE'
    });
  }

  async batchDeletePurchase(ids: number[]): Promise<{ deleted_count: number }> {
    return this.apiCall<{ deleted_count: number }>('/api/purchase/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids })
    });
  }

  // 添加更新采购记录的方法
  async updatePurchase(id: number, data: Omit<PurchaseEntry, 'id' | 'created_at' | 'updated_at' | 'items' | 'creator_name' | 'created_by'> & { 
    items: Omit<PurchaseEntryItem, 'id' | 'purchase_entry_id'>[] 
  }): Promise<PurchaseEntry> {
    // 转换数据结构以匹配后端API
    const requestData = {
      supplier_id: data.supplier_id,
      order_number: data.order_number,
      purchase_date: data.purchase_date,
      total_amount: data.total_amount,
      currency: data.currency,
      receiver: data.receiver,
      base_id: data.base_id, // 使用base_id而不是base对象
      items: data.items
    };
    
    return this.apiCall<PurchaseEntry>(`/api/purchase/update?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(requestData)
    });
  }

  // 费用管理API
  async createExpense(data: Omit<ExpenseEntry, 'id' | 'created_at' | 'updated_at' | 'creator_name' | 'created_by'>): Promise<ExpenseEntry> {
    // 转换数据结构以匹配后端API
    const requestData = {
      date: data.date,
      category_id: data.category_id, // 修改为category_id
      amount: data.amount,
      detail: data.detail,
      base_id: data.base_id // 使用base_id而不是base对象
    };
    
    return this.apiCall<ExpenseEntry>('/api/expense/create', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  }

  async listExpense(filters?: {
    base?: string;
    category?: string;
    category_id?: number; // 添加category_id筛选参数
    start_date?: string;
    end_date?: string;
  }): Promise<ExpenseEntry[]> {
    const params = new URLSearchParams();
    if (filters?.base) params.append('base', filters.base);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.category_id) params.append('category_id', filters.category_id.toString()); // 添加category_id参数
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    
    return this.apiCall<ExpenseEntry[]>(`/api/expense/list?${params.toString()}`);
  }

  async updateExpense(id: number, data: Partial<Omit<ExpenseEntry, 'id' | 'created_at' | 'updated_at' | 'creator_name' | 'created_by'>>): Promise<ExpenseEntry> {
    // 转换数据结构以匹配后端API
    const requestData = {
      date: data.date,
      category_id: data.category_id, // 修改为category_id
      amount: data.amount,
      detail: data.detail
    };
    
    return this.apiCall<ExpenseEntry>(`/api/expense/update?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(requestData)
    });
  }

  // 上传开支票据
  async uploadExpenseReceipt(params: { expense_id?: number; date?: string; file: File }): Promise<{ path: string; expense?: ExpenseEntry }> {
    const token = await getValidAccessTokenOrRefresh();
    const form = new FormData();
    if (params.expense_id) form.append('expense_id', String(params.expense_id));
    if (params.date) form.append('date', params.date);
    form.append('file', params.file);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${this.apiUrl}/api/expense/upload-receipt`, {
      method: 'POST',
      headers, // 不设置 Content-Type，让浏览器自动带上 multipart 边界
      body: form,
    });
    if (!res.ok) {
      throw new Error(await res.text() || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async deleteExpense(id: number): Promise<void> {
    await this.apiCall(`/api/expense/delete?id=${id}`, {
      method: 'DELETE'
    });
  }

  async batchDeleteExpense(ids: number[]): Promise<{ deleted_count: number }> {
    return this.apiCall<{ deleted_count: number }>('/api/expense/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids })
    });
  }

  async batchCreateExpense(payload: { base_id?: number; items: Array<{ date: string; category_id: number; amount: number; detail?: string; base_id?: number }> }): Promise<{ created: ExpenseEntry[]; failed: number; message: string }> {
    return this.apiCall<{ created: ExpenseEntry[]; failed: number; message: string }>(`/api/expense/batch-create`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async statExpense(params?: {
    base?: string;
    category?: string;
    month?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<any> {
    const searchParams = new URLSearchParams();
    if (params?.base) searchParams.append('base', params.base);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.month) searchParams.append('month', params.month);
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);
    
    return this.apiCall<any>(`/api/expense/stats?${searchParams.toString()}`);
  }

  // 费用类别管理API
  async createExpenseCategory(data: Omit<ExpenseCategory, 'id' | 'created_at' | 'updated_at'>): Promise<ExpenseCategory> {
    return this.apiCall<ExpenseCategory>('/api/expense-category/create', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async listExpenseCategories(status?: 'active' | 'inactive'): Promise<ExpenseCategory[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    return this.apiCall<ExpenseCategory[]>(`/api/expense-category/list?${params.toString()}`);
  }

  async getExpenseCategory(id: number): Promise<ExpenseCategory> {
    return this.apiCall<ExpenseCategory>(`/api/expense-category/get?id=${id}`);
  }

  async updateExpenseCategory(id: number, data: Partial<Omit<ExpenseCategory, 'id' | 'created_at' | 'updated_at'>>): Promise<ExpenseCategory> {
    return this.apiCall<ExpenseCategory>(`/api/expense-category/update?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteExpenseCategory(id: number): Promise<void> {
    await this.apiCall(`/api/expense-category/delete?id=${id}`, {
      method: 'DELETE'
    });
  }

  // 供应商管理API
  async getAllSuppliers(): Promise<Supplier[]> {
    return this.apiCall<Supplier[]>('/api/supplier/all');
  }

  async getSupplierList(params?: {
    page?: number;
    limit?: number;
    name?: string;
  }): Promise<{ records: Supplier[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.name) searchParams.append('name', params.name);
    
    return this.apiCall<{ records: Supplier[]; total: number }>(`/api/supplier/list?${searchParams.toString()}`);
  }

  async getSupplierDetail(id: number): Promise<Supplier> {
    return this.apiCall<Supplier>(`/api/supplier/detail?id=${id}`);
  }

  async createSupplier(data: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Promise<Supplier> {
    return this.apiCall<Supplier>('/api/supplier/create', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateSupplier(id: number, data: Partial<Omit<Supplier, 'id' | 'created_at' | 'updated_at'>>): Promise<Supplier> {
    return this.apiCall<Supplier>(`/api/supplier/update?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteSupplier(id: number): Promise<void> {
    await this.apiCall(`/api/supplier/delete?id=${id}`, {
      method: 'DELETE'
    });
  }

  // API调用辅助函数
  private async apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // 获取有效token
    const token = await getValidAccessTokenOrRefresh();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}
