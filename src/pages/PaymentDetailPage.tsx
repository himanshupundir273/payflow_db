import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePaymentStore } from '../store/paymentStore';
import { PaymentRequest } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import {
  ArrowLeft,
  FileCheck,
  FileX,
  CheckCircle2,
  FileText,
  Edit,
  AlertCircle,
  File,
  Building2,
  Calendar,
  ClipboardCheck,
  ShieldCheck,
  UserCheck,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  QuoteIcon,
} from 'lucide-react';
import PaymentStatusBadge from '../components/payments/PaymentStatusBadge';
import QueryDialog from '../components/payments/QueryDialog';
import AccountsQueryDialog from '../components/payments/AccountsQueryDialog';
import ProcessPaymentDialog from '../components/payments/ProcessPaymentDialog';
import ApprovePaymentDialog from '../components/payments/ApprovePaymentDialog';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { toast } from 'react-hot-toast';

const PaymentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    fetchPaymentById,
    approvePayment,
    rejectPayment,
    markAsProcessed,
    raiseQuery,
    raiseAccountsQuery,
    updatePayment,
    markInvoiceReceived,
    isLoading,
    payments,
    fetchPayments,
    filterOptions,
    fetchDashboardPayments,
    setFilterOptions,
  } = usePaymentStore();

  // Get navigation state from URL
  const showNavigation = searchParams.get('nav') === 'true';
  const source = searchParams.get('source');

  // Local state for the current payment details
  const [payment, setPayment] = useState<PaymentRequest | null>(null);
  const [isQueryDialogOpen, setIsQueryDialogOpen] = useState(false);
  const [isAccountsQueryDialogOpen, setIsAccountsQueryDialogOpen] = useState(false);
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoadingPayment, setIsLoadingPayment] = useState(true);
  const [userNames, setUserNames] = useState<Record<string, { name: string; email: string }>>({});
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [subcategoryName, setSubcategoryName] = useState<string | null>(null);
  const [vendorDetails, setVendorDetails] = useState<{ isApproved: boolean } | null>(null);
  const [categoryDetails, setCategoryDetails] = useState<{ isApproved: boolean; name: string } | null>(null);
  const [subcategoryDetails, setSubcategoryDetails] = useState<{ isApproved: boolean; name: string } | null>(null);
  const [currentPaymentIndex, setCurrentPaymentIndex] = useState<number>(-1);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);

  // Find current payment index when payment or payments list changes
  useEffect(() => {
    if (payment && payments.length > 0) {
      const index = payments.findIndex(p => p.id === payment.id);
      setCurrentPaymentIndex(index);
    }
  }, [payment, payments]);

  const handlePrevious = () => {
    if (currentPaymentIndex > 0) {
      const prevPayment = payments[currentPaymentIndex - 1];
      navigate(`/payments/${prevPayment.id}?nav=true&source=${source}`);
    }
  };

  const handleNext = () => {
    if (currentPaymentIndex < payments.length - 1) {
      const nextPayment = payments[currentPaymentIndex + 1];
      navigate(`/payments/${nextPayment.id}?nav=true&source=${source}`);
    }
  };

  // Fetch payment details when component mounts or id changes
  useEffect(() => {
    const loadPaymentDetails = async () => {
      if (!id) return;

      setIsLoadingPayment(true);
      try {
        const paymentDetails = await fetchPaymentById(id);
        console.log('Payment Details:', paymentDetails); // Debug log

        if (paymentDetails) {
          // Fetch bills data
          const { data: billsData, error: billsError } = await supabase
            .from('bills')
            .select('*')
            .eq('payment_id', id);

          if (billsError) {
            console.error('Error fetching bills:', billsError);
          } else {
            // Transform snake_case to camelCase
            const transformedBills = billsData?.map(bill => ({
              id: bill.id,
              billNumber: bill.bill_number,
              billDate: bill.bill_date,
              createdAt: bill.created_at,
              updatedAt: bill.updated_at
            })) || [];
            // Update payment details with bills data
            paymentDetails.bills = transformedBills;
          }

          setPayment(paymentDetails);
        }

        // Fetch user names for the additional details
        if (paymentDetails) {
          const userIds = [
            paymentDetails.quantityCheckedBy,
            paymentDetails.qualityCheckedBy,
            paymentDetails.purchaseOwner,
            paymentDetails.priceCheckGuaranteedBy
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
          if (paymentDetails.vendorId) {
            const { data: vendor, error: vendorError } = await supabase
              .from('vendors')
              .select('status')
              .eq('id', paymentDetails.vendorId)
              .single();

            if (!vendorError && vendor) {
              console.log('Vendor Details:', {
                id: paymentDetails.vendorId,
                status: vendor.status
              });
              setVendorDetails({ isApproved: vendor.status === 'approved' });
            }
          }

          // Fetch category details
          if (paymentDetails.categoryId) {
            const { data: category, error: categoryError } = await supabase
              .from('categories')
              .select('status, name')
              .eq('id', paymentDetails.categoryId)
              .single();

            if (!categoryError && category) {
              console.log('Category Details:', {
                id: paymentDetails.categoryId,
                name: category.name,
                status: category.status
              });
              setCategoryDetails({
                isApproved: category.status === 'approved',
                name: category.name
              });
              setCategoryName(category.name);
            }
          }

          // Fetch subcategory details
          if (paymentDetails.subcategoryId) {
            const { data: subcategory, error: subcategoryError } = await supabase
              .from('subcategories')
              .select('status, name')
              .eq('id', paymentDetails.subcategoryId)
              .single();

            if (!subcategoryError && subcategory) {
              console.log('Subcategory Details:', {
                id: paymentDetails.subcategoryId,
                name: subcategory.name,
                status: subcategory.status
              });
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
      } finally {
        setIsLoadingPayment(false);
      }
    };

    loadPaymentDetails();
  }, [id, fetchPaymentById]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Retry fetching signed URLs when back online
      if (payment?.attachments) {
        fetchSignedUrls();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error(
        'No internet connection. Please check your connection and try again.'
      );
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [payment?.attachments]);

  const fetchSignedUrls = async () => {
    if (!payment?.attachments || !isOnline) return;

    const urls: Record<string, string> = {};
    for (const attachment of payment.attachments) {
      if (attachment.fileUrl) {
        try {
          const { data, error } = await supabase.storage
            .from('attachments')
            .createSignedUrl(attachment.fileUrl, 3600); // URL expires in 1 hour

          if (!error && data?.signedUrl) {
            // Convert the signed URL to the correct format
            const signedUrl = `${import.meta.env.VITE_SUPABASE_URL
              }/storage/v1/object/sign/attachments/${attachment.fileUrl}?token=${data.signedUrl.split('token=')[1]
              }`;
            urls[attachment.id] = signedUrl;
          }
        } catch (error) {
          console.error(
            `Error generating signed URL for attachment ${attachment.id}:`,
            error
          );
          // Continue with other attachments even if one fails
        }
      }
    }
    setSignedUrls(urls);
  };

  useEffect(() => {
    fetchSignedUrls();
  }, [payment?.attachments, isOnline]);

  const fetchCategoryDetails = async (categoryId: string) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          added_by_user:users(name)
        `)
        .eq('id', categoryId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching category details:', err);
      return null;
    }
  };

  if (isLoadingPayment) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-1 py-8">
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-1 py-8">
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
              onClick={() => navigate('/payments')}
              icon={<ArrowLeft className="h-5 w-5" />}
            >
              Back to Payments
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const handleApprove = () => {
    setIsApproveDialogOpen(true);
  };

  const handleApproveSubmit = async (paymentAmount: number, reason: string) => {
    if (!user || !payment) return;
    await approvePayment(payment.id, user, paymentAmount, reason);
    setIsApproveDialogOpen(false);
    // Refresh payments list and get the response
    const response = await fetchPayments(1, 10, true, filterOptions);
    // If we're in navigation mode and there are no more payments, go to payments page
    if (showNavigation && (!response?.payments || response.payments.length === 0)) {
      // Clear all filters and navigate to payments page
      setFilterOptions({
        status: ['pending', 'approved', 'rejected', 'processed', 'query_raised'],
        dateRange: { start: null, end: null },
        vendor: null,
        company: null,
        companyList: null,
        overdueInvoices: false,
        hasAccountsQuery: false,
      });
      navigate('/payments');
      return;
    }
    // If we're in navigation mode and there are more payments, go to next
    if (showNavigation && response?.payments && response.payments.length > 0) {
      const nextPayment = response.payments[0]; // Get the first payment from the updated list
      navigate(`/payments/${nextPayment.id}?nav=true`);
    } else {
      navigate(-1);
    }
  };

  const handleReject = async () => {
    if (!user || !payment) return;
    await rejectPayment(payment.id, user);
    // Refresh payments list and get the response
    const response = await fetchPayments(1, 10, true, filterOptions);
    // If we're in navigation mode and there are no more payments, go to payments page
    if (showNavigation && (!response?.payments || response.payments.length === 0)) {
      // Clear all filters and navigate to payments page
      setFilterOptions({
        status: ['pending', 'approved', 'rejected', 'processed', 'query_raised'],
        dateRange: { start: null, end: null },
        vendor: null,
        company: null,
        companyList: null,
        overdueInvoices: false,
        hasAccountsQuery: false,
      });
      navigate('/payments');
      return;
    }
    // If we're in navigation mode and there are more payments, go to next
    if (showNavigation && response?.payments && response.payments.length > 0) {
      const nextPayment = response.payments[0]; // Get the first payment from the updated list
      navigate(`/payments/${nextPayment.id}?nav=true`);
    } else {
      navigate(-1);
    }
  };

  const handleProcess = async () => {
    setIsProcessDialogOpen(true);
  };

  const handleProcessSubmit = async (invoiceReceived: 'yes' | 'no', paymentAmount: number, reason: string) => {
    if (!payment) return;
    await markAsProcessed(payment.id, invoiceReceived, paymentAmount, reason);
    setIsProcessDialogOpen(false);
    // Refresh payments list and get the response
    const response = await fetchPayments(1, 10, true, filterOptions);
    // If we're in navigation mode and there are no more payments, go to payments page
    if (showNavigation && (!response?.payments || response.payments.length === 0)) {
      // Clear all filters and navigate to payments page
      setFilterOptions({
        status: ['pending', 'approved', 'rejected', 'processed', 'query_raised'],
        dateRange: { start: null, end: null },
        vendor: null,
        company: null,
        companyList: null,
        overdueInvoices: false,
        hasAccountsQuery: false,
      });
      navigate('/payments');
      return;
    }
    // If we're in navigation mode and there are more payments, go to next
    if (showNavigation && response?.payments && response.payments.length > 0) {
      const nextPayment = response.payments[0]; // Get the first payment from the updated list
      navigate(`/payments/${nextPayment.id}?nav=true`);
    } else {
      navigate(-1);
    }
  };

  const handleQuery = () => {
    setIsQueryDialogOpen(true);
  };

  const handleQuerySubmit = async (query: string) => {
    if (!user || !payment) return;
    await raiseQuery(payment.id, user, query);
    setIsQueryDialogOpen(false);
    // Refresh payments list and get the response
    const response = await fetchPayments(1, 10, true, filterOptions);
    // If we're in navigation mode and there are no more payments, go to payments page
    if (showNavigation && (!response?.payments || response.payments.length === 0)) {
      // Clear all filters and navigate to payments page
      setFilterOptions({
        status: ['pending', 'approved', 'rejected', 'processed', 'query_raised'],
        dateRange: { start: null, end: null },
        vendor: null,
        company: null,
        companyList: null,
        overdueInvoices: false,
        hasAccountsQuery: false,
      });
      navigate('/payments');
      return;
    }
    // If we're in navigation mode and there are more payments, go to next
    if (showNavigation && response?.payments && response.payments.length > 0) {
      const nextPayment = response.payments[0]; // Get the first payment from the updated list
      navigate(`/payments/${nextPayment.id}?nav=true`);
    } else {
      navigate(-1);
    }
  };

  const handleAccountsQuery = () => {
    setIsAccountsQueryDialogOpen(true);
  };

  const handleAccountsQuerySubmit = async (query: string) => {
    if (!user || !payment) return;
    await raiseAccountsQuery(payment.id, user, query);
    setIsAccountsQueryDialogOpen(false);
    // Refresh payments list and get the response
    const response = await fetchPayments(1, 10, true, filterOptions);
    // If we're in navigation mode and there are no more payments, go to payments page
    if (showNavigation && (!response?.payments || response.payments.length === 0)) {
      // Clear all filters and navigate to payments page
      setFilterOptions({
        status: ['pending', 'approved', 'rejected', 'processed', 'query_raised'],
        dateRange: { start: null, end: null },
        vendor: null,
        company: null,
        companyList: null,
        overdueInvoices: false,
        hasAccountsQuery: false,
      });
      navigate('/payments');
      return;
    }
    // If we're in navigation mode and there are more payments, go to next
    if (showNavigation && response?.payments && response.payments.length > 0) {
      const nextPayment = response.payments[0]; // Get the first payment from the updated list
      navigate(`/payments/${nextPayment.id}?nav=true`);
    } else {
      navigate(-1);
    }
  };

  const handleUpdate = async () => {
    if (!payment) return;
    await updatePayment(payment.id, {
      ...payment,
      status: 'pending',
    });
    setIsEditing(false);
    if (showNavigation && currentPaymentIndex < payments.length - 1) {
      const nextPayment = payments[currentPaymentIndex + 1];
      navigate(`/payments/${nextPayment.id}?nav=true`);
    } else {
      navigate(-1);
    }
  };

  const handleMarkInvoiceReceived = async () => {
    if (!payment) return;
    if (
      window.confirm('Are you sure you want to mark this invoice as received?')
    ) {
      const success = await markInvoiceReceived(payment.id);
      if (success) {
        toast.success('Invoice marked as received successfully');
        if (showNavigation && currentPaymentIndex < payments.length - 1) {
          const nextPayment = payments[currentPaymentIndex + 1];
          navigate(`/payments/${nextPayment.id}?nav=true`);
        } else {
          navigate(-1);
        }
      } else {
        toast.error('Failed to mark invoice as received');
      }
    }
  };

  const handleVerify = async () => {
    if (!payment) return;
    try {
      const { data, error } = await supabase
        .from('payments')
        .update({ accounts_verification_status: 'verified' })
        .eq('id', payment.id);

      if (error) throw error;

      toast.success('Payment verified successfully');
      if (showNavigation && currentPaymentIndex < payments.length - 1) {
        const nextPayment = payments[currentPaymentIndex + 1];
        navigate(`/payments/${nextPayment.id}?nav=true`);
      } else {
        navigate(-1);
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error('Failed to verify payment');
    }
  };

  const handleEdit = () => {
    if (!payment) return;

    // Convert the payment data to match the form's initial values structure
    const formData = {
      vendorName: payment.vendorName,
      vendorId: payment.vendorId,
      accountNumber: '', // For display only
      ifscCode: '', // For display only
      totalOutstanding: payment.totalOutstanding.toString(),
      advanceDetails: payment.advanceDetails,
      paymentAmount: payment.paymentAmount.toString(),
      itemDescription: payment.itemDescription,
      bills: payment.bills.map((bill) => ({
        billNumber: bill.billNumber,
        billDate: format(new Date(bill.billDate), 'yyyy-MM-dd'),
      })),
      companyName: payment.companyName,
      companyBranch: payment.companyBranch,
      bankName: payment.bankName,
      paymentMode: payment.paymentMode || 'net_banking',
      lpr: payment.lpr || '',
      ioa: payment.ioa || '',
      cpp: payment.cpp || '',
      categoryId: payment.categoryId || '',
      subcategoryId: payment.subcategoryId || '',
      quantityCheckedBy: payment.quantityCheckedBy || '',
      qualityCheckedBy: payment.qualityCheckedBy || '',
      purchaseOwner: payment.purchaseOwner || '',
      priceCheckGuaranteedBy: payment.priceCheckGuaranteedBy || '',
      attachments: payment.attachments.map((attachment) => ({
        id: attachment.id,
        description: attachment.description,
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        fileSize: attachment.fileSize,
        fileUrl: attachment.fileUrl,
        file: undefined, // Explicitly set file to undefined for existing attachments
      })),
    };

    // Store the form data in localStorage
    localStorage.setItem('editingPaymentData', JSON.stringify(formData));

    // Navigate to the edit payment form
    navigate(`/payments/${payment.id}/edit`);
  };

  const getFileType = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) {
      return 'image';
    } else if (['pdf'].includes(extension || '')) {
      return 'pdf';
    } else if (['doc', 'docx'].includes(extension || '')) {
      return 'document';
    }
    return 'unknown';
  };

  const handleFileView = async (attachment: any) => {
    if (!isOnline) {
      toast.error(
        'No internet connection. Please check your connection and try again.'
      );
      return;
    }

    if (!signedUrls[attachment.id]) {
      toast.error(
        'File URL is not available. Please try again later.'
      );
      return;
    }

    try {
      const response = await fetch(signedUrls[attachment.id]);
      if (!response.ok) {
        toast.error('File not found. Please try again later.');
        return;
      }

      // Check if running on web or mobile
      if (Capacitor.getPlatform() === 'web') {
        // For web, open in new tab
        window.open(signedUrls[attachment.id], '_blank');
      } else {
        // For mobile app, use the existing file viewer
        const fileType = getFileType(attachment.fileName || '');
        navigate('/file-viewer', {
          state: {
            url: signedUrls[attachment.id],
            type: fileType,
            fileName: attachment.fileName,
            paymentId: id,
          },
        });
      }
    } catch (error) {
      console.error('Error accessing file:', error);
      toast.error('Error accessing file. Please try again later.');
    }
  };

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-3 sm:space-y-0">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (source) {
                  navigate(source);
                } else {
                  navigate(-1)
                }
              }}
              icon={<ArrowLeft className="h-5 w-5" />}
              className="mr-2"
            >
              <span className="sm:inline hidden">Back</span>
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {payment.status === 'query_raised'
                ? 'Update Payment'
                : 'Payment Details'}
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            {showNavigation && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentPaymentIndex <= 0}
                  icon={<ChevronLeft className="h-5 w-5" />}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-500">
                  {currentPaymentIndex + 1} of {payments.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentPaymentIndex >= payments.length - 1}
                  icon={<ChevronRight className="h-5 w-5" />}
                >
                  Next
                </Button>
              </>
            )}
            {(payment.status === 'query_raised' ||
              payment.status === 'pending')
              && user?.role === 'user' && (
                <Button
                  variant="primary"
                  onClick={handleEdit}
                  icon={<Edit className="h-5 w-5" />}
                  className="w-full sm:w-auto"
                >
                  Edit Payment
                </Button>
              )}
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
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-tight break-words">
                    {payment.vendorName || 'Vendor Name Not Provided'}
                    {payment.vendorId && vendorDetails?.isApproved && (
                      <CheckCircle2 className="inline-block h-6 w-6 text-success-600 ml-2" />
                    )}
                  </h2>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-0 space-y-2 sm:space-y-0">
                    <div className="flex flex-col sm:flex-row items-start gap-2">
                      <PaymentStatusBadge status={payment.status} />
                      {(payment?.accountsVerificationStatus === 'verified' &&
                        !['query_raised', 'rejected'].includes(payment.status)) && (
                          <PaymentStatusBadge status="accounts_approved" />
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {format(new Date(payment.date), 'MMM d, yyyy')}
                      </span>
                      <Calendar className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Show processed date prominently for processed payments */}
            {payment.status === 'processed' && (
              <div className="mb-2 p-3 sm:p-4 bg-success-50 rounded-lg border border-success-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-success-600" />
                    <span className="text-sm sm:text-base font-medium text-success-800">
                      Payment Processed
                    </span>
                  </div>
                  <span className="text-sm sm:text-base text-success-700 font-medium">
                    {format(new Date(payment.updatedAt), 'dd MMM yyyy')}
                  </span>
                </div>
              </div>
            )}

            {payment.status === 'query_raised' && payment.queryDetails && (
              <div className="mb-6 p-4 bg-warning-50 rounded-lg border border-warning-200">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-warning-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-warning-800 mb-1">
                      Query Details
                    </h3>
                    <p className="text-sm text-warning-700">
                      {payment.queryDetails}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {payment.status === 'approved' && payment.accountsQuery && (
              <div className="mb-6 p-4 bg-warning-50 rounded-lg border border-warning-200">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-warning-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-warning-800 mb-1">
                      Accounts Query
                    </h3>
                    <p className="text-sm text-warning-700">
                      {payment.accountsQuery}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Item Description
              </h3>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <p className="text-sm text-gray-900">
                  {payment.itemDescription || 'No description provided'}
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
                        {payment.vendorName || 'Not provided'}
                      </span>
                      {payment.vendorId && vendorDetails?.isApproved && (
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
                      {payment.categoryId && categoryDetails?.isApproved && (
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
                      {payment.subcategoryId && subcategoryDetails?.isApproved && (
                        <CheckCircle2 className="h-4 w-4 text-success-600" />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between">
                    <span className="text-sm text-gray-500">Company/Branch:</span>
                    <span className="text-sm font-medium">
                      {payment.companyName}, {payment.companyBranch}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between">
                    <span className="text-sm text-gray-500">Total Outstanding:</span>
                    <span className="text-sm font-medium">
                      {(payment.totalOutstanding || 0).toLocaleString('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between">
                    <span className="text-sm text-gray-500">Pay Against:</span>
                    <span className="text-sm font-medium capitalize">
                      {payment.advanceDetails?.replace('_', ' ') ||
                        'Not specified'}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between">
                    <span className="text-sm text-gray-500">Bank Name:</span>
                    <span className="text-sm font-medium">
                      {payment.bankName || 'Not specified'}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between">
                    <span className="text-sm text-gray-500">Payment Mode:</span>
                    <span className="text-sm font-medium capitalize">
                      {payment.paymentMode?.replace('_', ' ') || 'Net Banking'}
                    </span>
                  </div>
                  {/* Optional fields - only show if they have values */}
                  {payment.lpr && (
                    <div className="flex flex-col sm:flex-row justify-between">
                      <span className="text-sm text-gray-500">
                        Last Purchase Rate (LPR):
                      </span>
                      <span className="text-sm font-medium">{payment.lpr}</span>
                    </div>
                  )}
                  {payment.ioa && (
                    <div className="flex flex-col sm:flex-row justify-between">
                      <span className="text-sm text-gray-500">
                        Internal Order Accounting (IOA):
                      </span>
                      <span className="text-sm font-medium">{payment.ioa}</span>
                    </div>
                  )}
                  {payment.cpp && (
                    <div className="flex flex-col sm:flex-row justify-between">
                      <span className="text-sm text-gray-500">
                        Credit Payment Period (CPP):
                      </span>
                      <span className="text-sm font-medium">
                        {payment.cpp} days
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col items-center sm:flex-row justify-between">
                    <span className="text-md text-gray-600 font-bold">
                      Payment Amount:
                    </span>
                    <span className="text-md font-bold">
                      {(payment.paymentAmount || 0).toLocaleString('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  {payment.amountChangeReason && (
                    <div className="flex flex-col sm:flex-row justify-between border-t pt-2 mt-1">
                      <span className="text-sm text-gray-500">
                        Amount Change Reason:
                      </span>
                      <span className="text-sm font-medium">
                        {payment.amountChangeReason}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row justify-between border-t pt-2 mt-1">
                    <span className="text-sm text-gray-500">
                      Balance Amount:
                    </span>
                    <span className="text-sm font-medium">
                      {(payment.balanceAmount || 0).toLocaleString('en-IN', {
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
                  Bill Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-4">
                  {payment.bills && payment.bills.length > 0 ? (
                    payment.bills.map((bill, index) => (
                      <div key={bill.id || index} className="space-y-3">
                        {index > 0 && (
                          <div className="border-t border-gray-200 pt-3"></div>
                        )}
                        <div className="space-y-2">
                          <div className="flex flex-col sm:flex-row justify-between">
                            <span className="text-sm text-gray-500">
                              Bill Number:
                            </span>
                            <span className="text-sm font-medium">
                              {bill.billNumber || 'Not provided'}
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row justify-between">
                            <span className="text-sm text-gray-500">
                              Bill Date:
                            </span>
                            <span className="text-sm font-medium">
                              {bill.billDate
                                ? format(
                                  new Date(bill.billDate),
                                  'dd MMM yyyy'
                                )
                                : 'Not specified'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No bills available</p>
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
                {(payment.quantityCheckedBy || payment.qualityCheckedBy || payment.purchaseOwner || payment.priceCheckGuaranteedBy) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {payment.quantityCheckedBy && (
                      <div className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-500 mb-1">Quantity Checked By</p>
                          <p className="text-base font-semibold text-gray-900 mb-0.5">
                            {userNames[payment.quantityCheckedBy]?.name || 'Loading...'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {userNames[payment.quantityCheckedBy]?.email || ''}
                          </p>
                        </div>
                      </div>
                    )}

                    {payment.qualityCheckedBy && (
                      <div className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-500 mb-1">Quality Checked By</p>
                          <p className="text-base font-semibold text-gray-900 mb-0.5">
                            {userNames[payment.qualityCheckedBy]?.name || 'Loading...'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {userNames[payment.qualityCheckedBy]?.email || ''}
                          </p>
                        </div>
                      </div>
                    )}

                    {payment.purchaseOwner && (
                      <div className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-500 mb-1">Purchase Owner</p>
                          <p className="text-base font-semibold text-gray-900 mb-0.5">
                            {userNames[payment.purchaseOwner]?.name || 'Loading...'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {userNames[payment.purchaseOwner]?.email || ''}
                          </p>
                        </div>
                      </div>
                    )}

                    {payment.priceCheckGuaranteedBy && (
                      <div className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-500 mb-1">Price Check Guaranteed By</p>
                          <p className="text-base font-semibold text-gray-900 mb-0.5">
                            {userNames[payment.priceCheckGuaranteedBy]?.name || 'Loading...'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {userNames[payment.priceCheckGuaranteedBy]?.email || ''}
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

            {/* Attachments Section */}
            {payment.attachments && payment.attachments.length > 0 ? (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Attachments
                </h3>
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-4">
                  {payment.attachments.map((attachment, index) => (
                    <div key={attachment.id || index} className="space-y-3">
                      {index > 0 && (
                        <div className="border-t border-gray-200 pt-3"></div>
                      )}
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row justify-between">
                          <div className="flex items-center space-x-2">
                            <File className="h-5 w-5 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {attachment.fileName || 'No file attached'}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {attachment.fileSize
                              ? `${Math.round(attachment.fileSize / 1024)} KB`
                              : 'Size unknown'}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-between">
                          <span className="text-sm text-gray-500">
                            Description:
                          </span>
                          <span className="text-sm font-medium">
                            {attachment.description || 'No description'}
                          </span>
                        </div>
                        {attachment.fileUrl && signedUrls[attachment.id] && (
                          <div className="flex justify-end">
                            <button
                              className="text-sm text-primary-600 hover:text-primary-700"
                              onClick={() => handleFileView(attachment)}
                            >
                              View File
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Attachments
                </h3>
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <p className="text-sm text-gray-500">
                    No attachments available
                  </p>
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-4">
              <div className="flex flex-col sm:flex-row justify-between mb-4 space-y-4 sm:space-y-0">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Requested By
                  </h3>
                  <p className="text-sm mt-1">
                    {payment.requestedBy?.name || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {payment.requestedBy?.email || 'Email not available'}
                  </p>
                </div>

                {payment.approvedBy && (
                  <div className="text-left sm:text-right">
                    <h3 className="text-sm font-medium text-gray-500">
                      {payment.status === 'rejected'
                        ? 'Rejected By'
                        : 'Approved By'}
                    </h3>
                    <p className="text-sm mt-1">
                      {payment.approvedBy.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {payment.approvedBy.email || 'Email not available'}
                    </p>
                  </div>
                )}
              </div>

              {/* Admin actions */}
              {user?.role === 'admin' && payment.status === 'pending' && (
                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                  <Button
                    variant="danger"
                    icon={<FileX className="h-5 w-5" />}
                    onClick={handleReject}
                    className="w-full sm:w-auto"
                  >
                    Reject
                  </Button>
                  <Button
                    variant="warning"
                    icon={<FileText className="h-5 w-5" />}
                    onClick={handleQuery}
                    className="w-full sm:w-auto"
                  >
                    Query
                  </Button>
                  <Button
                    variant="success"
                    icon={<FileCheck className="h-5 w-5" />}
                    onClick={handleApprove}
                    className="w-full sm:w-auto"
                  >
                    Approve
                  </Button>
                </div>
              )}

              {/* Accounts actions */}
              {user?.role === 'accounts' && payment.status === 'approved' && (
                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                  <Button
                    variant="warning"
                    icon={<FileText className="h-5 w-5" />}
                    onClick={handleAccountsQuery}
                    className="w-full sm:w-auto"
                  >
                    Query
                  </Button>
                  <Button
                    variant="primary"
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    onClick={handleProcess}
                    className="w-full sm:w-auto"
                  >
                    Mark as Processed
                  </Button>
                </div>
              )}

              {user?.role === 'accounts' &&
                payment.status === 'pending' &&
                payment.accountsVerificationStatus !== 'verified' && (
                  <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                    <Button
                      variant="warning"
                      icon={<AlertCircle className="h-5 w-5" />}
                      onClick={handleQuery}
                      className="w-full sm:w-auto"
                    >
                      Query
                    </Button>
                    <Button
                      variant="success"
                      icon={<CheckCircle2 className="h-5 w-5" />}
                      onClick={handleVerify}
                      className="w-full sm:w-auto"
                    >
                      Verify
                    </Button>
                  </div>
                )}

              {/* Mark invoice received for processed advance payments */}
              {user?.role === 'accounts' &&
                payment.status === 'processed' &&
                (payment.advanceDetails === 'advance' ||
                  payment.advanceDetails === 'advance_(bill/PI)') &&
                (!payment.invoiceReceived ||
                  payment.invoiceReceived === 'no') && (
                  <div className="flex justify-end mt-6">
                    <Button
                      variant="success"
                      icon={<FileCheck className="h-5 w-5" />}
                      onClick={handleMarkInvoiceReceived}
                      className="w-full sm:w-auto"
                    >
                      Mark Invoice Received
                    </Button>
                  </div>
                )}
            </div>
          </div>
        </Card>

        <QueryDialog
          isOpen={isQueryDialogOpen}
          onClose={() => setIsQueryDialogOpen(false)}
          onSubmit={handleQuerySubmit}
        />

        <AccountsQueryDialog
          isOpen={isAccountsQueryDialogOpen}
          onClose={() => setIsAccountsQueryDialogOpen(false)}
          onSubmit={handleAccountsQuerySubmit}
        />

        <ProcessPaymentDialog
          isOpen={isProcessDialogOpen}
          onClose={() => setIsProcessDialogOpen(false)}
          onSubmit={handleProcessSubmit}
          currentPaymentAmount={payment?.paymentAmount || 0}
        />

        <ApprovePaymentDialog
          isOpen={isApproveDialogOpen}
          onClose={() => setIsApproveDialogOpen(false)}
          onSubmit={handleApproveSubmit}
          currentPaymentAmount={payment?.paymentAmount || 0}
        />
      </div>
    </>
  );
};

export default PaymentDetailPage;
