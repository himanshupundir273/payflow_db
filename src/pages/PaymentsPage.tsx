import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePaymentStore } from '../store/paymentStore';
import PaymentTable from '../components/payments/PaymentTable';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Plus, Filter, X } from 'lucide-react';

const PaymentsPage: React.FC = () => {
  const { user } = useAuthStore();
  const {
    payments,
    filteredPayments,
    isLoading,
    pagination,
    sortOptions,
    searchTerm,
    fetchPayments,
    approvePayment,
    rejectPayment,
    markAsProcessed,
    markInvoiceReceived,
    raiseQuery,
    raiseAccountsQuery,
    filterOptions,
    setFilterOptions,
    setSearchTerm,
    resetFilterOptions,
  } = usePaymentStore();
  const navigate = useNavigate();

  const [showFilters, setShowFilters] = useState(false);
  const [pageTitle, setPageTitle] = useState('Payment Requests');

  // Fetch payments when component mounts
  React.useEffect(() => {
    if (user && payments.length === 0) {
      fetchPayments(1, 10, true);
    }
  }, [user, fetchPayments]);

  // Reset filter options when component mounts, but only if not coming from dashboard
  React.useEffect(() => {
    // Check if we're coming from dashboard by looking at the filter options
    const hasDashboardFilters = filterOptions.status.length > 0 ;
    console.log(filterOptions,filterOptions.status.length)
    if (!hasDashboardFilters) {
      resetFilterOptions();
    }
  }, []);

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'processed', label: 'Processed' },
    { value: 'query_raised', label: 'Query Raised' },
  ];

  const handlePageChange = useCallback(
    (page: number) => {
      fetchPayments(
        page,
        pagination.pageSize,
        true,
        filterOptions,
        sortOptions,
        searchTerm
      );
    },
    [fetchPayments, pagination.pageSize, filterOptions, sortOptions, searchTerm]
  );

  const handlePageSizeChange = useCallback(
    (pageSize: number) => {
      fetchPayments(1, pageSize, true, filterOptions, sortOptions, searchTerm);
    },
    [fetchPayments, filterOptions, sortOptions, searchTerm]
  );

  const handleSort = useCallback(
    (field: string, direction: 'asc' | 'desc') => {
      const newSortOptions = { field, direction };
      fetchPayments(
        1,
        pagination.pageSize,
        true,
        filterOptions,
        newSortOptions,
        searchTerm
      );
    },
    [fetchPayments, pagination.pageSize, filterOptions, searchTerm]
  );

  const handleSearch = useCallback(
    (newSearchTerm: string) => {
      setSearchTerm(newSearchTerm);
      fetchPayments(
        1,
        pagination.pageSize,
        true,
        filterOptions,
        sortOptions,
        newSearchTerm
      );
    },
    [
      setSearchTerm,
      fetchPayments,
      pagination.pageSize,
      filterOptions,
      sortOptions,
    ]
  );

  // Memoize serverPagination object to prevent unnecessary re-renders
  const serverPaginationConfig = useMemo(
    () => ({
      currentPage: pagination.page,
      pageSize: pagination.pageSize,
      totalCount: pagination.totalCount,
      totalPages: pagination.totalPages,
      onPageChange: handlePageChange,
      onPageSizeChange: handlePageSizeChange,
      sortField: sortOptions.field,
      sortDirection: sortOptions.direction,
      onSort: handleSort,
      searchTerm: searchTerm,
      onSearch: handleSearch,
    }),
    [
      pagination.page,
      pagination.pageSize,
      pagination.totalCount,
      pagination.totalPages,
      handlePageChange,
      handlePageSizeChange,
      sortOptions.field,
      sortOptions.direction,
      handleSort,
      searchTerm,
      handleSearch,
    ]
  );

  const handleApprove = async (id: string, paymentAmount: number) => {
    if (!user) return;
    await approvePayment(id, user, paymentAmount);
    // Refresh current page to reflect changes
    fetchPayments(
      pagination.page,
      pagination.pageSize,
      true,
      filterOptions,
      sortOptions,
      searchTerm
    );
  };

  const handleReject = async (id: string) => {
    if (!user) return;
    await rejectPayment(id, user);
    // Refresh current page to reflect changes
    fetchPayments(
      pagination.page,
      pagination.pageSize,
      true,
      filterOptions,
      sortOptions,
      searchTerm
    );
  };

  const handleProcess = async (
    id: string,
    invoiceReceived: 'yes' | 'no',
    paymentAmount: number,
    reason: string
  ) => {
    await markAsProcessed(id, invoiceReceived, paymentAmount, reason);
    // Refresh current page to reflect changes
    fetchPayments(
      pagination.page,
      pagination.pageSize,
      true,
      filterOptions,
      sortOptions,
      searchTerm
    );
  };

  const handleQuery = async (id: string, query: string) => {
    if (!user) return;
    await raiseQuery(id, user, query);
    // Refresh current page to reflect changes
    fetchPayments(
      pagination.page,
      pagination.pageSize,
      true,
      filterOptions,
      sortOptions,
      searchTerm
    );
  };

  const handleAccountsQuery = async (id: string, query: string) => {
    if (!user) return;
    await raiseAccountsQuery(id, user, query);
    // Refresh current page to reflect changes
    fetchPayments(
      pagination.page,
      pagination.pageSize,
      true,
      filterOptions,
      sortOptions,
      searchTerm
    );
  };

  const handleMarkInvoiceReceived = async (id: string) => {
    await markInvoiceReceived(id);
    // Refresh current page to reflect changes
    fetchPayments(
      pagination.page,
      pagination.pageSize,
      true,
      filterOptions,
      sortOptions,
      searchTerm
    );
  };

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
    resetFilterOptions();
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
          {!isLoading && (
            <p className="mt-1 text-sm text-gray-500">
              {pagination.totalCount} payments found
            </p>
          )}
        </div>
        <div className="flex flex-col space-y-3 mt-4 md:mt-0 md:flex-row md:space-y-0 md:space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            icon={<Filter className="h-5 w-5" />}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          {user?.role === 'user' && (
            <Button
              variant="primary"
              onClick={() => navigate('/payments/new')}
              icon={<Plus className="h-5 w-5" />}
            >
              New Payment Request
            </Button>
          )}
        </div>
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
        isLoading={isLoading}
        showActions={false}
        onApprove={user?.role === 'admin' ? handleApprove : undefined}
        onReject={user?.role === 'admin' ? handleReject : undefined}
        onProcess={user?.role === 'accounts' ? handleProcess : undefined}
        onQuery={user?.role === 'admin' ? handleQuery : undefined}
        onAccountsQuery={
          user?.role === 'accounts' ? handleAccountsQuery : undefined
        }
        onMarkInvoiceReceived={
          user?.role === 'accounts' ? handleMarkInvoiceReceived : undefined
        }
        serverPagination={serverPaginationConfig}
      />
    </div>
  );
};

export default PaymentsPage;
