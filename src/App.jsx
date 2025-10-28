import React, { Suspense, lazy, useState, useMemo } from "react";
import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import MainLayout from "./layouts/MainLayout.jsx";
import AuthLayout from "./layouts/AuthLayout.jsx";
import { getAppTheme } from "./styles/theme.jsx"; 
import LoadingScreen from "./components/ui/LoadingScreen.jsx"; 
import ProtectedRoute from "./components/common/ProtectedRoute.jsx";

// Lazy imports (keep your existing imports)

const useThemeMode = () => {
  const [darkMode, setDarkMode] = useState(false);
  const toggleDarkMode = () => setDarkMode(prev => !prev);
  const theme = useMemo(() => getAppTheme(darkMode ? "dark" : "light"), [darkMode]);
  return { theme, darkMode, toggleDarkMode };
};

// Layout wrapper component
const MainLayoutWrapper = ({ darkMode, toggleDarkMode }) => {
  return (
    <MainLayout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
      <Outlet /> {/* This renders the child routes */}
    </MainLayout>
  );
};

export default function App() {
  const { theme, darkMode, toggleDarkMode } = useThemeMode();

  return (
    <Router>
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <Suspense fallback={<LoadingScreen fullScreen />}>
            <Routes>
              {/* Auth routes */}
              <Route path="/auth" element={<AuthLayout><AuthPage /></AuthLayout>} />
              <Route path="/login" element={<AuthLayout><AuthPage /></AuthLayout>} />

              {/* Main layout routes */}
              <Route element={<MainLayoutWrapper darkMode={darkMode} toggleDarkMode={toggleDarkMode} />}>
                <Route path="/" element={<LandingScreen />} />
                <Route path="/dashboard" element={<ProtectedRoute><AssessmentDashboard /></ProtectedRoute>} />
                <Route path="/create" element={<ProtectedRoute><CreateAssessment /></ProtectedRoute>} />
                <Route path="/take/:id" element={<ProtectedRoute><TakeAssessment /></ProtectedRoute>} />
                <Route path="/report/:id" element={<ProtectedRoute><PdfReport /></ProtectedRoute>} />
                <Route path="/billing" element={<ProtectedRoute><BillingPage /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
              </Route>

              {/* 404 route */}
              <Route path="*" element={<div>404 Not Found</div>} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
