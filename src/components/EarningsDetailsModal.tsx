import { X, TrendingUp, Calendar, DollarSign, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface SoldAuction {
  id: string;
  title: string;
  current_price: number;
  ends_at: string;
  category_name?: string;
}

interface EarningsDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function EarningsDetailsModal({ isOpen, onClose, userId }: EarningsDetailsModalProps) {
  const [soldAuctions, setSoldAuctions] = useState<SoldAuction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      fetchSoldAuctions();
    }
  }, [isOpen, userId]);

  const fetchSoldAuctions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('auctions')
        .select(`
          id,
          title,
          current_price,
          ends_at,
          category_id,
          categories (
            name_ar
          )
        `)
        .eq('owner_id', userId)
        .eq('status', 'sold')
        .order('ends_at', { ascending: false });

      if (error) throw error;

      const formatted = data?.map((auction: any) => ({
        id: auction.id,
        title: auction.title,
        current_price: Number(auction.current_price),
        ends_at: auction.ends_at,
        category_name: auction.categories?.name_ar || 'غير محدد'
      })) || [];

      setSoldAuctions(formatted);
    } catch (error) {
      console.error('Error fetching sold auctions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalEarnings = soldAuctions.reduce((sum, auction) => sum + auction.current_price, 0);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-7 h-7" />
            تفاصيل الأرباح الزراعية
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="text-sm opacity-90 mb-2">إجمالي الأرباح المحققة</div>
            <div className="text-4xl font-bold">
              {formatCurrency(totalEarnings)} ريال
            </div>
            <div className="text-sm opacity-90 mt-2">
              من {soldAuctions.length} مزاد مباع
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : soldAuctions.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">لا توجد مزادات مباعة حتى الآن</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-12 gap-3 text-sm font-bold text-gray-600">
                <div className="col-span-1">#</div>
                <div className="col-span-4">عنوان المزاد</div>
                <div className="col-span-2">التصنيف</div>
                <div className="col-span-2">تاريخ البيع</div>
                <div className="col-span-3 text-left">قيمة البيع</div>
              </div>

              <div className="space-y-2">
                {soldAuctions.map((auction, index) => (
                  <div
                    key={auction.id}
                    className="bg-white border-2 border-gray-100 hover:border-green-200 rounded-xl p-4 grid grid-cols-12 gap-3 items-center transition-all"
                  >
                    <div className="col-span-1">
                      <div className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                    </div>
                    <div className="col-span-4">
                      <div className="font-bold text-gray-800 line-clamp-1">
                        {auction.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        #{auction.id.slice(0, 8)}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                        {auction.category_name}
                      </span>
                    </div>
                    <div className="col-span-2 text-sm text-gray-600 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(auction.ends_at)}
                    </div>
                    <div className="col-span-3 text-left">
                      <div className="text-xl font-bold text-green-700 flex items-center justify-end gap-1">
                        <DollarSign className="w-5 h-5" />
                        {formatCurrency(auction.current_price)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t-2 border-gray-100">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-xl font-bold transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
