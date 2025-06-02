import { create } from 'zustand';
import { User, UserRole } from '../types';
import { supabase, handleSupabaseError } from '../lib/supabase';
import { usePaymentStore } from '../store/paymentStore';
import { showErrorToast } from '../lib/toast';
import { withNetworkCheck } from '../lib/network';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  // switchRole: (role: UserRole) => void; // For demo purposes
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
  
  // This is just for demo purposes to easily switch between roles
  // switchRole: async (role: UserRole) => {
  //   try {
  //     const { data: { user: authUser } } = await supabase.auth.getUser();
      
  //     if (!authUser) {
  //       throw new Error('No authenticated user');
  //     }

  //     const { data, error } = await supabase
  //       .from('users')
  //       .update({ role })
  //       .eq('id', authUser.id)
  //       .select()
  //       .single();

  //     if (error) {
  //       handleSupabaseError(error);
  //       return;
  //     }
  //     set(state => ({
  //       user: data
  //     }));
  //   } catch (error) {
  //     console.error('Role switch error:', error);
  //   }
  // }
}));