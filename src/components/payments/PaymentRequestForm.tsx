import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { Plus, X, Upload, File, ChevronDown, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Vendor, User } from '../../types';
import AddVendorDialog from './AddVendorDialog';
import { convertToIndianWords } from '../../lib/numberToWords';
import AddCategoryDialog from './AddCategoryDialog';
import AddSubcategoryDialog from './AddSubcategoryDialog';

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
  vendorId: string | null;
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
  quantityCheckedBy?: string; // Quantity Checked by (optional)
  qualityCheckedBy?: string; // Quality Checked by (optional)
  purchaseOwner?: string; // Purchase Owner (optional)
  priceCheckGuaranteedBy: string; // Price Check Guaranteed By (mandatory)
  categoryId: string | null; // Category ID
  subcategoryId: string | null; // Subcategory ID
  categoryName: string;
  subcategoryName: string;
  urgencyLevel: 'low' | 'medium' | 'high';
}

interface PaymentRequestFormProps {
  editingPaymentId?: string;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  status: 'approved' | 'pending';
  added_by: string | null;
  created_at: string;
  updated_at: string;
  added_by_user?: {
    name: string;
  };
}

interface Subcategory {
  id: string;
  name: string;
  description: string;
  status?: 'approved' | 'pending' | 'rejected';
  created_at: string;
  updated_at: string;
}

interface Company {
  id: string;
  name: string;
  code: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

const BANK_OPTIONS = ['HDFC Bank', 'ICICI Bank'];

const validationSchema = Yup.object().shape({
  vendorName: Yup.string().required('Vendor name is required'),
  vendorId: Yup.string().nullable(),
  totalOutstanding: Yup.string().test(
    'is-number',
    'Must be a valid number',
    function (value) {
      if (!value) return true; // Allow empty as it's optional
      const number = Number(value.replace(/,/g, ''));
      return !isNaN(number) && number >= 0;
    }
  ),
  advanceDetails: Yup.string()
    .required('Advance details are required')
    .oneOf(
      ['tax_invoice', 'advance_(bill/PI)', 'advance', 'others'],
      'Invalid advance details type'
    ),
  paymentAmount: Yup.string()
    .required('Payment amount is required')
    .test('is-number', 'Must be a valid number', function (value) {
      if (!value) return false;
      const number = Number(value.replace(/,/g, ''));
      return !isNaN(number) && number > 0;
    }),
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
    .required('Company name is required'),
  companyBranch: Yup.string()
    .required('Company branch is required'),
  bankName: Yup.string()
    .required('Bank name is required')
    .oneOf(BANK_OPTIONS, 'Please select a valid bank'),
  paymentMode: Yup.string()
    .required('Payment mode is required')
    .oneOf(['net_banking', 'upi'], 'Please select a valid payment mode'),
  lpr: Yup.string().optional().nullable(),
  ioa: Yup.string().optional().nullable(),
  cpp: Yup.string().optional().nullable(),
  quantityCheckedBy: Yup.string().optional().nullable(),
  qualityCheckedBy: Yup.string().optional().nullable(),
  purchaseOwner: Yup.string().optional().nullable(),
  priceCheckGuaranteedBy: Yup.string().required('Price check guaranteed by is required'),
  categoryId: Yup.string().nullable().required('Category is required'),
  subcategoryId: Yup.string().nullable().required('Subcategory is required'),
  urgencyLevel: Yup.string()
    .required('Urgency level is required')
    .oneOf(['low', 'medium', 'high'], 'Please select a valid urgency level'),
});

const PaymentRequestForm: React.FC<PaymentRequestFormProps> = ({
  editingPaymentId,
}) => {
  const { user } = useAuthStore();
  const { addPayment, updatePayment } = usePaymentStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isUploading, setIsUploading] = useState(false);
  const [isQueryPayment, setIsQueryPayment] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [isAddVendorDialogOpen, setIsAddVendorDialogOpen] = useState(false);
  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const editingPaymentData = localStorage.getItem('editingPaymentData');
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [showSubcategorySuggestions, setShowSubcategorySuggestions] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(true);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [isAddSubcategoryDialogOpen, setIsAddSubcategoryDialogOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);
  const [currentSubcategoryId, setCurrentSubcategoryId] = useState<string | null>(null);

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
            addedBy: vendor.added_by,
            status: vendor.status,
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

