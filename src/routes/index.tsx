import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuthStore } from '../store/authStore';

// Pages
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import PaymentsPage from '../pages/PaymentsPage';
import ApprovalsPage from '../pages/ApprovalsPage';
import ExportPage from '../pages/ExportPage';
import NewPaymentPage from '../pages/NewPaymentPage';
import PaymentDetailPage from '../pages/PaymentDetailPage';
import EditPaymentPage from '../pages/EditPaymentPage';
import FileViewerPage from '../pages/FileViewerPage';
import DownloadAppPage from '../pages/DownloadAppPage';

// Dashboard Pages
import TotalRequestsPage from '../pages/dashboard/TotalRequestsPage';
import PendingApprovalPage from '../pages/dashboard/PendingApprovalPage';
import ApprovedPage from '../pages/dashboard/ApprovedPage';
import TotalActivityPage from '../pages/dashboard/TotalActivityPage';
import VerificationPage from '../pages/dashboard/VerificationsPage';

// CMS Pages
import Home from '../pages/cms/home';
import UsersPage from '../pages/cms/users';
import CategoriesPage from '../pages/cms/categories';
import SubcategoriesPage from '../pages/cms/subcategories';
import VendorsPage from '../pages/cms/vendors';
import CompaniesPage from '../pages/cms/companies';
import BranchesPage from '../pages/cms/branches';
import QueriesPage from '../pages/dashboard/QueriesPage.tsx';
import PendingProcessingPage from '../pages/dashboard/PendingProcessingPage.tsx';
import ScheduledPaymentsPage from '../pages/scheduled-payments/home';
import NewScheduledPaymentPage from '../pages/scheduled-payments/new.tsx';
import ScheduledPaymentDetailsPage from '../pages/scheduled-payments/details';
import ScheduledPaymentExecutionsPage from '../pages/scheduled-payments/executions';

export const AppRoutes = () => {
  const { user } = useAuthStore();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/download-app" element={<DownloadAppPage />} />

      <Route
        path="/scheduled-payments"
        element={
          <ProtectedRoute>
            <ScheduledPaymentsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/scheduled-payments/new"
        element={
          <ProtectedRoute>
            <NewScheduledPaymentPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/scheduled-payments/:id"
        element={
          <ProtectedRoute>
            <ScheduledPaymentDetailsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/scheduled-payments/:id/executions"
        element={
          <ProtectedRoute>
            <ScheduledPaymentExecutionsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Dashboard Sub-routes */}
      <Route
        path="/dashboard/total-requests"
        element={
          <ProtectedRoute>
            <TotalRequestsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/pending-approval"
        element={
          <ProtectedRoute>
            <PendingApprovalPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/approved"
        element={
          <ProtectedRoute>
            <ApprovedPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/total-activity"
        element={
          <ProtectedRoute>
            <TotalActivityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/queries"
        element={
          <ProtectedRoute>
            <QueriesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/verifications"
        element={
          <ProtectedRoute allowedRoles={['accounts']}>
            <VerificationPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/pending-processing"
        element={
          <ProtectedRoute allowedRoles={['accounts']}>
            <PendingProcessingPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/payments"
        element={
          <ProtectedRoute>
            <PaymentsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/payments/new"
        element={
          <ProtectedRoute>
            <NewPaymentPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/payments/:id"
        element={
          <ProtectedRoute>
            <PaymentDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/payments/:id/edit"
        element={
          <ProtectedRoute>
            <EditPaymentPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/approvals"
        element={
          <ProtectedRoute allowedRoles={['admin', 'accounts']}>
            <ApprovalsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/export"
        element={
          <ProtectedRoute allowedRoles={['accounts']}>
            <ExportPage />
          </ProtectedRoute>
        }
      />

      {/* CMS Routes */}
      <Route
        path="/cms"
        element={
          <ProtectedRoute allowedRoles={['accounts', 'admin']}>
            <Home />
          </ProtectedRoute>
        }
      />

      <Route
        path="/cms/users"
        element={
          <ProtectedRoute allowedRoles={['accounts', 'admin']}>
            <UsersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/cms/categories"
        element={
          <ProtectedRoute allowedRoles={['accounts', 'admin']}>
            <CategoriesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/cms/subcategories"
        element={
          <ProtectedRoute allowedRoles={['accounts', 'admin']}>
            <SubcategoriesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/cms/vendors"
        element={
          <ProtectedRoute allowedRoles={['accounts', 'admin']}>
            <VendorsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/cms/companies"
        element={
          <ProtectedRoute allowedRoles={['accounts', 'admin']}>
            <CompaniesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/cms/branches"
        element={
          <ProtectedRoute allowedRoles={['accounts', 'admin']}>
            <BranchesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/file-viewer"
        element={
          <ProtectedRoute>
            <FileViewerPage />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}; 