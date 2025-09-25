import React, { useState, useEffect } from "react";
import { TextField, MenuItem, Button, Box, Typography, FormControl, InputLabel, Select, SelectChangeEvent, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Alert, IconButton, Tooltip } from "@mui/material";
import { ReceiptLong as ReceiptIcon, CloudUpload as UploadIcon, OpenInNew as OpenInNewIcon, PhotoCamera as CameraIcon } from '@mui/icons-material';
import CameraCaptureDialog from '@/components/CameraCaptureDialog';
import ImageEditDialog from '@/components/ImageEditDialog';
import dayjs from 'dayjs';
import useAuthStore from '@/auth/AuthStore';
import { Base, ExpenseCategory } from '@/api/AppDtos';
import { ApiClient } from '@/api/ApiClient';

export interface ExpenseFormProps {
  initial?: Partial<{
    id: number;
    date: string;
    category_id: number;  // 修改为category_id
    amount: number;
    detail: string;
    base: Base;
    receipt_path?: string;
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
    currency: (initial as any)?.currency || 'CNY',
    detail: initial?.detail ?? "",
    base_id: initial?.base?.id || 0 // 对于管理员用户，默认不选择基地
  });
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptPath, setReceiptPath] = useState<string | undefined>((initial as any)?.receipt_path);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const apiClient = new ApiClient();
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const cameraSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBlob, setEditBlob] = useState<Blob | null>(null);

  // 压缩图片到 <= 2MB，最长边限制 2000px
  const compressImage = (file: File, maxBytes = 2 * 1024 * 1024, maxDim = 2000): Promise<File> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('只支持图片文件'));
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img as any;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.round(width * scale); height = Math.round(height * scale);
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { URL.revokeObjectURL(url); reject(new Error('压缩失败')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const tryQualities = [0.92, 0.85, 0.8, 0.7, 0.6];
        (function tryNext(i: number){
          canvas.toBlob((blob) => {
            if (!blob) { URL.revokeObjectURL(url); reject(new Error('压缩失败')); return; }
            if (blob.size <= maxBytes || i === tryQualities.length - 1) {
              const out = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
              URL.revokeObjectURL(url);
              resolve(out);
            } else { tryNext(i + 1); }
          }, 'image/jpeg', tryQualities[i]);
        })(0);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('读取图片失败')); };
      img.src = url;
    });
  };

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
          currency: data.currency || 'CNY',
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
      {/* 查看票据入口（仅编辑状态显示） */}
      {initial?.id ? (
        <Box sx={{ display:'flex', justifyContent:'flex-end', mb: 1 }}>
          <Tooltip title={receiptPath ? '查看/更换票据' : '上传票据'}>
            <Button size="small" startIcon={<ReceiptIcon />} onClick={()=>{ setUploadErr(''); setReceiptOpen(true); }}>
              查看票据
            </Button>
          </Tooltip>
        </Box>
      ) : null}
      
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
        label="币种"
        select
        value={data.currency}
        onChange={e => setData(v => ({ ...v, currency: e.target.value }))}
      >
        <MenuItem value="CNY">CNY 人民币</MenuItem>
        <MenuItem value="LAK">LAK 老挝基普</MenuItem>
        <MenuItem value="THB">THB 泰铢</MenuItem>
      </TextField>
      
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

      {/* 票据查看/上传对话框 */}
      <Dialog open={receiptOpen} onClose={() => setReceiptOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>查看票据</DialogTitle>
        <DialogContent>
          {receiptPath ? (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <OpenInNewIcon fontSize="small" />
                <a href={`${import.meta.env.VITE_API_URL}${receiptPath}`} target="_blank" rel="noreferrer">在新窗口打开</a>
              </Box>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                <img src={`${import.meta.env.VITE_API_URL}${receiptPath}`} alt="票据" style={{ width: '100%', display: 'block' }} />
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>暂无票据</Typography>
          )}
          {uploadErr && <Alert severity="error" sx={{ mb: 1 }}>{uploadErr}</Alert>}
          <Box sx={{ display:'flex', gap: 1, flexWrap:'wrap' }}>
            <Button variant="outlined" startIcon={<UploadIcon />} component="label" disabled={uploadingReceipt}>
              {receiptPath ? '更换票据' : '上传票据'}
              <input type="file" accept="image/*" hidden onChange={async (e)=>{
                const f = e.target.files?.[0];
                e.currentTarget.value='';
                if(!f || !initial?.id) return;
                if(!f.type.startsWith('image/')) { setUploadErr('只支持图片格式'); return; }
                setEditBlob(f);
                setEditOpen(true);
              }} />
            </Button>
            {cameraSupported && (
              <Button variant="outlined" startIcon={<CameraIcon />} disabled={uploadingReceipt} onClick={()=> setCameraOpen(true)}>
                拍照上传
              </Button>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setReceiptOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 高级拍照对话框（getUserMedia） */}
      <CameraCaptureDialog
        open={cameraOpen}
        onClose={()=> setCameraOpen(false)}
        instant
        onCapture={async (blob)=>{ setEditBlob(blob); setEditOpen(true); }}
      />

      {/* 图片编辑 */}
      <ImageEditDialog
        open={editOpen}
        file={editBlob}
        onClose={()=> setEditOpen(false)}
        onDone={async (blob)=>{
          if(!initial?.id) return;
          try {
            setUploadingReceipt(true); setUploadErr('');
            const file = new File([blob], `receipt_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
            const cf = await compressImage(file);
            const resp = await apiClient.uploadExpenseReceipt({ expense_id: initial.id, date: data.date, file: cf });
            setReceiptPath(resp.path);
          } catch(err:any){ setUploadErr(err?.message || '上传失败'); }
          finally { setUploadingReceipt(false); }
        }}
      />
    </Box>
  )
}
