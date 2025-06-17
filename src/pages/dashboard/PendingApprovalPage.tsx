import React, { useState, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePaymentStore } from '../../store/paymentStore';
import PaymentTable from '../../components/payments/PaymentTable';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { Filter, X } from 'lucide-react';

const PendingApprovalPage: React.FC = () => {
  const { user } = useAuthStore();
  const {
    // payments,
    filteredPayments,
    isLoading,
    pagination,
    sortOptions,
    searchTerm,
    fetchPayments,
    filterOptions,
    setFilterOptions,
    setSearchTerm,
    resetFilterOptions,
    approvePayment,
    rejectPayment,
    bulkApprovePayments,
    bulkRejectPayments,
    raiseQuery,
  } = usePaymentStore();
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
  ];

  // Initial data fetch
  React.useEffect(() => {
    if (user) {
      const newFilterOptions = {
        status: ['pending'],
        dateRange: { start: null, end: null },
        vendor: null,
        company: null,
        companyList: null,
        overdueInvoices: false,
        hasAccountsQuery: false,
      };
      setFilterOptions(newFilterOptions);
      fetchPayments(1, 10, true, newFilterOptions, sortOptions, searchTerm);
    }

    // Cleanup function to reset filters when component unmounts
    return () => {
      resetFilterOptions();
      setSearchTerm('');
    };
  }, [user]);

  const handlePageChange = useCallback((page: number) => {
    fetchPayments(page, pagination.pageSize, true, filterOptions, sortOptions, searchTerm);
  }, [pagination.pageSize, filterOptions, sortOptions, searchTerm, fetchPayments]);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    fetchPayments(1, pageSize, true, filterOptions, sortOptions, searchTerm);
  }, [filterOptions, sortOptions, searchTerm, fetchPayments]);

  const handleSort = useCallback((field: string, direction: 'asc' | 'desc') => {
    const newSortOptions = { field, direction };
    fetchPayments(1, pagination.pageSize, true, filterOptions, newSortOptions, searchTerm);
  }, [pagination.pageSize, filterOptions, searchTerm, fetchPayments]);

  const handleSearch = useCallback((newSearchTerm: string) => {
    setLocalSearchTerm(newSearchTerm);
    // Debounce the server search
    const timeoutId = setTimeout(() => {
      setSearchTerm(newSearchTerm);
      fetchPayments(1, pagination.pageSize, true, filterOptions, sortOptions, newSearchTerm);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [pagination.pageSize, filterOptions, sortOptions, fetchPayments, setSearchTerm]);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Approval</h1>
          {!isLoading && (
            <p className="mt-1 text-sm text-gray-500">
              {pagination.totalCount} Pending {' '}
              {pagination.totalCount > 1 ? 'Payments' : 'Payment'} found
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
                    className={`px-3 py-1 rounded-full text-sm font-medium ${(option.value === 'all' &&
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
        detailNav={user?.role !== 'user' ? true : false}
        source='/dashboard/pending-approval'
        showActions={user?.role !== 'user' ? true : false}
        onApprove={user?.role === 'admin' ? handleApprove : undefined}
        onReject={user?.role === 'admin' ? handleReject : undefined}
        onQuery={user?.role === 'admin' ? handleQuery : undefined}
        onBulkApprove={user?.role === 'admin' ? handleBulkApprove : undefined}
        onBulkReject={user?.role === 'admin' ? handleBulkReject : undefined}
        enableBulkSelection={user?.role === 'admin'}
        maxSelections={10}
        serverPagination={{
          currentPage: pagination.page,
          pageSize: pagination.pageSize,
          totalCount: pagination.totalCount,
          totalPages: pagination.totalPages,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
          sortField: sortOptions.field,
          sortDirection: sortOptions.direction,
          onSort: handleSort,
          searchTerm: localSearchTerm,
          onSearch: handleSearch,
        }}
      />
    </div>
  );
};

export default PendingApprovalPage; 