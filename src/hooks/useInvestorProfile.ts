import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface InvestorProfile {
  userId: string;
  name: string;
  phone: string;
  email: string | null;
}

interface InvestorStats {
  reservationsCount: number;
  activeReservations: number;
  certificatesCount: number;
  totalInvestment: number;
}

export function useInvestorProfile(userId: string | null) {
  const [profile, setProfile] = useState<InvestorProfile | null>(null);
  const [stats, setStats] = useState<InvestorStats>({
    reservationsCount: 0,
    activeReservations: 0,
    certificatesCount: 0,
    totalInvestment: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadInvestorData();
    } else {
      setProfile(null);
      setStats({
        reservationsCount: 0,
        activeReservations: 0,
        certificatesCount: 0,
        totalInvestment: 0
      });
      setLoading(false);
    }
  }, [userId]);

  const loadInvestorData = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, phone, email')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      setProfile({
        userId: profileData.id,
        name: profileData.display_name || 'مستثمر',
        phone: profileData.phone || '',
        email: profileData.email
      });

      const { count: reservationsCount } = await supabase
        .from('b2f_investment_requests')
        .select('*', { count: 'exact', head: true })
        .eq('phone_number', profileData.phone);

      const { count: activeReservations } = await supabase
        .from('b2f_investment_requests')
        .select('*', { count: 'exact', head: true })
        .eq('phone_number', profileData.phone)
        .in('status', ['pending', 'approved', 'approved_pending_payment']);

      const { count: certificatesCount } = await supabase
        .from('b2f_certificates')
        .select('*', { count: 'exact', head: true })
        .eq('investor_phone', profileData.phone);

      const { data: requestsData } = await supabase
        .from('b2f_investment_requests')
        .select('investment_amount')
        .eq('phone_number', profileData.phone)
        .eq('payment_status', 'approved');

      const totalInvestment = requestsData?.reduce(
        (sum, r) => sum + (Number(r.investment_amount) || 0),
        0
      ) || 0;

      setStats({
        reservationsCount: reservationsCount || 0,
        activeReservations: activeReservations || 0,
        certificatesCount: certificatesCount || 0,
        totalInvestment
      });
    } catch (err: any) {
      console.error('Error loading investor data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    if (userId) {
      loadInvestorData();
    }
  };

  return {
    profile,
    stats,
    loading,
    error,
    refreshData
  };
}
