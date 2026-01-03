import { useState } from 'react';
import { ArrowRight, ShoppingBag, Gavel, Filter, Clock, CheckCircle, XCircle, AlertCircle, Activity, Plus } from 'lucide-react';
import { useMyRequests } from '../hooks/useMyRequests';
import { OffersView } from './OffersView';
import { CreateRequestModal } from './CreateRequestModal';
import { AuctionDetails } from './AuctionDetails';

interface MyRequestsViewProps {
  onBack: () => void;
}

type TabType = 'auctions' | 'purchases';
type StatusFilter = 'all' | 'active' | 'under_review' | 'completed' | 'closed';

export function MyRequestsView({ onBack }: MyRequestsViewProps) {
  const { purchaseRequests, auctionParticipations, activities, loading, error, refetch, updatePurchaseRequestStatus } = useMyRequests();
  const [activeTab, setActiveTab] = useState<TabType>('auctions');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedRequestForOffers, setSelectedRequestForOffers] = useState<{id: string, title: string} | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { label: 'نشط', color: 'bg-blue-100 text-blue-700', icon: Clock },
      under_review: { label: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
      completed: { label: 'مكتمل', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      closed: { label: 'مغلق', color: 'bg-red-100 text-red-700', icon: XCircle }
    };

    const badge = badges[status as keyof typeof badges] || badges.active;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const getAuctionStatus = (auction: any) => {
    const now = new Date();
    const endsAt = new Date(auction.ends_at);

    if (auction.status === 'ended') {
      return { label: 'منتهي', color: 'bg-gray-100 text-gray-700' };
    } else if (endsAt < now) {
      return { label: 'منتهي', color: 'bg-gray-100 text-gray-700' };
    } else if (endsAt.getTime() - now.getTime() < 3600000) {
      return { label: 'قريب من الانتهاء', color: 'bg-orange-100 text-orange-700' };
    } else {
      return { label: 'نشط', color: 'bg-green-100 text-green-700' };
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ar-SA', { minimumFractionDigits: 2 });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredPurchaseRequests = statusFilter === 'all'
    ? purchaseRequests
    : purchaseRequests.filter(req => req.status === statusFilter);

  const handleCloseRequest = async (requestId: string) => {
    if (window.confirm('هل أنت متأكد من إغلاق هذا الطلب؟ لن تُقبل عروض جديدة بعد الإغلاق.')) {
      await updatePurchaseRequestStatus(requestId, 'closed');
      refetch();
    }
  };

  if (selectedRequestForOffers) {
    return (
      <OffersView
        requestId={selectedRequestForOffers.id}
        requestTitle={selectedRequestForOffers.title}
        onBack={() => {
          setSelectedRequestForOffers(null);
          refetch();
        }}
        onOfferAccepted={() => refetch()}
      />
    );
  }

  if (selectedAuctionId) {
    const auction = auctionParticipations.find(p => p.auction_id === selectedAuctionId)?.auction;
    if (auction) {
      return (
        <AuctionDetails
          auction={auction as any}
          onBack={() => setSelectedAuctionId(null)}
        />
      );
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">جاري تحميل طلباتك...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50" dir="rtl">
      <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 flex items-center gap-3 shadow-lg">
        <button
          onClick={onBack}
          className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-white flex-1">طلباتي</h2>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 pb-20">
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
          <div className="flex border-b-2 border-gray-100">
            <button
              onClick={() => setActiveTab('auctions')}
              className={`flex-1 py-4 px-6 font-bold text-base flex items-center justify-center gap-2 transition-all ${
                activeTab === 'auctions'
                  ? 'bg-green-50 text-green-700 border-b-4 border-green-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Gavel className="w-5 h-5" />
              طلبات المزاد
              <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                {auctionParticipations.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('purchases')}
              className={`flex-1 py-4 px-6 font-bold text-base flex items-center justify-center gap-2 transition-all ${
                activeTab === 'purchases'
                  ? 'bg-green-50 text-green-700 border-b-4 border-green-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              طلبات الشراء
              <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                {purchaseRequests.length}
              </span>
            </button>
          </div>

          {activeTab === 'purchases' && (
            <div className="p-4 bg-gray-50 border-b-2 border-gray-100">
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-bold text-gray-600">الفلترة:</span>
                {(['all', 'active', 'under_review', 'completed', 'closed'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      statusFilter === status
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {status === 'all' ? 'الكل' : status === 'active' ? 'نشطة' : status === 'under_review' ? 'قيد المراجعة' : status === 'completed' ? 'مكتملة' : 'مغلقة'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-6">
            {activeTab === 'auctions' ? (
              auctionParticipations.length === 0 ? (
                <div className="text-center py-12">
                  <Gavel className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">لم تشارك في أي مزاد بعد</p>
                  <p className="text-sm text-gray-400 mt-2">ابدأ بالمزايدة على المنتجات الزراعية المتاحة</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {auctionParticipations.map((participation) => {
                    const auction = participation.auction;
                    if (!auction) return null;

                    const status = getAuctionStatus(auction);

                    return (
                      <div
                        key={participation.id}
                        className="bg-white border-2 border-gray-100 hover:border-green-200 rounded-2xl overflow-hidden transition-all hover:shadow-lg"
                      >
                        <div className="aspect-video bg-gray-200 relative">
                          {auction.image_url ? (
                            <img
                              src={auction.image_url}
                              alt={auction.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Gavel className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                          <div className="absolute top-3 right-3">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                          {participation.is_winner && (
                            <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              فزت بالمزاد
                            </div>
                          )}
                        </div>

                        <div className="p-4">
                          <h3 className="font-bold text-gray-800 mb-2 line-clamp-1">
                            {auction.title}
                          </h3>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">السعر الحالي:</span>
                              <span className="font-bold text-green-700">
                                {formatCurrency(Number(auction.current_price))} ريال
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">أعلى مزايدتك:</span>
                              <span className="font-bold text-blue-700">
                                {formatCurrency(Number(participation.highest_bid))} ريال
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">عدد مزايداتك:</span>
                              <span className="font-bold text-gray-700">
                                {participation.bid_count} مزايدة
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => setSelectedAuctionId(auction.id)}
                            className="w-full mt-4 bg-green-50 hover:bg-green-100 text-green-700 py-2 rounded-lg font-bold text-sm transition-all"
                          >
                            عرض تفاصيل المزاد
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              filteredPurchaseRequests.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">
                    {statusFilter === 'all' ? 'لم تنشئ أي طلب شراء بعد' : `لا توجد طلبات ${statusFilter === 'active' ? 'نشطة' : statusFilter === 'under_review' ? 'قيد المراجعة' : statusFilter === 'completed' ? 'مكتملة' : 'مغلقة'}`}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">أنشئ طلب شراء للحصول على عروض من الموردين</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPurchaseRequests.map((request) => (
                    <div
                      key={request.id}
                      className="bg-white border-2 border-gray-100 hover:border-green-200 rounded-2xl p-5 transition-all hover:shadow-lg"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800 text-lg mb-2">
                            {request.title}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {request.description}
                          </p>
                        </div>
                        <div className="mr-4">
                          {getStatusBadge(request.status)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">التصنيف</div>
                          <div className="font-bold text-sm text-gray-700">
                            {request.category?.name_ar || 'غير محدد'}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">الكمية</div>
                          <div className="font-bold text-sm text-gray-700">
                            {request.quantity || '-'}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">الميزانية</div>
                          <div className="font-bold text-sm text-green-700">
                            {request.budget ? `${formatCurrency(Number(request.budget))} ريال` : '-'}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">العروض</div>
                          <div className="font-bold text-sm text-blue-700">
                            {request.offers_count} عرض
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedRequestForOffers({ id: request.id, title: request.title })}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-bold text-sm transition-all"
                        >
                          عرض العروض ({request.offers_count})
                        </button>
                        {request.status === 'active' && (
                          <button
                            onClick={() => handleCloseRequest(request.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-700 py-2 px-4 rounded-lg font-bold text-sm transition-all"
                          >
                            إغلاق
                          </button>
                        )}
                      </div>

                      <div className="text-xs text-gray-500 mt-3 flex items-center gap-4">
                        <span>تاريخ النشر: {formatDate(request.created_at)}</span>
                        {request.delivery_date && (
                          <span>التسليم المطلوب: {formatDate(request.delivery_date)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {activities.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b-2 border-gray-200">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                <Activity className="w-6 h-6 text-gray-600" />
                سجل الأنشطة الأخيرة
              </h3>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
                  >
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">{activity.activity_description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(activity.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => setCreateModalOpen(true)}
        className="fixed bottom-20 left-4 bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110 z-10 flex items-center gap-2"
      >
        <Plus className="w-6 h-6" />
        <span className="font-bold">إضافة طلب</span>
      </button>

      <CreateRequestModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          refetch();
          setCreateModalOpen(false);
        }}
      />
    </div>
  );
}
