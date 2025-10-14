import React, { Suspense, lazy, useState, useMemo, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";

// Contexts & Layouts
import { AuthProvider } from "./contexts/AuthContext.jsx";
import MainLayout from "./layouts/MainLayout.jsx";
import AuthLayout from "./layouts/AuthLayout.jsx";
import { getAppTheme } from "./styles/theme.jsx";
import LoadingScreen from "./components/ui/LoadingScreen.jsx";
import ProtectedRoute from "./components/common/ProtectedRoute.jsx";

// Lazy-loaded pages/components
const AssessmentDashboard = lazy(() => import("./components/AssessmentDashboard.jsx"));
const CreateAssessment = lazy(() => import("./components/CreateAssessment.jsx"));
const TakeAssessment = lazy(() => import("./components/TakeAssessment.jsx"));
const PdfReport = lazy(() => import("./components/PdfReport.jsx"));
const AuthPage = lazy(() => import("./pages/Auth.jsx"));
const LandingScreen = lazy(() => import("./pages/Landing/LandingScreen.jsx"));
const BillingPage = lazy(() => import("./pages/Billing.jsx"));
const AdminDashboard = lazy(() => import("./pages/Admin/Dashboard.jsx"));

// --- Custom Hook: Manage Theme Mode ---
const useThemeMode = () => {
  const [darkMode, setDarkMode] = useState(false);
  const toggleDarkMode = () => setDarkMode(prev => !prev);

  const theme = useMemo(() => getAppTheme(darkMode ? "dark" : "light"), [darkMode]);
  return { theme, darkMode, toggleDarkMode };
};

// --- Custom Hook: Backend Connection Toast ---
const useBackendConnection = () => {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(import.meta.env.VITE_API_BASE_URL + "/health");
        if (!res.ok) throw new Error("Backend unreachable");
        setOnline(true);
      } catch {
        setOnline(false);
      }
    };

    // Initial check
    checkBackend();

    // Poll every 5s
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, []);

  return online;
};

// --- Backend Connection Toast Component ---
const BackendConnectionToast = ({ online }) => {
  if (online) return null;
  return (
    <div style={{
      position: "fixed",
      top: "1rem",
      left: "50%",
      transform: "translateX(-50%)",
      background: "#ff9800",
      color: "#fff",
      padding: "0.75rem 1.5rem",
      borderRadius: "4px",
      fontFamily: "sans-serif",
      fontWeight: 600,
      zIndex: 9999,
    }}>
      ⚠️ Connection lost — retrying…
    </div>
  );
};

// --- Main Application ---
function App() {
  const { theme, darkMode, toggleDarkMode } = useThemeMode();
  const online = useBackendConnection();

  return (
    <Router>
      <ThemeProvider theme={theme}>
        <AuthProvider>
          {/* Backend Toast */}
          <BackendConnectionToast online={online} />

          <Suspense fallback={<LoadingScreen fullScreen />}>
            <Routes>

              {/* Public Routes */}
              <Route path="/auth" element={<AuthLayout><AuthPage /></AuthLayout>} />
              <Route path="/login" element={<AuthLayout><AuthPage /></AuthLayout>} />

              {/* MainLayout wrapper */}
              <Route element={<MainLayout darkMode={darkMode} toggleDarkMode={toggleDarkMode} />}>

                {/* Landing/Home */}
                <Route path="/" element={<LandingScreen />} />

                {/* Protected Routes */}
                <Route path="/dashboard" element={<ProtectedRoute><AssessmentDashboard /></ProtectedRoute>} />
                <Route path="/create" element={<ProtectedRoute><CreateAssessment /></ProtectedRoute>} />
                <Route path="/take/:id" element={<ProtectedRoute><TakeAssessment /></ProtectedRoute>} />
                <Route path="/report/:id" element={<ProtectedRoute><PdfReport /></ProtectedRoute>} />
                <Route path="/billing" element={<ProtectedRoute><BillingPage /></ProtectedRoute>} />

                {/* Admin Route */}
                <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />

                {/* Catch-all */}
                <Route path="*" element={<div>404 Not Found</div>} />
              </Route>

            </Routes>
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
