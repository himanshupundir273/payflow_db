import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaymentRequest } from '../../types';
import { format } from 'date-fns';
import PaymentStatusBadge from './PaymentStatusBadge';
import { ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';
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
}

const PaymentTable: React.FC<PaymentTableProps> = ({
  payments,
  isLoading = false,
  showActions = false,
  onApprove,
  onReject,
  onProcess,
  onQuery,
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof PaymentRequest>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
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
  };
  const filteredPayments = payments
    .filter((payment) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        payment.vendorName.toLowerCase().includes(searchLower) ||
        payment.itemDescription.toLowerCase().includes(searchLower) ||
        payment.bills.some((bill) =>
          bill.billNumber.toLowerCase().includes(searchLower)
        ) ||
        payment.requestedBy.name.toLowerCase().includes(searchLower) ||
        payment.companyName.toLowerCase().includes(searchLower) ||
        payment.companyBranch.toLowerCase().includes(searchLower)
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

  if (filteredPayments.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
            <Search className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No payments found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm
              ? 'No payments match your search criteria'
              : 'No payments have been requested yet'}
          </p>
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
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Filter className="h-4 w-4" />
              <span>
                Showing {filteredPayments.length} of {payments.length} payments
              </span>
            </div>
          </div>
        </div>

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
                  {filteredPayments.map((payment) => (
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
                                    onClick={() => handleApprove(payment.id)}
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
