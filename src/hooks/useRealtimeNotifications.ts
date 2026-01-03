import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Auction = Database['public']['Tables']['auctions']['Row'];

interface Notification {
  id: string;
  type: 'new_bid' | 'auction_ending' | 'auction_won' | 'auction_closed';
  message: string;
  auctionId: string;
  timestamp: Date;
}

export function useRealtimeNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!userId) return;

    const bidsChannel = supabase
      .channel('user-bids')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
        },
        async (payload) => {
          const bid = payload.new as any;

          const { data: auction } = await supabase
            .from('auctions')
            .select('*, owner_id')
            .eq('id', bid.auction_id)
            .single();

          if (auction && auction.owner_id === userId && bid.bidder_id !== userId) {
            addNotification({
              id: `bid-${bid.id}`,
              type: 'new_bid',
              message: `مزايدة جديدة بمبلغ ${bid.amount} ريال`,
              auctionId: bid.auction_id,
              timestamp: new Date(),
            });
          }
        }
      )
      .subscribe();

    const auctionsChannel = supabase
      .channel('user-auctions')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'auctions',
        },
        async (payload) => {
          const auction = payload.new as Auction;

          if (auction.owner_id === userId && auction.status === 'closed') {
            addNotification({
              id: `auction-closed-${auction.id}`,
              type: 'auction_closed',
              message: `انتهى المزاد: ${auction.title}`,
              auctionId: auction.id,
              timestamp: new Date(),
            });
          }

          const timeRemaining = new Date(auction.ends_at).getTime() - Date.now();
          if (timeRemaining > 0 && timeRemaining < 5 * 60 * 1000) {
            const { data: bids } = await supabase
              .from('bids')
              .select('bidder_id')
              .eq('auction_id', auction.id)
              .eq('bidder_id', userId);

            if (bids && bids.length > 0) {
              addNotification({
                id: `auction-ending-${auction.id}`,
                type: 'auction_ending',
                message: `المزاد ينتهي قريباً: ${auction.title}`,
                auctionId: auction.id,
                timestamp: new Date(),
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bidsChannel);
      supabase.removeChannel(auctionsChannel);
    };
  }, [userId]);

  const addNotification = (notification: Notification) => {
    setNotifications((prev) => [notification, ...prev].slice(0, 10));

    setTimeout(() => {
      removeNotification(notification.id);
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return {
    notifications,
    clearAll,
    removeNotification,
  };
}
