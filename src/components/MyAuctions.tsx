import { useState } from 'react';
import { Edit, Trash2, Clock, DollarSign } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAuctions } from '../hooks/useAuctions';
import type { Database } from '../lib/database.types';

type Auction = Database['public']['Tables']['auctions']['Row'];

export function MyAuctions() {
  const { user } = useAuth();
  const { auctions, loading, deleteAuction, updateAuction } = useAuctions();
  const [extendingId, setExtendingId] = useState<string | null>(null);

  const myAuctions = auctions.filter((a) => a.owner_id === user?.id);

  const handleExtend = async (auction: Auction) => {
    if (!confirm('هل تريد تمديد المزاد لمدة 24 ساعة إضافية؟')) return;

    setExtendingId(auction.id);
    try {
      const newEndsAt = new Date(new Date(auction.ends_at).getTime() + 24 * 60 * 60 * 1000);
      await updateAuction(auction.id, {
        ends_at: newEndsAt.toISOString(),
        status: 'extended',
      });
      alert('تم تمديد المزاد بنجاح');
    } catch (error) {
      console.error('Error extending auction:', error);
      alert('حدث خطأ أثناء تمديد المزاد');
    } finally {
      setExtendingId(null);
    }
  };

  const handleClose = async (auctionId: string) => {
    if (!confirm('هل تريد إغلاق المزاد؟')) return;

    try {
      await updateAuction(auctionId, { status: 'closed' });
      alert('تم إغلاق المزاد بنجاح');
    } catch (error) {
      console.error('Error closing auction:', error);
      alert('حدث خطأ أثناء إغلاق المزاد');
    }
  };

  const handleDelete = async (auctionId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المزاد؟ لا يمكن التراجع عن هذا الإجراء.')) return;

    try {
      await deleteAuction(auctionId);
      alert('تم حذف المزاد بنجاح');
    } catch (error) {
      console.error('Error deleting auction:', error);
      alert('حدث خطأ أثناء حذف المزاد');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">جاري التحميل...</div>
      </div>
    );
  }

  if (myAuctions.length === 0) {
    return (
      <div className="text-center py-12" dir="rtl">
        <p className="text-gray-500 text-lg">لا توجد لديك مزادات بعد</p>
        <p className="text-gray-400 text-sm mt-2">ابدأ بإضافة مزادك الأول</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">مزاداتي</h2>

      {myAuctions.map((auction) => (
        <div
          key={auction.id}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{auction.title}</h3>
              {auction.description && (
                <p className="text-gray-600 text-sm mb-3">{auction.description}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <DollarSign className="w-4 h-4" />
                  <span>السعر الحالي: {auction.current_price} ريال</span>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>ينتهي: {new Date(auction.ends_at).toLocaleDateString('ar-SA')}</span>
                </div>
              </div>

              <div className="mt-3">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    auction.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : auction.status === 'closed'
                      ? 'bg-gray-100 text-gray-700'
                      : auction.status === 'extended'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {auction.status === 'active'
                    ? 'نشط'
                    : auction.status === 'closed'
                    ? 'مغلق'
                    : auction.status === 'extended'
                    ? 'ممتد'
                    : 'قادم'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-gray-200">
            {auction.status === 'active' && (
              <>
                <button
                  onClick={() => handleExtend(auction)}
                  disabled={extendingId === auction.id}
                  className="flex-1 bg-blue-500 text-white py-2 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors text-sm"
                >
                  {extendingId === auction.id ? 'جاري التمديد...' : 'تمديد 24 ساعة'}
                </button>
                <button
                  onClick={() => handleClose(auction.id)}
                  className="flex-1 bg-orange-500 text-white py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors text-sm"
                >
                  إغلاق المزاد
                </button>
              </>
            )}

            <button
              onClick={() => handleDelete(auction.id)}
              className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
