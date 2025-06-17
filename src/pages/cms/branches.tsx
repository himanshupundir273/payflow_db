import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Pencil, MapPin, X } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { showSuccessToast, showErrorToast } from '../../lib/toast';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';

interface Branch {
  id: string;
  name: string;
  code: string;
  created_at: string;
  updated_at: string;
}

interface BranchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: { name: string; code: string }) => Promise<void>;
  initialValues?: { name: string; code: string };
  mode: 'add' | 'edit';
}

const BranchDialog = ({ isOpen, onClose, onSubmit, initialValues, mode }: BranchDialogProps) => {
  if (!isOpen) return null;

  const validationSchema = Yup.object({
    name: Yup.string().required('Name is required'),
    code: Yup.string()
      .required('Code is required')
      .max(10, 'Code must not exceed 10 characters')
      .matches(/^[A-Z]+$/, 'Code must be uppercase letters only')
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all m-4">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <MapPin className="h-5 w-5 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {mode === 'add' ? 'Add Branch' : 'Edit Branch'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Formik
          initialValues={initialValues || { name: '', code: '' }}
          validationSchema={validationSchema}
          onSubmit={async (values, { setSubmitting, resetForm }) => {
            try {
              await onSubmit(values);
              resetForm();
              onClose();
            } catch (error) {
              console.error('Error submitting form:', error);
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ errors, touched, isSubmitting, setFieldValue }) => (
            <Form className="px-6 py-5">
              <div className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Branch Name
                  </label>
                  <Field
                    type="text"
                    name="name"
                    id="name"
                    placeholder="Enter branch name"
                    className={`mt-1 block w-full px-4 py-2.5 rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-colors duration-200 ${
                      errors.name && touched.name ? 'border-red-300' : ''
                    }`}
                  />
                  {errors.name && touched.name && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center">
                      <span className="mr-1">•</span>
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                    Branch Code
                  </label>
                  <Field
                    type="text"
                    name="code"
                    id="code"
                    placeholder="Enter branch code"
                    className={`mt-1 block w-full px-4 py-2.5 rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm uppercase transition-colors duration-200 ${
                      errors.code && touched.code ? 'border-red-300' : ''
                    }`}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const value = e.target.value.toUpperCase();
                      setFieldValue('code', value);
                    }}
                  />
                  {errors.code && touched.code && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center">
                      <span className="mr-1">•</span>
                      {errors.code}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-gray-500">
                    Code must be uppercase letters only (max 10 characters)
                  </p>
                </div>
              </div>

              <div className="mt-8 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : mode === 'add' ? 'Add Branch' : 'Update Branch'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

const BranchesPage = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  const fetchBranches = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name');

      if (error) throw error;

      setBranches(data || []);
    } catch (err) {
      console.error('Error fetching branches:', err);
      setError('Failed to fetch branches');
      showErrorToast('Error fetching branches');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleAddBranch = async (values: { name: string; code: string }) => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .insert([values])
        .select()
        .single();

      if (error) throw error;

      setBranches([...branches, data]);
      showSuccessToast('Branch added successfully');
    } catch (err) {
      console.error('Error adding branch:', err);
      showErrorToast('Failed to add branch');
      throw err;
    }
  };

  const handleEditBranch = async (values: { name: string; code: string }) => {
    if (!selectedBranch) return;

    try {
      const { data, error } = await supabase
        .from('branches')
        .update(values)
        .eq('id', selectedBranch.id)
        .select()
        .single();

      if (error) throw error;

      setBranches(branches.map(branch => 
        branch.id === selectedBranch.id ? data : branch
      ));
      showSuccessToast('Branch updated successfully');
    } catch (err) {
      console.error('Error updating branch:', err);
      showErrorToast('Failed to update branch');
      throw err;
    }
  };

  const handleDialogSubmit = async (values: { name: string; code: string }) => {
    if (selectedBranch) {
      await handleEditBranch(values);
    } else {
      await handleAddBranch(values);
    }
  };

  const openAddDialog = () => {
    setSelectedBranch(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsDialogOpen(true);
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          <p className="font-medium">Error loading branches</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your branch information and details
            </p>
          </div>
          <Button
            onClick={openAddDialog}
            className="inline-flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Branch
          </Button>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
                        Loading branches...
                      </div>
                    </td>
                  </tr>
                ) : branches.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <MapPin className="h-12 w-12 text-gray-400 mb-2" />
                        <p className="text-gray-900 font-medium">No branches found</p>
                        <p className="text-gray-500">Get started by adding a new branch</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  branches.map((branch) => (
                    <tr key={branch.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
                            <MapPin className="h-6 w-6" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {branch.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {branch.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {branch.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(branch.updated_at).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(branch.updated_at).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openEditDialog(branch)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <Pencil className="w-4 h-4 mr-1.5" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <BranchDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedBranch(null);
        }}
        onSubmit={handleDialogSubmit}
        initialValues={selectedBranch ? { name: selectedBranch.name, code: selectedBranch.code } : undefined}
        mode={selectedBranch ? 'edit' : 'add'}
      />
    </div>
  );
};

export default BranchesPage; 