import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { showSuccessToast, showErrorToast } from '../../lib/toast';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { useAuthStore } from '../../store/authStore';

interface Subcategory {
  id: string;
  name: string;
  description: string;
  status: 'approved' | 'pending' | 'rejected';
  created_at: string;
  updated_at: string;
  added_by: string;
}

interface AddSubcategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubcategoryAdded: (subcategory: Subcategory,) => void;
  initialSubcategoryName?: string;
}

const AddSubcategoryDialog: React.FC<AddSubcategoryDialogProps> = ({
  isOpen,
  onClose,
  onSubcategoryAdded,
  initialSubcategoryName = '',
}) => {
  const { user } = useAuthStore();
  const [name, setName] = useState(initialSubcategoryName);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showErrorToast('Subcategory name is required');
      return;
    }

    if (!user) {
      showErrorToast('User not authenticated');
      return;
    }

    try {
      setIsSubmitting(true);

      // Check if subcategory already exists
      const { data: existingSubcategory } = await supabase
        .from('subcategories')
        .select('*')
        .eq('name', name.trim().toUpperCase())
        .single();

      if (existingSubcategory) {
        showErrorToast('A subcategory with this name already exists');
        return;
      }

      // Insert new subcategory
      const { data: newSubcategory, error } = await supabase
        .from('subcategories')
        .insert([
          {
            name: name.trim().toUpperCase(),
            description: description.trim(),
            status: 'pending',
            added_by: user.id
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (newSubcategory) {
        showSuccessToast('Subcategory added successfully');
        onSubcategoryAdded(newSubcategory);
        onClose();
        // Reset form
        setName('');
        setDescription('');
      }
    } catch (error) {
      console.error('Error adding subcategory:', error);
      showErrorToast('Failed to add subcategory');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <Card title="Add New Subcategory">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Subcategory Name <span className="text-error-500">*</span>
                </label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  placeholder="Enter subcategory name"
                  required
                  fullWidth
                />
                <p className="text-xs text-gray-500 mt-1">
                  Subcategory name will be automatically converted to uppercase
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
                  Add Subcategory
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AddSubcategoryDialog; 