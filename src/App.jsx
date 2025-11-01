import React, { Suspense, lazy, useState, useMemo, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, Box, CircularProgress } from "@mui/material";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import MainLayout from "./layouts/MainLayout.jsx";
import AuthLayout from "./layouts/AuthLayout.jsx";
import { getAppTheme } from "./styles/theme.jsx";
import LoadingScreen from "./components/ui/LoadingScreen.jsx";
import ProtectedRoute from "./components/common/ProtectedRoute.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";

/* ============================================================
   Lazy Import Utility with Retry (Prevents white-screen errors)
============================================================ */
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error("Lazy loading failed:", error);
      // Retry once after delay
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return componentImport();
    }
  });

/* ============================================================
   Lazy-Loaded Pages
============================================================ */
const AssessmentDashboard = lazyWithRetry(() => import("./components/AssessmentDashboard.jsx"));
const CreateAssessment = lazyWithRetry(() => import("./components/CreateAssessment.jsx"));
const TakeAssessment = lazyWithRetry(() => import("./components/TakeAssessment.jsx"));
const PdfReport = lazyWithRetry(() => import("./components/PdfReport.jsx"));
const AuthPage = lazyWithRetry(() => import("./pages/Auth.jsx"));
const LandingPage = lazyWithRetry(() => import("./pages/LandingPage.jsx"));
const BillingPage = lazyWithRetry(() => import("./pages/Billing.jsx"));
const AdminDashboard = lazyWithRetry(() => import("./pages/Admin/Dashboard.jsx"));
const PricingPage = lazyWithRetry(() => import("./pages/Pricing.jsx"));
const ContactPage = lazyWithRetry(() => import("./pages/Contact.jsx")); // ✅ Contact Page Added

/* ============================================================
   Custom Theme Hook with Local Persistence
============================================================ */
const useThemeMode = () => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem("darkMode", JSON.stringify(newMode));
      return newMode;
    });
  };

  const theme = useMemo(
    () => getAppTheme(darkMode ? "dark" : "light"),
    [darkMode]
  );

  return { theme, darkMode, toggleDarkMode };
};

/* ============================================================
   Layout Wrapper
============================================================ */
const MainLayoutWrapper = ({ darkMode, toggleDarkMode, children }) => (
  <ErrorBoundary>
    <MainLayout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
      {children}
    </MainLayout>
  </ErrorBoundary>
);

/* ============================================================
   Reusable Loading Component
============================================================ */
const ProductionLoading = () => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "60vh",
    }}
  >
    <CircularProgress size={40} />
  </Box>
);

/* ============================================================
   MAIN APP COMPONENT
============================================================ */
export default function App() {
  const { theme, darkMode, toggleDarkMode } = useThemeMode();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AuthProvider>
            {/* 🔶 Offline Notification */}
            {!isOnline && (
              <Box
                sx={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: "warning.main",
                  color: "warning.contrastText",
                  textAlign: "center",
                  padding: 1,
                  zIndex: 9999,
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                You are currently offline. Some features may not be available.
              </Box>
            )}

            {/* 🔷 Routes */}
            <Suspense fallback={<LoadingScreen fullScreen />}>
              <Routes>
                {/* 🌍 Public Pages */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/contact" element={<ContactPage />} /> {/* ✅ Contact Route */}

                {/* 🔑 Auth Pages */}
                <Route
                  path="/auth"
                  element={
                    <AuthLayout>
                      <AuthPage />
                    </AuthLayout>
                  }
                />
                <Route
                  path="/login"
                  element={
                    <AuthLayout>
                      <AuthPage />
                    </AuthLayout>
                  }
                />

                {/* 🧠 Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <MainLayoutWrapper darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                      <ProtectedRoute>
                        <Suspense fallback={<ProductionLoading />}>
                          <AssessmentDashboard />
                        </Suspense>
                      </ProtectedRoute>
                    </MainLayoutWrapper>
                  }
                />

                <Route
                  path="/create"
                  element={
                    <MainLayoutWrapper darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                      <ProtectedRoute>
                        <Suspense fallback={<ProductionLoading />}>
                          <CreateAssessment />
                        </Suspense>
                      </ProtectedRoute>
                    </MainLayoutWrapper>
                  }
                />

                <Route
                  path="/take/:id"
                  element={
                    <MainLayoutWrapper darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                      <ProtectedRoute>
                        <Suspense fallback={<ProductionLoading />}>
                          <TakeAssessment />
                        </Suspense>
                      </ProtectedRoute>
                    </MainLayoutWrapper>
                  }
                />

                <Route
                  path="/report/:id"
                  element={
                    <MainLayoutWrapper darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                      <ProtectedRoute>
                        <Suspense fallback={<ProductionLoading />}>
                          <PdfReport />
                        </Suspense>
                      </ProtectedRoute>
                    </MainLayoutWrapper>
                  }
                />

                <Route
                  path="/billing"
                  element={
                    <MainLayoutWrapper darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                      <ProtectedRoute>
                        <Suspense fallback={<ProductionLoading />}>
                          <BillingPage />
                        </Suspense>
                      </ProtectedRoute>
                    </MainLayoutWrapper>
                  }
                />

                <Route
                  path="/admin"
                  element={
                    <MainLayoutWrapper darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                      <ProtectedRoute roles={["admin"]}>
                        <Suspense fallback={<ProductionLoading />}>
                          <AdminDashboard />
                        </Suspense>
                      </ProtectedRoute>
                    </MainLayoutWrapper>
                  }
                />

                {/* 🚫 404 Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
