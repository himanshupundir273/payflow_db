import { create } from 'zustand';
import { PaymentRequest, FilterOptions, User } from '../types';
import { supabase, handleSupabaseError } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { showSuccessToast, showErrorToast, showLoadingToast, dismissToast } from '../lib/toast';
import { withNetworkCheck } from '../lib/network';

type PaymentRow = Database['public']['Tables']['payments']['Row'];
type PaymentInsert = Database['public']['Tables']['payments']['Insert'];

interface DashboardStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  processed: number;
  queryRaised: number;
  overdueAdvanceInvoices: number;
  totalAmount: number;
  pendingAmount: number;
}

interface PaymentState {
  payments: PaymentRequest[];
  filteredPayments: PaymentRequest[];
  filterOptions: FilterOptions;
  isLoading: boolean;
  dashboardStats: DashboardStats | null;
  
  // Actions
  fetchPayments: () => Promise<void>;
  fetchDashboardStats: () => Promise<void>;
  addPayment: (payment: Omit<PaymentRequest, 'id' | 'serialNumber' | 'status' | 'createdAt' | 'updatedAt' | 'approvedBy'>) => Promise<PaymentRequest | null>;
  approvePayment: (id: string, approver: User) => Promise<void>;
  rejectPayment: (id: string, approver: User) => Promise<void>;
  markAsProcessed: (id: string) => Promise<void>;
  markInvoiceReceived: (id: string) => Promise<boolean>;
  raiseQuery: (id: string, approver: User, query: string) => Promise<boolean>;
  setFilterOptions: (options: Partial<FilterOptions>) => void;
  applyFilters: () => void;
  exportToExcel: () => void;
  updatePayment: (id: string, paymentData: Partial<PaymentRequest>) => Promise<boolean>;
  filterOverdueAdvanceInvoices: () => void;
}

