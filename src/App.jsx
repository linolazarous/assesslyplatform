// src/App.jsx
import React, { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useSearchParams,
} from 'react-router-dom';
import {
  ThemeProvider,
  CssBaseline,
  Box,
  alpha,
  Backdrop,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import ErrorBoundary from './ErrorBoundary';
import LoadingScreen from './components/ui/LoadingScreen';
import { AuthProvider, useAuth, OrganizationProvider, useOrganization } from './contexts/AuthContext';
import { SnackbarProvider, useSnackbar } from './contexts/SnackbarContext';
import useThemeMode from './hooks/useThemeMode';
import createTheme from './styles/theme';
import { TokenManager, apiEvents, trackError } from './api';

// ===================== LAZY LOADING CONFIGURATION =====================

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
    preloadedComponents.set(name, importFunc().catch(err => 
      console.error(`Preload "${name}" failed:`, err)
    ));
  }
  return preloadedComponents.get(name);
};

// Lazy-loaded components
const LandingPage = lazyWithRetry(() => import('./pages/LandingPage'), 'LandingPage');
const AuthPage = lazyWithRetry(() => import('./pages/Auth'), 'AuthPage');
const NotFound = lazyWithRetry(() => import('./pages/errors/NotFound'), 'NotFound');
const PricingPage = lazyWithRetry(() => import('./pages/Pricing'), 'PricingPage');
const ContactPage = lazyWithRetry(() => import('./pages/Contact'), 'ContactPage');
const MainLayout = lazyWithRetry(() => import('./layouts/MainLayout'), 'MainLayout');
const AuthLayout = lazyWithRetry(() => import('./layouts/AuthLayout'), 'AuthLayout');
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'), 'Dashboard');
const Assessments = lazyWithRetry(() => import('./pages/Assessments'), 'Assessments');
const AssessmentDetail = lazyWithRetry(() => import('./pages/AssessmentDetail'), 'AssessmentDetail');
const Users = lazyWithRetry(() => import('./pages/Users'), 'Users');
const Profile = lazyWithRetry(() => import('./pages/Profile'), 'Profile');
const Settings = lazyWithRetry(() => import('./pages/Settings'), 'Settings');
const AdminDashboard = lazyWithRetry(() => import('./pages/Admin/Dashboard'), 'AdminDashboard');

// ===================== ROUTE GUARDS =====================

const ProtectedRoute = ({ children, requiredRoles = [], requiredPermissions = [] }) => {
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      const redirectTo = searchParams.get('redirect') || location.pathname;
      showSnackbar({
        message: 'Please sign in to continue',
        severity: 'info',
      });
      navigate(`/auth/login?redirect=${encodeURIComponent(redirectTo)}`, {
        replace: true,
      });
    }
  }, [currentUser, isLoading, navigate, location, searchParams, showSnackbar]);

  const hasRequiredRole = useMemo(() => {
    if (requiredRoles.length === 0) return true;
    return requiredRoles.some(role => currentUser?.roles?.includes(role));
  }, [currentUser, requiredRoles]);

  const hasRequiredPermissions = useMemo(() => {
    if (requiredPermissions.length === 0) return true;
    return requiredPermissions.every(perm => currentUser?.permissions?.includes(perm));
  }, [currentUser, requiredPermissions]);

  if (isLoading) {
    return <LoadingScreen fullScreen message="Verifying authentication..." />;
  }

  if (!currentUser) {
    return null;
  }

  if (!hasRequiredRole || !hasRequiredPermissions) {
    showSnackbar({
      message: 'You do not have the required permissions to access this page',
      severity: 'error',
    });
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

const OrganizationRoute = ({ children }) => {
  const { currentOrganization, isLoading } = useOrganization();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    if (!isLoading && !currentOrganization?.id) {
      showSnackbar({
        message: 'Please select an organization to continue',
        severity: 'info',
      });
      navigate('/organizations', { replace: true });
    }
  }, [currentOrganization, isLoading, navigate, showSnackbar]);

  if (isLoading) {
    return <LoadingScreen fullScreen message="Loading organization..." />;
  }

  if (!currentOrganization?.id) {
    return null;
  }

  return children;
};

