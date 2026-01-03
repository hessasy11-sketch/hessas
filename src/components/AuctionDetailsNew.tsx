import { useState, useEffect } from 'react';
import { Lock, TrendingUp, Package, Clock } from 'lucide-react';
import { Modal } from './Modal';
import { AuctionHeader } from './AuctionHeader';
import { AuctionImageGallery } from './AuctionImageGallery';
import { SellerTools } from './SellerTools';
import { ChatBoxEnhanced } from './ChatBoxEnhanced';
import { AuctionFooter } from './AuctionFooter';
import { RatingModal } from './RatingModal';
import { EditAuctionModal } from './EditAuctionModal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRegionsAndCities } from '../hooks/useRegionsAndCities';
import type { Database } from '../lib/database.types';

type Auction = Database['public']['Tables']['auctions']['Row'];

interface AuctionDetailsNewProps {
  auction: Auction;
  onClose: () => void;
}

export function AuctionDetailsNew({ auction: initialAuction, onClose }: AuctionDetailsNewProps) {
  const { user } = useAuth();
  const { getRegionById, getCityById } = useRegionsAndCities();
  const [auction, setAuction] = useState(initialAuction);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendHours, setExtendHours] = useState('24');
  const [showSoldModal, setShowSoldModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showClosingSoonAlert, setShowClosingSoonAlert] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const isOwner = user?.id === auction.owner_id;

  const getTimeRemaining = () => {
    const now = new Date().getTime();
    const end = new Date(auction.ends_at).getTime();
    return end - now;
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    if (user) {
      checkFavoriteStatus();
      trackView();
    }

    const checkClosingSoon = () => {
      const timeRemaining = getTimeRemaining();
      const oneHour = 60 * 60 * 1000;
      if (timeRemaining > 0 && timeRemaining < oneHour && auction.status === 'active') {
        setShowClosingSoonAlert(true);
      }
    };

    checkClosingSoon();
    const interval = setInterval(checkClosingSoon, 60000);

    return () => {
      document.body.style.overflow = 'unset';
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`auction-${auction.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'auctions',
          filter: `id=eq.${auction.id}`,
        },
        (payload) => {
          setAuction(payload.new as Auction);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auction.id]);

  const trackView = async () => {
    try {
      await supabase.from('auction_views').insert({
        auction_id: auction.id,
        viewer_id: user?.id,
        viewed_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const checkFavoriteStatus = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('auction_id', auction.id)
        .maybeSingle();

      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const showAlert = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handleToggleChat = async () => {
    try {
      const newStatus = auction.chat_status === 'closed' ? 'active' : 'closed';
      const { error } = await supabase
        .from('auctions')
        .update({ chat_status: newStatus })
        .eq('id', auction.id);

      if (error) throw error;
      showAlert(newStatus === 'active' ? 'تم فتح الشات' : 'تم إغلاق الشات');
    } catch (error) {
      console.error('Error toggling chat:', error);
      showAlert('حدث خطأ');
    }
  };

  const handleMarkAsSold = async () => {
    try {
      const { error } = await supabase
        .from('auctions')
        .update({ status: 'sold' })
        .eq('id', auction.id);

      if (error) throw error;
      setShowSoldModal(false);
      showAlert('تم تحديث الحالة إلى مباع');
    } catch (error) {
      console.error('Error marking as sold:', error);
      showAlert('حدث خطأ');
    }
  };

  const handleMarkClosingSoon = async () => {
    try {
      const { error } = await supabase
        .from('auctions')
        .update({ status: 'closing_soon' })
        .eq('id', auction.id);

      if (error) throw error;
      showAlert('تم وضع علامة قريب الإغلاق');
    } catch (error) {
      console.error('Error marking closing soon:', error);
      showAlert('حدث خطأ');
    }
  };

  const handleExtendTime = async () => {
    if (!extendHours || isNaN(Number(extendHours)) || Number(extendHours) <= 0) {
      showAlert('الرجاء إدخال عدد ساعات صحيح');
      return;
    }

    try {
      const currentEnd = new Date(auction.ends_at);
      const newEnd = new Date(currentEnd.getTime() + Number(extendHours) * 60 * 60 * 1000);

      const { error } = await supabase
        .from('auctions')
        .update({ ends_at: newEnd.toISOString(), status: 'extended' })
        .eq('id', auction.id);

      if (error) throw error;
      setShowExtendModal(false);
      showAlert(`تم تمديد المزاد ${extendHours} ساعة`);
      setExtendHours('24');
    } catch (error) {
      console.error('Error extending time:', error);
      showAlert('حدث خطأ');
    }
  };

  const handleShareAuction = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    showAlert('تم نسخ الرابط');
  };

  const handleEditAuction = () => {
    setShowEditModal(true);
  };

  const handleAuctionSaved = async () => {
    const { data, error } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auction.id)
      .single();

    if (data && !error) {
      setAuction(data);
      showAlert('تم حفظ التعديلات بنجاح');
    }
    setShowEditModal(false);
  };

  const handleWhatsAppContact = () => {
    if (!auction.seller_phone) {
      alert('رقم البائع غير متوفر');
      return;
    }

    const auctionUrl = window.location.href;
    const message = `مرحباً، أنا من منصة الحراج بخصوص مزادك:\n\n${auction.title}\n\n${auctionUrl}`;

    let phoneNumber = auction.seller_phone.replace(/\D/g, '');
    if (phoneNumber.startsWith('0')) {
      phoneNumber = '966' + phoneNumber.substring(1);
    } else if (!phoneNumber.startsWith('966')) {
      phoneNumber = '966' + phoneNumber;
    }

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      alert('الرجاء تسجيل الدخول');
      return;
    }

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('auction_id', auction.id);

        if (error) throw error;
        setIsFavorite(false);
        showAlert('تمت الإزالة من المفضلة');
      } else {
        const { error } = await supabase
          .from('user_favorites')
          .insert({
            user_id: user.id,
            auction_id: auction.id
          });

        if (error) throw error;
        setIsFavorite(true);
        showAlert('تمت الإضافة للمفضلة');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showAlert('حدث خطأ');
    }
  };

  const handleRating = async (rating: number, comment: string) => {
    if (!user) {
      alert('الرجاء تسجيل الدخول');
      return;
    }

    try {
      const { error } = await supabase
        .from('seller_ratings')
        .insert({
          seller_id: auction.owner_id,
          rater_id: user.id,
          auction_id: auction.id,
          rating,
          comment: comment || null
        });

      if (error) throw error;
      showAlert('تم إرسال التقييم بنجاح');
    } catch (error) {
      console.error('Error submitting rating:', error);
      throw error;
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 md:flex md:items-start md:justify-center overflow-y-auto z-[90]"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {showNotification && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-6 py-3 rounded-lg shadow-lg z-[100] font-medium">
            {notificationMessage}
          </div>
        )}

        <div className="bg-white w-full min-h-screen md:max-w-4xl md:min-h-0 md:my-4 md:rounded-lg shadow-2xl pb-24" dir="rtl">
          <AuctionHeader
            title={auction.title}
            location={
              auction.city_id && getCityById(auction.city_id)
                ? `${getRegionById(auction.region_id!)?.name_ar} - ${getCityById(auction.city_id)?.name_ar}`
                : auction.region_id && getRegionById(auction.region_id)
                ? getRegionById(auction.region_id)?.name_ar
                : auction.location || undefined
            }
            startsAt={auction.starts_at}
            endsAt={auction.ends_at}
            status={auction.status}
            isExtended={auction.is_extended}
            viewsCount={auction.views_count || 0}
            biddersCount={auction.bidders_count || 0}
            lastActivityAt={auction.last_activity_at}
            aiConfidence={auction.ai_status_confidence}
            onClose={onClose}
            onShare={handleShareAuction}
          />

          <div className="p-6 space-y-6">
            {showClosingSoonAlert && (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-start gap-3 animate-pulse">
                <Clock className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-red-900 mb-1">⚠️ تنبيه: المزاد على وشك الإغلاق!</h4>
                  <p className="text-red-700 text-sm">باقي أقل من ساعة على انتهاء المزاد. سارع بالمزايدة الآن!</p>
                </div>
              </div>
            )}

            <AuctionImageGallery images={auction.images} title={auction.title} videoUrl={auction.video_url} />

            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-lg p-5 shadow-md">
              <div className="text-sm text-amber-700 mb-2 font-medium">السعر الحالي</div>
              <div className="text-4xl font-black text-amber-600 mb-1">
                {auction.current_price.toLocaleString('ar-SA')} ر.س
              </div>
              <div className="text-xs text-amber-600">
                السعر الأساسي: {auction.starting_price.toLocaleString('ar-SA')} ر.س
              </div>
            </div>

            {auction.description && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Package className="w-6 h-6 text-amber-600" />
                  الوصف والتفاصيل
                </h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {auction.description}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-xs text-blue-600 mb-1">الحالة</div>
                    <div className="font-bold text-blue-900">{auction.item_condition || 'جديد'}</div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="text-xs text-purple-600 mb-1">النوع</div>
                    <div className="font-bold text-purple-900">{auction.item_type || 'مزاد مباشر'}</div>
                  </div>
                  {auction.item_quantity && auction.item_quantity > 1 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="text-xs text-green-600 mb-1">الكمية</div>
                      <div className="font-bold text-green-900">{auction.item_quantity}</div>
                    </div>
                  )}
                  {auction.item_quality && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="text-xs text-orange-600 mb-1">الجودة</div>
                      <div className="font-bold text-orange-900">{auction.item_quality}</div>
                    </div>
                  )}
                </div>

                {auction.item_features && auction.item_features.length > 0 && (
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="text-sm font-bold text-yellow-900 mb-2">المميزات:</div>
                    <ul className="space-y-1">
                      {auction.item_features.map((feature, index) => (
                        <li key={index} className="text-sm text-yellow-800 flex items-start gap-2">
                          <span className="text-yellow-600 mt-1">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {isOwner && auction.status === 'active' && (
              <SellerTools
                auctionId={auction.id}
                chatStatus={auction.chat_status}
                onToggleChat={handleToggleChat}
                onExtend={() => setShowExtendModal(true)}
                onMarkSold={() => setShowSoldModal(true)}
                onShare={handleShareAuction}
                onMarkClosingSoon={handleMarkClosingSoon}
                onRepost={() => console.log('Repost auction')}
                onSmartAssist={() => console.log('Smart assist')}
                onViewAnalytics={() => console.log('View analytics')}
                onEdit={handleEditAuction}
              />
            )}

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-amber-600" />
                ساحة المزايدة
              </h3>

              {auction.chat_status === 'closed' && auction.status === 'active' ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                  <Lock className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                  <p className="text-yellow-800 font-medium">المزايدة مغلقة مؤقتاً</p>
                  <p className="text-yellow-600 text-sm mt-1">سيتم فتحها قريباً</p>
                </div>
              ) : auction.status !== 'active' ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <p className="text-gray-600 font-medium">المزاد منتهي</p>
                </div>
              ) : (
                <ChatBoxEnhanced
                  auctionId={auction.id}
                  currentPrice={auction.current_price}
                  isClosed={auction.chat_status === 'closed' || auction.status !== 'active'}
                  isOwner={isOwner}
                  ownerId={auction.owner_id}
                />
              )}
            </div>
          </div>
        </div>

        <AuctionFooter
          onClose={onClose}
          onToggleFavorite={handleToggleFavorite}
          onRate={() => setShowRatingModal(true)}
          onWhatsApp={handleWhatsAppContact}
          onShare={handleShareAuction}
          isFavorite={isFavorite}
        />
      </div>

      <Modal isOpen={showExtendModal} onClose={() => setShowExtendModal(false)} title="تمديد المزاد">
        <div className="space-y-4">
          <p className="text-gray-600">حدد عدد الساعات</p>
          <input
            type="number"
            min="1"
            max="720"
            value={extendHours}
            onChange={(e) => setExtendHours(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-right"
            dir="rtl"
          />
          <div className="flex gap-3">
            <button
              onClick={handleExtendTime}
              className="flex-1 bg-amber-500 text-white py-3 rounded-lg font-bold hover:bg-amber-600"
            >
              تمديد
            </button>
            <button
              onClick={() => setShowExtendModal(false)}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-300"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showSoldModal} onClose={() => setShowSoldModal(false)} title="تأكيد البيع">
        <div className="space-y-4">
          <p className="text-gray-600">هل أنت متأكد من أن المزاد تم بيعه؟</p>
          <div className="flex gap-3">
            <button
              onClick={handleMarkAsSold}
              className="flex-1 bg-green-500 text-white py-3 rounded-lg font-bold hover:bg-green-600"
            >
              نعم، تم البيع
            </button>
            <button
              onClick={() => setShowSoldModal(false)}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-300"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      {showEditModal && (
        <EditAuctionModal
          auction={auction}
          onClose={() => setShowEditModal(false)}
          onSaved={handleAuctionSaved}
        />
      )}

      <RatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleRating}
      />
    </>
  );
}
