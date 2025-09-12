import { useState, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconButton,
  Menu,
  MenuItem,
  Switch,
  Box,
} from '@mui/material';
import UserAvatar from './UserAvatar';
import useAuthStore from '../auth/AuthStore';
import { useThemeContext } from '../theme/ThemeProvider'; // Import the dark mode context

interface UserMenuProps {
  className?: string;
}

const UserMenu: React.FC<UserMenuProps> = ({ ...restOfProps }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();

  // Retrieve user info using the auth store (example)
  const { signOut } = useAuthStore(); // Assuming this hook provides the user data and signOut method

  const { darkMode, toggleDarkMode } = useThemeContext();

  const handleMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    handleMenuClose();
    navigate('/profile');
  };

  return (
    <>
      <IconButton onClick={handleMenuOpen} sx={{ p: 0 }} {...restOfProps}>
        <UserAvatar size={40} />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleProfileClick}>Edit Profile</MenuItem>
        <MenuItem onClick={signOut}>Log Out</MenuItem>
        <MenuItem>
          <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
            <span>{!darkMode ? 'Light mode' : 'Dark mode'}</span>
            <Switch checked={darkMode} onChange={toggleDarkMode} />
          </Box>
        </MenuItem>
      </Menu>
    </>
  );
};

export default UserMenu;