  // Fetch users from database
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .not('role', 'eq', 'accounts')
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching users:', error);
          showErrorToast('Failed to load users');
          return;
        }

        if (data) {
          setUsers(data);
        }
      } catch (error) {
        console.error('Error:', error);
        showErrorToast('Failed to load users');
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
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

  const handleCategoryAdded = (newCategory: Category, setFieldValue: Function) => {
    const updatedCategories = [...categories, newCategory].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    setCategories(updatedCategories);
    setFilteredCategories(updatedCategories);
    setFieldValue('categoryId', newCategory.id);
  };

  const handleSubcategoryAdded = (newSubcategory: Subcategory, setFieldValue: Function) => {
    const updatedSubcategories = [...subcategories, newSubcategory].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    setSubcategories(updatedSubcategories);
    setFilteredSubcategories(updatedSubcategories);
    setFieldValue('subcategoryId', newSubcategory.id);
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

  // Add this function inside the component
  const formatNumber = (value: string) => {
    const number = value.replace(/[^\d]/g, '');
    if (!number) return '';
    return Number(number).toLocaleString('en-IN');
  };

  const initialValues: FormValues = {
    vendorName: editingPaymentData ? JSON.parse(editingPaymentData).vendorName : '',
    vendorId: editingPaymentData ? JSON.parse(editingPaymentData).vendorId : null,
    accountNumber: editingPaymentData ? JSON.parse(editingPaymentData).accountNumber : '',
    ifscCode: editingPaymentData ? JSON.parse(editingPaymentData).ifscCode : '',
    totalOutstanding: editingPaymentData ? JSON.parse(editingPaymentData).totalOutstanding : '',
    advanceDetails: editingPaymentData ? JSON.parse(editingPaymentData).advanceDetails : 'tax_invoice',
    paymentAmount: editingPaymentData ? JSON.parse(editingPaymentData).paymentAmount : '',
    itemDescription: editingPaymentData ? JSON.parse(editingPaymentData).itemDescription : '',
    bills: editingPaymentData ? JSON.parse(editingPaymentData).bills : [{ billNumber: '', billDate: '' }],
    attachments: editingPaymentData ? JSON.parse(editingPaymentData).attachments : [],
    companyName: editingPaymentData ? JSON.parse(editingPaymentData).companyName : '',
    companyBranch: editingPaymentData ? JSON.parse(editingPaymentData).companyBranch : '',
    bankName: editingPaymentData ? JSON.parse(editingPaymentData).bankName : '',
    paymentMode: editingPaymentData ? JSON.parse(editingPaymentData).paymentMode : '',
    lpr: editingPaymentData ? JSON.parse(editingPaymentData).lpr : '',
    ioa: editingPaymentData ? JSON.parse(editingPaymentData).ioa : '',
    cpp: editingPaymentData ? JSON.parse(editingPaymentData).cpp : '',
    quantityCheckedBy: editingPaymentData ? JSON.parse(editingPaymentData).quantityCheckedBy : '',
    qualityCheckedBy: editingPaymentData ? JSON.parse(editingPaymentData).qualityCheckedBy : '',
    purchaseOwner: editingPaymentData ? JSON.parse(editingPaymentData).purchaseOwner : '',
    priceCheckGuaranteedBy: editingPaymentData ? JSON.parse(editingPaymentData).priceCheckGuaranteedBy : '',
    categoryId: editingPaymentData ? JSON.parse(editingPaymentData).categoryId : null,
    subcategoryId: editingPaymentData ? JSON.parse(editingPaymentData).subcategoryId : null,
    categoryName: editingPaymentData ? JSON.parse(editingPaymentData).categoryName : '',
    subcategoryName: editingPaymentData ? JSON.parse(editingPaymentData).subcategoryName : '',
    urgencyLevel: editingPaymentData ? JSON.parse(editingPaymentData).urgencyLevel : 'normal',
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

      // Convert totalOutstanding properly - handle empty string case
      const totalOutstandingValue = values.totalOutstanding
        ? Number(values.totalOutstanding.replace(/,/g, ''))
        : 0;
      const paymentAmount = Number(values.paymentAmount.replace(/,/g, ''));
      const balanceAmount = totalOutstandingValue - paymentAmount;

      // Only submit vendor name, not account details
      const paymentData = {
        date: format(new Date(), 'yyyy-MM-dd'),
        requestedBy: user!,
        vendorName: values.vendorName,
        vendorId: values.vendorId,
        totalOutstanding: totalOutstandingValue,
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
        paymentMode: values.paymentMode as 'net_banking' | 'upi',
        lpr: values.lpr || null,
        ioa: values.ioa || null,
        cpp: values.cpp || null,
        quantityCheckedBy: values.quantityCheckedBy || null,
        qualityCheckedBy: values.qualityCheckedBy || null,
        purchaseOwner: values.purchaseOwner || null,
        priceCheckGuaranteedBy: values.priceCheckGuaranteedBy,
        categoryId: values.categoryId,
        subcategoryId: values.subcategoryId,
        urgencyLevel: values.urgencyLevel,
      };



      if (editingPaymentId) {
        // Update existing payment
        const updateResult = await updatePayment(editingPaymentId, paymentData);
        if (!updateResult) {
          throw new Error('Failed to update payment');
        }
        showSuccessToast('Payment updated successfully');
        localStorage.removeItem('editingPaymentData');
        navigate('/payments');
      } else {
        console.log('Submitting payment data:', paymentData);
        // Create new payment
        const addResult = await addPayment({
          ...paymentData,
          date: new Date().toISOString(),
          requestedBy: user,
        });

        if (!addResult) {
          throw new Error('Failed to create payment');
        }

        showSuccessToast('Payment request submitted');
        navigate('/payments');
      }
    } catch (error) {
      console.error('Error submitting payment request:', error);
      showErrorToast(
        error instanceof Error
          ? error.message
          : (editingPaymentId
            ? 'Failed to update payment'
            : 'Failed to submit payment request')
      );
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

  const filterCategories = (inputValue: string) => {
    const currentCategory = categories.find(cat => cat.id === currentCategoryId);
    const filtered = categories.filter(
      (category) =>
        category.name.toLowerCase().includes(inputValue.toLowerCase()) ||
        (currentCategory && category.id === currentCategory.id)
    );
    setFilteredCategories(filtered);
  };

  const filterSubcategories = (inputValue: string) => {
    const currentSubcategory = subcategories.find(sub => sub.id === currentSubcategoryId);
    const filtered = subcategories.filter(
      (subcategory) =>
        subcategory.name.toLowerCase().includes(inputValue.toLowerCase()) ||
        (currentSubcategory && subcategory.id === currentSubcategory.id)
    );
    setFilteredSubcategories(filtered);
  };

  // Add this function to fetch categories and subcategories
  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const { data: categoriesData, error } = await supabase
        .from('categories')
        .select(`
          *,
          added_by_user:users(name)
        `)
        .order('name');

      if (error) throw error;

      if (categoriesData) {
        setCategories(categoriesData);
        setFilteredCategories(categoriesData);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      showErrorToast('Failed to fetch categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchSubcategories = async () => {
    try {
      const { data: subcategoriesData, error } = await supabase
        .from('subcategories')
        .select('*, status')
        .order('name');

      if (error) throw error;

      if (subcategoriesData) {
        setSubcategories(subcategoriesData);
        setFilteredSubcategories(subcategoriesData);
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      showErrorToast('Failed to fetch subcategories');
    } finally {
      setLoadingSubcategories(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
  }, []);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setIsLoading(true);

        // Fetch companies
        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select('id, name, code')
          .order('name');

        if (companiesError) throw companiesError;
        setCompanies(companiesData || []);

        // Fetch branches
        const { data: branchesData, error: branchesError } = await supabase
          .from('branches')
          .select('id, name, code')
          .order('name');

        if (branchesError) throw branchesError;
        setBranches(branchesData || []);
      } catch (error) {
        console.error('Error fetching options:', error);
        showErrorToast('Failed to load form options');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOptions();
  }, []);

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
          {({ values, setFieldValue, errors, touched, isSubmitting }) => {
            // Update current IDs when values change
            useEffect(() => {
              setCurrentCategoryId(values.categoryId);
              setCurrentSubcategoryId(values.subcategoryId);
            }, [values.categoryId, values.subcategoryId]);

            // Add vendor details fetching effect here
            useEffect(() => {
              const fetchVendorDetails = async () => {
                if (editingPaymentId && initialValues.vendorId) {
                  try {
                    const { data: vendor, error } = await supabase
                      .from('vendors')
                      .select('*')
                      .eq('id', initialValues.vendorId)
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
            }, [editingPaymentId, initialValues.vendorId, setFieldValue]);

            // Add category and subcategory name fetching effect here
            useEffect(() => {
              const fetchCategoryAndSubcategoryNames = async () => {
                if (editingPaymentId && initialValues.categoryId) {
                  try {
                    const { data: category, error: categoryError } = await supabase
                      .from('categories')
                      .select('name')
                      .eq('id', initialValues.categoryId)
                      .single();

                    if (!categoryError && category) {
                      setFieldValue('categoryName', category.name);
                    }

                    if (initialValues.subcategoryId) {
                      const { data: subcategory, error: subcategoryError } = await supabase
                        .from('subcategories')
                        .select('name')
                        .eq('id', initialValues.subcategoryId)
                        .single();

                      if (!subcategoryError && subcategory) {
                        setFieldValue('subcategoryName', subcategory.name);
                      }
                    }
                  } catch (error) {
                    console.error('Error fetching category/subcategory names:', error);
                  }
                }
              };

              fetchCategoryAndSubcategoryNames();
            }, [editingPaymentId, initialValues.categoryId, initialValues.subcategoryId, setFieldValue]);

            const filterCategories = (inputValue: string) => {
              const currentCategory = categories.find(cat => cat.id === currentCategoryId);
              const filtered = categories.filter(
                (category) =>
                  category.name.toLowerCase().includes(inputValue.toLowerCase()) ||
                  (currentCategory && category.id === currentCategory.id)
              );
              setFilteredCategories(filtered);
            };

            const filterSubcategories = (inputValue: string) => {
              const currentSubcategory = subcategories.find(sub => sub.id === currentSubcategoryId);
              const filtered = subcategories.filter(
                (subcategory) =>
                  subcategory.name.toLowerCase().includes(inputValue.toLowerCase()) ||
                  (currentSubcategory && subcategory.id === currentSubcategory.id)
              );
              setFilteredSubcategories(filtered);
            };

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
            const handleCategoryInputChange = (
              event: React.ChangeEvent<HTMLInputElement>
            ) => {
              const upperValue = event.target.value.toUpperCase();
              setFieldValue('categoryId', ''); // Clear the ID when typing
              setFieldValue('categoryName', upperValue); // Add a new field for display name
              // Show suggestions when user types
              setShowCategorySuggestions(true);
              filterCategories(upperValue);
            };
            const handleSubcategoryInputChange = (
              event: React.ChangeEvent<HTMLInputElement>
            ) => {
              const upperValue = event.target.value.toUpperCase();
              setFieldValue('subcategoryId', ''); // Clear the ID when typing
              setFieldValue('subcategoryName', upperValue); // Add a new field for display name
              // Show suggestions when user types
              setShowSubcategorySuggestions(true);
              filterSubcategories(upperValue);
            };
            // Handler for vendor selection from suggestions
            const handleVendorSelect = (vendor: Vendor) => {
              setFieldValue('vendorName', vendor.name);
              setFieldValue('accountNumber', vendor.accountNumber);
              setFieldValue('ifscCode', vendor.ifscCode);
              setFieldValue('vendorId', vendor.id);
              setShowVendorSuggestions(false);
            };

            const handleCategorySelect = (category: Category) => {
              setFieldValue('categoryId', category.id);
              setFieldValue('categoryName', category.name);
              setShowCategorySuggestions(false);
            };
            const handleSubcategorySelect = (subcategory: Subcategory) => {
              setFieldValue('subcategoryId', subcategory.id);
              setFieldValue('subcategoryName', subcategory.name);
              setShowSubcategorySuggestions(false);
            };
            // Handler for clicking outside to close suggestions
            const handleVendorInputBlur = () => {
              setTimeout(() => setShowVendorSuggestions(false), 200);
            };
            const handleCategoryInputBlur = () => {
              setTimeout(() => setShowCategorySuggestions(false), 200);
            };
            const handleSubcategoryInputBlur = () => {
              setTimeout(() => setShowSubcategorySuggestions(false), 200);
            };

            // Handler for input focus
            const handleVendorInputFocus = () => {
              if (vendors.length > 0) {
                setShowVendorSuggestions(true);
                filterVendors(values.vendorName || '');
              }
            };
            const handleCategoryInputFocus = () => {
              if (categories.length > 0) {
                setShowCategorySuggestions(true);
                filterCategories(values.categoryId || '');
              }
            };

            const handleSubcategoryInputFocus = () => {
              if (subcategories.length > 0) {
                setShowSubcategorySuggestions(true);
                filterSubcategories(values.subcategoryId || '');
              }
            };

            // Handler for clearing vendor selection
            const handleClearVendor = () => {
              setFieldValue('vendorName', '');
              setFieldValue('accountNumber', '');
              setFieldValue('ifscCode', '');
              setFieldValue('vendorId', null);
              setShowVendorSuggestions(false);
            };
            const handleClearCategory = () => {
              setFieldValue('categoryId', null);
              setFieldValue('categoryName', '');
              setCurrentCategoryId(null);
              setShowCategorySuggestions(false);
              setFilteredCategories(categories);
            };

            const handleClearSubcategory = () => {
              setFieldValue('subcategoryId', null);
              setFieldValue('subcategoryName', '');
              setCurrentSubcategoryId(null);
              setShowSubcategorySuggestions(false);
              setFilteredSubcategories(subcategories);
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
                          className={`block w-full rounded-md border ${touched.vendorName && errors.vendorName
                            ? 'border-error-300'
                            : 'border-gray-300'
                            } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 pr-10 bg-white ${loadingVendors
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
                                  <div className="font-medium text-gray-900 flex items-center">
                                    {vendor.name}
                                    {vendor.status === 'approved' && (
                                      <svg
                                        className="ml-2 h-4 w-4 text-green-500"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {vendor.accountNumber} • {vendor.ifscCode}
                                  </div>
                                </button>
                              ))}
                              <div className="border-t border-gray-200">
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
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
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTimeout(() => {
                                      setIsAddVendorDialogOpen(true);
                                      setShowVendorSuggestions(false);
                                    }, 0);
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
                        Company <span className="text-error-500">*</span>
                      </label>
                      <Field
                        as="select"
                        name="companyName"
                        className={`block w-full rounded-md border ${touched.companyName && errors.companyName
                          ? 'border-error-300'
                          : 'border-gray-300'
                          } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 bg-white`}
                        disabled={isLoading}
                      >
                        <option value="">Select Company</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.code}>
                            {company.code}
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
                        className={`block w-full rounded-md border ${touched.companyBranch && errors.companyBranch
                          ? 'border-error-300'
                          : 'border-gray-300'
                          } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 bg-white`}
                        disabled={isLoading}
                      >
                        <option value="">Select Branch</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.code}>
                            {branch.code}
                          </option>
                        ))}
                      </Field>
                      {touched.companyBranch && errors.companyBranch && (
                        <p className="mt-1 text-sm text-error-600">
                          {errors.companyBranch as string}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category <span className="text-error-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="categoryName"
                          value={values.categoryName}
                          onChange={handleCategoryInputChange}
                          onFocus={handleCategoryInputFocus}
                          onBlur={handleCategoryInputBlur}
                          disabled={loadingCategories}
                          placeholder={
                            loadingCategories
                              ? 'Loading categories...'
                              : 'Type to search categories...'
                          }
                          className={`block w-full rounded-md border ${touched.categoryName && errors.categoryName
                            ? 'border-error-300'
                            : 'border-gray-300'
                            } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 pr-10 bg-white ${loadingCategories
                              ? 'opacity-50 cursor-not-allowed'
                              : ''
                            }`}
                          autoComplete="off"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          {values.categoryName && (
                            <button
                              type="button"
                              onClick={handleClearCategory}
                              className="h-4 w-4 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Vendor Suggestions Dropdown */}
                      {showCategorySuggestions && !loadingCategories && (
                        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto top-full">
                          {filteredCategories.length > 0 ? (
                            <>
                              {filteredCategories.map((category) => (
                                <button
                                  key={category.id}
                                  type="button"
                                  onClick={() => handleCategorySelect(category)}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                >
                                  <div className="font-medium text-gray-900 flex items-center">
                                    {category.name}
                                    {category.status === 'approved' && (
                                      <CheckCircle2 className="ml-2 h-4 w-4 text-green-500" />
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {category.description}
                                  </div>
                                </button>
                              ))}
                              <div className="border-t border-gray-200">
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsAddCategoryDialogOpen(true);
                                    setShowCategorySuggestions(false);
                                  }}
                                  className="w-full text-left px-4 py-2 text-primary-600 hover:bg-primary-50 focus:bg-primary-50 focus:outline-none font-medium"
                                >
                                  <Plus className="h-4 w-4 inline mr-2" />
                                  Add New Category
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="px-4 py-2">
                              <div className="text-gray-500 text-center py-2">
                                No categories found matching "{values.categoryName}"
                              </div>
                              <div className="border-t border-gray-200 pt-2">
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTimeout(() => {
                                      setIsAddCategoryDialogOpen(true);
                                      setShowCategorySuggestions(false);
                                    }, 0);
                                  }}
                                  className="w-full text-left px-0 py-2 text-primary-600 hover:bg-primary-50 focus:bg-primary-50 focus:outline-none font-medium rounded"
                                >
                                  <Plus className="h-4 w-4 inline mr-2" />
                                  Add "{values.categoryName}" as New Category
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {touched.categoryName && errors.categoryName && (
                        <p className="mt-1 text-sm text-error-600">
                          {errors.categoryName as string}
                        </p>
                      )}
                    </div>


                    <div className="flex flex-col relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sub-category <span className="text-error-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="subcategoryName"
                          value={values.subcategoryName}
                          onChange={handleSubcategoryInputChange}
                          onFocus={handleSubcategoryInputFocus}
                          onBlur={handleSubcategoryInputBlur}
                          disabled={loadingSubcategories}
                          placeholder={
                            loadingSubcategories
                              ? 'Loading sub-categories...'
                              : 'Type to search sub-categories...'
                          }
                          className={`block w-full rounded-md border ${touched.subcategoryName && errors.subcategoryName
                            ? 'border-error-300'
                            : 'border-gray-300'
                            } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 pr-10 bg-white ${loadingSubcategories
                              ? 'opacity-50 cursor-not-allowed'
                              : ''
                            }`}
                          autoComplete="off"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          {values.subcategoryName && (
                            <button
                              type="button"
                              onClick={handleClearSubcategory}
                              className="h-4 w-4 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Vendor Suggestions Dropdown */}
                      {showSubcategorySuggestions && !loadingSubcategories && (
                        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto top-full">
                          {filteredSubcategories.length > 0 ? (
                            <>
                              {filteredSubcategories.map((subcategory) => (
                                <button
                                  key={subcategory.id}
                                  type="button"
                                  onClick={() => handleSubcategorySelect(subcategory)}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                >
                                  <div className="font-medium text-gray-900 flex items-center">
                                    {subcategory.name}
                                    {subcategory.status === 'approved' && (
                                      <CheckCircle2 className="ml-2 h-4 w-4 text-green-500" />
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {subcategory.description}
                                  </div>
                                </button>
                              ))}
                              <div className="border-t border-gray-200">
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsAddSubcategoryDialogOpen(true);
                                    setShowSubcategorySuggestions(false);

                                  }}
                                  className="w-full text-left px-4 py-2 text-primary-600 hover:bg-primary-50 focus:bg-primary-50 focus:outline-none font-medium"
                                >
                                  <Plus className="h-4 w-4 inline mr-2" />
                                  Add New Sub-category
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="px-4 py-2">
                              <div className="text-gray-500 text-center py-2">
                                No sub-categories found matching "{values.subcategoryName}"
                              </div>
                              <div className="border-t border-gray-200 pt-2">
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTimeout(() => {
                                      setIsAddSubcategoryDialogOpen(true);
                                      setShowSubcategorySuggestions(false);
                                    }, 0);
                                  }}
                                  className="w-full text-left px-0 py-2 text-primary-600 hover:bg-primary-50 focus:bg-primary-50 focus:outline-none font-medium rounded"
                                >
                                  <Plus className="h-4 w-4 inline mr-2" />
                                  Add "{values.subcategoryName}" as New Sub-category
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {touched.subcategoryName && errors.subcategoryName && (
                        <p className="mt-1 text-sm text-error-600">
                          {errors.subcategoryName as string}
                        </p>
                      )}
                    </div>


                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Outstanding Amount
                      </label>
                      <Field name="totalOutstanding">
                        {({ field, form }: any) => (
                          <Input
                            {...field}
                            type="text"
                            value={field.value}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) => {
                              const formattedValue = formatNumber(
                                e.target.value
                              );
                              form.setFieldValue(
                                'totalOutstanding',
                                formattedValue
                              );
                            }}
                            onBlur={() => {
                              const numericValue = field.value.replace(
                                /,/g,
                                ''
                              );
                              if (numericValue && !isNaN(numericValue)) {
                                form.setFieldValue(
                                  'totalOutstanding',
                                  formatNumber(numericValue)
                                );
                              }
                            }}
                            error={
                              form.touched.totalOutstanding &&
                              form.errors.totalOutstanding
                            }
                            fullWidth
                          />
                        )}
                      </Field>
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Name <span className="text-error-500">*</span>
                      </label>
                      <Field
                        as="select"
                        name="bankName"
                        className={`block w-full rounded-md border ${touched.bankName && errors.bankName
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
                        className={`block w-full rounded-md border ${touched.paymentMode && errors.paymentMode
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
                        Urgency Level <span className="text-error-500">*</span>
                      </label>
                      <Field
                        as="select"
                        name="urgencyLevel"
                        className={`block w-full rounded-md border ${touched.urgencyLevel && errors.urgencyLevel
                          ? 'border-error-300'
                          : 'border-gray-300'
                          } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 bg-white`}
                      >
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                        <option value="high">High</option>
                      </Field>
                      {touched.urgencyLevel && errors.urgencyLevel && (
                        <p className="mt-1 text-sm text-error-600">
                          {errors.urgencyLevel as string}
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
                        className={`block w-full rounded-md border ${touched.advanceDetails && errors.advanceDetails
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
                      <div className="relative">
                        <Field name="paymentAmount">
                          {({ field, form }: any) => (
                            <Input
                              {...field}
                              type="text"
                              value={field.value}
                              onChange={(
                                e: React.ChangeEvent<HTMLInputElement>
                              ) => {
                                const formattedValue = formatNumber(
                                  e.target.value
                                );
                                form.setFieldValue(
                                  'paymentAmount',
                                  formattedValue
                                );
                              }}
                              onBlur={() => {
                                // On blur, ensure the value is a valid number
                                const numericValue = field.value.replace(
                                  /,/g,
                                  ''
                                );
                                if (numericValue && !isNaN(numericValue)) {
                                  form.setFieldValue(
                                    'paymentAmount',
                                    formatNumber(numericValue)
                                  );
                                }
                              }}
                              error={
                                form.touched.paymentAmount &&
                                form.errors.paymentAmount
                              }
                              fullWidth
                              required
                            />
                          )}
                        </Field>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 italic">
                        {values.paymentAmount
                          ? convertToIndianWords(
                            Number(values.paymentAmount.replace(/,/g, ''))
                          )
                          : ''}
                      </p>
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Balance Amount
                      </label>
                      <Field
                        as={Input}
                        type="text"
                        value={(() => {
                          const totalOutstanding = Number(
                            (values.totalOutstanding || '0').replace(/,/g, '')
                          );
                          const paymentAmount = Number(
                            (values.paymentAmount || '0').replace(/,/g, '')
                          );
                          const balance = totalOutstanding - paymentAmount;
                          return balance.toLocaleString('en-IN');
                        })()}
                        disabled
                        fullWidth
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price Check Guaranteed By <span className="text-error-500">*</span>
                      </label>
                      <Field
                        as="select"
                        name="priceCheckGuaranteedBy"
                        className={`block w-full rounded-md border ${touched.priceCheckGuaranteedBy && errors.priceCheckGuaranteedBy
                          ? 'border-error-300'
                          : 'border-gray-300'
                          } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 bg-white ${loadingUsers ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={loadingUsers}
                      >
                        <option value="">{loadingUsers ? 'Loading users...' : 'Select user'}</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </Field>
                      {touched.priceCheckGuaranteedBy && errors.priceCheckGuaranteedBy && (
                        <p className="mt-1 text-sm text-error-600">
                          {errors.priceCheckGuaranteedBy as string}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity Checked By
                      </label>
                      <Field
                        as="select"
                        name="quantityCheckedBy"
                        className={`block w-full rounded-md border ${touched.quantityCheckedBy && errors.quantityCheckedBy
                          ? 'border-error-300'
                          : 'border-gray-300'
                          } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 bg-white ${loadingUsers ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={loadingUsers}
                      >
                        <option value="">{loadingUsers ? 'Loading users...' : 'Select user'}</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </Field>
                      {touched.quantityCheckedBy && errors.quantityCheckedBy && (
                        <p className="mt-1 text-sm text-error-600">
                          {errors.quantityCheckedBy as string}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quality Checked By
                      </label>
                      <Field
                        as="select"
                        name="qualityCheckedBy"
                        className={`block w-full rounded-md border ${touched.qualityCheckedBy && errors.qualityCheckedBy
                          ? 'border-error-300'
                          : 'border-gray-300'
                          } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 bg-white ${loadingUsers ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={loadingUsers}
                      >
                        <option value="">{loadingUsers ? 'Loading users...' : 'Select user'}</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </Field>
                      {touched.qualityCheckedBy && errors.qualityCheckedBy && (
                        <p className="mt-1 text-sm text-error-600">
                          {errors.qualityCheckedBy as string}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Purchase Owner
                      </label>
                      <Field
                        as="select"
                        name="purchaseOwner"
                        className={`block w-full rounded-md border ${touched.purchaseOwner && errors.purchaseOwner
                          ? 'border-error-300'
                          : 'border-gray-300'
                          } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 bg-white ${loadingUsers ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={loadingUsers}
                      >
                        <option value="">{loadingUsers ? 'Loading users...' : 'Select user'}</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </Field>
                      {touched.purchaseOwner && errors.purchaseOwner && (
                        <p className="mt-1 text-sm text-error-600">
                          {errors.purchaseOwner as string}
                        </p>
                      )}
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
                      variant="danger"
                      onClick={() => {
                        if (location.pathname.includes('/new')) {
                          navigate('/dashboard');
                        } else {
                          navigate('/dashboard/queries');
                        }
                      }}
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

                {/* Add Category Dialog */}
                <AddCategoryDialog
                  isOpen={isAddCategoryDialogOpen}
                  onClose={() => setIsAddCategoryDialogOpen(false)}
                  onCategoryAdded={(newCategory) =>
                    handleCategoryAdded(newCategory, setFieldValue)
                  }
                  initialCategoryName={values.categoryName}
                />

                {/* Add Subcategory Dialog */}
                <AddSubcategoryDialog
                  isOpen={isAddSubcategoryDialogOpen}
                  onClose={() => setIsAddSubcategoryDialogOpen(false)}
                  onSubcategoryAdded={(newSubcategory) =>
                    handleSubcategoryAdded(newSubcategory, setFieldValue)
                  }
                  initialSubcategoryName={values.subcategoryName}
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