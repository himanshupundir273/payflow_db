import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { usePaymentStore } from '../../store/paymentStore';
import { PaymentRequest } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { ArrowLeft, Clock, RefreshCw } from 'lucide-react';
import PaymentTable from '../../components/payments/PaymentTable';

const PostponedPaymentsPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const {
    payments,
    isLoading,
    syncPostponedPayments,
    pagination,
    sortOptions,
    searchTerm,
    setSearchTerm,
    fetchPayments,
  } = usePaymentStore();

  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch payments when component mounts
  useEffect(() => {
    const loadPayments = async () => {
      try {
        await fetchPayments();
      } catch (error) {
        console.error('Error fetching payments:', error);
      }
    };
    
    loadPayments();
  }, [fetchPayments]);

  // Get postponed payments directly from the payments array
  const postponedPayments = useMemo(() => {
    console.log('All payments:', payments);
    console.log('Payments with status postponed:', payments.filter(payment => payment.status === 'postponed'));
    return payments.filter(payment => payment.status === 'postponed');
  }, [payments]);

  // Filter postponed payments based on search term
  const filteredPostponedPayments = useMemo(() => {
    if (!localSearchTerm.trim()) return postponedPayments;
    
    const searchLower = localSearchTerm.toLowerCase();
    return postponedPayments.filter((payment: PaymentRequest) => 
      payment.vendorName.toLowerCase().includes(searchLower) ||
      payment.itemDescription.toLowerCase().includes(searchLower) ||
      payment.companyName.toLowerCase().includes(searchLower) ||
      payment.companyBranch.toLowerCase().includes(searchLower)
    );
  }, [postponedPayments, localSearchTerm]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncPostponedPayments();
    } catch (error) {
      console.error('Error syncing postponed payments:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleSearch = (searchTerm: string) => {
    setLocalSearchTerm(searchTerm);
  };

  const handlePageChange = (page: number) => {
    // Handle page change if needed
  };

  const handlePageSizeChange = (pageSize: number) => {
    // Handle page size change if needed
  };

  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    // Handle sorting if needed
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Postponed Payments</h1>
            <p className="text-sm text-gray-500">
              {postponedPayments.length} postponed payment{postponedPayments.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>
        
        <div className="mt-4 md:mt-0">
          <Button
            variant="secondary"
            onClick={handleSync}
            disabled={isSyncing}
            icon={isSyncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
          >
            {isSyncing ? 'Syncing...' : 'Sync & Reactivate'}
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="h-5 w-5 text-secondary-600" />
            <h3 className="text-lg font-medium text-gray-900">Postponed Payments Overview</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-secondary-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-secondary-600">Total Postponed</p>
              <p className="text-2xl font-bold text-secondary-900">{postponedPayments.length}</p>
            </div>
            
            <div className="bg-warning-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-warning-600">Ready to Reactivate</p>
              <p className="text-2xl font-bold text-warning-900">
                {postponedPayments.filter((p: PaymentRequest) => {
                  if (!p.postponeDate) return false;
                  const postponeDate = new Date(p.postponeDate);
                  const now = new Date();
                  return postponeDate <= now;
                }).length}
              </p>
            </div>
            
            <div className="bg-info-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-info-600">Still Postponed</p>
              <p className="text-2xl font-bold text-info-900">
                {postponedPayments.filter((p: PaymentRequest) => {
                  if (!p.postponeDate) return false;
                  const postponeDate = new Date(p.postponeDate);
                  const now = new Date();
                  return postponeDate > now;
                }).length}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search postponed payments..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {localSearchTerm && (
            <button
              onClick={() => setLocalSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
            )}
        </div>
        {localSearchTerm && (
          <p className="mt-2 text-sm text-gray-500">
            Showing {filteredPostponedPayments.length} of {postponedPayments.length} postponed payments
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading postponed payments...</p>
        </div>
      ) : postponedPayments.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No postponed payments found</p>
          <p className="text-sm text-gray-500 mt-2">
            {payments.length > 0 ? 'All payments have been processed or are in other statuses.' : 'No payments loaded yet.'}
          </p>
        </div>
      ) : (
        <PaymentTable
          payments={filteredPostponedPayments}
          isLoading={false}
          showActions={false}
                  serverPagination={{
            currentPage: pagination.page,
            pageSize: pagination.pageSize,
            totalCount: filteredPostponedPayments.length,
            totalPages: Math.ceil(filteredPostponedPayments.length / pagination.pageSize),
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange,
            sortField: sortOptions.field,
            sortDirection: sortOptions.direction,
            onSort: handleSort,
            searchTerm: localSearchTerm,
            onSearch: handleSearch,
          }}
        />
      )}
    </div>
  );
};

export default PostponedPaymentsPage;
