import { useState, useEffect } from 'react';
import { Plus, Search, CheckCircle2, ArrowLeft, Pencil } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import VendorForm, { VendorFormValues } from './add/vendor';
import { showSuccessToast, showErrorToast } from '../../lib/toast';

interface Vendor {
  id: string;
  name: string;
  account_number: string;
  ifsc_code: string;
  added_by: string;
  status: 'approved' | 'pending';
  created_at: string;
  updated_at: string;
  added_by_user?: {
    name: string;
  };
}

const VendorsPage = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const fetchVendors = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('vendors')
        .select(`
          *,
          added_by_user:users(name)
        `)
        .order('status', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Ensure all vendors have a status, defaulting to 'pending' if not set
      const vendorsWithStatus = data.map(vendor => ({
        ...vendor,
        status: vendor.status || 'pending'
      }));

      setVendors(vendorsWithStatus);
    } catch (err) {
      console.error('Error fetching vendors:', err);
      showErrorToast('Failed to load vendors');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    // Get current user ID
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;

      // Update the local state to reflect the change
      setVendors(vendors.map(vendor => 
        vendor.id === id 
          ? { ...vendor, status: 'approved' }
          : vendor
      ));
      showSuccessToast('Vendor approved successfully');
    } catch (err) {
      console.error('Error approving vendor:', err);
      showErrorToast('Failed to approve vendor');
    }
  };

  const handleAddVendor = async (values: VendorFormValues) => {
    if (!currentUserId) {
      showErrorToast('User not authenticated');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .insert([
          {
            name: values.name,
            account_number: values.account_number,
            ifsc_code: values.ifsc_code,
            status: 'approved',
            added_by: currentUserId
          }
        ]);

      if (error) throw error;

      setShowAddForm(false);
      fetchVendors();
      showSuccessToast('Vendor added successfully');
    } catch (err) {
      console.error('Error adding vendor:', err);
      showErrorToast('Failed to add vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditVendor = async (values: VendorFormValues) => {
    if (!editingVendor) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .update({
          name: values.name,
          account_number: values.account_number,
          ifsc_code: values.ifsc_code,
        })
        .eq('id', editingVendor.id);

      if (error) throw error;

      setEditingVendor(null);
      fetchVendors();
      showSuccessToast('Vendor updated successfully');
    } catch (err) {
      console.error('Error updating vendor:', err);
      showErrorToast('Failed to update vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectVendor = (vendorId: string, checked: boolean) => {
    if (checked && selectedVendors.length >= 10) {
      showErrorToast('Maximum 10 vendors can be selected at once');
      return;
    }
    if (checked) {
      setSelectedVendors([...selectedVendors, vendorId]);
    } else {
      setSelectedVendors(selectedVendors.filter(id => id !== vendorId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pendingVendorIds = filteredVendors
        .filter(vendor => vendor.status === 'pending')
        .map(vendor => vendor.id)
        .slice(0, 10); // Only take first 10 vendors
      setSelectedVendors(pendingVendorIds);
      if (pendingVendorIds.length > 0) {
        showSuccessToast(`Selected first ${pendingVendorIds.length} pending vendors`);
      }
    } else {
      setSelectedVendors([]);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedVendors.length === 0) return;
    setShowConfirmDialog(true);
  };

  const confirmBulkApprove = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ status: 'approved' })
        .in('id', selectedVendors);

      if (error) throw error;

      setVendors(vendors.map(vendor => 
        selectedVendors.includes(vendor.id)
          ? { ...vendor, status: 'approved' }
          : vendor
      ));
      setSelectedVendors([]);
      showSuccessToast(`${selectedVendors.length} vendor(s) approved successfully`);
    } catch (err) {
      console.error('Error approving vendors:', err);
      showErrorToast('Failed to approve vendors');
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  const filteredVendors = vendors
    .filter(vendor => {
      const matchesSearch = 
        vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.account_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.ifsc_code.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

  const pendingCount = vendors.filter(v => v.status === 'pending').length;
  const approvedCount = vendors.filter(v => v.status === 'approved').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
            <div className="mt-1 flex items-center space-x-4">
              <p className="text-sm text-gray-500">
                Manage your vendors
              </p>
            </div>
          </div>
          {!showAddForm && !editingVendor && (
            <Button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Vendor
            </Button>
          )}
        </div>

        {(showAddForm || editingVendor) && (
          <Card className="mb-6">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingVendor(null);
                  }}
                  className="inline-flex items-center text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Vendors
                </Button>
              </div>
            </div>
            <VendorForm
              onSubmit={editingVendor ? handleEditVendor : handleAddVendor}
              onCancel={() => {
                setShowAddForm(false);
                setEditingVendor(null);
              }}
              isSubmitting={isSubmitting}
              initialValues={editingVendor ? {
                name: editingVendor.name,
                account_number: editingVendor.account_number,
                ifsc_code: editingVendor.ifsc_code,
                added_by: editingVendor.added_by
              } : undefined}
            />
          </Card>
        )}

        {!showAddForm && !editingVendor && (
          <>
            <Card className="mb-6">
              <div className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search vendors..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={statusFilter === 'all' ? 'primary' : 'ghost'}
                      onClick={() => setStatusFilter('all')}
                      className={`min-w-[100px] ${statusFilter === 'all' ? 'bg-gray-900 text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      All ({vendors.length})
                    </Button>
                    <Button
                      variant={statusFilter === 'pending' ? 'primary' : 'ghost'}
                      onClick={() => setStatusFilter('pending')}
                      className={`min-w-[100px] ${statusFilter === 'pending' ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'text-yellow-600 hover:text-yellow-900'}`}
                    >
                      Pending ({pendingCount})
                    </Button>
                    <Button
                      variant={statusFilter === 'approved' ? 'primary' : 'ghost'}
                      onClick={() => setStatusFilter('approved')}
                      className={`min-w-[100px] ${statusFilter === 'approved' ? 'bg-green-500 text-white hover:bg-green-600' : 'text-green-600 hover:text-green-900'}`}
                    >
                      Approved ({approvedCount})
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="overflow-x-auto">
                {selectedVendors.length > 0 && (
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        {selectedVendors.length} vendor(s) selected
                      </div>
                      <div className="flex items-center space-x-3">
                        <Button
                          onClick={handleBulkApprove}
                          disabled={isSubmitting}
                          className="inline-flex items-center text-green-600 hover:text-green-900"
                          variant="ghost"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          {isSubmitting ? 'Approving...' : 'Approve Selected'}
                        </Button>
                        <Button
                          onClick={() => setSelectedVendors([])}
                          className="inline-flex items-center text-red-600 hover:text-red-900"
                          variant="ghost"
                        >
                          Clear Selection
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {statusFilter === 'pending' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            checked={selectedVendors.length === filteredVendors.filter(v => v.status === 'pending').length}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                          />
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IFSC Code
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isLoading ? (
                      <tr>
                        <td colSpan={statusFilter === 'pending' ? 9 : 8} className="px-6 py-4 text-center text-gray-500">
                          Loading...
                        </td>
                      </tr>
                    ) : filteredVendors.length === 0 ? (
                      <tr>
                        <td colSpan={statusFilter === 'pending' ? 9 : 8} className="px-6 py-4 text-center text-gray-500">
                          No vendors found
                        </td>
                      </tr>
                    ) : (
                      filteredVendors.map((vendor, index) => (
                        <tr key={vendor.id} className="hover:bg-gray-50">
                          {statusFilter === 'pending' && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              {vendor.status === 'pending' && (
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                  checked={selectedVendors.includes(vendor.id)}
                                  onChange={(e) => handleSelectVendor(vendor.id, e.target.checked)}
                                />
                              )}
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {index + 1}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {vendor.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {vendor.account_number}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {vendor.ifsc_code}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${
                              vendor.status === 'approved' 
                                ? 'text-green-600' 
                                : 'text-yellow-600'
                            }`}>
                              {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {vendor.added_by_user?.name || 'Unknown'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {new Date(vendor.created_at).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-3">
                              <Button
                                onClick={() => setEditingVendor(vendor)}
                                variant="ghost"
                                className="text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                              >
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                              {vendor.status === 'pending' && (
                                <Button
                                  onClick={() => handleApprove(vendor.id)}
                                  variant="ghost"
                                  className="text-green-600 hover:text-green-900 hover:bg-green-50"
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

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Confirm Approval
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to approve {selectedVendors.length} selected vendor(s)?
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={confirmBulkApprove}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isSubmitting ? 'Approving...' : 'Confirm Approval'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorsPage; 