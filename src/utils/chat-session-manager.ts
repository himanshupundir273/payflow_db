import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export interface ChatMessage {
  id: string;
  message_type: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
  created_at: string;
}

export interface ChatSession {
  id: string;
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  metadata?: any;
}

export class ChatSessionManager {
  private static instance: ChatSessionManager;
  private currentSessionId: string | null = null;

  private constructor() {}

  public static getInstance(): ChatSessionManager {
    if (!ChatSessionManager.instance) {
      ChatSessionManager.instance = new ChatSessionManager();
    }
    return ChatSessionManager.instance;
  }

  /**
   * Get or create a chat session for the current user
   */
  public async getOrCreateSession(): Promise<string> {
    try {
      const authStore = useAuthStore.getState();
      if (!authStore.user?.id) {
        throw new Error('User not authenticated');
      }

      // Check if we already have a session ID
      if (this.currentSessionId) {
        return this.currentSessionId;
      }

      // Try to get existing session from localStorage
      const storedSessionId = localStorage.getItem('payflow_chat_session_id');
      if (storedSessionId) {
        // Verify the session still exists in database
        const { data: session } = await supabase
          .from('chat_sessions')
          .select('session_id')
          .eq('session_id', storedSessionId)
          .eq('user_id', authStore.user.id)
          .single();

        if (session) {
          this.currentSessionId = storedSessionId;
          return storedSessionId;
        }
      }

      // Create new session
      const { data, error } = await supabase
        .rpc('get_or_create_chat_session', {
          p_user_id: authStore.user.id
        });

      if (error) {
        throw error;
      }

      this.currentSessionId = data;
      localStorage.setItem('payflow_chat_session_id', data);
      return data;

    } catch (error) {
      console.error('Failed to get or create chat session:', error);
      throw error;
    }
  }

  /**
   * Add a message to the current chat session
   */
  public async addMessage(
    messageType: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: any
  ): Promise<string> {
    try {
      const sessionId = await this.getOrCreateSession();
      
      const { data, error } = await supabase
        .rpc('add_chat_message', {
          p_session_id: sessionId,
          p_message_type: messageType,
          p_content: content,
          p_metadata: metadata || {}
        });

      if (error) {
        throw error;
      }

      return data;

    } catch (error) {
      console.error('Failed to add chat message:', error);
      throw error;
    }
  }

  /**
   * Get chat history for the current session
   */
  public async getChatHistory(): Promise<ChatMessage[]> {
    try {
      const sessionId = await this.getOrCreateSession();
      
      const { data, error } = await supabase
        .rpc('get_chat_history', {
          p_session_id: sessionId
        });

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error) {
      console.error('Failed to get chat history:', error);
      return [];
    }
  }

  /**
   * Clear all messages from the current chat session
   */
  public async clearChat(): Promise<boolean> {
    try {
      const sessionId = await this.getOrCreateSession();
      
      const { data, error } = await supabase
        .rpc('clear_chat_session', {
          p_session_id: sessionId
        });

      if (error) {
        throw error;
      }

      // Clear local storage
      localStorage.removeItem('payflow_chat_session_id');
      this.currentSessionId = null;

      return data;

    } catch (error) {
      console.error('Failed to clear chat session:', error);
      throw error;
    }
  }

  /**
   * Get all chat sessions for the current user
   */
  public async getUserSessions(): Promise<ChatSession[]> {
    try {
      const authStore = useAuthStore.getState();
      if (!authStore.user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', authStore.user.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error) {
      console.error('Failed to get user sessions:', error);
      return [];
    }
  }

  /**
   * Switch to a different chat session
   */
  public async switchSession(sessionId: string): Promise<boolean> {
    try {
      const authStore = useAuthStore.getState();
      if (!authStore.user?.id) {
        throw new Error('User not authenticated');
      }

      // Verify the session belongs to the user
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('session_id')
        .eq('session_id', sessionId)
        .eq('user_id', authStore.user.id)
        .single();

      if (!session) {
        throw new Error('Session not found or access denied');
      }

      this.currentSessionId = sessionId;
      localStorage.setItem('payflow_chat_session_id', sessionId);
      return true;

    } catch (error) {
      console.error('Failed to switch session:', error);
      return false;
    }
  }

  /**
   * Get the current session ID
   */
  public getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Reset the current session (for new chat)
   */
  public resetSession(): void {
    this.currentSessionId = null;
    localStorage.removeItem('payflow_chat_session_id');
  }
}

// Hook for using chat session manager in React components
export const useChatSessionManager = () => {
  return ChatSessionManager.getInstance();
};
