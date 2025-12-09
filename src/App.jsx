// src/App.jsx
import React, { Suspense, useState, useEffect, useMemo } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import {
  ThemeProvider,
  CssBaseline,
  Backdrop,
  CircularProgress,
  Box,
  alpha,
} from '@mui/material';
import ErrorBoundary from './ErrorBoundary';
import { AuthProvider, useAuth, OrganizationProvider, useOrganization } from './contexts/AuthContext';
import { SnackbarProvider, useSnackbar } from './contexts/SnackbarContext';
import useThemeMode from './hooks/useThemeMode';
import createTheme from './styles/theme';
import { TokenManager, apiEvents, trackError } from './api';

// ===================== LAZY LOADING & PRELOAD =====================
const lazyWithRetry = (importFunc, name) => {
  return React.lazy(async () => {
    try {
      const module = await importFunc();
      return module;
    } catch (error) {
      console.error(`Failed to load "${name}", retrying...`, error);
      const hasReloaded = JSON.parse(localStorage.getItem('page_force_refreshed') || 'false');
      if (!hasReloaded) {
        localStorage.setItem('page_force_refreshed', 'true');
        window.location.reload();
      }
      throw error;
    }
  });
};

const preloadedComponents = new Map();
export const preloadComponent = (importFunc, name) => {
  if (!preloadedComponents.has(name)) {
    preloadedComponents.set(name, importFunc().catch(err => console.error(`Preload "${name}" failed:`, err)));
  }
  return preloadedComponents.get(name);
};

// Public
const LandingPage = lazyWithRetry(() => import('./pages/LandingPage'), 'LandingPage');
const AuthPage = lazyWithRetry(() => import('./pages/Auth'), 'AuthPage');
const NotFound = lazyWithRetry(() => import('./pages/errors/NotFound'), 'NotFound');

// Protected / deferred
const PricingPage = lazyWithRetry(() => import('./pages/Pricing'), 'PricingPage');
const ContactPage = lazyWithRetry(() => import('./pages/Contact'), 'ContactPage');
const MainLayout = lazyWithRetry(() => import('./layouts/MainLayout'), 'MainLayout');
const AuthLayout = lazyWithRetry(() => import('./layouts/AuthLayout'), 'AuthLayout');
const AdminDashboard = lazyWithRetry(() => import('./pages/Admin/Dashboard'), 'AdminDashboard');

// ===================== ROUTE GUARDS =====================
const ProtectedRoute = ({ children, requiredRoles = [], requiredPermissions = [] }) => {
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      showSnackbar({ message: 'Please sign in to continue', severity: 'info' });
      navigate(`/auth/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
    }
  }, [currentUser, isLoading, navigate, location, showSnackbar]);

  const hasRole = requiredRoles.length === 0 || requiredRoles.some(r => currentUser?.roles?.includes(r));
  const hasPerm = requiredPermissions.length === 0 || requiredPermissions.every(p => currentUser?.permissions?.includes(p));

  if (isLoading || !currentUser) return <LoadingScreen fullScreen />;
  if (!hasRole || !hasPerm) return <Navigate to="/unauthorized" replace />;

  return children;
};

const OrganizationRoute = ({ children }) => {
  const { currentOrganization, isLoading } = useOrganization();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    if (!isLoading && !currentOrganization?.id) {
      showSnackbar({ message: 'Please select an organization', severity: 'info' });
      navigate('/organizations', { replace: true });
    }
  }, [currentOrganization, isLoading, navigate, showSnackbar]);

  if (isLoading || !currentOrganization?.id) return <LoadingScreen fullScreen />;
  return children;
};

const PublicRoute = ({ children, restricted = false }) => {
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && currentUser && restricted) navigate('/dashboard', { replace: true });
  }, [currentUser, isLoading, navigate, restricted]);

  if (isLoading || (currentUser && restricted)) return <LoadingScreen fullScreen />;
  return children;
};

// ===================== GLOBAL COMPONENTS =====================
const LoadingScreen = ({ fullScreen = false, message = 'Loading...' }) => (
  <Backdrop open sx={{ zIndex: 9999, color: '#fff', backdropFilter: 'blur(4px)' }}>
    <Box sx={{ textAlign: 'center' }}>
      <CircularProgress size={60} thickness={4} color="inherit" />
      <Box sx={{ mt: 2 }}>{message}</Box>
    </Box>
  </Backdrop>
);

const SuspenseFallback = ({ theme }) => (
  <Box
    sx={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.05)} 0%, ${alpha(
        theme.palette.secondary.light,
        0.05
      )} 100%)`,
    }}
  >
    <CircularProgress size={80} thickness={4} color="primary" />
  </Box>
);

