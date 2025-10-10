import { MCPToolDefinition, MCPResponse, QueryParams, QueryIntent } from '../types/index.js';
import { DatabaseManager } from '../config/database.js';
import { GeminiManager } from '../utils/gemini.js';
import { logger, auditLogger, performanceLogger } from '../utils/logger.js';
import { SecurityValidator } from '../utils/security-validator.js';

export class DatabaseQueryTool {
  static definition: MCPToolDefinition = {
    name: "execute_payment_query",
    description: "Execute intelligent queries on payment management database with natural language processing",
    inputSchema: {
      type: "object",
      properties: {
        query_intent: { 
          type: "string", 
          description: "Natural language query description" 
        },
        filters: { 
          type: "object", 
          description: "Additional filters and parameters" 
        },
        output_format: { 
          type: "string", 
          enum: ["table", "chart", "summary", "export", "dashboard"],
          description: "Desired output format"
        },
        time_range: { 
          type: "object", 
          description: "Time range for the query" 
        },
        pagination: {
          type: "object",
          description: "Pagination parameters"
        },
        sorting: {
          type: "object",
          description: "Sorting parameters"
        }
      },
      required: ["query_intent"]
    }
  };

  private static dbManager = DatabaseManager.getInstance();
  private static geminiManager = GeminiManager.getInstance();
  private static securityValidator = new SecurityValidator();

