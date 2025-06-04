import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    isLoading,
    pagination,
    sortOptions,
    searchTerm,
    fetchPayments,
    filterOptions,
    setFilterOptions,
    setSearchTerm,
    approvePayment,
    rejectPayment,
    bulkApprovePayments,
    bulkRejectPayments,
    markAsProcessed,
    markInvoiceReceived,
    raiseQuery,
    raiseAccountsQuery,
  } = usePaymentStore();

  const [showFilters, setShowFilters] = useState(false);

  // Fetch payments when component mounts
  React.useEffect(() => {
    if (user && payments.length === 0) {
      fetchPayments(1, 10, true, filterOptions);
    }
  }, [user, fetchPayments]);

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
      overdueInvoices: false,
    });
  };

  const handleApprove = async (id: string) => {
    if (!user) return;
    await approvePayment(id, user);
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

  const handleBulkApprove = async (ids: string[]) => {
    if (!user) return;
    const result = await bulkApprovePayments(ids, user);

    if (result.success.length > 0) {
      console.log(`Successfully approved ${result.success.length} payments`);
    }
    if (result.failed.length > 0) {
      console.error(`Failed to approve ${result.failed.length} payments`);
    }

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

  const handleBulkReject = async (ids: string[]) => {
    if (!user) return;
    const result = await bulkRejectPayments(ids, user);

    if (result.success.length > 0) {
      console.log(`Successfully rejected ${result.success.length} payments`);
    }
    if (result.failed.length > 0) {
      console.error(`Failed to reject ${result.failed.length} payments`);
    }

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
    paymentAmount: number
  ) => {
    await markAsProcessed(id, invoiceReceived, paymentAmount);
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
        isLoading={isLoading}
        showActions={true}
        onApprove={user?.role === 'admin' ? handleApprove : undefined}
        onReject={user?.role === 'admin' ? handleReject : undefined}
        onBulkApprove={user?.role === 'admin' ? handleBulkApprove : undefined}
        onBulkReject={user?.role === 'admin' ? handleBulkReject : undefined}
        enableBulkSelection={user?.role === 'admin'}
        maxSelections={10}
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

export default ApprovalsPage;
