import React, { useState, useEffect } from "react";
import { TextField, MenuItem, Button, Box, Typography, FormControl, InputLabel, Select, SelectChangeEvent, Stack } from "@mui/material";
import dayjs from 'dayjs';
import useAuthStore from '@/auth/AuthStore';
import { Base, ExpenseCategory } from '@/api/AppDtos';
import { ApiClient } from '@/api/ApiClient';

export interface ExpenseFormProps {
  initial?: Partial<{
    date: string;
    category_id: number;  // 修改为category_id
    amount: number;
    detail: string;
    base: Base;
  }>;
  onSubmit: (v: any) => void;
  submitting?: boolean;
  onCancel?: () => void;
}

export default function BaseExpenseForm({ initial, onSubmit, submitting, onCancel }: ExpenseFormProps) {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';
  
  const [bases, setBases] = useState<Base[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]); // 费用类别状态
  const [data, setData] = useState({
    date: initial?.date ?? dayjs().format("YYYY-MM-DD"),
    category_id: initial?.category_id || 0,  // 修改为category_id
    amount: initial?.amount ?? 0,
    detail: initial?.detail ?? "",
    base_id: initial?.base?.id || 0 // 对于管理员用户，默认不选择基地
  });

  // 加载基地列表
  useEffect(() => {
    const loadBases = async () => {
      if (isAdmin) {
        try {
          const apiClient = new ApiClient();
          const baseList = await apiClient.baseList();
          setBases(baseList);
          // 对于管理员用户，如果初始值中有基地信息，则设置基地ID
          if (initial?.base?.id) {
            setData(prev => ({ ...prev, base_id: initial.base?.id || 0 }));
          }
        } catch (error) {
          console.error('加载基地列表失败:', error);
        }
      }
    };
    
    loadBases();
  }, [isAdmin, initial?.base?.id]);

  // 加载费用类别列表
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const apiClient = new ApiClient();
        const categoryList = await apiClient.listExpenseCategories('active'); // 只加载有效的类别
        setCategories(categoryList);
        // 如果没有初始类别且有类别列表，设置默认值为第一个类别
        if (!initial?.category_id && categoryList.length > 0) {
          setData(prev => ({ ...prev, category_id: categoryList[0].id }));
        }
      } catch (error) {
        console.error('加载费用类别列表失败:', error);
      }
    };
    
    loadCategories();
  }, [initial?.category_id]);

  const handleBaseChange = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value as string;
    setData(prev => ({ ...prev, base_id: value === '' ? 0 : Number(value) }));
  };

  const handleCategoryChange = (event: SelectChangeEvent<number>) => {
    setData(prev => ({ ...prev, category_id: Number(event.target.value) }));
  };

  return (
    <Box component="form"
      sx={{
        display: "flex", flexDirection: "column", gap: 2, maxWidth: 360, p: 2
      }}
      onSubmit={e => {
        e.preventDefault();
        // 提交逻辑，传递正确的数据结构
        const submitData: any = {
          date: data.date,
          category_id: data.category_id,  // 修改为category_id
          amount: data.amount,
          detail: data.detail
        };
        
        // 只有当基地ID有效时才添加到提交数据中
        if (data.base_id > 0) {
          submitData.base_id = data.base_id;
        }
        
        onSubmit(submitData);
      }}
    >
      <Typography variant="h6" gutterBottom>
        {initial?.date ? '编辑开支记录' : '新增开支记录'}
      </Typography>
      
      <TextField
        label="开支日期"
        type="date"
        value={data.date}
        onChange={e => setData(v => ({ ...v, date: e.target.value }))}
        InputLabelProps={{ shrink: true }}
        required
      />
      
      {/* 基地选择：只有admin用户才显示 */}
      {isAdmin && (
        <FormControl fullWidth>
          <InputLabel>所属基地</InputLabel>
          <Select
            value={data.base_id === 0 ? '' : data.base_id.toString()}
            onChange={handleBaseChange}
            label="所属基地"
          >
            <MenuItem value="">
              <em>无（可选）</em>
            </MenuItem>
            {bases.map(base => (
              <MenuItem key={base.id} value={base.id?.toString() || ''}>
                {base.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      
      {/* 基地代理用户显示当前基地（只读） */}
      {!isAdmin && user?.base && (
        <TextField
          label="所属基地"
          value={user.base}
          disabled
          helperText="基地代理只能为自己的基地添加开支记录"
        />
      )}
      
      {/* 费用类别选择 */}
      <FormControl fullWidth required>
        <InputLabel>费用类别</InputLabel>
        <Select
          value={data.category_id || (categories.length > 0 ? categories[0].id : '')}
          onChange={handleCategoryChange}
          label="费用类别"
        >
          {categories.map(category => (
            <MenuItem key={category.id} value={category.id}>
              {category.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      <TextField
        label="金额"
        type="number"
        value={data.amount}
        onChange={e => setData(v => ({ ...v, amount: Number(e.target.value) }))}
        onFocus={(e) => (e.target as HTMLInputElement).select()}
        inputProps={{ min: 0, step: 0.01 }}
        required
      />
      
      <TextField
        label="备注"
        value={data.detail}
        onChange={e => setData(v => ({ ...v, detail: e.target.value }))}
        multiline
        rows={2}
      />
      
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button onClick={onCancel} disabled={submitting}>
          取消
        </Button>
        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting ? '提交中...' : '提交'}
        </Button>
      </Stack>
    </Box>
  )
}