  static async execute(args: any, securityContext: any): Promise<MCPResponse> {
    const perf = performanceLogger.start('database_query_execution');
    
    try {
      // Validate security context
      if (!securityContext || !securityContext.userId || !securityContext.userRole) {
        throw new Error('Invalid security context');
      }

      // Log the query attempt
      auditLogger.info('Database query executed', {
        userId: securityContext.userId,
        query: args.query_intent,
        filters: args.filters,
        outputFormat: args.output_format
      }, securityContext.userId);

      // Validate input parameters
      const validatedArgs = await this.validateInput(args);
      
      // Get database schema information for context
      const schemaInfo = await this.dbManager.getSchemaInfo();
      
      // Generate context-aware SQL query using Gemini AI
      let sqlQuery: string;
      try {
        sqlQuery = await this.geminiManager.generateContextAwareSQLQuery(
          validatedArgs.query_intent,
          schemaInfo,
          {
            role: securityContext.userRole,
            company: securityContext.company || 'N/A',
            permissions: securityContext.permissions || 'full_access'
          },
          args.chatHistory || []
        );
        
        logger.info('Generated SQL query successfully', { 
          originalQuery: validatedArgs.query_intent,
          sqlLength: sqlQuery.length 
        });
      } catch (error) {
        logger.error('Failed to generate SQL query with Gemini AI:', error);
        throw new Error(`Failed to understand your query: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Validate the generated SQL for security
      await this.securityValidator.validateSQLQuery(sqlQuery, securityContext);
      
      // Execute the generated SQL query
      const results = await this.dbManager.executeQuery(sqlQuery);
      
      // Format response based on output format
      const formattedResponse = await this.formatResponse(results, validatedArgs.output_format || 'table', {
        type: 'PAYMENT_STATUS_QUERY',
        entities: [],
        timeRange: undefined,
        aggregations: [],
        filters: {},
        confidence: 0.9
      });
      
      // Use LLM to generate natural response and determine UI requirements
      const llmResponse = await this.generateLLMResponse(validatedArgs.query_intent, results, validatedArgs.chatHistory || []);
      const responseMessage = llmResponse.message;
      const uiRequirements = llmResponse.uiRequirements;
      
      const response: MCPResponse = {
        type: 'data',
        message: responseMessage,
        data: {
          ...formattedResponse,
          uiRequirements: uiRequirements
        },
        metadata: {
          executionTime: perf.end(),
          timestamp: new Date().toISOString(),
          queryType: 'AI_GENERATED_QUERY'
        }
      };

      // Log successful execution
      auditLogger.info('Database query completed successfully', {
        userId: securityContext.userId,
        query: validatedArgs.query_intent,
        resultCount: results.length,
        executionTime: response.metadata?.executionTime
      }, securityContext.userId);

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Log the error
      auditLogger.error('Database query failed', {
        userId: securityContext?.userId,
        query: args.query_intent,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      }, securityContext?.userId);

      logger.error('Database query execution failed:', error);

      return {
        type: 'error',
        message: `Query failed: ${errorMessage}`,
        error: errorMessage,
        metadata: {
          executionTime: perf.end(),
          timestamp: new Date().toISOString(),
          queryType: 'unknown'
        }
      };
    }
  }

  private static async validateInput(args: any): Promise<QueryParams> {
    // Basic validation
    if (!args.query_intent || typeof args.query_intent !== 'string') {
      throw new Error('query_intent must be a non-empty string');
    }

    if (args.query_intent.length > 1000) {
      throw new Error('query_intent is too long (max 1000 characters)');
    }

    // Validate output format
    const validOutputFormats = ['table', 'chart', 'summary', 'export', 'dashboard', 'focused'];
    if (args.output_format && !validOutputFormats.includes(args.output_format)) {
      throw new Error(`Invalid output_format. Must be one of: ${validOutputFormats.join(', ')}`);
    }

    // Validate time range if provided
    if (args.time_range) {
      if (args.time_range.start && !this.isValidDate(args.time_range.start)) {
        throw new Error('Invalid start date in time_range');
      }
      if (args.time_range.end && !this.isValidDate(args.time_range.end)) {
        throw new Error('Invalid end date in time_range');
      }
    }

    // Validate pagination if provided
    if (args.pagination) {
      if (args.pagination.page && (!Number.isInteger(args.pagination.page) || args.pagination.page < 1)) {
        throw new Error('pagination.page must be a positive integer');
      }
      if (args.pagination.limit && (!Number.isInteger(args.pagination.limit) || args.pagination.limit < 1 || args.pagination.limit > 1000)) {
        throw new Error('pagination.limit must be between 1 and 1000');
      }
    }

    return args as QueryParams;
  }

  private static isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  private static async executeQuery(sqlQuery: string, args: QueryParams, intent: QueryIntent): Promise<any[]> {
    try {
      // For now, we'll use a simplified approach
      // In production, you'd want to use the actual SQL query with proper parameterization
      
      const connection = this.dbManager.getConnection();
      
      // Build query based on intent type
      let query: string;
      let params: any = {};

      switch (intent.type) {
        case 'PAYMENT_STATUS_QUERY':
          query = this.buildPaymentStatusQuery(intent, args);
          break;
        case 'VENDOR_ANALYTICS':
          query = this.buildVendorAnalyticsQuery(intent, args);
          break;
        case 'FINANCIAL_REPORT':
          query = this.buildFinancialReportQuery(intent, args);
          break;
        case 'OPERATIONAL_INSIGHTS':
          query = this.buildOperationalInsightsQuery(intent, args);
          break;
        case 'USER_ACTIVITY':
          query = this.buildUserActivityQuery(intent, args);
          break;
        case 'SYSTEM_METRICS':
          query = this.buildSystemMetricsQuery(intent, args);
          break;
        default:
          query = this.buildGenericQuery(intent, args);
      }

      // Execute the query
      const results = await this.dbManager.executeQuery(query, params);
      
      // Apply pagination if specified
      if (args.pagination) {
        const { page = 1, limit = 50 } = args.pagination;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        return results.slice(startIndex, endIndex);
      }

      return results;

    } catch (error) {
      logger.error('Failed to execute database query:', error);
      throw error;
    }
  }

  private static buildPaymentStatusQuery(intent: QueryIntent, args: QueryParams): string {
    let query = `
      SELECT 
        p.id,
        p.serial_number,
        p.date,
        p.vendor_name,
        p.payment_amount,
        p.balance_amount,
        p.status,
        p.urgency_level,
        p.item_description,
        u.name as requested_by_name,
        c.name as category_name,
        sc.name as subcategory_name
      FROM payments p
      LEFT JOIN users u ON p.requested_by = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
      WHERE 1=1
    `;

    // Add status filters
    if (intent.filters.status && intent.filters.status.length > 0) {
      const statusList = intent.filters.status.map((s: string) => `'${s}'`).join(',');
      query += ` AND p.status IN (${statusList})`;
    }

    // Add urgency filters
    if (intent.filters.urgency && intent.filters.urgency.length > 0) {
      const urgencyList = intent.filters.urgency.map((u: string) => `'${u}'`).join(',');
      query += ` AND p.urgency_level IN (${urgencyList})`;
    }

    // Add time range filters
    if (intent.timeRange) {
      if (intent.timeRange.start) {
        query += ` AND p.date >= '${intent.timeRange.start.toISOString()}'`;
      }
      if (intent.timeRange.end) {
        query += ` AND p.date <= '${intent.timeRange.end.toISOString()}'`;
      }
    }

    query += ` ORDER BY p.date DESC`;

    // Add limit for performance
    query += ` LIMIT 1000`;

    return query;
  }

  private static buildVendorAnalyticsQuery(intent: QueryIntent, args: QueryParams): string {
    return `
      SELECT 
        v.id as vendor_id,
        v.name as vendor_name,
        COUNT(p.id) as total_payments,
        SUM(p.payment_amount) as total_amount,
        AVG(p.payment_amount) as average_amount,
        MAX(p.date) as last_payment_date,
        v.status as vendor_status
      FROM vendors v
      LEFT JOIN payments p ON v.name = p.vendor_name
      WHERE v.status = 'approved'
      GROUP BY v.id, v.name, v.status
      ORDER BY total_amount DESC
      LIMIT 100
    `;
  }

  private static buildFinancialReportQuery(intent: QueryIntent, args: QueryParams): string {
    return `
      SELECT 
        p.status,
        COUNT(p.id) as payment_count,
        SUM(p.payment_amount) as total_amount,
        AVG(p.payment_amount) as average_amount,
        DATE_TRUNC('month', p.date) as month
      FROM payments p
      WHERE p.date >= NOW() - INTERVAL '12 months'
      GROUP BY p.status, DATE_TRUNC('month', p.date)
      ORDER BY month DESC, total_amount DESC
    `;
  }

  private static buildOperationalInsightsQuery(intent: QueryIntent, args: QueryParams): string {
    return `
      SELECT 
        p.status,
        COUNT(p.id) as count,
        AVG(EXTRACT(EPOCH FROM (p.updated_at - p.created_at))/86400) as avg_days_to_process
      FROM payments p
      WHERE p.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY p.status
      ORDER BY count DESC
    `;
  }

  private static buildUserActivityQuery(intent: QueryIntent, args: QueryParams): string {
    return `
      SELECT 
        u.name as user_name,
        u.role,
        COUNT(p.id) as payment_count,
        SUM(p.payment_amount) as total_amount,
        MAX(p.date) as last_activity
      FROM users u
      LEFT JOIN payments p ON u.id = p.requested_by
      WHERE p.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY u.id, u.name, u.role
      ORDER BY payment_count DESC
      LIMIT 50
    `;
  }

  private static buildSystemMetricsQuery(intent: QueryIntent, args: QueryParams): string {
    return `
      SELECT 
        'total_payments' as metric,
        COUNT(*) as value
      FROM payments
      UNION ALL
      SELECT 
        'pending_payments' as metric,
        COUNT(*) as value
      FROM payments
      WHERE status = 'pending'
      UNION ALL
      SELECT 
        'total_vendors' as metric,
        COUNT(*) as value
      FROM vendors
      WHERE status = 'approved'
      UNION ALL
      SELECT 
        'total_users' as metric,
        COUNT(*) as value
      FROM users
    `;
  }

  private static buildGenericQuery(intent: QueryIntent, args: QueryParams): string {
    return `
      SELECT 
        p.id,
        p.vendor_name,
        p.payment_amount,
        p.status,
        p.date
      FROM payments p
      ORDER BY p.date DESC
      LIMIT 100
    `;
  }

  private static buildFallbackQuery(intent: QueryIntent, args: QueryParams): string {
    // Build a safe fallback query based on intent
    switch (intent.type) {
      case 'PAYMENT_STATUS_QUERY':
        return this.buildPaymentStatusQuery(intent, args);
      case 'VENDOR_ANALYTICS':
        return this.buildVendorAnalyticsQuery(intent, args);
      case 'FINANCIAL_REPORT':
        return this.buildFinancialReportQuery(intent, args);
      case 'OPERATIONAL_INSIGHTS':
        return this.buildOperationalInsightsQuery(intent, args);
      case 'USER_ACTIVITY':
        return this.buildUserActivityQuery(intent, args);
      case 'SYSTEM_METRICS':
        return this.buildSystemMetricsQuery(intent, args);
      default:
        return this.buildGenericQuery(intent, args);
    }
  }

  private static analyzeQueryIntentFallback(query: string): QueryIntent {
    // Simple pattern-based intent analysis when AI is unavailable
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('pending') || lowerQuery.includes('status')) {
      return {
        type: 'PAYMENT_STATUS_QUERY',
        entities: ['payments'],
        timeRange: { start: null, end: null, period: null },
        aggregations: ['count', 'sum'],
        filters: { status: ['pending'], amount: null, vendor: null, category: null, urgency: null },
        confidence: 0.8
      };
    }
    
    if (lowerQuery.includes('vendor') || lowerQuery.includes('supplier')) {
      return {
        type: 'VENDOR_ANALYTICS',
        entities: ['vendors', 'payments'],
        timeRange: { start: null, end: null, period: null },
        aggregations: ['count', 'sum', 'average'],
        filters: { status: null, amount: null, vendor: null, category: null, urgency: null },
        confidence: 0.8
      };
    }
    
    if (lowerQuery.includes('financial') || lowerQuery.includes('summary') || lowerQuery.includes('report')) {
      return {
        type: 'FINANCIAL_REPORT',
        entities: ['payments', 'funds'],
        timeRange: { start: null, end: null, period: null },
        aggregations: ['count', 'sum', 'average'],
        filters: { status: null, amount: null, vendor: null, category: null, urgency: null },
        confidence: 0.8
      };
    }
    
    if (lowerQuery.includes('category') || lowerQuery.includes('subcategory')) {
      return {
        type: 'OPERATIONAL_INSIGHTS',
        entities: ['categories', 'subcategories', 'payments'],
        timeRange: { start: null, end: null, period: null },
        aggregations: ['count', 'sum', 'average'],
        filters: { status: null, amount: null, vendor: null, category: null, urgency: null },
        confidence: 0.8
      };
    }
    
    if (lowerQuery.includes('scheduled') || lowerQuery.includes('recurring')) {
      return {
        type: 'OPERATIONAL_INSIGHTS',
        entities: ['scheduled_payments'],
        timeRange: { start: null, end: null, period: null },
        aggregations: ['count', 'sum'],
        filters: { status: null, amount: null, vendor: null, category: null, urgency: null },
        confidence: 0.8
      };
    }
    
    if (lowerQuery.includes('fund') || lowerQuery.includes('balance')) {
      return {
        type: 'FINANCIAL_REPORT',
        entities: ['funds', 'payments'],
        timeRange: { start: null, end: null, period: null },
        aggregations: ['sum', 'average'],
        filters: { status: null, amount: null, vendor: null, category: null, urgency: null },
        confidence: 0.8
      };
    }
    
    if (lowerQuery.includes('user') || lowerQuery.includes('activity')) {
      return {
        type: 'USER_ACTIVITY',
        entities: ['users', 'payments'],
        timeRange: { start: null, end: null, period: null },
        aggregations: ['count', 'sum'],
        filters: { status: null, amount: null, vendor: null, category: null, urgency: null },
        confidence: 0.8
      };
    }
    
    // Default to generic query
    return {
      type: 'OPERATIONAL_INSIGHTS',
      entities: ['payments'],
      timeRange: { start: null, end: null, period: null },
      aggregations: ['count'],
      filters: { status: null, amount: null, vendor: null, category: null, urgency: null },
      confidence: 0.6
    };
  }

  private static async executeIntentBasedQuery(intent: QueryIntent, args: QueryParams): Promise<any[]> {
    // Execute queries based on intent when AI and direct execution fail
    try {
      const dbManager = DatabaseManager.getInstance();
      
      switch (intent.type) {
        case 'PAYMENT_STATUS_QUERY': {
          // Use explicit status from intent if present; otherwise do not force 'pending'
          const statusFilter = intent.filters?.status && intent.filters.status.length > 0
            ? intent.filters.status[0]
            : null;
          const prompt = statusFilter
            ? `Show me all payments with status ${statusFilter}`
            : 'Show me recent payments by status';
          return await dbManager.executeQuery(prompt);
        }
        case 'VENDOR_ANALYTICS':
          return await dbManager.executeQuery('Show me vendor information');
        case 'FINANCIAL_REPORT':
          return await dbManager.executeQuery('Show me financial summary');
        case 'OPERATIONAL_INSIGHTS':
          return await dbManager.executeQuery('Show me recent payments');
        case 'USER_ACTIVITY':
          return await dbManager.executeQuery('Show me user information');
        case 'SYSTEM_METRICS':
          return await dbManager.executeQuery('Show me system overview');
        default:
          return await dbManager.executeQuery('Show me recent payments');
      }
    } catch (error) {
      logger.error('Intent-based query execution failed:', error);
      return [];
    }
  }

  private static async formatResponse(results: any[], outputFormat: string, intent: QueryIntent): Promise<any> {
    switch (outputFormat) {
      case 'table':
        return {
          type: 'table',
          data: results,
          columns: this.extractColumns(results),
          totalCount: results.length,
          downloadOptions: {
            csv: true,
            pdf: true,
            excel: true
          }
        };
      
      case 'chart':
        return {
          type: 'chart',
          data: this.prepareChartData(results, intent),
          chartConfig: this.generateChartConfig(intent),
          downloadOptions: {
            png: true,
            svg: true,
            pdf: true,
            excel: true,
            csv: true
          }
        };
      
      case 'summary':
        return {
          type: 'summary',
          data: this.generateSummary(results, intent),
          insights: await this.geminiManager.generateReportInsights(results, intent.type),
          downloadOptions: {
            pdf: true,
            csv: true
          }
        };
      
      case 'export':
        return {
          type: 'export',
          data: results,
          format: 'csv',
          filename: `payment_report_${new Date().toISOString().split('T')[0]}.csv`,
          downloadOptions: {
            csv: true,
            pdf: true,
            excel: true
          }
        };
      
      case 'dashboard':
        return {
          type: 'dashboard',
          components: [
            this.generateSummary(results, intent),
            this.prepareChartData(results, intent),
            { type: 'recent_activity', data: results.slice(0, 10) }
          ],
          downloadOptions: {
            pdf: true,
            csv: true,
            excel: true
          }
        };
      
      case 'focused':
        return {
          type: 'focused',
          data: results,
          keyInsights: this.generateKeyInsights(results, intent),
          recommendations: this.generateRecommendations(results, intent),
          visualizations: this.prepareChartData(results, intent),
          downloadOptions: {
            pdf: true,
            csv: true,
            excel: true
          }
        };
      
      default:
        return {
          type: 'data',
          data: results,
          totalCount: results.length,
          downloadOptions: {
            csv: true,
            pdf: true
          }
        };
    }
  }

  private static extractColumns(results: any[]): string[] {
    if (results.length === 0) return [];
    return Object.keys(results[0]);
  }

  private static prepareChartData(results: any[], intent: QueryIntent): any {
    // Prepare data for different chart types based on intent
    switch (intent.type) {
      case 'FINANCIAL_REPORT':
        return results.map(r => ({
          label: r.month || r.status,
          value: r.total_amount || r.payment_amount,
          count: r.payment_count || 1
        }));
      
      case 'VENDOR_ANALYTICS':
        return results.map(r => ({
          label: r.vendor_name,
          value: r.total_amount,
          count: r.total_payments
        }));
      
      default:
        return results.map(r => ({
          label: r.status || r.vendor_name || r.id,
          value: r.payment_amount || r.count || 1
        }));
    }
  }

  private static generateChartConfig(intent: QueryIntent): any {
    switch (intent.type) {
      case 'FINANCIAL_REPORT':
        return {
          type: 'bar',
          title: 'Financial Summary',
          xAxis: 'Period',
          yAxis: 'Amount',
          colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
        };
      
      case 'VENDOR_ANALYTICS':
        return {
          type: 'bar',
          title: 'Vendor Performance',
          xAxis: 'Vendor',
          yAxis: 'Total Amount',
          colors: ['#8B5CF6', '#06B6D4', '#84CC16', '#F97316']
        };
      
      default:
        return {
          type: 'bar',
          title: 'Data Overview',
          xAxis: 'Category',
          yAxis: 'Value'
        };
    }
  }

  private static generateSummary(results: any[], intent: QueryIntent): any {
    const summary: any = {
      totalRecords: results.length,
      intent: intent.type,
      timestamp: new Date().toISOString()
    };

    switch (intent.type) {
      case 'PAYMENT_STATUS_QUERY':
        summary.statusBreakdown = this.groupBy(results, 'status');
        summary.totalAmount = results.reduce((sum: number, r: any) => sum + (r.payment_amount || r.amount || 0), 0);
        summary.averageAmount = summary.totalAmount / results.length;
        break;
      
      case 'VENDOR_ANALYTICS':
        summary.totalVendors = results.length;
        summary.totalPayments = results.reduce((sum: number, r: any) => sum + (r.total_payments || 0), 0);
        summary.totalAmount = results.reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0);
        break;
      
      case 'FINANCIAL_REPORT':
        summary.totalAmount = results.reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0);
        summary.averageAmount = results.reduce((sum: number, r: any) => sum + (r.average_amount || 0), 0);
        summary.statusBreakdown = this.groupBy(results, 'status');
        break;
    }

    return summary;
  }

  private static groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((groups: Record<string, number>, item: any) => {
      const value = item[key] || 'unknown';
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {});
  }

  private static generateKeyInsights(results: any[], intent: QueryIntent): any[] {
    const insights = [];
    
    if (results.length === 0) {
      insights.push({
        type: 'warning',
        message: 'No data found for the specified criteria',
        priority: 'high'
      });
      return insights;
    }

    // Generate insights based on intent type
    switch (intent.type) {
      case 'PAYMENT_STATUS_QUERY':
        const pendingCount = results.filter(r => r.status === 'pending').length;
        const highUrgencyCount = results.filter(r => r.urgency_level === 'high').length;
        
        if (pendingCount > 0) {
          insights.push({
            type: 'info',
            message: `${pendingCount} payments are pending approval`,
            priority: pendingCount > 10 ? 'high' : 'medium'
          });
        }
        
        if (highUrgencyCount > 0) {
          insights.push({
            type: 'warning',
            message: `${highUrgencyCount} payments marked as high urgency`,
            priority: 'high'
          });
        }
        break;
        
      case 'USER_ACTIVITY':
        const userCounts = results.reduce((acc, r) => {
          acc[r.requested_by_name || r.requested_by] = (acc[r.requested_by_name || r.requested_by] || 0) + 1;
          return acc;
        }, {});
        
        const topUser = Object.entries(userCounts).sort(([,a], [,b]) => (b as number) - (a as number))[0];
        if (topUser) {
          insights.push({
            type: 'info',
            message: `${topUser[0]} has the most activity with ${topUser[1]} payments`,
            priority: 'medium'
          });
        }
        break;
    }

    return insights;
  }

  private static generateRecommendations(results: any[], intent: QueryIntent): any[] {
    const recommendations: any[] = [];
    
    if (results.length === 0) return recommendations;

    switch (intent.type) {
      case 'PAYMENT_STATUS_QUERY':
        const pendingCount = results.filter(r => r.status === 'pending').length;
        if (pendingCount > 0) {
          recommendations.push({
            action: 'Review pending payments',
            priority: pendingCount > 10 ? 'high' : 'medium',
            description: `Focus on high-urgency payments first`
          });
        }
        break;
        
      case 'USER_ACTIVITY':
        recommendations.push({
          action: 'Analyze user patterns',
          priority: 'medium',
          description: 'Review payment request patterns for process optimization'
        });
        break;
    }

    return recommendations;
  }

  private static generateDashboardMessage(intent: QueryIntent, results: any[]): string {
    if (results.length === 0) {
      return 'No data available for dashboard.';
    }

    const totalAmount = results.reduce((sum, r) => sum + (r.payment_amount || 0), 0);
    const pendingCount = results.filter(r => r.status === 'pending').length;
    
    return `📊 **Dashboard Overview**\n` +
           `• Total records: ${results.length}\n` +
           `• Pending: ${pendingCount}\n` +
           `• Total amount: ₹${totalAmount.toLocaleString()}\n` +
           `• Interactive charts and data below`;
  }

  private static async generateLLMResponse(query: string, results: any[], chatHistory: any[]): Promise<{
    message: string;
    uiRequirements: {
      needsChart: boolean;
      needsCSV: boolean;
      needsPDF: boolean;
      needsTable: boolean;
      chartType?: string;
      chartData?: any[];
    };
  }> {
    try {
      // Create context for LLM
      const context = {
        userQuery: query,
        dataSummary: this.generateSummary(results, { type: 'PAYMENT_STATUS_QUERY', entities: [], timeRange: undefined, aggregations: [], filters: {}, confidence: 0.9 }),
        recentChat: chatHistory.slice(-3), // Last 3 messages for context
        dataCount: results.length,
        sampleData: results.slice(0, 3) // First 3 records for context
      };

      // Generate natural language response using Gemini
      const geminiManager = (await import('../utils/gemini')).GeminiManager.getInstance();
      
      const prompt = `
You are a helpful PayFlow AI assistant. Based on the user's question and the data results, generate:

1. A natural, conversational response (2-3 sentences max)
2. UI requirements for the frontend

USER QUESTION: "${query}"

DATA SUMMARY:
- Total records: ${context.dataSummary.totalRecords}
- Total amount: ₹${context.dataSummary.totalAmount?.toLocaleString() || 'N/A'}
- Status breakdown: ${context.dataSummary.statusBreakdown ? Object.entries(context.dataSummary.statusBreakdown).map(([k, v]) => `${k}: ${v}`).join(', ') : 'N/A'}

RESPONSE REQUIREMENTS:
1. Generate a straight forward response (2-3 sentences),mention all data summary provided to you.
2. Don't mention followups like "would you like me to do this?", don't do it.
3. Don't mention that you don't know something or don't have access to, work with the given context
4. Determine if user needs:
   - Charts (for data visualization)
   - CSV export (for data analysis)
   - PDF export (for reports)
   - Table view (for detailed data)

IMPORTANT: Return ONLY raw JSON without any markdown formatting, code blocks, or explanations. Start directly with { and end with }.

For chart data, you can leave chartData as an empty array [] - the system will generate it automatically from the results.

Expected JSON structure:
{
  "message": "DATA SUMMARY and Your natural response here",
  "uiRequirements": {
    "needsChart": true/false,
    "needsCSV": true/false,
    "needsPDF": true/false,
    "needsTable": true/false,
    "chartType": "bar/pie/line" (if needsChart is true),
    "chartData": [] (leave empty, will be auto-generated)
  }
}
`;

      // Ensure Gemini is initialized; if not, attempt lazy initialization and fall back gracefully
      if (!geminiManager.isReady()) {
        try {
          await geminiManager.initialize();
          logger.info('Gemini AI initialized lazily for LLM response generation');
        } catch (initError) {
          logger.warn('Gemini AI not available for LLM response; using fallback:', initError);
          throw initError;
        }
      }

      const response = await geminiManager.processQuery(prompt);
      
      // Log the raw response for debugging
      console.log('🔍 Raw LLM response:', response.text);
      
      // Clean the response text to remove markdown formatting
      let cleanText = response.text;
      
      // Remove markdown code blocks if present
      if (cleanText.includes('```json')) {
        cleanText = cleanText.replace(/```json\s*/, '').replace(/\s*```/, '');
      } else if (cleanText.includes('```')) {
        cleanText = cleanText.replace(/```\s*/, '').replace(/\s*```/, '');
      }
      
      // Remove any leading/trailing whitespace
      cleanText = cleanText.trim();
      
      console.log('🧹 Cleaned text:', cleanText);
      
      // Parse the cleaned JSON response
      const parsedResponse = JSON.parse(cleanText);
      
      // Generate chart data if needed but not provided by LLM
      if (parsedResponse.uiRequirements?.needsChart && 
          (!parsedResponse.uiRequirements.chartData || parsedResponse.uiRequirements.chartData.length === 0)) {
        
        // Generate chart data from results
        parsedResponse.uiRequirements.chartData = this.generateChartData(results, parsedResponse.uiRequirements.chartType);
      }
      
      return {
        message: parsedResponse.message,
        uiRequirements: parsedResponse.uiRequirements
      };

    } catch (error) {
      console.error('LLM response generation failed:', error);
      
      // Fallback to simple response
      return {
        message: `Found ${results.length} records for your query.`,
        uiRequirements: {
          needsChart: false,
          needsCSV: false,
          needsPDF: false,
          needsTable: true
        }
      };
    }
  }

  private static generateChartData(results: any[], chartType: string): any[] {
    if (!results || results.length === 0) return [];
    
    try {
      switch (chartType) {
        case 'pie':
          // Group by status for pie chart
          const statusGroups = results.reduce((acc, item) => {
            const status = item.status || 'unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {});
          
          return Object.entries(statusGroups).map(([label, value]) => ({
            label: label.charAt(0).toUpperCase() + label.slice(1),
            value: value
          }));
          
        case 'line':
          // Group by date for line chart (trend analysis)
          const dateGroups = results.reduce((acc, item) => {
            const date = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            acc[date] = (acc[date] || 0) + (item.payment_amount || 0);
            return acc;
          }, {});
          
          return Object.entries(dateGroups)
            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
            .map(([label, value]) => ({
              label: label,
              value: value
            }));
          
        case 'bar':
        default:
          // Group by vendor for bar chart
          const vendorGroups = results.reduce((acc, item) => {
            const vendor = item.vendor_name || 'Unknown Vendor';
            acc[vendor] = (acc[vendor] || 0) + (item.payment_amount || 0);
            return acc;
          }, {});
          
          return Object.entries(vendorGroups)
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .slice(0, 10) // Top 10 vendors
            .map(([label, value]) => ({
              label: label.length > 20 ? label.substring(0, 20) + '...' : label,
              value: value
            }));
      }
    } catch (error) {
      console.error('Chart data generation failed:', error);
      return [];
    }
    
    return [];
  }
}
