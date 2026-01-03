import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SystemMessage {
  id: string;
  section: 'sales' | 'contracts' | 'operations' | 'investor_service';
  stage: string;
  message_text: string;
  icon: string;
  display_order: number;
  is_active: boolean;
}

export function useSystemMessages(section?: string, stage?: string) {
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, [section, stage]);

  const loadMessages = async () => {
    try {
      let query = supabase
        .from('b2f_system_messages')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (section) {
        query = query.eq('section', section);
      }

      if (stage) {
        query = query.eq('stage', stage);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading system messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMessage = (targetSection: string, targetStage: string): SystemMessage | null => {
    return messages.find(
      m => m.section === targetSection && m.stage === targetStage
    ) || null;
  };

  return { messages, loading, getMessage, refresh: loadMessages };
}
