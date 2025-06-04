import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { usePaymentStore } from '../../store/paymentStore';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { format } from 'date-fns';
import { showSuccessToast, showErrorToast } from '../../lib/toast';
import {
  Formik,
  Form,
  Field,
  FieldArray,
  FormikErrors,
  FormikTouched,
} from 'formik';
import * as Yup from 'yup';
import { Plus, X, Upload, File, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Vendor } from '../../types';
import AddVendorDialog from './AddVendorDialog';

interface Bill {
  billNumber: string;
  billDate: string;
}

interface Attachment {
  id?: string;
  description: string;
  file?: File;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
}

interface FormValues {
  vendorName: string;
  accountNumber: string; // For display only, not submitted
  ifscCode: string; // For display only, not submitted
  totalOutstanding: string;
  advanceDetails: 'tax_invoice' | 'advance_(bill/PI)' | 'advance' | 'others';
  paymentAmount: string;
  itemDescription: string;
  bills: Bill[];
  attachments: Attachment[];
  companyName: string;
  companyBranch: string;
  bankName: string;
  paymentMode: 'net_banking' | 'upi' | ''; // Allow empty string for mandatory selection
  lpr?: string; // Last Purchase Rate (optional)
  ioa?: string; // Internal Order Accounting (optional)
  cpp?: string; // Credit Payment Period (optional)
}

interface PaymentRequestFormProps {
  editingPaymentId?: string;
}

const COMPANY_OPTIONS = [
  'ATC', //Atlanta
  'ATCL', //Atlanta (L)
  'BTC', //Bestco
  'CLITE', //Copperlite
  'NOTO', //NotoFire
  'VCON', //Valuecon
  'SGC', //Satguru
  'NCCE', //New
  'GJ-SB', //New
];

const BRANCH_OPTIONS = ['DL', 'MP', 'UK', 'UP'];

const BANK_OPTIONS = ['HDFC Bank', 'ICICI Bank'];

const validationSchema = Yup.object().shape({
  vendorName: Yup.string().required('Vendor name is required'),
  totalOutstanding: Yup.number(),
  advanceDetails: Yup.string()
    .required('Advance details are required')
    .oneOf(
      ['tax_invoice', 'advance_(bill/PI)', 'advance', 'others'],
      'Invalid advance details type'
    ),
  paymentAmount: Yup.number()
    .required('Payment amount is required')
    .min(0, 'Amount must be zero or positive'),
  itemDescription: Yup.string().required('Item description is required'),
  bills: Yup.array()
    .of(
      Yup.object().shape({
        billNumber: Yup.string().required('Bill number is required'),
        billDate: Yup.date().required('Bill date is required'),
      })
    )
    .min(1, 'At least one bill is required'),
  attachments: Yup.array()
    .of(
      Yup.object().shape({
        description: Yup.string().required('Description is required'),
        file: Yup.mixed<File>()
          .test('fileSize', 'File size must be less than 5MB', (value) => {
            if (!value) return true;
            return (value as File).size <= 5 * 1024 * 1024;
          })
          .test('fileType', 'Only PDF and image files are allowed', (value) => {
            if (!value) return true;
            const file = value as File;
            const validTypes = [
              'application/pdf',
              'image/jpeg',
              'image/jpg',
              'image/png',
              'image/gif',
              'image/webp',
            ];
            return validTypes.includes(file.type);
          }),
      })
    )
    .optional(),
  companyName: Yup.string()
    .required('Company name is required')
    .oneOf(COMPANY_OPTIONS, 'Please select a valid company'),
  companyBranch: Yup.string()
    .required('Company branch is required')
    .oneOf(BRANCH_OPTIONS, 'Please select a valid branch'),
  bankName: Yup.string()
    .required('Bank name is required')
    .oneOf(BANK_OPTIONS, 'Please select a valid bank'),
  paymentMode: Yup.string()
    .required('Payment mode is required')
    .oneOf(['net_banking', 'upi'], 'Please select a valid payment mode'),
  lpr: Yup.string().optional().nullable(),
  ioa: Yup.string().optional().nullable(),
  cpp: Yup.string().optional().nullable(),
});

