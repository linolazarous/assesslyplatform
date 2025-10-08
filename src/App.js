import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/common/Navbar";
import Sidebar from "./components/common/Sidebar";
import ProtectedRoute from "./components/common/ProtectedRoute";
import HeroSection from "./components/layout/HeroSection";
import Header from "./components/layout/Header";
import Auth from "./components/Auth";
import AssessmentDashboard from "./components/AssessmentDashboard";
import CreateAssessment from "./components/CreateAssessment";
import OrgSelector from "./components/OrgSelector";
import PdfReport from "./components/PdfReport";
import QuestionnaireBuilder from "./components/QuestionnaireBuilder";
import TakeAssessment from "./components/TakeAssessment";
import RoleGuard from "./components/RoleGuard";
import { Box } from "@mui/material";

export default function App() {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Global Navbar */}
      <Navbar />

      {/* App Layout */}
      <Box sx={{ display: "flex", flexGrow: 1 }}>
        <Sidebar />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, md: 4 },
            bgcolor: "background.default",
          }}
        >
          <Routes>
            {/* Public routes */}
            <Route
              path="/"
              element={
                <>
                  <HeroSection />
                  <Header title="Welcome to Assessly" subtitle="Your AI-powered assessment platform" />
                </>
              }
            />
            <Route path="/login" element={<Auth />} />
            <Route path="/register" element={<Auth mode="register" />} />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AssessmentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organization"
              element={
                <ProtectedRoute>
                  <OrgSelector />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assessment/create"
              element={
                <ProtectedRoute roles={["admin", "manager"]}>
                  <RoleGuard>
                    <CreateAssessment />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/assessment/:id"
              element={
                <ProtectedRoute>
                  <TakeAssessment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assessment/:id/report"
              element={
                <ProtectedRoute>
                  <PdfReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assessment/:id/edit"
              element={
                <ProtectedRoute roles={["admin", "editor"]}>
                  <RoleGuard>
                    <QuestionnaireBuilder />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
}