const PublicRoute = ({ children, restricted = false }) => {
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && currentUser && restricted) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, isLoading, navigate, restricted]);

  if (isLoading) {
    return <LoadingScreen fullScreen />;
  }

  if (currentUser && restricted) {
    return null;
  }

  return children;
};

// ===================== GLOBAL COMPONENTS =====================

const GlobalErrorHandler = ({ children }) => {
  const { showSnackbar } = useSnackbar();

  const handleGlobalError = useCallback((event) => {
    console.error('⚠️ Global error caught:', event.error);
    
    const errorDetails = {
      message: event.error?.message || 'An unexpected error occurred',
      stack: event.error?.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    trackError(event.error, { context: 'global_error_handler' });
    
    showSnackbar({
      message: 'Something went wrong. Please try again.',
      severity: 'error',
    });

    event.preventDefault();
  }, [showSnackbar]);

  const handleUnhandledRejection = useCallback((event) => {
    console.error('⚠️ Unhandled promise rejection:', event.reason);
    
    trackError(event.reason, { context: 'unhandled_rejection' });
    
    showSnackbar({
      message: 'A network or server error occurred',
      severity: 'error',
    });

    event.preventDefault();
  }, [showSnackbar]);

  useEffect(() => {
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    const handleApiError = (apiError) => {
      if (apiError.code === 'SESSION_EXPIRED') {
        showSnackbar({
          message: 'Your session has expired. Please sign in again.',
          severity: 'warning',
        });
        TokenManager.clearAll();
        window.location.href = '/auth/login?session=expired';
      }
    };

    apiEvents.on('request:error', handleApiError);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      apiEvents.off('request:error', handleApiError);
    };
  }, [handleGlobalError, handleUnhandledRejection, showSnackbar]);

  return children;
};

