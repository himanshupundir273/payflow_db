import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Minimize2, Maximize2, Loader2, BarChart3, Table, FileText, Download, Trash2, RotateCcw } from 'lucide-react';
import { useMCPClient } from '../../utils/mcp-client';
import { useChatSessionManager, ChatMessage as DBChatMessage } from '../../utils/chat-session-manager';
import ResponseHandler from './ResponseHandler';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  data?: any;
  type?: 'text' | 'data' | 'chart' | 'error';
  isLoading?: boolean;
}

interface ChatbotProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onToggle }) => {
  const { executeQuery, sendChatMessage, isAuthenticated } = useMCPClient();
  const chatSessionManager = useChatSessionManager();
  const [mcpServerStatus, setMcpServerStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your PayFlow AI assistant powered by Gemini AI. How can I help you today?",
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    },
    {
      id: '2',
      text: "You can ask me about:\n• Payment approvals and management\n• CMS operations (users, vendors, categories)\n• Fund tracking and availability\n• Scheduled payments\n• Reports and exports\n• System navigation and features\n\nTry asking: 'Show me all pending payments' or 'What's the total outstanding amount?'",
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  // Load chat history and check MCP server status when chatbot opens
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      const initializeChat = async () => {
        try {
          // Load chat history from database
          const chatHistory = await chatSessionManager.getChatHistory();
          if (chatHistory.length > 0) {
            const historyMessages: Message[] = chatHistory.map((msg: DBChatMessage) => ({
              id: msg.id,
              text: msg.content,
              sender: msg.message_type === 'user' ? 'user' : 'bot',
              timestamp: new Date(msg.created_at),
              type: msg.message_type === 'user' ? 'text' : 'text'
            }));
            setMessages(prev => [...prev, ...historyMessages]);
          }
        } catch (error) {
          console.error('Failed to load chat history:', error);
        }

        // Check MCP server status
        try {
          setMcpServerStatus('checking');
          const response = await fetch(import.meta.env.VITE_MCP_SERVER_URL + '/health');
          if (response.ok) {
            setMcpServerStatus('connected');
          } else {
            setMcpServerStatus('disconnected');
            // Add a message about server being unavailable
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              text: "⚠️ MCP Server is currently unavailable. Some features may not work properly. Please try again later.",
              sender: 'bot',
              timestamp: new Date(),
              type: 'error'
            }]);
          }
        } catch (error) {
          setMcpServerStatus('disconnected');
          // Add a message about server being unavailable
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: "⚠️ MCP Server is currently unavailable. Some features may not work properly. Please try again later.",
            sender: 'bot',
            timestamp: new Date(),
            type: 'error'
          }]);
        }
      };
      
      initializeChat();
    }
  }, [isOpen, isAuthenticated, chatSessionManager]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    // Check if user is authenticated
    if (!isAuthenticated) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "Please log in to use the AI assistant.",
        sender: 'bot',
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    // Check if MCP server is connected
    if (mcpServerStatus === 'disconnected') {
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "MCP Server is currently unavailable. Please try again later.",
        sender: 'bot',
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Store user message in database
    try {
      await chatSessionManager.addMessage('user', inputText);
    } catch (error) {
      console.error('Failed to store user message:', error);
    }
    
    setInputText('');
    setIsLoading(true);

    try {
      // Check if this is a data query
      if (isDataQuery(inputText)) {
        await handleDataQuery(inputText);
      } else {
        // Handle conversational query
        await handleConversationalQuery(inputText);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I encountered an error processing your request. Please try again or rephrase your question.",
        sender: 'bot',
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Store error message in database
      try {
        await chatSessionManager.addMessage('assistant', errorMessage.text);
      } catch (dbError) {
        console.error('Failed to store error message:', dbError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isDataQuery = (query: string): boolean => {
    const dataKeywords = [
      'show', 'display', 'list', 'find', 'get', 'count', 'total', 'amount',
      'payment', 'vendor', 'user', 'category', 'fund', 'report', 'summary',
      'pending', 'approved', 'rejected', 'processed', 'high', 'medium', 'low'
    ];
    
    const lowerQuery = query.toLowerCase();
    return dataKeywords.some(keyword => lowerQuery.includes(keyword));
  };

  const handleDataQuery = async (query: string) => {
    try {
      // Add loading message
      const loadingMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Processing your data request...",
        sender: 'bot',
        timestamp: new Date(),
        type: 'text',
        isLoading: true
      };
      setMessages(prev => [...prev, loadingMessage]);

      // Execute query through MCP server
      const result = await executeQuery({
        query: query,
        output_format: 'focused',
        chatHistory: messages.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text,
          timestamp: msg.timestamp.toISOString()
        }))
      });

      // Remove loading message and add result
      setMessages(prev => prev.filter(msg => !msg.isLoading));

      const resultMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: result.message || "Here's what I found:",
        sender: 'bot',
        timestamp: new Date(),
        type: 'data',
        data: result.data
      };

      setMessages(prev => [...prev, resultMessage]);

      // Store bot response in database
      try {
        await chatSessionManager.addMessage('assistant', resultMessage.text, { data: result.data, type: 'data' });
      } catch (dbError) {
        console.error('Failed to store bot response:', dbError);
      }

    } catch (error) {
      console.error('Data query failed:', error);
      
      // Handle specific error cases
      let errorMessage = "I couldn't retrieve that data. Please try rephrasing your question or check if you have the necessary permissions.";
      
      if (error instanceof Error) {
        if (error.message.includes('AI service unavailable') || error.message.includes('503')) {
          errorMessage = "I'm currently experiencing issues with my AI processing. I'll try to get your data using alternative methods.";
        } else if (error.message.includes('database') || error.message.includes('connection')) {
          errorMessage = "I'm having trouble accessing the database right now. Please try again in a moment.";
        } else if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
          errorMessage = "Please make sure you're logged in and have the right permissions.";
        } else if (error.message.includes('rate limit')) {
          errorMessage = "I'm processing too many requests right now. Please wait a moment and try again.";
        }
      }
      
      const errorMessageObj: Message = {
        id: (Date.now() + 2).toString(),
        text: errorMessage,
        sender: 'bot',
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessageObj]);
      
      // Store error message in database
      try {
        await chatSessionManager.addMessage('assistant', errorMessage, { type: 'error' });
      } catch (dbError) {
        console.error('Failed to store error message:', dbError);
      }
    }
  };

  const handleConversationalQuery = async (query: string) => {
    try {
      // Add loading message
      const loadingMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Thinking...",
        sender: 'bot',
        timestamp: new Date(),
        type: 'text',
        isLoading: true
      };
      setMessages(prev => [...prev, loadingMessage]);

      // Get current session ID for context
      const sessionId = await chatSessionManager.getOrCreateSession();
      
      // Send to MCP chat endpoint with full conversation history
      const result = await sendChatMessage({
        message: query,
        conversation_history: messages.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text,
          timestamp: msg.timestamp.toISOString()
        })),
        session_id: sessionId
      });

      // Remove loading message and add result
      setMessages(prev => prev.filter(msg => !msg.isLoading));

      const resultMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: result.message || "Here's what I can tell you:",
        sender: 'bot',
        timestamp: new Date(),
        type: 'text',
        data: result.data
      };

      setMessages(prev => [...prev, resultMessage]);

      // Store bot response in database
      try {
        await chatSessionManager.addMessage('assistant', resultMessage.text, { data: result.data, type: 'text' });
      } catch (dbError) {
        console.error('Failed to store bot response:', dbError);
      }

    } catch (error) {
      console.error('Conversational query failed:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: "I'm having trouble processing your request right now. Please try again in a moment.",
        sender: 'bot',
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Store error message in database
      try {
        await chatSessionManager.addMessage('assistant', errorMessage.text, { type: 'error' });
      } catch (dbError) {
        console.error('Failed to store error message:', dbError);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDownload = async (format: string, data: any, filename: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_MCP_SERVER_URL}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: data,
          format: format,
          filename: filename,
          security_context: {
            userId: 'aeb7e654-cfe2-454c-aeb2-34fa47ece4df', // This should come from auth context
            userRole: 'admin',
            sessionId: 'chat-session',
            ipAddress: '127.0.0.1'
          }
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Download failed:', response.statusText);
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const handleClearChat = async () => {
    try {
      await chatSessionManager.clearChat();
      setMessages([
        {
          id: '1',
          text: "Hello! I'm your PayFlow AI assistant powered by Gemini AI. How can I help you today?",
          sender: 'bot',
          timestamp: new Date(),
          type: 'text'
        },
        {
          id: '2',
          text: "You can ask me about:\n• Payment approvals and management\n• CMS operations (users, vendors, categories)\n• Fund tracking and availability\n• Scheduled payments\n• Reports and exports\n• System navigation and features\n\nTry asking: 'Show me all pending payments' or 'What's the total outstanding amount?'",
          sender: 'bot',
          timestamp: new Date(),
          type: 'text'
        },
      ]);
    } catch (error) {
      console.error('Failed to clear chat:', error);
      // Still clear local messages even if database clear fails
      setMessages([
        {
          id: '1',
          text: "Hello! I'm your PayFlow AI assistant powered by Gemini AI. How can I help you today?",
          sender: 'bot',
          timestamp: new Date(),
          type: 'text'
        },
        {
          id: '2',
          text: "You can ask me about:\n• Payment approvals and management\n• CMS operations (users, vendors, categories)\n• Fund tracking and availability\n• Scheduled payments\n• Reports and exports\n• System navigation and features\n\nTry asking: 'Show me all pending payments' or 'What's the total outstanding amount?'",
          sender: 'bot',
          timestamp: new Date(),
          type: 'text'
        },
      ]);
    }
  };

  const renderMessageContent = (message: Message) => {
    if (message.isLoading) {
      return (
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{message.text}</span>
        </div>
      );
    }

    if (message.type === 'data' && message.data) {
      return (
        <div>
          <p className="text-sm whitespace-pre-line">{message.text}</p>
          {renderDataContent(message.data)}
        </div>
      );
    }

    return <p className="text-sm whitespace-pre-line">{message.text}</p>;
  };

  const renderDataContent = (data: any) => {
    if (!data) return null;

    return (
      <ResponseHandler 
        response={{ data: data }} 
        onDownload={handleDownload}
      />
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
        >
          <Maximize2 className="h-6 w-6" />
        </button>
      ) : (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-96 max-h-[600px] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 rounded-full p-2">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">PayFlow AI Assistant</h3>
                  <p className="text-sm text-blue-100">
                    {isAuthenticated ? 'Powered by Gemini AI' : 'Please log in to use'}
                  </p>
                  {isAuthenticated && (
                    <div className="flex items-center space-x-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${
                        mcpServerStatus === 'connected' ? 'bg-green-400' :
                        mcpServerStatus === 'disconnected' ? 'bg-red-400' :
                        'bg-yellow-400'
                      }`} />
                      <span className="text-xs text-blue-100">
                        {mcpServerStatus === 'connected' ? 'Connected' :
                         mcpServerStatus === 'disconnected' ? 'Disconnected' :
                         'Checking...'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleClearChat}
                  className="text-white/80 hover:text-white transition-colors p-1 rounded hover:bg-white/20"
                  title="Clear chat history"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
                <button
                  onClick={onToggle}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  }`}
                >
                  {renderMessageContent(message)}
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {/* Quick Action Buttons for Bot Messages */}
            {messages.length === 2 && (
              <div className="flex flex-wrap gap-2 justify-start">
                <button
                  onClick={() => {
                    setInputText("Show me all pending payments");
                    setTimeout(() => handleSendMessage(), 100);
                  }}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                >
                  Pending Payments
                </button>
                <button
                  onClick={() => {
                    setInputText("Show me vendor performance");
                    setTimeout(() => handleSendMessage(), 100);
                  }}
                  className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                >
                  Vendor Analytics
                </button>
                <button
                  onClick={() => {
                    setInputText("Give me financial summary");
                    setTimeout(() => handleSendMessage(), 100);
                  }}
                  className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
                >
                  Financial Summary
                </button>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  isLoading ? "Processing..." : 
                  mcpServerStatus === 'disconnected' ? "Server unavailable..." :
                  "Ask me anything about PayFlow..."
                }
                disabled={isLoading || mcpServerStatus === 'disconnected'}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isLoading || mcpServerStatus === 'disconnected'}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
