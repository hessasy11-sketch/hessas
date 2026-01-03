import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Auction = Database['public']['Tables']['auctions']['Row'];

export interface FavoriteAuction extends Auction {
  favorited_at: string;
}

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteAuction[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('user_favorites')
        .select(`
          created_at,
          auctions (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formatted = data?.map((fav: any) => ({
        ...fav.auctions,
        favorited_at: fav.created_at
      })) || [];

      setFavorites(formatted);

      const ids = new Set(formatted.map((f: FavoriteAuction) => f.id));
      setFavoriteIds(ids);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setError('حدث خطأ أثناء تحميل المفضلة');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addToFavorites = async (auctionId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: insertError } = await supabase
        .from('user_favorites')
        .insert({
          user_id: user.id,
          auction_id: auctionId
        });

      if (insertError) {
        if (insertError.code === '23505') {
          return true;
        }
        throw insertError;
      }

      setFavoriteIds(prev => new Set([...prev, auctionId]));
      await fetchFavorites();

      return true;
    } catch (err) {
      console.error('Error adding to favorites:', err);
      return false;
    }
  };

  const removeFromFavorites = async (auctionId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: deleteError } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('auction_id', auctionId);

      if (deleteError) throw deleteError;

      setFavoriteIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(auctionId);
        return newSet;
      });

      await fetchFavorites();

      return true;
    } catch (err) {
      console.error('Error removing from favorites:', err);
      return false;
    }
  };

  const toggleFavorite = async (auctionId: string): Promise<boolean> => {
    if (favoriteIds.has(auctionId)) {
      return await removeFromFavorites(auctionId);
    } else {
      return await addToFavorites(auctionId);
    }
  };

  const clearAllFavorites = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: deleteError } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setFavorites([]);
      setFavoriteIds(new Set());

      await supabase.from('user_activities').insert({
        user_id: user.id,
        activity_type: 'favorites_cleared',
        activity_description: 'مسح جميع المزادات من المفضلة',
        reference_id: user.id
      });

      return true;
    } catch (err) {
      console.error('Error clearing favorites:', err);
      return false;
    }
  };

  const isFavorite = (auctionId: string): boolean => {
    return favoriteIds.has(auctionId);
  };

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return {
    favorites,
    favoriteIds,
    loading,
    error,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    clearAllFavorites,
    isFavorite,
    refetch: fetchFavorites,
    count: favorites.length
  };
}
