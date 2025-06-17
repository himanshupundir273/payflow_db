import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface CMSStats {
  users: number;
  categories: number;
  subcategories: number;
  vendors: number;
  companies: number;
  branches: number;
}

interface CMSState {
  stats: CMSStats | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchStats: () => Promise<void>;
}

export const useCMSStore = create<CMSState>((set) => ({
  stats: null,
  isLoading: false,
  error: null,

  fetchStats: async () => {
    set({ isLoading: true, error: null });
    try {
      // Fetch users count
      const { count: usersCount, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // Fetch categories count
      const { count: categoriesCount, error: categoriesError } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true });

      if (categoriesError) throw categoriesError;

      // Fetch subcategories count
      const { count: subcategoriesCount, error: subcategoriesError } = await supabase
        .from('subcategories')
        .select('*', { count: 'exact', head: true });

      if (subcategoriesError) throw subcategoriesError;

      // Fetch vendors count
      const { count: vendorsCount, error: vendorsError } = await supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true });

      if (vendorsError) throw vendorsError;

      // Fetch companies count
      const { count: companiesCount, error: companiesError } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      if (companiesError) throw companiesError;

      // Fetch branches count
      const { count: branchesCount, error: branchesError } = await supabase
        .from('branches')
        .select('*', { count: 'exact', head: true });

      if (branchesError) throw branchesError;

      set({
        stats: {
          users: usersCount || 0,
          categories: categoriesCount || 0,
          subcategories: subcategoriesCount || 0,
          vendors: vendorsCount || 0,
          companies: companiesCount || 0,
          branches: branchesCount || 0,
        },
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching CMS stats:', error);
      set({ error: 'Failed to fetch stats', isLoading: false });
    }
  },
})); 