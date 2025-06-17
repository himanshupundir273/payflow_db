import React from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Eye, EyeOff } from 'lucide-react';

interface UserFormProps {
  onSubmit: (values: UserFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export interface UserFormValues {
  email: string;
  password: string;
  confirmPassword: string;
  role: 'user' | 'accounts';
  fullName: string;
}

const validationSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters long'),
  confirmPassword: Yup.string()
    .required('Please confirm your password')
    .oneOf([Yup.ref('password')], 'Passwords must match'),
  fullName: Yup.string()
    .required('Full name is required')
    .min(2, 'Full name must be at least 2 characters long'),
  role: Yup.string()
    .oneOf(['user', 'accounts'], 'Invalid role selected')
    .required('Role is required')
});

const UserForm: React.FC<UserFormProps> = ({ onSubmit, onCancel, isSubmitting }) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  return (
    <Formik
      initialValues={{
        email: '',
        password: '',
        confirmPassword: '',
        role: 'user',
        fullName: ''
      }}
      validationSchema={validationSchema}
      onSubmit={onSubmit}
    >
      {({ errors, touched, status, values }) => (
        <Form className="p-6">
          {status?.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 mb-6">
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{status.error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">User Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <Field
                    as={Input}
                    id="email"
                    name="email"
                    type="email"
                    fullWidth
                    placeholder="user@example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will be used for login and notifications
                  </p>
                  {errors.email && touched.email && (
                    <p className="text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                    Full Name
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <Field
                    as={Input}
                    id="fullName"
                    name="fullName"
                    type="text"
                    fullWidth
                    placeholder="John Doe"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the user's full name as it should appear in the system
                  </p>
                  {errors.fullName && touched.fullName && (
                    <p className="text-sm text-red-600">{errors.fullName}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <Field
                      as={Input}
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      fullWidth
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Must be at least 8 characters long
                  </p>
                  {errors.password && touched.password && (
                    <p className="text-sm text-red-600">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <Field
                      as={Input}
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      fullWidth
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Re-enter the password to confirm
                  </p>
                  {errors.confirmPassword && touched.confirmPassword && (
                    <p className="text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                    Role
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <Field
                    as="select"
                    id="role"
                    name="role"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-2.5 text-base transition-colors duration-200"
                  >
                    <option value="user">User</option>
                    <option value="accounts">Accounts</option>
                  </Field>
                  <p className="text-xs text-gray-500 mt-1">
                    Select the appropriate role for this user. This determines their access level.
                  </p>
                  {errors.role && touched.role && (
                    <p className="text-sm text-red-600">{errors.role}</p>
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
                {isSubmitting ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </div>
        </Form>
      )}
    </Formik>
  );
};

export default UserForm;
