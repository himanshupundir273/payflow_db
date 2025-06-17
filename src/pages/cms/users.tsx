import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { UserPlus, ArrowLeft, CheckCircle2, Users, Search, UserX, KeyRound, Eye, EyeOff } from 'lucide-react';
import Button from '../../components/ui/Button';
import { showErrorToast, showSuccessToast } from '../../lib/toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import UserForm, { UserFormValues } from './add/user';
import Input from '../../components/ui/Input';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  status: 'active' | 'inactive';
  updated_at?: string;
}

const UsersPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
  const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false);
  const [userToReactivate, setUserToReactivate] = useState<User | null>(null);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    fetchUsers();
    // Get current user ID
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        setCurrentUser(userData);
      }
    };
    getCurrentUser();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
      setUsers(data || []);
    } catch (err) {
      console.error('Fetch users error:', err);
      showErrorToast(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSubmit = async (values: UserFormValues) => {
    setLoading(true);

    try {
      // Check if current user has admin or accounts role
      if (!currentUser?.role || !['admin', 'accounts'].includes(currentUser.role)) {
        throw new Error('Only users with admin or accounts role can create new users');
      }

      // Store current session
      const { data: { session } } = await supabase.auth.getSession();
      const currentSession = session;

      // Create the user with auto-confirm enabled
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            name: values.fullName,
            role: values.role,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // Then, create the user profile in the users table
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email: values.email,
            name: values.fullName,
            role: values.role,
            company: 'abc',
            created_at: new Date().toISOString(),
            status: 'active'
          },
        ]);

      if (profileError) {
        // If profile creation fails, we should clean up the auth user
        await supabase.auth.signOut();
        throw profileError;
      }

      // Restore the original session
      if (currentSession) {
        await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        });
      }

      showSuccessToast('User created successfully');
      
      // Close the form and refresh the users list
      setShowAddForm(false);
      fetchUsers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while creating the user';
      showErrorToast(errorMessage);
      throw err; // Re-throw to let Formik handle the error
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateClick = (user: User) => {
    setUserToDeactivate(user);
    setIsDeactivateDialogOpen(true);
  };

  const handleDeactivateConfirm = async () => {
    if (!userToDeactivate) return;

    try {
      // Prevent self-deactivation
      if (userToDeactivate.id === currentUserId) {
        showErrorToast('You cannot deactivate your own account');
        return;
      }

      // Check current user's role
      if (!currentUser?.role || !['admin', 'accounts'].includes(currentUser.role)) {
        showErrorToast('Only admin and accounts users can deactivate users');
        return;
      }

      console.log('Attempting to deactivate user:', userToDeactivate.id);

      const now = new Date().toISOString();

      // First, verify the user exists and get current status
      const { data: existingUser, error: initialFetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userToDeactivate.id)
        .single();

      if (initialFetchError) {
        console.error('Error fetching user:', initialFetchError);
        throw new Error('Failed to fetch user details');
      }

      if (!existingUser) {
        throw new Error('User not found');
      }

      console.log('Current user status:', existingUser.status);

      // Update user status
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          status: 'inactive',
          updated_at: now
        })
        .eq('id', userToDeactivate.id);

      if (updateError) {
        console.error('Error updating user status:', updateError);
        throw updateError;
      }

      // Add a small delay to ensure the update is processed
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fetch the updated user data
      const { data: updatedUser, error: verifyFetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userToDeactivate.id)
        .maybeSingle();

      if (verifyFetchError) {
        console.error('Error fetching updated user:', verifyFetchError);
        throw new Error('Failed to verify user status update');
      }

      if (!updatedUser) {
        console.error('No user data returned after update');
        throw new Error('Failed to verify user status update');
      }

      console.log('User data after update:', updatedUser);

      if (updatedUser.status !== 'inactive') {
        console.error('Status verification failed:', updatedUser);
        throw new Error('User status was not updated correctly');
      }

      // Update the local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userToDeactivate.id 
            ? { ...user, status: 'inactive', updated_at: now } 
            : user
        )
      );

      showSuccessToast('User deactivated successfully');
    } catch (err) {
      console.error('Deactivation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to deactivate user';
      showErrorToast(errorMessage);
    } finally {
      setIsDeactivateDialogOpen(false);
      setUserToDeactivate(null);
    }
  };

  const handleReactivateClick = (user: User) => {
    setUserToReactivate(user);
    setIsReactivateDialogOpen(true);
  };

  const handleReactivateConfirm = async () => {
    if (!userToReactivate) return;

    try {
      // Check current user's role
      if (!currentUser?.role || !['admin', 'accounts'].includes(currentUser.role)) {
        showErrorToast('Only admin and accounts users can reactivate users');
        return;
      }

      const now = new Date().toISOString();

      // Update user status
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          status: 'active',
          updated_at: now
        })
        .eq('id', userToReactivate.id);

      if (updateError) {
        console.error('Error updating user status:', updateError);
        throw updateError;
      }

      // Update the local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userToReactivate.id 
            ? { ...user, status: 'active', updated_at: now } 
            : user
        )
      );

      showSuccessToast('User reactivated successfully');
    } catch (err) {
      console.error('Reactivation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to reactivate user';
      showErrorToast(errorMessage);
    } finally {
      setIsReactivateDialogOpen(false);
      setUserToReactivate(null);
    }
  };

  const handleResetPasswordClick = (user: User) => {
    setUserToResetPassword(user);
    setNewPassword('');
    setShowPassword(false);
    setIsResetPasswordDialogOpen(true);
  };

  const handleResetPasswordConfirm = async () => {
    if (!userToResetPassword) return;

    try {
      setIsResetting(true);
      // Check current user's role
      if (!currentUser?.role || !['admin', 'accounts'].includes(currentUser.role)) {
        showErrorToast('Only admin and accounts users can reset passwords');
        return;
      }

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token found');
      }

      // Call the Edge Function to reset password
      const response = await fetch('https://wqvwsjqqvqcgbrnbqepu.supabase.co/functions/v1/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: userToResetPassword.email,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      showSuccessToast('Password has been reset successfully');
      setIsResetPasswordDialogOpen(false);
      setUserToResetPassword(null);
      setNewPassword('');
    } catch (err) {
      console.error('Password reset error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password';
      showErrorToast(errorMessage);
    } finally {
      setIsResetting(false);
    }
  };

  const filteredUsers = users
    .filter(user => user.id !== currentUserId) // Exclude current user
    .filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.status.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage user accounts and permissions
            </p>
            {currentUser && (
              <div className="mt-2 flex items-center space-x-2">
                <div className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                  currentUser.role === 'admin' 
                    ? 'bg-indigo-100 text-indigo-800'
                    : currentUser.role === 'accounts'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
                </div>
                <span className="text-xs text-gray-500">
                  Logged in as {currentUser.name}
                </span>
              </div>
            )}
          </div>
          {!showAddForm && (
            <Button
              onClick={() => setShowAddForm(true)}
              className="flex items-center w-full sm:w-auto justify-center"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add New User
            </Button>
          )}
        </div>

        {showAddForm ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                    <UserPlus className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-xl font-semibold text-gray-900">Add New User</h2>
                    <p className="text-sm text-gray-500 mt-1">Create a new user account with specific permissions</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setShowAddForm(false)}
                  className="flex items-center text-gray-600 hover:text-gray-900 w-full sm:w-auto justify-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Users List
                </Button>
              </div>
            </div>

            <UserForm
              onSubmit={handleSubmit}
              onCancel={() => setShowAddForm(false)}
              isSubmitting={loading}
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">All Users</h2>
            </div>
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Updated At
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoadingUsers ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-2"></div>
                          Loading users...
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                        <div className="flex flex-col items-center justify-center">
                          <Users className="h-8 w-8 text-gray-400 mb-2" />
                          <p>No users found</p>
                          {searchQuery && (
                            <p className="text-xs text-gray-400 mt-1">
                              Try adjusting your search query
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === 'admin' 
                              ? 'bg-indigo-100 text-indigo-800'
                              : user.role === 'accounts'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`inline-flex items-center px-3 py-1.5 rounded-md ${
                            user.status === 'active'
                              ? 'bg-green-50 border border-green-200 text-green-700'
                              : 'bg-red-50 border border-red-200 text-red-700'
                          }`}>
                            <span className={`h-2 w-2 rounded-full mr-2 ${
                              user.status === 'active'
                                ? 'bg-green-500'
                                : 'bg-red-500'
                            }`}></span>
                            <span className="text-sm font-medium">
                              {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.updated_at ? new Date(user.updated_at).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          }) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleResetPasswordClick(user)}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                              title="Reset password"
                            >
                              <KeyRound className="h-4 w-4 mr-1.5" />
                              Reset Password
                            </button>
                            {user.status === 'active' && user.id !== currentUserId && (
                              <button
                                onClick={() => handleDeactivateClick(user)}
                                className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                                title="Deactivate user"
                              >
                                <UserX className="h-4 w-4 mr-1.5" />
                                Deactivate
                              </button>
                            )}
                            {user.status === 'inactive' && (
                              <button
                                onClick={() => handleReactivateClick(user)}
                                className="inline-flex items-center px-3 py-1.5 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                                title="Reactivate user"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={isDeactivateDialogOpen}
        title="Deactivate User"
        message={
          userToDeactivate ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Are you sure you want to deactivate this user? They will not be able to log in until reactivated.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium">
                    {userToDeactivate.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-900">{userToDeactivate.name}</h4>
                    <p className="text-sm text-gray-500">{userToDeactivate.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                    userToDeactivate.role === 'admin' 
                      ? 'bg-indigo-100 text-indigo-800'
                      : userToDeactivate.role === 'accounts'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {userToDeactivate.role.charAt(0).toUpperCase() + userToDeactivate.role.slice(1)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Created on {new Date(userToDeactivate.created_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : null
        }
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        onConfirm={handleDeactivateConfirm}
        onCancel={() => {
          setIsDeactivateDialogOpen(false);
          setUserToDeactivate(null);
        }}
      />

      <ConfirmDialog
        isOpen={isReactivateDialogOpen}
        title="Reactivate User"
        message={
          userToReactivate ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Are you sure you want to reactivate this user? They will be able to log in again.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium">
                    {userToReactivate.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-900">{userToReactivate.name}</h4>
                    <p className="text-sm text-gray-500">{userToReactivate.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                    userToReactivate.role === 'admin' 
                      ? 'bg-indigo-100 text-indigo-800'
                      : userToReactivate.role === 'accounts'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {userToReactivate.role.charAt(0).toUpperCase() + userToReactivate.role.slice(1)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Created on {new Date(userToReactivate.created_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : null
        }
        confirmLabel="Reactivate"
        cancelLabel="Cancel"
        onConfirm={handleReactivateConfirm}
        onCancel={() => {
          setIsReactivateDialogOpen(false);
          setUserToReactivate(null);
        }}
      />

      <ConfirmDialog
        isOpen={isResetPasswordDialogOpen}
        title="Reset User Password"
        message={
          userToResetPassword ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Enter a new password for this user.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium">
                    {userToResetPassword.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-900">{userToResetPassword.name}</h4>
                    <p className="text-sm text-gray-500">{userToResetPassword.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                    userToResetPassword.role === 'admin' 
                      ? 'bg-indigo-100 text-indigo-800'
                      : userToResetPassword.role === 'accounts'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {userToResetPassword.role.charAt(0).toUpperCase() + userToResetPassword.role.slice(1)}
                  </div>
                </div>
                <div className="mt-4 w-full">
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <div className="relative w-full">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      minLength={6}
                      className="w-full pr-10"
                      autoComplete="new-password"
                      style={{ width: '100%' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null
        }
        confirmLabel={isResetting ? "Resetting..." : "Reset Password"}
        cancelLabel="Cancel"
        onConfirm={handleResetPasswordConfirm}
        onCancel={() => {
          setIsResetPasswordDialogOpen(false);
          setUserToResetPassword(null);
          setNewPassword('');
        }}
      />
    </div>
  );
};

export default UsersPage; 