export type UserRole = 'user' | 'admin' | 'accounts';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company: string;
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  accountNumber: string;
  ifscCode: string;
  addedBy: string;
  status: 'approved' | 'pending';
  createdAt: string;
  updatedAt: string;
}

export interface Bill {
  id: string;
  billNumber: string;
  billDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  description: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
  file?: File;
}

export interface PaymentRequest {
  id: string;
  serialNumber: number;
  date: string;
  vendorName: string;
  vendorId: string | null;
  totalOutstanding: number;
  advanceDetails: 'tax_invoice' | 'advance_(bill/PI)' | 'advance' | 'others';
  paymentAmount: number;
  balanceAmount: number;
  itemDescription: string;
  bills: Bill[];
  attachments: Attachment[];
  requestedBy: User;
  approvedBy: User | null;
  companyName: string;
  companyBranch: string;
  bankName: string;
  paymentMode: 'net_banking' | 'upi';
  status: 'pending' | 'approved' | 'rejected' | 'processed' | 'query_raised';
  queryDetails?: string;
  accountsQuery?: string;
  accountsVerificationStatus?: 'pending' | 'verified' | 'rejected';
  lpr?: string | null;
  ioa?: string | null;
  cpp?: string | null;
  invoiceReceived?: 'yes' | 'no' | null;
  startingAmount?: number | null;
  quantityCheckedBy?: string | null;
  qualityCheckedBy?: string | null;
  purchaseOwner?: string | null;
  priceCheckGuaranteedBy?: string | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
  createdAt: string;
  updatedAt: string;
  amountChangeReason?: string;
}

export interface FilterOptions {
  status: string[];
  dateRange: {
    start: string | null;
    end: string | null;
  };
  vendor: string | null;
  company: string | null;
  companyList: { code: string; fullName: string }[] | null;
  overdueInvoices: boolean;
  hasAccountsQuery: boolean;
  accountsVerificationStatus?: string[];
}


export interface DashboardStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  processed: number;
  queryRaised: number;
  accountsQueriesRaised: number;
  overdueAdvanceInvoices: number;
  totalAmount: number;
  pendingAmount: number;
  totalFundAvailable: number;
  totalPaymentToInitiate: number;
  netFundAvailable: number;
  dayId: string;
  pendingAccountsVerifications: number;
}

interface PaginationOptions {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaymentState {
  payments: PaymentRequest[];
  filteredPayments: PaymentRequest[];
  filterOptions: FilterOptions;
  isLoading: boolean;
  dashboardStats: DashboardStats | null;
  pagination: PaginationOptions;
  sortOptions: SortOptions;
  searchTerm: string;

  // New functions for fund tracking
  addFund: (amount: number) => Promise<void>;
  getFundStats: () => Promise<void>;

  // Actions
  fetchPayments: (
    page?: number,
    pageSize?: number,
    forceRefresh?: boolean,
    filters?: Partial<FilterOptions>,
    sortOptions?: SortOptions,
    searchTerm?: string
  ) => Promise<{ payments: PaymentRequest[] } | null>;
  fetchPaymentById: (id: string) => Promise<PaymentRequest | null>;
  fetchDashboardPayments: () => Promise<PaymentRequest[]>;
  fetchDashboardStats: () => Promise<void>;
  addPayment: (payment: Omit<PaymentRequest, 'id' | 'serialNumber' | 'status' | 'createdAt' | 'updatedAt' | 'approvedBy'>) => Promise<PaymentRequest | null>;
  approvePayment: (id: string, approver: User, paymentAmount?: number, reason?: string) => Promise<boolean>;
  rejectPayment: (id: string, approver: User) => Promise<void>;
  bulkApprovePayments: (ids: string[], approver: User) => Promise<{ success: string[]; failed: string[] }>;
  bulkRejectPayments: (ids: string[], approver: User) => Promise<{ success: string[]; failed: string[] }>;
  bulkProcessPayments: (ids: string[]) => Promise<{ success: string[]; failed: string[] }>;
  bulkAccountsVerifyPayments: (ids: string[]) => Promise<{ success: string[]; failed: string[] }>;
  bulkMarkInvoiceRecieved?: (ids: string[]) =>Promise<{ success: string[]; failed: string[] }>;
  markAsProcessed: (id: string, invoiceReceived?: 'yes' | 'no',paymentAmount?: number, reason?: string) => Promise<boolean>;
  markInvoiceReceived: (id: string) => Promise<boolean>;
  raiseQuery: (id: string, approver: User, query: string) => Promise<boolean>;
  raiseAccountsQuery: (id: string, accountsUser: User, query: string) => Promise<boolean>;
  accountsVerifyPayment: (id: string) => Promise<boolean>;
  setFilterOptions: (options: Partial<FilterOptions>) => void;
  setSearchTerm: (searchTerm: string) => void;
  applyFilters: () => void;
  resetFilterOptions: (options?: Partial<FilterOptions>) => void;
  exportToExcel: () => void;
  updatePayment: (id: string, paymentData: Partial<PaymentRequest>) => Promise<boolean>;
  filterOverdueAdvanceInvoices: () => void;
  filterAccountsQueries: () => void;
}