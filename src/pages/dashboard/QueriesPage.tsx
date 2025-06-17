import React, { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePaymentStore } from '../../store/paymentStore';
import PaymentTable from '../../components/payments/PaymentTable';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { Filter, X } from 'lucide-react';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useSearchParams } from 'react-router-dom';

const QueriesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const pageType = searchParams.get('type') ?? 'query';
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
    markInvoiceReceived,
    bulkMarkInvoiceRecieved,
  } = usePaymentStore();
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => { },
  });

  // Cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      resetFilterOptions();
      setSearchTerm('');
    };
  }, [resetFilterOptions, setSearchTerm]);

  const statusOptions = [
    { value: 'query_raised', label: 'Query Raised' },
  ];

  // Initial data fetch
  // useEffect(() => {
  //   if (user) {
  //     const newFilterOptions = {
  //       status: ['query_raised'],
  //       dateRange: { start: null, end: null },
  //       vendor: null,
  //       company: null,
  //       companyList: null,
  //       overdueInvoices: false,
  //       hasAccountsQuery: false,
  //     };

  //     // If overdue advances filter is true, update status to approved
  //     if (filterOptions.overdueInvoices) {
  //       newFilterOptions.status = ['approved'];
  //       newFilterOptions.overdueInvoices = true;
  //     }

  //     // If accounts query filter is true, update status to approved and set hasAccountsQuery
  //     if (filterOptions.hasAccountsQuery) {
  //       newFilterOptions.status = ['approved'];
  //       newFilterOptions.hasAccountsQuery = true;
  //     }

  //     // If both filters are true, keep both settings
  //     if (filterOptions.overdueInvoices && filterOptions.hasAccountsQuery) {
  //       newFilterOptions.status = ['approved'];
  //       newFilterOptions.overdueInvoices = true;
  //       newFilterOptions.hasAccountsQuery = true;
  //     }

  //     setFilterOptions(newFilterOptions);
  //     fetchPayments(1, 10, true, newFilterOptions, sortOptions, searchTerm);
  //   }

  //   // Cleanup function to reset filters when component unmounts
  //   return () => {
  //     resetFilterOptions();
  //     setSearchTerm('');
  //     setLocalSearchTerm('');
  //     setShowFilters(false);
  //   };
  // }, [user, filterOptions.overdueInvoices, filterOptions.hasAccountsQuery]);

  useEffect(() => {
    if (!user) return;

    // Reset filters first to ensure clean state
    resetFilterOptions();

    // Set up new filter options based on page type
    const newFilterOptions = {
      status: ['query_raised'],
      dateRange: { start: null, end: null },
      vendor: null,
      company: null,
      companyList: null,
      overdueInvoices: false,
      hasAccountsQuery: false,
    };

    // Handle different page types
    if (pageType === 'overdue') {
      newFilterOptions.status = ['approved'];
      newFilterOptions.overdueInvoices = true;
    } else if (pageType === 'accounts') {
      newFilterOptions.status = ['approved', 'processed']; // Include both approved and processed payments
      newFilterOptions.hasAccountsQuery = true;
    }

    // Set the filter options
    setFilterOptions(newFilterOptions);

    // Fetch data with the new filter options
    fetchPayments(1, 10, true, newFilterOptions, sortOptions, searchTerm);

    return () => {
      resetFilterOptions();
      setSearchTerm('');
      setLocalSearchTerm('');
      setShowFilters(false);
    };
  }, [user, pageType]); // Keep dependencies minimal to prevent loops


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
    const currentStatuses = filterOptions.status;
    if (currentStatuses.includes(status)) {
      // If we're removing the last status, add it back
      if (currentStatuses.length === 1) {
        setFilterOptions({
          ...filterOptions,
          status: ['query_raised'],
        });
      } else {
        // Remove the status if it's already selected
        setFilterOptions({
          ...filterOptions,
          status: currentStatuses.filter((s) => s !== status),
        });
      }
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

  const handleMarkInvoiceReceived = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Mark Invoice Received',
      message:
        'Are you sure you want to mark the invoice as received for this payment?',
      action: () => {
        markInvoiceReceived(id);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        // Refresh current page to reflect changes
        fetchPayments(
          pagination.page,
          pagination.pageSize,
          true,
          filterOptions,
          sortOptions,
          searchTerm
        );
      },
    });
  };

  const handleBulkMarkInvoiceRecieved = async (ids: string[]) => {
    if (!user || !bulkMarkInvoiceRecieved) return;
  
    const result = await bulkMarkInvoiceRecieved(ids);
  
    if (result.success.length > 0) {
      console.log(`Successfully processed ${result.success.length} payments`);
    }
    if (result.failed.length > 0) {
      console.error(`Failed to process ${result.failed.length} payments`);
    }
  
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
          <h1 className="text-2xl font-bold text-gray-900">Queries</h1>
          {!isLoading && (
            <p className="mt-1 text-sm text-gray-500">
              {pagination.totalCount} {' '}
              {filterOptions.overdueInvoices && filterOptions.hasAccountsQuery
                ? 'Overdue Advance with Accounts Query'
                : filterOptions.overdueInvoices
                  ? 'Overdue Advance'
                  : filterOptions.hasAccountsQuery
                    ? 'Accounts Query'
                    : 'Query Raised'} {' '}
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
                    className={`px-3 py-1 rounded-full text-sm font-medium ${filterOptions.status.includes(option.value)
                        ? 'bg-primary-100 text-primary-800'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                  >
                    {option.label}
                    {filterOptions.status.includes(option.value) && (
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
        enableBulkSelection={pageType==='overdue' && user?.role === 'accounts'}
        showActions={true}
        onMarkInvoiceReceived={user?.role === 'accounts' ? handleMarkInvoiceReceived : undefined}
        onBulkMarkInvoiceRecieved={(user?.role === 'accounts'&& pageType==='overdue') ? handleBulkMarkInvoiceRecieved : undefined}
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

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={() => {
          confirmDialog.action();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  );
};

export default QueriesPage; 