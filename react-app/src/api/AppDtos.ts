// API 数据传输对象的 TypeScript 接口定义
// 匹配Go后端的API结构

// 用户相关接口
export interface User {
  id?: number;
  name: string;
  role: 'admin' | 'base_agent' | 'captain' | 'factory_manager';
  base_ids?: number[];  // 用户关联的基地ID列表
  bases?: Base[];       // 用户关联的基地列表
  password?: string;  // 只在创建/更新时使用
  join_date?: string;        // 入司时间 (格式: YYYY-MM-DD)
  mobile?: string;           // 手机号
  passport_number?: string;  // 护照号
  visa_expiry_date?: string; // 签证到期时间 (格式: YYYY-MM-DD)
  created_at?: string;
  updated_at?: string;
}

export interface LoginRequest {
  name: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  role: string;
  bases: string[];  // 用户关联的基地代码列表
  user_id: number;
}

export interface ChangePasswordRequest {
  old_pwd?: string;
  new_pwd: string;
}

// 费用类别相关接口
export interface ExpenseCategory {
  id: number;
  name: string;
  code?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

// 费用记录相关接口
export interface BaseExpense {
  id?: number;
  date: string;
  category: ExpenseCategory;  // 保持category对象用于显示
  category_id: number;        // 添加category_id字段用于提交
  amount: number;
  base: Base;
  detail?: string;
  created_by?: number;
  creator_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BaseExpenseListRequest {
  base?: string;
  category?: string;
  category_id?: number;      // 添加category_id筛选参数
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

export interface BaseExpenseListResponse {
  data: BaseExpense[];
  total: number;
  page: number;
  page_size: number;
}

export interface BaseExpenseStatsRequest {
  month: string;
  base?: string;
}

export interface ExpenseStats {
  base: string;
  category: string;
  month: string;
  total: number;
}

export interface BaseExpenseStatsResponse {
  data: ExpenseStats[];
  summary: {
    total_amount: number;
    total_records: number;
    category_totals: Record<string, number>;
    base_totals: Record<string, number>;
  };
}

// 采购记录相关接口
export interface PurchaseItem {
  id?: number;
  purchase_entry_id?: number;
  product_name: string;
  unit?: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Purchase {
  id?: number;
  supplier: string;
  order_number: string;
  purchase_date: string;
  total_amount: number;
  receiver: string;
  base?: Base;  // 在表单中允许未选择（管理员需选择，提交时校验）
  base_id?: number;  // 添加base_id字段用于提交
  notes?: string;
  items: PurchaseItem[];
  created_by?: number;
  creator_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseListResponse {
  data: Purchase[];
  total: number;
}

// API响应通用接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationRequest {
  page?: number;
  page_size?: number;
}

export interface PaginationResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// 查询筛选接口
export interface FilterOptions {
  base?: string;
  category?: string;
  category_id?: number;      // 添加category_id筛选参数
  start_date?: string;
  end_date?: string;
  supplier?: string;
  order_number?: string;
}

// 基地管理相关接口
export interface Base {
  id?: number;
  name: string;
  code: string;
  location?: string;
  description?: string;
  status?: string;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

// 基地区域相关接口
export interface BaseSection {
  id?: number;
  name: string;
  base_id: number;
  base_name?: string;
  leader_id?: number;
  leader_name?: string;
  description?: string;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface BaseListResponse {
  data: Base[];
  total: number;
}

// 人员管理相关接口已在上面定义

export interface UserListResponse {
  data: User[];
  total: number;
}

// 导出选项接口
export interface ExportOptions {
  format: 'excel' | 'csv';
  filename?: string;
  filters?: FilterOptions;
}

// 统计图表数据接口
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
  }[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}
