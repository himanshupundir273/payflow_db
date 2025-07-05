import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useScheduledPaymentsStore } from '../../store/scheduledPaymentsStore';
import { useAuthStore } from '../../store/authStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Tooltip from '../../components/ui/Tooltip';
import {
  ArrowLeft,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  History,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

const ScheduledPaymentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { fetchScheduledPaymentById, cancelScheduledPayment, isLoading } = useScheduledPaymentsStore();
  const [payment, setPayment] = useState<any>(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [subcategoryName, setSubcategoryName] = useState<string | null>(null);
  const [vendorDetails, setVendorDetails] = useState<{ isApproved: boolean } | null>(null);
  const [categoryDetails, setCategoryDetails] = useState<{ isApproved: boolean; name: string } | null>(null);
  const [subcategoryDetails, setSubcategoryDetails] = useState<{ isApproved: boolean; name: string } | null>(null);
  const [userNames, setUserNames] = useState<Record<string, { name: string; email: string }>>({});

  useEffect(() => {
    const loadPaymentDetails = async () => {
      if (!id) return;

      try {
        const paymentDetails = await fetchScheduledPaymentById(id);
        if (paymentDetails) {
          setPayment(paymentDetails);

          // Fetch user names for the additional details
          const userIds = [
            paymentDetails.quantity_checked_by,
            paymentDetails.quality_checked_by,
            paymentDetails.purchase_owner,
            paymentDetails.price_check_guaranteed_by
          ].filter(Boolean);

          if (userIds.length > 0) {
            const { data: users, error } = await supabase
              .from('users')
              .select('id, name, email')
              .in('id', userIds);

            if (!error && users) {
              const nameMap = users.reduce((acc, user) => ({
                ...acc,
                [user.id]: { name: user.name, email: user.email }
              }), {});
              setUserNames(nameMap);
            }
          }

          // Fetch vendor details
          if (paymentDetails.vendor_id) {
            const { data: vendor, error: vendorError } = await supabase
              .from('vendors')
              .select('status')
              .eq('id', paymentDetails.vendor_id)
              .single();

            if (!vendorError && vendor) {
              setVendorDetails({ isApproved: vendor.status === 'approved' });
            }
          }

          // Fetch category details
          if (paymentDetails.category_id) {
            const { data: category, error: categoryError } = await supabase
              .from('categories')
              .select('status, name')
              .eq('id', paymentDetails.category_id)
              .single();

            if (!categoryError && category) {
              setCategoryDetails({
                isApproved: category.status === 'approved',
                name: category.name
              });
              setCategoryName(category.name);
            }
          }

          // Fetch subcategory details
          if (paymentDetails.subcategory_id) {
            const { data: subcategory, error: subcategoryError } = await supabase
              .from('subcategories')
              .select('status, name')
              .eq('id', paymentDetails.subcategory_id)
              .single();

            if (!subcategoryError && subcategory) {
              setSubcategoryDetails({
                isApproved: subcategory.status === 'approved',
                name: subcategory.name
              });
              setSubcategoryName(subcategory.name);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching payment details:', error);
        toast.error('Failed to load payment details');
      }
    };

    loadPaymentDetails();
  }, [id, fetchScheduledPaymentById]);

  const handleCancel = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Cancel Scheduled Payment',
      message: 'Are you sure you want to cancel this scheduled payment? This action cannot be undone.',
      onConfirm: async () => {
        if (id) {
          await cancelScheduledPayment(id);
          navigate('/scheduled-payments');
        }
      },
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h1 className="text-xl font-medium text-gray-900 mb-2">
              Loading payment details...
            </h1>
            <p className="text-gray-500">
              Please wait while we fetch the payment information.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <div className="text-center py-6">
            <h1 className="text-xl font-medium text-gray-900 mb-2">
              Payment not found
            </h1>
            <p className="text-gray-500 mb-4">
              The requested payment could not be found.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate('/scheduled-payments')}
              icon={<ArrowLeft className="h-5 w-5" />}
            >
              Back to Scheduled Payments
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-3 sm:space-y-0">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/scheduled-payments')}
            icon={<ArrowLeft className="h-5 w-5" />}
            className="mr-2"
          >
            <span className="sm:inline hidden">Back</span>
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Scheduled Payment Details
          </h1>
        </div>
      </div>

      <Card className="animate-fade-in">
        <div className="pt-0 px-1 pb-1 sm:pt-0 sm:px-1.5 sm:pb-1.5">
          <div className="mb-6 border-b border-gray-100 pb-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary-600" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-tight break-words">
                      {payment.vendor_name}
                    </h2>
                    {payment.vendor_id && vendorDetails?.isApproved && (
                      <CheckCircle2 className="h-6 w-6 text-success-600" />
                    )}
                  </div>
                  {payment.urgency_level && (
                    <div className={`hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium shadow-sm ${
                      payment.urgency_level === 'high' 
                        ? 'bg-red-600 text-white' 
                        : payment.urgency_level === 'medium' 
                        ? 'bg-amber-500 text-white' 
                        : 'bg-emerald-600 text-white'
                    }`}>
                      <Clock className="h-3 w-3 mr-1" />
                      {payment.urgency_level === 'high' ? 'High Priority' : 
                       payment.urgency_level === 'medium' ? 'Medium Priority' : 
                       'Low Priority'}
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-0 space-y-2 sm:space-y-0">
                  <div className="flex flex-col sm:flex-row items-start gap-2">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(payment.schedule_status)}`}>
                      {payment.schedule_status.charAt(0).toUpperCase() + payment.schedule_status.slice(1)}
                    </span>
                    {payment.urgency_level && (
                      <div className={`sm:hidden inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium shadow-sm ${
                        payment.urgency_level === 'high' 
                          ? 'bg-red-600 text-white' 
                          : payment.urgency_level === 'medium' 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-emerald-600 text-white'
                      }`}>
                        <Clock className="h-3 w-3 mr-1" />
                        {payment.urgency_level === 'high' ? 'High Priority' : 
                         payment.urgency_level === 'medium' ? 'Medium Priority' : 
                         'Low Priority'}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className={`text-sm ${
                      payment.schedule_status === 'processed' 
                        ? 'text-green-600 font-semibold text-base'
                        : 'text-gray-500'
                    }`}>
                      {payment.schedule_status === 'processed' 
                        ? `Processed on ${format(new Date(payment.scheduled_for), 'dd MMM yyyy')}`
                        : `Scheduled for ${format(new Date(payment.scheduled_for), 'dd MMM yyyy')}`
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Item Description
            </h3>
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <p className="text-sm text-gray-900">
                {payment.item_description}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Payment Details
              </h3>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-2">
                <div className="flex flex-col sm:flex-row justify-between">
                  <span className="text-sm text-gray-500">Vendor Name:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {payment.vendor_name}
                    </span>
                    {payment.vendor_id && vendorDetails?.isApproved && (
                      <CheckCircle2 className="h-4 w-4 text-success-600" />
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-between">
                  <span className="text-sm text-gray-500">Category:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {categoryName || 'Not provided'}
                    </span>
                    {payment.category_id && categoryDetails?.isApproved && (
                      <CheckCircle2 className="h-4 w-4 text-success-600" />
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-between">
                  <span className="text-sm text-gray-500">Subcategory:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {subcategoryName || 'Not provided'}
                    </span>
                    {payment.subcategory_id && subcategoryDetails?.isApproved && (
                      <CheckCircle2 className="h-4 w-4 text-success-600" />
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-between">
                  <span className="text-sm text-gray-500">Company/Branch:</span>
                  <span className="text-sm font-medium">
                    {payment.company_name}
                    {payment.company_branch && `, ${payment.company_branch}`}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between">
                  <span className="text-sm text-gray-500">Total Outstanding:</span>
                  <span className="text-sm font-medium">
                    {(payment.total_outstanding || 0).toLocaleString('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between">
                  <span className="text-sm text-gray-500">Pay Against:</span>
                  <span className="text-sm font-medium capitalize">
                    {payment.advance_details?.replace('_', ' ') || 'Not specified'}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between">
                  <span className="text-sm text-gray-500">Bank Name:</span>
                  <span className="text-sm font-medium">
                    {payment.bank_name || 'Not specified'}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between">
                  <span className="text-sm text-gray-500">Payment Mode:</span>
                  <span className="text-sm font-medium capitalize">
                    {payment.payment_mode?.replace('_', ' ') || 'Net Banking'}
                  </span>
                </div>
                {payment.lpr && (
                  <div className="flex flex-col sm:flex-row justify-between">
                    <span className="text-sm text-gray-500">Last Purchase Rate (LPR):</span>
                    <span className="text-sm font-medium">{payment.lpr}</span>
                  </div>
                )}
                {payment.ioa && (
                  <div className="flex flex-col sm:flex-row justify-between">
                    <span className="text-sm text-gray-500">Internal Order Accounting (IOA):</span>
                    <span className="text-sm font-medium">{payment.ioa}</span>
                  </div>
                )}
                {payment.cpp && (
                  <div className="flex flex-col sm:flex-row justify-between">
                    <span className="text-sm text-gray-500">Credit Payment Period (CPP):</span>
                    <span className="text-sm font-medium">{payment.cpp} days</span>
                  </div>
                )}
                <div className="flex flex-col items-center sm:flex-row justify-between">
                  <span className="text-md text-gray-600 font-bold">Payment Amount:</span>
                  <span className="text-md font-bold">
                    {(payment.payment_amount || 0).toLocaleString('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between border-t pt-2 mt-1">
                  <span className="text-sm text-gray-500">Balance Amount:</span>
                  <span className="text-sm font-medium">
                    {(payment.balance_amount || 0).toLocaleString('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Schedule Information
              </h3>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-2">
                <div className="flex flex-col sm:flex-row justify-between">
                  <span className="text-sm text-gray-500">Scheduled For:</span>
                  <span className="text-sm font-medium">
                    {format(new Date(payment.scheduled_for), 'dd MMM yyyy')}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between">
                  <span className="text-sm text-gray-500">Status:</span>
                  <span className={`text-sm font-medium ${getStatusBadgeColor(payment.schedule_status)}`}>
                    {payment.schedule_status.charAt(0).toUpperCase() + payment.schedule_status.slice(1)}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between">
                  <span className="text-sm text-gray-500">Payment Type:</span>
                  <span className={`text-sm font-medium ${payment.is_recurring ? 'text-purple-600' : 'text-gray-900'}`}>
                    {payment.is_recurring ? '🔄 Recurring Payment' : '📅 One-time Payment'}
                  </span>
                </div>
                {payment.is_recurring && (
                  <>
                    <div className="flex flex-col sm:flex-row justify-between">
                      <span className="text-sm text-gray-500">Executions:</span>
                      <div className="flex items-center space-x-2">
                        {(payment.execution_count || 0) > 0 ? (
                          <Tooltip content="Click to view execution history">
                            <button
                              onClick={() => navigate(`/scheduled-payments/${id}/executions`)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-700 underline cursor-pointer"
                            >
                              {payment.execution_count || 0} completed
                            </button>
                          </Tooltip>
                        ) : (
                          <span className="text-sm font-medium">
                            {payment.execution_count || 0} completed
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between">
                      <span className="text-sm text-gray-500">Recurrence Type:</span>
                      <span className="text-sm font-medium capitalize">
                        {payment.recurrence_pattern?.replace('_', ' ') || 'Not specified'}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between">
                      <span className="text-sm text-gray-500">End Condition:</span>
                      <span className="text-sm font-medium capitalize">
                        {payment.recurrence_end_type === 'after' && payment.recurrence_end_after
                          ? `After ${payment.recurrence_end_after} payments`
                          : payment.recurrence_end_type === 'on' && payment.recurrence_end_date
                          ? `On ${format(new Date(payment.recurrence_end_date), 'dd MMM yyyy')}`
                          : payment.recurrence_end_type === 'never'
                          ? 'Never (Continuous)'
                          : 'Not specified'
                        }
                      </span>
                    </div>
                    {payment.last_execution_date && (
                      <div className="flex flex-col sm:flex-row justify-between">
                        <span className="text-sm text-gray-500">Last Executed:</span>
                        <span className="text-sm font-medium">
                          {format(new Date(payment.last_execution_date), 'dd MMM yyyy HH:mm')}
                        </span>
                      </div>
                    )}
                    {payment.next_execution && (payment.execution_count || 0) > 0 && (
                      <div className="flex flex-col sm:flex-row justify-between">
                        <span className="text-sm text-gray-500">Next Execution:</span>
                        <span className="text-sm font-medium">
                          {format(new Date(payment.next_execution), 'dd MMM yyyy')}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Additional Details Section */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <h3 className="text-base font-semibold text-gray-900">Additional Details</h3>
              <div className="h-px flex-1 bg-gray-200"></div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              {(payment.quantity_checked_by || payment.quality_checked_by || payment.purchase_owner || payment.price_check_guaranteed_by) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {payment.quantity_checked_by && (
                    <div className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-500 mb-1">Quantity Checked By</p>
                        <p className="text-base font-semibold text-gray-900 mb-0.5">
                          {userNames[payment.quantity_checked_by]?.name || 'Loading...'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {userNames[payment.quantity_checked_by]?.email || ''}
                        </p>
                      </div>
                    </div>
                  )}

                  {payment.quality_checked_by && (
                    <div className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-500 mb-1">Quality Checked By</p>
                        <p className="text-base font-semibold text-gray-900 mb-0.5">
                          {userNames[payment.quality_checked_by]?.name || 'Loading...'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {userNames[payment.quality_checked_by]?.email || ''}
                        </p>
                      </div>
                    </div>
                  )}

                  {payment.purchase_owner && (
                    <div className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-500 mb-1">Purchase Owner</p>
                        <p className="text-base font-semibold text-gray-900 mb-0.5">
                          {userNames[payment.purchase_owner]?.name || 'Loading...'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {userNames[payment.purchase_owner]?.email || ''}
                        </p>
                      </div>
                    </div>
                  )}

                  {payment.price_check_guaranteed_by && (
                    <div className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-500 mb-1">Price Check Guaranteed By</p>
                        <p className="text-base font-semibold text-gray-900 mb-0.5">
                          {userNames[payment.price_check_guaranteed_by]?.name || 'Loading...'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {userNames[payment.price_check_guaranteed_by]?.email || ''}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-white rounded-lg">
                  <p className="text-sm text-gray-500">No additional details available</p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex flex-col sm:flex-row justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Requested By</h3>
                <p className="text-sm mt-1">
                  {payment.requested_by?.name || 'Unknown'}
                </p>
                <p className="text-xs text-gray-500">
                  {payment.requested_by?.email || 'Email not available'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons Section */}
          {payment.schedule_status === 'pending' && user?.role === 'user' && (
            <div className="pt-4 mt-6">
              <div className="flex justify-end">
                <Button
                  variant="danger"
                  onClick={handleCancel}
                  className="w-full sm:w-auto"
                  icon={<X className="h-5 w-5" />}
                >
                  Cancel Payment
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })}
      />
    </div>
  );
};

export default ScheduledPaymentDetailsPage; 