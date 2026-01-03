import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface OpportunityAvailability {
  totalUnits: number;
  reservedUnits: number;
  remainingUnits: number;
  reservationPercentage: number;
  isAlmostFull: boolean;
  isVeryLimited: boolean;
  isSoldOut: boolean;
  loading: boolean;
}

export function useOpportunityAvailability(opportunityId: string, totalUnits: number): OpportunityAvailability {
  const [reservedUnits, setReservedUnits] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReservedUnits();

    const channel = supabase
      .channel(`opportunity_${opportunityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'investor_bookings',
          filter: `opportunity_id=eq.${opportunityId}`
        },
        () => {
          loadReservedUnits();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [opportunityId]);

  const loadReservedUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('investor_bookings')
        .select('number_of_trees')
        .eq('opportunity_id', opportunityId)
        .in('status', ['pending', 'confirmed', 'active']);

      if (error) throw error;

      const total = (data || []).reduce((sum, booking) => sum + booking.number_of_trees, 0);
      setReservedUnits(total);
    } catch (err) {
      console.error('Error loading reserved units:', err);
      setReservedUnits(0);
    } finally {
      setLoading(false);
    }
  };

  const remainingUnits = totalUnits - reservedUnits;
  const reservationPercentage = totalUnits > 0 ? (reservedUnits / totalUnits) * 100 : 0;

  return {
    totalUnits,
    reservedUnits,
    remainingUnits,
    reservationPercentage,
    isAlmostFull: reservationPercentage >= 70,
    isVeryLimited: reservationPercentage >= 90,
    isSoldOut: remainingUnits <= 0,
    loading
  };
}
