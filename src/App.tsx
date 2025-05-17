import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { usePaymentStore } from './store/paymentStore';

// Layouts
import Navbar from './components/layout/Navbar';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PaymentsPage from './pages/PaymentsPage';
import ApprovalsPage from './pages/ApprovalsPage';
import ExportPage from './pages/ExportPage';
import NewPaymentPage from './pages/NewPaymentPage';
import PaymentDetailPage from './pages/PaymentDetailPage';
import EditPaymentPage from './pages/EditPaymentPage';
import FileViewerPage from './pages/FileViewerPage';

// Route protection component
const ProtectedRoute = ({ 
  children, 
  allowedRoles = [],
}: { 
  children: React.ReactNode;
  allowedRoles?: string[];
}) => {
  const { user, isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const { fetchPayments } = usePaymentStore();
  const { initializeAuth } = useAuthStore();
  
  useEffect(() => {
    initializeAuth();
    fetchPayments();
  }, [initializeAuth, fetchPayments]);
  
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-grow">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            
            <Route path="/payments" element={
              <ProtectedRoute>
                <PaymentsPage />
              </ProtectedRoute>
            } />
            
            <Route path="/payments/new" element={
              <ProtectedRoute>
                <NewPaymentPage />
              </ProtectedRoute>
            } />
            
            <Route path="/payments/:id" element={
              <ProtectedRoute>
                <PaymentDetailPage />
              </ProtectedRoute>
            } />
            
            <Route path="/payments/:id/edit" element={
              <ProtectedRoute>
                <EditPaymentPage />
              </ProtectedRoute>
            } />
            
            <Route path="/approvals" element={
              <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                <ApprovalsPage />
              </ProtectedRoute>
            } />
            
            <Route path="/export" element={
              <ProtectedRoute allowedRoles={['accounts']}>
                <ExportPage />
              </ProtectedRoute>
            } />
            
            <Route path="/file-viewer" element={
              <ProtectedRoute>
                <FileViewerPage />
              </ProtectedRoute>
            } />
            
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;