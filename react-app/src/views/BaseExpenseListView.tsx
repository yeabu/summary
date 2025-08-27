import React, { useEffect, useState } from "react";
import ApiClient from "@/api/ApiClient";
import { Paper, Box, Button, Table, TableHead, TableRow, TableCell, TableBody, Dialog, Typography, Alert, Checkbox } from "@mui/material";
import BaseExpenseForm from "@/components/BaseExpenseForm";
import QueryFilter from "@/components/QueryFilter";
import PaginationControl from "@/components/PaginationControl";
import ExportButton from "@/components/ExportButton";
import { TableSkeleton } from "@/components/LoadingComponents";
import { useNotification } from "@/components/NotificationProvider";
import BatchOperations, { BatchAction } from "@/components/BatchOperations";
import { BaseExpense, FilterOptions, PaginationResponse } from "@/api/AppDtos";
import dayjs from "dayjs";
import { Delete as DeleteIcon } from '@mui/icons-material';

export default function BaseExpenseListView() {
  const notification = useNotification();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [list, setList] = useState<BaseExpense[]>([]);
  const [edit, setEdit] = useState<BaseExpense | null>(null);
  const [error, setError] = useState<string>('');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [pagination, setPagination] = useState<PaginationResponse>({
    total: 0,
    page: 1,
    page_size: 20,
    total_pages: 0
  });
  
  const [selectedItems, setSelectedItems] = useState<BaseExpense[]>([]);
  
  const batchActions: BatchAction[] = [
    {
      id: 'delete',
      label: '批量删除',
      icon: <DeleteIcon />,
      color: 'error',
      dangerous: true
    }
  ];

  const load = async (currentFilters = filters, currentPage = pagination.page, currentPageSize = pagination.page_size) => {
    setLoading(true);
    setError('');
    setSelectedItems([]); // 清空选择状态
    
    try {
      const params = {
        ...currentFilters,
        page: currentPage,
        page_size: currentPageSize
      };
      
      console.log('加载数据参数:', params);
      const response = await ApiClient.expense.list(params);
      console.log('API响应原始数据:', response);
      console.log('response.data:', response.data);
      console.log('response.data 类型:', typeof response.data);
      console.log('response.data 是否为数组:', Array.isArray(response.data));
      
      // 验证返回的数据结构
      if (!response || typeof response !== 'object') {
        console.error('API返回的数据不是对象:', response);
        setList([]);
        setPagination({
          total: 0,
          page: currentPage,
          page_size: currentPageSize,
          total_pages: 0
        });
        return;
      }
      
      if (!response.data || !Array.isArray(response.data)) {
        console.warn('response.data 不存在或不是数组:', response.data);
        console.log('将直接使用response作为数组数据');
        
        // 如果response本身就是数组（后端直接返回数组）
        if (Array.isArray(response)) {
          console.log('后端直接返回数组，使用response作为数据');
          setList(response);
          setPagination({
            total: response.length,
            page: currentPage,
            page_size: currentPageSize,
            total_pages: Math.ceil(response.length / currentPageSize)
          });
          return;
        } else {
          // 无数据
          setList([]);
          setPagination({
            total: 0,
            page: currentPage,
            page_size: currentPageSize,
            total_pages: 0
          });
          return;
        }
      }
      
      // 正常情况：response.data 存在且是数组
      const dataArray = response.data;
      console.log('获得数组数据，长度:', dataArray.length);
      
      if (dataArray.length > 0) {
        console.log('第一条记录详情:', dataArray[0]);
        console.log('第一条记录字段检查:');
        const first = dataArray[0];
        console.log('  id:', first.id, '(类型:', typeof first.id, ')');
        console.log('  date:', first.date, '(类型:', typeof first.date, ')');
        console.log('  category:', first.category, '(类型:', typeof first.category, ')');
        console.log('  amount:', first.amount, '(类型:', typeof first.amount, ')');
        console.log('  base:', first.base, '(类型:', typeof first.base, ')');
      }
      
      setList(dataArray);
      
      // 计算分页信息
      const actualTotal = response.total || dataArray.length;
      setPagination({
        total: actualTotal,
        page: response.page || currentPage,
        page_size: response.page_size || currentPageSize,
        total_pages: Math.ceil(actualTotal / (response.page_size || currentPageSize))
      });
    } catch (err) {
      console.error('加载数据失败:', err);
      const errorMessage = err instanceof Error ? err.message : '加载开支记录失败';
      setError(errorMessage);
      notification.showError(errorMessage);
      setList([]); // 确保在错误时设置为空数组
      // 在错误时也要清空分页状态
      setPagination({
        total: 0,
        page: 1,
        page_size: pagination.page_size,
        total_pages: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    // 筛选后重置到第一页
    setPagination(prev => ({ ...prev, page: 1 }));
    load(newFilters, 1, pagination.page_size);
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    load(filters, page, pagination.page_size);
  };

  const handlePageSizeChange = (pageSize: number) => {
    setPagination(prev => ({ ...prev, page: 1, page_size: pageSize }));
    load(filters, 1, pageSize);
  };
  
  const handleBatchAction = async (actionId: string, selectedItems: BaseExpense[]) => {
    try {
      // 过滤出有效的ID，确保是数字且大于0
      const validIds: number[] = selectedItems
        .map(item => item.id)
        .filter((id): id is number => id !== undefined && id !== null && typeof id === 'number' && id > 0);
      
      console.log('批量操作 - 选中项目:', selectedItems);
      console.log('批量操作 - 有效ID列表:', validIds);
      
      if (validIds.length === 0) {
        notification.showError('没有选择有效的记录，请确保选择的是数据库中存在的记录');
        return;
      }
      
      if (actionId === 'delete') {
        // 移除window.confirm，因为BatchOperations组件已经处理了确认对话框
        await ApiClient.expense.batchDelete(validIds);
        notification.showSuccess(`成功删除 ${validIds.length} 条开支记录`);
        
        // 清空选择状态
        setSelectedItems([]);
        
        // 重新加载数据
        load();
      }
    } catch (err) {
      console.error('批量操作失败:', err);
      const errorMessage = err instanceof Error ? err.message : '批量操作失败';
      notification.showError(`删除失败: ${errorMessage}`);
    }
  };
  
  const handleItemSelect = (item: BaseExpense, checked: boolean) => {
    if (checked) {
      const newSelection = [...selectedItems, item];
      setSelectedItems(newSelection);
    } else {
      const newSelection = selectedItems.filter(selected => selected.id !== item.id);
      setSelectedItems(newSelection);
    }
  };
  
  const getItemId = (item: BaseExpense) => item.id || 0;
  
  const getItemLabel = (item: BaseExpense) => {
    return `${dayjs(item.date).format('MM-DD')} ${item.category} ¥${item.amount?.toFixed(2)}`;
  };

  useEffect(() => { load(); }, []);

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          基地日常开支列表
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box mb={2} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button 
            variant="contained" 
            onClick={() => setEdit({} as BaseExpense)}
            disabled={loading}
          >
            新增开支
          </Button>
          
          <ExportButton
            data={list}
            type="expenses"
            filters={filters}
            disabled={loading}
          />
        </Box>
      </Paper>

      <QueryFilter
        onFilter={handleFilter}
        loading={loading}
        showBaseFilter={true}
        showCategoryFilter={true}
        showSupplierFilter={false}
        showOrderNumberFilter={false}
      />
      
      <BatchOperations
        allItems={list}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        getItemId={getItemId}
        getItemLabel={getItemLabel}
        actions={batchActions}
        onBatchAction={handleBatchAction}
        disabled={loading}
        showSelectAll={true}
      />

      <Paper sx={{ p: 3 }}>
        {loading ? (
          <TableSkeleton rows={5} columns={8} />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  {/* 留空，由BatchOperations组件管理全选 */}
                </TableCell>
                <TableCell>日期</TableCell>
                <TableCell>类别</TableCell>
                <TableCell>金额</TableCell>
                <TableCell>所属基地</TableCell>
                <TableCell>录入人</TableCell>
                <TableCell>备注</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map(row => {
                const isSelected = selectedItems.some(item => item.id === row.id);
                return (
                  <TableRow key={row.id} hover selected={isSelected}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => handleItemSelect(row, e.target.checked)}
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>{dayjs(row.date).format("YYYY-MM-DD")}</TableCell>
                    <TableCell>{row.category}</TableCell>
                    <TableCell>¥{row.amount?.toFixed(2)}</TableCell>
                    <TableCell>{row.base}</TableCell>
                    <TableCell>{row.creator_name || '-'}</TableCell>
                    <TableCell>{row.detail || '-'}</TableCell>
                    <TableCell>
                      <Button 
                        variant="text" 
                        onClick={() => setEdit(row)}
                        size="small"
                      >
                        编辑
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {list.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary" variant="h6">
                      📋 暂无记录
                    </Typography>
                    <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                      当前没有开支记录，点击上方"新增开支"按钮创建第一条记录
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
        
        <PaginationControl
          pagination={pagination}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          loading={loading}
        />
      </Paper>
        
      <Dialog open={!!edit} onClose={() => setEdit(null)} maxWidth="md" fullWidth>
        <Box p={3}>
          <BaseExpenseForm
            initial={edit ?? undefined}
            submitting={submitting}
            onSubmit={async (v: any) => {
              try {
                setSubmitting(true);
                console.log('提交表单数据:', v);
                
                let result;
                if (edit?.id) {
                  console.log('编辑模式, ID:', edit.id);
                  result = await ApiClient.expense.update(edit.id, v);
                  console.log('编辑结果:', result);
                  notification.showSuccess('开支记录更新成功');
                } else {
                  console.log('新增模式');
                  result = await ApiClient.expense.create(v);
                  console.log('新增结果:', result);
                  notification.showSuccess('开支记录创建成功');
                }
                
                // 关闭对话框
                setEdit(null);
                
                // 延迟一点再刷新数据，确保后端数据已经保存
                console.log('开始刷新数据...');
                setTimeout(async () => {
                  if (!edit?.id) {
                    // 如果是新增，清空筛选条件并跳转到第一页显示最新数据
                    console.log('新增成功，清空筛选并跳转到第一页');
                    setFilters({});
                    await load({}, 1, pagination.page_size);
                  } else {
                    // 如果是编辑，保持当前页码和筛选条件
                    console.log('编辑成功，保持当前页面');
                    await load(filters, pagination.page, pagination.page_size);
                  }
                }, 100); // 100ms延迟
                
              } catch (err) {
                console.error('表单提交失败:', err);
                const errorMessage = err instanceof Error ? err.message : '保存失败';
                setError(errorMessage);
                notification.showError(errorMessage);
              } finally {
                setSubmitting(false);
              }
            }}
          />
        </Box>
      </Dialog>
    </Box>
  );
}