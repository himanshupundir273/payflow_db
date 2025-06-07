export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'user' | 'admin' | 'accounts'
          company: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role: 'user' | 'admin' | 'accounts'
          company: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'user' | 'admin' | 'accounts'
          company?: string
          created_at?: string
        }
      }
      vendors: {
        Row: {
          id: string
          name: string
          account_number: string
          ifsc_code: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          account_number: string
          ifsc_code: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          account_number?: string
          ifsc_code?: string
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          serial_number: number
          date: string
          vendor_name: string
          total_outstanding: number
          advance_details: 'tax_invoice' | 'advance_(bill/PI)' | 'advance' | 'others'
          payment_amount: number
          balance_amount: number
          item_description: string
          requested_by: string
          approved_by: string | null
          company_name: string
          company_branch: string
          bank_name: string
          payment_mode: 'net_banking' | 'upi'
          status: 'pending' | 'approved' | 'rejected' | 'processed' | 'query_raised'
          query_details: string | null
          accounts_query: string | null
          lpr: string | null
          ioa: string | null
          cpp: string | null
          invoice_received: 'yes' | 'no' | null
          starting_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          serial_number?: number
          date: string
          vendor_name: string
          total_outstanding: number
          advance_details: 'tax_invoice' | 'advance_(bill/PI)' | 'advance' | 'others'
          payment_amount: number
          balance_amount: number
          item_description: string
          requested_by: string
          approved_by?: string | null
          company_name: string
          company_branch: string
          bank_name: string
          payment_mode?: 'net_banking' | 'upi'
          status?: 'pending' | 'approved' | 'rejected' | 'processed' | 'query_raised'
          query_details?: string | null
          accounts_query?: string | null
          lpr?: string | null
          ioa?: string | null
          cpp?: string | null
          invoice_received?: 'yes' | 'no' | null
          starting_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          serial_number?: number
          date?: string
          vendor_name?: string
          total_outstanding?: number
          advance_details?: 'tax_invoice' | 'advance_(bill/PI)' | 'advance' | 'others'
          payment_amount?: number
          balance_amount?: number
          item_description?: string
          requested_by?: string
          approved_by?: string | null
          company_name?: string
          company_branch?: string
          bank_name?: string
          payment_mode?: 'net_banking' | 'upi'
          status?: 'pending' | 'approved' | 'rejected' | 'processed' | 'query_raised'
          query_details?: string | null
          accounts_query?: string | null
          lpr?: string | null
          ioa?: string | null
          cpp?: string | null
          invoice_received?: 'yes' | 'no' | null
          starting_amount?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      bills: {
        Row: {
          id: string
          payment_id: string
          bill_number: string
          bill_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          payment_id: string
          bill_number: string
          bill_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          payment_id?: string
          bill_number?: string
          bill_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      attachments: {
        Row: {
          id: string
          payment_id: string
          description: string
          file_url: string
          file_name: string
          file_type: string
          file_size: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          payment_id: string
          description: string
          file_url: string
          file_name: string
          file_type: string
          file_size: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          payment_id?: string
          description?: string
          file_url?: string
          file_name?: string
          file_type?: string
          file_size?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}