const PaymentRequestForm: React.FC<PaymentRequestFormProps> = ({
  editingPaymentId,
}) => {
  const { user } = useAuthStore();
  const { addPayment, updatePayment } = usePaymentStore();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [isQueryPayment, setIsQueryPayment] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [isAddVendorDialogOpen, setIsAddVendorDialogOpen] = useState(false);
  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const editingPaymentData = localStorage.getItem('editingPaymentData');

  // Fetch vendors from database
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoadingVendors(true);
        const { data, error } = await supabase
          .from('vendors')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching vendors:', error);
          showErrorToast('Failed to load vendors');
          return;
        }

        if (data) {
          const formattedVendors: Vendor[] = data.map((vendor) => ({
            id: vendor.id,
            name: vendor.name,
            accountNumber: vendor.account_number,
            ifscCode: vendor.ifsc_code,
            createdAt: vendor.created_at,
            updatedAt: vendor.updated_at,
          }));
          setVendors(formattedVendors);
          setFilteredVendors(formattedVendors); // Initialize filtered vendors
        }
      } catch (error) {
        console.error('Error:', error);
        showErrorToast('Failed to load vendors');
      } finally {
        setLoadingVendors(false);
      }
    };

    fetchVendors();
  }, []);

  // Handle new vendor addition
  const handleVendorAdded = (newVendor: Vendor, setFieldValue: Function) => {
    const updatedVendors = [...vendors, newVendor].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    setVendors(updatedVendors);
    setFilteredVendors(updatedVendors);
    setFieldValue('vendorName', newVendor.name);
    setFieldValue('accountNumber', newVendor.accountNumber);
    setFieldValue('ifscCode', newVendor.ifscCode);
  };

  // Clear localStorage items when component unmounts
  useEffect(() => {
    return () => {
      localStorage.removeItem('editingPaymentData');
    };
  }, []);

  // Check if this is a payment with a query
  useEffect(() => {
    if (editingPaymentId) {
      const checkPaymentStatus = async () => {
        const { data: payment } = await supabase
          .from('payments')
          .select('status')
          .eq('id', editingPaymentId)
          .single();

        setIsQueryPayment(payment?.status === 'query_raised');
      };
      checkPaymentStatus();
    }
  }, [editingPaymentId]);

  const initialValues: FormValues = editingPaymentData
    ? JSON.parse(editingPaymentData)
    : {
        vendorName: '',
        accountNumber: '',
        ifscCode: '',
        totalOutstanding: '',
        advanceDetails: 'tax_invoice',
        paymentAmount: '',
        itemDescription: '',
        bills: [{ billNumber: '', billDate: format(new Date(), 'yyyy-MM-dd') }],
        attachments: [],
        companyName: '',
        companyBranch: '',
        bankName: '',
        paymentMode: '',
        lpr: '',
        ioa: '',
        cpp: '',
      };

  const handleSubmit = async (
    values: FormValues,
    { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
  ) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Validate that paymentMode is selected
      if (
        !values.paymentMode ||
        (values.paymentMode !== 'net_banking' && values.paymentMode !== 'upi')
      ) {
        throw new Error('Please select a valid payment mode');
      }

      setIsUploading(true);

      const totalOutstanding = Number(values.totalOutstanding);
      const paymentAmount = Number(values.paymentAmount);
      const balanceAmount = totalOutstanding - paymentAmount;

      // Only submit vendor name, not account details
      const paymentData = {
        vendorName: values.vendorName, // Only vendor name is stored in payments table
        totalOutstanding,
        advanceDetails: values.advanceDetails,
        paymentAmount,
        balanceAmount,
        itemDescription: values.itemDescription,
        bills: values.bills.map((bill) => ({
          id: '',
          billNumber: bill.billNumber,
          billDate: new Date(bill.billDate).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
        attachments: values.attachments.map((attachment) => ({
          id: attachment.id || '',
          description: attachment.description,
          file: attachment.file,
          fileUrl: attachment.fileUrl || '',
          fileName: attachment.fileName || '',
          fileType: attachment.fileType || '',
          fileSize: attachment.fileSize || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
        companyName: values.companyName,
        companyBranch: values.companyBranch,
        bankName: values.bankName,
        paymentMode: values.paymentMode as 'net_banking' | 'upi', // Type assertion after validation
        lpr: values.lpr || null,
        ioa: values.ioa || null,
        cpp: values.cpp || null,
      };

      if (editingPaymentId) {
        // Update existing payment
        await updatePayment(editingPaymentId, paymentData);
        showSuccessToast('Payment updated successfully');
        localStorage.removeItem('editingPaymentData');
        navigate('/payments');
      } else {
        // Create new payment
        await addPayment({
          ...paymentData,
          date: new Date().toISOString(),
          requestedBy: user,
        });
        showSuccessToast('Payment request submitted');
        navigate('/payments');
      }
    } catch (error) {
      showErrorToast(
        editingPaymentId
          ? 'Failed to update payment'
          : 'Failed to submit payment request'
      );
      console.error('Error submitting payment request:', error);
    } finally {
      setSubmitting(false);
      setIsUploading(false);
    }
  };

  // Filter vendors based on input
  const filterVendors = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredVendors(vendors);
      return;
    }

    const filtered = vendors.filter((vendor) =>
      vendor.name.toUpperCase().includes(searchTerm.toUpperCase())
    );
    setFilteredVendors(filtered);
  };

  return (
    <div className="max-w-2xl mx-auto my-8 animate-fade-in">
      <Card
        title={isQueryPayment ? 'Update Payment' : 'Submit Payment Request'}
      >
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ errors, touched, isSubmitting, values, setFieldValue }) => {
            // Handler for vendor input change
            const handleVendorInputChange = (
              event: React.ChangeEvent<HTMLInputElement>
            ) => {
              const upperValue = event.target.value.toUpperCase();
              setFieldValue('vendorName', upperValue);

              // Show suggestions when user types
              setShowVendorSuggestions(true);
              filterVendors(upperValue);

              // Clear account details when typing
              setFieldValue('accountNumber', '');
              setFieldValue('ifscCode', '');
            };

            // Handler for vendor selection from suggestions
            const handleVendorSelect = (vendor: Vendor) => {
              setFieldValue('vendorName', vendor.name);
              setFieldValue('accountNumber', vendor.accountNumber);
              setFieldValue('ifscCode', vendor.ifscCode);
              setShowVendorSuggestions(false);
            };

            // Handler for clicking outside to close suggestions
            const handleVendorInputBlur = () => {
              // Delay hiding to allow click on suggestion
              setTimeout(() => setShowVendorSuggestions(false), 200);
            };

            // Handler for input focus
            const handleVendorInputFocus = () => {
              if (vendors.length > 0) {
                setShowVendorSuggestions(true);
                filterVendors(values.vendorName || '');
              }
            };

            // Handler for clearing vendor selection
            const handleClearVendor = () => {
              setFieldValue('vendorName', '');
              setFieldValue('accountNumber', '');
              setFieldValue('ifscCode', '');
              setShowVendorSuggestions(false);
            };

            const handleRemoveAttachment = async (index: number) => {
              const attachment = values.attachments[index];

              // If this is an existing attachment (has an ID), we need to delete it from storage and database
              if (attachment.id && attachment.fileUrl) {
                try {
                  // Delete from storage
                  await supabase.storage
                    .from('attachments')
                    .remove([attachment.fileUrl]);

                  // Delete from database
                  await supabase
                    .from('attachments')
                    .delete()
                    .eq('id', attachment.id);
                } catch (error) {
                  console.error('Error deleting attachment:', error);
                  showErrorToast('Failed to delete attachment');
                  return;
                }
              }

              // Remove from form state
              const newAttachments = [...values.attachments];
              newAttachments.splice(index, 1);
              setFieldValue('attachments', newAttachments);
            };

            const handleFileChange = (
              event: React.ChangeEvent<HTMLInputElement>,
              index: number
            ) => {
              const file = event.target.files?.[0];
              if (file) {
                // Check file size immediately
                if (file.size > 5 * 1024 * 1024) {
                  showErrorToast('File size must be less than 5MB');
                  event.target.value = ''; // Clear the file input
                  return;
                }

                const newAttachments = [...values.attachments];
                newAttachments[index] = {
                  ...newAttachments[index],
                  file,
                  fileName: file.name,
                  fileType: file.type,
                  fileSize: file.size,
                  fileUrl: undefined,
                };
                setFieldValue('attachments', newAttachments);
              }
            };

            return (
              <>
                <Form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vendor Name <span className="text-error-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="vendorName"
                          value={values.vendorName}
                          onChange={handleVendorInputChange}
                          onFocus={handleVendorInputFocus}
                          onBlur={handleVendorInputBlur}
                          disabled={loadingVendors}
                          placeholder={
                            loadingVendors
                              ? 'Loading vendors...'
                              : 'Type to search vendors...'
                          }
                          className={`block w-full rounded-md border ${
                            touched.vendorName && errors.vendorName
                              ? 'border-error-300'
                              : 'border-gray-300'
                          } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 pr-10 bg-white ${
                            loadingVendors
                              ? 'opacity-50 cursor-not-allowed'
                              : ''
                          }`}
                          autoComplete="off"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          {values.vendorName ? (
                            <button
                              type="button"
                              onClick={handleClearVendor}
                              className="h-4 w-4 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Vendor Suggestions Dropdown */}
                      {showVendorSuggestions && !loadingVendors && (
                        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto top-full">
                          {filteredVendors.length > 0 ? (
                            <>
                              {filteredVendors.map((vendor) => (
                                <button
                                  key={vendor.id}
                                  type="button"
                                  onClick={() => handleVendorSelect(vendor)}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                >
                                  <div className="font-medium text-gray-900">
                                    {vendor.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {vendor.accountNumber} • {vendor.ifscCode}
                                  </div>
                                </button>
                              ))}
                              <div className="border-t border-gray-200">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsAddVendorDialogOpen(true);
                                    setShowVendorSuggestions(false);
                                  }}
                                  className="w-full text-left px-4 py-2 text-primary-600 hover:bg-primary-50 focus:bg-primary-50 focus:outline-none font-medium"
                                >
                                  <Plus className="h-4 w-4 inline mr-2" />
                                  Add New Vendor
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="px-4 py-2">
                              <div className="text-gray-500 text-center py-2">
                                No vendors found matching "{values.vendorName}"
                              </div>
                              <div className="border-t border-gray-200 pt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsAddVendorDialogOpen(true);
                                    setShowVendorSuggestions(false);
                                  }}
                                  className="w-full text-left px-0 py-2 text-primary-600 hover:bg-primary-50 focus:bg-primary-50 focus:outline-none font-medium rounded"
                                >
                                  <Plus className="h-4 w-4 inline mr-2" />
                                  Add "{values.vendorName}" as New Vendor
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {touched.vendorName && errors.vendorName && (
                        <p className="mt-1 text-sm text-error-600">
                          {errors.vendorName as string}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Type to search vendors or add new one
                      </p>
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Number{' '}
                        <span className="text-gray-400">(Auto-filled)</span>
                      </label>
                      <Field
                        as={Input}
                        name="accountNumber"
                        fullWidth
                        disabled
                        className="bg-gray-50"
                        placeholder="Select vendor to view account number"
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        IFSC Code{' '}
                        <span className="text-gray-400">(Auto-filled)</span>
                      </label>
                      <Field
                        as={Input}
                        name="ifscCode"
                        fullWidth
                        disabled
                        className="bg-gray-50"
                        placeholder="Select vendor to view IFSC code"
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name <span className="text-error-500">*</span>
                      </label>
                      <Field
                        as="select"
                        name="companyName"
                        className={`block w-full rounded-md border ${
                          touched.companyName && errors.companyName
                            ? 'border-error-300'
                            : 'border-gray-300'
                        } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 bg-white`}
                      >
                        <option value="">Select a company</option>
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company} value={company}>
                            {company}
                          </option>
                        ))}
                      </Field>
                      {touched.companyName && errors.companyName && (
                        <p className="mt-1 text-sm text-error-600">
                          {errors.companyName as string}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Branch <span className="text-error-500">*</span>
                      </label>
                      <Field
                        as="select"
                        name="companyBranch"
                        className={`block w-full rounded-md border ${
                          touched.companyBranch && errors.companyBranch
                            ? 'border-error-300'
                            : 'border-gray-300'
                        } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 bg-white`}
                      >
                        <option value="">Select Branch</option>
                        {BRANCH_OPTIONS.map((branch) => (
                          <option key={branch} value={branch}>
                            {branch}
                          </option>
                        ))}
                      </Field>
                      {touched.companyBranch && errors.companyBranch && (
                        <p className="mt-1 text-sm text-error-600">
                          {errors.companyBranch as string}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Outstanding Amount
                      </label>
                      <Field
                        as={Input}
                        name="totalOutstanding"
                        type="number"
                        min="0"
                        step="0.01"
                        error={
                          touched.totalOutstanding && errors.totalOutstanding
                        }
                        fullWidth
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Name <span className="text-error-500">*</span>
                      </label>
                      <Field
                        as="select"
                        name="bankName"
                        className={`block w-full rounded-md border ${
                          touched.bankName && errors.bankName
                            ? 'border-error-300'
                            : 'border-gray-300'
                        } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 bg-white`}
                      >
                        <option value="">Select a bank</option>
                        {BANK_OPTIONS.map((bank) => (
                          <option key={bank} value={bank}>
                            {bank}
                          </option>
                        ))}
                      </Field>
                      {touched.bankName && errors.bankName && (
                        <p className="mt-1 text-sm text-error-600">
                          {errors.bankName as string}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Mode <span className="text-error-500">*</span>
                      </label>
                      <Field
                        as="select"
                        name="paymentMode"
                        className={`block w-full rounded-md border ${
                          touched.paymentMode && errors.paymentMode
                            ? 'border-error-300'
                            : 'border-gray-300'
                        } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 bg-white`}
                      >
                        <option value="">Select payment mode</option>
                        <option value="net_banking">Net Banking</option>
                        <option value="upi">UPI</option>
                      </Field>
                      {touched.paymentMode && errors.paymentMode && (
                        <p className="mt-1 text-sm text-error-600">
                          {errors.paymentMode as string}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pay Against <span className="text-error-500">*</span>
                      </label>
                      <Field
                        as="select"
                        name="advanceDetails"
                        className={`block w-full rounded-md border ${
                          touched.advanceDetails && errors.advanceDetails
                            ? 'border-error-300'
                            : 'border-gray-300'
                        } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 bg-white`}
                      >
                        <option value="tax_invoice">Tax Invoice</option>
                        <option value="advance_(bill/PI)">
                          Advance (Bill/PI)
                        </option>
                        <option value="advance">Advance</option>
                        <option value="others">Others</option>
                      </Field>
                      {touched.advanceDetails && errors.advanceDetails && (
                        <p className="mt-1 text-sm text-error-600">
                          {errors.advanceDetails as string}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Amount <span className="text-error-500">*</span>
                      </label>
                      <Field
                        as={Input}
                        name="paymentAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        error={touched.paymentAmount && errors.paymentAmount}
                        fullWidth
                        required
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Balance Amount
                      </label>
                      <Field
                        as={Input}
                        type="number"
                        value={(
                          Number(values.totalOutstanding) -
                          Number(values.paymentAmount)
                        ).toFixed(2)}
                        disabled
                        fullWidth
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Item Description{' '}
                        <span className="text-error-500">*</span>
                      </label>
                      <Field
                        as={Input}
                        name="itemDescription"
                        error={
                          touched.itemDescription && errors.itemDescription
                        }
                        fullWidth
                        required
                      />
                    </div>

                    {/* New optional fields */}
                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        LPR (Last Purchase Rate)
                      </label>
                      <Field
                        as={Input}
                        name="lpr"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Enter last purchase rate"
                        error={touched.lpr && errors.lpr}
                        fullWidth
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        IOA (Internal Order Accounting)
                      </label>
                      <Field
                        as={Input}
                        name="ioa"
                        placeholder="Enter internal order accounting"
                        error={touched.ioa && errors.ioa}
                        fullWidth
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CPP (Credit Payment Period)
                      </label>
                      <Field
                        as={Input}
                        name="cpp"
                        type="number"
                        min="0"
                        placeholder="Enter credit payment period (days)"
                        error={touched.cpp && errors.cpp}
                        fullWidth
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bills <span className="text-error-500">*</span>
                      </label>
                      <FieldArray name="bills">
                        {({ push, remove }) => (
                          <div className="space-y-4">
                            {values.bills.map((bill: Bill, index: number) => (
                              <div
                                key={index}
                                className="space-y-3 bg-gray-50 rounded-lg p-4"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="space-y-3 flex-1">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Bill Number{' '}
                                        <span className="text-error-500">
                                          *
                                        </span>
                                      </label>
                                      <Field
                                        as={Input}
                                        name={`bills.${index}.billNumber`}
                                        error={
                                          touched.bills?.[index]?.billNumber &&
                                          (
                                            errors.bills as FormikErrors<Bill[]>
                                          )?.[index]?.billNumber
                                        }
                                        fullWidth
                                        required
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Bill Date{' '}
                                        <span className="text-error-500">
                                          *
                                        </span>
                                      </label>
                                      <Field
                                        as={Input}
                                        name={`bills.${index}.billDate`}
                                        type="date"
                                        error={
                                          touched.bills?.[index]?.billDate &&
                                          (
                                            errors.bills as FormikErrors<Bill[]>
                                          )?.[index]?.billDate
                                        }
                                        fullWidth
                                        required
                                      />
                                    </div>
                                  </div>
                                  {values.bills.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => remove(index)}
                                      className="ml-4"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                push({
                                  billNumber: '',
                                  billDate: format(new Date(), 'yyyy-MM-dd'),
                                })
                              }
                              className="w-full sm:w-auto"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Another Bill
                            </Button>
                          </div>
                        )}
                      </FieldArray>
                      {touched.bills &&
                        errors.bills &&
                        typeof errors.bills === 'string' && (
                          <p className="mt-1 text-sm text-error-600">
                            {errors.bills}
                          </p>
                        )}
                    </div>

                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Attachments
                      </label>
                      <FieldArray name="attachments">
                        {({ push }) => (
                          <div className="space-y-4">
                            {values.attachments.map((attachment, index) => (
                              <div
                                key={index}
                                className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                              >
                                <div className="flex-1">
                                  {attachment.fileUrl ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center space-x-2">
                                        <File className="h-5 w-5 text-gray-400" />
                                        <span className="text-sm text-gray-900">
                                          {attachment.fileName}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          (
                                          {Math.round(
                                            (attachment.fileSize || 0) / 1024
                                          )}{' '}
                                          KB)
                                        </span>
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {attachment.description}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <input
                                        type="file"
                                        onChange={(e) =>
                                          handleFileChange(e, index)
                                        }
                                        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                                        className="block w-full text-sm text-gray-500
                                          file:mr-4 file:py-2 file:px-4
                                          file:rounded-full file:border-0
                                          file:text-sm file:font-semibold
                                          file:bg-primary-50 file:text-primary-700
                                          hover:file:bg-primary-100"
                                      />
                                      <p className="text-xs text-gray-500 mt-1">
                                        Allowed file types: PDF, JPG, JPEG, PNG,
                                        GIF, WEBP (Max size: 5MB)
                                      </p>
                                      <Field
                                        as={Input}
                                        name={`attachments.${index}.description`}
                                        placeholder="Description"
                                        className="mt-2"
                                        error={
                                          touched.attachments?.[index]
                                            ?.description &&
                                          (
                                            errors.attachments as FormikErrors<
                                              Attachment[]
                                            >
                                          )?.[index]?.description
                                        }
                                      />
                                    </div>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleRemoveAttachment(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                push({ description: '', file: undefined })
                              }
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Attachment
                            </Button>
                          </div>
                        )}
                      </FieldArray>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/payments')}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>

                    <Button
                      type="submit"
                      isLoading={isSubmitting || isUploading}
                      className="w-full sm:w-auto"
                    >
                      {isQueryPayment ? 'Update Payment' : 'Submit Request'}
                    </Button>
                  </div>
                </Form>

                {/* Add Vendor Dialog */}
                <AddVendorDialog
                  isOpen={isAddVendorDialogOpen}
                  onClose={() => setIsAddVendorDialogOpen(false)}
                  onVendorAdded={(newVendor) =>
                    handleVendorAdded(newVendor, setFieldValue)
                  }
                  initialVendorName={values.vendorName}
                />
              </>
            );
          }}
        </Formik>
      </Card>
    </div>
  );
};

export default PaymentRequestForm;
