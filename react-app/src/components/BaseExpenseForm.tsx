import React, { useState } from "react";
import { TextField, MenuItem, Button, Box, Typography } from "@mui/material";
import dayjs from 'dayjs';
import useAuthStore from '@/auth/AuthStore';

const categories = ["伙食费", "修车费", "电费", "加油费", "材料费"];

// 基地列表（根据API文档）
const baseList = [
  "北京基地",
  "上海基地",
  "广州基地",
  "深圳基地",
  "杭州基地",
  "南京基地",
  "成都基地",
  "武汉基地",
  "西安基地",
  "青岛基地"
];

export interface ExpenseFormProps {
  initial?: Partial<{
    date: string;
    category: string;
    amount: number;
    detail: string;
    base: string;
  }>;
  onSubmit: (v: any) => void;
  submitting?: boolean;
}

export default function BaseExpenseForm({ initial, onSubmit, submitting }: ExpenseFormProps) {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';
  const userBase = user?.base || '';
  
  const [data, setData] = useState({
    date: initial?.date ?? dayjs().format("YYYY-MM-DD"),
    category: initial?.category ?? "",
    amount: initial?.amount ?? 0,
    detail: initial?.detail ?? "",
    base: initial?.base ?? (isAdmin ? "" : userBase) // admin用户默认空，基地代理用户使用自己的基地
  });

  return (
    <Box component="form"
      sx={{
        display: "flex", flexDirection: "column", gap: 2, maxWidth: 360, p: 2
      }}
      onSubmit={e => {
        e.preventDefault();
        onSubmit(data);
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
        <TextField
          label="所属基地"
          select
          value={data.base}
          onChange={e => setData(v => ({ ...v, base: e.target.value }))}
          required
          helperText="请选择费用所属的基地"
        >
          {baseList.map(base =>
            <MenuItem value={base} key={base}>{base}</MenuItem>
          )}
        </TextField>
      )}
      
      {/* 基地代理用户显示当前基地（只读） */}
      {!isAdmin && (
        <TextField
          label="所属基地"
          value={userBase}
          disabled
          helperText="基地代理只能为自己的基地添加开支记录"
        />
      )}
      
      <TextField
        label="费用类别"
        select
        value={data.category}
        onChange={e => setData(v => ({ ...v, category: e.target.value }))}
        required
      >
        {categories.map(c =>
          <MenuItem value={c} key={c}>{c}</MenuItem>
        )}
      </TextField>
      
      <TextField
        label="金额"
        type="number"
        value={data.amount}
        onChange={e => setData(v => ({ ...v, amount: Number(e.target.value) }))}
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
      
      <Button type="submit" variant="contained" disabled={submitting}>
        {submitting ? '提交中...' : '提交'}
      </Button>
    </Box>
  )
}
