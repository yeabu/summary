import useAuthStore from "../auth/AuthStore";
import { getValidAccessTokenOrRefresh } from "../utils/authToken";
import { API_URL } from "@/config";

// 应付款记录类型定义
export interface PayableRecord {
  id: number;
  purchase_entry_id?: number;
  supplier_id?: number; // 供应商ID
  supplier?: string | {
    id: number;
    name: string;
    settlement_type?: 'immediate' | 'monthly' | 'flexible';
    settlement_day?: number;
  }; // 供应商对象或名称
  base_id: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'pending' | 'partial' | 'paid';
  currency?: string; // 币种代码，例如 CNY/LAK/THB
  due_date?: string;
  period_month?: string;
  period_half?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  purchase_entry?: {
    id: number;
    order_number: string;
    purchase_date: string;
    items?: Array<{
      id: number;
      product_name: string;
      quantity: number;
      unit_price: number;
      amount: number;
    }>;
  };
  links?: Array<{
    id: number;
    amount: number;
    created_at?: string;
    purchase_entry: {
      id: number;
      order_number: string;
      purchase_date: string;
      total_amount?: number;
    };
  }>;
  base?: {
    id: number;
    name: string;
  };
  creator?: {
    id: number;
    name: string;
  };
  payment_records?: PaymentRecord[];
}

// 还款记录类型定义
export interface PaymentRecord {
  id: number;
  payable_record_id: number;
  payment_amount: number;
  payment_date: string;
  payment_method: 'cash' | 'bank_transfer' | 'check' | 'other';
  reference_number?: string;
  notes?: string;
  created_by: number;
  created_at: string;
  creator?: {
    id: number;
    name: string;
  };
}

// 应付款列表响应
export interface PayableListResponse {
  records: PayableRecord[];
  total: number;
}

// 应付款统计响应
export interface PayableSummaryResponse {
  total_payable: number;
  total_paid: number;
  total_remaining: number;
  pending_count: number;
  partial_count: number;
  paid_count: number;
  overdue_count: number;
}

// 供应商统计响应
export interface SupplierPayableStats {
  supplier: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  record_count: number;
}

// 创建还款记录请求
export interface CreatePaymentRequest {
  payable_id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference: string;
  note: string;
}

// 还款记录列表响应
export interface PaymentListResponse {
  records: PaymentRecord[];
  total: number;
}

export class PayableApi {
  // 获取应付款列表
  async getPayableList(params?: {
    page?: number;
    limit?: number;
    supplier?: string;
    status?: string;
    base?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<PayableListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.supplier) queryParams.append('supplier', params.supplier);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.base) queryParams.append('base', params.base);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    const url = `/api/payable/list${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return apiCall<PayableListResponse>(url);
  }

  // 获取应付款详情
  async getPayableDetail(id: number): Promise<PayableRecord> {
    return apiCall<PayableRecord>(`/api/payable/detail?id=${id}`);
  }

  // 获取应付款统计
  async getPayableSummary(): Promise<PayableSummaryResponse> {
    return apiCall<PayableSummaryResponse>('/api/payable/summary');
  }

  // 按供应商统计
  async getPayableBySupplier(params?: { month?: string; start_date?: string; end_date?: string }): Promise<SupplierPayableStats[]> {
    const q = new URLSearchParams();
    if (params?.month) q.append('month', params.month);
    if (params?.start_date) q.append('start_date', params.start_date);
    if (params?.end_date) q.append('end_date', params.end_date);
    const url = `/api/payable/by-supplier${q.toString() ? '?' + q.toString() : ''}`;
    return apiCall<SupplierPayableStats[]>(url);
  }

  // 获取超期应付款
  async getOverduePayables(): Promise<PayableRecord[]> {
    return apiCall<PayableRecord[]>('/api/payable/overdue');
  }

  // 删除应付款（仅管理员）
  async deletePayable(id: number): Promise<void> {
    await apiCall('/api/payable/delete?id=' + id, {
      method: 'DELETE',
    });
  }

  // 创建还款记录
  async createPayment(data: CreatePaymentRequest): Promise<PaymentRecord> {
    return apiCall<PaymentRecord>('/api/payment/create', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // 获取还款记录列表
  async getPaymentList(params?: {
    page?: number;
    limit?: number;
    payable_id?: number;
    supplier?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<PaymentListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.payable_id) queryParams.append('payable_id', params.payable_id.toString());
    if (params?.supplier) queryParams.append('supplier', params.supplier);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    const url = `/api/payment/list${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return apiCall<PaymentListResponse>(url);
  }

  // 删除还款记录（仅管理员）
  async deletePayment(id: number): Promise<void> {
    await apiCall(`/api/payment/delete?id=${id}`, {
      method: 'DELETE'
    });
  }

  // 更新应付款状态（仅管理员）
  async updatePayableStatus(id: number, status: string): Promise<void> {
    await apiCall(`/api/payable/update-status?id=${id}`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
  }
}

// 状态显示文本映射
export const PayableStatusText = {
  pending: '待付款',
  partial: '部分付款',
  paid: '已付清'
};

// 还款方式显示文本映射
export const PaymentMethodText = {
  cash: '现金',
  bank_transfer: '银行转账',
  check: '支票',
  other: '其他'
};

// 修改apiCall函数
const apiCall = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const apiUrl = API_URL;
  
  // 使用与ApiClient.ts中相同的token获取机制
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
