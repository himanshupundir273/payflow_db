import { create } from 'zustand';
import { User, UserRole } from '../types';
import { supabase, handleSupabaseError } from '../lib/supabase';
import { usePaymentStore } from '../store/paymentStore';
import { showErrorToast, showSuccessToast } from '../lib/toast';
import { withNetworkCheck } from '../lib/network';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<boolean>;
  changePassword: (newPassword: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  
  initializeAuth: async () => {
    const result = await withNetworkCheck(async () => {
      try {
        set({ isLoading: true });
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          handleSupabaseError(sessionError);
          return;
        }

        if (session?.user) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (userError) {
            handleSupabaseError(userError);
            return;
          }

          set({ 
            user: userData,
            isAuthenticated: true,
            isLoading: false 
          });
          
          // Don't fetch payments during initialization - they will be fetched
          // when the dashboard loads or user navigates to a page that needs them
          // This prevents duplicate API calls on app startup
        } else {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        showErrorToast('Failed to initialize authentication');
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    }, 'Failed to initialize authentication. Please check your internet connection.');

    return result || false;
  },
  
  login: async (email: string, password: string) => {
    const result = await withNetworkCheck(async () => {
      try {
        set({ isLoading: true });
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (authError) {
          handleSupabaseError(authError);
          return false;
        }

        if (!authData.user) {
          return false;
        }

        // Get user profile data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (userError) {
          handleSupabaseError(userError);
          return false;
        }

        // Check if user is inactive
        if (userData.status === 'inactive') {
          // Sign out the user since they're inactive
          await supabase.auth.signOut();
          showErrorToast('Your account has been deactivated. Please contact your administrator.');
          return false;
        }

        set({ 
          user: userData,
          isAuthenticated: true,
          isLoading: false 
        });

        // Fetch payments after successful login
        const { fetchPayments } = usePaymentStore.getState();
        await fetchPayments();
        
        return true;
      } catch (error) {
        console.error('Login error:', error);
        showErrorToast('Login failed. Please try again.');
        set({ isLoading: false });
        return false;
      }
    }, 'Login failed. Please check your internet connection.');

    return result || false;
  },
  
  logout: async () => {
    const result = await withNetworkCheck(async () => {
      try {
        set({ isLoading: true });
        const { error } = await supabase.auth.signOut();
        if (error) {
          handleSupabaseError(error);
          return;
        }
        set({ user: null, isAuthenticated: false, isLoading: false });
      } catch (error) {
        console.error('Logout error:', error);
        showErrorToast('Failed to logout. Please try again.');
        set({ isLoading: false });
      }
    }, 'Failed to logout. Please check your internet connection.');
  },
  
  changePassword: async (newPassword: string) => {
    const result = await withNetworkCheck(async () => {
      try {
        const { data, error } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (error) {
          handleSupabaseError(error);
          return false;
        }

        showSuccessToast('Password updated successfully. Please log in again.');
        
        // Logout user after successful password change for security
        setTimeout(async () => {
          const { error: logoutError } = await supabase.auth.signOut();
          if (logoutError) {
            console.error('Logout after password change failed:', logoutError);
          }
          set({ user: null, isAuthenticated: false, isLoading: false });
        }, 1000); // Small delay to show the success message
        
        return true;
      } catch (error) {
        console.error('Password change error:', error);
        showErrorToast('Failed to update password. Please try again.');
        set({ isLoading: false });
        return false;
      }
    }, 'Failed to update password. Please check your internet connection.');

    return result || false;
  },
}));