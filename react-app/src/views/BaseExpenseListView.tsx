import React, { useEffect, useState } from "react";
import { ApiClient } from "@/api/ApiClient";
import { Paper, Box, Button, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Alert, Checkbox, IconButton, Grid, MenuItem } from "@mui/material";
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import CloseIcon from '@mui/icons-material/Close';
import BaseExpenseForm from "@/components/BaseExpenseForm";
import ExpenseBatchCreateForm from "@/components/ExpenseBatchCreateForm";
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
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string>('');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [pagination, setPagination] = useState<PaginationResponse>({
    total: 0,
    page: 1,
    page_size: 20,
    total_pages: 0
  });
  
  const [selectedItems, setSelectedItems] = useState<BaseExpense[]>([]);
  // 批量添加状态
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [batchRows, setBatchRows] = useState<Array<{ date: string; category_name: string; category_id?: number; amount: string; detail: string }>>([]);
  const [batchError, setBatchError] = useState<string>('');
  const [bases, setBases] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [defaultBaseId, setDefaultBaseId] = useState<number | ''>('');
  
  // 创建 ApiClient 实例
  const apiClient = new ApiClient();
  
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
      const response = await apiClient.listExpense(params);
      console.log('API响应原始数据:', response);
      console.log('response 类型:', typeof response);
      console.log('response 是否为数组:', Array.isArray(response));
      
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
      
      // 确保数据是数组格式
      const dataArray = Array.isArray(response) ? response : [];
      console.log('获得数组数据，长度:', dataArray.length);
      
      // 类型转换：将ExpenseEntry[]转换为BaseExpense[]
      const baseExpenses: BaseExpense[] = dataArray.map((item: any) => ({
        id: item.id,
        date: item.date,
        category: item.category,  // 保持category对象
        category_id: item.category_id,  // 添加category_id
        amount: item.amount,
        base: item.base || { id: 0, name: '', code: '' }, // 确保base字段不为undefined
        detail: item.detail,
        created_by: item.created_by,
        creator_name: item.creator_name,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));
      
      setList(baseExpenses);
      
      // 计算分页信息
      const actualTotal = baseExpenses.length;
      setPagination({
        total: actualTotal,
        page: currentPage,
        page_size: currentPageSize,
        total_pages: Math.ceil(actualTotal / currentPageSize)
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
        await apiClient.batchDeleteExpense(validIds);
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
    return `${dayjs(item.date).format('MM-DD')} ${item.category?.name || '未知类别'} ¥${item.amount?.toFixed(2)}`;
  };

  useEffect(() => { load(); }, []);

  // 载入基地与类别，用于批量解析和默认基地选择
  useEffect(() => {
    (async () => {
      try { const b = await apiClient.baseList(); setBases(b || []); } catch {}
      try { const c = await apiClient.listExpenseCategories('active'); setCategories(c || []); } catch {}
    })();
  }, []);

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <PageHeader title="基地日常开支列表" actions={<>
          <Button 
            variant="contained" 
            onClick={() => setCreateOpen(true)}
            disabled={loading}
          >新增开支</Button>
          <Button 
            variant="outlined" 
            onClick={() => setBatchOpen(true)}
            disabled={loading}
          >批量添加</Button>
          <ExportButton data={list} type="expenses" filters={filters} disabled={loading} />
        </>} />
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
      </Paper>

      {/* 批量添加对话框 */}
      <Dialog open={batchOpen} onClose={() => setBatchOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>批量添加开支</DialogTitle>
        <DialogContent>
          <Box sx={{ mb:2 }}>
            <Typography variant="body2">粘贴格式：日期(YYYY-MM-DD), 类别名称, 金额, 备注</Typography>
            <Typography variant="caption" color="text.secondary">例：2025-09-16, 办公用品, 188.5, A4纸一箱</Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField select fullWidth label="默认基地(可选, admin)" value={defaultBaseId}
                onChange={(e)=>setDefaultBaseId(e.target.value === '' ? '' : Number(e.target.value))}>
                <MenuItem value="">不指定</MenuItem>
                {bases.map(b => (<MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={8} placeholder="一行一条记录，用逗号/Tab/两个以上空格分隔字段"
                value={batchText} onChange={(e)=>{ const t=e.target.value; setBatchText(t); const lines=t.split(/\r?\n/).map(l=>l.trim()).filter(Boolean); const rows=lines.map(l=>{ const parts=l.split(/\t|,|\s{2,}/).map(s=>s.trim()); const [date, category_name, amount, ...rest]=parts; const detail=(rest?.join(' ')||''); return { date: date||'', category_name: category_name||'', amount: amount||'', detail };}); setBatchRows(rows); }} />
            </Grid>
          </Grid>
          {batchError && <Alert severity="error" sx={{ mt:2 }}>{batchError}</Alert>}
          {batchRows.length>0 && (
            <Box sx={{ mt:2 }}>
              <Typography variant="subtitle2">预览（前20行）：</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>日期</TableCell>
                    <TableCell>类别</TableCell>
                    <TableCell>金额</TableCell>
                    <TableCell>备注</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {batchRows.slice(0,20).map((r,i)=> (
                    <TableRow key={i}>
                      <TableCell>{r.date}</TableCell>
                      <TableCell>{r.category_name}</TableCell>
                      <TableCell>{r.amount}</TableCell>
                      <TableCell>{r.detail}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setBatchOpen(false)}>取消</Button>
          <Button variant="contained" onClick={async ()=>{
            try{ setSubmitting(true); setBatchError(''); const cmap=new Map<string,number>(); categories.forEach((c:any)=>cmap.set(c.name,c.id)); const items=batchRows.map(r=>({date:r.date, category_id:cmap.get(r.category_name)||0, amount:Number(r.amount||0), detail:r.detail})); const invalid=items.find(it=>!it.date||!it.category_id||!(it.amount>0)); if(invalid){ setBatchError('存在无效行：请确保日期/类别/金额有效'); setSubmitting(false); return; } const payload:any={items}; if(defaultBaseId) payload.base_id=Number(defaultBaseId); const res=await apiClient.batchCreateExpense(payload); setBatchOpen(false); setBatchText(''); setBatchRows([]); setDefaultBaseId(''); notification.showSuccess(`已创建 ${res.created.length} 条，失败 ${res.failed}`); load(); } catch(e:any){ setBatchError(e.message||'提交失败'); } finally { setSubmitting(false);} 
          }} disabled={submitting || batchRows.length===0}>提交</Button>
        </DialogActions>
      </Dialog>

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
        ) : list.length === 0 ? (
          <EmptyState title="暂无开支记录" description="点击右上角“新增开支”或“批量添加”按钮录入数据" />
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
                    <TableCell>{row.category?.name || '未知类别'}</TableCell>
                    <TableCell>¥{row.amount?.toFixed(2)}</TableCell>
                    <TableCell>{row.base?.name || '-'}</TableCell>
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
        
      {/* 创建（多条） */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>新增开支（多条）</DialogTitle>
        <DialogContent>
          <ExpenseBatchCreateForm onClose={() => setCreateOpen(false)} onCreated={load} />
        </DialogContent>
      </Dialog>

      {/* 编辑（单条） */}
      <Dialog open={!!edit} onClose={() => setEdit(null)} maxWidth="md" fullWidth>
        <Box p={3} sx={{ position: 'relative' }}>
          <IconButton
            aria-label="close"
            onClick={() => setEdit(null)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
          <BaseExpenseForm
            initial={edit ? {
              date: edit.date,
              category_id: edit.category_id,  // 修改为category_id
              amount: edit.amount,
              detail: edit.detail,
              base: edit.base
            } : undefined}
            submitting={submitting}
            onCancel={() => setEdit(null)}
            onSubmit={async (v: any) => {
              try {
                setSubmitting(true);
                console.log('提交表单数据:', v);
                
                let result;
                if (edit?.id) {
                  console.log('编辑模式, ID:', edit.id);
                  result = await apiClient.updateExpense(edit.id, v);
                  console.log('编辑结果:', result);
                  notification.showSuccess('开支记录更新成功');
                } else {
                  console.log('新增模式');
                  result = await apiClient.createExpense(v);
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
