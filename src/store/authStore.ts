import { create } from 'zustand';
import { User, UserRole } from '../types';
import { supabase, handleSupabaseError } from '../lib/supabase';
import { usePaymentStore } from '../store/paymentStore';
import { showErrorToast, showSuccessToast } from '../lib/toast';
import { withNetworkCheck } from '../lib/network';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  
  initializeAuth: async () => {
    const result = await withNetworkCheck(async () => {
      try {
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
            isAuthenticated: true 
          });
          
          // Don't fetch payments during initialization - they will be fetched
          // when the dashboard loads or user navigates to a page that needs them
          // This prevents duplicate API calls on app startup
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        showErrorToast('Failed to initialize authentication');
      }
    }, 'Failed to initialize authentication. Please check your internet connection.');
  },
  
  login: async (email: string, password: string) => {
    const result = await withNetworkCheck(async () => {
      try {
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

        set({ 
          user: userData,
          isAuthenticated: true 
        });

        // Fetch payments after successful login
        const { fetchPayments } = usePaymentStore.getState();
        await fetchPayments();
        
        return true;
      } catch (error) {
        console.error('Login error:', error);
        showErrorToast('Login failed. Please try again.');
        return false;
      }
    }, 'Login failed. Please check your internet connection.');

    return result || false;
  },
  
  logout: async () => {
    const result = await withNetworkCheck(async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          handleSupabaseError(error);
          return;
        }
        set({ user: null, isAuthenticated: false });
      } catch (error) {
        console.error('Logout error:', error);
        showErrorToast('Failed to logout. Please try again.');
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
          set({ user: null, isAuthenticated: false });
        }, 1000); // Small delay to show the success message
        
        return true;
      } catch (error) {
        console.error('Password change error:', error);
        showErrorToast('Failed to update password. Please try again.');
        return false;
      }
    }, 'Failed to update password. Please check your internet connection.');

    return result || false;
  },
}));