import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useScheduledPaymentsStore } from '../../store/scheduledPaymentsStore';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { X, Calendar } from 'lucide-react';
import ScheduledPaymentsTable from '../../components/scheduled-payments/ScheduledPaymentsTable';
import ScheduledPaymentsDashboard from '../../components/scheduled-payments/ScheduledPaymentsDashboard';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processed', label: 'Processed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ScheduledPaymentsPage: React.FC = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const {
    scheduledPayments,
    isLoading,
    error,
    fetchScheduledPayments,
    cancelScheduledPayment,
    totalCount,
    totalPages,
    currentPage,
    pageSize,
  } = useScheduledPaymentsStore();
  const navigate = useNavigate();

  // Parse URL parameters
  const searchParams = new URLSearchParams(location.search);
  const statusParam = searchParams.get('status');
  const upcomingParam = searchParams.get('upcoming');
  const recurringParam = searchParams.get('recurring');
  const viewParam = searchParams.get('view');
  const allParam = searchParams.get('all');

  const [showFilters, setShowFilters] = useState(false);
  const [pageTitle] = useState('Scheduled Payments');
  const [statusFilter, setStatusFilter] = useState<string[]>(statusParam ? [statusParam] : []);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [recurringFilter, setRecurringFilter] = useState<boolean | null>(null);
  const [upcomingFilter, setUpcomingFilter] = useState<'today' | 'week' | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'table'>(
    viewParam === 'table' || allParam === 'true' ? 'table' : 'dashboard'
  );

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Handle URL parameter changes
  useEffect(() => {
    if (recurringParam === 'true') {
      // Filter for recurring payments only
      setStatusFilter([]);
      setRecurringFilter(true);
      setUpcomingFilter(null);
    } else if (recurringParam === 'false') {
      // Filter for non-recurring payments only
      setStatusFilter([]);
      setRecurringFilter(false);
      setUpcomingFilter(null);
    } else if (statusParam) {
      setStatusFilter([statusParam]);
      setRecurringFilter(null);
      setUpcomingFilter(null);
    } else if (upcomingParam === 'today') {
      // Filter for today's pending payments
      setStatusFilter(['pending']);
      setUpcomingFilter('today');
      setRecurringFilter(null);
    } else if (upcomingParam === 'week') {
      // Filter for upcoming week payments
      setStatusFilter(['pending']);
      setUpcomingFilter('week');
      setRecurringFilter(null);
    } else {
      setStatusFilter([]);
      setRecurringFilter(null);
      setUpcomingFilter(null);
    }
  }, [statusParam, upcomingParam, recurringParam]);

  // Update viewMode when URL parameters change
  useEffect(() => {
    setViewMode(viewParam === 'table' || allParam === 'true' ? 'table' : 'dashboard');
  }, [viewParam, allParam]);

  useEffect(() => {
    fetchScheduledPayments({
      page,
      pageSize: limit,
      sortField,
      sortDirection,
      searchTerm,
      statusFilter,
      recurringFilter,
      upcomingFilter,
    });
  }, [page, limit, sortField, sortDirection, searchTerm, statusFilter, recurringFilter, upcomingFilter, fetchScheduledPayments]);

  const handleStatusFilterChange = (status: string) => {
    setPage(1); // Reset to first page on filter change
    setUpcomingFilter(null); // Clear upcoming filter when status changes
    if (status === 'all') {
      setStatusFilter([]);
      return;
    }
    if (statusFilter.includes(status)) {
      setStatusFilter(statusFilter.filter((s) => s !== status));
    } else {
      setStatusFilter([...statusFilter, status]);
    }
  };

  const clearFilters = () => {
    setStatusFilter([]);
    setSearchTerm('');
    setPage(1);
    setRecurringFilter(null);
    setUpcomingFilter(null);
  };

  const handleCancelPayment = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Cancel Scheduled Payment',
      message: 'Are you sure you want to cancel this scheduled payment? This action cannot be undone.',
      onConfirm: () => {
        cancelScheduledPayment(id).then(() => {
          fetchScheduledPayments({
            page,
            pageSize: limit,
            sortField,
            sortDirection,
            searchTerm,
            statusFilter,
            recurringFilter,
            upcomingFilter,
          });
        });
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
      },
    });
  };

  // If we're in dashboard mode and no specific filters are applied, show dashboard
  if (viewMode === 'dashboard' && !statusParam && !upcomingParam && !recurringParam && !allParam) {
    return <ScheduledPaymentsDashboard />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
        <div className="mb-4 md:mb-0">
          <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
          {!isLoading && (
            <p className="mt-1 text-sm text-gray-500">
              {totalCount} scheduled payments found
              {recurringFilter === true && ' (Recurring only)'}
              {recurringFilter === false && ' (One-time only)'}
              {upcomingFilter === 'today' && ' (Due today)'}
              {upcomingFilter === 'week' && ' (This week)'}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          {user?.role === 'user' && (
            <Button
              variant="primary"
              onClick={() => navigate('/scheduled-payments/new')}
              icon={<Calendar className="h-5 w-5" />}
            >
              Schedule New Payment
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <Card className="mb-4 animate-slide-down">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
            <button
              className="text-gray-400 hover:text-gray-500"
              onClick={() => setShowFilters(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleStatusFilterChange(option.value)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      (option.value === 'all' && statusFilter.length === 0) ||
                      (option.value !== 'all' && statusFilter.includes(option.value))
                        ? 'bg-primary-100 text-primary-800'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                    {option.value !== 'all' && statusFilter.includes(option.value) && (
                      <span className="ml-2">&#10003;</span>
                    )}
                  </button>
                ))}
              </div>
              {statusFilter.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Selected: {statusFilter.length} status
                  {statusFilter.length !== 1 ? 'es' : ''}
                </p>
              )}
            </div>

            {(recurringFilter !== null || upcomingFilter !== null) && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Active Filters
                </label>
                <div className="flex flex-wrap gap-2">
                  {recurringFilter === true && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                      Recurring Only
                    </span>
                  )}
                  {recurringFilter === false && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                      One-time Only
                    </span>
                  )}
                  {upcomingFilter === 'today' && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      Due Today
                    </span>
                  )}
                  {upcomingFilter === 'week' && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      This Week
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={clearFilters}>
                Clear All Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      <ScheduledPaymentsTable
        payments={scheduledPayments}
        onCancel={handleCancelPayment}
        isLoading={isLoading}
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={currentPage}
        pageSize={pageSize}
        sortField={sortField}
        sortDirection={sortDirection}
        searchTerm={searchTerm}
        onPageChange={setPage}
        onPageSizeChange={setLimit}
        onSort={(field, direction) => {
          setSortField(field);
          setSortDirection(direction);
        }}
        onSearch={setSearchTerm}
      />

      {error && <div className="text-red-500 mt-4">{error}</div>}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })}
      />
    </div>
  );
};

export default ScheduledPaymentsPage;