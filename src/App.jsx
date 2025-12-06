// src/App.jsx
import React, { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
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
  Snackbar,
  Alert,
  Box,
  LinearProgress,
  alpha,
  Backdrop,
  CircularProgress,
} from '@mui/material';
import ErrorBoundary from './ErrorBoundary';
import LoadingScreen from './components/ui/LoadingScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SnackbarProvider, useSnackbar } from './contexts/SnackbarContext';
import { OrganizationProvider, useOrganization } from './contexts/OrganizationContext';
import useThemeMode from './hooks/useThemeMode';
import createTheme from './styles/theme';
import { TokenManager, apiEvents, trackError } from './api';

// ===================== LAZY LOADING CONFIGURATION =====================

// Lazy-loaded components with preloading hints
const lazyWithRetry = (componentImport) => {
  return React.lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.localStorage.getItem('page_force_refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.localStorage.setItem('page_force_refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.localStorage.setItem('page_force_refreshed', 'true');
        return window.location.reload();
      }
      throw error;
    }
  });
};

// Component preload cache
const preloadedComponents = new Map();

const preloadComponent = (importFunc, name) => {
  if (!preloadedComponents.has(name)) {
    preloadedComponents.set(name, importFunc());
  }
  return preloadedComponents.get(name);
};

// Public components (can be preloaded immediately)
const LandingPage = lazyWithRetry(() => import('./pages/LandingPage'));
const AuthPage = lazyWithRetry(() => import('./pages/Auth'));
const NotFound = lazyWithRetry(() => import('./pages/errors/NotFound'));

// Protected components (preloaded after auth)
const PricingPage = lazyWithRetry(() => import('./pages/Pricing'));
const ContactPage = lazyWithRetry(() => import('./pages/Contact'));
const MainLayout = lazyWithRetry(() => import('./layouts/MainLayout'));
const AuthLayout = lazyWithRetry(() => import('./layouts/AuthLayout'));
const AdminDashboard = lazyWithRetry(() => import('./pages/Admin/Dashboard'));

// ===================== ROUTE GUARDS =====================

/**
 * Protected Route - Only accessible by authenticated users
 * Supports multi-tenant role-based access control
 */
const ProtectedRoute = ({ children, requiredRoles = [], requiredPermissions = [] }) => {
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      const redirectTo = searchParams.get('redirect') || location.pathname;
      
      // Show snackbar message
      showSnackbar({
        message: 'Please sign in to continue',
        severity: 'info',
      });
      
      // Redirect to login with return URL
      navigate(`/auth/login?redirect=${encodeURIComponent(redirectTo)}`, {
        replace: true,
      });
    }
  }, [currentUser, isLoading, navigate, location, searchParams, showSnackbar]);

  // Check role-based access
  const hasRequiredRole = useMemo(() => {
    if (requiredRoles.length === 0) return true;
    return requiredRoles.some(role => currentUser?.roles?.includes(role));
  }, [currentUser, requiredRoles]);

  // Check permission-based access
  const hasRequiredPermissions = useMemo(() => {
    if (requiredPermissions.length === 0) return true;
    return requiredPermissions.every(perm => currentUser?.permissions?.includes(perm));
  }, [currentUser, requiredPermissions]);

  if (isLoading) {
    return <LoadingScreen fullScreen message="Verifying authentication..." />;
  }

  if (!currentUser) {
    return <LoadingScreen fullScreen />;
  }

  if (!hasRequiredRole) {
    showSnackbar({
      message: 'You do not have the required role to access this page',
      severity: 'error',
    });
    return <Navigate to="/unauthorized" replace />;
  }

  if (!hasRequiredPermissions) {
    showSnackbar({
      message: 'You do not have the required permissions to access this page',
      severity: 'error',
    });
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

/**
 * Organization Route - Only accessible with organization context
 */
const OrganizationRoute = ({ children }) => {
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    if (!orgLoading && !currentOrganization?.id) {
      showSnackbar({
        message: 'Please select an organization to continue',
        severity: 'info',
      });
      navigate('/organizations', { replace: true });
    }
  }, [currentOrganization, orgLoading, navigate, showSnackbar]);

  if (orgLoading) {
    return <LoadingScreen fullScreen message="Loading organization..." />;
  }

  if (!currentOrganization?.id) {
    return <LoadingScreen fullScreen />;
  }

  return children;
};

/**
 * Public Route - Only accessible by non-authenticated users
 */
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
    return <LoadingScreen fullScreen />;
  }

  return children;
};

// ===================== GLOBAL LOADING & ERROR STATES =====================

