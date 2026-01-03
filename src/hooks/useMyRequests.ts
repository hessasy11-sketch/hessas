import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface PurchaseRequest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category_id: string;
  quantity: string;
  budget: number;
  location: string;
  delivery_date: string;
  status: 'active' | 'under_review' | 'completed' | 'closed';
  offers_count: number;
  created_at: string;
  updated_at: string;
  category?: {
    name_ar: string;
  };
}

export interface PurchaseOffer {
  id: string;
  request_id: string;
  supplier_id: string;
  price: number;
  delivery_time: string;
  notes: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  supplier?: {
    display_name: string;
    phone: string;
  };
}

export interface AuctionParticipation {
  id: string;
  user_id: string;
  auction_id: string;
  highest_bid: number;
  bid_count: number;
  is_winner: boolean;
  last_bid_at: string;
  created_at: string;
  auction?: {
    id: string;
    title: string;
    description: string;
    current_price: number;
    status: string;
    ends_at: string;
    image_url: string;
  };
}

export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: string;
  activity_description: string;
  reference_id: string;
  created_at: string;
}

export function useMyRequests() {
  const { user } = useAuth();
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [auctionParticipations, setAuctionParticipations] = useState<AuctionParticipation[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchaseRequests = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('user_purchase_requests')
        .select(`
          *,
          categories (
            name_ar
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching purchase requests:', fetchError);
        throw fetchError;
      }

      const formatted = data?.map((req: any) => ({
        ...req,
        category: req.categories
      })) || [];

      setPurchaseRequests(formatted);
    } catch (err) {
      console.error('Error in fetchPurchaseRequests:', err);
      throw err;
    }
  }, [user]);

  const fetchAuctionParticipations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('user_auction_participation')
        .select(`
          *,
          auctions (
            id,
            title,
            description,
            current_price,
            status,
            ends_at,
            image_url
          )
        `)
        .eq('user_id', user.id)
        .order('last_bid_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching auction participations:', fetchError);
        throw fetchError;
      }

      const formatted = data?.map((part: any) => ({
        ...part,
        auction: part.auctions
      })) || [];

      setAuctionParticipations(formatted);
    } catch (err) {
      console.error('Error in fetchAuctionParticipations:', err);
      throw err;
    }
  }, [user]);

  const fetchActivities = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) {
        console.error('Error fetching activities:', fetchError);
        throw fetchError;
      }
      setActivities(data || []);
    } catch (err) {
      console.error('Error in fetchActivities:', err);
      throw err;
    }
  }, [user]);

  const fetchAllData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchPurchaseRequests(),
        fetchAuctionParticipations(),
        fetchActivities()
      ]);
    } catch (err) {
      console.error('Error fetching requests data:', err);
      setError('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [user, fetchPurchaseRequests, fetchAuctionParticipations, fetchActivities]);

  const createPurchaseRequest = async (requestData: Partial<PurchaseRequest>) => {
    if (!user) return { success: false, error: 'المستخدم غير مسجل' };

    try {
      const { data, error: insertError } = await supabase
        .from('user_purchase_requests')
        .insert([
          {
            user_id: user.id,
            ...requestData
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      await supabase
        .from('user_activities')
        .insert([
          {
            user_id: user.id,
            activity_type: 'purchase_request_created',
            activity_description: `أنشأ طلب شراء "${requestData.title}"`,
            reference_id: data.id
          }
        ]);

      await fetchAllData();
      return { success: true, data };
    } catch (err) {
      console.error('Error creating purchase request:', err);
      return { success: false, error: 'فشل إنشاء الطلب' };
    }
  };

  const updatePurchaseRequestStatus = async (requestId: string, status: PurchaseRequest['status']) => {
    if (!user) return { success: false, error: 'المستخدم غير مسجل' };

    try {
      const { error: updateError } = await supabase
        .from('user_purchase_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await supabase
        .from('user_activities')
        .insert([
          {
            user_id: user.id,
            activity_type: 'request_status_updated',
            activity_description: `حدّث حالة طلب إلى "${status}"`,
            reference_id: requestId
          }
        ]);

      await fetchAllData();
      return { success: true };
    } catch (err) {
      console.error('Error updating request status:', err);
      return { success: false, error: 'فشل تحديث حالة الطلب' };
    }
  };

  const fetchOffersForRequest = async (requestId: string): Promise<PurchaseOffer[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('purchase_offers')
        .select(`
          *,
          profiles!purchase_offers_supplier_id_fkey (
            display_name,
            phone
          )
        `)
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      return data?.map((offer: any) => ({
        ...offer,
        supplier: offer.profiles
      })) || [];
    } catch (err) {
      console.error('Error fetching offers:', err);
      return [];
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    purchaseRequests,
    auctionParticipations,
    activities,
    loading,
    error,
    refetch: fetchAllData,
    createPurchaseRequest,
    updatePurchaseRequestStatus,
    fetchOffersForRequest
  };
}
