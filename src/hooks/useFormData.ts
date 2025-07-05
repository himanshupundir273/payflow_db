import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { showErrorToast } from '../lib/toast';
import { Vendor, User } from '../types';

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

interface Subcategory {
  id: string;
  name: string;
  description: string;
  status?: 'approved' | 'pending' | 'rejected';
  created_at: string;
  updated_at: string;
}

interface Company {
  id: string;
  name: string;
  code: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

export const useFormData = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [loadingVendors, setLoadingVendors] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingSubcategories, setLoadingSubcategories] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch vendors
  const fetchVendors = async () => {
    try {
      setLoadingVendors(true);
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      if (data) {
        const formattedVendors: Vendor[] = data.map((vendor) => ({
          id: vendor.id,
          name: vendor.name,
          accountNumber: vendor.account_number,
          ifscCode: vendor.ifsc_code,
          addedBy: vendor.added_by,
          status: vendor.status,
          createdAt: vendor.created_at,
          updatedAt: vendor.updated_at,
        }));
        setVendors(formattedVendors);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      showErrorToast('Failed to load vendors');
    } finally {
      setLoadingVendors(false);
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .not('role', 'eq', 'accounts')
        .order('name', { ascending: true });

      if (error) throw error;
      if (data) setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      showErrorToast('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          added_by_user:users(name)
        `)
        .order('name');

      if (error) throw error;
      if (data) setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      showErrorToast('Failed to fetch categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  // Fetch subcategories
  const fetchSubcategories = async () => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*, status')
        .order('name');

      if (error) throw error;
      if (data) setSubcategories(data);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      showErrorToast('Failed to fetch subcategories');
    } finally {
      setLoadingSubcategories(false);
    }
  };

  // Fetch companies and branches
  const fetchOptions = async () => {
    try {
      setIsLoading(true);

      const [companiesResponse, branchesResponse] = await Promise.all([
        supabase.from('companies').select('id, name, code').order('name'),
        supabase.from('branches').select('id, name, code').order('name')
      ]);

      if (companiesResponse.error) throw companiesResponse.error;
      if (branchesResponse.error) throw branchesResponse.error;

      setCompanies(companiesResponse.data || []);
      setBranches(branchesResponse.data || []);
    } catch (error) {
      console.error('Error fetching options:', error);
      showErrorToast('Failed to load form options');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    fetchUsers();
    fetchCategories();
    fetchSubcategories();
    fetchOptions();
  }, []);

  const refetchVendors = () => fetchVendors();
  const refetchCategories = () => fetchCategories();
  const refetchSubcategories = () => fetchSubcategories();

  return {
    vendors,
    users,
    categories,
    subcategories,
    companies,
    branches,
    loadingVendors,
    loadingUsers,
    loadingCategories,
    loadingSubcategories,
    isLoading,
    refetchVendors,
    refetchCategories,
    refetchSubcategories,
    setVendors,
    setCategories,
    setSubcategories,
  };
}; 