const GlobalErrorHandler = ({ children }) => {
  const [error, setError] = useState(null);
  const { showSnackbar } = useSnackbar();

  const handleGlobalError = useCallback((event) => {
    console.error('🚨 Global error caught:', event.error);
    
    const errorDetails = {
      message: event.error?.message || 'An unexpected error occurred',
      stack: event.error?.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    // Track error
    trackError(event.error, { context: 'global_error_handler' });

    // Show user-friendly message
    setError(errorDetails);
    showSnackbar({
      message: 'Something went wrong. Please try again.',
      severity: 'error',
    });

    event.preventDefault();
  }, [showSnackbar]);

  const handleUnhandledRejection = useCallback((event) => {
    console.error('🚨 Unhandled promise rejection:', event.reason);
    
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

    // Listen for API errors
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

  // Clear error after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return children;
};

const GlobalLoadingIndicator = () => {
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    const handleRouteChangeStart = () => setLoading(true);
    const handleRouteChangeEnd = () => setLoading(false);
    const handleRouteChangeError = () => {
      setLoading(false);
      showSnackbar({
        message: 'Failed to load page content',
        severity: 'error',
      });
    };

    // Simulate route change events (in a real app, use router events)
    window.addEventListener('beforeunload', handleRouteChangeStart);
    window.addEventListener('load', handleRouteChangeEnd);
    window.addEventListener('error', handleRouteChangeError);

    return () => {
      window.removeEventListener('beforeunload', handleRouteChangeStart);
      window.removeEventListener('load', handleRouteChangeEnd);
      window.removeEventListener('error', handleRouteChangeError);
    };
  }, [showSnackbar]);

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

// ===================== SUSPENSE FALLBACK =====================

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
        <Box
          component="span"
          sx={{
            fontSize: '0.75rem',
            color: 'text.disabled',
            fontStyle: 'italic',
          }}
        >
          Optimizing your experience
        </Box>
      </Box>
    </Box>
  </Box>
);

// ===================== ROUTE CONFIGURATION =====================

const createRoutes = () => [
  // Public landing routes
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { 
        path: 'pricing', 
        element: <PricingPage />,
        preload: () => preloadComponent(() => import('./pages/Pricing'), 'pricing')
      },
      { 
        path: 'contact', 
        element: <ContactPage />,
        preload: () => preloadComponent(() => import('./pages/Contact'), 'contact')
      },
      { path: 'terms', element: <div>Terms of Service</div> },
      { path: 'privacy', element: <div>Privacy Policy</div> },
      { path: 'support', element: <div>Support</div> },
      { path: 'features', element: <div>Features</div> },
    ],
  },

  // Authentication routes (public only, restricted)
  {
    element: <AuthLayout />,
    children: [
      {
        path: 'auth',
        element: (
          <PublicRoute restricted>
            <AuthPage />
          </PublicRoute>
        ),
      },
      {
        path: 'auth/login',
        element: (
          <PublicRoute restricted>
            <AuthPage defaultMode="login" />
          </PublicRoute>
        ),
      },
      {
        path: 'auth/register',
        element: (
          <PublicRoute restricted>
            <AuthPage defaultMode="signup" />
          </PublicRoute>
        ),
      },
      {
        path: 'auth/forgot-password',
        element: (
          <PublicRoute restricted>
            <AuthPage defaultMode="forgot" />
          </PublicRoute>
        ),
      },
      {
        path: 'auth/reset-password',
        element: (
          <PublicRoute restricted>
            <AuthPage defaultMode="reset" />
          </PublicRoute>
        ),
      },
      {
        path: 'auth/verify-email',
        element: (
          <PublicRoute restricted>
            <AuthPage defaultMode="verify" />
          </PublicRoute>
        ),
      },
    ],
  },

  // Protected dashboard routes with organization context
  {
    path: 'dashboard',
    element: (
      <ProtectedRoute requiredPermissions={['view_dashboard']}>
        <OrganizationRoute>
          <MainLayout />
        </OrganizationRoute>
      </ProtectedRoute>
    ),
    children: [
      { 
        index: true, 
        element: <AdminDashboard />,
        preload: () => preloadComponent(() => import('./pages/Admin/Dashboard'), 'dashboard')
      },
      { 
        path: 'assessments', 
        element: <div>Assessments</div>,
        requiredPermissions: ['view_assessments']
      },
      { 
        path: 'analytics', 
        element: <div>Analytics</div>,
        requiredPermissions: ['view_analytics']
      },
      { 
        path: 'settings', 
        element: <div>Settings</div>,
        requiredPermissions: ['view_settings']
      },
      { 
        path: 'profile', 
        element: <div>Profile</div>,
        requiredPermissions: ['view_profile']
      },
    ],
  },

  // Organization management routes
  {
    path: 'organizations',
    element: (
      <ProtectedRoute requiredPermissions={['view_organizations']}>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <div>Organizations</div> },
      { 
        path: 'create', 
        element: <div>Create Organization</div>,
        requiredPermissions: ['create_organization']
      },
      { 
        path: ':orgId', 
        element: <div>Organization Details</div>,
        requiredPermissions: ['view_organization']
      },
    ],
  },

  // Error and special routes
  { path: 'unauthorized', element: <div>Unauthorized Access</div> },
  { path: 'maintenance', element: <div>System Maintenance</div> },
  { path: 'server-error', element: <div>Server Error</div> },

  // 404 route (must be last)
  { path: '*', element: <NotFound /> },
];

