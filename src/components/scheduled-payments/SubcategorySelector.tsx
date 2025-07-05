import React, { useState, useEffect } from 'react';
import { CheckCircle2, Plus, X } from 'lucide-react';
import AddSubcategoryDialog from '../payments/AddSubcategoryDialog';

interface Subcategory {
  id: string;
  name: string;
  description: string;
  status?: 'approved' | 'pending' | 'rejected';
  created_at: string;
  updated_at: string;
}

interface SubcategorySelectorProps {
  subcategories: Subcategory[];
  loadingSubcategories: boolean;
  selectedSubcategoryName: string;
  selectedSubcategoryId: string | null;
  onSubcategoryChange: (subcategoryName: string, subcategoryId: string | null) => void;
  onSubcategoryAdded: (subcategory: Subcategory) => void;
  error?: string;
  touched?: boolean;
}

const SubcategorySelector: React.FC<SubcategorySelectorProps> = ({
  subcategories,
  loadingSubcategories,
  selectedSubcategoryName,
  selectedSubcategoryId,
  onSubcategoryChange,
  onSubcategoryAdded,
  error,
  touched,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [isAddSubcategoryDialogOpen, setIsAddSubcategoryDialogOpen] = useState(false);

  // Initialize filtered subcategories
  useEffect(() => {
    setFilteredSubcategories(subcategories);
  }, [subcategories]);

  // Filter subcategories based on input
  const filterSubcategories = (inputValue: string) => {
    const currentSubcategory = subcategories.find(sub => sub.id === selectedSubcategoryId);
    const filtered = subcategories.filter(
      (subcategory) =>
        subcategory.name.toLowerCase().includes(inputValue.toLowerCase()) ||
        (currentSubcategory && subcategory.id === currentSubcategory.id)
    );
    setFilteredSubcategories(filtered);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const upperValue = event.target.value.toUpperCase();
    onSubcategoryChange(upperValue, null);
    setShowSuggestions(true);
    filterSubcategories(upperValue);
  };

  const handleSubcategorySelect = (subcategory: Subcategory) => {
    onSubcategoryChange(subcategory.name, subcategory.id);
    setShowSuggestions(false);
  };

  const handleInputFocus = () => {
    if (subcategories.length > 0) {
      setShowSuggestions(true);
      filterSubcategories(selectedSubcategoryId || '');
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleClearSubcategory = () => {
    onSubcategoryChange('', null);
    setShowSuggestions(false);
    setFilteredSubcategories(subcategories);
  };

  const handleSubcategoryAdded = (newSubcategory: Subcategory) => {
    onSubcategoryAdded(newSubcategory);
    onSubcategoryChange(newSubcategory.name, newSubcategory.id);
  };

  return (
    <div className="flex flex-col relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Sub-category <span className="text-error-500">*</span>
      </label>
      <div className="relative">
        <input
          type="text"
          value={selectedSubcategoryName}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          disabled={loadingSubcategories}
          placeholder={
            loadingSubcategories
              ? 'Loading sub-categories...'
              : 'Type to search sub-categories...'
          }
          className={`block w-full rounded-md border ${
            touched && error
              ? 'border-error-300'
              : 'border-gray-300'
          } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 pr-10 bg-white ${
            loadingSubcategories ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {selectedSubcategoryName && (
            <button
              type="button"
              onClick={handleClearSubcategory}
              className="h-4 w-4 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Subcategory Suggestions Dropdown */}
      {showSuggestions && !loadingSubcategories && (
        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto top-full">
          {filteredSubcategories.length > 0 ? (
            <>
              {filteredSubcategories.map((subcategory) => (
                <button
                  key={subcategory.id}
                  type="button"
                  onClick={() => handleSubcategorySelect(subcategory)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  <div className="font-medium text-gray-900 flex items-center">
                    {subcategory.name}
                    {subcategory.status === 'approved' && (
                      <CheckCircle2 className="ml-2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {subcategory.description}
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
                    setIsAddSubcategoryDialogOpen(true);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-4 py-2 text-primary-600 hover:bg-primary-50 focus:bg-primary-50 focus:outline-none font-medium"
                >
                  <Plus className="h-4 w-4 inline mr-2" />
                  Add New Sub-category
                </button>
              </div>
            </>
          ) : (
            <div className="px-4 py-2">
              <div className="text-gray-500 text-center py-2">
                No sub-categories found matching "{selectedSubcategoryName}"
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
                      setIsAddSubcategoryDialogOpen(true);
                      setShowSuggestions(false);
                    }, 0);
                  }}
                  className="w-full text-left px-0 py-2 text-primary-600 hover:bg-primary-50 focus:bg-primary-50 focus:outline-none font-medium rounded"
                >
                  <Plus className="h-4 w-4 inline mr-2" />
                  Add "{selectedSubcategoryName}" as New Sub-category
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {touched && error && (
        <p className="mt-1 text-sm text-error-600">{error}</p>
      )}

      {/* Add Subcategory Dialog */}
      <AddSubcategoryDialog
        isOpen={isAddSubcategoryDialogOpen}
        onClose={() => setIsAddSubcategoryDialogOpen(false)}
        onSubcategoryAdded={handleSubcategoryAdded}
        initialSubcategoryName={selectedSubcategoryName}
      />
    </div>
  );
};

export default SubcategorySelector; 