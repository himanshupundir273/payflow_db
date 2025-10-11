import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import dotenv from 'dotenv';

import { DatabaseManager } from './config/database.js';
import { GeminiManager } from './utils/gemini.js';
import { DatabaseQueryTool } from './tools/database-query.js';
import { logger, requestLogger, errorLogger } from './utils/logger.js';
import { SecurityValidator } from './utils/security-validator.js';

// Load environment variables
dotenv.config();

class MCPServer {
  private app: express.Application;
  private port: number;
  private dbManager: DatabaseManager;
  private geminiManager: GeminiManager;
  private securityValidator: SecurityValidator;
  private rateLimiter: RateLimiterMemory;

  constructor() {
    this.port = parseInt(process.env.PORT || '3001');
    this.app = express();
    this.dbManager = DatabaseManager.getInstance();
    this.geminiManager = GeminiManager.getInstance();
    this.securityValidator = new SecurityValidator();
    
    // Initialize rate limiter
    this.rateLimiter = new RateLimiterMemory({
      keyPrefix: 'mcp_server',
      points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000
    });

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    const corsOptions = {
      origin: ['http://localhost:5174' , 'https://www.payment.hindcab.com', 'http://localhost:5173'],
      credentials: true,
      optionsSuccessStatus: 200
    };
    this.app.use(cors(corsOptions));
    
    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Request logging
    this.app.use(requestLogger);
    
    // Rate limiting middleware
    this.app.use(this.rateLimitingMiddleware.bind(this));
  }