// ===================== GLOBAL SNACKBAR =====================

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
      sx={{
        zIndex: 99999,
        '& .MuiAlert-root': {
          borderRadius: 2,
          boxShadow: 6,
          fontSize: '0.875rem',
          fontWeight: 500,
          minWidth: 300,
          maxWidth: '90vw',
          alignItems: 'center',
          '& .MuiAlert-icon': {
            alignItems: 'center',
            fontSize: '1.25rem',
          },
        },
      }}
    >
      <Alert
        onClose={handleClose}
        severity={snackbar.severity || 'info'}
        elevation={6}
        variant="filled"
        icon={snackbar.icon !== false}
        sx={{
          '& .MuiAlert-message': {
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            py: 0.5,
          },
        }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>
  );
};

// ===================== APP COMPONENT =====================

export default function App() {
  const { mode, systemMode } = useThemeMode();
  const theme = createTheme(mode);
  const [appReady, setAppReady] = useState(false);

  // Performance monitoring
  useEffect(() => {
    if (import.meta.env.PROD) {
      const startTime = performance.now();
      const loadTimeMetric = 'app_load_time';

      const handleLoadComplete = () => {
        const loadTime = performance.now() - startTime;
        
        // Send to analytics
        if (window.gtag) {
          window.gtag('event', 'timing_complete', {
            name: loadTimeMetric,
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

  // Preload critical components after app is ready
  useEffect(() => {
    if (appReady) {
      // Preload dashboard components if user is likely authenticated
      const token = TokenManager.getToken();
      if (token && !TokenManager.isTokenExpired()) {
        preloadComponent(() => import('./pages/Admin/Dashboard'), 'dashboard');
        preloadComponent(() => import('./layouts/MainLayout'), 'mainLayout');
      }
    }
  }, [appReady]);

  // Check token expiry periodically
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

    const intervalId = setInterval(checkTokenExpiry, 60000); // Check every minute
    checkTokenExpiry(); // Initial check

    return () => clearInterval(intervalId);
  }, []);

  // Route configuration
  const routes = useMemo(() => createRoutes(), []);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        <GlobalErrorHandler>
          <AuthProvider>
            <OrganizationProvider>
              <SnackbarProvider>
                <Router
                  future={{
                    v7_startTransition: true,
                    v7_relativeSplatPath: true,
                  }}
                >
                  <GlobalLoadingIndicator />
                  <Suspense fallback={<SuspenseFallback theme={theme} />}>
                    <Routes>
                      {routes.map((route, index) => {
                        const {
                          preload,
                          requiredPermissions,
                          requiredRoles,
                          ...routeProps
                        } = route;

                        // Preload route component on hover
                        if (preload) {
                          const originalElement = routeProps.element;
                          routeProps.element = React.cloneElement(originalElement, {
                            onMouseEnter: preload,
                          });
                        }

                        // Wrap with ProtectedRoute if needed
                        if (requiredPermissions || requiredRoles) {
                          const originalElement = routeProps.element;
                          routeProps.element = (
                            <ProtectedRoute
                              requiredPermissions={requiredPermissions}
                              requiredRoles={requiredRoles}
                            >
                              {originalElement}
                            </ProtectedRoute>
                          );
                        }

                        return <Route key={index} {...routeProps} />;
                      })}
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

// ===================== DEVELOPMENT UTILITIES =====================

if (import.meta.env.DEV) {
  // Performance monitoring in dev
  const measurePerformance = () => {
    const measures = performance.getEntriesByType('measure');
    const marks = performance.getEntriesByType('mark');
    
    console.group('📊 Performance Metrics');
    measures.forEach(measure => {
      console.log(`${measure.name}: ${measure.duration.toFixed(2)}ms`);
    });
    console.groupEnd();
  };

  // Expose development utilities
  window.__ASSESSLY_DEV__ = {
    version: import.meta.env.VITE_APP_VERSION || 'development',
    mode: import.meta.env.MODE,
    theme: 'dark/light/system',
    clearAuth: () => {
      TokenManager.clearAll();
      console.log('🔐 Auth cleared');
      window.location.href = '/';
    },
    simulateError: (type = 'api') => {
      if (type === 'api') {
        apiEvents.emit('request:error', {
          message: 'Simulated API error',
          code: 'SIMULATED_ERROR',
          status: 500,
        });
      } else {
        throw new Error('Simulated application error');
      }
    },
    measurePerformance,
    getRoutes: () => createRoutes(),
    getStorage: () => ({
      token: TokenManager.getToken(),
      user: TokenManager.getUserInfo(),
      organization: TokenManager.getOrganization(),
    }),
    preloadComponent: (name) => {
      const componentMap = {
        dashboard: () => import('./pages/Admin/Dashboard'),
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
  console.log('ℹ️  Development utilities available at window.__ASSESSLY_DEV__');
}
