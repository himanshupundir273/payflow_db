import React from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

interface CategoryFormProps {
  onSubmit: (values: CategoryFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  initialValues?: CategoryFormValues;
}

export interface CategoryFormValues {
  name: string;
  description: string;
}

const validationSchema = Yup.object().shape({
  name: Yup.string()
    .required('Category name is required')
    .min(2, 'Category name must be at least 2 characters'),
  description: Yup.string()
    .required('Description is required')
    .min(3, 'Description must be at least 3 characters')
});

const CategoryForm: React.FC<CategoryFormProps> = ({ 
  onSubmit, 
  onCancel, 
  isSubmitting,
  initialValues 
}) => {
  return (
    <Formik
      initialValues={initialValues || {
        name: '',
        description: ''
      }}
      validationSchema={validationSchema}
      onSubmit={onSubmit}
    >
      {({ errors, touched, status }) => (
        <Form className="p-6">
          {status?.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 mb-6">
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{status.error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Category Information</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Category Name
                  </label>
                  <Field
                    as={Input}
                    id="name"
                    name="name"
                    type="text"
                    fullWidth
                    placeholder="Enter category name"
                  />
                  {errors.name && touched.name && (
                    <p className="text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <Field
                    as={Input}
                    id="description"
                    name="description"
                    type="text"
                    fullWidth
                    placeholder="Enter category description"
                  />
                  {errors.description && touched.description && (
                    <p className="text-sm text-red-600">{errors.description}</p>
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
                {isSubmitting ? 'Saving...' : initialValues ? 'Save Changes' : 'Add Category'}
              </Button>
            </div>
          </div>
        </Form>
      )}
    </Formik>
  );
};

export default CategoryForm;
