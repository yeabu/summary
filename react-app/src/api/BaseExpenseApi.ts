import axios from "axios";

export interface BaseExpense {
  id?: number;
  base: string;
  date: string;
  category: string;
  amount: number;
  detail?: string;
  created_by?: number;
  creator_name?: string;
  created_at?: string;
  updated_at?: string;
}

// 新增
export const createExpense = async (data: Omit<BaseExpense, 'id'>) => {
  return axios.post("/api/expense/create", data);
};

// 查询
export const fetchExpenseList = async (params: {
  base?: string;
  category?: string;
  month?: string; // '2024-06'
}) => {
  return axios.get("/api/expense/list", { params });
};

// 编辑（id做主键，实际需后端url处理）
export const updateExpense = async (id: number, data: Partial<BaseExpense>) => {
  return axios.post(`/api/expense/update?id=${id}`, data);
};

// 统计
export const fetchExpenseStats = async (params: { month: string; base?: string }) => {
  return axios.get("/api/expense/stats", { params });
};
