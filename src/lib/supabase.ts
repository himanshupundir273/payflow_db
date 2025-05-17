import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Disable email confirmation requirement
    flowType: 'implicit'
  },
});

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: unknown) => {
  if (error instanceof Error) {
    console.error('Supabase error:', error.message);
    throw new Error(`Database operation failed: ${error.message}`);
  }
  throw new Error('An unknown database error occurred');
};

// Type guard for Supabase errors
export const isSupabaseError = (error: unknown): error is { message: string; details: string; hint: string; code: string } => {
  return typeof error === 'object' && error !== null && 'message' in error;
};