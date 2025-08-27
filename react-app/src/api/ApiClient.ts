import useAuthStore from "../auth/AuthStore";
import { getValidAccessTokenOrRefresh } from "../utils/authToken";
import {
  LoginRequest,
  LoginResponse,
  ChangePasswordRequest,
  BaseExpense,
  BaseExpenseListRequest,
  BaseExpenseListResponse,
  BaseExpenseStatsRequest,
  BaseExpenseStatsResponse,
  Purchase,
  PurchaseListResponse,
  Base,
  BaseSection,
  BaseListResponse,
  User,
  UserListResponse,
  ApiResponse
} from './AppDtos';

// 登录接口
export const login = async (name: string, password: string): Promise<LoginResponse> => {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  const response = await fetch(`${apiUrl}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, password } as LoginRequest)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP ${response.status}`);
  }
  
  return response.json() as Promise<LoginResponse>;
};

// 通用API调用函数
const apiCall = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const token = await getValidAccessTokenOrRefresh();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP ${response.status}`);
  }
  
  return response.json() as Promise<T>;
};

// 费用管理API
export const expenseApi = {
  // 创建费用记录
  create: (data: Omit<BaseExpense, 'id' | 'created_by' | 'creator_name' | 'created_at' | 'updated_at'>): Promise<BaseExpense> => {
    return apiCall('/api/expense/create', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  // 查询费用记录
  list: (params?: BaseExpenseListRequest): Promise<{ data: BaseExpense[]; total: number; page: number; page_size: number }> => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    console.log('API请求参数:', params);
    console.log('API请求URL:', `/api/expense/list${query}`);
    
    return apiCall<BaseExpense[]>(`/api/expense/list${query}`).then(expenses => {
      console.log('后端返回的原始数据:', expenses);
      console.log('数据类型:', typeof expenses, '是否为数组:', Array.isArray(expenses));
      
      // 后端直接返回所有匹配的数组数据，前端进行分页处理
      const pageSize = params?.page_size || 20;
      const currentPage = params?.page || 1;
      
      // 确保数据是数组
      const expenseArray = Array.isArray(expenses) ? expenses : [];
      console.log('处理后的数组数据:', expenseArray);
      
      // 确保数据按日期倒序排列（最新的在前面）
      const sortedExpenses = expenseArray.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log('排序后的数据:', sortedExpenses);
      
      // 前端分页处理
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = sortedExpenses.slice(startIndex, endIndex);
      
      const result = {
        data: paginatedData,
        total: sortedExpenses.length,
        page: currentPage,
        page_size: pageSize
      };
      
      console.log('最终返回结果:', result);
      return result;
    });
  },
  
  // 更新费用记录
  update: (id: number, data: Partial<BaseExpense>): Promise<BaseExpense> => {
    return apiCall(`/api/expense/update?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  // 费用统计
  stats: (month: string, base?: string): Promise<BaseExpenseStatsResponse> => {
    const params = new URLSearchParams({ month });
    if (base) params.set('base', base);
    return apiCall(`/api/expense/stats?${params.toString()}`);
  },

  // 删除费用记录
  delete: (id: number): Promise<ApiResponse> => {
    return apiCall(`/api/expense/delete?id=${id}`, {
      method: 'DELETE'
    });
  },

  // 批量删除费用记录
  batchDelete: (ids: number[]): Promise<ApiResponse> => {
    return apiCall('/api/expense/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids })
    });
  }
};

