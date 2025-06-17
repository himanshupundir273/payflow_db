import React, { useState, useEffect } from 'react';
import { usePaymentStore } from '../../store/paymentStore';
import { useAuthStore } from '../../store/authStore';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Plus, IndianRupee, Timer, ScaleIcon, X } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '../../lib/toast';
import { format } from 'date-fns';

const FundStats: React.FC = () => {
  const { user } = useAuthStore();
  const { dashboardStats, addFund, getFundStats } = usePaymentStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize fund stats when component mounts
  useEffect(() => {
    const initializeFundStats = async () => {
      try {
        await getFundStats();
      } catch (error) {
        // Just log the error, don't show any toast
        console.error('Error initializing fund stats:', error);
      }
    };
    initializeFundStats();
  }, []);

  const handleAddFund = async () => {
    if (!fundAmount || isNaN(parseFloat(fundAmount.replace(/,/g, '')))) return;

    try {
      setIsLoading(true);
      const amount = parseFloat(fundAmount.replace(/,/g, ''));
      await addFund(amount);
      // No need to await getFundStats since it's already called in addFund
      showSuccessToast(`Successfully added ₹${amount.toLocaleString('en-IN')} to funds`);
      setFundAmount('');
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error adding fund:', error);
      showErrorToast(error?.message || 'Failed to add fund. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Format currency in Indian Rupees
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });
  };

  // Format number with commas
  const formatNumber = (value: string) => {
    const number = value.replace(/[^\d]/g, '');
    if (!number) return '';
    return Number(number).toLocaleString('en-IN');
  };

  const handleFundAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFundAmount(formatNumber(value));
  };

  // Add function to get cycle date range
  const getCycleDateRange = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      start: format(now, 'dd MMM'),
      end: format(tomorrow, 'dd MMM')
    };
  };

  const dateRange = getCycleDateRange();

  return (
    <>
      <div className="mb-4 space-y-4 lg:space-y-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Total Fund Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 mb-1">Total Fund</span>
                  {user?.role === 'accounts' && (
                    <button
                      onClick={() => setIsDialogOpen(true)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      title="Add Fund"
                    >
                      <Plus className="w-4 h-4 text-blue-500" />
                    </button>
                  )}
                </div>
                <span className="text-2xl font-semibold">
                  {formatCurrency(dashboardStats?.totalFundAvailable || 0)}
                </span>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <IndianRupee className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          {/* To Initiate Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 mb-1">Total Payments ({dateRange.start} - {dateRange.end})</span>
                <span className="text-2xl font-semibold">
                  {formatCurrency(dashboardStats?.totalPaymentToInitiate || 0)}
                </span>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <Timer className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Net Available Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 mb-1">Net Available</span>
                <span className={`text-2xl font-semibold ${(dashboardStats?.netFundAvailable || 0) > 0 ? 'text-green-600' : 'text-error-600'}`}>
                  {formatCurrency(dashboardStats?.netFundAvailable || 0)}
                </span>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <ScaleIcon className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Fund Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4 shadow-xl transform transition-all">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <IndianRupee className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Add Fund</h3>
              </div>
              <button
                onClick={() => {
                  setIsDialogOpen(false);
                  setFundAmount('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <Input
                    id="amount"
                    type="text"
                    value={fundAmount}
                    onChange={handleFundAmountChange}
                    placeholder="Enter amount"
                    className="pl-8 w-full h-11 text-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setFundAmount('');
                  }}
                  disabled={isLoading}
                  className="h-11"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAddFund}
                  disabled={!fundAmount || isLoading}
                  className="h-11 px-6"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Adding...</span>
                    </div>
                  ) : (
                    'Add Fund'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FundStats; 