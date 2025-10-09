import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Navbar from "@/components/common/Navbar";
import Sidebar from "@/components/common/Sidebar";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import Header from "@/components/layout/Header";
import HeroSection from "@/components/layout/HeroSection";

// Lazy-loaded components (improves initial load performance)
const AssessmentDashboard = lazy(() => import("@/components/AssessmentDashboard"));
const CreateAssessment = lazy(() => import("@/components/CreateAssessment"));
const TakeAssessment = lazy(() => import("@/components/TakeAssessment"));
const PdfReport = lazy(() => import("@/components/PdfReport"));
const Auth = lazy(() => import("@/components/Auth"));
const OrgSelector = lazy(() => import("@/components/OrgSelector"));

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900">
        <Header />
        <Navbar />

        <main className="flex-1 flex">
          <Sidebar />
          <div className="flex-1 p-4">
            <Suspense fallback={<div className="text-center mt-10 text-gray-500">Loading...</div>}>
              <Routes>
                <Route path="/" element={<HeroSection />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/org" element={<OrgSelector />} />

                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <AssessmentDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/create"
                  element={
                    <ProtectedRoute>
                      <CreateAssessment />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/take/:id"
                  element={
                    <ProtectedRoute>
                      <TakeAssessment />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/report/:id"
                  element={
                    <ProtectedRoute>
                      <PdfReport />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
