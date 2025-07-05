import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { showErrorToast } from '../lib/toast';

export interface ScheduledPayment {
  id: string;
  scheduled_for: string;
  schedule_status: 'pending' | 'processed' | 'cancelled';
  created_at: string;
  updated_at: string;
  promoted_date?: string | null;
  payment_id?: string | null;
  vendor_name: string;
  vendor_id: string;
  company_name: string;
  company_branch?: string | null;
  category_id: string;
  subcategory_id: string;
  bank_name?: string | null;
  payment_mode?: string | null;
  advance_details?: string | null;
  total_outstanding: number;
  payment_amount: number;
  balance_amount: number;
  quantity_checked_by?: string | null;
  quality_checked_by?: string | null;
  purchase_owner?: string | null;
  price_check_guaranteed_by?: string | null;
  item_description: string;
  lpr?: string | null;
  ioa?: string | null;
  cpp?: string | null;
  requested_by: string;
  urgency_level?: 'low' | 'medium' | 'high';
  is_recurring: boolean;
  recurrence_pattern?: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | null;
  recurrence_end_type?: 'after' | 'on' | 'never' | null;
  recurrence_end_after?: number | null;
  recurrence_end_date?: string | null;
  parent_payment_id?: string | null;
  next_execution?: string | null;
  last_execution_date?: string | null;
  execution_count?: number | null;
}

export interface DashboardStats {
  total: number;
  pending: number;
  processed: number;
  cancelled: number;
  totalAmount: number;
  pendingAmount: number;
  processedAmount: number;
  recurringCount: number;
  upcomingToday: number;
  upcomingThisWeek: number;
  executedToday: number;
  executedThisWeek: number;
}

interface ScheduledPaymentsState {
  scheduledPayments: ScheduledPayment[];
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  dashboardStats: DashboardStats | null;
  fetchScheduledPayments: (options: {
    page: number;
    pageSize: number;
    sortField: string;
    sortDirection: 'asc' | 'desc';
    searchTerm: string;
    statusFilter: string[];
    recurringFilter?: boolean | null;
    upcomingFilter?: 'today' | 'week' | null;
  }) => Promise<void>;
  fetchDashboardStats: () => Promise<DashboardStats>;
  createScheduledPayment: (data: Partial<Omit<ScheduledPayment, 'id' | 'created_at' | 'updated_at'>>) => Promise<void>;
  cancelScheduledPayment: (id: string) => Promise<void>;
  fetchScheduledPaymentById: (id: string) => Promise<ScheduledPayment | null>;
}

