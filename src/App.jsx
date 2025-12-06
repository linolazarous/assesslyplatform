// src/App.jsx
import React, { Suspense, useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, CssBaseline, Snackbar, Alert, Box, LinearProgress } from "@mui/material";
import ErrorBoundary from "./ErrorBoundary";
import LoadingScreen from "./components/ui/LoadingScreen";
import { AuthProvider } from "./contexts/AuthContext";
import { SnackbarProvider } from "./contexts/SnackbarContext"; // Add if exists
import useThemeMode from "./hooks/useThemeMode";
import createTheme from "./styles/theme";

// Lazy components with error boundaries
const LandingPage = React.lazy(() => import("./pages/LandingPage"));
const PricingPage = React.lazy(() => import("./pages/Pricing"));
const ContactPage = React.lazy(() => import("./pages/Contact"));
const AuthPage = React.lazy(() => import("./pages/Auth"));
const MainLayout = React.lazy(() => import("./layouts/MainLayout"));
const AuthLayout = React.lazy(() => import("./layouts/AuthLayout"));
const AdminDashboard = React.lazy(() => import("./pages/Admin/Dashboard"));
const NotFound = React.lazy(() => import("./pages/errors/NotFound"));

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('accessToken');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <LoadingScreen fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <LoadingScreen fullScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default function App() {
  const { mode } = useThemeMode();
  const theme = createTheme(mode);

  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "info",
    message: "",
  });

  const handleSnackbarClose = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  useEffect(() => {
    const handleGlobalError = (event) => {
      console.error('🚨 Global error caught:', event.error);
      event.preventDefault(); // Prevent default browser error handling
      
      setSnackbar({
        open: true,
        severity: "error",
        message: "An unexpected error occurred. Please try again.",
      });
    };

    const handleUnhandledRejection = (event) => {
      console.error('🚨 Unhandled promise rejection:', event.reason);
      event.preventDefault(); // Prevent default browser error handling
      
      setSnackbar({
        open: true,
        severity: "error",
        message: "A network or server error occurred. Please check your connection.",
      });
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Fallback component for Suspense
  const SuspenseFallback = () => (
    <Box sx={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box sx={{ width: '300px' }}>
        <LinearProgress sx={{ height: 8, borderRadius: 4, mb: 2 }} />
        <Box sx={{ textAlign: 'center' }}>
          <LoadingScreen fullScreen={false} />
        </Box>
      </Box>
    </Box>
  );

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          {/* Add SnackbarProvider if you have it */}
          <Router>
            <Suspense fallback={<SuspenseFallback />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<LandingPage />} />
                  <Route path="pricing" element={<PricingPage />} />
                  <Route path="contact" element={<ContactPage />} />
                </Route>

                {/* Auth Routes - Only accessible if NOT authenticated */}
                <Route element={<AuthLayout />}>
                  <Route 
                    path="auth" 
                    element={
                      <PublicRoute>
                        <AuthPage />
                      </PublicRoute>
                    } 
                  />
                  <Route 
                    path="login" 
                    element={
                      <PublicRoute>
                        <AuthPage defaultMode="login" />
                      </PublicRoute>
                    } 
                  />
                  <Route 
                    path="register" 
                    element={
                      <PublicRoute>
                        <AuthPage defaultMode="signup" />
                      </PublicRoute>
                    } 
                  />
                  <Route 
                    path="forgot-password" 
                    element={
                      <PublicRoute>
                        <AuthPage defaultMode="forgot" />
                      </PublicRoute>
                    } 
                  />
                  <Route 
                    path="reset-password" 
                    element={
                      <PublicRoute>
                        <AuthPage defaultMode="reset" />
                      </PublicRoute>
                    } 
                  />
                </Route>

                {/* Protected Routes - Only accessible if authenticated */}
                <Route 
                  path="dashboard" 
                  element={
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                </Route>

                {/* 404 Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>

            {/* Global Snackbar */}
            <Snackbar
              open={snackbar.open}
              autoHideDuration={6000}
              onClose={handleSnackbarClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "center",
              }}
              sx={{
                '& .MuiAlert-root': {
                  borderRadius: 2,
                  boxShadow: 3,
                }
              }}
            >
              <Alert
                severity={snackbar.severity}
                onClose={handleSnackbarClose}
                elevation={6}
                variant="filled"
              >
                {snackbar.message}
              </Alert>
            </Snackbar>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
