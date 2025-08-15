import { SecurityContext } from '../types/index.js';
import { logger, securityLogger } from './logger.js';

export class SecurityValidator {
  private readonly dangerousKeywords = [
    'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE',
    'EXEC', 'EXECUTE', 'xp_', 'sp_', '--', '/*', '*/', 'UNION', 'SELECT INTO'
  ];

  private readonly allowedTables = [
    'payments', 'users', 'vendors', 'categories', 'subcategories',
    'companies', 'branches', 'funds', 'scheduled_payments', 'attachments',
    'bills', 'payment_history'
  ];

  private readonly allowedOperations = [
    'SELECT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'GROUP BY', 'ORDER BY',
    'WHERE', 'AND', 'OR', 'IN', 'BETWEEN', 'LIKE', 'IS NULL', 'IS NOT NULL'
  ];

  /**
   * Validates SQL query for security threats
   */
  public async validateSQLQuery(sqlQuery: string, securityContext: SecurityContext): Promise<void> {
    try {
      // Log the validation attempt
      securityLogger.query(securityContext.userId, sqlQuery, true);

      // Check for dangerous keywords
      this.checkDangerousKeywords(sqlQuery);

      // Check for allowed tables only
      this.checkAllowedTables(sqlQuery);

      // Check for allowed operations only (READ-ONLY)
      this.checkAllowedOperations(sqlQuery);

      // Additional READ-ONLY validation
      this.validateReadOnlyQuery(sqlQuery);

      // Check query complexity
      this.checkQueryComplexity(sqlQuery);

      // Check for SQL injection patterns
      this.checkSQLInjectionPatterns(sqlQuery);

      // Validate user permissions
      await this.validateUserPermissions(sqlQuery, securityContext);

      logger.info('SQL query validation passed', {
        userId: securityContext.userId,
        queryLength: sqlQuery.length
      });

    } catch (error) {
      securityLogger.query(securityContext.userId, sqlQuery, false);
      logger.error('SQL query validation failed:', error);
      throw error;
    }
  }

  /**
   * Checks for dangerous SQL keywords
   */
  private checkDangerousKeywords(sqlQuery: string): void {
    const upperQuery = sqlQuery.toUpperCase();
    
    for (const keyword of this.dangerousKeywords) {
      if (upperQuery.includes(keyword)) {
        throw new Error(`Dangerous SQL keyword detected: ${keyword}`);
      }
    }
  }

  /**
   * Checks if query only references allowed tables
   */
  private checkAllowedTables(sqlQuery: string): void {
    const upperQuery = sqlQuery.toUpperCase();
    
    // Extract actual table names (not aliases) from FROM and JOIN clauses
    // Handle patterns like: FROM payments p, FROM payments AS p, JOIN users u, etc.
    const fromMatches = upperQuery.match(/FROM\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/g);
    const joinMatches = upperQuery.match(/JOIN\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/g);
    
    const allMatches = [...(fromMatches || []), ...(joinMatches || [])];
    
    if (allMatches) {
      for (const match of allMatches) {
        // Extract the actual table name (first word after FROM/JOIN)
        const parts = match.split(/\s+/);
        const tableName = parts[1]; // Second part is the actual table name
        
        if (tableName && !this.allowedTables.includes(tableName.toLowerCase())) {
          throw new Error(`Access to table '${tableName}' is not allowed`);
        }
      }
    }
  }

