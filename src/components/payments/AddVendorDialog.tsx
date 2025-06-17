import React, { useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { X, Plus } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { showSuccessToast, showErrorToast } from '../../lib/toast';
import { Vendor } from '../../types';

interface AddVendorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onVendorAdded: (vendor: Vendor) => void;
  initialVendorName?: string;
}

interface VendorFormValues {
  name: string;
  accountNumber: string;
  ifscCode: string;
}

const validationSchema = Yup.object().shape({
  name: Yup.string()
    .required('Vendor name is required')
    .min(2, 'Vendor name must be at least 2 characters')
    .transform((value) => value?.trim().toUpperCase()),
  accountNumber: Yup.string()
    .required('Account number is required')
    .matches(/^[0-9]+$/, 'Account number must contain only numbers')
    .min(8, 'Account number must be at least 8 digits')
    .max(20, 'Account number must not exceed 20 digits'),
  ifscCode: Yup.string()
    .required('IFSC code is required')
    .matches(
      /^[A-Z]{4}0[A-Z0-9]{6}$/,
      'Invalid IFSC code format (e.g., HDFC0001234)'
    )
    .length(11, 'IFSC code must be exactly 11 characters')
    .transform((value) => value?.trim().toUpperCase()),
});

const AddVendorDialog: React.FC<AddVendorDialogProps> = ({
  isOpen,
  onClose,
  onVendorAdded,
  initialVendorName = '',
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  const initialValues: VendorFormValues = {
    name: initialVendorName.toUpperCase(),
    accountNumber: '',
    ifscCode: '',
  };

  const handleSubmit = async (values: VendorFormValues) => {
    try {
      setIsSubmitting(true);
      setValidationMessage('Checking for duplicates...');

      // Check for duplicate vendor name
      const { data: existingVendorByName, error: nameCheckError } =
        await supabase
          .from('vendors')
          .select('id, name')
          .eq('name', values.name.trim().toUpperCase())
          .single();

      if (nameCheckError && nameCheckError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is what we want
        console.error('Error checking vendor name:', nameCheckError);
        setValidationMessage('');
        showErrorToast('Failed to verify vendor information');
        return;
      }

      if (existingVendorByName) {
        setValidationMessage('');
        showErrorToast(
          `Vendor name "${values.name.trim().toUpperCase()}" already exists`
        );
        return;
      }

      // Check for duplicate account number
      const { data: existingVendorByAccount, error: accountCheckError } =
        await supabase
          .from('vendors')
          .select('id, name, account_number')
          .eq('account_number', values.accountNumber.trim())
          .single();

      if (accountCheckError && accountCheckError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is what we want
        console.error('Error checking account number:', accountCheckError);
        setValidationMessage('');
        showErrorToast('Failed to verify account information');
        return;
      }

      if (existingVendorByAccount) {
        setValidationMessage('');
        showErrorToast(
          `Account number "${values.accountNumber.trim()}" already exists for vendor "${
            existingVendorByAccount.name
          }"`
        );
        return;
      }

      // If we get here, both name and account number are unique
      setValidationMessage('Creating vendor...');

      // Insert new vendor into database
      const { data, error } = await supabase
        .from('vendors')
        .insert({
          name: values.name.trim().toUpperCase(),
          account_number: values.accountNumber.trim(),
          ifsc_code: values.ifscCode.trim(),
          added_by: (await supabase.auth.getUser()).data.user?.id,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding vendor:', error);
        setValidationMessage('');
        showErrorToast('Failed to add vendor');
        return;
      }

      if (data) {
        const newVendor: Vendor = {
          id: data.id,
          name: data.name,
          accountNumber: data.account_number,
          ifscCode: data.ifsc_code,
          addedBy: data.added_by,
          status: data.status,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        setValidationMessage('');
        showSuccessToast('Vendor added successfully');
        onVendorAdded(newVendor);
        onClose();
      }
    } catch (error) {
      console.error('Error:', error);
      setValidationMessage('');
      showErrorToast('Failed to add vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear validation message when dialog closes
  const handleClose = () => {
    setValidationMessage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Add New Vendor
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ errors, touched, values, setFieldValue }) => (
            <Form className="p-6 space-y-4">
              {validationMessage && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    {validationMessage}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Name <span className="text-error-500">*</span>
                  </label>
                  <Field
                    as={Input}
                    name="name"
                    placeholder="Enter vendor name"
                    error={touched.name && errors.name}
                    fullWidth
                    required
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const upperValue = e.target.value.toUpperCase();
                      setFieldValue('name', upperValue);
                    }}
                    value={values.name}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Vendor name will be automatically converted to uppercase
                  </p>
                </div>

                <div className="space-y-1">
                  <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700">
                    Account Number
                  </label>
                  <Field
                    as={Input}
                    id="accountNumber"
                    name="accountNumber"
                    type="text"
                    fullWidth
                    placeholder="Enter account number"
                    value={values.accountNumber}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const numericValue = e.target.value.replace(/[^0-9]/g, '');
                      setFieldValue('accountNumber', numericValue);
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Only numbers are allowed (8-20 digits)
                  </p>
                  {errors.accountNumber && touched.accountNumber && (
                    <p className="text-sm text-red-600">{errors.accountNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IFSC Code <span className="text-error-500">*</span>
                  </label>
                  <Field
                    as={Input}
                    name="ifscCode"
                    placeholder="e.g., HDFC0001234"
                    error={touched.ifscCode && errors.ifscCode}
                    fullWidth
                    required
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const upperValue = e.target.value.toUpperCase();
                      setFieldValue('ifscCode', upperValue);
                    }}
                    value={values.ifscCode}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: 4 letters + 0 + 6 alphanumeric characters
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Adding...' : 'Add Vendor'}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default AddVendorDialog;
