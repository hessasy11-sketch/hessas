import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useInvestorAuth } from '../contexts/InvestorAuthContext';

export interface B2FNotification {
  id: string;
  investor_account_id: string;
  type: 'booking' | 'payment' | 'contract' | 'certificate' | 'operation' | 'visit' | 'season' | 'system';
  priority: 'normal' | 'important' | 'urgent';
  title: string;
  message: string;
  icon: string;
  link?: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  metadata?: Record<string, any>;
}

export function useB2FNotifications() {
  const { investorPhone } = useInvestorAuth();
  const [notifications, setNotifications] = useState<B2FNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!investorPhone) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data: account } = await supabase
        .from('b2f_investor_accounts')
        .select('id')
        .eq('contact_phone', investorPhone)
        .single();

      if (!account) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('b2f_notifications')
        .select('*')
        .eq('investor_account_id', account.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (err) {
      console.error('Error fetching B2F notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [investorPhone]);

  const markAsRead = async (notificationId: string) => {
    if (!investorPhone) return;

    try {
      const { error } = await supabase
        .from('b2f_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!investorPhone) return;

    try {
      const { data: account } = await supabase
        .from('b2f_investor_accounts')
        .select('id')
        .eq('contact_phone', investorPhone)
        .single();

      if (!account) return;

      const { error } = await supabase
        .from('b2f_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('investor_account_id', account.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  useEffect(() => {
    if (investorPhone) {
      fetchNotifications();
    }
  }, [investorPhone, fetchNotifications]);

  useEffect(() => {
    if (!investorPhone) return;

    let accountId: string | null = null;

    const setupSubscription = async () => {
      const { data: account } = await supabase
        .from('b2f_investor_accounts')
        .select('id')
        .eq('contact_phone', investorPhone)
        .single();

      if (!account) return;
      accountId = account.id;

      const channel = supabase
        .channel('b2f_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'b2f_notifications',
            filter: `investor_account_id=eq.${accountId}`
          },
          (payload) => {
            const newNotification = payload.new as B2FNotification;
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'b2f_notifications',
            filter: `investor_account_id=eq.${accountId}`
          },
          (payload) => {
            const updatedNotification = payload.new as B2FNotification;
            setNotifications(prev =>
              prev.map(n => (n.id === updatedNotification.id ? updatedNotification : n))
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupSubscription();
    return () => {
      cleanup.then(fn => fn?.());
    };
  }, [investorPhone]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications
  };
}