  private async rateLimitingMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
    try {
      const key = req.ip || 'unknown';
      await this.rateLimiter.consume(key);
      next();
    } catch (error: any) {
      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.round(error.msBeforeNext / 1000)
      });
    }
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const dbStatus = await this.dbManager.testConnection();
        const geminiStatus = this.geminiManager.isReady();
        
        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: dbStatus ? 'connected' : 'disconnected',
            gemini: geminiStatus ? 'ready' : 'not ready'
          }
        });
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
    // New RLS bypass test endpoint
    this.app.get('/test-rls-bypass', async (req, res) => {
      try {
        const connection = this.dbManager.getConnection();
        
        console.log('🔓 Testing RLS bypass methods...');
        
        // Test 1: Direct query (current failing method)
        console.log('💰 Test 1: Direct payments query...');
        const { data: directPayments, error: directError } = await connection.supabase
          .from('payments')
          .select('*')
          .limit(1);
        
        console.log('💰 Direct query result:', { 
          data: directPayments, 
          error: directError,
          count: directPayments?.length || 0 
        });
        
        // Test 2: Try with different table to see if it's payments-specific
        console.log('🔍 Test 2: Testing categories table...');
        const { data: categoriesData, error: categoriesError } = await connection.supabase
          .from('categories')
          .select('*')
          .limit(1);
        
        console.log('🔍 Categories result:', { 
          data: categoriesData, 
          error: categoriesError,
          count: categoriesData?.length || 0 
        });
        
        // Test 3: Try with vendors table
        console.log('🏢 Test 3: Testing vendors table...');
        const { data: vendorsData, error: vendorsError } = await connection.supabase
          .from('vendors')
          .select('*')
          .limit(1);
        
        console.log('🏢 Vendors result:', { 
          data: vendorsData, 
          error: vendorsError,
          count: vendorsData?.length || 0 
        });
        
        // Test 4: Check if we can see the table structure
        console.log('🏗️ Test 4: Checking table structure...');
        const { data: structureData, error: structureError } = await connection.supabase
          .rpc('get_table_structure', { table_name: 'payments' });
        
        console.log('🏗️ Table structure result:', { 
          data: structureData, 
          error: structureError 
        });
        
        // Test 5: Try to force RLS bypass with different approach
        console.log('🔓 Test 5: Testing forced RLS bypass...');
        const { data: bypassPayments, error: bypassError } = await connection.supabase
          .from('payments')
          .select('*')
          .limit(1);
        
        console.log('🔓 Forced bypass result:', { 
          data: bypassPayments, 
          error: bypassError,
          count: bypassPayments?.length || 0 
        });
        
        // Test 6: Check if we can query system tables
        console.log('🗄️ Test 6: Testing system table access...');
        const { data: systemData, error: systemError } = await connection.supabase
          .from('pg_tables')
          .select('tablename')
          .eq('schemaname', 'public')
          .limit(5);
        
        console.log('🗄️ System table result:', { 
          data: systemData, 
          error: systemError,
          count: systemData?.length || 0 
        });
        
        res.json({
          status: 'success',
          timestamp: new Date().toISOString(),
          test1: {
            method: 'Direct payments query',
            data: directPayments,
            error: directError?.message,
            count: directPayments?.length || 0
          },
          test2: {
            method: 'Categories table test',
            data: categoriesData,
            error: categoriesError?.message,
            count: categoriesData?.length || 0
          },
          test3: {
            method: 'Vendors table test',
            data: vendorsData,
            error: vendorsError?.message,
            count: vendorsData?.length || 0
          },
          test4: {
            method: 'Table structure check',
            data: structureData,
            error: structureError?.message
          },
          test5: {
            method: 'Forced RLS bypass',
            data: bypassPayments,
            error: bypassError?.message,
            count: bypassPayments?.length || 0
          },
          test6: {
            method: 'System table access',
            data: systemData,
            error: systemError?.message,
            count: systemData?.length || 0
          }
        });
        
      } catch (error) {
        logger.error('RLS bypass test failed:', error);
        res.status(500).json({
          status: 'error',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // MCP Tools endpoint
    this.app.get('/tools', (req, res) => {
      res.json({
        tools: [
          DatabaseQueryTool.definition
        ]
      });
    });

    // Execute tool endpoint
    this.app.post('/tools/:toolName/execute', async (req, res) => {
      try {
        const { toolName } = req.params;
        const { arguments: args, security_context } = req.body;

        // Validate security context
        if (!security_context || !this.validateSecurityContext(security_context)) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid security context'
          });
        }

        // Execute the appropriate tool
        let result;
        switch (toolName) {
          case 'execute_payment_query':
            result = await DatabaseQueryTool.execute(args, security_context);
            break;
          default:
            return res.status(400).json({
              error: 'Bad Request',
              message: `Unknown tool: ${toolName}`
            });
        }

        res.json(result);

      } catch (error) {
        logger.error('Tool execution failed:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    });

    // Natural language query endpoint
    this.app.post('/query', async (req, res) => {
      try {
        const { query, security_context, output_format } = req.body;

        // Validate security context
        if (!security_context || !this.validateSecurityContext(security_context)) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid security context'
          });
        }

        // Validate input
        if (!query || typeof query !== 'string') {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Query is required and must be a string'
          });
        }

        // Execute the query using the database query tool
        const result = await DatabaseQueryTool.execute({
          query_intent: query,
          output_format: output_format || 'table'
        }, security_context);

        res.json(result);

      } catch (error) {
        logger.error('Natural language query failed:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    });

    // Chat endpoint for conversational queries
    this.app.post('/chat', async (req, res) => {
      try {
        const { message, conversation_history, session_id, security_context } = req.body;

        // Validate security context
        if (!security_context || !this.validateSecurityContext(security_context)) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid security context'
          });
        }

        // Validate input
        if (!message || typeof message !== 'string') {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Message is required and must be a string'
          });
        }

        // Log session information
        if (session_id) {
          logger.info('Chat session', {
            sessionId: session_id,
            userId: security_context.userId,
            messageLength: message.length,
            historyLength: conversation_history?.length || 0
          });
        }

        // Process with Gemini AI (including full conversation history for context)
        // Ensure Gemini is initialized; if not, attempt lazy initialization and fall back gracefully
        let aiText = '';
        try {
          if (!this.geminiManager.isReady()) {
            try {
              await this.geminiManager.initialize();
              logger.info('Gemini AI initialized lazily for chat request');
            } catch (initError) {
              logger.warn('Gemini AI not available; proceeding without AI response:', initError);
            }
          }

          if (this.geminiManager.isReady()) {
            const aiResponse = await this.geminiManager.processQuery(message, JSON.stringify(conversation_history));
            aiText = aiResponse.text;
          } else {
            aiText = 'AI response is currently unavailable. Showing data results only.';
          }
        } catch (aiError) {
          logger.warn('AI processing failed; continuing without AI response:', aiError);
          aiText = 'AI response failed. Showing data results only.';
        }

        // If the message seems like a data query, also execute it
        let dataResult = null;
        try {
          if (this.isDataQuery(message)) {
            dataResult = await DatabaseQueryTool.execute({
              query_intent: message,
              output_format: 'summary'
            }, security_context);
          }
        } catch (error) {
          logger.warn('Data query execution failed, continuing with AI response:', error);
        }

        res.json({
          type: 'chat_response',
          message: aiText,
          data: dataResult,
          timestamp: new Date().toISOString(),
          sessionId: session_id
        });

      } catch (error) {
        logger.error('Chat processing failed:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    });

    // Download endpoint for file exports
    this.app.post('/download', async (req, res) => {
      try {
        const { data, format, filename, security_context } = req.body;

        // Validate security context
        if (!security_context || !this.validateSecurityContext(security_context)) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid security context'
          });
        }

        // Validate input
        if (!data || !format || !filename) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Data, format, and filename are required'
          });
        }

        let fileContent: string;
        let contentType: string;
        let fileExtension: string;

        switch (format.toLowerCase()) {
          case 'csv':
            fileContent = this.convertToCSV(data);
            contentType = 'text/csv';
            fileExtension = '.csv';
            break;
          case 'excel':
            fileContent = this.convertToExcel(data);
            contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            fileExtension = '.xlsx';
            break;
          case 'pdf':
            fileContent = this.convertToPDF(data);
            contentType = 'application/pdf';
            fileExtension = '.pdf';
            break;
          default:
            return res.status(400).json({
              error: 'Bad Request',
              message: `Unsupported format: ${format}`
            });
        }

        // Set headers for file download
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}${fileExtension}"`);
        res.setHeader('Content-Length', Buffer.byteLength(fileContent, 'utf8'));

        // Send the file
        res.send(fileContent);

        // Log the download
        logger.info('File download completed', {
          userId: security_context.userId,
          format,
          filename: `${filename}${fileExtension}`,
          dataSize: data.length
        });

      } catch (error) {
        logger.error('File download failed:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    });

    // Admin endpoints
    this.app.get('/admin/status', async (req, res) => {
      try {
        // Check if user has admin permissions
        const authHeader = req.headers.authorization;
        if (!authHeader || !this.validateAdminAccess(authHeader)) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Admin access required'
          });
        }

        const dbStatus = await this.dbManager.testConnection();
        const geminiStatus = this.geminiManager.isReady();

        res.json({
          server: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.version
          },
          services: {
            database: {
              status: dbStatus ? 'connected' : 'disconnected',
              connection: this.dbManager.getConnection() ? 'active' : 'inactive'
            },
            gemini: {
              status: geminiStatus ? 'ready' : 'not ready'
            }
          },
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        logger.error('Admin status check failed:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Endpoint ${req.method} ${req.originalUrl} not found`
      });
    });
  }

  private initializeErrorHandling(): void {
    // Error logging middleware
    this.app.use(errorLogger);

    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', error);
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message
      });
    });
  }

  private validateSecurityContext(context: any): boolean {
    return context && 
           context.userId && 
           context.userRole && 
           ['admin', 'accounts', 'user'].includes(context.userRole) &&
           context.sessionId &&
           context.ipAddress;
  }

  private validateAdminAccess(authHeader: string): boolean {
    // Basic admin validation - in production, use proper JWT validation
    try {
      const token = authHeader.replace('Bearer ', '');
      return this.securityValidator.validateJWT(token);
    } catch (error) {
      return false;
    }
  }

  private isDataQuery(message: string): boolean {
    const dataKeywords = [
      'show', 'display', 'list', 'find', 'get', 'count', 'total', 'amount',
      'payment', 'vendor', 'user', 'category', 'fund', 'report', 'summary'
    ];
    
    const lowerMessage = message.toLowerCase();
    return dataKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  public async start(): Promise<void> {
    try {
      // Initialize services
      logger.info('Starting MCP Server...');
      
      // Initialize database connection
      await this.dbManager.connect();
      logger.info('Database connection established');
      
      // Initialize Gemini AI (optional)
      try {
        await this.geminiManager.initialize();
        logger.info('Gemini AI initialized');
      } catch (error) {
        logger.warn('Gemini AI initialization failed, continuing without AI features:', error);
        // Don't throw error, continue without AI
      }
      
      // Start the server
      this.app.listen(this.port, () => {
        logger.info(`MCP Server running on port ${this.port}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info('Available endpoints:');
        logger.info(`  - GET  /health`);
        logger.info(`  - GET  /tools`);
        logger.info(`  - POST /tools/:toolName/execute`);
        logger.info(`  - POST /query`);
        logger.info(`  - POST /chat`);
        logger.info(`  - POST /download`);
        logger.info(`  - GET  /admin/status`);
      });

    } catch (error) {
      logger.error('Failed to start MCP Server:', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    try {
      logger.info('Stopping MCP Server...');
      
      // Close database connection
      await this.dbManager.disconnect();
      logger.info('Database connection closed');
      
      logger.info('MCP Server stopped');
      process.exit(0);
    } catch (error) {
      logger.error('Error stopping MCP Server:', error);
      process.exit(1);
    }
  }

  // File conversion methods
  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  private convertToExcel(data: any[]): string {
    // For now, return CSV format as Excel can read CSV
    // In production, you'd use a library like 'xlsx' for proper Excel files
    return this.convertToCSV(data);
  }

  private convertToPDF(data: any[]): string {
    // For now, return a simple text representation
    // In production, you'd use a library like 'pdfkit' for proper PDFs
    if (!data || data.length === 0) return 'No data available';
    
    let pdfContent = 'Payment Report\n';
    pdfContent += 'Generated: ' + new Date().toISOString() + '\n\n';
    
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      pdfContent += headers.join(' | ') + '\n';
      pdfContent += '-'.repeat(headers.join(' | ').length) + '\n';
      
      for (const row of data.slice(0, 50)) { // Limit to 50 rows for PDF
        const values = headers.map(header => row[header] || '');
        pdfContent += values.join(' | ') + '\n';
      }
      
      if (data.length > 50) {
        pdfContent += `\n... and ${data.length - 50} more rows`;
      }
    }
    
    return pdfContent;
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await server.stop();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await server.stop();
});

// Start the server
const server = new MCPServer();
server.start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
