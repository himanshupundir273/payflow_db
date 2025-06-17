import { useState, useEffect } from 'react';
import { Plus, Search, ArrowLeft, CheckCircle2, Pencil } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { showSuccessToast, showErrorToast } from '../../lib/toast';
import CategoryForm, { CategoryFormValues } from './add/category';

interface Category {
  id: string;
  name: string;
  description: string | null;
  added_by: string | null;
  status: 'approved' | 'pending';
  created_at: string;
  updated_at: string;
  added_by_user?: {
    name: string;
  };
}

const CategoriesPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          added_by_user:users(name)
        `)
        .order('status', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      showErrorToast('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);


  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;

      setCategories(categories.map(category =>
        category.id === id
          ? { ...category, status: 'approved' }
          : category
      ));
      showSuccessToast('Category approved successfully');
    } catch (err) {
      console.error('Error approving category:', err);
      showErrorToast('Failed to approve category');
    }
  };

  const handleEditCategory = async (values: CategoryFormValues) => {
    if (!currentUserId || !editingCategory) {
      showErrorToast('User not authenticated or no category selected');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('categories')
        .update({
          name: values.name,
          description: values.description,
        })
        .eq('id', editingCategory.id);

      if (error) throw error;

      setShowAddForm(false);
      setEditingCategory(null);
      fetchCategories();
      showSuccessToast('Category updated successfully');
    } catch (err) {
      console.error('Error updating category:', err);
      showErrorToast('Failed to update category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCategory = async (values: CategoryFormValues) => {
    if (!currentUserId) {
      showErrorToast('User not authenticated');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('categories')
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
      fetchCategories();
      showSuccessToast('Category added successfully');
    } catch (err) {
      console.error('Error adding category:', err);
      showErrorToast('Failed to add category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (values: CategoryFormValues) => {
    if (editingCategory) {
      await handleEditCategory(values);
    } else {
      await handleAddCategory(values);
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.added_by_user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your categories
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingCategory(null);
              setShowAddForm(true);
            }}
            className="inline-flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>

        {showAddForm && (
          <Card className="mb-6">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingCategory(null);
                  }}
                  className="inline-flex items-center text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Categories
                </Button>
              </div>
            </div>
            <CategoryForm
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setShowAddForm(false);
                setEditingCategory(null);
              }}
              isSubmitting={isSubmitting}
              initialValues={editingCategory ? {
                name: editingCategory.name,
                description: editingCategory.description || ''
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
                    placeholder="Search categories..."
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
                    ) : filteredCategories.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          No categories found
                        </td>
                      </tr>
                    ) : (
                      filteredCategories.map((category) => (
                        <tr key={category.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {category.name}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">
                              {category.description || ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${
                              category.status === 'approved' 
                                ? 'text-green-600' 
                                : 'text-yellow-600'
                            }`}>
                              {category.status.charAt(0).toUpperCase() + category.status.slice(1)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {category.added_by_user?.name || 'Unknown'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {new Date(category.created_at).toLocaleDateString('en-GB', {
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
                                  setEditingCategory(category);
                                  setShowAddForm(true);
                                }}
                                className="inline-flex items-center text-blue-600 hover:text-blue-900"
                                variant="ghost"
                              >
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                              {category.status === 'pending' && (
                                <Button
                                  onClick={() => handleApprove(category.id)}
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

export default CategoriesPage; 