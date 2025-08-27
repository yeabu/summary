import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormGroup,
  Box,
  CircularProgress
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { BaseExpense, Purchase, FilterOptions } from '@/api/AppDtos';
import { useNotification } from './NotificationProvider';
import ApiClient from '@/api/ApiClient';

interface ExportButtonProps {
  data?: any[];
  type: 'expenses' | 'purchases' | 'stats';
  filters?: FilterOptions;
  disabled?: boolean;
}

interface ExportConfig {
  format: 'xlsx' | 'csv';
  includeFields: string[];
  filename: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({ 
  data = [], 
  type, 
  filters = {}, 
  disabled = false 
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<ExportConfig>({
    format: 'xlsx',
    includeFields: [],
    filename: `${type}_export_${new Date().toISOString().split('T')[0]}`
  });
  
  const notification = useNotification();

  // 字段配置
  const fieldConfigs = {
    expenses: [
      { key: 'date', label: '日期', default: true },
      { key: 'category', label: '类别', default: true },
      { key: 'amount', label: '金额', default: true },
      { key: 'base', label: '基地', default: true },
      { key: 'detail', label: '备注', default: false },
      { key: 'creator_name', label: '录入人', default: true },
      { key: 'created_at', label: '创建时间', default: false }
    ],
    purchases: [
      { key: 'purchase_date', label: '采购日期', default: true },
      { key: 'supplier', label: '供应商', default: true },
      { key: 'order_number', label: '订单号', default: true },
      { key: 'total_amount', label: '总金额', default: true },
      { key: 'receiver', label: '收货人', default: true },
      { key: 'notes', label: '备注', default: false },
      { key: 'creator_name', label: '录入人', default: true },
      { key: 'items', label: '商品明细', default: true }
    ],
    stats: [
      { key: 'base', label: '基地', default: true },
      { key: 'category', label: '类别', default: true },
      { key: 'month', label: '月份', default: true },
      { key: 'total', label: '总额', default: true }
    ]
  };

  // 初始化选中字段
  React.useEffect(() => {
    const defaultFields = fieldConfigs[type]
      .filter(field => field.default)
      .map(field => field.key);
    setConfig(prev => ({ ...prev, includeFields: defaultFields }));
  }, [type]);

  const handleFieldChange = (field: string) => {
    setConfig(prev => ({
      ...prev,
      includeFields: prev.includeFields.includes(field)
        ? prev.includeFields.filter(f => f !== field)
        : [...prev.includeFields, field]
    }));
  };

  const formatDataForExport = (rawData: any[]) => {
    return rawData.map(item => {
      const formatted: any = {};
      
      config.includeFields.forEach(field => {
        const fieldConfig = fieldConfigs[type].find(f => f.key === field);
        if (!fieldConfig) return;
        
        let value = item[field];
        
        // 特殊处理
        switch (field) {
          case 'amount':
          case 'total_amount':
          case 'total':
            value = typeof value === 'number' ? value.toFixed(2) : '0.00';
            break;
          case 'date':
          case 'purchase_date':
          case 'created_at':
            if (value) {
              value = new Date(value).toLocaleDateString('zh-CN');
            }
            break;
          case 'items':
            if (Array.isArray(value)) {
              value = value.map(item => 
                `${item.product_name} × ${item.quantity} = ¥${item.amount?.toFixed(2) || '0.00'}`
              ).join('; ');
            }
            break;
          default:
            value = value || '';
        }
        
        formatted[fieldConfig.label] = value;
      });
      
      return formatted;
    });
  };

  const exportToExcel = (data: any[], filename: string) => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      
      // 设置列宽
      const colWidths = Object.keys(data[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      worksheet['!cols'] = colWidths;
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `${filename}.xlsx`);
    } catch (error) {
      console.error('Excel export error:', error);
      throw new Error('Excel导出失败');
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, `${filename}.csv`);
    } catch (error) {
      console.error('CSV export error:', error);
      throw new Error('CSV导出失败');
    }
  };

  const handleExport = async () => {
    if (config.includeFields.length === 0) {
      notification.showError('请至少选择一个字段');
      return;
    }

    setLoading(true);
    try {
      let exportData = data;
      
      // 如果没有传入数据，根据类型和筛选条件获取数据
      if (!data || data.length === 0) {
        switch (type) {
          case 'expenses':
            const expenseResponse = await ApiClient.expense.list(filters);
            exportData = expenseResponse.data || [];
            break;
          case 'purchases':
            const purchaseResponse = await ApiClient.purchase.list();
            exportData = purchaseResponse.data || [];
            break;
          case 'stats':
            // stats类型通常会传入数据
            break;
        }
      }

      if (!exportData || exportData.length === 0) {
        notification.showWarning('没有数据可导出');
        return;
      }

      const formattedData = formatDataForExport(exportData);
      
      if (config.format === 'xlsx') {
        exportToExcel(formattedData, config.filename);
      } else {
        exportToCSV(formattedData, config.filename);
      }
      
      notification.showSuccess(`数据导出成功！共导出 ${formattedData.length} 条记录`);
      setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : '导出失败';
      notification.showError(message);
      console.error('Export error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<DownloadIcon />}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        导出数据
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>导出配置</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <FormControl component="fieldset">
              <FormLabel component="legend">导出格式</FormLabel>
              <RadioGroup
                value={config.format}
                onChange={(e) => setConfig(prev => ({ ...prev, format: e.target.value as 'xlsx' | 'csv' }))}
                row
              >
                <FormControlLabel value="xlsx" control={<Radio />} label="Excel (.xlsx)" />
                <FormControlLabel value="csv" control={<Radio />} label="CSV (.csv)" />
              </RadioGroup>
            </FormControl>
          </Box>

          <Box sx={{ mb: 3 }}>
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend">选择字段</FormLabel>
              <FormGroup>
                {fieldConfigs[type].map((field) => (
                  <FormControlLabel
                    key={field.key}
                    control={
                      <Checkbox
                        checked={config.includeFields.includes(field.key)}
                        onChange={() => handleFieldChange(field.key)}
                      />
                    }
                    label={field.label}
                  />
                ))}
              </FormGroup>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={loading}>
            取消
          </Button>
          <Button 
            onClick={handleExport} 
            variant="contained" 
            disabled={loading || config.includeFields.length === 0}
            startIcon={loading ? <CircularProgress size={16} /> : <DownloadIcon />}
          >
            {loading ? '导出中...' : '导出'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ExportButton;