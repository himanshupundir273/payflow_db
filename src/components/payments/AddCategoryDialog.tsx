import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { showSuccessToast, showErrorToast } from '../../lib/toast';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';

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

interface AddCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryAdded: (category: Category) => void;
  initialCategoryName?: string;
}

const AddCategoryDialog: React.FC<AddCategoryDialogProps> = ({
  isOpen,
  onClose,
  onCategoryAdded,
  initialCategoryName = '',
}) => {
  const [name, setName] = useState(initialCategoryName);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user found');

      // Check if category already exists
      const { data: existingCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('name', name.trim())
        .single();

      if (existingCategory) {
        showErrorToast('A category with this name already exists');
        return;
      }

      // Insert new category
      const { data: newCategory, error: insertError } = await supabase
        .from('categories')
        .insert([
          {
            name: name.trim(),
            description: description.trim() || null,
            status: 'pending',
            added_by: user.id
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      if (newCategory) {
        onCategoryAdded(newCategory);
        onClose();
        resetForm();
        showSuccessToast('Category added successfully');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      showErrorToast('Failed to add category');
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <Card title="Add New Category">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Category Name <span className="text-error-500">*</span>
                </label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  placeholder="Enter category name"
                  required
                  fullWidth
                />
                <p className="text-xs text-gray-500 mt-1">
                  Category name will be automatically converted to uppercase
                </p>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <Input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description"
                  fullWidth
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                >
                  Add Category
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AddCategoryDialog; 