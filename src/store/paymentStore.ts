import { create } from 'zustand';
import { PaymentRequest, FilterOptions, User, DashboardStats, PaymentState } from '../types';
import { supabase, handleSupabaseError } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { showSuccessToast, showErrorToast } from '../lib/toast';
import { withNetworkCheck } from '../lib/network';

type PaymentRow = Database['public']['Tables']['payments']['Row'];
type PaymentInsert = Database['public']['Tables']['payments']['Insert'];


interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}



// Cache for users to avoid repeated fetches
const usersCache = new Map<string, any>();

// Global flag to prevent concurrent fetch calls
let isFetching = false;

// Helper function to calculate dashboard stats from raw payment data
const calculateDashboardStats = (payments: PaymentRow[]): DashboardStats => {
  const total = payments.length;
  const pending = payments.filter(p => p.status === 'pending').length;
  const approved = payments.filter(p => p.status === 'approved').length;
  const rejected = payments.filter(p => p.status === 'rejected').length;
  const processed = payments.filter(p => p.status === 'processed').length;
  const queryRaised = payments.filter(p => p.status === 'query_raised').length;
  const accountsQueriesRaised = payments.filter(p => 
    p.status === 'approved' && 
    p.accounts_query && 
    p.accounts_query.trim() !== ''
  ).length;
  const pendingAccountsVerifications = payments.filter(p =>
    p.status === 'pending' &&
    p.accounts_verification_status === 'pending'
  ).length;

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

  // Calculate total payment to be initiated (payments after 6pm today)
  const now = new Date();
  // Get today's date at 6 PM UTC
  const todayAt6PMUTC = new Date();
  todayAt6PMUTC.setUTCHours(12, 30, 0, 0); // 6 PM IST in UTC is 12:30 UTC

  const totalPaymentToInitiate = payments
    .filter(p => {
      const createdAtUTC = new Date(p.created_at);

      // If current time is after 6 PM IST, show payments after 6 PM today
      // If current time is before 6 PM IST, show payments after 6 PM yesterday
      const startTime = now > todayAt6PMUTC ?
        todayAt6PMUTC :
        new Date(todayAt6PMUTC.getTime() - 24 * 60 * 60 * 1000);

      return createdAtUTC >= startTime;
    })
    .reduce((sum, p) => sum + p.payment_amount, 0);

  // Get total fund available and day_id from the funds table
  // These will be updated by the getFundStats function
  return {
    total,
    pending,
    approved,
    rejected,
    processed,
    queryRaised,
    accountsQueriesRaised,
    overdueAdvanceInvoices,
    totalAmount,
    pendingAmount,
    totalFundAvailable: 0, // Will be set by getFundStats
    totalPaymentToInitiate,
    netFundAvailable: 0, // Will be set by getFundStats
    dayId: '', // Will be set by getFundStats
    pendingAccountsVerifications
  };
};

