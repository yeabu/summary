import { getValidAccessTokenOrRefresh } from "../utils/authToken";
import { API_URL } from "@/config";

// 供应商类型定义
export interface Supplier {
  id: number;
  name: string;
  settlement_type?: 'immediate' | 'monthly' | 'flexible';
  settlement_day?: number;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

// 供应商列表响应
export interface SupplierListResponse {
  records: Supplier[];
  total: number;
}

// 创建供应商请求
export interface CreateSupplierRequest {
  name: string;
  settlement_type?: 'immediate' | 'monthly' | 'flexible';
  settlement_day?: number;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
}

// 更新供应商请求
export interface UpdateSupplierRequest {
  name?: string;
  settlement_type?: 'immediate' | 'monthly' | 'flexible';
  settlement_day?: number;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export class SupplierApi {
  private apiUrl = API_URL;

  // 获取供应商列表
  async getSupplierList(params?: {
    page?: number;
    limit?: number;
    name?: string;
  }): Promise<SupplierListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.name) queryParams.append('name', params.name);

    const url = `/api/supplier/list${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return this.apiCall<SupplierListResponse>(url);
  }

  // 获取所有供应商（不分页）
  async getAllSuppliers(): Promise<Supplier[]> {
    return this.apiCall<Supplier[]>('/api/supplier/all');
  }

  // 获取供应商详情
  async getSupplierDetail(id: number): Promise<Supplier> {
    return this.apiCall<Supplier>(`/api/supplier/detail?id=${id}`);
  }

  // 创建供应商
  async createSupplier(data: CreateSupplierRequest): Promise<Supplier> {
    return this.apiCall<Supplier>('/api/supplier/create', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // 更新供应商
  async updateSupplier(id: number, data: UpdateSupplierRequest): Promise<Supplier> {
    return this.apiCall<Supplier>(`/api/supplier/update?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // 删除供应商
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
