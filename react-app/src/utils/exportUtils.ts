import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import { BaseExpense, Purchase, ExpenseStats } from '@/api/AppDtos';

// 导出基础开支记录
export const exportExpenses = (data: BaseExpense[], filename?: string) => {
  const worksheet = XLSX.utils.json_to_sheet(
    data.map(item => ({
      '日期': dayjs(item.date).format('YYYY-MM-DD'),
      '类别': item.category,
      '金额': item.amount,
      '所属基地': item.base,
      '详情': item.detail || '',
      '录入人': item.creator_name || '',
      '创建时间': item.created_at ? dayjs(item.created_at).format('YYYY-MM-DD HH:mm:ss') : ''
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '开支记录');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const finalFilename = filename || `开支记录_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
  saveAs(blob, finalFilename);
};

// 导出采购记录
export const exportPurchases = (data: Purchase[], filename?: string) => {
  const worksheet = XLSX.utils.json_to_sheet(
    data.map(item => ({
      '采购日期': dayjs(item.purchase_date).format('YYYY-MM-DD'),
      '供应商': item.supplier,
      '订单号': item.order_number,
      '总金额': item.total_amount,
      '收货人': item.receiver,
      '商品数量': item.items?.length || 0,
      '备注': item.notes || '',
      '录入人': item.creator_name || '',
      '创建时间': item.created_at ? dayjs(item.created_at).format('YYYY-MM-DD HH:mm:ss') : ''
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '采购记录');

  // 如果有采购明细，添加详细页面
  if (data.some(item => item.items && item.items.length > 0)) {
    const detailData: any[] = [];
    data.forEach(purchase => {
      if (purchase.items && purchase.items.length > 0) {
        purchase.items.forEach(item => {
          detailData.push({
            '采购日期': dayjs(purchase.purchase_date).format('YYYY-MM-DD'),
            '订单号': purchase.order_number,
            '供应商': purchase.supplier,
            '商品名称': item.product_name,
            '数量': item.quantity,
            '单价': item.unit_price,
            '小计': item.amount,
            '收货人': purchase.receiver
          });
        });
      }
    });
    
    const detailWorksheet = XLSX.utils.json_to_sheet(detailData);
    XLSX.utils.book_append_sheet(workbook, detailWorksheet, '采购明细');
  }

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const finalFilename = filename || `采购记录_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
  saveAs(blob, finalFilename);
};

// 导出统计数据
export const exportStats = (data: ExpenseStats[], filename?: string) => {
  const worksheet = XLSX.utils.json_to_sheet(
    data.map(item => ({
      '基地': item.base,
      '类别': item.category,
      '月份': item.month,
      '总金额': item.total
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '费用统计');

  // 添加汇总页面
  const baseTotals: Record<string, number> = {};
  const categoryTotals: Record<string, number> = {};
  let totalAmount = 0;

  data.forEach(item => {
    baseTotals[item.base] = (baseTotals[item.base] || 0) + item.total;
    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.total;
    totalAmount += item.total;
  });

  const summaryData = [
    { '项目': '总计', '金额': totalAmount },
    { '项目': '', '金额': '' },
    { '项目': '按基地统计', '金额': '' },
    ...Object.entries(baseTotals).map(([base, total]) => ({ '项目': base, '金额': total })),
    { '项目': '', '金额': '' },
    { '项目': '按类别统计', '金额': '' },
    ...Object.entries(categoryTotals).map(([category, total]) => ({ '项目': category, '金额': total }))
  ];

  const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, '汇总统计');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const finalFilename = filename || `费用统计_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`;
  saveAs(blob, finalFilename);
};

// 导出CSV格式
export const exportToCSV = (data: any[], headers: string[], filename?: string) => {
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header] || '';
      // 如果包含逗号或引号，需要用引号包围并转义内部引号
      if (value.toString().includes(',') || value.toString().includes('\"')) {
        return `\"${value.toString().replace(/\"/g, '\"\"')}\"`;
      }
      return value;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const finalFilename = filename || `导出数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`;
  saveAs(blob, finalFilename);
};

// 通用导出函数
export const exportData = {
  expenses: exportExpenses,
  purchases: exportPurchases,
  stats: exportStats,
  csv: exportToCSV
};