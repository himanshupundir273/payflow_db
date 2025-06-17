import React, { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePaymentStore } from '../store/paymentStore';
import { PaymentRequest } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import {
  BarChart3,
  PlusCircle,
  FileCheck,
  FileClock,
  Wallet,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import PaymentTable from '../components/payments/PaymentTable';
import { checkNetworkConnection } from '../lib/network';
import FundStats from '../components/dashboard/FundStats';

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const {
    payments,
    setFilterOptions,
    fetchPayments,
    fetchDashboardPayments,
    fetchDashboardStats,
    dashboardStats,
    pagination,
    filterOptions,
    sortOptions,
    filterOverdueAdvanceInvoices,
    filterAccountsQueries,
    resetFilterOptions,
  } = usePaymentStore();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardPayments, setDashboardPayments] = useState<PaymentRequest[]>(
    []
  );
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);

  // Fetch dashboard stats and reset filters on component mount
  React.useEffect(() => {
    const loadDashboardData = async () => {
      if (user) {
        try {
          setStatsLoading(true);
          setDashboardLoading(true);
          resetFilterOptions();
          await fetchDashboardStats();
          const unfilteredPayments = await fetchDashboardPayments();
          setDashboardPayments(unfilteredPayments);
        } catch (error) {
          console.error('Error loading dashboard data:', error);
        } finally {
          setStatsLoading(false);
          setDashboardLoading(false);
        }
      }
    };

    loadDashboardData();

    // Cleanup function to reset filters when component unmounts
    return () => {
      resetFilterOptions();
    };
  }, [user]);

  // Use stats from store or provide defaults
  const stats = dashboardStats || {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    processed: 0,
    queryRaised: 0,
    accountsQueriesRaised: 0,
    overdueAdvanceInvoices: 0,
    totalAmount: 0,
    pendingAmount: 0,
    pendingAccountsVerifications: 0
  };

  const recentPayments = useMemo(() => {
    if (user?.role === 'user') {
      // For users, show their own recent payments
      return dashboardPayments
        .filter((p) => p.requestedBy.id === user.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
    } else if (user?.role === 'admin') {
      // For admins, show recent pending payments that need approval
      return dashboardPayments
        .filter((p) => p.status === 'pending')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
    } else {
      // For accounts, show recently approved payments that need processing
      return dashboardPayments
        .filter((p) => p.status === 'approved')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
    }
  }, [dashboardPayments, user]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setDashboardLoading(true);
    setStatsLoading(true);
    try {
      if (!(await checkNetworkConnection())) {
        return;
      }
      // Reset filters and fetch fresh data
      resetFilterOptions();
      await fetchDashboardStats();
      const unfilteredPayments = await fetchDashboardPayments();
      setDashboardPayments(unfilteredPayments);
    } catch (error) {
      console.error('Error refreshing payments:', error);
    } finally {
      setIsRefreshing(false);
      setDashboardLoading(false);
      setStatsLoading(false);
      setPullDistance(0);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchEndY.current = e.touches[0].clientY;
      const distance = Math.max(0, touchEndY.current - touchStartY.current);
      setPullDistance(Math.min(distance, 80));
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 50) {
      console.log('Refreshing payments...');
      handleRefresh();
    } else {
      setPullDistance(0);
    }
  };

  const handleCardClick = (cardNumber: number) => {
    switch (user?.role) {
      case 'user':
        switch (cardNumber) {
          case 0: // query raised
            navigate('/dashboard/queries');
            break;
          case 1: // Total Requests
            navigate('/dashboard/total-requests');
            break;
          case 2: // Pending Approval
            navigate('/dashboard/pending-approval');
            break;
          case 3: // Approved
            navigate('/dashboard/approved');
            break;
          case 4: // Total Activity
            navigate('/dashboard/total-activity');
            break;
        }
        break;

      case 'admin':
        switch (cardNumber) {
          case 1: // Total Requests
            navigate('/dashboard/total-requests');
            break;
          case 2: // Pending Approval
            navigate('/dashboard/pending-approval');
            break;
          case 3: // Approved
            navigate('/dashboard/approved');
            break;
          case 4: // Total Activity
            navigate('/dashboard/total-activity');
            break;
        }
        break;

      case 'accounts':
        switch (cardNumber) {
          case 1: // Total Requests
            navigate('/dashboard/total-requests');
            break;
          case 2: // Pending Processing
            navigate('/dashboard/pending-processing');
            break;
          case 3: // Pending Approval
            navigate('/dashboard/verifications');
            break;
          case 4: // Total Activity
            navigate('/dashboard/total-activity');
            break;
        }
        break;
    }
  };

  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="fixed top-0 left-0 right-0 h-1 bg-primary-500 transition-transform duration-300"
        style={{ transform: `translateY(${pullDistance}px)` }}
      />

      {isRefreshing && (
        <div className="fixed top-0 left-0 right-0 flex justify-center items-center h-12 bg-primary-50">
          <Loader2 className="h-5 w-5 text-primary-600 animate-spin" />
          <span className="ml-2 text-sm text-primary-600">Refreshing...</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, {user?.name}!</p>
        </div>

        {user?.role === 'user' && (
          <Button
            onClick={() => navigate('/payments/new')}
            icon={<PlusCircle className="h-5 w-5" />}
            className="mt-4 md:mt-0"
          >
            New Payment Request
          </Button>
        )}
      </div>

      {user?.role === 'user' && stats.queryRaised > 0 && (
        <div
          className="mb-4 inline-flex items-center px-3 py-2 rounded-lg bg-warning-100 text-warning-800 cursor-pointer hover:bg-warning-200 transition-colors"
          onClick={() => handleCardClick(0)}
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          <span className="font-medium">
            {stats.queryRaised} {stats.queryRaised === 1 ? 'query' : 'queries'}{' '}
            raised
          </span>
          <span className="ml-2 text-warning-600">Click to view</span>
        </div>
      )}

      {/* Alert for accounts queries - visible to users whose payments have accounts queries */}
      {(user?.role === 'user' || user?.role === 'admin') &&
        stats.accountsQueriesRaised > 0 && (
          <div
            className="mb-4 inline-flex items-center px-3 py-2 rounded-lg bg-warning-100 text-warning-800 cursor-pointer hover:bg-warning-200 transition-colors lg:ml-2"
            onClick={() => {
              // Filter for approved payments with accounts queries
              filterAccountsQueries()
              navigate('/dashboard/queries?type=accounts')
            }}
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            <span className="font-medium">
              {stats.accountsQueriesRaised}{' '}
              {stats.accountsQueriesRaised === 1
                ? 'accounts query'
                : 'accounts queries'}{' '}
              raised
            </span>
            <span className="ml-2 text-warning-600">Click to view</span>
          </div>
        )}

      {/* Alert for overdue advance invoices - visible to all users */}
      {stats.overdueAdvanceInvoices > 0 && (
        <div
          className="mb-4 inline-flex items-start px-3 py-2 rounded-lg bg-orange-100 text-orange-800 cursor-pointer hover:bg-orange-200 transition-colors max-w-fit lg:ml-2"
          onClick={() => {
            // Filter for overdue advance invoices
            filterOverdueAdvanceInvoices();
            navigate('/dashboard/queries?type=overdue');
          }}
        >
          <span className="font-medium">
            <AlertCircle className="h-4 w-4 mr-1.5 inline-block align-text-top" />
            {stats.overdueAdvanceInvoices} advance{' '}
            {stats.overdueAdvanceInvoices === 1 ? 'payment' : 'payments'}{' '}
            awaiting invoice follow-up{' '}
            <span className="text-orange-600 ml-1">Click to view</span>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card
          className={`animate-fade-in ${user?.role === 'user' || user?.role === 'admin'
              ? 'cursor-pointer hover:shadow-md transition-shadow'
              : ''
            }`}
          onClick={() => handleCardClick(1)}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Requests
              </p>
              <p className="mt-1 text-3xl font-semibold text-gray-900">
                {statsLoading ? (
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                ) : (
                  stats.total
                )}
              </p>
            </div>
            <div className="p-3 bg-primary-100 rounded-full">
              <Wallet className="h-6 w-6 text-primary-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-500">
              {statsLoading ? (
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              ) : (
                user?.role === 'user'
                  ? 'Your payment requests'
                  : 'All payment requests'
              )}
            </div>
          </div>
        </Card>

        <Card
          className={`animate-fade-in delay-100 ${user?.role === 'user' || user?.role === 'admin'
              ? 'cursor-pointer hover:shadow-md transition-shadow'
              : ''
            }`}
          onClick={() => handleCardClick(2)}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                {user?.role === 'accounts'
                  ? 'Pending Processing'
                  : 'Pending Approval'}
              </p>
              <p className="mt-1 text-3xl font-semibold text-gray-900">
                {statsLoading ? (
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                ) : (
                  user?.role === 'accounts' ? stats.approved : stats.pending
                )}
              </p>
            </div>
            <div className="p-3 bg-warning-100 rounded-full">
              <FileClock className="h-6 w-6 text-warning-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-500">
              {statsLoading ? (
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              ) : (
                user?.role === 'accounts'
                  ? `Total: ${(stats.totalAmount - stats.pendingAmount).toLocaleString('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    maximumFractionDigits: 0,
                  })}`
                  : `Total: ${stats.pendingAmount.toLocaleString('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    maximumFractionDigits: 0,
                  })}`
              )}
            </div>
          </div>
        </Card>

        <Card
          className={`animate-fade-in delay-200 ${user?.role === 'user' || user?.role === 'admin'
              ? 'cursor-pointer hover:shadow-md transition-shadow'
              : ''
            }`}
          onClick={() => handleCardClick(3)}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                {user?.role === 'accounts' ? 'Pending Verification' : 'Approved'}
              </p>
              <p className="mt-1 text-3xl font-semibold text-gray-900">
                {statsLoading ? (
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                ) : (
                  user?.role === 'accounts' ? stats.pendingAccountsVerifications : stats.approved
                )}
              </p>
            </div>
            <div className="p-3 bg-success-100 rounded-full">
              <FileCheck className="h-6 w-6 text-success-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-500">
              {statsLoading ? (
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              ) : (
                user?.role === 'accounts'
                  ? `${((stats.pending / stats.total) * 100).toFixed(0)}% approval rate`
                  : stats.approved > 0
                    ? `${((stats.approved / stats.total) * 100).toFixed(0)}% approval rate`
                    : 'No approvals yet'
              )}
            </div>
          </div>
        </Card>

        <Card
          className={`animate-fade-in delay-300 ${user?.role === 'user' || user?.role === 'admin'
              ? 'cursor-pointer hover:shadow-md transition-shadow'
              : ''
            }`}
          onClick={() => handleCardClick(4)}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Activity
              </p>
              <p className="mt-1 text-3xl font-semibold text-gray-900">
                {statsLoading ? (
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                ) : (
                  stats.processed + stats.rejected
                )}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-500">
              {statsLoading ? (
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              ) : (
                `${stats.processed} processed • ${stats.rejected} rejected`
              )}
            </div>
          </div>
        </Card>
      </div>
      {user?.role !== 'user' && <FundStats />}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {user?.role === 'user'
              ? 'Your Recent Requests'
              : user?.role === 'admin'
                ? 'Pending Approvals'
                : 'Ready for Processing'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCardClick(1)}
            icon={<ArrowRight className="h-4 w-4" />}
          >
            View All
          </Button>
        </div>

        <PaymentTable
          payments={recentPayments}
          showActions={false}
          isLoading={dashboardLoading}
          hideControls={true}
        />
      </div>
    </div>
  );
};

export default DashboardPage;
