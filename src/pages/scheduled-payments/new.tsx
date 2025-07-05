import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useScheduledPaymentsStore } from '../../store/scheduledPaymentsStore';
import { useFormData } from '../../hooks/useFormData';
import { showSuccessToast, showErrorToast } from '../../lib/toast';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Components
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import VendorSelector from '../../components/scheduled-payments/VendorSelector';
import CategorySelector from '../../components/scheduled-payments/CategorySelector';
import SubcategorySelector from '../../components/scheduled-payments/SubcategorySelector';
import PaymentDetailsForm from '../../components/scheduled-payments/PaymentDetailsForm';
import RecurringPaymentConfig from '../../components/scheduled-payments/RecurringPaymentConfig';
import PaymentSchedulePreview from '../../components/scheduled-payments/PaymentSchedulePreview';

// Types
import { Vendor } from '../../types';

interface FormValues {
  vendorName: string;
  vendorId: string | null;
  accountNumber: string;
  ifscCode: string;
  totalOutstanding: string;
  advanceDetails: 'tax_invoice' | 'advance_(bill/PI)' | 'advance' | 'others';
  paymentAmount: string;
  itemDescription: string;
  companyName: string;
  companyBranch: string;
  bankName: string;
  paymentMode: 'net_banking' | 'upi' | '';
  lpr?: string;
  ioa?: string;
  cpp?: string;
  quantityCheckedBy?: string;
  qualityCheckedBy?: string;
  purchaseOwner?: string;
  priceCheckGuaranteedBy: string;
  categoryId: string | null;
  subcategoryId: string | null;
  categoryName: string;
  subcategoryName: string;
  urgencyLevel: 'low' | 'medium' | 'high';
  scheduledFor: string;
  isRecurring: boolean;
  recurrencePattern: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | null;
  recurrenceEndType: 'after' | 'on' | 'never';
  recurrenceEndAfter: number | '';
  recurrenceEndDate: string;
}

// Validation schema
const validationSchema = Yup.object().shape({
  vendorName: Yup.string().required('Vendor name is required'),
  vendorId: Yup.string().nullable(),
  totalOutstanding: Yup.string().test(
    'is-number',
    'Must be a valid number',
    function (value) {
      if (!value) return true;
      const number = Number(value.replace(/,/g, ''));
      return !isNaN(number) && number >= 0;
    }
  ),
  advanceDetails: Yup.string()
    .required('Advance details are required')
    .oneOf(['tax_invoice', 'advance_(bill/PI)', 'advance', 'others']),
  paymentAmount: Yup.string()
    .required('Payment amount is required')
    .test('is-number', 'Must be a valid number', function (value) {
      if (!value) return false;
      const number = Number(value.replace(/,/g, ''));
      return !isNaN(number) && number > 0;
    }),
  itemDescription: Yup.string().required('Item description is required'),
  companyName: Yup.string().required('Company name is required'),
  companyBranch: Yup.string().required('Company branch is required'),
  bankName: Yup.string().required('Bank name is required'),
  paymentMode: Yup.string()
    .required('Payment mode is required')
    .oneOf(['net_banking', 'upi']),
  priceCheckGuaranteedBy: Yup.string().required('Price check guaranteed by is required'),
  categoryId: Yup.string().nullable().required('Category is required'),
  subcategoryId: Yup.string().nullable().required('Subcategory is required'),
  urgencyLevel: Yup.string()
    .required('Urgency level is required')
    .oneOf(['low', 'medium', 'high'], 'Please select a valid urgency level'),
  scheduledFor: Yup.string().required('Schedule date is required'),
  isRecurring: Yup.boolean(),
  recurrencePattern: Yup.string().when('isRecurring', {
    is: true,
    then: () => Yup.string()
      .required('Recurrence pattern is required')
      .oneOf(['weekly', 'monthly', 'quarterly', 'yearly']),
    otherwise: () => Yup.string().nullable(),
  }),
  recurrenceEndType: Yup.string().when('isRecurring', {
    is: true,
    then: () => Yup.string()
      .required('End condition is required')
      .oneOf(['after', 'on', 'never']),
    otherwise: () => Yup.string().nullable(),
  }),
  recurrenceEndAfter: Yup.number().when(['isRecurring', 'recurrenceEndType'], {
    is: (isRecurring: boolean, endType: string) => isRecurring && endType === 'after',
    then: () => Yup.number()
      .required('Number of occurrences is required')
      .min(1, 'Must be at least 1')
      .max(100, 'Cannot exceed 100 occurrences'),
    otherwise: () => Yup.number().nullable(),
  }),
  recurrenceEndDate: Yup.string().when(['isRecurring', 'recurrenceEndType'], {
    is: (isRecurring: boolean, endType: string) => isRecurring && endType === 'on',
    then: () => Yup.string().required('End date is required'),
    otherwise: () => Yup.string().nullable(),
  }),
});

