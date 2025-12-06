// src/App.jsx
import React, { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
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
  Snackbar,
  Alert,
  Box,
  LinearProgress,
  alpha,
} from '@mui/material';
import ErrorBoundary from './ErrorBoundary';
import LoadingScreen from './components/ui/LoadingScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SnackbarProvider, useSnackbar } from './contexts/SnackbarContext';
import useThemeMode from './hooks/useThemeMode';
import createTheme from './styles/theme';
import { TokenManager } from './api';

// Lazy-loaded components with error boundaries
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const PricingPage = React.lazy(() => import('./pages/Pricing'));
const ContactPage = React.lazy(() => import('./pages/Contact'));
const AuthPage = React.lazy(() => import('./pages/Auth'));
const MainLayout = React.lazy(() => import('./layouts/MainLayout'));
const AuthLayout = React.lazy(() => import('./layouts/AuthLayout'));
const AdminDashboard = React.lazy(() => import('./pages/Admin/Dashboard'));
const NotFound = React.lazy(() => import('./pages/errors/NotFound'));

// ===================== ROUTE GUARDS =====================

/**
 * Protected Route - Only accessible by authenticated users
 * Supports multi-tenant role-based access control
 */
const ProtectedRoute = ({ children, roles = [] }) => {
  const { currentUser, isLoading, organization } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      // Redirect to login with return URL
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, {
        replace: true,
      });
    }
  }, [currentUser, isLoading, navigate, location]);

  if (isLoading) {
    return <LoadingScreen fullScreen />;
  }

  if (!currentUser) {
    return null; // Will redirect in useEffect
  }

  // Role-based access control (optional)
  if (roles.length > 0 && !roles.includes(currentUser.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

/**
 * Public Route - Only accessible by non-authenticated users
 * Redirects authenticated users to dashboard
 */
const PublicRoute = ({ children }) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen fullScreen />;
  }

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

/**
 * Organization Route - Only accessible with organization context
 */
const OrganizationRoute = ({ children }) => {
  const { currentUser, isLoading, organization } = useAuth();

  if (isLoading) {
    return <LoadingScreen fullScreen />;
  }

  // Check if user has organization access
  if (!organization?.id) {
    return <Navigate to="/organizations" replace />;
  }

  return children;
};

// ===================== APP COMPONENT =====================

export default function App() {
  const { mode } = useThemeMode();
  const theme = createTheme(mode);

  // Global error state
  const [error, setError] = useState(null);

  // Handle global errors
  const handleGlobalError = useCallback((event) => {
    console.error('🚨 Global error caught:', event.error);
    setError({
      message: 'An unexpected error occurred',
      details: event.error,
      timestamp: new Date().toISOString(),
    });
    event.preventDefault();
  }, []);

  const handleUnhandledRejection = useCallback((event) => {
    console.error('🚨 Unhandled promise rejection:', event.reason);
    setError({
      message: 'A network or server error occurred',
      details: event.reason,
      timestamp: new Date().toISOString(),
    });
    event.preventDefault();
  }, []);

  // Register global error handlers
  useEffect(() => {
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Check for expired tokens on app start
    const checkTokenExpiry = () => {
      if (TokenManager.isTokenExpired()) {
        console.warn('⚠️ Token expired, clearing storage');
        TokenManager.clearAll();
        window.location.href = '/login?session=expired';
      }
    };

    checkTokenExpiry();

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [handleGlobalError, handleUnhandledRejection]);

  // Performance monitoring
  useEffect(() => {
    if (import.meta.env.PROD) {
      const startTime = performance.now();

      const handleLoad = () => {
        const loadTime = performance.now() - startTime;
        console.log(`📊 App rendered in ${Math.round(loadTime)}ms`);
      };

      if (document.readyState === 'complete') {
        handleLoad();
      } else {
        window.addEventListener('load', handleLoad);
        return () => window.removeEventListener('load', handleLoad);
      }
    }
  }, []);

  // Suspense fallback component
  const SuspenseFallback = useMemo(
    () => () => (
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
        <Box sx={{ width: '320px', textAlign: 'center' }}>
          <LinearProgress
            sx={{
              height: 8,
              borderRadius: 4,
              mb: 3,
              background: alpha(theme.palette.primary.main, 0.1),
              '& .MuiLinearProgress-bar': {
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              },
            }}
          />
          <LoadingScreen fullScreen={false} />
          <Box sx={{ mt: 3 }}>
            <Box
              component="span"
              sx={{
                fontSize: '0.875rem',
                color: 'text.secondary',
                fontWeight: 500,
              }}
            >
              Loading Assessly Platform...
            </Box>
          </Box>
        </Box>
      </Box>
    ),
    [theme]
  );

  // Error boundary fallback
  const ErrorFallback = useMemo(
    () =>
      error ? (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            bgcolor: 'error.light',
            color: 'error.contrastText',
            borderRadius: 2,
            maxWidth: 600,
            mx: 'auto',
            mt: 4,
          }}
        >
          <Box sx={{ fontSize: '1.5rem', fontWeight: 'bold', mb: 2 }}>
            ⚠️ Application Error
          </Box>
          <Box sx={{ mb: 3 }}>{error.message}</Box>
          <Box
            component="button"
            onClick={() => window.location.reload()}
            sx={{
              px: 3,
              py: 1,
              bgcolor: 'error.main',
              color: 'error.contrastText',
              border: 'none',
              borderRadius: 1,
              cursor: 'pointer',
              fontWeight: 'bold',
              '&:hover': {
                bgcolor: 'error.dark',
              },
            }}
          >
            Reload Application
          </Box>
        </Box>
      ) : null,
    [error]
  );

  // Route configuration
  const routeConfig = useMemo(
    () => [
      // Public routes
      {
        path: '/',
        element: <MainLayout />,
        children: [
          { index: true, element: <LandingPage /> },
          { path: 'pricing', element: <PricingPage /> },
          { path: 'contact', element: <ContactPage /> },
          { path: 'terms', element: <div>Terms of Service</div> },
          { path: 'privacy', element: <div>Privacy Policy</div> },
          { path: 'support', element: <div>Support</div> },
        ],
      },

      // Authentication routes (public only)
      {
        element: <AuthLayout />,
        children: [
          {
            path: 'auth',
            element: (
              <PublicRoute>
                <AuthPage />
              </PublicRoute>
            ),
          },
          {
            path: 'login',
            element: (
              <PublicRoute>
                <AuthPage defaultMode="login" />
              </PublicRoute>
            ),
          },
          {
            path: 'register',
            element: (
              <PublicRoute>
                <AuthPage defaultMode="signup" />
              </PublicRoute>
            ),
          },
          {
            path: 'forgot-password',
            element: (
              <PublicRoute>
                <AuthPage defaultMode="forgot" />
              </PublicRoute>
            ),
          },
          {
            path: 'reset-password',
            element: (
              <PublicRoute>
                <AuthPage defaultMode="reset" />
              </PublicRoute>
            ),
          },
        ],
      },

      // Protected dashboard routes
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <OrganizationRoute>
              <MainLayout />
            </OrganizationRoute>
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <AdminDashboard /> },
          // Add more dashboard routes here
          { path: 'assessments', element: <div>Assessments</div> },
          { path: 'analytics', element: <div>Analytics</div> },
          { path: 'settings', element: <div>Settings</div> },
        ],
      },

      // Organization management (protected)
      {
        path: 'organizations',
        element: (
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <div>Organizations</div> },
          { path: 'create', element: <div>Create Organization</div> },
          { path: ':orgId', element: <div>Organization Details</div> },
        ],
      },

      // Special routes
      { path: 'unauthorized', element: <div>Unauthorized</div> },
      { path: 'maintenance', element: <div>Maintenance</div> },

      // 404 route (must be last)
      { path: '*', element: <NotFound /> },
    ],
    []
  );

  return (
    <ErrorBoundary fallback={ErrorFallback}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <SnackbarProvider>
            <Router>
              <Suspense fallback={<SuspenseFallback />}>
                <Routes>
                  {routeConfig.map((route, index) => (
                    <Route key={index} {...route} />
                  ))}
                </Routes>
              </Suspense>

              {/* Global Snackbar */}
              <GlobalSnackbar />
            </Router>
          </SnackbarProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

// ===================== GLOBAL SNACKBAR =====================

const GlobalSnackbar = () => {
  const { snackbar, hideSnackbar } = useSnackbar();

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    hideSnackbar();
  };

  if (!snackbar) return null;

  return (
    <Snackbar
      open={!!snackbar}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{
        '& .MuiAlert-root': {
          borderRadius: 2,
          boxShadow: 3,
          fontSize: '0.875rem',
          fontWeight: 500,
        },
      }}
    >
      <Alert
        onClose={handleClose}
        severity={snackbar.severity || 'info'}
        elevation={6}
        variant="filled"
        icon={false}
        sx={{
          '& .MuiAlert-message': {
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          },
        }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>
  );
};

// ===================== DEVELOPMENT UTILITIES =====================

if (import.meta.env.DEV) {
  // Expose app utilities for development
  window.__ASSESSLY_DEV__ = {
    version: import.meta.env.VITE_APP_VERSION || 'development',
    mode: import.meta.env.MODE,
    clearAuth: () => {
      TokenManager.clearAll();
      console.log('🔐 Auth cleared');
    },
    simulateError: () => {
      throw new Error('Simulated error for testing');
    },
    getRoutes: () => routeConfig,
  };

  console.log(
    `%c🔧 Assessly Development Mode v${window.__ASSESSLY_DEV__.version}`,
    'background: linear-gradient(90deg, #667eea, #764ba2); color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold;'
  );
}
