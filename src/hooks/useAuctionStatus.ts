import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getAuctionStatus, AuctionStatusInfo } from '../utils/auctionStatus';

export function useAuctionStatus(
  auctionId: string,
  startsAt: string,
  endsAt: string,
  initialDbStatus: string,
  isExtended?: boolean
) {
  const [statusInfo, setStatusInfo] = useState<AuctionStatusInfo>(
    getAuctionStatus(startsAt, endsAt, initialDbStatus, isExtended)
  );
  const [dbStatus, setDbStatus] = useState(initialDbStatus);

  // تحديث الحالة من الوقت
  useEffect(() => {
    const updateStatusFromTime = () => {
      const newStatus = getAuctionStatus(startsAt, endsAt, dbStatus, isExtended);
      setStatusInfo(newStatus);
    };

    updateStatusFromTime();

    // تحديث كل دقيقة
    const interval = setInterval(updateStatusFromTime, 60000);

    return () => clearInterval(interval);
  }, [startsAt, endsAt, dbStatus, isExtended]);

  // الاستماع للتحديثات Real-time من قاعدة البيانات
  useEffect(() => {
    const channel = supabase
      .channel(`auction-status-${auctionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'auctions',
          filter: `id=eq.${auctionId}`
        },
        (payload) => {
          const newStatus = payload.new.status;
          const newIsExtended = payload.new.is_extended;

          setDbStatus(newStatus);

          const updatedStatus = getAuctionStatus(
            startsAt,
            endsAt,
            newStatus,
            newIsExtended
          );
          setStatusInfo(updatedStatus);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auctionId, startsAt, endsAt]);

  return statusInfo;
}

// Hook مبسط للاستخدام السريع
export function useAuctionStatusSimple(
  startsAt: string,
  endsAt: string,
  dbStatus: string,
  isExtended?: boolean
) {
  const [statusInfo, setStatusInfo] = useState<AuctionStatusInfo>(
    getAuctionStatus(startsAt, endsAt, dbStatus, isExtended)
  );

  useEffect(() => {
    const updateStatus = () => {
      const newStatus = getAuctionStatus(startsAt, endsAt, dbStatus, isExtended);
      setStatusInfo(newStatus);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 60000);

    return () => clearInterval(interval);
  }, [startsAt, endsAt, dbStatus, isExtended]);

  return statusInfo;
}