  /**
   * Checks if query only uses allowed operations (READ-ONLY)
   */
  private checkAllowedOperations(sqlQuery: string): void {
    const upperQuery = sqlQuery.toUpperCase();
    
    // STRICT: Only SELECT queries are allowed (READ-ONLY)
    if (!upperQuery.trim().startsWith('SELECT')) {
      throw new Error('MCP Server is READ-ONLY. Only SELECT queries are allowed');
    }

    // Block ALL write/modification operations
    const forbiddenOps = [
      'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE',
      'REPLACE', 'MERGE', 'UPSERT', 'COPY', 'BULK INSERT'
    ];
    
    for (const op of forbiddenOps) {
      if (upperQuery.includes(op)) {
        throw new Error(`MCP Server is READ-ONLY. Operation '${op}' is forbidden`);
      }
    }

    // Block any transaction control
    const transactionOps = ['BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'TRANSACTION'];
    for (const op of transactionOps) {
      if (upperQuery.includes(op)) {
        throw new Error(`MCP Server is READ-ONLY. Transaction operation '${op}' is forbidden`);
      }
    }

    // Block any data modification hints
    const modificationHints = ['FOR UPDATE', 'LOCK', 'NOWAIT', 'SKIP LOCKED'];
    for (const hint of modificationHints) {
      if (upperQuery.includes(hint)) {
        throw new Error(`MCP Server is READ-ONLY. Modification hint '${hint}' is forbidden`);
      }
    }
  }

  /**
   * Checks query complexity to prevent performance issues
   */
  private checkQueryComplexity(sqlQuery: string): void {
    // Check query length
    if (sqlQuery.length > 10000) {
      throw new Error('Query is too long (max 10000 characters)');
    }

    // Check for excessive JOINs
    const joinCount = (sqlQuery.match(/JOIN/gi) || []).length;
    if (joinCount > 10) {
      throw new Error('Too many JOINs (max 10)');
    }

    // Check for excessive subqueries
    const subqueryCount = (sqlQuery.match(/\(/g) || []).length;
    if (subqueryCount > 20) {
      throw new Error('Too many subqueries (max 20)');
    }

    // Check for excessive OR conditions
    const orCount = (sqlQuery.match(/\bOR\b/gi) || []).length;
    if (orCount > 50) {
      throw new Error('Too many OR conditions (max 50)');
    }
  }

  /**
   * Checks for SQL injection patterns
   */
  private checkSQLInjectionPatterns(sqlQuery: string): void {
    // Check for comment patterns
    if (sqlQuery.includes('--') || sqlQuery.includes('/*') || sqlQuery.includes('*/')) {
      throw new Error('SQL comments are not allowed');
    }

    // Allow string literals for now (they're needed for WHERE clauses)
    // TODO: Implement proper parameterized query handling
    // if (sqlQuery.includes("'") || sqlQuery.includes('"')) {
    //   throw new Error('String literals in queries are not allowed');
    // }

    // Check for dynamic SQL patterns
    if (sqlQuery.includes('EXEC') || sqlQuery.includes('EXECUTE')) {
      throw new Error('Dynamic SQL execution is not allowed');
    }

    // Check for stored procedure calls
    if (sqlQuery.includes('sp_') || sqlQuery.includes('xp_')) {
      throw new Error('Stored procedure calls are not allowed');
    }
  }

  /**
   * Validates user permissions for the query
   */
  private async validateUserPermissions(sqlQuery: string, securityContext: SecurityContext): Promise<void> {
    // Check user role permissions
    if (securityContext.userRole === 'user') {
      // Regular users can only query their own payments
      if (this.queryAccessesPayments(sqlQuery)) {
        this.ensureUserDataIsolation(sqlQuery, securityContext.userId);
      }
    } else if (securityContext.userRole === 'accounts') {
      // Accounts users have broader access but still limited
      if (this.queryAccessesSensitiveData(sqlQuery)) {
        throw new Error('Accounts users cannot access sensitive data');
      }
    }
    // Admin users have full access (already validated above)
  }

  /**
   * Additional validation to ensure query is truly READ-ONLY
   */
  private validateReadOnlyQuery(sqlQuery: string): void {
    const upperQuery = sqlQuery.toUpperCase();
    
    // Block any CTEs that might contain modification operations
    if (upperQuery.includes('WITH') && upperQuery.includes('INSERT')) {
      throw new Error('MCP Server is READ-ONLY. CTEs with INSERT operations are forbidden');
    }
    
    // Block any subqueries that might modify data
    if (upperQuery.includes('EXISTS') && upperQuery.includes('UPDATE')) {
      throw new Error('MCP Server is READ-ONLY. Subqueries with UPDATE operations are forbidden');
    }
    
    // Block any function calls that might modify data
    const dangerousFunctions = ['WRITE_FILE', 'COPY_FILE', 'DELETE_FILE', 'MODIFY_DATA'];
    for (const func of dangerousFunctions) {
      if (upperQuery.includes(func)) {
        throw new Error(`MCP Server is READ-ONLY. Dangerous function '${func}' is forbidden`);
      }
    }
    
    // Block any hints that might cause locks or modifications
    const lockHints = ['ROWLOCK', 'TABLOCK', 'PAGLOCK', 'UPDLOCK', 'XLOCK'];
    for (const hint of lockHints) {
      if (upperQuery.includes(hint)) {
        throw new Error(`MCP Server is READ-ONLY. Lock hint '${hint}' is forbidden`);
      }
    }
  }

  /**
   * Checks if query accesses payments table
   */
  private queryAccessesPayments(sqlQuery: string): boolean {
    const upperQuery = sqlQuery.toUpperCase();
    return upperQuery.includes('PAYMENTS') || upperQuery.includes('PAYMENT');
  }

  /**
   * Checks if query accesses sensitive data
   */
  private queryAccessesSensitiveData(sqlQuery: string): boolean {
    const upperQuery = sqlQuery.toUpperCase();
    const sensitiveTables = ['USERS', 'FUNDS', 'PAYMENT_HISTORY'];
    
    return sensitiveTables.some(table => upperQuery.includes(table));
  }

  /**
   * Ensures user data isolation for regular users
   */
  private ensureUserDataIsolation(sqlQuery: string, userId: string): void {
    const upperQuery = sqlQuery.toUpperCase();
    
    // Check if query includes user isolation
    if (!upperQuery.includes(`REQUESTED_BY = '${userId}'`) && 
        !upperQuery.includes(`USER_ID = '${userId}'`)) {
      throw new Error('User data isolation required for regular users');
    }
  }

  /**
   * Validates input parameters for security
   */
  public validateInputParameters(params: Record<string, any>): void {
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        // Check for SQL injection in string parameters
        if (this.containsSQLInjection(value)) {
          throw new Error(`Parameter '${key}' contains potentially dangerous content`);
        }
      }
    }
  }

