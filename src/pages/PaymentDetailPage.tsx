import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePaymentStore } from '../store/paymentStore';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ArrowLeft, FileCheck, FileX, CheckCircle2, FileText, Edit, AlertCircle, File } from 'lucide-react';
import PaymentStatusBadge from '../components/payments/PaymentStatusBadge';
import QueryDialog from '../components/payments/QueryDialog';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { toast } from 'react-hot-toast';

const PaymentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    payments, 
    approvePayment, 
    rejectPayment,
    markAsProcessed,
    raiseQuery,
    updatePayment
  } = usePaymentStore();
  const [isQueryDialogOpen, setIsQueryDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const payment = useMemo(() => {
    const foundPayment = payments.find(p => p.id === id);
    return foundPayment;
  }, [payments, id]);
  
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
      toast.error('No internet connection. Please check your connection and try again.');
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
            const signedUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/sign/attachments/${attachment.fileUrl}?token=${data.signedUrl.split('token=')[1]}`;
            urls[attachment.id] = signedUrl;
          }
        } catch (error) {
          console.error(`Error generating signed URL for attachment ${attachment.id}:`, error);
          // Continue with other attachments even if one fails
        }
      }
    }
    setSignedUrls(urls);
  };
  
  useEffect(() => {
    fetchSignedUrls();
  }, [payment?.attachments, isOnline]);
  
  if (!payment) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-1 py-8">
        <Card>
          <div className="text-center py-6">
            <h1 className="text-xl font-medium text-gray-900 mb-2">Payment not found</h1>
            <p className="text-gray-500 mb-4">The requested payment could not be found.</p>
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
  
  const handleApprove = async () => {
    if (!user) return;
    await approvePayment(payment.id, user);
  };
  
  const handleReject = async () => {
    if (!user) return;
    await rejectPayment(payment.id, user);
  };
  
  const handleProcess = async () => {
    await markAsProcessed(payment.id);
  };
  
  const handleQuery = () => {
    setIsQueryDialogOpen(true);
  };
  
  const handleQuerySubmit = async (query: string) => {
    if (!user) return;
    await raiseQuery(payment.id, user, query);
    setIsQueryDialogOpen(false);
  };

  const handleUpdate = async () => {
    if (!payment) return;
    await updatePayment(payment.id, {
      ...payment,
      status: 'pending'
    });
    setIsEditing(false);
  };

  const handleEdit = () => {
    if (!payment) return;
    
    // Convert the payment data to match the form's initial values structure
    const formData = {
      vendorName: payment.vendorName,
      totalOutstanding: payment.totalOutstanding.toString(),
      advanceDetails: payment.advanceDetails,
      paymentAmount: payment.paymentAmount.toString(),
      itemDescription: payment.itemDescription,
      bills: payment.bills.map(bill => ({
        billNumber: bill.billNumber,
        billDate: format(new Date(bill.billDate), 'yyyy-MM-dd')
      })),
      companyName: payment.companyName,
      bankName: payment.bankName,
      attachments: payment.attachments.map(attachment => ({
        id: attachment.id,
        description: attachment.description,
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        fileSize: attachment.fileSize,
        fileUrl: attachment.fileUrl,
        file: undefined // Explicitly set file to undefined for existing attachments
      }))
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

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-3 sm:space-y-0">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(-1)}
              icon={<ArrowLeft className="h-5 w-5" />}
              className="mr-2"
            >
              <span className="sm:inline hidden">Back</span>
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {payment.status === 'query_raised' ? 'Update Payment' : 'Payment Details'}
            </h1>
          </div>
          {payment.status === 'query_raised' && user?.role === 'user' && (
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
        
        <Card className="animate-fade-in">
          <div className="pt-0 px-1 pb-1 sm:pt-0 sm:px-1.5 sm:pb-1.5">
            <h2 className="text-2xl font-semibold text-gray-900 mb-1">{payment.vendorName}</h2>

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <PaymentStatusBadge status={payment.status} />
                <span className="text-sm text-gray-500">
                  {format(new Date(payment.date), 'MMM d, yyyy')}
                </span>
              </div>
            </div>

            {payment.status === 'query_raised' && payment.queryDetails && (
              <div className="mb-6 p-4 bg-warning-50 rounded-lg border border-warning-200">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-warning-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-warning-800 mb-1">Query Details</h3>
                    <p className="text-sm text-warning-700">{payment.queryDetails}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Item Description</h3>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <p className="text-sm text-gray-900">{payment.itemDescription || 'No description provided'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Payment Details</h3>
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-2">
                  <div className="flex flex-col sm:flex-row justify-between">
                    <span className="text-sm text-gray-500">Vendor Name:</span>
                    <span className="text-sm font-medium">{payment.vendorName || 'Not provided'}</span>
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
                    <span className="text-sm text-gray-500">Advance Details:</span>
                    <span className="text-sm font-medium capitalize">
                      {payment.advanceDetails?.replace('_', ' ') || 'Not specified'}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between">
                    <span className="text-sm text-gray-500">Payment Amount:</span>
                    <span className="text-sm font-medium">
                      {(payment.paymentAmount || 0).toLocaleString('en-IN', { 
                        style: 'currency', 
                        currency: 'INR',
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between">
                    <span className="text-sm text-gray-500">Bank Name:</span>
                    <span className="text-sm font-medium">{payment.bankName || 'Not specified'}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between border-t pt-2 mt-1">
                    <span className="text-sm text-gray-500">Balance Amount:</span>
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
                <h3 className="text-sm font-medium text-gray-500 mb-2">Bill Information</h3>
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-4">
                  {payment.bills && payment.bills.length > 0 ? (
                    payment.bills.map((bill, index) => (
                      <div key={bill.id || index} className="space-y-3">
                        {index > 0 && <div className="border-t border-gray-200 pt-3"></div>}
                        <div className="space-y-2">
                          <div className="hidden md:block">
                            <div className="flex flex-col sm:flex-row justify-between">
                              <span className="text-sm text-gray-500">Bill Number:</span>
                              <span className="text-sm font-medium">{bill.billNumber || 'Not provided'}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row justify-between">
                              <span className="text-sm text-gray-500">Bill Date:</span>
                              <span className="text-sm font-medium">
                                {bill.billDate ? format(new Date(bill.billDate), 'dd MMM yyyy') : 'Not specified'}
                              </span>
                            </div>
                          </div>
                          <div className="md:hidden">
                            <div>
                              <span className="text-sm text-gray-500">Bill Number</span>
                              <span className="text-sm font-medium block">{bill.billNumber || 'Not provided'}</span>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Bill Date</span>
                              <span className="text-sm font-medium block">
                                {bill.billDate ? format(new Date(bill.billDate), 'dd MMM yyyy') : 'Not specified'}
                              </span>
                            </div>
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

            {/* Attachments Section */}
            {payment.attachments && payment.attachments.length > 0 ? (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Attachments</h3>
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-4">
                  {payment.attachments.map((attachment, index) => (
                    <div key={attachment.id || index} className="space-y-3">
                      {index > 0 && <div className="border-t border-gray-200 pt-3"></div>}
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row justify-between">
                          <div className="flex items-center space-x-2">
                            <File className="h-5 w-5 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {attachment.fileName || 'No file attached'}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {attachment.fileSize ? `${Math.round(attachment.fileSize / 1024)} KB` : 'Size unknown'}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-between">
                          <span className="text-sm text-gray-500">Description:</span>
                          <span className="text-sm font-medium">{attachment.description || 'No description'}</span>
                        </div>
                        {attachment.fileUrl && signedUrls[attachment.id] && (
                          <div className="flex justify-end">
                            <button
                              className="text-sm text-primary-600 hover:text-primary-700"
                              onClick={async () => {
                                if (!isOnline) {
                                  toast.error('No internet connection. Please check your connection and try again.');
                                  return;
                                }
                                
                                if (!signedUrls[attachment.id]) {
                                  toast.error('File URL is not available. Please try again later.');
                                  return;
                                }
                                
                                try {
                                  const response = await fetch(signedUrls[attachment.id]);
                                  if (!response.ok) {
                                    toast.error('File not found. Please try again later.');
                                    return;
                                  }

                                  const fileType = getFileType(attachment.fileName || '');
                                  // Navigate to the file viewer screen with the file details
                                  navigate('/file-viewer', {
                                    state: {
                                      url: signedUrls[attachment.id],
                                      type: fileType,
                                      fileName: attachment.fileName,
                                      paymentId: id
                                    }
                                  });
                                } catch (error) {
                                  console.error('Error accessing file:', error);
                                  toast.error('Error accessing file. Please try again later.');
                                }
                              }}
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
                <h3 className="text-sm font-medium text-gray-500 mb-2">Attachments</h3>
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <p className="text-sm text-gray-500">No attachments available</p>
                </div>
              </div>
            )}
            
            <div className="border-t border-gray-200 pt-4">
              <div className="flex flex-col sm:flex-row justify-between mb-4 space-y-4 sm:space-y-0">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Requested By</h3>
                  <p className="text-sm mt-1">{payment.requestedBy?.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{payment.requestedBy?.email || 'Email not available'}</p>
                </div>
                
                {payment.approvedBy && (
                  <div className="text-left sm:text-right">
                    <h3 className="text-sm font-medium text-gray-500">
                      {payment.status === 'rejected' ? 'Rejected By' : 'Approved By'}
                    </h3>
                    <p className="text-sm mt-1">{payment.approvedBy.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{payment.approvedBy.email || 'Email not available'}</p>
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
                <div className="flex justify-end mt-6">
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
            </div>
          </div>
        </Card>

        <QueryDialog
          isOpen={isQueryDialogOpen}
          onClose={() => setIsQueryDialogOpen(false)}
          onSubmit={handleQuerySubmit}
        />
      </div>
    </>
  );
};

export default PaymentDetailPage;