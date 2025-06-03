import { supabase } from './supabase';
import { handleSupabaseError } from './supabase';

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  company: string;
  role?: 'user' | 'admin' | 'accounts';
}

export interface LoginData {
  email: string;
  password: string;
}

export const register = async (data: RegisterData) => {
  try {
    // 1. Sign up the user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user data returned');

    // 2. Create the user profile in the users table
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: data.email,
        name: data.name,
        company: data.company,
        role: data.role || 'user', 
      });

    if (profileError) throw profileError;

    return {
      user: authData.user,
      session: authData.session,
    };
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const login = async (data: LoginData) => {
  try {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) throw error;
    return authData;
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const logout = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    handleSupabaseError(error);
  }
};

export const changePassword = async (newPassword: string) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error);
    throw error;
  }
}; 