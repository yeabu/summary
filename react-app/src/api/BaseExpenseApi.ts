import axios from "axios";
import { Base, ExpenseCategory } from "@/api/AppDtos";

export interface BaseExpense {
  id?: number;
  base: Base;
  date: string;
  category: ExpenseCategory;  // 保持category对象用于显示
  category_id: number;        // 添加category_id字段用于提交
  amount: number;
  currency?: string;
  detail?: string;
  created_by?: number;
  creator_name?: string;
  created_at?: string;
  updated_at?: string;
}

// 新增
export const createExpense = async (data: Omit<BaseExpense, 'id' | 'category'>) => {
  return axios.post("/api/expense/create", data);
};

// 查询
export const fetchExpenseList = async (params: {
  base?: string;
  category?: string;
  category_id?: number;      // 添加category_id筛选参数
  month?: string; // '2024-06'
}) => {
  return axios.get("/api/expense/list", { params });
};

// 编辑（id做主键，实际需后端url处理）
export const updateExpense = async (id: number, data: Partial<Omit<BaseExpense, 'id' | 'category'>>) => {
  return axios.post(`/api/expense/update?id=${id}`, data);
};

// 统计
export const fetchExpenseStats = async (params: { month: string; base?: string }) => {
  return axios.get("/api/expense/stats", { params });
};
