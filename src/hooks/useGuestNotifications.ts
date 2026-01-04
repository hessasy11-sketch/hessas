import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { retryFetch } from '../utils/retryFetch';

export interface GuestNotification {
  id: string;
  type: 'announcement' | 'offer' | 'update' | 'event' | 'system';
  priority: 'normal' | 'important' | 'urgent';
  title: string;
  message: string;
  icon: string;
  link?: string;
  created_at: string;
}

export function useGuestNotifications() {
  const [notifications, setNotifications] = useState<GuestNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGuestNotifications = async () => {
      try {
        const result = await retryFetch(async () => {
          const { data, error } = await supabase
            .rpc('get_active_guest_notifications');

          if (error) throw error;
          return data;
        }, 2, 500);

        setNotifications(result || []);
      } catch (err) {
        console.error('Error fetching guest notifications:', err);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGuestNotifications();

    const channel = supabase
      .channel('guest_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'b2f_guest_notifications'
        },
        () => {
          fetchGuestNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    notifications,
    loading
  };
}
