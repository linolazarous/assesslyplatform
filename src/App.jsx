import React, { Suspense, lazy, useState, useMemo } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import MainLayout from "./layouts/MainLayout.jsx";
import AuthLayout from "./layouts/AuthLayout.jsx";
import { getAppTheme } from "./styles/theme.jsx"; 
import LoadingScreen from "./components/ui/LoadingScreen.jsx"; 
import ProtectedRoute from "./components/common/ProtectedRoute.jsx";

// Lazy imports
const AssessmentDashboard = lazy(() => import("./components/AssessmentDashboard.jsx"));
const CreateAssessment = lazy(() => import("./components/CreateAssessment.jsx"));
const TakeAssessment = lazy(() => import("./components/TakeAssessment.jsx"));
const PdfReport = lazy(() => import("./components/PdfReport.jsx"));
const AuthPage = lazy(() => import("./pages/Auth.jsx"));
const LandingScreen = lazy(() => import("./pages/Landing/LandingScreen.jsx"));
const BillingPage = lazy(() => import("./pages/Billing.jsx"));
const AdminDashboard = lazy(() => import("./pages/Admin/Dashboard.jsx"));

const useThemeMode = () => {
  const [darkMode, setDarkMode] = useState(false);
  const toggleDarkMode = () => setDarkMode(prev => !prev);
  const theme = useMemo(() => getAppTheme(darkMode ? "dark" : "light"), [darkMode]);
  return { theme, darkMode, toggleDarkMode };
};

export default function App() {
  const { theme, darkMode, toggleDarkMode } = useThemeMode();

  return (
    <Router>
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <Suspense fallback={<LoadingScreen fullScreen />}>
            <Routes>
              <Route path="/auth" element={<AuthLayout><AuthPage /></AuthLayout>} />
              <Route path="/login" element={<AuthLayout><AuthPage /></AuthLayout>} />

              <Route element={<MainLayout darkMode={darkMode} toggleDarkMode={toggleDarkMode} />}>
                <Route path="/" element={<LandingScreen />} />
                <Route path="/dashboard" element={<ProtectedRoute><AssessmentDashboard /></ProtectedRoute>} />
                <Route path="/create" element={<ProtectedRoute><CreateAssessment /></ProtectedRoute>} />
                <Route path="/take/:id" element={<ProtectedRoute><TakeAssessment /></ProtectedRoute>} />
                <Route path="/report/:id" element={<ProtectedRoute><PdfReport /></ProtectedRoute>} />
                <Route path="/billing" element={<ProtectedRoute><BillingPage /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="*" element={<div>404 Not Found</div>} />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
    }
