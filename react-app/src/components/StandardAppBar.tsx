/**
 * StandardAppBar - Summary系统顶部导航栏
 *
 * 提供主要功能的快速导航和用户菜单
 * 根据用户角色显示不同的菜单选项
 */
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  useTheme,
  Button,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  Receipt as ExpenseIcon,
  ShoppingCart as PurchaseIcon,
  BarChart as StatsIcon,
  Menu as MenuIcon,
  Business as BaseIcon,
  People as UserIcon
} from '@mui/icons-material';
import UserMenu from './UserMenu';
import useAuthStore from '../auth/AuthStore';

const StandardAppBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';
  
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchorEl);

  // Check if the current location is the root URL
  const isRoot = location.pathname === '/';

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
  const backgroundColor = theme.palette.mode === 'light' ? 'black' : 'white';
  const iconColor = theme.palette.mode === 'light' ? 'white' : 'black';
  const textColor = theme.palette.mode === 'light' ? 'white' : 'black';

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
      available: isAdmin
    }
  ];

  const availableNavItems = navigationItems.filter(item => item.available);

  return (
    <AppBar position="fixed" elevation={1} sx={{ backgroundColor }}>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', position: 'relative', px: '20px' }}>
        {/* Left side - Back button or Home button */}
        <Box sx={{ display: 'flex', alignItems: 'center', position: 'absolute', left: '20px' }}>
          {!isRoot ? (
            <IconButton
              edge="start"
              aria-label="back"
              onClick={handleBackClick}
              sx={{ marginRight: 2 }}
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
              sx={{ marginRight: 2 }}
            >
              <HomeIcon sx={{ color: iconColor }} />
            </IconButton>
          )}

          {/* App Title */}
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ color: textColor, fontWeight: 'bold' }}
          >
            Summary系统
          </Typography>
        </Box>

        {/* Center - Navigation Menu for larger screens - 真正居中 */}
        <Box sx={{ 
          display: { xs: 'none', md: 'flex' }, 
          alignItems: 'center', 
          gap: 1,
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)'
        }}>
          {availableNavItems.map((item) => (
            <Button
              key={item.path}
              onClick={() => navigate(item.path)}
              startIcon={item.icon}
              sx={{
                color: textColor,
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        {/* Right side - Menu for mobile and User Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', position: 'absolute', right: '20px' }}>
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
              {availableNavItems.map((item) => (
                <MenuItem
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  sx={{ minWidth: 150 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {item.icon}
                    {item.label}
                  </Box>
                </MenuItem>
              ))}
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
