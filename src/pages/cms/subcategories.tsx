import  { useState, useEffect } from 'react';
import { Plus, Search, ArrowLeft, CheckCircle2, Pencil } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { showSuccessToast, showErrorToast } from '../../lib/toast';
import SubcategoryForm, { SubcategoryFormValues } from './add/subcategory';

interface Subcategory {
  id: string;
  name: string;
  description: string;
  status: 'approved' | 'pending';
  added_by: string;
  created_at: string;
  updated_at: string;
  users?: {
    name: string;
  };
}

const SubcategoriesPage = () => {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);

  const fetchSubcategories = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('subcategories')
        .select(`
          *,
          users (
            name
          )
        `)
        .order('status', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSubcategories(data || []);
    } catch (err) {
      console.error('Error fetching subcategories:', err);
      showErrorToast('Failed to load subcategories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubcategories();
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('subcategories')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;

      setSubcategories(subcategories.map(sub =>
        sub.id === id
          ? { ...sub, status: 'approved' }
          : sub
      ));
      showSuccessToast('Subcategory approved successfully');
    } catch (err) {
      console.error('Error approving subcategory:', err);
      showErrorToast('Failed to approve subcategory');
    }
  };

  const handleEditSubcategory = async (values: SubcategoryFormValues) => {
    if (!currentUserId || !editingSubcategory) {
      showErrorToast('User not authenticated or no subcategory selected');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('subcategories')
        .update({
          name: values.name,
          description: values.description,
        })
        .eq('id', editingSubcategory.id);

      if (error) throw error;

      setShowAddForm(false);
      setEditingSubcategory(null);
      fetchSubcategories();
      showSuccessToast('Subcategory updated successfully');
    } catch (err) {
      console.error('Error updating subcategory:', err);
      showErrorToast('Failed to update subcategory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSubcategory = async (values: SubcategoryFormValues) => {
    if (!currentUserId) {
      showErrorToast('User not authenticated');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('subcategories')
        .insert([
          {
            name: values.name,
            description: values.description,
            status: 'approved',
            added_by: currentUserId
          }
        ]);

      if (error) throw error;

      setShowAddForm(false);
      fetchSubcategories();
      showSuccessToast('Subcategory added successfully');
    } catch (err) {
      console.error('Error adding subcategory:', err);
      showErrorToast('Failed to add subcategory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (values: SubcategoryFormValues) => {
    if (editingSubcategory) {
      await handleEditSubcategory(values);
    } else {
      await handleAddSubcategory(values);
    }
  };

  const filteredSubcategories = subcategories.filter(subcategory =>
    subcategory.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subcategory.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subcategory.users?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Subcategories</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your content subcategories
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingSubcategory(null);
              setShowAddForm(true);
            }}
            className="inline-flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Subcategory
          </Button>
        </div>

        {showAddForm && (
          <Card className="mb-6">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  {editingSubcategory ? 'Edit Subcategory' : 'Add New Subcategory'}
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingSubcategory(null);
                  }}
                  className="inline-flex items-center text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Subcategories
                </Button>
              </div>
            </div>
            <SubcategoryForm
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setShowAddForm(false);
                setEditingSubcategory(null);
              }}
              isSubmitting={isSubmitting}
              initialValues={editingSubcategory ? {
                name: editingSubcategory.name,
                description: editingSubcategory.description,
                status: editingSubcategory.status
              } : undefined}
            />
          </Card>
        )}

        {!showAddForm && (
          <>
            <Card className="mb-6">
              <div className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search subcategories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </Card>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
                <p className="font-medium">Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            )}

            <Card>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Added By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          Loading...
                        </td>
                      </tr>
                    ) : filteredSubcategories.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          No subcategories found
                        </td>
                      </tr>
                    ) : (
                      filteredSubcategories.map((subcategory) => (
                        <tr key={subcategory.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {subcategory.name}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">
                              {subcategory.description}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${
                              subcategory.status === 'approved' 
                                ? 'text-green-600' 
                                : 'text-yellow-600'
                            }`}>
                              {subcategory.status.charAt(0).toUpperCase() + subcategory.status.slice(1)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {subcategory.users?.name || 'Unknown'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {new Date(subcategory.created_at).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <Button
                                onClick={() => {
                                  setEditingSubcategory(subcategory);
                                  setShowAddForm(true);
                                }}
                                className="inline-flex items-center text-blue-600 hover:text-blue-900"
                                variant="ghost"
                              >
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                              {subcategory.status === 'pending' && (
                                <Button
                                  onClick={() => handleApprove(subcategory.id)}
                                  className="inline-flex items-center text-green-600 hover:text-green-900"
                                  variant="ghost"
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Approve
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default SubcategoriesPage; 