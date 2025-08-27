import ErrorBoundary from './components/ErrorBoundary';
import Routes from './routes/Routes';
import ThemeProvider from './theme/ThemeProvider';
import { AuthProvider } from './auth/AuthProvider';
import { NotificationProvider } from './components/NotificationProvider';

/**
 * Root Application Component
 * @component MainApp
 */
const MainApp = () => {
  return (
    <ErrorBoundary name="App">
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <Routes />
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default MainApp;