const transformPaymentRow = async (row: PaymentRow): Promise<PaymentRequest> => {
  try {
    // Fetch the requestedBy user
    let requestedByUser;
    const { data: userData, error: requestedByError } = await supabase
      .from('users')
      .select('*')
      .eq('id', row.requested_by)
      .single();

    if (requestedByError) {
      console.error('Error fetching requestedBy user:', requestedByError);
      requestedByUser = {
        id: row.requested_by,
        email: 'unknown@example.com',
        name: 'Unknown User',
        role: 'user',
        company: 'Unknown Company'
      };
    } else {
      requestedByUser = userData;
    }

    // Fetch the approvedBy user if it exists
    let approvedByUser = null;
    if (row.approved_by) {
      const { data: approvedBy, error: approvedByError } = await supabase
        .from('users')
        .select('*')
        .eq('id', row.approved_by)
        .single();

      if (approvedByError) {
        console.error('Error fetching approvedBy user:', approvedByError);
        approvedByUser = {
          id: row.approved_by,
          email: 'unknown@example.com',
          name: 'Unknown User',
          role: 'user',
          company: 'Unknown Company'
        };
      } else {
        approvedByUser = approvedBy;
      }
    }

    // Fetch bills for this payment
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select('*')
      .eq('payment_id', row.id);

    if (billsError) {
      console.error('Error fetching bills:', billsError);
      throw billsError;
    }

    // Fetch attachments for this payment
    const { data: attachments, error: attachmentsError } = await supabase
      .from('attachments')
      .select('*')
      .eq('payment_id', row.id);

    if (attachmentsError) {
      console.error('Error fetching attachments:', attachmentsError);
      throw attachmentsError;
    }

    return {
      id: row.id,
      serialNumber: row.serial_number,
      date: row.date,
      vendorName: row.vendor_name,
      totalOutstanding: row.total_outstanding,
      advanceDetails: row.advance_details as 'tax_invoice' | 'advance_(bill/PI)' | 'advance' | 'others',
      paymentAmount: row.payment_amount,
      balanceAmount: row.balance_amount,
      itemDescription: row.item_description,
      bills: bills?.map(bill => ({
        id: bill.id,
        billNumber: bill.bill_number,
        billDate: bill.bill_date,
        createdAt: bill.created_at,
        updatedAt: bill.updated_at
      })) || [],
      attachments: attachments?.map(attachment => ({
        id: attachment.id,
        description: attachment.description,
        fileUrl: attachment.file_url,
        fileName: attachment.file_name,
        fileType: attachment.file_type,
        fileSize: attachment.file_size,
        createdAt: attachment.created_at,
        updatedAt: attachment.updated_at
      })) || [],
      requestedBy: requestedByUser,
      approvedBy: approvedByUser,
      companyName: row.company_name,
      companyBranch: row.company_branch,
      bankName: row.bank_name,
      status: row.status,
      queryDetails: row.query_details || undefined,
      lpr: row.lpr || undefined,
      ioa: row.ioa || undefined,
      cpp: row.cpp || undefined,
      invoiceReceived: row.invoice_received || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('Error in transformPaymentRow:', error);
    throw error;
  }
};

export const usePaymentStore = create<PaymentState>((set, get) => ({
  payments: [],
  filteredPayments: [],
  isLoading: false,
  filterOptions: {
    status: [],
    dateRange: {
      start: null,
      end: null,
    },
    vendor: null,
    company: null,
  },
  dashboardStats: null,
  
  fetchPayments: async () => {
    set({ isLoading: true });
    
    const result = await withNetworkCheck(async () => {
      try {
        // Get the current user's role
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          console.log('No authenticated user found');
          return;
        }

        // First check if user exists in users table
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (checkError) {
          console.log('User not found in users table, creating new user');
          // If user doesn't exist, create them with default role
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([
              {
                id: authUser.id,
                email: authUser.email || 'unknown@example.com',
                name: authUser.email?.split('@')[0] || 'User',
                role: 'user',
                company: 'Default Company'
              }
            ])
            .select()
            .single();

          if (createError) {
            console.error('Error creating user:', createError);
            handleSupabaseError(createError);
            return;
          }
        }

        // Now fetch the user's role
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', authUser.id)
          .single();

        if (userError) {
          console.error('Error fetching user role:', userError);
          handleSupabaseError(userError);
          return;
        }

        // Build the query based on user role
        let query = supabase
          .from('payments')
          .select('*');

        // If user is not admin or accounts, only show their own payments
        if (userData.role !== 'admin' && userData.role !== 'accounts') {
          query = query.eq('requested_by', authUser.id);
        }

        const { data: rows, error } = await query
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching payments:', error);
          handleSupabaseError(error);
          return;
        }

        const payments = await Promise.all(rows.map(async (row) => {
          try {
            return await transformPaymentRow(row);
          } catch (error) {
            console.error('Error transforming payment row:', error);
            return null;
          }
        }));

        // Filter out any null values from failed transformations
        const validPayments = payments.filter((payment): payment is PaymentRequest => payment !== null);
        
        set({ 
          payments: validPayments,
          filteredPayments: validPayments,
          isLoading: false 
        });
        
        get().applyFilters();
      } catch (error) {
        console.error('Error in fetchPayments:', error);
        throw error;
      }
    }, 'Failed to fetch payments. Please check your internet connection.');

    if (!result) {
      set({ isLoading: false });
    }
  },
  
  fetchDashboardStats: async () => {
    try {
      await withNetworkCheck(async () => {
        // Get the current user's role
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          console.log('No authenticated user found');
          return;
        }

        const authUser = data.user;

        // Get user data to determine role
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', authUser.id)
          .single();

        if (userError) {
          console.error('Error fetching user role:', userError);
          handleSupabaseError(userError);
          return;
        }

        // Build query based on user role
        let baseQuery = supabase.from('payments').select('*');
        
        // If user is not admin or accounts, only show their own payments
        if (userData.role !== 'admin' && userData.role !== 'accounts') {
          baseQuery = baseQuery.eq('requested_by', authUser.id);
        }

        const { data: payments, error } = await baseQuery;
        
        if (error) {
          console.error('Error fetching payments for stats:', error);
          handleSupabaseError(error);
          return;
        }

        // Calculate statistics
        const total = payments.length;
        const pending = payments.filter(p => p.status === 'pending').length;
        const approved = payments.filter(p => p.status === 'approved').length;
        const rejected = payments.filter(p => p.status === 'rejected').length;
        const processed = payments.filter(p => p.status === 'processed').length;
        const queryRaised = payments.filter(p => p.status === 'query_raised').length;

        // Calculate overdue advance invoices
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const overdueAdvanceInvoices = payments.filter(p => 
          p.status === 'processed' &&
          (p.advance_details === 'advance' || p.advance_details === 'advance_(bill/PI)') &&
          (!p.invoice_received || p.invoice_received === 'no') &&
          new Date(p.updated_at) < oneWeekAgo
        ).length;

        const totalAmount = payments.reduce((sum, p) => sum + p.payment_amount, 0);
        const pendingAmount = payments
          .filter(p => p.status === 'pending')
          .reduce((sum, p) => sum + p.payment_amount, 0);

        const stats: DashboardStats = {
          total,
          pending,
          approved,
          rejected,
          processed,
          queryRaised,
          overdueAdvanceInvoices,
          totalAmount,
          pendingAmount,
        };

        set({ dashboardStats: stats });
      }, 'Failed to fetch dashboard statistics. Please check your internet connection.');
    } catch (error) {
      console.log('Failed to fetch dashboard stats due to network issues');
    }
  },
  
  addPayment: async (paymentData) => {
    set({ isLoading: true });
    
    const result = await withNetworkCheck(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No authenticated user');

        // First create the payment
        const newPayment: PaymentInsert = {
          date: paymentData.date,
          vendor_name: paymentData.vendorName,
          total_outstanding: paymentData.totalOutstanding,
          advance_details: paymentData.advanceDetails,
          payment_amount: paymentData.paymentAmount,
          balance_amount: paymentData.balanceAmount,
          item_description: paymentData.itemDescription,
          requested_by: user.id,
          company_name: paymentData.companyName,
          company_branch: paymentData.companyBranch,
          bank_name: paymentData.bankName,
          status: 'pending',
          lpr: paymentData.lpr,
          ioa: paymentData.ioa,
          cpp: paymentData.cpp,
          invoice_received: paymentData.invoiceReceived,
        };

        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .insert(newPayment)
          .select()
          .single();

        if (paymentError) throw paymentError;

        // Upload files and create attachments
        if (paymentData.attachments && paymentData.attachments.length > 0) {
          for (const attachment of paymentData.attachments) {
            if (attachment.file) {
              // Upload file to storage
              const fileExt = attachment.file.name.split('.').pop();
              const fileName = `${payment.id}/${Date.now()}.${fileExt}`;
              
              const { error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(fileName, attachment.file);

              if (uploadError) throw uploadError;

              // Get the public URL
              const { data: { publicUrl } } = supabase.storage
                .from('attachments')
                .getPublicUrl(fileName);

              // Create attachment record
              const { error: attachmentError } = await supabase
                .from('attachments')
                .insert({
                  payment_id: payment.id,
                  description: attachment.description,
                  file_url: fileName,
                  file_name: attachment.file.name,
                  file_type: attachment.file.type,
                  file_size: attachment.file.size,
                });

              if (attachmentError) throw attachmentError;
            }
          }
        }

        // Create bills
        if (paymentData.bills && paymentData.bills.length > 0) {
          const billsToInsert = paymentData.bills.map(bill => ({
            payment_id: payment.id,
            bill_number: bill.billNumber,
            bill_date: bill.billDate,
          }));

          const { error: billsError } = await supabase
            .from('bills')
            .insert(billsToInsert);

          if (billsError) throw billsError;
        }

        // Fetch the complete payment with all relations
        const completePayment = await transformPaymentRow(payment);
        
        // Update local state
        set(state => ({
          payments: [completePayment, ...state.payments],
          filteredPayments: [completePayment, ...state.filteredPayments],
          isLoading: false
        }));
        
        return completePayment;
      } catch (error) {
        console.error('Error adding payment:', error);
        throw error;
      }
    }, 'Failed to add payment. Please check your internet connection.');

    if (!result) {
      set({ isLoading: false });
      return null;
    }

    return result;
  },
  
  approvePayment: async (id: string, approver: User) => {
    set({ isLoading: true });
    
    const result = await withNetworkCheck(async () => {
      try {
        const { data, error } = await supabase
          .from('payments')
          .update({ 
            status: 'approved',
            approved_by: approver.id
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          handleSupabaseError(error);
          return false;
        }

        const transformedPayment = await transformPaymentRow(data);
        
        set(state => ({
          payments: state.payments.map(payment => 
            payment.id === id ? transformedPayment : payment
          ),
          isLoading: false
        }));
        
        get().applyFilters();
        return true;
      } catch (error) {
        console.error('Error approving payment:', error);
        throw error;
      }
    }, 'Failed to approve payment. Please check your internet connection.');

    if (!result) {
      set({ isLoading: false });
    }
  },
  
  rejectPayment: async (id: string, approver: User) => {
    set({ isLoading: true });
    
    const result = await withNetworkCheck(async () => {
      try {
        const { data, error } = await supabase
          .from('payments')
          .update({ 
            status: 'rejected',
            approved_by: approver.id
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          handleSupabaseError(error);
          return false;
        }

        const transformedPayment = await transformPaymentRow(data);
        
        set(state => ({
          payments: state.payments.map(payment => 
            payment.id === id ? transformedPayment : payment
          ),
          isLoading: false
        }));
        
        get().applyFilters();
        return true;
      } catch (error) {
        console.error('Error rejecting payment:', error);
        throw error;
      }
    }, 'Failed to reject payment. Please check your internet connection.');

    if (!result) {
      set({ isLoading: false });
    }
  },
  
  markAsProcessed: async (id: string) => {
    set({ isLoading: true });
    
    const result = await withNetworkCheck(async () => {
      try {
        const { data, error } = await supabase
          .from('payments')
          .update({ status: 'processed' })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          handleSupabaseError(error);
          return false;
        }

        const transformedPayment = await transformPaymentRow(data);
        
        set(state => ({
          payments: state.payments.map(payment => 
            payment.id === id ? transformedPayment : payment
          ),
          isLoading: false
        }));
        
        get().applyFilters();
        return true;
      } catch (error) {
        console.error('Error marking payment as processed:', error);
        throw error;
      }
    }, 'Failed to mark payment as processed. Please check your internet connection.');

    if (!result) {
      set({ isLoading: false });
    }
  },
  
  markInvoiceReceived: async (id: string) => {
    set({ isLoading: true });
    
    const result = await withNetworkCheck(async () => {
      try {
        const { data, error } = await supabase
          .from('payments')
          .update({ 
            invoice_received: 'yes'
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          handleSupabaseError(error);
          return false;
        }

        const transformedPayment = await transformPaymentRow(data);
        
        set(state => ({
          payments: state.payments.map(payment => 
            payment.id === id ? transformedPayment : payment
          ),
          isLoading: false
        }));
        
        get().applyFilters();
        return true;
      } catch (error) {
        console.error('Error marking invoice as received:', error);
        return false;
      }
    }, 'Failed to mark invoice as received. Please check your internet connection.');

    if (!result) {
      set({ isLoading: false });
      return false;
    }

    return result;
  },
  
  raiseQuery: async (id: string, approver: User, query: string) => {
    set({ isLoading: true });
    
    const result = await withNetworkCheck(async () => {
      try {
        const { error } = await supabase
          .from('payments')
          .update({ 
            status: 'query_raised' as const,
            query_details: query,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (error) throw error;

        // Update local state
        set(state => ({
          payments: state.payments.map(payment => 
            payment.id === id 
              ? { ...payment, status: 'query_raised' as const, queryDetails: query }
              : payment
          ),
          filteredPayments: state.filteredPayments.map(payment => 
            payment.id === id 
              ? { ...payment, status: 'query_raised' as const, queryDetails: query }
              : payment
          )
        }));

        return true;
      } catch (error) {
        console.error('Error raising query:', error);
        throw error;
      }
    }, 'Failed to raise query. Please check your internet connection.');

    if (!result) {
      set({ isLoading: false });
      return false;
    }

    return result;
  },
  
  updatePayment: async (id: string, paymentData: Partial<PaymentRequest>) => {
    set({ isLoading: true });
    
    const result = await withNetworkCheck(async () => {
      try {
        // First get the existing payment to ensure it exists
        const { data: existingPayment, error: fetchError } = await supabase
          .from('payments')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        if (!existingPayment) throw new Error('Payment not found');

        // Update payment details
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            vendor_name: paymentData.vendorName,
            total_outstanding: paymentData.totalOutstanding,
            advance_details: paymentData.advanceDetails,
            payment_amount: paymentData.paymentAmount,
            balance_amount: paymentData.balanceAmount,
            item_description: paymentData.itemDescription,
            company_name: paymentData.companyName,
            company_branch: paymentData.companyBranch,
            bank_name: paymentData.bankName,
            status: existingPayment.status === 'query_raised' ? 'pending' : existingPayment.status,
            lpr: paymentData.lpr,
            ioa: paymentData.ioa,
            cpp: paymentData.cpp,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (updateError) throw updateError;

        // Handle attachments
        if (paymentData.attachments && paymentData.attachments.length > 0) {
          // Get existing attachments
          const { data: existingAttachments, error: attachmentsError } = await supabase
            .from('attachments')
            .select('*')
            .eq('payment_id', id);

          if (attachmentsError) throw attachmentsError;

          // Separate existing and new attachments
          const existingAttachmentIds = existingAttachments?.map(a => a.id) || [];
          const newAttachments = paymentData.attachments.filter(a => !a.id);
          const updatedAttachments = paymentData.attachments.filter(a => a.id && existingAttachmentIds.includes(a.id));

          // Delete attachments that are no longer present
          const attachmentsToDelete = existingAttachments?.filter(
            a => !paymentData.attachments?.some(pa => pa.id === a.id)
          ) || [];

          for (const attachment of attachmentsToDelete) {
            if (attachment.file_url) {
              // Delete file from storage
              await supabase.storage.from('attachments').remove([attachment.file_url]);
            }
            // Delete attachment record
            await supabase.from('attachments').delete().eq('id', attachment.id);
          }

          // Update existing attachments
          for (const attachment of updatedAttachments) {
            if (attachment.id) {
              await supabase
                .from('attachments')
                .update({
                  description: attachment.description,
                  updated_at: new Date().toISOString()
                })
                .eq('id', attachment.id);
            }
          }

          // Upload and create new attachments
          for (const attachment of newAttachments) {
            if (attachment.file) {
              const fileExt = attachment.file.name.split('.').pop();
              const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
              const filePath = `${id}/${fileName}`;

              // Upload file to storage
              const { error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(filePath, attachment.file);

              if (uploadError) throw uploadError;

              // Create attachment record
              const { error: createError } = await supabase.from('attachments').insert({
                payment_id: id,
                description: attachment.description,
                file_name: attachment.fileName,
                file_type: attachment.fileType,
                file_size: attachment.fileSize,
                file_url: filePath,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

              if (createError) throw createError;
            }
          }
        }

        // Handle bills
        if (paymentData.bills && paymentData.bills.length > 0) {
          // Delete existing bills
          await supabase.from('bills').delete().eq('payment_id', id);

          // Insert new bills
          const { error: billsError } = await supabase.from('bills').insert(
            paymentData.bills.map(bill => ({
              payment_id: id,
              bill_number: bill.billNumber,
              bill_date: bill.billDate,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }))
          );

          if (billsError) throw billsError;
        }

        // Fetch the updated payment with all relations
        const { data: updatedPayment, error: fetchUpdatedError } = await supabase
          .from('payments')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchUpdatedError) throw fetchUpdatedError;

        const transformedPayment = await transformPaymentRow(updatedPayment);
        
        // Update local state
        set(state => ({
          payments: state.payments.map(p => 
            p.id === id ? transformedPayment : p
          ),
          filteredPayments: state.filteredPayments.map(p =>
            p.id === id ? transformedPayment : p
          )
        }));

        return true;
      } catch (error) {
        console.error('Error updating payment:', error);
        throw error;
      }
    }, 'Failed to update payment. Please check your internet connection.');

    if (!result) {
      set({ isLoading: false });
      return false;
    }

    return result;
  },
  
  setFilterOptions: (options) => {
    set(state => ({
      filterOptions: {
        ...state.filterOptions,
        ...options
      }
    }));
    
    get().applyFilters();
  },
  
  applyFilters: () => {
    const { payments, filterOptions } = get();
    
    let filtered = [...payments];
    
    // Filter by status
    if (filterOptions.status.length > 0) {
      filtered = filtered.filter(payment => 
        filterOptions.status.includes(payment.status)
      );
    }
    
    // Filter by date range
    if (filterOptions.dateRange.start && filterOptions.dateRange.end) {
      filtered = filtered.filter(payment => {
        const paymentDate = new Date(payment.date);
        const startDate = new Date(filterOptions.dateRange.start!);
        const endDate = new Date(filterOptions.dateRange.end!);
        
        return paymentDate >= startDate && paymentDate <= endDate;
      });
    }
    
    // Filter by vendor
    if (filterOptions.vendor) {
      filtered = filtered.filter(payment => 
        payment.vendorName.toLowerCase().includes(filterOptions.vendor!.toLowerCase())
      );
    }
    
    // Filter by company
    if (filterOptions.company) {
      filtered = filtered.filter(payment => 
        payment.companyName.toLowerCase().includes(filterOptions.company!.toLowerCase())
      );
    }
    
    set({ filteredPayments: filtered });
  },
  
  exportToExcel: () => {
    // Implementation remains the same
    alert('Export to Excel functionality would be implemented here');
  },

  filterOverdueAdvanceInvoices: () => {
    set(state => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const overduePayments = state.payments.filter(payment => 
        payment.status === 'processed' &&
        (payment.advanceDetails === 'advance' || payment.advanceDetails === 'advance_(bill/PI)') &&
        (!payment.invoiceReceived || payment.invoiceReceived === 'no') &&
        new Date(payment.updatedAt) < oneWeekAgo
      );

      return {
        filteredPayments: overduePayments,
        filterOptions: {
          status: [],
          dateRange: { start: null, end: null },
          vendor: null,
          company: null,
        }
      };
    });
  }
}));