const NewScheduledPaymentPage: React.FC = () => {
  const { user } = useAuthStore();
  const { createScheduledPayment } = useScheduledPaymentsStore();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);

  // Use custom hook for data fetching
  const {
    vendors,
    users,
    categories,
    subcategories,
    companies,
    branches,
    loadingVendors,
    loadingUsers,
    loadingCategories,
    loadingSubcategories,
    isLoading,
    setVendors,
    setCategories,
    setSubcategories,
  } = useFormData();

  // Helper function to format numbers
  const formatNumber = (value: string) => {
    const number = value.replace(/[^\d]/g, '');
    if (!number) return '';
    return Number(number).toLocaleString('en-IN');
  };

  // Get tomorrow's date as default
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Initial form values
  const initialValues: FormValues = {
    vendorName: '',
    vendorId: null,
    accountNumber: '',
    ifscCode: '',
    totalOutstanding: '',
    advanceDetails: 'tax_invoice',
    paymentAmount: '',
    itemDescription: '',
    companyName: '',
    companyBranch: '',
    bankName: '',
    paymentMode: '',
    lpr: '',
    ioa: '',
    cpp: '',
    quantityCheckedBy: '',
    qualityCheckedBy: '',
    purchaseOwner: '',
    priceCheckGuaranteedBy: '',
    categoryId: null,
    subcategoryId: null,
    categoryName: '',
    subcategoryName: '',
    urgencyLevel: 'medium',
    scheduledFor: getTomorrowDate(),
    isRecurring: false,
    recurrencePattern: null,
    recurrenceEndType: 'never',
    recurrenceEndAfter: '',
    recurrenceEndDate: '',
  };

  // Handle form submission
  const handleSubmit = async (
    values: FormValues,
    { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
  ) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!values.vendorId) {
        throw new Error('Please select a valid vendor.');
      }
      if (!values.categoryId) {
        throw new Error('Please select a category.');
      }
      if (!values.subcategoryId) {
        throw new Error('Please select a sub-category.');
      }

      if (!values.paymentMode || !['net_banking', 'upi'].includes(values.paymentMode)) {
        throw new Error('Please select a valid payment mode');
      }

      setIsUploading(true);

      const totalOutstandingValue = values.totalOutstanding
        ? Number(values.totalOutstanding.replace(/,/g, ''))
        : 0;
      const paymentAmount = Number(values.paymentAmount.replace(/,/g, ''));
      const balanceAmount = totalOutstandingValue - paymentAmount;

      const paymentData = {
        requested_by: user!.id,
        vendor_name: values.vendorName,
        vendor_id: values.vendorId,
        total_outstanding: totalOutstandingValue,
        advance_details: values.advanceDetails,
        payment_amount: paymentAmount,
        balance_amount: balanceAmount,
        item_description: values.itemDescription,
        company_name: values.companyName,
        company_branch: values.companyBranch,
        bank_name: values.bankName,
        payment_mode: values.paymentMode as 'net_banking' | 'upi',
        lpr: values.lpr || null,
        ioa: values.ioa || null,
        cpp: values.cpp || null,
        quantity_checked_by: values.quantityCheckedBy || null,
        quality_checked_by: values.qualityCheckedBy || null,
        purchase_owner: values.purchaseOwner || null,
        price_check_guaranteed_by: values.priceCheckGuaranteedBy,
        category_id: values.categoryId,
        subcategory_id: values.subcategoryId,
        urgency_level: values.urgencyLevel,
        scheduled_for: values.scheduledFor,
        is_recurring: values.isRecurring,
        ...(values.isRecurring && {
          recurrence_pattern: values.recurrencePattern,
          recurrence_end_type: values.recurrenceEndType,
          recurrence_end_after: values.recurrenceEndType === 'after' ? Number(values.recurrenceEndAfter) : null,
          recurrence_end_date: values.recurrenceEndType === 'on' ? values.recurrenceEndDate : null,
        }),
      };

      await createScheduledPayment(paymentData);
      showSuccessToast('Payment scheduled successfully');
      navigate('/scheduled-payments');

    } catch (error) {
      console.error('Error submitting payment request:', error);
      showErrorToast(
        error instanceof Error ? error.message : 'Failed to schedule payment'
      );
    } finally {
      setSubmitting(false);
      setIsUploading(false);
    }
  };

  // Handle vendor addition
  const handleVendorAdded = (newVendor: Vendor) => {
    const updatedVendors = [...vendors, newVendor].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    setVendors(updatedVendors);
  };

  // Handle category addition
  const handleCategoryAdded = (newCategory: any) => {
    const updatedCategories = [...categories, newCategory].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    setCategories(updatedCategories);
  };

  // Handle subcategory addition
  const handleSubcategoryAdded = (newSubcategory: any) => {
    const updatedSubcategories = [...subcategories, newSubcategory].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    setSubcategories(updatedSubcategories);
  };

  return (
    <div className="max-w-4xl mx-auto my-8 animate-fade-in">
      <Card className="p-0">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-900">Schedule New Payment</h1>
            <button
              className="text-gray-400 hover:text-gray-500"
              onClick={() => navigate('/scheduled-payments')}
            >
              <X className="h-5 w-5 hover:text-red-600" />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ values, setFieldValue, errors, touched, isSubmitting }) => {
              // Auto-fill vendor details when vendor ID changes
              useEffect(() => {
                const fetchVendorDetails = async () => {
                  if (values.vendorId) {
                    try {
                      const { data: vendor, error } = await supabase
                        .from('vendors')
                        .select('*')
                        .eq('id', values.vendorId)
                        .single();

                      if (!error && vendor) {
                        setFieldValue('accountNumber', vendor.account_number);
                        setFieldValue('ifscCode', vendor.ifsc_code);
                      }
                    } catch (error) {
                      console.error('Error fetching vendor details:', error);
                    }
                  }
                };
                fetchVendorDetails();
              }, [values.vendorId, setFieldValue]);

              // Auto-fill category and subcategory names
              useEffect(() => {
                const fetchNames = async () => {
                  if (values.categoryId) {
                    try {
                      const { data: category } = await supabase
                        .from('categories')
                        .select('name')
                        .eq('id', values.categoryId)
                        .single();

                      if (category) {
                        setFieldValue('categoryName', category.name);
                      }

                      if (values.subcategoryId) {
                        const { data: subcategory } = await supabase
                          .from('subcategories')
                          .select('name')
                          .eq('id', values.subcategoryId)
                          .single();

                        if (subcategory) {
                          setFieldValue('subcategoryName', subcategory.name);
                        }
                      }
                    } catch (error) {
                      console.error('Error fetching names:', error);
                    }
                  }
                };
                fetchNames();
              }, [values.categoryId, values.subcategoryId, setFieldValue]);

              return (
                <Form className="space-y-8">
                  {/* Payment Information Section */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Vendor Selector */}
                      <div className="md:col-span-2">
                        <VendorSelector
                          vendors={vendors}
                          loadingVendors={loadingVendors}
                          selectedVendorName={values.vendorName}
                          accountNumber={values.accountNumber}
                          ifscCode={values.ifscCode}
                          onVendorChange={(name, id) => {
                            setFieldValue('vendorName', name);
                            setFieldValue('vendorId', id);
                            if (!id) {
                              setFieldValue('accountNumber', '');
                              setFieldValue('ifscCode', '');
                            }
                          }}
                          onVendorAdded={handleVendorAdded}
                          error={errors.vendorName}
                          touched={touched.vendorName}
                        />
                      </div>

                      {/* Category Selector */}
                      <CategorySelector
                        categories={categories}
                        loadingCategories={loadingCategories}
                        selectedCategoryName={values.categoryName}
                        selectedCategoryId={values.categoryId}
                        onCategoryChange={(name, id) => {
                          setFieldValue('categoryName', name);
                          setFieldValue('categoryId', id);
                        }}
                        onCategoryAdded={handleCategoryAdded}
                        error={errors.categoryId}
                        touched={touched.categoryId}
                      />

                      {/* Subcategory Selector */}
                      <SubcategorySelector
                        subcategories={subcategories}
                        loadingSubcategories={loadingSubcategories}
                        selectedSubcategoryName={values.subcategoryName}
                        selectedSubcategoryId={values.subcategoryId}
                        onSubcategoryChange={(name, id) => {
                          setFieldValue('subcategoryName', name);
                          setFieldValue('subcategoryId', id);
                        }}
                        onSubcategoryAdded={handleSubcategoryAdded}
                        error={errors.subcategoryId}
                        touched={touched.subcategoryId}
                      />
                    </div>

                    {/* Payment Details Form */}
                    <PaymentDetailsForm
                      values={values}
                      errors={errors}
                      touched={touched}
                      users={users}
                      companies={companies}
                      branches={branches}
                      loadingUsers={loadingUsers}
                      isLoading={isLoading}
                      formatNumber={formatNumber}
                    />
                  </div>

                  {/* Recurring Payment Configuration */}
                  <RecurringPaymentConfig
                    values={values}
                    setFieldValue={setFieldValue}
                    errors={errors}
                    touched={touched}
                  />

                  {/* Payment Schedule Preview */}
                  {values.recurrencePattern && (
                    <PaymentSchedulePreview values={values} />
                  )}

                  {/* Form Actions */}
                  <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/scheduled-payments')}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      isLoading={isSubmitting || isUploading}
                      className="w-full sm:w-auto"
                    >
                      Schedule Payment
                    </Button>
                  </div>
                </Form>
              );
            }}
          </Formik>
        </div>
      </Card>
    </div>
  );
};

export default NewScheduledPaymentPage; 