# PayFlow MCP Server

A high-performance Model Context Protocol (MCP) server for the PayFlow payment management system, featuring intelligent query processing with Gemini AI integration.

## 🚀 Features

- **Intelligent Query Processing**: Natural language to SQL conversion using Gemini AI
- **Secure Database Operations**: Comprehensive security validation and SQL injection prevention
- **Role-based Access Control**: Admin, accounts, and user permission levels
- **Real-time Analytics**: Dynamic report generation and data visualization
- **High Performance**: Optimized query execution with connection pooling
- **Comprehensive Logging**: Audit trails, security events, and performance monitoring
- **Rate Limiting**: Protection against abuse and DoS attacks
- **Health Monitoring**: Real-time service status and diagnostics

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   MCP Server    │    │   Supabase      │
│   (PayFlow)     │◄──►│   (Express)     │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Gemini AI     │
                       │   (Google)      │
                       └─────────────────┘
```

## 📋 Prerequisites

- Node.js 18+ 
- Supabase account with service role key
- Google Gemini AI API key
- PostgreSQL database (via Supabase)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   cd payment-mcp-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # MCP Server Configuration
   NODE_ENV=development
   PORT=3001
   
   # Supabase Configuration
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SUPABASE_ANON_KEY=your_anon_key
   
   # Gemini AI Configuration
   GEMINI_API_KEY=your_gemini_api_key
   
   # Security Configuration
   JWT_SECRET=your_jwt_secret
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Start the server**
   ```bash
   npm start
   ```

## 🚀 Development

```bash
# Start in development mode with hot reload
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## 📡 API Endpoints

### Health Check
```http
GET /health
```

### Available Tools
```http
GET /tools
```

### Execute Tool
```http
POST /tools/:toolName/execute
Content-Type: application/json

{
  "arguments": {
    "query_intent": "Show me all pending payments",
    "output_format": "table"
  },
  "security_context": {
    "userId": "user_id",
    "userRole": "admin",
    "sessionId": "session_id",
    "ipAddress": "127.0.0.1"
  }
}
```

### Natural Language Query
```http
POST /query
Content-Type: application/json

{
  "query": "What's the total outstanding amount by category?",
  "output_format": "chart",
  "security_context": {
    "userId": "user_id",
    "userRole": "admin",
    "sessionId": "session_id",
    "ipAddress": "127.0.0.1"
  }
}
```

### Chat Interface
```http
POST /chat
Content-Type: application/json

{
  "message": "Help me understand payment trends",
  "conversation_history": [],
  "security_context": {
    "userId": "user_id",
    "userRole": "admin",
    "sessionId": "session_id",
    "ipAddress": "127.0.0.1"
  }
}
```

### Admin Status
```http
GET /admin/status
Authorization: Bearer your_jwt_token
```

## 🔐 Security Features

### Input Validation
- SQL injection prevention
- XSS protection
- Input sanitization
- Parameter validation

### Access Control
- Role-based permissions
- User data isolation
- Session validation
- IP address tracking

### Rate Limiting
- Configurable limits per IP
- Sliding window implementation
- Abuse prevention

### Audit Logging
- All operations logged
- Security event tracking
- Performance monitoring
- Error tracking

## 🧠 AI Integration

### Gemini AI Features
- Natural language query understanding
- Intent classification
- SQL query generation
- Business insights generation
- Context-aware responses

### Query Types Supported
- **Payment Status Queries**: Status, urgency, date ranges
- **Vendor Analytics**: Performance, volume, trends
- **Financial Reports**: Summaries, aggregations, trends
- **Operational Insights**: Processing times, bottlenecks
- **User Activity**: User behavior, activity patterns
- **System Metrics**: Performance, health, statistics

## 📊 Data Visualization

### Output Formats
- **Table**: Structured data display
- **Chart**: Bar, line, pie charts
- **Summary**: Key metrics and insights
- **Export**: CSV/Excel downloads
- **Dashboard**: Multi-component views

### Chart Types
- Bar charts for comparisons
- Line charts for trends
- Pie charts for distributions
- Area charts for cumulative data

## 🔧 Configuration

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3001` |
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Required |
| `GEMINI_API_KEY` | Gemini AI API key | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `900000` |

### Database Configuration
- Connection pooling
- Automatic reconnection
- Health monitoring
- Query optimization

## 📈 Performance

### Optimization Features
- Connection pooling
- Query caching
- Result pagination
- Efficient indexing
- Query complexity limits

### Monitoring
- Response time tracking
- Memory usage monitoring
- Database performance metrics
- Error rate tracking

## 🧪 Testing

### Test Coverage
- Unit tests for all utilities
- Integration tests for database operations
- Security validation tests
- Performance benchmarks

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
```

## 🚀 Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Configure production database
3. Set up SSL/TLS certificates
4. Configure reverse proxy (nginx)
5. Set up monitoring and alerting

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### Environment-specific Configs
- Development: Local database, debug logging
- Staging: Staging database, info logging
- Production: Production database, error logging only

## 📚 API Documentation

### Query Examples

#### Payment Queries
```json
{
  "query_intent": "Show me all high-urgency pending payments from last week",
  "output_format": "table",
  "filters": {
    "urgency": ["high"],
    "status": ["pending"]
  },
  "time_range": {
    "start": "2024-01-01",
    "end": "2024-01-07",
    "period": "week"
  }
}
```

#### Vendor Analytics
```json
{
  "query_intent": "Top 10 vendors by payment volume in Q4",
  "output_format": "chart",
  "time_range": {
    "start": "2024-10-01",
    "end": "2024-12-31",
    "period": "quarter"
  }
}
```

#### Financial Reports
```json
{
  "query_intent": "Monthly expense summary with category breakdown",
  "output_format": "dashboard",
  "time_range": {
    "start": "2024-01-01",
    "end": "2024-12-31",
    "period": "year"
  }
}
```

## 🔍 Troubleshooting

### Common Issues

#### Database Connection Failed
- Check Supabase credentials
- Verify network connectivity
- Check firewall settings

#### Gemini AI Not Responding
- Verify API key validity
- Check API quota limits
- Verify network connectivity

#### High Memory Usage
- Check for memory leaks
- Monitor query complexity
- Review connection pooling

### Logs
- Application logs: `./logs/combined.log`
- Error logs: `./logs/error.log`
- Access logs: `./logs/access.log`

### Health Checks
```bash
# Check server health
curl http://localhost:3001/health

# Check admin status
curl -H "Authorization: Bearer token" http://localhost:3001/admin/status
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔮 Roadmap

### Future Features
- Advanced analytics engine
- Machine learning insights
- Real-time notifications
- Advanced reporting
- Mobile API support
- GraphQL support
- WebSocket real-time updates

### Performance Improvements
- Redis caching layer
- Query result caching
- Advanced indexing strategies
- Microservices architecture
- Load balancing support
