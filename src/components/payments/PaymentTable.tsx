import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaymentRequest } from '../../types';
import { format } from 'date-fns';
import PaymentStatusBadge from './PaymentStatusBadge';
import {
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import ConfirmDialog from '../ui/ConfirmDialog';
import QueryDialog from './QueryDialog';
import { useAuthStore } from '../../store/authStore';

interface PaymentTableProps {
  payments: PaymentRequest[];
  isLoading?: boolean;
  showActions?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onProcess?: (id: string) => void;
  onQuery?: (id: string, query: string) => void;
  onMarkInvoiceReceived?: (id: string) => void;
  // Server-side pagination props
  serverPagination?: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    // Add sorting support
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    onSort?: (field: string, direction: 'asc' | 'desc') => void;
    // Add search support
    searchTerm?: string;
    onSearch?: (searchTerm: string) => void;
  };
}

const PaymentTable: React.FC<PaymentTableProps> = ({
  payments,
  isLoading = false,
  showActions = false,
  onApprove,
  onReject,
  onProcess,
  onQuery,
  onMarkInvoiceReceived,
  serverPagination,
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Use server-side search when available, otherwise use local search
  const [localSearchTerm, setLocalSearchTerm] = useState('');

  // For display purposes, always use localSearchTerm so user sees what they type
  // The server search term is handled separately through the onSearch callback

  // Use server-side sorting when available, otherwise use local sorting
  const [localSortField, setLocalSortField] =
    useState<keyof PaymentRequest>('date');
  const [localSortDirection, setLocalSortDirection] = useState<'asc' | 'desc'>(
    'desc'
  );

  const sortField = serverPagination?.sortField || localSortField;
  const sortDirection = serverPagination?.sortDirection || localSortDirection;

  const [isSearching, setIsSearching] = useState(false);

  // Use local pagination only if server pagination is not provided
  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(5);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
  });
  const [queryDialog, setQueryDialog] = useState<{
    isOpen: boolean;
    paymentId: string;
  }>({
    isOpen: false,
    paymentId: '',
  });

  // Determine if we're using server-side or client-side pagination
  const isServerPagination = !!serverPagination;
  const currentPage = isServerPagination
    ? serverPagination.currentPage
    : localCurrentPage;
  const pageSize = isServerPagination
    ? serverPagination.pageSize
    : localPageSize;
  const totalCount = isServerPagination ? serverPagination.totalCount : 0;
  const totalPages = isServerPagination ? serverPagination.totalPages : 0;

  const handleSort = (field: keyof PaymentRequest) => {
    if (isServerPagination && serverPagination.onSort) {
      // Server-side sorting
      const newDirection =
        sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
      serverPagination.onSort(field as string, newDirection);
    } else {
      // Client-side sorting
      if (localSortField === field) {
        setLocalSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setLocalSortField(field);
        setLocalSortDirection('asc');
      }

      // Reset to first page when sorting (local pagination only)
      if (!isServerPagination) {
        setLocalCurrentPage(1);
      }
    }
  };

  const filteredPayments = payments
    .filter((payment) => {
      // Skip client-side search filtering if using server pagination
      if (isServerPagination) {
        return true;
      }

      if (!localSearchTerm) return true;
      const searchLower = localSearchTerm.toLowerCase();
      return (
        payment.vendorName?.toLowerCase().includes(searchLower) ||
        payment.itemDescription?.toLowerCase().includes(searchLower) ||
        payment.bills?.some((bill) =>
          bill.billNumber?.toLowerCase().includes(searchLower)
        ) ||
        payment.requestedBy?.name?.toLowerCase().includes(searchLower) ||
        payment.companyName?.toLowerCase().includes(searchLower) ||
        payment.companyBranch?.toLowerCase().includes(searchLower) ||
        payment.serialNumber?.toString().includes(localSearchTerm) ||
        payment.status?.toLowerCase().includes(searchLower) ||
        payment.advanceDetails
          ?.replace(/_/g, ' ')
          .toLowerCase()
          .includes(searchLower)
      );
    })
    .sort((a, b) => {
      // Only apply client-side sorting if not using server pagination
      if (isServerPagination) {
        return 0; // No client-side sorting needed
      }

      let comparison = 0;

      switch (localSortField) {
        case 'serialNumber':
          comparison = a.serialNumber - b.serialNumber;
          break;
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'companyName':
          comparison = a.companyName.localeCompare(b.companyName);
          break;
        case 'vendorName':
          comparison = a.vendorName.localeCompare(b.vendorName);
          break;
        case 'advanceDetails':
          comparison = a.advanceDetails.localeCompare(b.advanceDetails);
          break;
        case 'paymentAmount':
          comparison = a.paymentAmount - b.paymentAmount;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }

      return localSortDirection === 'asc' ? comparison : -comparison;
    });

  // Client-side pagination calculations (only used when not using server pagination)
  const clientTotalPages = Math.ceil(filteredPayments.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedPayments = isServerPagination
    ? filteredPayments
    : filteredPayments.slice(startIndex, endIndex);

  // Calculate display values based on pagination type
  const displayTotalPages = isServerPagination ? totalPages : clientTotalPages;
  const displayTotalCount = isServerPagination
    ? totalCount
    : filteredPayments.length;
  const displayStartIndex = isServerPagination
    ? (currentPage - 1) * pageSize
    : startIndex;
  const displayEndIndex = isServerPagination
    ? Math.min(displayStartIndex + paginatedPayments.length, displayTotalCount)
    : Math.min(endIndex, filteredPayments.length);

  // Reset to first page when search term changes
  React.useEffect(() => {
    // Handle server-side search with debouncing
    if (isServerPagination && serverPagination?.onSearch) {
      // Clear any existing search indicator after a short delay
      const searchIndicatorTimeout = setTimeout(() => {
        setIsSearching(false);
      }, 100);

      // Set up the actual search with longer debounce
      const debounceTimeout = setTimeout(() => {
        setIsSearching(true);
        serverPagination.onSearch!(localSearchTerm);

        // Clear searching state after search is initiated
        setTimeout(() => setIsSearching(false), 1000);
      }, 500); // 500ms debounce for less frequent API calls

      // Cleanup function to clear timeouts
      return () => {
        clearTimeout(searchIndicatorTimeout);
        clearTimeout(debounceTimeout);
      };
    } else {
      // Client-side search - reset to first page immediately
      setLocalCurrentPage(1);
      setIsSearching(false);
    }
  }, [localSearchTerm, isServerPagination, serverPagination?.onSearch]);

  const handlePageChange = (page: number) => {
    if (isServerPagination) {
      serverPagination.onPageChange(page);
    } else {
      setLocalCurrentPage(page);
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    if (isServerPagination) {
      serverPagination.onPageSizeChange(newPageSize);
    } else {
      setLocalPageSize(newPageSize);
      setLocalCurrentPage(1);
    }
  };

  const handleRowClick = (payment: PaymentRequest) => {
    navigate(`/payments/${payment.id}`);
  };

  const handleApprove = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Approve Payment',
      message: 'Are you sure you want to approve this payment request?',
      action: () => {
        onApprove?.(id);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleReject = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Reject Payment',
      message: 'Are you sure you want to reject this payment request?',
      action: () => {
        onReject?.(id);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleProcess = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Process Payment',
      message: 'Are you sure you want to mark this payment as processed?',
      action: () => {
        onProcess?.(id);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleQuery = (id: string) => {
    setQueryDialog((prev) => ({ ...prev, paymentId: id }));
  };

  const handleMarkInvoiceReceived = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Mark Invoice Received',
      message:
        'Are you sure you want to mark the invoice as received for this payment?',
      action: () => {
        onMarkInvoiceReceived?.(id);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const getSortIcon = (field: keyof PaymentRequest) => {
    if (sortField !== field)
      return <ChevronDown className="h-4 w-4 text-gray-400" />;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 text-primary-600" />
    ) : (
      <ChevronDown className="h-4 w-4 text-primary-600" />
    );
  };

  if (isLoading) {
    return (
      <Card>
        <div className="mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative">
              <Input
                placeholder="Search payments..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                leftIcon={
                  isSearching ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
                  ) : (
                    <Search className="h-5 w-5 text-gray-400" />
                  )
                }
                className="max-w-xs"
                disabled={false}
              />
              {localSearchTerm && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <button
                    onClick={() => setLocalSearchTerm('')}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                    type="button"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label htmlFor="pageSize" className="text-sm text-gray-500">
                  Show:
                </label>
                <select
                  id="pageSize"
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled={isLoading}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
                <span className="text-sm text-gray-500">entries</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Filter className="h-4 w-4" />
                <span>Loading...</span>
              </div>
            </div>
          </div>
        </div>

        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative">
              <Input
                placeholder="Search payments..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                leftIcon={
                  isSearching ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
                  ) : (
                    <Search className="h-5 w-5 text-gray-400" />
                  )
                }
                className="max-w-xs"
                disabled={false}
              />
              {localSearchTerm && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <button
                    onClick={() => setLocalSearchTerm('')}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                    type="button"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label htmlFor="pageSize" className="text-sm text-gray-500">
                  Show:
                </label>
                <select
                  id="pageSize"
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
                <span className="text-sm text-gray-500">entries</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Filter className="h-4 w-4" />
                <span>
                  {isSearching
                    ? 'Searching...'
                    : `Showing ${
                        displayStartIndex + 1
                      }-${displayEndIndex} of ${displayTotalCount} payments`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {paginatedPayments.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No payments found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {localSearchTerm
                ? 'No payments match your search criteria. Try adjusting your search term.'
                : 'No payments have been requested yet'}
            </p>
            {localSearchTerm && (
              <button
                onClick={() => setLocalSearchTerm('')}
                className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-primary-600 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full py-2 align-middle">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('serialNumber')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>SR No.</span>
                            {getSortIcon('serialNumber')}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('date')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Date</span>
                            {getSortIcon('date')}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('companyName')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Company/Branch</span>
                            {getSortIcon('companyName')}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Vendor
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                          onClick={() => handleSort('advanceDetails')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>PAY AGAINST</span>
                            {getSortIcon('advanceDetails')}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('paymentAmount')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Amount</span>
                            {getSortIcon('paymentAmount')}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Status</span>
                            {getSortIcon('status')}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Requested By
                        </th>
                        {showActions && (
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedPayments.map((payment) => (
                        <tr
                          key={payment.id}
                          className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                          onClick={() => handleRowClick(payment)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {payment.serialNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(payment.date), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <div>
                              <div className="font-medium">
                                {payment.companyName}, {payment.companyBranch}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {payment.vendorName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {payment.advanceDetails
                              .replace(/_/g, ' ')
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {payment.paymentAmount.toLocaleString('en-IN', {
                              style: 'currency',
                              currency: 'INR',
                              maximumFractionDigits: 0,
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <PaymentStatusBadge status={payment.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment.requestedBy.name}
                          </td>
                          {showActions && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div
                                className="flex space-x-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {payment.status === 'pending' &&
                                  onApprove &&
                                  onReject &&
                                  user?.role === 'admin' && (
                                    <>
                                      <Button
                                        size="xs"
                                        variant="success"
                                        onClick={() =>
                                          handleApprove(payment.id)
                                        }
                                      >
                                        Approve
                                      </Button>
                                      <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => handleReject(payment.id)}
                                      >
                                        Reject
                                      </Button>
                                      <Button
                                        variant="warning"
                                        size="sm"
                                        onClick={() => handleQuery(payment.id)}
                                      >
                                        Query
                                      </Button>
                                    </>
                                  )}
                                {payment.status === 'approved' &&
                                  onProcess &&
                                  user?.role === 'accounts' && (
                                    <Button
                                      size="xs"
                                      variant="primary"
                                      onClick={() => handleProcess(payment.id)}
                                    >
                                      Process
                                    </Button>
                                  )}
                                {payment.status === 'processed' &&
                                  (payment.advanceDetails === 'advance' ||
                                    payment.advanceDetails ===
                                      'advance_(bill/PI)') &&
                                  (!payment.invoiceReceived ||
                                    payment.invoiceReceived === 'no') &&
                                  onMarkInvoiceReceived &&
                                  user?.role === 'accounts' && (
                                    <Button
                                      size="xs"
                                      variant="success"
                                      onClick={() =>
                                        handleMarkInvoiceReceived(payment.id)
                                      }
                                    >
                                      Mark Invoice Received
                                    </Button>
                                  )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Pagination Controls */}
            {displayTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
                <div className="flex flex-1 justify-between sm:hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === displayTotalPages}
                  >
                    Next
                  </Button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">
                        {displayStartIndex + 1}
                      </span>{' '}
                      to <span className="font-medium">{displayEndIndex}</span>{' '}
                      of{' '}
                      <span className="font-medium">{displayTotalCount}</span>{' '}
                      results
                    </p>
                  </div>
                  <div>
                    <nav
                      className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                      aria-label="Pagination"
                    >
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>

                      {/* Page Numbers */}
                      {Array.from(
                        { length: displayTotalPages },
                        (_, i) => i + 1
                      ).map((page) => {
                        // Show first page, last page, current page, and pages around current page
                        const showPage =
                          page === 1 ||
                          page === displayTotalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1);

                        if (!showPage) {
                          // Show ellipsis for gaps
                          if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return (
                              <span
                                key={page}
                                className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300"
                              >
                                ...
                              </span>
                            );
                          }
                          return null;
                        }

                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                              page === currentPage
                                ? 'z-10 bg-primary-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'
                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === displayTotalPages}
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

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

      <QueryDialog
        isOpen={queryDialog.isOpen}
        onClose={() => setQueryDialog((prev) => ({ ...prev, isOpen: false }))}
        onSubmit={(query) => {
          onQuery?.(queryDialog.paymentId, query);
          setQueryDialog((prev) => ({ ...prev, isOpen: false }));
        }}
      />
    </>
  );
};

export default PaymentTable;