const GlobalErrorHandler = ({ children }) => {
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    const handleError = event => {
      console.error('Global Error:', event.error);
      trackError(event.error, { context: 'global_error' });
      showSnackbar({ message: 'Something went wrong', severity: 'error' });
      event.preventDefault();
    };
    const handleRejection = event => {
      console.error('Unhandled rejection:', event.reason);
      trackError(event.reason, { context: 'unhandled_rejection' });
      showSnackbar({ message: 'Network/server error occurred', severity: 'error' });
      event.preventDefault();
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [showSnackbar]);

  return children;
};

// ===================== APP COMPONENT =====================
export default function App() {
  const { mode } = useThemeMode();
  const theme = createTheme(mode);
  const [appReady, setAppReady] = useState(false);

  // App ready after load
  useEffect(() => {
    if (import.meta.env.PROD) {
      const startTime = performance.now();
      const handleLoad = () => {
        const loadTime = performance.now() - startTime;
        if (window.gtag) window.gtag('event', 'timing_complete', { name: 'app_load_time', value: Math.round(loadTime) });
        setAppReady(true);
      };
      if (document.readyState === 'complete') handleLoad();
      else window.addEventListener('load', handleLoad);
    } else setAppReady(true);
  }, []);

  // Preload critical components
  useEffect(() => {
    if (appReady && TokenManager.getToken() && !TokenManager.isTokenExpired()) {
      preloadComponent(() => import('./pages/Admin/Dashboard'), 'AdminDashboard');
      preloadComponent(() => import('./layouts/MainLayout'), 'MainLayout');
    }
  }, [appReady]);

  // Token expiry check
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (TokenManager.isTokenExpired()) {
        TokenManager.clearAll();
        if (!window.location.pathname.includes('/auth')) window.location.href = '/auth/login?session=expired';
      }
    }, 60000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        <GlobalErrorHandler>
          <AuthProvider>
            <OrganizationProvider>
              <SnackbarProvider>
                <Router>
                  <Suspense fallback={<SuspenseFallback theme={theme} />}>
                    <Routes>
                      {/* Public Routes */}
                      <Route path="/" element={<MainLayout />}>
                        <Route index element={<LandingPage />} />
                        <Route path="pricing" element={<PricingPage />} />
                        <Route path="contact" element={<ContactPage />} />
                        <Route path="*" element={<NotFound />} />
                      </Route>

                      {/* Auth Routes */}
                      <Route element={<AuthLayout />}>
                        <Route path="auth/*" element={<PublicRoute restricted><AuthPage /></PublicRoute>} />
                      </Route>

                      {/* Dashboard Routes */}
                      <Route
                        path="dashboard/*"
                        element={
                          <ProtectedRoute requiredPermissions={['view_dashboard']}>
                            <OrganizationRoute>
                              <MainLayout />
                            </OrganizationRoute>
                          </ProtectedRoute>
                        }
                      />
                    </Routes>
                  </Suspense>
                </Router>
              </SnackbarProvider>
            </OrganizationProvider>
          </AuthProvider>
        </GlobalErrorHandler>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
