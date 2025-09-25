/**
 * WelcomeView - Summary系统主页
 *
 * 提供系统功能导航和快速访问入口
 * 根据用户角色显示不同的功能模块
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Typography, 
  Box, 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  CardActionArea,
  Avatar,
  Chip,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Skeleton,
  Divider
} from '@mui/material';
import {
  Receipt as ExpenseIcon,
  ShoppingCart as PurchaseIcon,
  BarChart as StatsIcon,
  Person as ProfileIcon,
  Business as BaseIcon,
  Group as UserIcon,
  Inventory2 as InventoryIcon,
  CurrencyExchange as CurrencyExchangeIcon
} from '@mui/icons-material';
import useAuthStore from '@/auth/AuthStore';
import { getValidAccessTokenOrRefresh } from '@/utils/authToken';

/**
 * 系统主页 - 功能导航
 * url: /
 * @page Welcome
 */
const WelcomeView = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';
  const [rates, setRates] = useState<Array<{ currency:string; rate_to_cny:number; updated_at?: string }>>([]);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setRateLoading(true);
        setRateError('');
        const apiUrl = import.meta.env.VITE_API_URL;
        const token = await getValidAccessTokenOrRefresh();
        const res = await fetch(`${apiUrl}/api/rate/list`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setRates(Array.isArray(data) ? data : []);
      } catch (e:any) {
        setRateError(e?.message || '汇率加载失败');
        setRates([]);
      } finally {
        setRateLoading(false);
      }
    })();
  }, []);

  const currencyCn = (c?: string) => c === 'LAK' ? '老挝币' : c === 'THB' ? '泰铢' : c === 'CNY' ? '人民币' : (c || '');
  const fmt = (n: number, d = 4) => {
    if (!isFinite(n)) return '0';
    return n.toFixed(d);
  };

  const menuItems = [
    {
      title: '基地日常开支',
      description: '记录和管理基地的日常开销',
      icon: <ExpenseIcon sx={{ fontSize: 40 }} />,
      path: '/expense/list',
      color: '#2196f3',
      available: true
    },
    {
      title: '采购记录管理',
      description: '管理采购记录和供应商信息',
      icon: <PurchaseIcon sx={{ fontSize: 40 }} />,
      path: '/purchase/list',
      color: '#4caf50',
      available: isAdmin
    },
    {
      title: '库存管理',
      description: '库存管理与物资申领',
      icon: <InventoryIcon sx={{ fontSize: 40 }} />,
      path: '/inventory/management',
      color: '#ff9800',
      available: isAdmin || user?.role === 'base_agent'
    },
    {
      title: '基地管理',
      description: '管理系统中的基地信息，增删改查基地',
      icon: <BaseIcon sx={{ fontSize: 40 }} />,
      path: '/base/management',
      color: '#673ab7',
      available: isAdmin
    },
    {
      title: '人员管理',
      description: '管理系统用户，设置角色和权限',
      icon: <UserIcon sx={{ fontSize: 40 }} />,
      path: '/user/management',
      color: '#e91e63',
      available: isAdmin
    },
    {
      title: '个人资料',
      description: '管理个人信息和密码',
      icon: <ProfileIcon sx={{ fontSize: 40 }} />,
      path: '/profile',
      color: '#9c27b0',
      available: true
    }
  ];

  const availableItems = menuItems.filter(item => item.available);

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center" color="primary">
          Summary 管理系统
        </Typography>
        <Typography variant="h6" align="center" color="text.secondary" gutterBottom>
          欢迎回来，{user?.name}！
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1, gap: 1 }}>
          <Chip 
            label={user?.role === 'admin' ? '管理员' : 
                   user?.role === 'factory_manager' ? '厂长' :
                   user?.role === 'captain' ? '队长' : '基地代理'} 
            color={user?.role === 'admin' ? 'primary' : 'secondary'}
            variant="outlined"
          />
          {user?.base && (
            <Chip 
              label={`基地: ${user.base}`} 
              color="default"
              variant="outlined"
              sx={{}}
            />
          )}
        </Box>
        {/* 汇率换算卡片（优化样式） */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', maxWidth: 760, mx: 'auto', mb: 3 }}>
          <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb: 1 }}>
            <Box sx={{ display:'flex', alignItems:'center', gap: 1 }}>
              <CurrencyExchangeIcon color="primary" />
              <Typography variant="subtitle1">汇率换算</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">以人民币 CNY 为基准，仅供参考</Typography>
          </Box>
          <Divider sx={{ mb: 1 }} />
          {rateError && (
            <Typography variant="body2" color="error" sx={{ mb: 1 }}>{rateError}</Typography>
          )}
          {rateLoading ? (
            <Box>
              {[...Array(3)].map((_,i)=> (
                <Box key={i} sx={{ display:'flex', alignItems:'center', gap: 2, py: 0.5 }}>
                  <Skeleton variant="text" width={160} height={24} />
                  <Skeleton variant="text" width={200} height={24} />
                  <Skeleton variant="text" width={220} height={24} />
                </Box>
              ))}
            </Box>
          ) : (
            <Table size="small" sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
              <TableHead>
                <TableRow>
                  <TableCell>币种</TableCell>
                  <TableCell>1 单位 ≈ 人民币 (CNY)</TableCell>
                  <TableCell>更新时间</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rates
                  .filter(r => (r.currency || '').toUpperCase() !== 'CNY')
                  .map(r => {
                    const c = (r.currency || '').toUpperCase();
                    const rate = Number(r.rate_to_cny || 0);
                    const updated = r.updated_at ? new Date(r.updated_at) : null;
                    return (
                      <TableRow key={c}>
                        <TableCell>{currencyCn(c)} ({c})</TableCell>
                        <TableCell>{fmt(rate, 4)}</TableCell>
                        <TableCell>{updated ? updated.toLocaleString() : '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                {rates.filter(r => (r.currency || '').toUpperCase() !== 'CNY').length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography variant="body2" color="text.secondary">暂无汇率数据</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Paper>
      </Box>

      <Grid container spacing={3}>
        {availableItems.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <CardActionArea 
                onClick={() => navigate(item.path)}
                sx={{ height: '100%', p: 2 }}
              >
                <CardContent sx={{ textAlign: 'center', height: '100%' }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: item.color,
                      width: 64,
                      height: 64,
                      margin: '0 auto 16px'
                    }}
                  >
                    {item.icon}
                  </Avatar>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 提示：老挝金额单位说明（移动至系统功能说明上方） */}
      <Paper elevation={0} sx={{ mt: 4, mb: 2, p: 1.5, borderRadius: 2, bgcolor: 'background.default', border: '1px dashed', borderColor: 'divider', maxWidth: 720, mx: 'auto' }}>
        <Typography variant="body2" color="text.secondary">
          提示：老挝币种LAK金额默认以“万”为单位显示。例如输入/显示 20 表示 20 万 LAK。
        </Typography>
      </Paper>

      <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          系统功能说明
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          • <strong>基地日常开支：</strong>用于记录和管理各基地的日常开销，支持按类别、时间筛选
        </Typography>
        {isAdmin && (
          <>
            <Typography variant="body2" color="text.secondary" paragraph>
              • <strong>采购记录管理：</strong>管理员专用功能，用于记录和跟踪采购信息
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              • <strong>统计分析：</strong>管理员专用功能，提供详细的开支和采购统计报表
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              • <strong>基地管理：</strong>管理员专用功能，管理系统中的基地信息，支持增删改查
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              • <strong>人员管理：</strong>管理员专用功能，管理系统用户和角色权限
            </Typography>
          </>
        )}
        <Typography variant="body2" color="text.secondary">
          • <strong>个人资料：</strong>管理个人信息，修改登录密码
        </Typography>
      </Box>
    </Container>
  );
};

export default WelcomeView;