// 采购管理API
export const purchaseApi = {
  // 创建采购记录
  create: (data: Omit<Purchase, 'id' | 'created_by' | 'creator_name' | 'created_at' | 'updated_at'>): Promise<Purchase> => {
    return apiCall('/api/purchase/create', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  // 查询采购记录
  list: (params?: any): Promise<{ data: Purchase[] }> => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    console.log('采购API请求参数:', params);
    console.log('采购API请求URL:', `/api/purchase/list${query}`);
    
    return apiCall<Purchase[]>(`/api/purchase/list${query}`).then(purchases => {
      console.log('采购API原始返回数据:', purchases);
      console.log('采购数据数组长度:', purchases?.length || 0);
      
      // 确保返回的数据是数组
      const dataArray = Array.isArray(purchases) ? purchases : [];
      console.log('采购处理后数据数组长度:', dataArray.length);
      
      // 按日期排序，最新的在前
      const sortedPurchases = dataArray.sort((a, b) => {
        const dateA = new Date(a.purchase_date || 0);
        const dateB = new Date(b.purchase_date || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log('采购排序后数据:', sortedPurchases);
      
      const result = { data: sortedPurchases };
      console.log('采购最终返回结果:', result);
      return result;
    });
  },

  // 更新采购记录
  update: (id: number, data: Partial<Purchase>): Promise<Purchase> => {
    return apiCall(`/api/purchase/update?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // 删除采购记录
  delete: (id: number): Promise<ApiResponse> => {
    return apiCall(`/api/purchase/delete?id=${id}`, {
      method: 'DELETE'
    });
  },

  // 批量删除采购记录
  batchDelete: (ids: number[]): Promise<ApiResponse> => {
    return apiCall('/api/purchase/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids })
    });
  }
};

// 人员管理API
export const userApi = {
  // 修改密码
  changePassword: (oldPwd: string, newPwd: string): Promise<ApiResponse> => {
    return apiCall('/api/user/change_password', {
      method: 'POST',
      body: JSON.stringify({ old_pwd: oldPwd, new_pwd: newPwd } as ChangePasswordRequest)
    });
  }
};

// 基地分区管理API
export const baseSectionApi = {
  // 创建基地分区
  create: (data: Omit<BaseSection, 'id' | 'created_by' | 'created_at' | 'updated_at'>): Promise<BaseSection> => {
    return apiCall('/api/base-section/create', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  // 查询基地分区列表
  list: (params?: any): Promise<BaseSection[]> => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiCall<BaseSection[]>(`/api/base-section/list${query}`);
  },

  // 获取单个基地分区
  get: (id: number): Promise<BaseSection> => {
    return apiCall(`/api/base-section/get?id=${id}`);
  },

  // 更新基地分区
  update: (id: number, data: Partial<BaseSection>): Promise<BaseSection> => {
    return apiCall(`/api/base-section/update?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // 删除基地分区
  delete: (id: number): Promise<ApiResponse> => {
    return apiCall(`/api/base-section/delete?id=${id}`, {
      method: 'DELETE'
    });
  }
};

// 基地管理API
export const baseApi = {
  // 创建基地
  create: (data: Omit<Base, 'id' | 'created_by' | 'created_at' | 'updated_at'>): Promise<Base> => {
    return apiCall('/api/base/create', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  // 查询基地列表
  list: (params?: any): Promise<Base[]> => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiCall<Base[]>(`/api/base/list${query}`);
  },

  // 获取单个基地
  get: (id: number): Promise<Base> => {
    return apiCall(`/api/base/get?id=${id}`);
  },

  // 更新基地
  update: (id: number, data: Partial<Base>): Promise<Base> => {
    return apiCall(`/api/base/update?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // 删除基地
  delete: (id: number): Promise<ApiResponse> => {
    return apiCall(`/api/base/delete?id=${id}`, {
      method: 'DELETE'
    });
  },

  // 批量删除基地
  batchDelete: (ids: number[]): Promise<ApiResponse> => {
    return apiCall('/api/base/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids })
    });
  }
};

// 人员管理API
export const userManagementApi = {
  // 创建用户
  create: (data: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> => {
    return apiCall('/api/user/create', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  // 查询用户列表
  list: (params?: any): Promise<User[]> => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiCall<User[]>(`/api/user/list${query}`);
  },

  // 获取单个用户
  get: (id: number): Promise<User> => {
    return apiCall(`/api/user/get?id=${id}`);
  },

  // 更新用户
  update: (id: number, data: Partial<User>): Promise<User> => {
    return apiCall(`/api/user/update?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // 删除用户
  delete: (id: number): Promise<ApiResponse> => {
    return apiCall(`/api/user/delete?id=${id}`, {
      method: 'DELETE'
    });
  },

  // 批量删除用户
  batchDelete: (ids: number[]): Promise<ApiResponse> => {
    return apiCall('/api/user/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids })
    });
  },

  // 重置用户密码
  resetPassword: (id: number, newPassword: string): Promise<ApiResponse> => {
    return apiCall(`/api/user/reset-password?id=${id}`, {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword })
    });
  }
};

const ApiClient = {
  login,
  expense: expenseApi,
  purchase: purchaseApi,
  user: userApi,
  base: baseApi,
  baseSection: baseSectionApi,
  userManagement: userManagementApi
};

export default ApiClient;
