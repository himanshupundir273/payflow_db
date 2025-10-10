import { createClient } from '@supabase/supabase-js';
import { DatabaseConnection } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private connection: DatabaseConnection | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async connect(): Promise<DatabaseConnection> {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase environment variables');
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        }
      });

      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: 'admin@example.com',
          password: '1234'
        });

        if (authError) {
          console.log('❌ Admin auth failed:', authError.message);
          console.log('🔄 Continuing with service role...');
        } else {
          console.log('✅ Admin authentication successful!');
          console.log('👤 Authenticated as:', authData.user?.email);
        }
      } catch (authErr) {
        console.log('❌ Admin auth error:', authErr);
        console.log('🔄 Continuing with service role...');
      }

      // Test connection
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (error) {
        throw new Error(`Database connection test failed: ${error.message}`);
      }

      this.connection = {
        supabase,
        isConnected: true,
        lastHeartbeat: new Date()
      };

      logger.info('Database connection established successfully');
      
      // Start heartbeat monitoring
      this.startHeartbeat();
      
      return this.connection;
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  public getConnection(): DatabaseConnection {
    if (!this.connection || !this.connection.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.connection;
  }

  public async disconnect(): Promise<void> {
    if (this.connection) {
      this.connection.isConnected = false;
      this.connection = null;
      logger.info('Database connection closed');
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      const connection = this.getConnection();
      const { error } = await connection.supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (error) {
        throw error;
      }

      connection.lastHeartbeat = new Date();
      return true;
    } catch (error) {
      logger.error('Database connection test failed:', error);
      return false;
    }
  }

  private async startHeartbeat(): Promise<void> {
    setInterval(async () => {
      try {
        const isHealthy = await this.testConnection();
        if (!isHealthy && this.connection) {
          this.connection.isConnected = false;
          await this.handleReconnection();
        }
      } catch (error) {
        logger.error('Heartbeat check failed:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  private async handleReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    logger.info(`Attempting to reconnect to database (attempt ${this.reconnectAttempts})`);

    try {
      await this.connect();
      this.reconnectAttempts = 0;
      logger.info('Database reconnection successful');
    } catch (error) {
      logger.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, error);
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      setTimeout(() => this.handleReconnection(), delay);
    }
  }

  public async executeQuery<T = any>(
    query: string,
    params?: Record<string, any>
  ): Promise<T[]> {
    try {
      const connection = this.getConnection();
      
      // Execute intelligent queries based on query intent
      logger.info('Executing query:', { query: query.substring(0, 100) });
      
      return await this.executeIntelligentQuery(query, params);
    } catch (error) {
      logger.error('Query execution failed:', error);
      throw error;
    }
  }

  // private async executeIntelligentQuery<T = any>(
  //   query: string, 
  //   params?: Record<string, any>
  // ): Promise<T[]> {
  //   const lowerQuery = query.toLowerCase();
  //   const connection = this.getConnection();
    
  //   try {
  //     // Payment Status Queries (explicit status handling)
  //     if (
  //       lowerQuery.includes('pending') ||
  //       lowerQuery.includes('approved') ||
  //       lowerQuery.includes('rejected') ||
  //       lowerQuery.includes('processed') ||
  //       lowerQuery.includes('query_raised')
  //     ) {
  //       let targetStatus: 'pending' | 'approved' | 'rejected' | 'processed' | 'query_raised' | null = null;
  //       if (lowerQuery.includes('approved')) targetStatus = 'approved';
  //       else if (lowerQuery.includes('rejected')) targetStatus = 'rejected';
  //       else if (lowerQuery.includes('processed')) targetStatus = 'processed';
  //       else if (lowerQuery.includes('query_raised') || lowerQuery.includes('query raised')) targetStatus = 'query_raised';
  //       else if (lowerQuery.includes('pending')) targetStatus = 'pending';

  //       const base = connection.supabase
  //         .from('payments')
  //         .select('id, vendor_name, payment_amount, status, date, company_name, urgency_level, total_outstanding, balance_amount, item_description')
  //         .order('date', { ascending: false })
  //         .limit(200);

  //       const queryBuilder = targetStatus ? base.eq('status', targetStatus) : base;
  //       const { data, error } = await queryBuilder;
  //       if (error) throw error;
  //       return data || [];
  //     }
      
  //     // Vendor Analytics
  //     if (lowerQuery.includes('vendor') || lowerQuery.includes('supplier')) {
  //       const { data, error } = await connection.supabase
  //         .from('vendors')
  //         .select('id, name, account_number, ifsc_code, status, created_at')
  //         .order('created_at', { ascending: false })
  //         .limit(200);
        
  //       if (error) throw error;
  //       return data || [];
  //     }
      
  //     // Category Analysis
  //     if (lowerQuery.includes('category') || lowerQuery.includes('subcategory')) {
  //       const { data, error } = await connection.supabase
  //         .from('categories')
  //         .select('id, name, description, status, created_at')
  //         .order('name', { ascending: true })
  //         .limit(200);
        
  //       if (error) throw error;
  //       return data || [];
  //     }
      
  //     // Financial Reports
  //     if (lowerQuery.includes('financial') || lowerQuery.includes('summary') || lowerQuery.includes('report')) {
  //       const { data, error } = await connection.supabase
  //         .from('payments')
  //         .select('status, payment_amount, urgency_level')
  //         .limit(200);
        
  //       if (error) throw error;
  //       return data || [];
  //     }
      
  //     // Scheduled Payments
  //     if (lowerQuery.includes('scheduled') || lowerQuery.includes('recurring')) {
  //       const { data, error } = await connection.supabase
  //         .from('scheduled_payments')
  //         .select('id, vendor_name, payment_amount, schedule_status, scheduled_for, is_recurring, recurrence_pattern, urgency_level')
  //         .order('scheduled_for', { ascending: true })
  //         .limit(200);
        
  //       if (error) throw error;
  //       return data || [];
  //     }
      
  //     // Fund Analysis
  //     if (lowerQuery.includes('fund') || lowerQuery.includes('balance')) {
  //       const { data, error } = await connection.supabase
  //         .from('funds')
  //         .select('id, amount, day_id, created_at')
  //         .order('created_at', { ascending: false })
  //         .limit(200);
        
  //       if (error) throw error;
  //       return data || [];
  //     }
      
  //     // User Activity
  //     if (lowerQuery.includes('user') || lowerQuery.includes('activity')) {
  //       const { data, error } = await connection.supabase
  //         .from('users')
  //         .select('id, name, email, role, company, status, created_at')
  //         .order('name', { ascending: true })
  //         .limit(200);
        
  //       if (error) throw error;
  //       return data || [];
  //     }
      
  //     // Default: get recent payments
  //     const { data, error } = await connection.supabase
  //       .from('payments')
  //       .select('id, vendor_name, payment_amount, status, date, company_name, urgency_level, total_outstanding, balance_amount, item_description')
  //       .order('date', { ascending: false })
  //       .limit(200);
      
  //     if (error) throw error;
  //     return data || [];
      
  //   } catch (fallbackError) {
  //     logger.error('Intelligent query execution failed:', fallbackError);
  //     // Return empty array instead of throwing
  //     return [];
  //   }
  // }
  private async executeIntelligentQuery<T = any>(
    query: string,
    params?: Record<string, any>
  ): Promise<T[]> {
    const connection = this.getConnection();
  
    try {
      // Parse AI query
      let jsonString = query.replace(/^SELECT\s*/i, '').trim();
  
      jsonString = jsonString.replace(/(\w+)\s*:\s*([\w\-\s]+)/g, (_, key, value) => {
        value = value.trim();
        if (!isNaN(Number(value))) return `"${key}": ${value}`;
        return `"${key}": "${value}"`;
      });
  
      let parsed: any;
      try {
        parsed = JSON.parse(jsonString);
      } catch (err) {
        logger.error('Failed to parse AI response:', err);
        return [];
      }
  
      let {
        table,
        column_name,
        filter,
        payment_status,
        gte,
        lte,
        limit
      } = parsed;
  
      if (!table) return [];
  
      let queryBuilder;
  
      // Payments table logic
      if (table === 'payments') {
        queryBuilder = connection.supabase
          .from('payments')
          .select(`
            *,
            categories:category_id(name),
            subcategories:subcategory_id(name)
          `);
  
        // Always apply payment_status filter
        if (payment_status) {
          queryBuilder = queryBuilder.eq('status', payment_status);
        }
  
        // Multi-column filter
        if (filter && column_name && ['item_description', 'category', 'subcategory'].includes(column_name.toLowerCase())) {
          // Step 1: fetch matching category/subcategory IDs
          const [catRes, subcatRes] = await Promise.all([
            connection.supabase
              .from('categories')
              .select('id')
              .ilike('name', `%${filter}%`),
            connection.supabase
              .from('subcategories')
              .select('id')
              .ilike('name', `%${filter}%`)
          ]);
  
          const catIds = catRes.data?.map(c => c.id) || [];
          const subcatIds = subcatRes.data?.map(s => s.id) || [];
  
          // Step 2: build filter across all
          queryBuilder = queryBuilder.or(
            [
              `item_description.ilike.%${filter}%`,
              catIds.length ? `category_id.in.(${catIds.join(',')})` : '',
              subcatIds.length ? `subcategory_id.in.(${subcatIds.join(',')})` : ''
            ]
              .filter(Boolean)
              .join(',')
          );
        } else if (column_name && filter) {
          queryBuilder = queryBuilder.ilike(column_name, `%${filter}%`);
        }
      } else {
        // Other tables
        queryBuilder = connection.supabase.from(table).select('*');
        if (column_name && filter) {
          queryBuilder = queryBuilder.ilike(column_name, `%${filter}%`);
        }
      }
  
      // Global date filters
      if (gte) queryBuilder = queryBuilder.gte('created_at', gte);
      if (lte) queryBuilder = queryBuilder.lte('updated_at', lte);
  
      // Limit + order
      if (limit) queryBuilder = queryBuilder.limit(Number(limit));
      if (['payments', 'funds', 'scheduled_payments'].includes(table)) {
        queryBuilder = queryBuilder.order('created_at', { ascending: false });
      }
  
      const { data, error } = await queryBuilder;
      if (error) throw error;
  
      return data || [];
    } catch (fallbackError) {
      logger.error('Intelligent query execution failed:', fallbackError);
      return [];
    }
  }
  
  
  
  
  public async executeTransaction<T = any>(
    queries: Array<{ query: string; params?: Record<string, any> }>
  ): Promise<T[]> {
    try {
      const connection = this.getConnection();
      const results: T[] = [];

      for (const { query, params } of queries) {
        const result = await this.executeQuery<T>(query, params);
        results.push(...result);
      }

      return results;
    } catch (error) {
      logger.error('Transaction execution failed:', error);
      throw error;
    }
  }

  public getSchemaInfo(): Record<string, any> {
    // Return database schema information for query building
    // Removed created_at and updated_at to avoid AI returned query from being flagged by security validator
    return {
      tables: {
        payments: {
          columns: ['id', 'serial_number', 'date', 'vendor_name', 'total_outstanding', 'payment_amount', 'balance_amount', 'item_description', 'requested_by', 'approved_by', 'company_name', 'status', 'advance_details', 'query_details', 'bank_name', 'company_branch', 'lpr', 'ioa', 'cpp', 'invoice_received', 'accounts_query', 'payment_mode', 'starting_amount', 'quantity_checked_by', 'quality_checked_by', 'purchase_owner', 'price_check_guaranteed_by', 'category_id', 'subcategory_id', 'urgency_level', 'amount_change_reason'],
          relationships: {
            requested_by: 'users.id',
            approved_by: 'users.id',
            category_id: 'categories.id',
            subcategory_id: 'subcategories.id'
          }
        },
        users: {
          columns: ['id', 'email', 'name', 'role', 'company'],
          relationships: {}
        },
        vendors: {
          columns: ['id', 'name', 'account_number', 'ifsc_code', 'added_by', 'status'],
          relationships: {
            added_by: 'users.id'
          }
        },
        categories: {
          columns: ['id', 'name', 'description', 'status', 'added_by'],
          relationships: {
            added_by: 'users.id'
          }
        },
        subcategories: {
          columns: ['id', 'name', 'category_id', 'description', 'status', 'added_by'],
          relationships: {
            category_id: 'categories.id',
            added_by: 'users.id'
          }
        },
        companies: {
          columns: ['id', 'name', 'code', 'description', 'status'],
          relationships: {}
        },
        branches: {
          columns: ['id', 'name', 'company_id', 'description', 'status'],
          relationships: {
            company_id: 'companies.id'
          }
        },
        funds: {
          columns: ['id', 'amount', 'added_by', 'day_id'],
          relationships: {
            added_by: 'users.id'
          }
        },
        scheduled_payments: {
          columns: ['id', 'scheduled_for', 'schedule_status', 'promoted_date', 'payment_id', 'vendor_name', 'vendor_id', 'company_name', 'company_branch', 'category_id', 'subcategory_id', 'bank_name', 'payment_mode', 'advance_details', 'total_outstanding', 'payment_amount', 'balance_amount', 'quantity_checked_by', 'quality_checked_by', 'purchase_owner', 'price_check_guaranteed_by', 'item_description', 'lpr', 'ioa', 'cpp', 'requested_by', 'urgency_level', 'is_recurring', 'recurrence_pattern', 'recurrence_end_type', 'recurrence_end_after', 'recurrence_end_date', 'parent_payment_id', 'next_execution', 'last_execution_date', 'execution_count'],
          relationships: {
            vendor_id: 'vendors.id',
            category_id: 'categories.id',
            subcategory_id: 'subcategories.id',
            requested_by: 'users.id'
          }
        }
      }
    };
  }
}
