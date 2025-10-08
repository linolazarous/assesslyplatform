import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Navbar from "@/components/common/Navbar";
import Sidebar from "@/components/common/Sidebar";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AssessmentDashboard from "@/components/AssessmentDashboard";
import CreateAssessment from "@/components/CreateAssessment";
import TakeAssessment from "@/components/TakeAssessment";
import PdfReport from "@/components/PdfReport";
import Auth from "@/components/Auth";
import OrgSelector from "@/components/OrgSelector";
import HeroSection from "@/components/layout/HeroSection";
import Header from "@/components/layout/Header";

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900">
        <Header />
        <Navbar />

        <main className="flex-1 flex">
          <Sidebar />
          <div className="flex-1 p-4">
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
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
