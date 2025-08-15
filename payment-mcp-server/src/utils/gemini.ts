import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiRequest, GeminiResponse, QueryIntent } from '../types/index.js';
import { logger } from './logger.js';

export class GeminiManager {
  private static instance: GeminiManager;
  private genAI: GoogleGenerativeAI | null = null;
  private model: any;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): GeminiManager {
    if (!GeminiManager.instance) {
      GeminiManager.instance = new GeminiManager();
    }
    return GeminiManager.instance;
  }

  public async initialize(): Promise<void> {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is required');
      }

      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      // Test the connection
      await this.testConnection();
      
      this.isInitialized = true;
      logger.info('Gemini AI initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Gemini AI:', error);
      throw error;
    }
  }

  private async testConnection(): Promise<void> {
    try {
      const result = await this.model.generateContent('Hello, test connection');
      const response = await result.response;
      if (!response.text()) {
        throw new Error('Empty response from Gemini AI');
      }
    } catch (error) {
      logger.error('Gemini AI connection test failed:', error);
      throw error;
    }
  }

  public async processQuery(query: string, context?: string): Promise<GeminiResponse> {
    if (!this.isInitialized) {
      throw new Error('Gemini AI not initialized. Call initialize() first.');
    }

    try {
      const startTime = Date.now();
      
      const prompt = this.buildPrompt(query, context);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const duration = Date.now() - startTime;
      
      logger.info('Gemini AI query processed successfully', {
        query: query.substring(0, 100),
        duration: `${duration}ms`,
        tokens: response.usageMetadata?.totalTokenCount || 'unknown'
      });

      return {
        text,
        confidence: 0.9, // Gemini doesn't provide confidence scores
        tokens: response.usageMetadata?.totalTokenCount || 0,
        metadata: {
          model: 'gemini-pro',
          finishReason: 'STOP',
          safetyRatings: response.safetyRatings || []
        }
      };
    } catch (error) {
      logger.error('Failed to process query with Gemini AI:', error);
      throw error;
    }
  }

  public async analyzeQueryIntent(query: string): Promise<QueryIntent> {
    try {
      const prompt = `
        Analyze the following payment management query and determine the intent.
        
        Query: "${query}"
        
        Please analyze this query and return a JSON response with the following structure:
        {
          "type": "PAYMENT_STATUS_QUERY" | "VENDOR_ANALYTICS" | "FINANCIAL_REPORT" | "OPERATIONAL_INSIGHTS" | "USER_ACTIVITY" | "SYSTEM_METRICS",
          "entities": ["array of relevant entities mentioned"],
          "timeRange": {
            "start": "ISO date string or null",
            "end": "ISO date string or null",
            "period": "day" | "week" | "month" | "quarter" | "year" | "custom" | null
          },
          "aggregations": ["array of aggregation operations needed"],
          "filters": {
            "status": "array of status filters",
            "amount": "amount range object",
            "vendor": "vendor filters",
            "category": "category filters",
            "urgency": "urgency level filters"
          },
          "confidence": 0.0-1.0
        }
        
        Focus on payment management domain knowledge. Common entities include: payments, vendors, categories, users, funds, companies, branches.
        Common aggregations include: count, sum, average, min, max, group by.
        Common filters include: status, date range, amount range, vendor, category, urgency level.
        
        IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no additional text, no explanations.
      `;

      const response = await this.processQuery(prompt);
      
      try {
        // Clean the response text to remove markdown formatting
        let cleanText = response.text;
        
        // Remove markdown code blocks
        if (cleanText.includes('```json')) {
          cleanText = cleanText.split('```json')[1]?.split('```')[0] || cleanText;
        }
        if (cleanText.includes('```')) {
          cleanText = cleanText.split('```')[1]?.split('```')[0] || cleanText;
        }
        
        // Remove leading/trailing whitespace
        cleanText = cleanText.trim();
        
        const intent = JSON.parse(cleanText) as QueryIntent;
        
        // Validate the response structure
        if (!intent.type || !intent.entities || !intent.filters) {
          throw new Error('Invalid intent structure returned by Gemini AI');
        }

        logger.info('Query intent analyzed successfully', {
          originalQuery: query,
          intent: intent.type,
          confidence: intent.confidence
        });

        return intent;
      } catch (parseError) {
        logger.error('Failed to parse Gemini AI response as JSON:', parseError);
        // Fallback to pattern-based analysis
        return this.fallbackIntentAnalysis(query);
      }
    } catch (error) {
      logger.error('Failed to analyze query intent:', error);
      return this.fallbackIntentAnalysis(query);
    }
  }

  private fallbackIntentAnalysis(query: string): QueryIntent {
    const lowerQuery = query.toLowerCase();
    
    // Pattern-based intent detection
    let type: QueryIntent['type'] = 'PAYMENT_STATUS_QUERY';
    const entities: string[] = [];
    const filters: Record<string, any> = {};
    
    // Detect query type
    if (lowerQuery.includes('vendor') || lowerQuery.includes('supplier')) {
      type = 'VENDOR_ANALYTICS';
      entities.push('vendors');
    } else if (lowerQuery.includes('financial') || lowerQuery.includes('expense') || lowerQuery.includes('amount')) {
      type = 'FINANCIAL_REPORT';
      entities.push('payments', 'funds');
    } else if (lowerQuery.includes('user') || lowerQuery.includes('activity')) {
      type = 'USER_ACTIVITY';
      entities.push('users');
    } else if (lowerQuery.includes('system') || lowerQuery.includes('performance')) {
      type = 'SYSTEM_METRICS';
      entities.push('system');
    } else {
      entities.push('payments');
    }

    // Extract filters
    if (lowerQuery.includes('pending')) filters.status = ['pending'];
    if (lowerQuery.includes('approved')) filters.status = ['approved'];
    if (lowerQuery.includes('rejected')) filters.status = ['rejected'];
    if (lowerQuery.includes('processed')) filters.status = ['processed'];
    if (lowerQuery.includes('high') && lowerQuery.includes('urgency')) filters.urgency = ['high'];
    if (lowerQuery.includes('medium') && lowerQuery.includes('urgency')) filters.urgency = ['medium'];
    if (lowerQuery.includes('low') && lowerQuery.includes('urgency')) filters.urgency = ['low'];

    // Extract time range
    let timeRange: QueryIntent['timeRange'] | undefined;
    if (lowerQuery.includes('today')) {
      timeRange = { start: new Date(), end: new Date(), period: 'day' };
    } else if (lowerQuery.includes('week')) {
      const end = new Date();
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      timeRange = { start, end, period: 'week' };
    } else if (lowerQuery.includes('month')) {
      const end = new Date();
      const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      timeRange = { start, end, period: 'month' };
    }

    return {
      type,
      entities,
      timeRange,
      aggregations: ['count', 'sum'],
      filters,
      confidence: 0.7
    };
  }

  private buildPrompt(query: string, context?: string): string {
    const basePrompt = `
      You are an AI assistant for a payment management system called PayFlow. 
      You help admin users understand and analyze payment data, vendor information, financial reports, and operational insights.
      
      System Context:
      - This is a business payment approval and management system
      - Users can create, approve, and track payment requests
      - The system handles vendors, categories, companies, and branches
      - There are scheduled payments and recurring payment capabilities
      - Fund tracking and balance management are key features
      
      Database Schema:
      - payments: Main payment requests with status workflow
      - users: Admin, accounts, and regular user roles
      - vendors: Supplier information with banking details
      - categories/subcategories: Expense classification
      - companies/branches: Organizational structure
      - scheduled_payments: Recurring payment management
      - funds: Budget tracking and availability
      
      User Query: "${query}"
      ${context ? `Additional Context: ${context}` : ''}
      
      Please provide a helpful, accurate response that:
      1. Addresses the user's question directly
      2. Provides actionable insights when possible
      3. Suggests relevant system features or reports
      4. Maintains a professional, business-friendly tone
      5. Acknowledges the complexity of payment management
      
      Response should be clear, concise, and immediately useful to admin users.
    `;

    return basePrompt;
  }

  public async generateSQLQuery(intent: QueryIntent, schemaInfo: any): Promise<string> {
    try {
      const prompt = `
        Generate a secure SQL query for a payment management system based on the following intent:
        
        Intent: ${JSON.stringify(intent, null, 2)}
        
        Database Schema: ${JSON.stringify(schemaInfo, null, 2)}
        
        Requirements:
        1. Use parameterized queries to prevent SQL injection
        2. Include proper JOINs for related data
        3. Add appropriate WHERE clauses based on filters
        4. Include ORDER BY for meaningful results
        5. Limit results to prevent performance issues
        6. Use proper table aliases for readability
        7. Return ONLY the SQL query, no markdown, no code blocks, no explanations
        
        IMPORTANT: Return ONLY the raw SQL query text, nothing else.
      `;

      const response = await this.processQuery(prompt);
      let sqlQuery = response.text.trim();
      
      // Clean the response to remove any markdown formatting
      if (sqlQuery.includes('```sql')) {
        sqlQuery = sqlQuery.split('```sql')[1]?.split('```')[0] || sqlQuery;
      }
      if (sqlQuery.includes('```')) {
        sqlQuery = sqlQuery.split('```')[1]?.split('```')[0] || sqlQuery;
      }
      
      // Remove any remaining markdown or formatting
      sqlQuery = sqlQuery.replace(/^```.*\n?/gm, '').replace(/```$/gm, '').trim();
      
      return sqlQuery;
    } catch (error) {
      logger.error('Failed to generate SQL query:', error);
      throw error;
    }
  }

  public async generateContextAwareSQLQuery(
    userQuery: string, 
    databaseSchema: any, 
    userContext: any,
    chatHistory?: any[]
  ): Promise<string> {
    try {
      // Build comprehensive context for the LLM
      const contextPrompt = `
        You are an expert SQL developer for a payment management system. Generate precise SQL queries based on user requests.

        DATABASE SCHEMA:
        ${JSON.stringify(databaseSchema, null, 2)}

        USER CONTEXT:
        - Role: ${userContext.role || 'admin'}
        - Company: ${userContext.company || 'N/A'}
        - Permissions: ${userContext.permissions || 'full_access'}

        CHAT HISTORY (if available):
        ${chatHistory ? JSON.stringify(chatHistory.slice(-5), null, 2) : 'No previous context'}

        USER REQUEST: "${userQuery}"

        REQUIREMENTS:
        1. Generate ONLY a valid PostgreSQL SELECT query (READ-ONLY)
        2. Use proper table aliases (p for payments, u for users, v for vendors, etc.)
        3. Include relevant JOINs to get complete information
        4. Add appropriate WHERE clauses for filtering
        5. Use ORDER BY for meaningful results
        6. Limit results to 100 rows maximum for performance
        7. NEVER include INSERT, UPDATE, DELETE, or any modification operations
        8. NEVER include SQL comments (-- or /* */)
        9. Return ONLY the raw SQL query, no explanations, no markdown

        EXAMPLE OUTPUT FORMAT:
        SELECT p.id, p.vendor_name, p.payment_amount, p.status, u.name as requested_by
        FROM payments p
        LEFT JOIN users u ON p.requested_by = u.id
        WHERE p.status = 'pending'
        ORDER BY p.date DESC
        LIMIT 100;

        IMPORTANT: Return ONLY the SQL query, nothing else.
      `;

      const response = await this.processQuery(contextPrompt);
      let sqlQuery = response.text.trim();
      
      // Clean the response to remove any markdown formatting
      if (sqlQuery.includes('```sql')) {
        sqlQuery = sqlQuery.split('```sql')[1]?.split('```')[0] || sqlQuery;
      }
      if (sqlQuery.includes('```')) {
        sqlQuery = sqlQuery.split('```')[1]?.split('```')[0] || sqlQuery;
      }
      
      // Remove any remaining markdown or formatting
      sqlQuery = sqlQuery.replace(/^```.*\n?/gm, '').replace(/```$/gm, '').trim();
      
      // Validate that it's a SELECT query
      if (!sqlQuery.toLowerCase().trim().startsWith('select')) {
        throw new Error('Generated query is not a SELECT statement');
      }
      
      logger.info('Generated context-aware SQL query', { 
        originalQuery: userQuery, 
        generatedSQL: sqlQuery.substring(0, 100) + '...' 
      });
      
      return sqlQuery;
    } catch (error) {
      logger.error('Failed to generate context-aware SQL query:', error);
      throw error;
    }
  }

  public async generateReportInsights(data: any[], reportType: string): Promise<string> {
    try {
      const prompt = `
        Analyze the following payment management data and provide business insights:
        
        Report Type: ${reportType}
        Data: ${JSON.stringify(data.slice(0, 10), null, 2)} ${data.length > 10 ? `... and ${data.length - 10} more records` : ''}
        
        Please provide:
        1. Key findings and trends
        2. Business implications
        3. Recommendations for action
        4. Areas requiring attention
        
        Focus on actionable insights that would be valuable to payment administrators.
        Keep the response concise but comprehensive.
      `;

      const response = await this.processQuery(prompt);
      return response.text;
    } catch (error) {
      logger.error('Failed to generate report insights:', error);
      return 'Unable to generate insights at this time.';
    }
  }

  public isReady(): boolean {
    return this.isInitialized;
  }
}
