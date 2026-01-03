import { useState, useEffect } from 'react';
import { ArrowRight, Plus, Eye, Edit2, RefreshCw, CheckCircle, Clock, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CountdownTimer } from './CountdownTimer';
import type { Database } from '../lib/database.types';

type Auction = Database['public']['Tables']['auctions']['Row'];

interface MyAuctionsViewProps {
  onBack: () => void;
  onAddAuction: () => void;
}

export function MyAuctionsView({ onBack, onAddAuction }: MyAuctionsViewProps) {
  const { user } = useAuth();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'ended' | 'closed'>('active');

  useEffect(() => {
    if (!user) return;
    fetchMyAuctions();
  }, [user]);

  const fetchMyAuctions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('auctions')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAuctions(data || []);
    } catch (error) {
      console.error('Error fetching auctions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsSold = async (auctionId: string) => {
    try {
      const { error } = await supabase
        .from('auctions')
        .update({ status: 'sold' })
        .eq('id', auctionId);

      if (error) throw error;
      fetchMyAuctions();
    } catch (error) {
      console.error('Error marking as sold:', error);
    }
  };

  const handleRepost = async (auctionId: string) => {
    try {
      const newEndDate = new Date();
      newEndDate.setDate(newEndDate.getDate() + 3);

      const { error } = await supabase
        .from('auctions')
        .update({
          status: 'active',
          ends_at: newEndDate.toISOString(),
        })
        .eq('id', auctionId);

      if (error) throw error;
      fetchMyAuctions();
    } catch (error) {
      console.error('Error reposting auction:', error);
    }
  };

  const activeAuctions = auctions.filter((a) => a.status === 'active' || a.status === 'extended');
  const endedAuctions = auctions.filter((a) => {
    const isExpired = new Date(a.ends_at) < new Date();
    return (a.status === 'closed' || isExpired) && a.status !== 'sold';
  });
  const soldAuctions = auctions.filter((a) => a.status === 'sold');

  const displayAuctions =
    activeTab === 'active' ? activeAuctions :
    activeTab === 'ended' ? endedAuctions :
    soldAuctions;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 flex items-center gap-3 shadow-lg">
        <button
          onClick={onBack}
          className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-white">مزاداتي وعروضي الزراعية</h2>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-all ${
                activeTab === 'active'
                  ? 'text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              نشط ({activeAuctions.length})
            </button>
            <button
              onClick={() => setActiveTab('ended')}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-all ${
                activeTab === 'ended'
                  ? 'text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              منتهي ({endedAuctions.length})
            </button>
            <button
              onClick={() => setActiveTab('closed')}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-all ${
                activeTab === 'closed'
                  ? 'text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              مباع ({soldAuctions.length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">جاري التحميل...</div>
          </div>
        ) : displayAuctions.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-600 text-lg font-semibold mb-2">لا توجد مزادات في هذا القسم</p>
            <p className="text-gray-500 text-sm">ابدأ بإضافة مزاد جديد الآن</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayAuctions.map((auction) => (
              <AuctionCard
                key={auction.id}
                auction={auction}
                onMarkAsSold={handleMarkAsSold}
                onRepost={handleRepost}
                status={activeTab}
              />
            ))}
          </div>
        )}

        {/* Add Auction Button */}
        <button
          onClick={onAddAuction}
          className="w-full mt-6 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <Plus className="w-6 h-6" />
          أضف مزاد جديد
        </button>
      </div>
    </div>
  );
}

interface AuctionCardProps {
  auction: Auction;
  onMarkAsSold: (id: string) => void;
  onRepost: (id: string) => void;
  status: 'active' | 'ended' | 'closed';
}

function AuctionCard({ auction, onMarkAsSold, onRepost, status }: AuctionCardProps) {
  const isActive = status === 'active';
  const isEnded = status === 'ended';
  const isSold = status === 'closed';

  return (
    <div
      className={`bg-white rounded-2xl shadow-lg border-2 overflow-hidden transition-all hover:shadow-xl ${
        isActive ? 'border-emerald-200' : isEnded ? 'border-gray-200' : 'border-red-200'
      }`}
    >
      <div className="flex gap-4 p-4">
        {/* Image */}
        <div className="w-32 h-32 flex-shrink-0">
          {auction.images.length > 0 ? (
            <img
              src={auction.images[0]}
              alt={auction.title}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
              <span className="text-4xl">🌾</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">{auction.title}</h3>

          {isActive && (
            <div className="mb-2">
              <CountdownTimer endsAt={auction.ends_at} size="small" />
            </div>
          )}

          <div className="flex items-center gap-4 text-sm mb-3">
            <div className="flex items-center gap-1">
              <span className="text-gray-600">السعر:</span>
              <span className="font-bold text-emerald-600">{auction.current_price.toLocaleString('ar-SA')} ر.س</span>
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <Eye className="w-4 h-4" />
              <span>0</span>
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <Users className="w-4 h-4" />
              <span>0</span>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            {new Date(auction.created_at).toLocaleDateString('ar-SA')}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-gray-50 p-3 flex gap-2">
        {isActive && (
          <>
            <button
              onClick={() => onMarkAsSold(auction.id)}
              className="flex-1 bg-green-500 text-white py-2 rounded-lg font-medium text-sm hover:bg-green-600 transition-all flex items-center justify-center gap-1"
            >
              <CheckCircle className="w-4 h-4" />
              تم البيع
            </button>
            <button className="flex-1 bg-blue-500 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-600 transition-all flex items-center justify-center gap-1">
              <Edit2 className="w-4 h-4" />
              تعديل
            </button>
          </>
        )}
        {isEnded && (
          <button
            onClick={() => onRepost(auction.id)}
            className="flex-1 bg-emerald-500 text-white py-2 rounded-lg font-medium text-sm hover:bg-emerald-600 transition-all flex items-center justify-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة نشر
          </button>
        )}
        {isSold && (
          <div className="flex-1 text-center py-2 text-green-700 font-bold text-sm">
            ✓ تم البيع بنجاح
          </div>
        )}
      </div>
    </div>
  );
}
