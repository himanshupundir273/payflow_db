import React, { useState, useEffect } from 'react';
import { CheckCircle2, Plus, X } from 'lucide-react';
import AddCategoryDialog from '../payments/AddCategoryDialog';

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

interface CategorySelectorProps {
  categories: Category[];
  loadingCategories: boolean;
  selectedCategoryName: string;
  selectedCategoryId: string | null;
  onCategoryChange: (categoryName: string, categoryId: string | null) => void;
  onCategoryAdded: (category: Category) => void;
  error?: string;
  touched?: boolean;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  loadingCategories,
  selectedCategoryName,
  selectedCategoryId,
  onCategoryChange,
  onCategoryAdded,
  error,
  touched,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);

  // Initialize filtered categories
  useEffect(() => {
    setFilteredCategories(categories);
  }, [categories]);

  // Filter categories based on input
  const filterCategories = (inputValue: string) => {
    const currentCategory = categories.find(cat => cat.id === selectedCategoryId);
    const filtered = categories.filter(
      (category) =>
        category.name.toLowerCase().includes(inputValue.toLowerCase()) ||
        (currentCategory && category.id === currentCategory.id)
    );
    setFilteredCategories(filtered);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const upperValue = event.target.value.toUpperCase();
    onCategoryChange(upperValue, null);
    setShowSuggestions(true);
    filterCategories(upperValue);
  };

  const handleCategorySelect = (category: Category) => {
    onCategoryChange(category.name, category.id);
    setShowSuggestions(false);
  };

  const handleInputFocus = () => {
    if (categories.length > 0) {
      setShowSuggestions(true);
      filterCategories(selectedCategoryId || '');
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleClearCategory = () => {
    onCategoryChange('', null);
    setShowSuggestions(false);
    setFilteredCategories(categories);
  };

  const handleCategoryAdded = (newCategory: Category) => {
    onCategoryAdded(newCategory);
    onCategoryChange(newCategory.name, newCategory.id);
  };

  return (
    <div className="flex flex-col relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Category <span className="text-error-500">*</span>
      </label>
      <div className="relative">
        <input
          type="text"
          value={selectedCategoryName}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          disabled={loadingCategories}
          placeholder={
            loadingCategories
              ? 'Loading categories...'
              : 'Type to search categories...'
          }
          className={`block w-full rounded-md border ${
            touched && error
              ? 'border-error-300'
              : 'border-gray-300'
          } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 pr-10 bg-white ${
            loadingCategories ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {selectedCategoryName && (
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

      {/* Category Suggestions Dropdown */}
      {showSuggestions && !loadingCategories && (
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
                    setShowSuggestions(false);
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
                No categories found matching "{selectedCategoryName}"
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
                      setShowSuggestions(false);
                    }, 0);
                  }}
                  className="w-full text-left px-0 py-2 text-primary-600 hover:bg-primary-50 focus:bg-primary-50 focus:outline-none font-medium rounded"
                >
                  <Plus className="h-4 w-4 inline mr-2" />
                  Add "{selectedCategoryName}" as New Category
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {touched && error && (
        <p className="mt-1 text-sm text-error-600">{error}</p>
      )}

      {/* Add Category Dialog */}
      <AddCategoryDialog
        isOpen={isAddCategoryDialogOpen}
        onClose={() => setIsAddCategoryDialogOpen(false)}
        onCategoryAdded={handleCategoryAdded}
        initialCategoryName={selectedCategoryName}
      />
    </div>
  );
};

export default CategorySelector; 