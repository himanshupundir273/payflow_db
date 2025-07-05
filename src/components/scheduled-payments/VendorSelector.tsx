import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { Vendor } from '../../types';
import AddVendorDialog from '../payments/AddVendorDialog';

interface VendorSelectorProps {
  vendors: Vendor[];
  loadingVendors: boolean;
  selectedVendorName: string;
  accountNumber: string;
  ifscCode: string;
  onVendorChange: (vendorName: string, vendorId: string | null) => void;
  onVendorAdded: (vendor: Vendor) => void;
  error?: string;
  touched?: boolean;
}

const VendorSelector: React.FC<VendorSelectorProps> = ({
  vendors,
  loadingVendors,
  selectedVendorName,
  accountNumber,
  ifscCode,
  onVendorChange,
  onVendorAdded,
  error,
  touched,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [isAddVendorDialogOpen, setIsAddVendorDialogOpen] = useState(false);

  // Initialize filtered vendors
  useEffect(() => {
    setFilteredVendors(vendors);
  }, [vendors]);

  // Filter vendors based on input
  const filterVendors = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredVendors(vendors);
      return;
    }

    const filtered = vendors.filter((vendor) =>
      vendor.name.toUpperCase().includes(searchTerm.toUpperCase())
    );
    setFilteredVendors(filtered);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const upperValue = event.target.value.toUpperCase();
    onVendorChange(upperValue, null);
    setShowSuggestions(true);
    filterVendors(upperValue);
  };

  const handleVendorSelect = (vendor: Vendor) => {
    onVendorChange(vendor.name, vendor.id);
    setShowSuggestions(false);
  };

  const handleInputFocus = () => {
    if (vendors.length > 0) {
      setShowSuggestions(true);
      filterVendors(selectedVendorName || '');
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleClearVendor = () => {
    onVendorChange('', null);
    setShowSuggestions(false);
  };

  const handleVendorAdded = (newVendor: Vendor) => {
    onVendorAdded(newVendor);
    onVendorChange(newVendor.name, newVendor.id);
  };

  return (
    <div className="space-y-4">
      {/* Vendor Name Field */}
      <div className="flex flex-col relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Vendor Name <span className="text-error-500">*</span>
        </label>
        <div className="relative">
        <input
          type="text"
          value={selectedVendorName}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          disabled={loadingVendors}
          placeholder={
            loadingVendors
              ? 'Loading vendors...'
              : 'Type to search vendors...'
          }
          className={`block w-full rounded-md border ${
            touched && error
              ? 'border-error-300'
              : 'border-gray-300'
          } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 pr-10 bg-white ${
            loadingVendors ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {selectedVendorName ? (
            <button
              type="button"
              onClick={handleClearVendor}
              className="h-4 w-4 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Vendor Suggestions Dropdown */}
      {showSuggestions && !loadingVendors && (
        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto top-full">
          {filteredVendors.length > 0 ? (
            <>
              {filteredVendors.map((vendor) => (
                <button
                  key={vendor.id}
                  type="button"
                  onClick={() => handleVendorSelect(vendor)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  <div className="font-medium text-gray-900 flex items-center">
                    {vendor.name}
                    {vendor.status === 'approved' && (
                      <svg
                        className="ml-2 h-4 w-4 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {vendor.accountNumber} • {vendor.ifscCode}
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
                    setIsAddVendorDialogOpen(true);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-4 py-2 text-primary-600 hover:bg-primary-50 focus:bg-primary-50 focus:outline-none font-medium"
                >
                  <Plus className="h-4 w-4 inline mr-2" />
                  Add New Vendor
                </button>
              </div>
            </>
          ) : (
            <div className="px-4 py-2">
              <div className="text-gray-500 text-center py-2">
                No vendors found matching "{selectedVendorName}"
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
                      setIsAddVendorDialogOpen(true);
                      setShowSuggestions(false);
                    }, 0);
                  }}
                  className="w-full text-left px-0 py-2 text-primary-600 hover:bg-primary-50 focus:bg-primary-50 focus:outline-none font-medium rounded"
                >
                  <Plus className="h-4 w-4 inline mr-2" />
                  Add "{selectedVendorName}" as New Vendor
                </button>
              </div>
            </div>
          )}
        </div>
      )}

        {touched && error && (
          <p className="mt-1 text-sm text-error-600">{error}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Type to search vendors or add new one
        </p>

        {/* Add Vendor Dialog */}
        <AddVendorDialog
          isOpen={isAddVendorDialogOpen}
          onClose={() => setIsAddVendorDialogOpen(false)}
          onVendorAdded={handleVendorAdded}
          initialVendorName={selectedVendorName}
        />
      </div>

      {/* Account Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Account Number (Auto-filled) */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Number{' '}
            <span className="text-gray-400">(Auto-filled)</span>
          </label>
          <input
            type="text"
            value={accountNumber}
            disabled
            className="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-500 sm:text-sm"
            placeholder="Select vendor to view account number"
          />
        </div>

        {/* IFSC Code (Auto-filled) */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            IFSC Code{' '}
            <span className="text-gray-400">(Auto-filled)</span>
          </label>
          <input
            type="text"
            value={ifscCode}
            disabled
            className="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-500 sm:text-sm"
            placeholder="Select vendor to view IFSC code"
          />
        </div>
      </div>
    </div>
  );
};

export default VendorSelector; 