  /**
   * Checks if a string contains SQL injection patterns
   */
  private containsSQLInjection(value: string): boolean {
    const dangerousPatterns = [
      /--/,
      /\/\*/,
      /\*\//,
      /xp_/i,
      /sp_/i,
      /exec/i,
      /union/i,
      /select\s+into/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /insert\s+into/i,
      /update\s+set/i
    ];

    return dangerousPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Validates file uploads for security
   */
  public validateFileUpload(file: any): void {
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size exceeds maximum limit (10MB)');
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error('File type not allowed');
    }

    // Check file name for dangerous patterns
    if (this.containsSQLInjection(file.name)) {
      throw new Error('File name contains potentially dangerous content');
    }
  }

  /**
   * Validates API rate limiting
   */
  public validateRateLimit(userId: string, endpoint: string, currentCount: number, maxCount: number): boolean {
    if (currentCount >= maxCount) {
      securityLogger.access(userId, endpoint, 'rate_limit_exceeded', false);
      return false;
    }
    return true;
  }

  /**
   * Sanitizes user input for safe display
   */
  public sanitizeInput(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validates JWT token
   */
  public validateJWT(token: string): boolean {
    // Basic JWT format validation
    const jwtPattern = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    return jwtPattern.test(token);
  }

  /**
   * Checks if user has required permissions
   */
  public checkPermissions(userRole: string, requiredPermissions: string[]): boolean {
    const rolePermissions: Record<string, string[]> = {
      'admin': ['read', 'write', 'delete', 'admin'],
      'accounts': ['read', 'write'],
      'user': ['read']
    };

    const userPerms = rolePermissions[userRole] || [];
    return requiredPermissions.every(perm => userPerms.includes(perm));
  }
}
