import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface SessionData {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  status: string;
  summary: string | null;
  main_goals: string[] | null;
  topics_discussed: string[] | null;
  created_at: string;
  rating?: number | null;
  feedback?: string[] | null;
}

export function useSession() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const sessionStartTimeRef = useRef<Date | null>(null);
  // Use a ref to always have access to the latest session ID
  const currentSessionIdRef = useRef<string | null>(null);

  const startSession = useCallback(async () => {
    if (!user) {
      console.error('No user found when trying to start session');
      return null;
    }

    setLoading(true);
    try {
      sessionStartTimeRef.current = new Date();
      
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create session:', error);
        toast({
          title: 'Session Error',
          description: 'Failed to start session. Your conversation will not be saved.',
          variant: 'destructive',
        });
        return null;
      }

      setCurrentSession(data);
      currentSessionIdRef.current = data.id;
      return data as SessionData;
    } catch (error) {
      console.error('Session creation error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const endSession = useCallback(async (status: 'completed' | 'paused' = 'completed') => {
    const sessionId = currentSessionIdRef.current;
    if (!sessionId) return null;

    const endTime = new Date();
    const durationSeconds = sessionStartTimeRef.current 
      ? Math.round((endTime.getTime() - sessionStartTimeRef.current.getTime()) / 1000)
      : null;

    try {
      const { data, error } = await supabase
        .from('sessions')
        .update({
          status,
          ended_at: endTime.toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        console.error('Failed to end session:', error);
        return null;
      }

      setCurrentSession(data);
      return data as SessionData;
    } catch (error) {
      console.error('Session end error:', error);
      return null;
    }
  }, [currentSession]);

  const saveMessage = useCallback(async (content: string, sender: 'user' | 'ai') => {
    // Use the ref to get the latest session ID, avoiding stale closure issues
    const sessionId = currentSessionIdRef.current;
    if (!sessionId) {
      console.error('No active session to save message to');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          sender,
          content,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to save message:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Message save error:', error);
      return null;
    }
  }, []);

  const getSessionMessages = useCallback(async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to get messages:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Get messages error:', error);
      return [];
    }
  }, []);

  const getUserSessions = useCallback(async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to get sessions:', error);
        return [];
      }

      return data as SessionData[];
    } catch (error) {
      console.error('Get sessions error:', error);
      return [];
    }
  }, [user]);

  const getSession = useCallback(async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        console.error('Failed to get session:', error);
        return null;
      }

      return data as SessionData;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }, []);

  const generateSummary = useCallback(async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-session-summary', {
        body: { sessionId }
      });

      if (error) {
        console.error('Failed to generate summary:', error);
        return null;
      }

      // Refresh session data to get updated summary
      const session = await getSession(sessionId);
      if (session) {
        setCurrentSession(session);
      }

      return data;
    } catch (error) {
      console.error('Generate summary error:', error);
      return null;
    }
  }, [getSession]);

  const updateSessionRating = useCallback(async (sessionId: string, rating: number, feedback: string[]) => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .update({ rating, feedback })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        console.error('Failed to update session rating:', error);
        return null;
      }

      return data as SessionData;
    } catch (error) {
      console.error('Update session rating error:', error);
      return null;
    }
  }, []);

  return {
    currentSession,
    loading,
    startSession,
    endSession,
    saveMessage,
    getSessionMessages,
    getUserSessions,
    getSession,
    generateSummary,
    setCurrentSession,
    updateSessionRating,
  };
}