const GlobalLoadingIndicator = () => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleRouteChangeStart = () => setLoading(true);
    const handleRouteChangeEnd = () => setLoading(false);
    const handleRouteChangeError = () => setLoading(false);

    window.addEventListener('beforeunload', handleRouteChangeStart);
    window.addEventListener('load', handleRouteChangeEnd);
    window.addEventListener('error', handleRouteChangeError);

    return () => {
      window.removeEventListener('beforeunload', handleRouteChangeStart);
      window.removeEventListener('load', handleRouteChangeEnd);
      window.removeEventListener('error', handleRouteChangeError);
    };
  }, []);

  if (!loading) return null;

  return (
    <Backdrop
      open={loading}
      sx={{
        zIndex: 9999,
        color: '#fff',
        background: alpha('#000', 0.7),
        backdropFilter: 'blur(4px)',
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <CircularProgress
          size={60}
          thickness={4}
          sx={{
            color: 'primary.main',
            mb: 2,
          }}
        />
        <Box sx={{ color: 'white', fontSize: '0.875rem' }}>
          Loading...
        </Box>
      </Box>
    </Backdrop>
  );
};

const SuspenseFallback = ({ theme }) => (
  <Box
    sx={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(135deg, ${alpha(
        theme.palette.primary.light,
        0.05
      )} 0%, ${alpha(theme.palette.secondary.light, 0.05)} 100%)`,
    }}
  >
    <Box sx={{ width: 'min(400px, 90vw)', textAlign: 'center' }}>
      <Box sx={{ position: 'relative', mb: 4 }}>
        <CircularProgress
          size={80}
          thickness={4}
          sx={{
            color: 'primary.main',
            animationDuration: '1.5s',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          A
        </Box>
      </Box>
      <LinearProgress
        sx={{
          height: 8,
          borderRadius: 4,
          mb: 3,
          background: alpha(theme.palette.primary.main, 0.1),
          '& .MuiLinearProgress-bar': {
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            animationDuration: '2s',
          },
        }}
      />
      <Box sx={{ mt: 3 }}>
        <Box
          component="span"
          sx={{
            fontSize: '0.875rem',
            color: 'text.secondary',
            fontWeight: 500,
            display: 'block',
            mb: 1,
          }}
        >
          Loading Assessly Platform...
        </Box>
      </Box>
    </Box>
  </Box>
);

const GlobalSnackbar = () => {
  const { snackbar, hideSnackbar } = useSnackbar();

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') return;
    hideSnackbar();
  };

  if (!snackbar) return null;

  return (
    <Snackbar
      open={!!snackbar}
      autoHideDuration={snackbar.duration || 6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ zIndex: 99999 }}
    >
      <Alert
        onClose={handleClose}
        severity={snackbar.severity || 'info'}
        elevation={6}
        variant="filled"
        icon={snackbar.icon !== false}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>
  );
};

// Alert component from MUI
const Alert = ({ onClose, severity, elevation, variant, icon, children, sx }) => (
  <Box
    sx={{
      padding: '12px 16px',
      borderRadius: '4px',
      backgroundColor: severity === 'error' ? '#d32f2f' : 
                     severity === 'warning' ? '#ed6c02' : 
                     severity === 'success' ? '#2e7d32' : '#0288d1',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      ...sx,
    }}
  >
    {icon && (
      <Box sx={{ fontSize: '1.25rem' }}>
        {severity === 'error' ? '❌' :
         severity === 'warning' ? '⚠️' :
         severity === 'success' ? '✅' : 'ℹ️'}
      </Box>
    )}
    <Box sx={{ flex: 1 }}>{children}</Box>
    {onClose && (
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '1rem',
        }}
      >
        ✕
      </button>
    )}
  </Box>
);

// ===================== APP COMPONENT =====================

export default function App() {
  const { mode } = useThemeMode();
  const theme = createTheme(mode);
  const [appReady, setAppReady] = useState(false);

  // App initialization
  useEffect(() => {
    if (import.meta.env.PROD) {
      const startTime = performance.now();
      const handleLoadComplete = () => {
        const loadTime = performance.now() - startTime;
        if (window.gtag) {
          window.gtag('event', 'timing_complete', {
            name: 'app_load_time',
            value: Math.round(loadTime),
            event_category: 'Performance',
          });
        }
        console.log(`📊 App rendered in ${Math.round(loadTime)}ms`);
        setAppReady(true);
      };

      if (document.readyState === 'complete') {
        handleLoadComplete();
      } else {
        window.addEventListener('load', handleLoadComplete);
        return () => window.removeEventListener('load', handleLoadComplete);
      }
    } else {
      setAppReady(true);
    }
  }, []);

  // Preload components based on authentication
  useEffect(() => {
    if (appReady) {
      const token = TokenManager.getToken();
      if (token && !TokenManager.isTokenExpired()) {
        preloadComponent(() => import('./pages/Dashboard'), 'dashboard');
        preloadComponent(() => import('./layouts/MainLayout'), 'mainLayout');
        preloadComponent(() => import('./pages/Assessments'), 'assessments');
      } else {
        preloadComponent(() => import('./pages/LandingPage'), 'landingPage');
        preloadComponent(() => import('./pages/Auth'), 'auth');
      }
    }
  }, [appReady]);

  // Token expiry check
  useEffect(() => {
    const checkTokenExpiry = () => {
      if (TokenManager.isTokenExpired()) {
        console.warn('⚠️ Token expired, clearing storage');
        TokenManager.clearAll();
        if (!window.location.pathname.includes('/auth')) {
          window.location.href = '/auth/login?session=expired';
        }
      }
    };

    const intervalId = setInterval(checkTokenExpiry, 60000);
    checkTokenExpiry();

    return () => clearInterval(intervalId);
  }, []);

  // Simple route configuration
  const routes = useMemo(() => [
    // Public landing routes
    { path: '/', element: <LandingPage /> },
    { path: '/pricing', element: <PricingPage /> },
    { path: '/contact', element: <ContactPage /> },
    
    // Auth routes
    { 
      path: '/auth/*', 
      element: (
        <PublicRoute restricted>
          <AuthLayout>
            <AuthPage />
          </AuthLayout>
        </PublicRoute>
      ) 
    },
    
    // Protected dashboard routes
    { 
      path: '/dashboard', 
      element: (
        <ProtectedRoute requiredPermissions={['view_dashboard']}>
          <OrganizationRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </OrganizationRoute>
        </ProtectedRoute>
      ) 
    },
    
    // Assessments routes
    { 
      path: '/assessments', 
      element: (
        <ProtectedRoute requiredPermissions={['view_assessments']}>
          <OrganizationRoute>
            <MainLayout>
              <Routes>
                <Route index element={<Assessments />} />
                <Route path=":id" element={<AssessmentDetail />} />
              </Routes>
            </MainLayout>
          </OrganizationRoute>
        </ProtectedRoute>
      ) 
    },
    
    // Users routes
    { 
      path: '/users', 
      element: (
        <ProtectedRoute requiredPermissions={['view_users']}>
          <OrganizationRoute>
            <MainLayout>
              <Users />
            </MainLayout>
          </OrganizationRoute>
        </ProtectedRoute>
      ) 
    },
    
    // Profile & Settings
    { 
      path: '/profile', 
      element: (
        <ProtectedRoute>
          <MainLayout>
            <Profile />
          </MainLayout>
        </ProtectedRoute>
      ) 
    },
    
    { 
      path: '/settings', 
      element: (
        <ProtectedRoute>
          <MainLayout>
            <Settings />
          </MainLayout>
        </ProtectedRoute>
      ) 
    },
    
    // Admin routes
    { 
      path: '/admin', 
      element: (
        <ProtectedRoute requiredRoles={['admin']} requiredPermissions={['admin_access']}>
          <OrganizationRoute>
            <MainLayout>
              <AdminDashboard />
            </MainLayout>
          </OrganizationRoute>
        </ProtectedRoute>
      ) 
    },
    
    // Error pages
    { path: '/unauthorized', element: <div>Unauthorized Access</div> },
    
    // Catch-all (404)
    { path: '*', element: <NotFound /> },
  ], []);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        <GlobalErrorHandler>
          <AuthProvider>
            <OrganizationProvider>
              <SnackbarProvider>
                <Router>
                  <GlobalLoadingIndicator />
                  <Suspense fallback={<SuspenseFallback theme={theme} />}>
                    <Routes>
                      {routes.map((route, index) => (
                        <Route key={index} path={route.path} element={route.element} />
                      ))}
                    </Routes>
                  </Suspense>
                  <GlobalSnackbar />
                </Router>
              </SnackbarProvider>
            </OrganizationProvider>
          </AuthProvider>
        </GlobalErrorHandler>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

// Development utilities
if (import.meta.env.DEV) {
  window.__ASSESSLY_DEV__ = {
    version: import.meta.env.VITE_APP_VERSION || 'development',
    mode: import.meta.env.MODE,
    clearAuth: () => {
      TokenManager.clearAll();
      console.log('🔐 Auth cleared');
      window.location.href = '/';
    },
    getStorage: () => ({
      token: TokenManager.getToken(),
      user: TokenManager.getUserInfo(),
    }),
    preloadComponent: (name) => {
      const componentMap = {
        dashboard: () => import('./pages/Dashboard'),
        pricing: () => import('./pages/Pricing'),
        contact: () => import('./pages/Contact'),
      };
      
      if (componentMap[name]) {
        preloadComponent(componentMap[name], name);
        console.log(`🔍 Preloaded: ${name}`);
      }
    },
  };

  console.log(
    `%c🔧 Assessly Development v${window.__ASSESSLY_DEV__.version}`,
    'background: linear-gradient(90deg, #667eea, #764ba2); color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold;'
  );
}
