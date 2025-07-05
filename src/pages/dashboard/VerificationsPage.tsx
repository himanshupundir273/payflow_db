import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Filter, X } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card'; 
import { usePaymentStore } from '../../store/paymentStore';
import { useAuthStore } from '../../store/authStore';
import PaymentTable from '../../components/payments/PaymentTable';

const VerificationPage: React.FC = () => {
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
    raiseQuery,
    accountsVerifyPayment,
    bulkAccountsVerifyPayments,
    resetFilterOptions,
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
    resetFilterOptions({
      status: ['pending'],
      accountsVerificationStatus: ['pending']
    });
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

  const handleVerify = async (id: string) => {
    if (!user) return;
    await accountsVerifyPayment(id);
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

  const handleBulkAccountsVerify = async (ids: string[]) => {
    if (!user) return;
    const result = await bulkAccountsVerifyPayments(ids);

    if (result.success.length > 0) {
      console.log(`Successfully processed ${result.success.length} payments`);
    }
    if (result.failed.length > 0) {
      console.error(`Failed to process ${result.failed.length} payments`);
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
          <h1 className="text-2xl font-bold text-gray-900">
            Payment Verification
          </h1>
          <p className="text-sm text-gray-500">
            Review and verify payment requests
          </p>
        </div>

        <div className="flex gap-2 mt-4 md:mt-0">
          <Button
            variant="outline"
            icon={<Filter className="h-5 w-5" />}
            onClick={() => setShowFilters(!showFilters)}
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
        detailNav={true}
        source='/dashboard/verifications'
        isLoading={isLoading}
        showActions={true}
        onVerify={handleVerify}
        onQuery={handleQuery}
        onBulkAccountsVerify={handleBulkAccountsVerify}
        enableBulkSelection={user?.role === 'accounts'}
        maxSelections={10}
        serverPagination={serverPaginationConfig}
      />
    </div>
  );
};

export default VerificationPage; 