import { FunctionComponent, useMemo, PropsWithChildren, useState, useEffect, createContext, useContext } from 'react';
import { ThemeProvider as EmotionThemeProvider } from '@emotion/react';
import { CssBaseline, createTheme } from '@mui/material';

// Create a context for theme
const ThemeContext = createContext({ toggleDarkMode: () => {}, darkMode: false });

const AppThemeProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const [darkMode, setDarkMode] = useState<boolean>(false);  // Set default mode
  const [loading, setLoading] = useState(true);

  const toggleDarkMode = () => {
    setDarkMode((prevDarkMode) => !prevDarkMode);
  };

  // Ensure the component is fully mounted before rendering the theme
  useEffect(() => {
    setLoading(false); // Simulate loading complete after component mount
  }, []);

  const currentTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          primary: { main: '#3388FF' },
          secondary: { main: '#22D39E' },
          success: { main: '#4caf50' },
          error: { main: '#f44336' },
          warning: { main: '#ff9800' },
          info: { main: '#2196f3' },
        },
        typography: {
          fontFamily: "Work Sans, Helvetica, Arial, sans-serif",
          h1: {
            fontSize: "3rem",
            fontWeight: 500
          },
          h2: {
            fontSize: "2.5rem",
            fontFamily: "Work Sans, Helvetica, Arial, sans-serif"
          },
          h3: {
            fontSize: "2.125rem",
            fontFamily: "Work Sans, Helvetica, Arial, sans-serif"
          },
          h4: {
            fontSize: "1.75rem",
            fontFamily: "Work Sans, Helvetica, Arial, sans-serif",
            fontWeight: 500
          },
          h5: {
            fontFamily: "Work Sans, Helvetica, Arial, sans-serif",
            fontWeight: 500
          },
          h6: {
            fontFamily: "Work Sans, Helvetica, Arial, sans-serif"
          },
          body1: {
            fontFamily: "Work Sans, Helvetica, Arial, sans-serif"
          },
          body2: {
            fontFamily: "Work Sans, Helvetica, Arial, sans-serif"
          },
          subtitle1: {
            fontFamily: "Work Sans, Helvetica, Arial, sans-serif",
            fontWeight: 600
          },
          subtitle2: {
            fontFamily: "Work Sans, Helvetica, Arial, sans-serif",
            fontWeight: 400
          },
          overline: {
            fontFamily: "Work Sans, Helvetica, Arial, sans-serif"
          },
          caption: {
            fontSize: "0.6875rem",
            fontFamily: "Work Sans, Helvetica, Arial, sans-serif",
            fontWeight: 600
          },
        },
        shape: {
          borderRadius: 4,
        },
      }),
    [darkMode]
  );

  if (loading) return null; // Don't render anything until the component is mounted

  return (
    <ThemeContext.Provider value={{ toggleDarkMode, darkMode }}>
      <EmotionThemeProvider theme={currentTheme}>
        <CssBaseline />
        {children}
      </EmotionThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);

export default AppThemeProvider;
