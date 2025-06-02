import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { usePaymentStore } from '../store/paymentStore';
import PaymentTable from '../components/payments/PaymentTable';
import { Filter, X } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const ApprovalsPage: React.FC = () => {
  const { user } = useAuthStore();
  const {
    payments,
    filteredPayments,
    filterOptions,
    setFilterOptions,
    approvePayment,
    rejectPayment,
    markAsProcessed,
    markInvoiceReceived,
    raiseQuery,
  } = usePaymentStore();

  const [showFilters, setShowFilters] = useState(false);

  // Set initial filter based on user role
  useEffect(() => {
    if (user?.role === 'admin') {
      // Admin can only see pending requests
      setFilterOptions({
        ...filterOptions,
        status: ['pending'],
      });
    } else if (user?.role === 'accounts') {
      // Accounts can only see approved requests
      setFilterOptions({
        ...filterOptions,
        status: ['approved'],
      });
    }
  }, [user?.role]);

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'processed', label: 'Processed' },
    { value: 'query_raised', label: 'Query Raised' },
  ];

  const handleStatusFilterChange = (status: string) => {
    if (status === 'all') {
      setFilterOptions({ ...filterOptions, status: [] });
      return;
    }

    const currentStatuses = filterOptions.status;
    if (currentStatuses.includes(status)) {
      // Remove the status if it's already selected
      setFilterOptions({
        ...filterOptions,
        status: currentStatuses.filter((s) => s !== status),
      });
    } else {
      // Add the status if it's not selected
      setFilterOptions({
        ...filterOptions,
        status: [...currentStatuses, status],
      });
    }
  };

  const clearFilters = () => {
    setFilterOptions({
      status: [],
      dateRange: { start: null, end: null },
      vendor: null,
      company: null,
    });
  };

  const handleApprove = async (id: string) => {
    if (!user || user.role !== 'admin') return;
    await approvePayment(id, user);
  };

  const handleReject = async (id: string) => {
    if (!user || user.role !== 'admin') return;
    await rejectPayment(id, user);
  };

  const handleProcess = async (id: string) => {
    if (!user || user.role !== 'accounts') return;
    await markAsProcessed(id);
  };

  const handleQuery = async (id: string, query: string) => {
    if (!user || user.role !== 'admin') return;
    await raiseQuery(id, user, query);
  };

  const handleMarkInvoiceReceived = async (id: string) => {
    await markInvoiceReceived(id);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Payment Approvals
          </h1>
          <p className="text-sm text-gray-500">
            {user?.role === 'admin'
              ? 'Review and approve pending payment requests'
              : 'Process approved payments'}
          </p>
        </div>

        <Button
          variant="outline"
          icon={<Filter className="h-5 w-5" />}
          onClick={() => setShowFilters(!showFilters)}
          className="mt-4 md:mt-0"
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>

      {showFilters && (
        <Card className="mb-6 animate-slide-down">
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
                      (option.value === 'all' &&
                        filterOptions.status.length === 0) ||
                      (option.value !== 'all' &&
                        filterOptions.status.includes(option.value))
                        ? 'bg-primary-100 text-primary-800'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                    {option.value !== 'all' &&
                      filterOptions.status.includes(option.value) && (
                        <span className="ml-2">✓</span>
                      )}
                  </button>
                ))}
              </div>
              {filterOptions.status.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Selected: {filterOptions.status.length} status
                  {filterOptions.status.length !== 1 ? 'es' : ''}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={clearFilters}>
                Clear All Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      <PaymentTable
        payments={filteredPayments}
        onApprove={user?.role === 'admin' ? handleApprove : undefined}
        onReject={user?.role === 'admin' ? handleReject : undefined}
        onProcess={user?.role === 'accounts' ? handleProcess : undefined}
        onQuery={user?.role === 'admin' ? handleQuery : undefined}
        onMarkInvoiceReceived={
          user?.role === 'accounts' ? handleMarkInvoiceReceived : undefined
        }
        showActions={true}
      />
    </div>
  );
};

export default ApprovalsPage;
