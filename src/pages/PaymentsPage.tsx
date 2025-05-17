import React, { useState } from 'react';
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
    approvePayment, 
    rejectPayment, 
    markAsProcessed, 
    raiseQuery,
    filterOptions,
    setFilterOptions
  } = usePaymentStore();
  const navigate = useNavigate();
  
  const [showFilters, setShowFilters] = useState(false);
  const [pageTitle, setPageTitle] = useState('Payment Requests');

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'processed', label: 'Processed' },
    { value: 'query_raised', label: 'Query Raised' }
  ];

  const handleApprove = async (id: string) => {
    if (!user) return;
    await approvePayment(id, user);
  };

  const handleReject = async (id: string) => {
    if (!user) return;
    await rejectPayment(id, user);
  };

  const handleProcess = async (id: string) => {
    await markAsProcessed(id);
  };

  const handleQuery = async (id: string, query: string) => {
    if (!user) return;
    await raiseQuery(id, user, query);
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
        status: currentStatuses.filter(s => s !== status)
      });
    } else {
      // Add the status if it's not selected
      setFilterOptions({
        ...filterOptions,
        status: [...currentStatuses, status]
      });
    }
  };

  const clearFilters = () => {
    setFilterOptions({
      status: [],
      dateRange: { start: null, end: null },
      vendor: null,
      company: null
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {filteredPayments.length} payments found
          </p>
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
              <label className="text-sm font-medium text-gray-700 block mb-2">Status</label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleStatusFilterChange(option.value)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      (option.value === 'all' && filterOptions.status.length === 0) ||
                      (option.value !== 'all' && filterOptions.status.includes(option.value))
                        ? 'bg-primary-100 text-primary-800'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                    {option.value !== 'all' && filterOptions.status.includes(option.value) && (
                      <span className="ml-2">✓</span>
                    )}
                  </button>
                ))}
              </div>
              {filterOptions.status.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Selected: {filterOptions.status.length} status{filterOptions.status.length !== 1 ? 'es' : ''}
                </p>
              )}
            </div>
            
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={clearFilters}
              >
                Clear All Filters
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      <PaymentTable
        payments={filteredPayments}
        isLoading={isLoading}
        showActions={user?.role === 'admin'}
        onApprove={handleApprove}
        onReject={handleReject}
        onProcess={handleProcess}
        onQuery={handleQuery}
      />
    </div>
  );
};

export default PaymentsPage;