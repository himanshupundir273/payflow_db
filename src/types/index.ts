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
  lpr?: string | null;
  ioa?: string | null;
  cpp?: string | null;
  invoiceReceived?: 'yes' | 'no' | null;
  startingAmount?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FilterOptions {
  status: string[];
  dateRange: {
    start: string | null;
    end: string | null;
  };
  vendor: string | null;
  company: string | null;
  overdueInvoices: boolean;
  hasAccountsQuery: boolean;
}