// Helper function to transform a single payment (for operations that update individual payments)
const transformSinglePayment = async (row: PaymentRow): Promise<PaymentRequest> => {
  // Fetch related data
  const [requestedByUser, approvedByUser] = await Promise.all([
    supabase.from('users').select('*').eq('id', row.requested_by).single(),
    row.approved_by
      ? supabase.from('users').select('*').eq('id', row.approved_by).single()
      : Promise.resolve({ data: null }),
  ]);

  return {
    id: row.id,
    serialNumber: row.serial_number,
    date: row.date,
    vendorName: row.vendor_name,
    vendorId: row.vendor_id,
    totalOutstanding: row.total_outstanding,
    advanceDetails: row.advance_details as 'tax_invoice' | 'advance_(bill/PI)' | 'advance' | 'others',
    paymentAmount: row.payment_amount,
    balanceAmount: row.balance_amount,
    itemDescription: row.item_description,
    bills: [], // Empty - will be fetched on demand
    attachments: [], // Empty - will be fetched on demand
    requestedBy: requestedByUser.data!,
    approvedBy: approvedByUser.data,
    companyName: row.company_name,
    companyBranch: row.company_branch,
    bankName: row.bank_name,
    paymentMode: row.payment_mode as 'net_banking' | 'upi',
    status: row.status,
    queryDetails: row.query_details || undefined,
    accountsQuery: row.accounts_query || undefined,
    accountsVerificationStatus: row.accounts_verification_status || 'pending',
    lpr: row.lpr || undefined,
    ioa: row.ioa || undefined,
    cpp: row.cpp || undefined,
    invoiceReceived: row.invoice_received || undefined,
    startingAmount: row.starting_amount || undefined,
    quantityCheckedBy: row.quantity_checked_by || undefined,
    qualityCheckedBy: row.quality_checked_by || undefined,
    purchaseOwner: row.purchase_owner || undefined,
    priceCheckGuaranteedBy: row.price_check_guaranteed_by || undefined,
    categoryId: row.category_id || undefined,
    subcategoryId: row.subcategory_id || undefined,
    urgencyLevel: row.urgency_level || 'normal',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    amountChangeReason: row.amount_change_reason || undefined,
  };
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
    companyList: null,
    overdueInvoices: false,
    hasAccountsQuery: false,
  },
  dashboardStats: null,
  pagination: {
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
  },
  sortOptions: {
    field: 'created_at',
    direction: 'desc',
  },
  searchTerm: '',

  fetchPayments: async (page?: number, pageSize?: number, forceRefresh?: boolean, filters?: Partial<FilterOptions>, sortOptions?: SortOptions, searchTerm?: string) => {
    // Prevent concurrent calls
    if (isFetching && !forceRefresh) {
      console.log('fetchPayments already in progress, skipping duplicate call');
      return null;
    }

    isFetching = true;
    set({ isLoading: true });

    try {
      const result = await withNetworkCheck(async () => {
        try {
          // Use provided pagination parameters or defaults
          const currentPagination = get().pagination;
          const currentPage = page ?? currentPagination.page;
          const currentPageSize = pageSize ?? currentPagination.pageSize;

          // Use provided filters or current filter options
          const currentFilters = filters ?? get().filterOptions;

          // Use provided sort options or current sort options
          const currentSortOptions = sortOptions ?? get().sortOptions;

          // Use provided search term or current search term
          const currentSearchTerm = searchTerm ?? get().searchTerm;

          // Update sort options in state if provided
          if (sortOptions) {
            set(state => ({
              sortOptions: sortOptions
            }));
          }

          // Update search term in state if provided
          if (searchTerm !== undefined) {
            set(state => ({
              searchTerm: searchTerm
            }));
          }

          // Map frontend field names to database column names
          const getDbColumnName = (field: string): string => {
            const fieldMapping: Record<string, string> = {
              'serialNumber': 'serial_number',
              'date': 'date',
              'companyName': 'company_name',
              'vendorName': 'vendor_name',
              'advanceDetails': 'advance_details',
              'paymentAmount': 'payment_amount',
              'status': 'status',
              'createdAt': 'created_at',
              'updatedAt': 'updated_at'
            };
            return fieldMapping[field] || 'created_at';
          };

          // Get the current user's role
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser) {
            console.log('No authenticated user found');
            return null;
          }

          // Get user role (minimal query)
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', authUser.id)
            .single();

          if (userError) {
            console.error('Error fetching user role:', userError);
            handleSupabaseError(userError);
            return null;
          }

          // Helper function to apply filters to a query
          const applyFiltersToQuery = (query: any) => {
            // Apply role-based filtering
            if (userData.role !== 'admin' && userData.role !== 'accounts') {
              query = query.eq('requested_by', authUser.id);
            }

            // Apply search functionality
            if (currentSearchTerm && currentSearchTerm.trim() !== '') {
              const searchValue = currentSearchTerm.trim();

              // Build multiple OR conditions for text search
              const textSearchConditions = [
                `vendor_name.ilike.%${searchValue}%`,
                `item_description.ilike.%${searchValue}%`,
                `company_name.ilike.%${searchValue}%`,
                `company_branch.ilike.%${searchValue}%`,
                `status.ilike.%${searchValue}%`,
                `advance_details.ilike.%${searchValue}%`
              ];

              // If the search term is a number, also search by serial number
              if (!isNaN(Number(searchValue))) {
                textSearchConditions.push(`serial_number.eq.${Number(searchValue)}`);
              }

              query = query.or(textSearchConditions.join(','));
            }

            // Apply overdue invoice filter
            if (currentFilters.overdueInvoices) {
              const oneWeekAgo = new Date();
              oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

              query = query
                .eq('status', 'processed')
                .in('advance_details', ['advance', 'advance_(bill/PI)'])
                .or('invoice_received.is.null,invoice_received.eq.no')
                .lt('updated_at', oneWeekAgo.toISOString());
            } else {
              // Apply other filters
              if (currentFilters.status && currentFilters.status.length > 0) {
                query = query.in('status', currentFilters.status);
              }

              // Apply date range filter with proper time boundaries
              if (currentFilters.dateRange?.start && currentFilters.dateRange?.end) {
                const startDate = new Date(currentFilters.dateRange.start);
                startDate.setUTCHours(0, 0, 0, 0);

                const endDate = new Date(currentFilters.dateRange.end);
                endDate.setUTCHours(23, 59, 59, 999);

                query = query
                  .gte('date', startDate.toISOString())
                  .lte('date', endDate.toISOString());
              }

              if (currentFilters.vendor) {
                query = query.ilike('vendor_name', `%${currentFilters.vendor}%`);
              }

              if (currentFilters.company) {
                // For backward compatibility with existing pages
                query = query.or(`company_name.ilike.%${currentFilters.company}%`);
              } else if (currentFilters.companyList && currentFilters.companyList.length > 0) {
                // For advanced company filtering (ExportPage)
                const companyConditions = currentFilters.companyList.flatMap(company => [
                  `company_name.ilike.%${company.code}%`,
                  `company_name.ilike.%${company.fullName}%`
                ]).join(',');
                query = query.or(companyConditions);
              }

              // Apply accounts query filter
              if (currentFilters.hasAccountsQuery) {
                query = query.not('accounts_query', 'is', null)
                           .not('accounts_query', 'eq', '');
              }

              // Apply accounts verification status filter
              if (currentFilters.accountsVerificationStatus && currentFilters.accountsVerificationStatus.length > 0) {
                console.log(currentFilters)
                query = query.in('accounts_verification_status', currentFilters.accountsVerificationStatus);
              }
            }

            return query;
          };

          // Get total count for pagination
          let countQuery = supabase
            .from('payments')
            .select('*', { count: 'exact', head: true });

          countQuery = applyFiltersToQuery(countQuery);
          const { count: totalCount, error: countError } = await countQuery;

          if (countError) {
            console.error('Error fetching count:', countError);
            handleSupabaseError(countError);
            return null;
          }

          // Calculate pagination values
          const totalPages = Math.ceil((totalCount || 0) / currentPageSize);
          const offset = (currentPage - 1) * currentPageSize;

          // Build the paginated query - ONLY payments table data
          let query = supabase
            .from('payments')
            .select('*');

          query = applyFiltersToQuery(query);

          // Apply sort options with proper column mapping
          const dbColumnName = getDbColumnName(currentSortOptions.field);
          query = query.order(dbColumnName, { ascending: currentSortOptions.direction === 'asc' });

          const { data: rows, error } = await query
            .range(offset, offset + currentPageSize - 1);

          if (error) {
            console.error('Error fetching payments:', error);
            handleSupabaseError(error);
            return null;
          }

          // Update pagination state
          set(state => ({
            pagination: {
              page: currentPage,
              pageSize: currentPageSize,
              totalCount: totalCount || 0,
              totalPages,
            }
          }));

          if (!rows || rows.length === 0) {
            set({
              payments: forceRefresh ? [] : get().payments,
              filteredPayments: forceRefresh ? [] : get().filteredPayments,
              isLoading: false,
              dashboardStats: calculateDashboardStats([])
            });
            return { payments: [] };
          }

          // Transform payments with user data but WITHOUT bills and attachments for lightweight loading
          // Extract all unique user IDs to fetch in batch
          const userIds = new Set<string>();
          rows.forEach(row => {
            userIds.add(row.requested_by);
            if (row.approved_by) {
              userIds.add(row.approved_by);
            }
          });

          // Batch fetch all users
          const uncachedUserIds = Array.from(userIds).filter(id => !usersCache.has(id));

          if (uncachedUserIds.length > 0) {
            const { data: users, error: usersError } = await supabase
              .from('users')
              .select('*')
              .in('id', uncachedUserIds);

            if (usersError) {
              console.error('Error fetching users:', usersError);
            } else {
              users?.forEach(user => {
                usersCache.set(user.id, user);
              });
            }
          }

          // Create users map for quick lookup
          const usersMap = new Map();
          userIds.forEach(id => {
            if (usersCache.has(id)) {
              usersMap.set(id, usersCache.get(id));
            }
          });

          const newPayments = rows.map(row => {
            // Get real user data from cache
            const requestedByUser = usersMap.get(row.requested_by) || {
              id: row.requested_by,
              email: 'unknown@example.com',
              name: 'Unknown User',
              role: 'user' as const,
              company: 'Unknown Company'
            };

            let approvedByUser = null;
            if (row.approved_by) {
              approvedByUser = usersMap.get(row.approved_by) || {
                id: row.approved_by,
                email: 'unknown@example.com',
                name: 'Unknown User',
                role: 'user' as const,
                company: 'Unknown Company'
              };
            }

            return {
              id: row.id,
              serialNumber: row.serial_number,
              date: row.date,
              vendorName: row.vendor_name,
              vendorId: row.vendor_id,
              totalOutstanding: row.total_outstanding,
              advanceDetails: row.advance_details as 'tax_invoice' | 'advance_(bill/PI)' | 'advance' | 'others',
              paymentAmount: row.payment_amount,
              balanceAmount: row.balance_amount,
              itemDescription: row.item_description,
              bills: [], // Empty - will be fetched on demand
              attachments: [], // Empty - will be fetched on demand
              requestedBy: requestedByUser,
              approvedBy: approvedByUser,
              companyName: row.company_name,
              companyBranch: row.company_branch,
              bankName: row.bank_name,
              paymentMode: row.payment_mode as 'net_banking' | 'upi',
              status: row.status,
              queryDetails: row.query_details || undefined,
              accountsQuery: row.accounts_query || undefined,
              accountsVerificationStatus: row.accounts_verification_status || 'pending',
              lpr: row.lpr || undefined,
              ioa: row.ioa || undefined,
              cpp: row.cpp || undefined,
              invoiceReceived: row.invoice_received || undefined,
              startingAmount: row.starting_amount || undefined,
              quantityCheckedBy: row.quantity_checked_by || undefined,
              qualityCheckedBy: row.quality_checked_by || undefined,
              purchaseOwner: row.purchase_owner || undefined,
              priceCheckGuaranteedBy: row.price_check_guaranteed_by || undefined,
              categoryId: row.category_id || undefined,
              subcategoryId: row.subcategory_id || undefined,
              urgencyLevel: row.urgency_level || 'normal',
              createdAt: row.created_at,
              updatedAt: row.updated_at,
              amountChangeReason: row.amount_change_reason || undefined,
            };
          });

          // Calculate dashboard stats from all data for first page
          let allPaymentsForStats = rows;
          if (currentPage === 1 || forceRefresh) {
            let statsQuery = supabase
              .from('payments')
              .select('*');

            if (userData.role !== 'admin' && userData.role !== 'accounts') {
              statsQuery = statsQuery.eq('requested_by', authUser.id);
            }

            const { data: allRows, error: statsError } = await statsQuery
              .order('created_at', { ascending: false });

            if (!statsError && allRows) {
              allPaymentsForStats = allRows;
            }
          }

          const stats = calculateDashboardStats(allPaymentsForStats);

          // Preserve fund stats if they exist
          const currentStats = get().dashboardStats;
          set({
            payments: newPayments,
            filteredPayments: newPayments,
            isLoading: false,
            dashboardStats: {
              ...stats,
              totalFundAvailable: currentStats?.totalFundAvailable ?? 0,
              totalPaymentToInitiate: currentStats?.totalPaymentToInitiate ?? stats.totalPaymentToInitiate,
              netFundAvailable: (currentStats?.totalFundAvailable ?? 0) - (currentStats?.totalPaymentToInitiate ?? stats.totalPaymentToInitiate),
              dayId: currentStats?.dayId ?? ''
            }
          });

          // Return the payments array
          return { payments: newPayments };

        } catch (error) {
          console.error('Error in fetchPayments:', error);
          throw error;
        }
      }, 'Failed to fetch payments. Please check your internet connection.');

      if (!result) {
        set({ isLoading: false });
        return null;
      }

      return result;

    } finally {
      // Always reset the flag, even if an error occurs
      isFetching = false;
    }
  },

  fetchDashboardStats: async () => {
    try {
      await withNetworkCheck(async () => {
        try {
          // Get the current user's role
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser) {
            console.log('No authenticated user found');
            return;
          }

          // Get user role (minimal query)
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', authUser.id)
            .single();

          if (userError) {
            console.error('Error fetching user role:', userError);
            return;
          }

          // Build query for all payments (no filters)
          let query = supabase
            .from('payments')
            .select('*');

          // Apply role-based filtering only
          if (userData.role !== 'admin' && userData.role !== 'accounts') {
            query = query.eq('requested_by', authUser.id);
          }

          // Get all payments for accurate stats
          const { data: rows, error } = await query
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching dashboard stats:', error);
            return;
          }

          if (!rows || rows.length === 0) {
            set({ dashboardStats: calculateDashboardStats([]) });
            return;
          }

          // Calculate stats from fresh data
          const stats = calculateDashboardStats(rows);

          // Get fund stats
          const { data: currentDayId } = await supabase.rpc('get_current_day_id');
          if (currentDayId) {
            const { data: funds } = await supabase
              .from('funds')
              .select('amount')
              .eq('day_id', currentDayId);

            const totalFundAvailable = funds?.reduce((sum, fund) => sum + (fund.amount || 0), 0) || 0;

            // Update stats with fund information
            set({
              dashboardStats: {
                ...stats,
                totalFundAvailable,
                netFundAvailable: totalFundAvailable - stats.totalPaymentToInitiate,
                dayId: currentDayId
              }
            });
          } else {
            set({ dashboardStats: stats });
          }
        } catch (error) {
          console.error('Error in fetchDashboardStats:', error);
          throw error;
        }
      }, 'Failed to fetch dashboard stats. Please check your internet connection.');
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
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
          vendor_id: paymentData.vendorId,
          total_outstanding: paymentData.totalOutstanding,
          advance_details: paymentData.advanceDetails,
          payment_amount: paymentData.paymentAmount,
          balance_amount: paymentData.balanceAmount,
          item_description: paymentData.itemDescription,
          requested_by: user.id,
          company_name: paymentData.companyName,
          company_branch: paymentData.companyBranch,
          bank_name: paymentData.bankName,
          payment_mode: paymentData.paymentMode,
          status: 'pending',
          lpr: paymentData.lpr,
          ioa: paymentData.ioa,
          cpp: paymentData.cpp,
          quantity_checked_by: paymentData.quantityCheckedBy,
          quality_checked_by: paymentData.qualityCheckedBy,
          purchase_owner: paymentData.purchaseOwner,
          price_check_guaranteed_by: paymentData.priceCheckGuaranteedBy,
          category_id: paymentData.categoryId,
          subcategory_id: paymentData.subcategoryId,
          urgency_level: paymentData.urgencyLevel
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
        const completePayment = await transformSinglePayment(payment);

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

  approvePayment: async (
    id: string,
    approver: User,
    paymentAmount?: number,
    reason?: string
  ) => {
    set({ isLoading: true });

    const result = await withNetworkCheck(async () => {
      try {
        // First get the current payment to check if payment amount is changing
        const { data: currentPayment, error: fetchError } = await supabase
          .from('payments')
          .select('payment_amount')
          .eq('id', id)
          .single();

        if (fetchError) {
          handleSupabaseError(fetchError);
          return false;
        }

        const updateData: any = {
          status: 'approved',
          approved_by: approver.id,
          updated_at: new Date().toISOString(),
        };

        // If payment amount is provided and different from current, store starting amount and reason
        if (paymentAmount !== undefined && paymentAmount !== currentPayment.payment_amount) {
          updateData.starting_amount = currentPayment.payment_amount;
          updateData.payment_amount = paymentAmount;
          if (reason) {
            updateData.amount_change_reason = reason;
          }
        }

        const { data, error } = await supabase
          .from('payments')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          handleSupabaseError(error);
          return false;
        }

        const transformedPayment = await transformSinglePayment(data);

        set((state) => ({
          payments: state.payments.map((payment) =>
            payment.id === id ? transformedPayment : payment
          ),
          isLoading: false,
        }));

        get().applyFilters();
        return true;
      } catch (error) {
        console.error('Error approving payment:', error);
        return false;
      }
    }, 'Failed to approve payment. Please check your internet connection.');

    if (!result) {
      set({ isLoading: false });
    }

    return result || false;
  },

  rejectPayment: async (id: string, approver: User) => {
    set({ isLoading: true });

    const result = await withNetworkCheck(async () => {
      try {
        const { data, error } = await supabase
          .from('payments')
          .update({
            status: 'rejected',
            accounts_verification_status:'pending',
            approved_by: approver.id
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          handleSupabaseError(error);
          return false;
        }

        const transformedPayment = await transformSinglePayment(data);

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

  bulkApprovePayments: async (ids: string[], approver: User) => {
    set({ isLoading: true });

    const result = await withNetworkCheck(async () => {
      try {
        const { data, error } = await supabase
          .from('payments')
          .update({
            status: 'approved',
            approved_by: approver.id
          })
          .in('id', ids)
          .select();

        if (error) {
          handleSupabaseError(error);
          return { success: [], failed: ids };
        }

        const transformedPayments = await Promise.all(data.map((payment: any) => transformSinglePayment(payment)));

        set(state => ({
          payments: state.payments.map(p => {
            const transformedPayment = transformedPayments.find(tp => tp.id === p.id);
            return transformedPayment || p;
          }),
          isLoading: false
        }));

        get().applyFilters();
        return { success: ids, failed: [] };
      } catch (error) {
        console.error('Error bulk approving payments:', error);
        return { success: [], failed: ids };
      }
    }, 'Failed to bulk approve payments. Please check your internet connection.');

    if (!result) {
      set({ isLoading: false });
      return { success: [], failed: ids };
    }

    return result;
  },

  bulkRejectPayments: async (ids: string[], approver: User) => {
    set({ isLoading: true });

    const result = await withNetworkCheck(async () => {
      try {
        const { data, error } = await supabase
          .from('payments')
          .update({
            status: 'rejected',
            accounts_verification_status:'pending',
            approved_by: approver.id
          })
          .in('id', ids)
          .select();

        if (error) {
          handleSupabaseError(error);
          return { success: [], failed: ids };
        }

        const transformedPayments = await Promise.all(data.map((payment: any) => transformSinglePayment(payment)));

        set(state => ({
          payments: state.payments.map(p => {
            const transformedPayment = transformedPayments.find(tp => tp.id === p.id);
            return transformedPayment || p;
          }),
          isLoading: false
        }));

        get().applyFilters();
        return { success: ids, failed: [] };
      } catch (error) {
        console.error('Error bulk rejecting payments:', error);
        return { success: [], failed: ids };
      }
    }, 'Failed to bulk reject payments. Please check your internet connection.');

    if (!result) {
      set({ isLoading: false });
      return { success: [], failed: ids };
    }

    return result;
  },

  markAsProcessed: async (id: string, invoiceReceived?: 'yes' | 'no', paymentAmount?: number, reason?: string) => {
    set({ isLoading: true });

    const result = await withNetworkCheck(async () => {
      try {
        // First get the current payment to check if payment amount is changing
        const { data: currentPayment, error: fetchError } = await supabase
          .from('payments')
          .select('payment_amount')
          .eq('id', id)
          .single();

        if (fetchError) {
          handleSupabaseError(fetchError);
          return false;
        }

        const updateData: any = {
          status: 'processed',
          updated_at: new Date().toISOString()
        };

        // Add optional fields if provided
        if (invoiceReceived !== undefined) {
          updateData.invoice_received = invoiceReceived;
        }

        // If payment amount is provided and different from current, store starting amount and reason
        if (paymentAmount !== undefined && paymentAmount !== currentPayment.payment_amount) {
          updateData.starting_amount = currentPayment.payment_amount;
          updateData.payment_amount = paymentAmount;
          if (reason) {
            updateData.amount_change_reason = reason;
          }
        }

        const { data, error } = await supabase
          .from('payments')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          handleSupabaseError(error);
          return false;
        }

        const transformedPayment = await transformSinglePayment(data);

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
        return false;
      }
    }, 'Failed to mark payment as processed. Please check your internet connection.');

    if (!result) {
      set({ isLoading: false });
    }

    return result || false;
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

        const transformedPayment = await transformSinglePayment(data);

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
            accounts_verification_status: 'pending',
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

  raiseAccountsQuery: async (id: string, accountsUser: User, query: string) => {
    set({ isLoading: true });

    const result = await withNetworkCheck(async () => {
      try {
        // First, check if the payment exists and get current data
        console.log('Attempting to raise accounts query for payment ID:', id);
        console.log('Query text:', query);
        console.log('User role:', accountsUser.role);

        const { data: existingPayment, error: fetchError } = await supabase
          .from('payments')
          .select('id, status, accounts_query')
          .eq('id', id)
          .single();

        if (fetchError) {
          console.error('Error fetching payment for verification:', fetchError);
          showErrorToast(`Cannot find payment: ${fetchError.message}`);
          throw fetchError;
        }

        if (!existingPayment) {
          console.error('Payment not found with ID:', id);
          showErrorToast('Payment not found');
          throw new Error('Payment not found');
        }

        console.log('Current payment data:', existingPayment);

        // Now attempt the update
        console.log('Attempting to update accounts_query field...');
        // NOTE: Accounts queries do NOT change the payment status - it remains "approved"
        const { error } = await supabase
          .from('payments')
          .update({
            accounts_query: query,
            updated_at: new Date().toISOString()
            // Explicitly NOT updating status - it should remain "approved"
          })
          .eq('id', id);

        if (error) {
          console.error('Database error in raiseAccountsQuery:', error);
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          showErrorToast(`Database error: ${error.message} (Code: ${error.code})`);
          throw error;
        }

        console.log('Successfully updated accounts_query field');

        // Update local state
        set(state => ({
          payments: state.payments.map(payment =>
            payment.id === id
              ? { ...payment, accountsQuery: query }
              : payment
          ),
          filteredPayments: state.filteredPayments.map(payment =>
            payment.id === id
              ? { ...payment, accountsQuery: query }
              : payment
          )
        }));

        showSuccessToast('Accounts query raised successfully');
        return true;
      } catch (error) {
        console.error('Error raising accounts query:', error);
        throw error;
      }
    }, 'Failed to raise accounts query. Please check your internet connection.');

    set({ isLoading: false });

    if (!result) {
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
            payment_mode: paymentData.paymentMode,
            status: existingPayment.status === 'query_raised' ? 'pending' : existingPayment.status,
            lpr: paymentData.lpr,
            ioa: paymentData.ioa,
            cpp: paymentData.cpp,
            quantity_checked_by: paymentData.quantityCheckedBy,
            quality_checked_by: paymentData.qualityCheckedBy,
            purchase_owner: paymentData.purchaseOwner,
            price_check_guaranteed_by: paymentData.priceCheckGuaranteedBy,
            category_id: paymentData.categoryId,
            subcategory_id: paymentData.subcategoryId,
            ...(paymentData.urgencyLevel && { urgency_level: paymentData.urgencyLevel }),
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

        const transformedPayment = await transformSinglePayment(updatedPayment);

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

  resetFilterOptions: (options?: Partial<FilterOptions>) => {
    set(state => ({
      filterOptions: {
        status: [],
        dateRange: { start: null, end: null },
        vendor: null,
        company: null,
        companyList: null,
        overdueInvoices: false,
        hasAccountsQuery: false,
        accountsVerificationStatus: [],
        ...options
      }
    }));
  },

  setSearchTerm: (searchTerm: string) => {
    set(state => ({
      searchTerm: searchTerm
    }));
  },

  applyFilters: () => {
    // Instead of client-side filtering, trigger a server-side fetch with current filters
    get().fetchPayments(1, get().pagination.pageSize, true, get().filterOptions, get().sortOptions, get().searchTerm);
  },

  exportToExcel: () => {
    // Implementation remains the same
    alert('Export to Excel functionality would be implemented here');
  },

  filterOverdueAdvanceInvoices: () => {
    // Set filter options for overdue invoices and trigger server-side fetch
    set(state => ({
      filterOptions: {
        status: [],
        dateRange: { start: null, end: null },
        vendor: null,
        company: null,
        companyList: null,
        overdueInvoices: true,
        hasAccountsQuery: false,
      }
    }));

    // Trigger server-side fetch with the overdue filter
    get().fetchPayments(1, get().pagination.pageSize, true, get().filterOptions, get().sortOptions, get().searchTerm);
  },

  filterAccountsQueries: () => {
    // Set filter options for accounts queries and trigger server-side fetch
    set(state => ({
      filterOptions: {
        status: ['approved'], // Only approved payments can have accounts queries
        dateRange: { start: null, end: null },
        vendor: null,
        company: null,
        companyList: null,
        overdueInvoices: false,
        hasAccountsQuery: true,
      }
    }));

    // Trigger server-side fetch with the accounts query filter
    get().fetchPayments(1, get().pagination.pageSize, true, get().filterOptions, get().sortOptions, get().searchTerm);
  },

  fetchPaymentById: async (id: string) => {
    set({ isLoading: true });

    const result = await withNetworkCheck(async () => {
      try {
        // Fetch payment with attachments
        const { data, error } = await supabase
          .from('payments')
          .select(`
            *,
            attachments:attachments(*)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!data) return null;

        const payment = await transformSinglePayment(data);

        // Add attachments to the payment object
        payment.attachments = data.attachments.map((attachment: any) => ({
          id: attachment.id,
          description: attachment.description,
          fileUrl: attachment.file_url,
          fileName: attachment.file_name,
          fileType: attachment.file_type,
          fileSize: attachment.file_size,
          createdAt: attachment.created_at,
          updatedAt: attachment.updated_at
        }));

        set({ isLoading: false });
        return payment;
      } catch (error) {
        console.error('Error fetching payment by ID:', error);
        set({ isLoading: false });
        throw error;
      }
    }, 'Failed to fetch payment by ID. Please check your internet connection.');

    if (!result) {
      set({ isLoading: false });
      return null;
    }

    return result;
  },

  fetchDashboardPayments: async () => {
    try {
      const result = await withNetworkCheck(async () => {
        try {
          // Get the current user's role
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser) {
            console.log('No authenticated user found');
            return [];
          }

          // Get user role (minimal query)
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', authUser.id)
            .single();

          if (userError) {
            console.error('Error fetching user role:', userError);
            return [];
          }

          // Build query for all payments (no filters)
          let query = supabase
            .from('payments')
            .select('*');

          // Apply role-based filtering only
          if (userData.role !== 'admin' && userData.role !== 'accounts') {
            query = query.eq('requested_by', authUser.id);
          }

          // Get all payments for accurate stats
          const { data: rows, error } = await query
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching dashboard payments:', error);
            return [];
          }

          if (!rows || rows.length === 0) {
            return [];
          }

          // Extract all unique user IDs to fetch in batch
          const userIds = new Set<string>();
          rows.forEach(row => {
            userIds.add(row.requested_by);
            if (row.approved_by) {
              userIds.add(row.approved_by);
            }
          });

          // Batch fetch all users
          const uncachedUserIds = Array.from(userIds).filter(id => !usersCache.has(id));

          if (uncachedUserIds.length > 0) {
            const { data: users, error: usersError } = await supabase
              .from('users')
              .select('*')
              .in('id', uncachedUserIds);

            if (usersError) {
              console.error('Error fetching users:', usersError);
            } else {
              users?.forEach(user => {
                usersCache.set(user.id, user);
              });
            }
          }

          // Create users map for quick lookup
          const usersMap = new Map();
          userIds.forEach(id => {
            if (usersCache.has(id)) {
              usersMap.set(id, usersCache.get(id));
            }
          });

          // Transform payments for dashboard (no bills/attachments needed)
          const dashboardPayments = rows.map(row => {
            const requestedByUser = usersMap.get(row.requested_by) || {
              id: row.requested_by,
              email: 'unknown@example.com',
              name: 'Unknown User',
              role: 'user' as const,
              company: 'Unknown Company'
            };

            let approvedByUser = null;
            if (row.approved_by) {
              approvedByUser = usersMap.get(row.approved_by) || {
                id: row.approved_by,
                email: 'unknown@example.com',
                name: 'Unknown User',
                role: 'user' as const,
                company: 'Unknown Company'
              };
            }

            return {
              id: row.id,
              serialNumber: row.serial_number,
              date: row.date,
              vendorName: row.vendor_name,
              vendorId: row.vendor_id,
              totalOutstanding: row.total_outstanding,
              advanceDetails: row.advance_details as 'tax_invoice' | 'advance_(bill/PI)' | 'advance' | 'others',
              paymentAmount: row.payment_amount,
              balanceAmount: row.balance_amount,
              itemDescription: row.item_description,
              bills: [], // Empty for dashboard
              attachments: [], // Empty for dashboard
              requestedBy: requestedByUser,
              approvedBy: approvedByUser,
              companyName: row.company_name,
              companyBranch: row.company_branch,
              bankName: row.bank_name,
              paymentMode: row.payment_mode as 'net_banking' | 'upi',
              status: row.status,
              queryDetails: row.query_details || undefined,
              accountsQuery: row.accounts_query || undefined,
              accountsVerificationStatus: row.accounts_verification_status || 'pending',
              lpr: row.lpr || undefined,
              ioa: row.ioa || undefined,
              cpp: row.cpp || undefined,
              invoiceReceived: row.invoice_received || undefined,
              startingAmount: row.starting_amount || undefined,
              quantityCheckedBy: row.quantity_checked_by || undefined,
              qualityCheckedBy: row.quality_checked_by || undefined,
              purchaseOwner: row.purchase_owner || undefined,
              priceCheckGuaranteedBy: row.price_check_guaranteed_by || undefined,
              categoryId: row.category_id || undefined,
              subcategoryId: row.subcategory_id || undefined,
              urgencyLevel: row.urgency_level || 'normal',
              createdAt: row.created_at,
              updatedAt: row.updated_at
            };
          });

          return dashboardPayments;
        } catch (error) {
          console.error('Error in fetchDashboardPayments:', error);
          return [];
        }
      }, 'Failed to fetch dashboard payments. Please check your internet connection.');

      return result || [];
    } catch (error) {
      console.error('Error fetching dashboard payments:', error);
      return [];
    }
  },

  addFund: async (amount: number): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Get current day ID first
      const { data: currentDayId, error: dayIdError } = await supabase
        .rpc('get_current_day_id');

      if (dayIdError) throw dayIdError;

      // Add fund to the funds table with the current day_id
      const { error: fundError } = await supabase
        .from('funds')
        .insert({
          amount,
          added_by: user.id,
          day_id: currentDayId
        });

      if (fundError) throw fundError;

      // Get total funds available for current day to verify the addition
      const { data: funds, error: fundsError } = await supabase
        .from('funds')
        .select('amount')
        .eq('day_id', currentDayId);

      if (fundsError) throw fundsError;

      const totalFundAvailable = funds?.reduce((sum, fund) => sum + (fund.amount || 0), 0) || 0;

      // Update dashboard stats with the new fund amount
      set(state => ({
        ...state,
        dashboardStats: {
          ...(state.dashboardStats || {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
            processed: 0,
            queryRaised: 0,
            accountsQueriesRaised: 0,
            overdueAdvanceInvoices: 0,
            totalAmount: 0,
            pendingAmount: 0,
            totalFundAvailable: 0,
            totalPaymentToInitiate: 0,
            netFundAvailable: 0,
            dayId: '',
            pendingAccountsVerifications: 0
          }),
          totalFundAvailable,
          totalPaymentToInitiate: state.dashboardStats?.totalPaymentToInitiate || 0,
          netFundAvailable: totalFundAvailable - (state.dashboardStats?.totalPaymentToInitiate || 0),
          dayId: currentDayId,
          pendingAccountsVerifications: state.dashboardStats?.pendingAccountsVerifications || 0
        }
      }));
    } catch (error) {
      console.error('Error adding fund:', error);
      throw error;
    }
  },

  getFundStats: async (): Promise<void> => {
    try {
      // Get the current day's funds
      const { data: currentDayId, error: dayIdError } = await supabase
        .rpc('get_current_day_id');

      if (dayIdError) {
        console.error('Error getting current day ID:', dayIdError);
        return;
      }

      // Get total funds available for current day
      const { data: funds, error: fundsError } = await supabase
        .from('funds')
        .select('amount')
        .eq('day_id', currentDayId);

      if (fundsError) {
        console.error('Error getting funds:', fundsError);
        return;
      }

      const totalFundAvailable = funds?.reduce((sum, fund) => sum + (fund.amount || 0), 0) || 0;

      // Get all payments for the current cycle
      const now = new Date();
      // Get today's date at 6 PM UTC
      const todayAt6PMUTC = new Date();
      todayAt6PMUTC.setUTCHours(12, 30, 0, 0); // 6 PM IST in UTC is 12:30 UTC

      // If current time is after 6 PM IST, show payments after 6 PM today
      // If current time is before 6 PM IST, show payments after 6 PM yesterday
      const startTime = now > todayAt6PMUTC ?
        todayAt6PMUTC :
        new Date(todayAt6PMUTC.getTime() - 24 * 60 * 60 * 1000);
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('payment_amount, status, created_at')
        .gte('created_at', startTime.toISOString())
        .lte('created_at', now.toISOString());

      if (paymentsError) {
        console.error('Error getting payments:', paymentsError);
        return;
      }

      // Calculate total payment to initiate from all payments in the cycle
      const totalPaymentToInitiate = payments?.reduce((sum, p) => sum + (p.payment_amount || 0), 0) || 0;
      // Update the dashboard stats with new fund values
      set(state => ({
        ...state,
        dashboardStats: {
          ...(state.dashboardStats || {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
            processed: 0,
            queryRaised: 0,
            accountsQueriesRaised: 0,
            overdueAdvanceInvoices: 0,
            totalAmount: 0,
            pendingAmount: 0,
            totalFundAvailable: 0,
            totalPaymentToInitiate: 0,
            netFundAvailable: 0,
            dayId: '',
            pendingAccountsVerifications: 0
          }),
          totalFundAvailable,
          totalPaymentToInitiate,
          netFundAvailable: totalFundAvailable - totalPaymentToInitiate,
          dayId: currentDayId,
          pendingAccountsVerifications: state.dashboardStats?.pendingAccountsVerifications || 0
        }
      }));
    } catch (error) {
      console.error('Error getting fund stats:', error);
      // Don't throw the error, just log it and preserve existing stats
      return;
    }
  },

  accountsVerifyPayment: async (id: string) => {
    set({ isLoading: true });

    const result = await withNetworkCheck(async () => {
      try {
        const { data, error } = await supabase
          .from('payments')
          .update({
            accounts_verification_status: 'verified',
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          handleSupabaseError(error);
          return false;
        }

        const transformedPayment = await transformSinglePayment(data);

        set(state => ({
          payments: state.payments.map(payment =>
            payment.id === id ? transformedPayment : payment
          ),
          filteredPayments: state.filteredPayments.map(payment =>
            payment.id === id ? transformedPayment : payment
          ),
          isLoading: false
        }));

        showSuccessToast('Payment verified successfully');
        return true;
      } catch (error) {
        console.error('Error verifying payment:', error);
        showErrorToast('Failed to verify payment');
        return false;
      }
    }, 'Failed to verify payment. Please check your internet connection.');

    if (!result) {
      set({ isLoading: false });
      return false;
    }

    return result;
  },

  bulkProcessPayments: async (ids: string[]) => {
    set({ isLoading: true });

    const result = await withNetworkCheck(async () => {
      try {
        const { data, error } = await supabase
          .from('payments')
          .update({
            status: 'processed',
            invoice_received: 'no',
            updated_at: new Date().toISOString()
          })
          .in('id', ids)
          .select();

        if (error) {
          handleSupabaseError(error);
          return { success: [], failed: ids };
        }

        const transformedPayments = await Promise.all(data.map((payment: any) => transformSinglePayment(payment)));

        set(state => ({
          payments: state.payments.map(p => {
            const transformedPayment = transformedPayments.find(tp => tp.id === p.id);
            return transformedPayment || p;
          }),
          isLoading: false
        }));

        get().applyFilters();
        return { success: ids, failed: [] };
      } catch (error) {
        console.error('Error bulk processing payments:', error);
        return { success: [], failed: ids };
      }
    }, 'Failed to bulk process payments. Please check your internet connection.');

    if (!result) {
      set({ isLoading: false });
      return { success: [], failed: ids };
    }

    return result;
  },

  bulkMarkInvoiceReceived: async (ids: string[]) => {
    console.log('[bulkMarkInvoiceReceived] Starting with IDs:', ids);
    set({ isLoading: true });
  
    const result = await withNetworkCheck(
      async () => {
        try {
          const { data, error } = await supabase
            .from('payments')
            .update({
              invoice_received: 'yes',
              updated_at: new Date().toISOString()
            })
            .in('id', ids)
            .select();
  
          if (error) {
            console.error('[bulkMarkInvoiceReceived] Supabase error:', error.message, error.details);
            handleSupabaseError(error);
            return { success: [], failed: ids };
          }
  
          console.log('[bulkMarkInvoiceReceived] Successfully updated payments:', data.length);
  
          const transformedPayments = await Promise.all(
            data.map((payment: any) => transformSinglePayment(payment))
          );
  
          set((state) => ({
            payments: state.payments.map((p) => {
              const updated = transformedPayments.find((tp) => tp.id === p.id);
              return updated || p;
            }),
            isLoading: false,
          }));
  
          console.log('[bulkMarkInvoiceReceived] State updated and filters reapplied');
          get().applyFilters();
  
          return { success: ids, failed: [] };
        } catch (error) {
          console.error('[bulkMarkInvoiceReceived] Unexpected error:', error);
          set({ isLoading: false });
          return { success: [], failed: ids };
        }
      },
      'Failed to mark invoices received. Please check your internet connection.'
    );
  
    if (!result) {
      console.warn('[bulkMarkInvoiceReceived] Network check failed');
      set({ isLoading: false });
      return { success: [], failed: ids };
    }
  
    console.log('[bulkMarkInvoiceReceived] Done:', result);
    return result;
  },

  bulkAccountsVerifyPayments: async (ids: string[]) => {
    set({ isLoading: true });

    const result = await withNetworkCheck(
      async () => {
        try {
          const { data, error } = await supabase
            .from('payments')
            .update({
              accounts_verification_status: 'verified',
            })
            .in('id', ids)
            .select();

          if (error) {
            console.error('[bulkAccountsVerifyPayments] Supabase error:', error.message, error.details);
            handleSupabaseError(error);
            return { success: [], failed: ids };
          }

          console.log('[bulkAccountsVerifyPayments] Successfully updated payments:', data.length);

          const transformedPayments = await Promise.all(
            data.map((payment: any) => transformSinglePayment(payment))
          );

          set((state) => ({
            payments: state.payments.map((p) => {
              const updated = transformedPayments.find((tp) => tp.id === p.id);
              return updated || p;
            }),
            isLoading: false,
          }));

          console.log('[bulkAccountsVerifyPayments] State updated and filters reapplied');
          get().applyFilters();

          return { success: ids, failed: [] };
        } catch (error) {
          console.error('[bulkAccountsVerifyPayments] Unexpected error:', error);
          set({ isLoading: false });
          return { success: [], failed: ids };
        }
      },
      'Failed to accounts verify payments. Please check your internet connection.'
    );

    if (!result) {
      console.warn('[bulkAccountsVerifyPayments] Network check failed');
      set({ isLoading: false });
      return { success: [], failed: ids };
    }

    console.log('[bulkAccountsVerifyPayments] Done:', result);
    return result;
  }

  
}));