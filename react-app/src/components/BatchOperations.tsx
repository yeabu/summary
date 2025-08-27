import React, { useState } from 'react';
import {
  Box,
  Checkbox,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
  Divider,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  SelectAll as SelectAllIcon,
  ClearAll as ClearAllIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Info as InfoIcon
} from '@mui/icons-material';

// 批量操作类型定义
export interface BatchAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color?: 'inherit' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  dangerous?: boolean; // 是否为危险操作，需要二次确认
}

// 批量操作组件属性
interface BatchOperationsProps {
  // 选择相关
  allItems: any[]; // 所有项目
  selectedItems: any[]; // 已选择的项目
  onSelectionChange: (selected: any[]) => void;
  getItemId: (item: any) => string | number; // 获取项目ID的函数
  getItemLabel?: (item: any) => string; // 获取项目显示标签的函数
  
  // 操作相关
  actions?: BatchAction[]; // 自定义批量操作
  onBatchAction?: (actionId: string, selectedItems: any[]) => Promise<void>;
  
  // 界面控制
  disabled?: boolean;
  loading?: boolean;
  showSelectAll?: boolean; // 是否显示全选功能
  maxSelectionDisplay?: number; // 最多显示多少个选中项的标签
}

// 默认批量操作
const defaultActions: BatchAction[] = [
  {
    id: 'delete',
    label: '批量删除',
    icon: <DeleteIcon />,
    color: 'error',
    dangerous: true
  }
];

