import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type ChatMessage = Database['public']['Tables']['chat_messages']['Row'] & {
  sender?: {
    display_name: string;
    avatar_url: string | null;
  };
};

export function useChat(auctionId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`chat-${auctionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `auction_id=eq.${auctionId}`,
        },
        (payload) => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auctionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles!chat_messages_sender_id_fkey(display_name, avatar_url)
        `)
        .eq('auction_id', auctionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data as ChatMessage[] || []);
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (message: string, senderId: string) => {
    if (!message.trim()) return;

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        auction_id: auctionId,
        sender_id: senderId,
        message: message.trim(),
      });

    if (error) throw error;

    const priceMatch = message.match(/\d+(\.\d+)?/);
    const proposedPrice = priceMatch ? parseFloat(priceMatch[0]) : null;

    if (proposedPrice) {
      const { data: currentAuction } = await supabase
        .from('auctions')
        .select('current_price')
        .eq('id', auctionId)
        .single();

      if (currentAuction && proposedPrice > currentAuction.current_price) {
        await supabase
          .from('auctions')
          .update({ current_price: proposedPrice })
          .eq('id', auctionId);
      }
    }

    await loadMessages();
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        if (isNearBottom) {
          container.scrollTop = container.scrollHeight;
        }
      }
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    messagesEndRef,
  };
}
