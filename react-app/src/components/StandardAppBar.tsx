/**
 * StandardAppBar - Summary系统顶部导航栏
 *
 * 提供主要功能的快速导航和用户菜单
 * 根据用户角色显示不同的菜单选项
 */
import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
  Button,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  Receipt as ExpenseIcon,
  ShoppingCart as PurchaseIcon,
  Inventory2 as InventoryIcon,
  BarChart as StatsIcon,
  Insights as InsightsIcon,
  Menu as MenuIcon,
  Business as BaseIcon,
  People as UserIcon,
  AccountBalanceWallet as PayableIcon,
  Storefront as SupplierIcon,
  Category as CategoryIcon,
  Warehouse as WarehouseIcon,
  MoreHoriz as MoreIcon,
} from '@mui/icons-material';
import UserMenu from './UserMenu';
import useAuthStore from '../auth/AuthStore';
import { useThemeContext } from '../theme/ThemeProvider';
import { DarkMode as DarkModeIcon, LightMode as LightModeIcon } from '@mui/icons-material';

const StandardAppBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const { toggleDarkMode, darkMode } = useThemeContext();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const isLgUp = useMediaQuery(theme.breakpoints.up('lg'));
  const isXlUp = useMediaQuery(theme.breakpoints.up('xl'));
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';
  const isBaseAgent = user?.role === 'base_agent';
  
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchorEl);

  // Always show back icon; do not switch to home icon on '/'
  const isRoot = false;

  const handleBackClick = () => {
    navigate(-1); // Go back to the previous page
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleMenuClose();
  };

  // Dynamic styles based on theme mode
  // Colors: light green with 70% opacity (banana page style)
  const barBg = alpha(theme.palette.secondary.light || theme.palette.secondary.main, 0.7);
  const iconColor = theme.palette.text.primary;
  const textColor = theme.palette.text.primary;

  const navigationItems = [
    {
      label: '主页',
      path: '/',
      icon: <HomeIcon />,
      available: true
    },
    {
      label: '基地开支',
      path: '/expense/list',
      icon: <ExpenseIcon />,
      available: true
    },
    {
      label: '应付款管理',
      path: '/payable/list',
      icon: <PayableIcon />,
      available: isAdmin
    },
    {
      label: '供应商管理',
      path: '/supplier/management',
      icon: <SupplierIcon />,
      available: isAdmin
    },
    {
      label: '商品管理',
      path: '/product/management',
      icon: <InventoryIcon />,
      available: isAdmin
    },
    {
      label: '库存管理',
      path: '/inventory/management',
      icon: <WarehouseIcon />,
      available: true
    },
    {
      label: '采购管理',
      path: '/purchase/list',
      icon: <PurchaseIcon />,
      available: isAdmin
    },
    {
      label: '统计分析',
      path: '/expense/stats',
      icon: <StatsIcon />,
      available: isAdmin
    },
    {
      label: '基地管理',
      path: '/base/management',
      icon: <BaseIcon />,
      available: isAdmin
    },
    {
      label: '人员管理',
      path: '/user/management',
      icon: <UserIcon />,
      available: isAdmin || isBaseAgent
    },
    {
      label: '类别管理',
      path: '/expense/category-management',
      icon: <CategoryIcon />,
      available: isAdmin
    }
  ];

  const availableNavItems = useMemo(() => navigationItems.filter(item => item.available), [navigationItems]);

  // Visible vs overflow (center area)
  const maxVisible = useMemo(() => {
    if (isXlUp) return 8;
    if (isLgUp) return 6;
    if (isMdUp) return 4;
    return 0;
  }, [isMdUp, isLgUp, isXlUp]);
  const visibleNavItems = availableNavItems.slice(0, maxVisible);
  const overflowNavItems = availableNavItems.slice(maxVisible);
  const [moreAnchor, setMoreAnchor] = useState<null | HTMLElement>(null);
  const moreOpen = Boolean(moreAnchor);

  // Determine a single active path (avoid multiple highlights and '/' always-on)
  const calcMatchLen = (path: string) => {
    const cur = location.pathname;
    if (path === '/') return cur === '/' ? 1 : 0;
    if (cur === path) return path.length;
    if (cur.startsWith(path + '/')) return path.length;
    return 0;
  };
  const activePath = availableNavItems
    .map(i => ({ path: i.path, len: calcMatchLen(i.path) }))
    .sort((a, b) => b.len - a.len)[0]?.path || '';
  const isActive = (path: string) => path === activePath;

  return (
    <AppBar position="fixed" elevation={0} sx={{ backgroundColor: barBg }}>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', position: 'relative', px: '16px', minHeight: 52 }}>
        {/* Left side - Back button or Home button */}
        <Box sx={{ display: 'flex', alignItems: 'center', position: 'absolute', left: '20px' }}>
          {!isRoot ? (
            <IconButton
              edge="start"
              aria-label="back"
              onClick={handleBackClick}
              sx={{ marginRight: 1 }}
            >
              <ArrowBackIcon sx={{ color: iconColor }} />
              <Typography variant="body2" sx={{ ml: 1, color: textColor }}>
                返回
              </Typography>
            </IconButton>
          ) : (
            <IconButton
              edge="start"
              aria-label="home"
              onClick={() => navigate('/')}
              sx={{ marginRight: 1 }}
            >
              <HomeIcon sx={{ color: iconColor }} />
            </IconButton>
          )}

          {/* App Title */}
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ color: textColor, fontWeight: 700, fontSize: 14 }}
          >
            Summary系统
          </Typography>
        </Box>

        {/* Center - Navigation Menu for larger screens - 真正居中 */}
        <Box sx={{ 
          display: { xs: 'none', md: 'flex' }, 
          alignItems: 'center',
          gap: 0.25,
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)'
        }}>
          {visibleNavItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Button
                key={item.path}
                onClick={() => navigate(item.path)}
                startIcon={item.icon}
                aria-current={active ? 'page' : undefined}
                sx={{
                  color: textColor,
                  textTransform: 'none',
                  fontWeight: active ? 700 : 500,
                  fontSize: 12,
                  px: 1,
                  py: 0.25,
                  borderRadius: 8,
                  backgroundColor: 'transparent',
                  borderBottom: active ? '2px solid currentColor' : '2px solid transparent',
                  transition: 'transform 160ms ease, border-color 160ms ease',
                  transformOrigin: 'center',
                  '&:hover': {
                    backgroundColor: 'transparent',
                    transform: 'scale(1.08)'
                  },
                  '& .MuiButton-startIcon': {
                    mr: 0.5,
                    '& .MuiSvgIcon-root': { fontSize: 18 }
                  }
                }}
              >
                {item.label}
              </Button>
            );
          })}
          {overflowNavItems.length > 0 && (
            <>
              <Button
                onClick={(e) => setMoreAnchor(e.currentTarget)}
                startIcon={<MoreIcon />}
                sx={{
                  color: textColor,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: 12,
                  px: 1,
                  py: 0.25,
                  borderRadius: 8,
                }}
              >
                更多
              </Button>
              <Menu
                anchorEl={moreAnchor}
                open={moreOpen}
                onClose={() => setMoreAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                transformOrigin={{ vertical: 'top', horizontal: 'center' }}
              >
                {overflowNavItems.map((item) => (
                  <MenuItem key={item.path} onClick={() => { navigate(item.path); setMoreAnchor(null); }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {item.icon}
                      {item.label}
                    </Box>
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
        </Box>

        {/* Right side - Menu for mobile and User Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', position: 'absolute', right: '20px' }}>
          {/* Theme toggle */}
          <Tooltip title={darkMode ? '切换到亮色' : '切换到暗色'}>
            <IconButton onClick={toggleDarkMode} sx={{ color: iconColor, mr: 0.5 }}>
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          {/* Mobile Navigation Menu */}
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            <IconButton
              onClick={handleMenuClick}
              sx={{ color: iconColor }}
            >
              <MenuIcon />
            </IconButton>
            <Menu
              anchorEl={menuAnchorEl}
              open={menuOpen}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              {availableNavItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <MenuItem
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    sx={{ minWidth: 180, fontWeight: active ? 700 : 500 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {item.icon}
                      {item.label}
                    </Box>
                  </MenuItem>
                );
              })}
              <Divider />
              <MenuItem onClick={() => handleNavigate('/profile')}>
                个人资料
              </MenuItem>
            </Menu>
          </Box>

          {/* User Menu */}
          <UserMenu />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default StandardAppBar;
