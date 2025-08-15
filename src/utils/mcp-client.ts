import { useAuthStore } from '../store/authStore';

export interface MCPQueryRequest {
  query: string;
  output_format?: 'table' | 'chart' | 'summary' | 'export' | 'dashboard' | 'focused';
  filters?: Record<string, any>;
  time_range?: {
    start: string;
    end: string;
    period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  };
  chatHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
}

export interface MCPChatRequest {
  message: string;
  conversation_history?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  session_id?: string;
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

export class MCPClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_MCP_SERVER_URL || 'http://localhost:3001';
  }

  /**
   * Get security context for API requests
   */
  private getSecurityContext() {
    const authStore = useAuthStore.getState();
    const user = authStore.user;
    if (!user) {
      throw new Error('User not authenticated');
    }

    return {
      userId: user.id,
      userRole: user.role,
      sessionId: `session_${Date.now()}`, // In production, use actual session ID
      ipAddress: '127.0.0.1' // In production, get actual IP
    };
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    const authStore = useAuthStore.getState();
    return !!authStore.user;
  }

  /**
   * Make authenticated request to MCP server
   */
  private async makeRequest(endpoint: string, data: any): Promise<MCPResponse> {
    try {
      const securityContext = this.getSecurityContext();
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          security_context: securityContext
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('MCP request failed:', error);
      throw error;
    }
  }

  /**
   * Execute a natural language query
   */
  async executeQuery(request: MCPQueryRequest): Promise<MCPResponse> {
    return this.makeRequest('/query', request);
  }

  /**
   * Send a chat message
   */
  async sendChatMessage(request: MCPChatRequest): Promise<MCPResponse> {
    return this.makeRequest('/chat', request);
  }

  /**
   * Execute a specific MCP tool
   */
  async executeTool(toolName: string, args: any): Promise<MCPResponse> {
    return this.makeRequest(`/tools/${toolName}/execute`, { arguments: args });
  }

  /**
   * Check server health
   */
  async checkHealth(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  /**
   * Get available tools
   */
  async getAvailableTools(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/tools`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get tools:', error);
      throw error;
    }
  }
}

// React hook for using MCP client
export const useMCPClient = () => {
  const { user } = useAuthStore();
  
  const client = new MCPClient();
  
  return {
    executeQuery: client.executeQuery.bind(client),
    sendChatMessage: client.sendChatMessage.bind(client),
    executeTool: client.executeTool.bind(client),
    checkHealth: client.checkHealth.bind(client),
    getAvailableTools: client.getAvailableTools.bind(client),
    isAuthenticated: !!user
  };
};

// Utility functions for common queries
export const MCPQueries = {
  // Payment queries
  getPendingPayments: (filters?: any) => ({
    query: "Show me all pending payments",
    output_format: "table" as const,
    filters
  }),

  getHighUrgencyPayments: () => ({
    query: "Show me all high urgency payments",
    output_format: "table" as const
  }),

  getPaymentSummary: (timeRange?: any) => ({
    query: "Give me a summary of all payments",
    output_format: "summary" as const,
    time_range: timeRange
  }),

  // Vendor queries
  getTopVendors: (limit: number = 10) => ({
    query: `Show me top ${limit} vendors by payment volume`,
    output_format: "chart" as const
  }),

  getVendorPerformance: (vendorName?: string) => ({
    query: vendorName ? `Show me performance metrics for ${vendorName}` : "Show me vendor performance metrics",
    output_format: "chart" as const
  }),

  // Financial queries
  getFinancialSummary: (period: string = "month") => ({
    query: `Show me ${period}ly financial summary`,
    output_format: "dashboard" as const
  }),

  getExpenseBreakdown: () => ({
    query: "Show me expense breakdown by category",
    output_format: "chart" as const
  }),

  // User activity queries
  getUserActivity: () => ({
    query: "Show me user activity summary",
    output_format: "summary" as const
  }),

  // System metrics
  getSystemMetrics: () => ({
    query: "Show me system performance metrics",
    output_format: "dashboard" as const
  })
};

// Example usage in components:
/*
import { useMCPClient, MCPQueries } from '../utils/mcp-client';

function PaymentDashboard() {
  const { executeQuery } = useMCPClient();
  const [data, setData] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await executeQuery(MCPQueries.getPaymentSummary());
        setData(result.data);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    loadData();
  }, []);

  return (
    <div>
      {data && <DataVisualization data={data} />}
    </div>
  );
}
*/
