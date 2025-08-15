// Core MCP Types
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolExecution {
  tool: string;
  arguments: Record<string, any>;
}

export interface MCPResponse {
  type: 'success' | 'error' | 'data' | 'chart' | 'report' | 'dashboard';
  message: string;
  data?: any;
  error?: string;
  metadata?: {
    executionTime: number;
    timestamp: string;
    queryType: string;
  };
}

// Database Types
export interface DatabaseConnection {
  supabase: any;
  isConnected: boolean;
  lastHeartbeat: Date;
}

export interface QueryParams {
  query_intent: string;
  filters?: Record<string, any>;
  output_format?: 'table' | 'chart' | 'summary' | 'export' | 'dashboard' | 'focused';
  time_range?: {
    start: string;
    end: string;
    period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  };
  pagination?: {
    page: number;
    limit: number;
  };
  sorting?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  chatHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
}

export interface QueryIntent {
  type: 'PAYMENT_STATUS_QUERY' | 'VENDOR_ANALYTICS' | 'FINANCIAL_REPORT' | 'OPERATIONAL_INSIGHTS' | 'USER_ACTIVITY' | 'SYSTEM_METRICS';
  entities: string[];
  timeRange?: {
    start: Date | null;
    end: Date | null;
    period: string | null;
  };
  aggregations: string[];
  filters: Record<string, any>;
  confidence: number;
}

// Payment Domain Types
export interface PaymentQuery {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed' | 'query_raised';
  amount: number;
  vendor: string;
  category: string;
  urgency: 'low' | 'medium' | 'high';
  date: string;
  requestedBy: string;
  approvedBy?: string;
}

export interface VendorAnalytics {
  vendorId: string;
  vendorName: string;
  totalPayments: number;
  totalAmount: number;
  averageAmount: number;
  paymentFrequency: number;
  lastPaymentDate: string;
  performanceScore: number;
}

export interface FinancialSummary {
  totalPayments: number;
  totalAmount: number;
  pendingAmount: number;
  approvedAmount: number;
  processedAmount: number;
  averagePaymentAmount: number;
  topCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    amount: number;
    count: number;
  }>;
}

// Report Types
export interface ReportConfig {
  type: 'dashboard' | 'vendor_analysis' | 'financial_summary' | 'payment_tracking' | 'custom';
  timePeriod: string;
  format: 'html_table' | 'csv' | 'excel' | 'chart' | 'dashboard';
  filters: Record<string, any>;
  aggregations: string[];
  visualizations: string[];
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'area';
  data: any[];
  options: {
    title: string;
    xAxis?: string;
    yAxis?: string;
    colors?: string[];
    height?: number;
    width?: number;
  };
}

// Security Types
export interface SecurityContext {
  userId: string;
  userRole: 'admin' | 'accounts' | 'user';
  permissions: string[];
  sessionId: string;
  ipAddress: string;
  userAgent: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
}

// Gemini AI Types
export interface GeminiRequest {
  prompt: string;
  context: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}

export interface GeminiResponse {
  text: string;
  confidence: number;
  tokens: number;
  metadata: {
    model: string;
    finishReason: string;
    safetyRatings: any[];
  };
}

// Error Types
export interface MCPError extends Error {
  code: string;
  statusCode: number;
  details?: any;
  context?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Rate Limiting Types
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
  statusCode: number;
}

export interface RateLimitInfo {
  remaining: number;
  resetTime: Date;
  limit: number;
}

// Configuration Types
export interface ServerConfig {
  port: number;
  environment: string;
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  security: {
    rateLimit: RateLimitConfig;
    jwtSecret: string;
    helmet: boolean;
  };
  logging: {
    level: string;
    filePath: string;
    maxSize: string;
    maxFiles: number;
  };
}
