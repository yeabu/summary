/**
 * AppView - Layout wrapper component.
 * 
 * Provides a responsive, flexbox-centered container for all main views.
 * Ensures consistent horizontal and vertical alignment and width capping,
 * with support for theming and small-screen adaptation via MUI.
 */
import { FunctionComponent, PropsWithChildren } from 'react';
import { Stack, StackProps, useMediaQuery, useTheme } from '@mui/material';

/**
 * Renders View container composition with limited width and centered content
 * @component AppView
 */
const AppView: FunctionComponent<PropsWithChildren<StackProps>> = ({ children, minWidth, ...restOfProps }) => {
  const theme = useTheme();
  const onSmallScreens = useMediaQuery(theme.breakpoints.down('sm'));
  const minWidthToRender = onSmallScreens ? '100%' : (minWidth ?? 320);

  return (
    <Stack
      sx={{
        display: 'flex', // Flexbox for centering
        justifyContent: 'start', // Vertical centering
        alignItems: 'center', // Horizontal centering
        height: '100vh', // Full viewport height
        width: '100vw', // Full viewport width
      }}
      {...restOfProps}
    >
      <Stack
        gap={2}
        sx={{
          maxWidth: 1000, // Limit content width
          minWidth: minWidthToRender, // Apply min-width dynamically
          width: '100%', // Ensure full width for small screens
          margin: '0 auto', // Horizontal centering
        }}
      >
        {children}
      </Stack>
    </Stack>
  );
};

export default AppView;
