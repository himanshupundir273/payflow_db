import React, { useState } from 'react';
import { ScheduledPayment } from '../../store/scheduledPaymentsStore';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useAuthStore } from '../../store/authStore';
import Input from '../ui/Input';
import {
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Minus,
} from 'lucide-react';
import PaymentStatusBadge from '../payments/PaymentStatusBadge';
import Tooltip from '../ui/Tooltip';

interface ScheduledPaymentsTableProps {
  payments: ScheduledPayment[];
  onCancel: (id: string) => void;
  isLoading: boolean;
  // Server-side props
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  searchTerm: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSort: (field: string, direction: 'asc' | 'desc') => void;
  onSearch: (term: string) => void;
}

const ScheduledPaymentsTable: React.FC<ScheduledPaymentsTableProps> = ({
  payments,
  onCancel,
  isLoading,
  totalCount,
  totalPages,
  currentPage,
  pageSize,
  sortField,
  sortDirection,
  searchTerm,
  onPageChange,
  onPageSizeChange,
  onSort,
  onSearch,
}) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [isSearching, setIsSearching] = useState(false);

  React.useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      setIsSearching(true);
      onSearch(localSearchTerm);
      setTimeout(() => setIsSearching(false), 1000);
    }, 500);
    return () => clearTimeout(debounceTimeout);
  }, [localSearchTerm, onSearch]);

  const handleSort = (field: keyof ScheduledPayment) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(field, newDirection);
  };

  const getSortIcon = (field: keyof ScheduledPayment) => {
    if (sortField !== field) return <ChevronDown className="h-4 w-4 text-gray-400" />;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 text-primary-600" /> : <ChevronDown className="h-4 w-4 text-primary-600" />;
  };

  const handleRowClick = (id: string) => {
    navigate(`/scheduled-payments/${id}`);
  };

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  if (isLoading) {
    return (
      <Card>
        <div className="mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative">
              <Input
                placeholder="Search scheduled payments..."
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
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
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
    <Card>
      <div className="mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative">
            <Input
              placeholder="Search scheduled payments..."
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
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
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
                  : `Showing ${startIndex + 1}-${endIndex} of ${totalCount} payments`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {totalCount === 0 ? (
        <div className="text-center py-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
            <Search className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No scheduled payments found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {localSearchTerm
              ? 'No payments match your search criteria. Try adjusting your search term.'
              : 'There are currently no payments scheduled.'}
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
          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-4">
            {payments.map((payment, index) => (
              <div
                key={payment.id}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.98]"
                onClick={() => handleRowClick(payment.id)}
              >
                {/* Header with SR No and Status */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div>
                      <span className="text-lg font-bold text-gray-900">
                        #{startIndex + index + 1}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        {payment.schedule_status === 'processed' && payment.is_recurring && payment.next_execution 
                          ? format(new Date(payment.next_execution), 'dd/MM/yyyy')
                          : format(new Date(payment.scheduled_for), 'dd/MM/yyyy')
                        }
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-col items-end gap-1">
                      <PaymentStatusBadge status={payment.schedule_status} />
                      <Tooltip content={
                        payment.urgency_level === 'high'
                          ? 'High Priority - Requires immediate attention and processing'
                          : payment.urgency_level === 'medium'
                            ? 'Medium Priority - Standard processing timeline'
                            : 'Low Priority - Routine processing, no urgency'
                      }>
                        <div
                          className={`p-1 rounded-full ${payment.urgency_level === 'high'
                              ? 'bg-red-100 text-red-800'
                              : payment.urgency_level === 'medium'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                        >
                          {payment.urgency_level === 'high' ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : payment.urgency_level === 'medium' ? (
                            <Minus className="h-4 w-4" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                        </div>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                {/* Amount - Prominent Display */}
                <div className="mb-2 p-1 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Payment Amount</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {payment.payment_amount.toLocaleString('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        maximumFractionDigits: 0,
                      })}
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-start">
                    <span className="text-gray-500 font-medium">Company:</span>
                    <span className="font-semibold text-right max-w-[65%] leading-tight">
                      {payment.company_name},
                      <span className="text-gray-600">{payment.company_branch}</span>
                    </span>
                  </div>

                  <div className="flex justify-between items-start">
                    <span className="text-gray-500 font-medium">Vendor:</span>
                    <span className="font-semibold text-right max-w-[65%] leading-tight">
                      {payment.vendor_name}
                    </span>
                  </div>

                  <div className="flex justify-between items-start">
                    <span className="text-gray-500 font-medium">Payment Against:</span>
                    <div className="flex flex-col items-end max-w-[65%]">
                      <span className="font-semibold text-right leading-tight text-gray-900">
                        {payment.advance_details
                          ?.replace(/_/g, ' ')
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-start">
                    <span className="text-gray-500 font-medium">Payment Type:</span>
                    <span className="font-semibold text-right max-w-[65%] leading-tight">
                      {payment.is_recurring ? '🔄 Recurring' : '📅 One-time'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 pt-4 border-t border-gray-200">
                  <div
                    className="flex flex-wrap gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {payment.schedule_status === 'pending' && user?.role === 'user' && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancel(payment.id);
                        }}
                        className="flex-1 min-w-[80px]"
                      >
                        Cancel
                      </Button>
                    )}
                    {payment.schedule_status === 'processed' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/scheduled-payments/${payment.id}/executions`);
                        }}
                        className="flex-1 min-w-[80px]"
                      >
                        Executions
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block w-full overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('id')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>SR No.</span>
                        {getSortIcon('id')}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('company_name')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Company/Branch</span>
                        {getSortIcon('company_name')}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('vendor_name')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Vendor</span>
                        {getSortIcon('vendor_name')}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('scheduled_for')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Scheduled For</span>
                        {getSortIcon('scheduled_for')}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('payment_amount')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Amount</span>
                        {getSortIcon('payment_amount')}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('schedule_status')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Status</span>
                        {getSortIcon('schedule_status')}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment, index) => (
                    <tr
                      key={payment.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                      onClick={() => handleRowClick(payment.id)}
                    >
                      <td className="px-3 py-4 text-sm font-medium text-gray-900">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-600">
                        <div className="max-w-xs flex gap-1">
                          <div className="font-medium truncate flex items-center gap-2">
                            {payment.company_name}, {payment.company_branch}
                          </div>
                          <Tooltip content={
                            payment.urgency_level === 'high'
                              ? 'High Priority - Requires immediate attention and processing'
                              : payment.urgency_level === 'medium'
                                ? 'Medium Priority - Standard processing timeline'
                                : 'Low Priority - Routine processing, no urgency'
                          }>
                            <div
                              className={`p-1 rounded-full flex-shrink-0 ${payment.urgency_level === 'high'
                                  ? 'bg-red-100 text-red-800'
                                  : payment.urgency_level === 'medium'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-green-100 text-green-800'
                                }`}
                            >
                              {payment.urgency_level === 'high' ? (
                                <AlertTriangle className="h-4 w-4" />
                              ) : payment.urgency_level === 'medium' ? (
                                <Minus className="h-4 w-4" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                            </div>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate">
                          {payment.vendor_name}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">
                        {payment.schedule_status === 'processed' && payment.is_recurring && payment.next_execution 
                          ? format(new Date(payment.next_execution), 'dd/MM/yyyy')
                          : format(new Date(payment.scheduled_for), 'dd/MM/yyyy')
                        }
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500">
                        <div className="font-medium text-gray-900">
                          {payment.payment_amount.toLocaleString('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            maximumFractionDigits: 0,
                          })}
                        </div>
                        <div className="text-gray-500">
                          {payment.advance_details
                            ?.replace(/_/g, ' ')
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm">
                        <PaymentStatusBadge status={payment.schedule_status} />
                      </td>
                      <td className="px-3 py-4 text-sm font-medium">
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {payment.schedule_status === 'pending' && user?.role === 'user' && (
                            <Button
                              size="xs"
                              variant="danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCancel(payment.id);
                              }}
                            >
                              Cancel
                            </Button>
                          )}
                          {payment.schedule_status === 'processed' && (
                            <Button
                              size="xs"
                              variant="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/scheduled-payments/${payment.id}/executions`);
                              }}
                            >
                              Executions
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
              {/* Mobile Pagination - Previous/Next with page numbers */}
              <div className="flex flex-1 justify-between md:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium"
                >
                  Previous
                </Button>

                {/* Mobile Page Numbers */}
                <div className="flex items-center space-x-2">
                  {Array.from(
                    { length: totalPages },
                    (_, i) => i + 1
                  ).map((page) => {
                    // For mobile, show fewer pages to save space
                    const showPage =
                      page === 1 ||
                      page === totalPages ||
                      page === currentPage ||
                      (page >= currentPage - 1 && page <= currentPage + 1);

                    if (!showPage) {
                      // Show ellipsis for gaps (only one ellipsis per gap)
                      if (page === currentPage - 2 && currentPage > 3) {
                        return (
                          <span
                            key={page}
                            className="px-2 text-sm text-gray-500"
                          >
                            ...
                          </span>
                        );
                      }
                      if (
                        page === currentPage + 2 &&
                        currentPage < totalPages - 2
                      ) {
                        return (
                          <span
                            key={page}
                            className="px-2 text-sm text-gray-500"
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
                        onClick={() => onPageChange(page)}
                        className={`w-10 h-10 text-sm font-medium rounded-lg transition-colors ${page === currentPage
                            ? 'bg-primary-600 text-white shadow-md'
                            : 'text-gray-700 hover:bg-gray-100 border border-gray-300'
                          }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-medium"
                >
                  Next
                </Button>
              </div>

              {/* Desktop Pagination - Full pagination with page numbers */}
              <div className="hidden md:flex md:flex-1 md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-700 truncate">
                    Showing{' '}
                    <span className="font-medium">
                      {startIndex + 1}
                    </span>{' '}
                    to <span className="font-medium">{endIndex}</span>{' '}
                    of{' '}
                    <span className="font-medium">{totalCount}</span>{' '}
                    results
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <nav
                    className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                    aria-label="Pagination"
                  >
                    <button
                      onClick={() => onPageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>

                    {/* Page Numbers - Only shown on desktop */}
                    {Array.from(
                      { length: totalPages },
                      (_, i) => i + 1
                    ).map((page) => {
                      // Show first page, last page, current page, and pages around current page
                      const showPage =
                        page === 1 ||
                        page === totalPages ||
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
                          onClick={() => onPageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${page === currentPage
                            ? 'z-10 bg-primary-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'
                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                            }`}
                        >
                          {page}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => onPageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
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
  );
};

export default ScheduledPaymentsTable; 