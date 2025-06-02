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
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof PaymentRequest>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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

  const handleSort = (field: keyof PaymentRequest) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const filteredPayments = payments
    .filter((payment) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        payment.vendorName?.toLowerCase().includes(searchLower) ||
        payment.itemDescription?.toLowerCase().includes(searchLower) ||
        payment.bills?.some((bill) =>
          bill.billNumber?.toLowerCase().includes(searchLower)
        ) ||
        payment.requestedBy?.name?.toLowerCase().includes(searchLower) ||
        payment.companyName?.toLowerCase().includes(searchLower) ||
        payment.companyBranch?.toLowerCase().includes(searchLower) ||
        payment.serialNumber?.toString().includes(searchTerm) ||
        payment.status?.toLowerCase().includes(searchLower) ||
        payment.advanceDetails
          ?.replace(/_/g, ' ')
          .toLowerCase()
          .includes(searchLower)
      );
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
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

      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Pagination calculations
  const totalPages = Math.ceil(filteredPayments.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  // Reset to first page when search term changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
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
            <Input
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="h-5 w-5 text-gray-400" />}
              className="max-w-xs"
            />
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
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-500">entries</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Filter className="h-4 w-4" />
                <span>
                  Showing {filteredPayments.length > 0 ? startIndex + 1 : 0}-
                  {Math.min(endIndex, filteredPayments.length)} of{' '}
                  {filteredPayments.length} payments
                </span>
              </div>
            </div>
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No payments found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? 'No payments match your search criteria. Try adjusting your search term.'
                : 'No payments have been requested yet'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
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
            {totalPages > 1 && (
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
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">{startIndex + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(endIndex, filteredPayments.length)}
                      </span>{' '}
                      of{' '}
                      <span className="font-medium">
                        {filteredPayments.length}
                      </span>{' '}
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
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => {
                          // Show first page, last page, current page, and pages around current page
                          const showPage =
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 &&
                              page <= currentPage + 1);

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
                        }
                      )}

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
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
