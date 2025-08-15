-- Chat Sessions Table for PayFlow AI Assistant
-- This table stores chat sessions and message history for the AI chatbot

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id text NOT NULL UNIQUE,
  title text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  CONSTRAINT chat_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Chat Messages Table for storing individual messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(session_id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_id ON public.chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- RLS Policies
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own chat sessions
CREATE POLICY "Users can view own chat sessions" ON public.chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own chat sessions
CREATE POLICY "Users can insert own chat sessions" ON public.chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own chat sessions
CREATE POLICY "Users can update own chat sessions" ON public.chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own chat sessions
CREATE POLICY "Users can delete own chat sessions" ON public.chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Users can only see messages from their own sessions
CREATE POLICY "Users can view own chat messages" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions 
      WHERE session_id = chat_messages.session_id 
      AND user_id = auth.uid()
    )
  );

-- Users can insert messages to their own sessions
CREATE POLICY "Users can insert own chat messages" ON public.chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions 
      WHERE session_id = chat_messages.session_id 
      AND user_id = auth.uid()
    )
  );

-- Function to get or create a chat session
CREATE OR REPLACE FUNCTION public.get_or_create_chat_session(
  p_user_id uuid,
  p_session_id text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id text;
BEGIN
  -- If no session_id provided, generate one
  IF p_session_id IS NULL THEN
    v_session_id := 'session_' || gen_random_uuid()::text;
  ELSE
    v_session_id := p_session_id;
  END IF;
  
  -- Try to insert new session, ignore if exists
  INSERT INTO public.chat_sessions (user_id, session_id, title)
  VALUES (p_user_id, v_session_id, 'New Chat Session')
  ON CONFLICT (session_id) DO NOTHING;
  
  RETURN v_session_id;
END;
$$;

-- Function to add a message to a chat session
CREATE OR REPLACE FUNCTION public.add_chat_message(
  p_session_id text,
  p_message_type text,
  p_content text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message_id uuid;
BEGIN
  INSERT INTO public.chat_messages (session_id, message_type, content, metadata)
  VALUES (p_session_id, p_message_type, p_content, p_metadata)
  RETURNING id INTO v_message_id;
  
  -- Update session updated_at timestamp
  UPDATE public.chat_sessions 
  SET updated_at = now()
  WHERE session_id = p_session_id;
  
  RETURN v_message_id;
END;
$$;

-- Function to get chat history for a session
CREATE OR REPLACE FUNCTION public.get_chat_history(
  p_session_id text
)
RETURNS TABLE (
  id uuid,
  message_type text,
  content text,
  metadata jsonb,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.message_type,
    cm.content,
    cm.metadata,
    cm.created_at
  FROM public.chat_messages cm
  INNER JOIN public.chat_sessions cs ON cm.session_id = cs.session_id
  WHERE cm.session_id = p_session_id
    AND cs.user_id = auth.uid()
  ORDER BY cm.created_at ASC;
END;
$$;

-- Function to clear chat session
CREATE OR REPLACE FUNCTION public.clear_chat_session(
  p_session_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all messages for the session
  DELETE FROM public.chat_messages 
  WHERE session_id = p_session_id;
  
  -- Update session title and timestamp
  UPDATE public.chat_sessions 
  SET title = 'Cleared Chat Session', updated_at = now()
  WHERE session_id = p_session_id;
  
  RETURN true;
END;
$$;