const BatchOperations: React.FC<BatchOperationsProps> = ({
  allItems,
  selectedItems,
  onSelectionChange,
  getItemId,
  getItemLabel = (item) => getItemId(item).toString(),
  actions = defaultActions,
  onBatchAction,
  disabled = false,
  loading = false,
  showSelectAll = true,
  maxSelectionDisplay = 5
}) => {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action?: BatchAction;
    selectedItems: any[];
  }>({ open: false, selectedItems: [] });
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [operationLoading, setOperationLoading] = useState(false);

  // 选择状态计算
  const isAllSelected = allItems.length > 0 && selectedItems.length === allItems.length;
  const isIndeterminate = selectedItems.length > 0 && selectedItems.length < allItems.length;
  const hasSelection = selectedItems.length > 0;

  // 全选/全不选
  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange([...allItems]);
    }
  };

  // 清空选择
  const handleClearSelection = () => {
    onSelectionChange([]);
  };

  // 打开操作菜单
  const handleOpenActionMenu = (event: React.MouseEvent<HTMLElement>) => {
    setActionMenuAnchor(event.currentTarget);
  };

  // 关闭操作菜单
  const handleCloseActionMenu = () => {
    setActionMenuAnchor(null);
  };

  // 执行批量操作
  const handleBatchAction = (action: BatchAction) => {
    console.log('handleBatchAction called:', {
      actionId: action.id,
      dangerous: action.dangerous,
      currentSelectedItems: selectedItems,
      selectedItemsLength: selectedItems.length
    });
    
    handleCloseActionMenu();
    
    if (action.dangerous) {
      // 危险操作需要确认
      const itemsToConfirm = [...selectedItems];
      console.log('Setting confirm dialog with items:', itemsToConfirm);
      setConfirmDialog({
        open: true,
        action,
        selectedItems: itemsToConfirm
      });
    } else {
      // 直接执行
      executeBatchAction(action);
    }
  };

  // 执行批量操作
  const executeBatchAction = async (action: BatchAction, itemsToProcess?: any[]) => {
    if (!onBatchAction) return;
    
    const targetItems = itemsToProcess || selectedItems;
    if (targetItems.length === 0) {
      console.error('没有选择要操作的项目');
      return;
    }
    
    setOperationLoading(true);
    try {
      await onBatchAction(action.id, targetItems);
      // 操作成功后清空选择
      onSelectionChange([]);
    } catch (error) {
      console.error('批量操作失败:', error);
    } finally {
      setOperationLoading(false);
    }
  };

  // 确认对话框
  const handleConfirmAction = async () => {
    console.log('handleConfirmAction called:', {
      hasAction: !!confirmDialog.action,
      actionId: confirmDialog.action?.id,
      confirmDialogSelectedItems: confirmDialog.selectedItems,
      confirmDialogSelectedItemsLength: confirmDialog.selectedItems.length
    });
    
    if (confirmDialog.action && confirmDialog.selectedItems.length > 0) {
      console.log('Executing batch action with confirmed items:', confirmDialog.selectedItems);
      await executeBatchAction(confirmDialog.action, confirmDialog.selectedItems);
    } else {
      console.error('No action or no selected items in confirm dialog');
    }
    setConfirmDialog({ open: false, selectedItems: [] });
  };

  // 取消确认
  const handleCancelConfirm = () => {
    setConfirmDialog({ open: false, selectedItems: [] });
  };

  // 渲染选中项标签
  const renderSelectedItems = () => {
    const displayItems = selectedItems.slice(0, maxSelectionDisplay);
    const remainingCount = selectedItems.length - maxSelectionDisplay;

    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
        {displayItems.map((item, index) => (
          <Chip
            key={getItemId(item)}
            size="small"
            label={getItemLabel(item)}
            variant="outlined"
            color="primary"
          />
        ))}
        {remainingCount > 0 && (
          <Chip
            size="small"
            label={`+${remainingCount}项`}
            variant="outlined"
            color="default"
          />
        )}
      </Box>
    );
  };

  if (!hasSelection && !showSelectAll) {
    return null;
  }

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          bgcolor: hasSelection ? 'action.selected' : 'background.paper',
          borderRadius: 1,
          mb: 2,
          border: hasSelection ? '1px solid' : 'none',
          borderColor: hasSelection ? 'primary.main' : 'transparent'
        }}
      >
        {/* 全选复选框 */}
        {showSelectAll && (
          <Tooltip title={isAllSelected ? '取消全选' : '全选'}>
            <Checkbox
              checked={isAllSelected}
              indeterminate={isIndeterminate}
              onChange={handleSelectAll}
              disabled={disabled || loading || allItems.length === 0}
            />
          </Tooltip>
        )}

        {/* 选择状态显示 */}
        <Box sx={{ flex: 1 }}>
          {hasSelection ? (
            <Box>
              <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
                已选择 {selectedItems.length} 项 / 共 {allItems.length} 项
              </Typography>
              {renderSelectedItems()}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              共 {allItems.length} 项，点击左侧复选框选择记录进行批量操作
            </Typography>
          )}
        </Box>

        {/* 操作按钮 */}
        {hasSelection && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* 快捷选择按钮 */}
            {selectedItems.length > 0 && selectedItems.length < allItems.length && (
              <Tooltip title="选择全部">
                <IconButton
                  size="small"
                  onClick={handleSelectAll}
                  disabled={disabled || operationLoading}
                  color="primary"
                >
                  <SelectAllIcon />
                </IconButton>
              </Tooltip>
            )}
            
            <Tooltip title="清空选择">
              <IconButton
                size="small"
                onClick={handleClearSelection}
                disabled={disabled || operationLoading}
              >
                <ClearAllIcon />
              </IconButton>
            </Tooltip>

            {/* 批量操作菜单 */}
            {actions.length > 0 && onBatchAction && (
              <>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleOpenActionMenu}
                  disabled={disabled || operationLoading}
                  endIcon={<MoreVertIcon />}
                >
                  批量操作
                </Button>

                <Menu
                  anchorEl={actionMenuAnchor}
                  open={Boolean(actionMenuAnchor)}
                  onClose={handleCloseActionMenu}
                >
                  {actions.map((action) => (
                    <MenuItem
                      key={action.id}
                      onClick={() => handleBatchAction(action)}
                      disabled={operationLoading}
                    >
                      <ListItemIcon sx={{ color: action.color }}>
                        {action.icon}
                      </ListItemIcon>
                      <ListItemText>
                        {action.label}
                      </ListItemText>
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}
          </Box>
        )}
      </Box>

      {/* 操作进度显示 */}
      {operationLoading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            正在处理批量操作...
          </Typography>
        </Box>
      )}

      {/* 确认对话框 */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCancelConfirm}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          确认{confirmDialog.action?.label}
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            此操作不可撤销，请确认是否继续。
          </Alert>
          <Typography variant="body1" gutterBottom>
            您将要{confirmDialog.action?.label.toLowerCase()}以下 {confirmDialog.selectedItems.length} 项：
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
            {confirmDialog.selectedItems.map((item, index) => (
              <Typography key={index} variant="body2" sx={{ py: 0.5 }}>
                • {getItemLabel(item)}
              </Typography>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelConfirm} disabled={operationLoading}>
            取消
          </Button>
          <Button
            onClick={handleConfirmAction}
            color={confirmDialog.action?.color || 'primary'}
            variant="contained"
            disabled={operationLoading}
          >
            {operationLoading ? '处理中...' : '确认'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BatchOperations;