export const useScheduledPaymentsStore = create<ScheduledPaymentsState>((set, get) => ({
  scheduledPayments: [],
  isLoading: false,
  error: null,
  currentPage: 1,
  pageSize: 10,
  totalCount: 0,
  totalPages: 0,
  dashboardStats: null,

  fetchScheduledPayments: async ({ page, pageSize, sortField, sortDirection, searchTerm, statusFilter, recurringFilter, upcomingFilter }) => {
    set({ isLoading: true, error: null });
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('scheduled_payments')
        .select('*', { count: 'exact' });

      if (searchTerm) {
        query = query.or(`vendor_name.ilike.%${searchTerm}%,item_description.ilike.%${searchTerm}%`);
      }

      if (recurringFilter !== undefined && recurringFilter !== null) {
        query = query.eq('is_recurring', recurringFilter);
      }

      if (statusFilter.length > 0) {
        query = query.in('schedule_status', statusFilter);
      }

      if (upcomingFilter === 'today' || upcomingFilter === 'week') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let rangeEnd: Date;
        if (upcomingFilter === 'today') {
          rangeEnd = new Date(today);
          rangeEnd.setDate(today.getDate() + 1);
        } else {
          rangeEnd = new Date(today);
          rangeEnd.setDate(today.getDate() + 7);
        }

        const isPending = statusFilter.includes('pending');
        const isProcessed = statusFilter.includes('processed');

        if (isPending && isProcessed) {
          query = query.or(`and(schedule_status.eq.pending,scheduled_for.gte.${today.toISOString()},scheduled_for.lt.${rangeEnd.toISOString()}),and(schedule_status.eq.processed,next_execution.gte.${today.toISOString()},next_execution.lt.${rangeEnd.toISOString()})`);
        } else if (isPending) {
          query = query
            .eq('schedule_status', 'pending')
            .gte('scheduled_for', today.toISOString())
            .lt('scheduled_for', rangeEnd.toISOString());
        } else if (isProcessed) {
          query = query
            .eq('schedule_status', 'processed')
            .gte('next_execution', today.toISOString())
            .lt('next_execution', rangeEnd.toISOString());
        }
      }

      const { data, error, count } = await query
        .order(sortField, { ascending: sortDirection === 'asc' })
        .range(from, to);

      if (error) throw error;

      set({
        scheduledPayments: data,
        totalCount: count || 0,
        totalPages: count ? Math.ceil(count / pageSize) : 0,
        currentPage: page,
        pageSize: pageSize,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch', isLoading: false });
    }
  },

  fetchDashboardStats: async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_payments')
        .select('*');

      if (error) throw error;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + 7);

      const stats: DashboardStats = {
        total: data.length,
        pending: data.filter(p =>
          p.schedule_status === 'pending' ||
          (p.is_recurring && p.schedule_status === 'processed' && p.next_execution && new Date(p.next_execution) <= now)
        ).length,
        processed: data.filter(p => p.schedule_status === 'processed').length,
        cancelled: data.filter(p => p.schedule_status === 'cancelled').length,
        totalAmount: data.reduce((sum, p) => sum + p.payment_amount, 0),
        pendingAmount: data
          .filter(p => p.schedule_status === 'pending')
          .reduce((sum, p) => sum + p.payment_amount, 0),
        processedAmount: data
          .filter(p => p.schedule_status === 'processed')
          .reduce((sum, p) => sum + p.payment_amount, 0),
        recurringCount: data.filter(p => p.is_recurring).length,
        upcomingToday: data.filter(p => {
          const scheduledDate = new Date(p.scheduled_for);
          const scheduledDay = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());
          return p.schedule_status === 'pending' && scheduledDay.getTime() === today.getTime();
        }).length,
        upcomingThisWeek: data.filter(p => {
          const scheduledDate = new Date(p.scheduled_for);
          return p.schedule_status === 'pending' && scheduledDate >= today && scheduledDate <= endOfWeek;
        }).length,
        executedToday: data.filter(p => {
          if (!p.last_execution_date) return false;
          const exec = new Date(p.last_execution_date);
          return exec >= today && exec < tomorrow;
        }).length,
        executedThisWeek: data.filter(p => {
          if (!p.last_execution_date) return false;
          const exec = new Date(p.last_execution_date);
          return exec >= today && exec <= endOfWeek;
        }).length,
      };

      set({ dashboardStats: stats });
      return stats;
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },

  createScheduledPayment: async (paymentData) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('scheduled_payments')
        .insert([paymentData])
        .select();

      if (error) {
        throw error;
      }

      if (data) {
        set((state) => ({
          scheduledPayments: [data[0], ...state.scheduledPayments],
          isLoading: false,
        }));
      }
    } catch (error: any) {
      showErrorToast(error.message || 'Failed to create scheduled payment');
      set({ error: error.message || 'Failed to create', isLoading: false });
    }
  },

  cancelScheduledPayment: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('scheduled_payments')
        .update({ schedule_status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        scheduledPayments: state.scheduledPayments.map((p) =>
          p.id === id ? { ...p, schedule_status: 'cancelled' } : p
        ),
        isLoading: false,
      }));
    } catch (error: any) {
      showErrorToast(error.message || 'Failed to cancel payment');
      set({ error: error.message || 'Failed to cancel', isLoading: false });
    }
  },

  fetchScheduledPaymentById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('scheduled_payments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        showErrorToast(error.message || 'Failed to fetch scheduled payment');
        set({ error: error.message || 'Failed to fetch', isLoading: false });
        return null;
      }

      if (!data) {
        set({ error: 'Scheduled payment not found', isLoading: false });
        return null;
      }

      // Get user data for requested_by
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.requested_by)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
      }

      const payment: ScheduledPayment = {
        ...data,
        requested_by: userData || data.requested_by
      };

      set({ isLoading: false });
      return payment;
    } catch (error: any) {
      showErrorToast(error.message || 'Failed to fetch scheduled payment');
      set({ error: error.message || 'Failed to fetch', isLoading: false });
      return null;
    }
  },
})); 