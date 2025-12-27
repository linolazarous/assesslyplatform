// src/App.jsx
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  ThemeProvider,
  CssBaseline,
  Snackbar,
  Alert,
  Box,
  CircularProgress,
  LinearProgress,
  alpha,
} from '@mui/material';

import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingScreen from './components/ui/LoadingScreen';

import {
  AuthProvider,
  OrganizationProvider,
  useAuth,
  useOrganization,
} from './contexts/AuthContext';

import { SnackbarProvider, useSnackbar } from './contexts/SnackbarContext';
import useThemeMode from './hooks/useThemeMode';
import createTheme from './styles/theme';
import { TokenManager, apiEvents, trackError } from './api';

/* =====================================================
   LAZY LOAD (SAFE)
===================================================== */

const lazy = (fn) =>
  React.lazy(() =>
    fn().catch((err) => {
      console.error('Lazy load failed:', err);
      throw err;
    })
  );

const LandingPage = lazy(() => import('./pages/LandingPage'));
const AuthPage = lazy(() => import('./pages/Auth'));
const NotFound = lazy(() => import('./pages/errors/NotFound'));
const PricingPage = lazy(() => import('./pages/Pricing'));
const ContactPage = lazy(() => import('./pages/Contact'));
const MainLayout = lazy(() => import('./layouts/MainLayout'));
const AuthLayout = lazy(() => import('./layouts/AuthLayout'));
const AdminDashboard = lazy(() => import('./pages/Admin/Dashboard'));

/* =====================================================
   ROUTE GUARDS (PURE) - MOVED OUTSIDE App
===================================================== */

const ProtectedRoute = ({ children, roles = [], permissions = [] }) => {
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      showSnackbar({
        message: 'Please sign in to continue',
        severity: 'info',
      });
      navigate(`/auth/login?redirect=${encodeURIComponent(location.pathname)}`, {
        replace: true,
      });
    }
  }, [isLoading, currentUser, navigate, location.pathname, showSnackbar]);

  if (isLoading) return <LoadingScreen fullScreen />;
  if (!currentUser) return null;

  if (roles.length && !roles.some(r => currentUser.roles?.includes(r))) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (
    permissions.length &&
    !permissions.every(p => currentUser.permissions?.includes(p))
  ) {
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
        message: 'Select an organization to continue',
        severity: 'info',
      });
      navigate('/organizations', { replace: true });
    }
  }, [isLoading, currentOrganization, navigate, showSnackbar]);

  if (isLoading || !currentOrganization?.id) {
    return <LoadingScreen fullScreen />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoading, currentUser, navigate]);

  if (isLoading) return <LoadingScreen fullScreen />;
  if (currentUser) return null;

  return children;
};

/* =====================================================
   GLOBAL ERROR HANDLER - MOVED OUTSIDE App
===================================================== */

const GlobalErrorHandler = ({ children }) => {
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    const onApiError = (err) => {
      trackError(err);
      if (err.code === 'SESSION_EXPIRED') {
        TokenManager.clearAll();
        showSnackbar({
          message: 'Session expired. Please sign in again.',
          severity: 'warning',
        });
        window.location.assign('/auth/login?session=expired');
      }
    };

    apiEvents.on('request:error', onApiError);
    return () => apiEvents.off('request:error', onApiError);
  }, [showSnackbar]);

  return children;
};

/* =====================================================
   SUSPENSE FALLBACK - MOVED OUTSIDE App
===================================================== */

const SuspenseFallback = ({ theme }) => (
  <Box
    sx={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(135deg,
        ${alpha(theme.palette.primary.light, 0.05)},
        ${alpha(theme.palette.secondary.light, 0.05)}
      )`,
    }}
  >
    <Box textAlign="center">
      <CircularProgress size={70} />
      <LinearProgress sx={{ mt: 3, width: 240 }} />
    </Box>
  </Box>
);

/* =====================================================
   APP
===================================================== */

export default function App() {
  const { mode } = useThemeMode();
  const theme = useMemo(() => createTheme(mode), [mode]);

  useEffect(() => {
    const id = setInterval(() => {
      if (TokenManager.isTokenExpired()) {
        TokenManager.clearAll();
        window.location.assign('/auth/login?session=expired');
      }
    }, 60000);

    return () => clearInterval(id);
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        <SnackbarProvider>
          <GlobalErrorHandler>
            <AuthProvider>
              <OrganizationProvider>
                <Router>
                  <Suspense fallback={<SuspenseFallback theme={theme} />}>
                    <Routes>
                      {/* Public */}
                      <Route element={<MainLayout />}>
                        <Route index element={<LandingPage />} />
                        <Route path="pricing" element={<PricingPage />} />
                        <Route path="contact" element={<ContactPage />} />
                      </Route>

                      {/* Auth */}
                      <Route element={<AuthLayout />}>
                        <Route
                          path="auth/*"
                          element={
                            <PublicRoute>
                              <AuthPage />
                            </PublicRoute>
                          }
                        />
                      </Route>

                      {/* Dashboard */}
                      <Route
                        path="dashboard"
                        element={
                          <ProtectedRoute permissions={['view_dashboard']}>
                            <OrganizationRoute>
                              <MainLayout />
                            </OrganizationRoute>
                          </ProtectedRoute>
                        }
                      >
                        <Route index element={<AdminDashboard />} />
                      </Route>

                      <Route path="unauthorized" element={<div>Unauthorized</div>} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </Router>
              </OrganizationProvider>
            </AuthProvider>
          </GlobalErrorHandler>
        </SnackbarProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
