import React from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

interface VendorFormProps {
  onSubmit: (values: VendorFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  initialValues?: VendorFormValues;
}

export interface VendorFormValues {
  name: string;
  account_number: string;
  ifsc_code: string;
  added_by: string;
}

const validationSchema = Yup.object().shape({
  name: Yup.string()
    .required('Vendor name is required')
    .min(2, 'Vendor name must be at least 2 characters'),
  account_number: Yup.string()
    .required('Account number is required')
    .matches(/^[0-9]+$/, 'Account number must contain only numbers')
    .min(8, 'Account number must be at least 8 digits')
    .max(20, 'Account number must not exceed 20 digits'),
  ifsc_code: Yup.string()
    .required('IFSC code is required')
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format')
});

const VendorForm: React.FC<VendorFormProps> = ({ onSubmit, onCancel, isSubmitting, initialValues }) => {
  return (
    <Formik
      initialValues={initialValues || {
        name: '',
        account_number: '',
        ifsc_code: '',
        added_by: ''
      }}
      validationSchema={validationSchema}
      onSubmit={onSubmit}
    >
      {({ errors, touched, values, setFieldValue, status }) => (
        <Form className="p-6">
          {status?.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 mb-6">
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{status.error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Vendor Information</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Vendor Name
                  </label>
                  <Field
                    as={Input}
                    id="name"
                    name="name"
                    type="text"
                    fullWidth
                    placeholder="Enter vendor name"
                    value={values.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const upperValue = e.target.value.toUpperCase();
                      setFieldValue('name', upperValue);
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Vendor name will be automatically converted to uppercase
                  </p>
                  {errors.name && touched.name && (
                    <p className="text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label htmlFor="account_number" className="block text-sm font-medium text-gray-700">
                    Account Number
                  </label>
                  <Field
                    as={Input}
                    id="account_number"
                    name="account_number"
                    type="text"
                    fullWidth
                    placeholder="Enter account number"
                    value={values.account_number}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const numericValue = e.target.value.replace(/[^0-9]/g, '');
                      setFieldValue('account_number', numericValue);
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Only numbers are allowed (8-20 digits)
                  </p>
                  {errors.account_number && touched.account_number && (
                    <p className="text-sm text-red-600">{errors.account_number}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label htmlFor="ifsc_code" className="block text-sm font-medium text-gray-700">
                    IFSC Code
                  </label>
                  <Field
                    as={Input}
                    id="ifsc_code"
                    name="ifsc_code"
                    type="text"
                    fullWidth
                    placeholder="Enter IFSC code"
                    value={values.ifsc_code}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const upperValue = e.target.value.toUpperCase();
                      setFieldValue('ifsc_code', upperValue);
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    IFSC code will be automatically converted to uppercase
                  </p>
                  {errors.ifsc_code && touched.ifsc_code && (
                    <p className="text-sm text-red-600">{errors.ifsc_code}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[100px]"
              >
                {isSubmitting ? 'Saving...' : initialValues ? 'Update Vendor' : 'Add Vendor'}
              </Button>
            </div>
          </div>
        </Form>
      )}
    </Formik>
  );
};

export default VendorForm; 