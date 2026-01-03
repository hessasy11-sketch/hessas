import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface UserProfile {
  id: string;
  display_name: string;
  phone_number: string;
  followers_count: number;
  following_count: number;
  created_at: string;
}

export interface FollowSuggestion extends UserProfile {
  common_interests: number;
}

export function useFollowers() {
  const { user } = useAuth();
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [suggestions, setSuggestions] = useState<FollowSuggestion[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFollowing = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('user_followers')
        .select(`
          following_id,
          profiles!user_followers_following_id_fkey (
            id,
            display_name,
            phone_number,
            followers_count,
            following_count,
            created_at
          )
        `)
        .eq('follower_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formatted = data?.map((f: any) => f.profiles).filter(Boolean) || [];
      setFollowing(formatted);

      const ids = new Set(formatted.map((p: UserProfile) => p.id));
      setFollowingIds(ids);
    } catch (err) {
      console.error('Error fetching following:', err);
    }
  }, [user]);

  const fetchFollowers = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('user_followers')
        .select(`
          follower_id,
          profiles!user_followers_follower_id_fkey (
            id,
            display_name,
            phone_number,
            followers_count,
            following_count,
            created_at
          )
        `)
        .eq('following_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formatted = data?.map((f: any) => f.profiles).filter(Boolean) || [];
      setFollowers(formatted);
    } catch (err) {
      console.error('Error fetching followers:', err);
    }
  }, [user]);

  const fetchSuggestions = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .rpc('get_follow_suggestions', {
          user_id: user.id,
          limit_count: 3
        });

      if (fetchError) throw fetchError;
      setSuggestions(data || []);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    }
  }, [user]);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchFollowing(),
        fetchFollowers(),
        fetchSuggestions()
      ]);
    } catch (err) {
      console.error('Error fetching followers data:', err);
      setError('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [user, fetchFollowing, fetchFollowers, fetchSuggestions]);

  const followUser = async (userId: string): Promise<boolean> => {
    if (!user || userId === user.id) return false;

    try {
      const { error: insertError } = await supabase
        .from('user_followers')
        .insert({
          follower_id: user.id,
          following_id: userId
        });

      if (insertError) {
        if (insertError.code === '23505') {
          return true;
        }
        throw insertError;
      }

      setFollowingIds(prev => new Set([...prev, userId]));
      await fetchAll();

      return true;
    } catch (err) {
      console.error('Error following user:', err);
      return false;
    }
  };

  const unfollowUser = async (userId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: deleteError } = await supabase
        .from('user_followers')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);

      if (deleteError) throw deleteError;

      setFollowingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });

      await fetchAll();

      return true;
    } catch (err) {
      console.error('Error unfollowing user:', err);
      return false;
    }
  };

  const toggleFollow = async (userId: string): Promise<boolean> => {
    if (followingIds.has(userId)) {
      return await unfollowUser(userId);
    } else {
      return await followUser(userId);
    }
  };

  const isFollowing = (userId: string): boolean => {
    return followingIds.has(userId);
  };

  const searchUsers = async (query: string): Promise<UserProfile[]> => {
    if (!query.trim()) return [];

    try {
      const { data, error: searchError } = await supabase
        .from('profiles')
        .select('id, display_name, phone_number, followers_count, following_count, created_at')
        .or(`display_name.ilike.%${query}%,phone_number.ilike.%${query}%`)
        .neq('id', user?.id || '')
        .limit(10);

      if (searchError) throw searchError;
      return data || [];
    } catch (err) {
      console.error('Error searching users:', err);
      return [];
    }
  };

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    following,
    followers,
    suggestions,
    followingIds,
    loading,
    error,
    followUser,
    unfollowUser,
    toggleFollow,
    isFollowing,
    searchUsers,
    refetch: fetchAll,
    followingCount: following.length,
    followersCount: followers.length
  };
}
