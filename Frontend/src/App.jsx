import React from "react";
import { Routes, Route, Outlet } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import UploadPage from "./pages/UploadPage.jsx";
import ResultPage from "./pages/ResultPage.jsx";
import AnalysisReportPage from "./pages/AnalysisReportPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import AnalysisDetailPage from "./pages/AnalysisDetailPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import ReportPage from "./pages/ReportPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ComparePage from "./pages/ComparePage.jsx";

function LayoutShell() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<LayoutShell />}>
        <Route
          index
          element={
            <ProtectedRoute>
              <UploadPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="result/:id" element={<ProtectedRoute><AnalysisReportPage /></ProtectedRoute>} />
        <Route path="history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="analysis/:id" element={<ProtectedRoute><AnalysisReportPage /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="report/:id" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
        <Route path="compare" element={<ProtectedRoute><ComparePage /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default App;
