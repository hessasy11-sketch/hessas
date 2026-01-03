import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  icon: string;
}

export interface Message {
  id: string;
  sender_type: 'user' | 'ai' | 'admin';
  message: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useHelpCenter() {
  const { user } = useAuth();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchFAQs = useCallback(async (category?: string) => {
    try {
      let query = supabase
        .from('faq_database')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      setFaqs(data || []);
    } catch (err) {
      console.error('Error fetching FAQs:', err);
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    }
  }, [user]);

  const fetchMessages = useCallback(async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, []);

  const sendMessage = async (message: string, category?: string): Promise<boolean> => {
    if (!user || !message.trim()) return false;

    setSending(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-assistant`;
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId: currentSessionId,
          message,
          category
        })
      });

      const result = await response.json();

      if (result.success) {
        if (!currentSessionId) {
          setCurrentSessionId(result.sessionId);
        }
        await fetchMessages(result.sessionId);
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error sending message:', err);
      return false;
    } finally {
      setSending(false);
    }
  };

  const startNewSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  const rateFAQ = async (faqId: string, helpful: boolean) => {
    try {
      const { data: faq } = await supabase
        .from('faq_database')
        .select('helpful_count, not_helpful_count')
        .eq('id', faqId)
        .single();

      if (!faq) return;

      const updates = helpful
        ? { helpful_count: faq.helpful_count + 1 }
        : { not_helpful_count: faq.not_helpful_count + 1 };

      await supabase
        .from('faq_database')
        .update(updates)
        .eq('id', faqId);

      await fetchFAQs();
    } catch (err) {
      console.error('Error rating FAQ:', err);
    }
  };

  useEffect(() => {
    fetchFAQs();
    if (user) {
      fetchTickets();
    }
  }, [fetchFAQs, fetchTickets, user]);

  return {
    faqs,
    tickets,
    messages,
    loading,
    sending,
    currentSessionId,
    sendMessage,
    startNewSession,
    rateFAQ,
    fetchFAQs,
    fetchTickets,
  };
}
