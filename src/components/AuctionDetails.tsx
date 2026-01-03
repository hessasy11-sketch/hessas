import { useState, useEffect } from 'react';
import { X, MapPin, Clock, Share2, MessageCircle as WhatsApp, ChevronLeft, ChevronRight, Lock, Unlock, CheckCircle, Clock as ClockPlus, Users, TrendingUp, Bot, AlertCircle } from 'lucide-react';
import { CountdownTimer } from './CountdownTimer';
import { Modal } from './Modal';
import { ChatBox } from './ChatBox';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRegionsAndCities } from '../hooks/useRegionsAndCities';
import { AuctionToolsPanel } from './AuctionToolsPanel';
import { AIAuctionAssistant } from './AIAuctionAssistant';
import { SmartSuggestionsPanel } from './SmartSuggestionsPanel';
import { AuctionAlertsPanel } from './AuctionAlertsPanel';
import { useSubscriptionAwareTools } from '../hooks/useSubscriptionAwareTools';
import { usePlanPermissions } from '../hooks/usePlanPermissions';
import { useActivityLog } from '../hooks/useActivityLog';
import { ActivityLogPanel } from './ActivityLogPanel';
import { PlanAwareBanner, GoldAIWelcomeBanner } from './PlanAwareBanner';
import { EditAuctionModal } from './EditAuctionModal';
import type { Database } from '../lib/database.types';

type Auction = Database['public']['Tables']['auctions']['Row'];

interface AuctionDetailsProps {
  auction: Auction;
  onClose: () => void;
}

export function AuctionDetails({ auction: initialAuction, onClose }: AuctionDetailsProps) {
  const { user } = useAuth();
  const { getRegionById, getCityById } = useRegionsAndCities();
  const [auction, setAuction] = useState(initialAuction);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendHours, setExtendHours] = useState('24');
  const [showSoldModal, setShowSoldModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const isOwner = user?.id === auction.owner_id;
  const { effectiveTools, restrictedTools, warningMessage, checkToolAccess, currentPlanType } = useSubscriptionAwareTools(user?.id);
  const { validateToolUsage, getMaxExtendHours, canUseAI } = usePlanPermissions(user?.id);
  const {
    logCloseAuction,
    logExtendAuction,
    logMarkSold,
    logShareAuction,
    logRepublishAuction,
    logClosingAlert
  } = useActivityLog(auction.id);

  const engagementLevel: 'low' | 'medium' | 'high' = 'high';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
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

      await logCloseAuction(newStatus);

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

      await logMarkSold();

      setShowSoldModal(false);
      showAlert('تم تحديث الحالة إلى مباع');
    } catch (error) {
      console.error('Error marking as sold:', error);
      showAlert('حدث خطأ');
    }
  };

  const handleExtendTime = async () => {
    if (!extendHours || isNaN(Number(extendHours)) || Number(extendHours) <= 0) {
      showAlert('الرجاء إدخال عدد ساعات صحيح');
      return;
    }

    const maxHours = getMaxExtendHours();
    if (Number(extendHours) > maxHours) {
      showAlert(`الحد الأقصى للتمديد في باقتك هو ${maxHours} ساعة`);
      return;
    }

    const validation = await validateToolUsage('extend_auction');
    if (!validation.allowed) {
      showAlert(validation.reason || 'التمديد غير متاح');
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

      await logExtendAuction(
        Number(extendHours),
        newEnd.toISOString(),
        currentEnd.toISOString()
      );

      setShowExtendModal(false);
      showAlert(`تم تمديد المزاد ${extendHours} ساعة`);
      setExtendHours('24');
    } catch (error) {
      console.error('Error extending time:', error);
      showAlert('حدث خطأ');
    }
  };

  const handleShareAuction = async () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);

    await logShareAuction('link');

    showAlert('تم نسخ الرابط');
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

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 md:flex md:items-start md:justify-center overflow-y-auto z-[90]"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {showNotification && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-6 py-3 rounded-lg shadow-lg z-[100]">
            {notificationMessage}
          </div>
        )}

        <div className="bg-white w-full min-h-screen md:max-w-4xl md:min-h-0 md:my-4 md:rounded-lg shadow-2xl" dir="rtl">
          <div
            className="sticky top-0 p-4 flex justify-between items-center z-50 md:rounded-t-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.95) 0%, rgba(245, 158, 11, 0.95) 50%, rgba(251, 191, 36, 0.95) 100%)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.15)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <h2 className="text-xl font-bold text-white">تفاصيل المزاد</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/20"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video">
              {auction.images.length > 0 ? (
                <>
                  <img
                    src={auction.images[currentImageIndex]}
                    alt={auction.title}
                    className="w-full h-full object-cover"
                  />

                  {auction.images.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? auction.images.length - 1 : prev - 1))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-800" />
                      </button>

                      <button
                        onClick={() => setCurrentImageIndex((prev) => (prev === auction.images.length - 1 ? 0 : prev + 1))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-800" />
                      </button>

                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-white text-sm">
                        {currentImageIndex + 1} / {auction.images.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-8xl">📷</div>
                </div>
              )}
            </div>

            {auction.images.length > 1 && (
              <div className="grid grid-cols-6 gap-2">
                {auction.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative aspect-square rounded overflow-hidden ${
                      index === currentImageIndex
                        ? 'ring-2 ring-amber-500'
                        : 'ring-1 ring-gray-200 hover:ring-gray-300'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`صورة ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{auction.title}</h1>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                {(auction.region_id || auction.city_id) && (
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                    <MapPin className="w-4 h-4 text-amber-600" />
                    <span className="font-medium">
                      {auction.city_id && getCityById(auction.city_id) ? (
                        <span>
                          {getRegionById(auction.region_id!)?.name_ar} - {getCityById(auction.city_id)?.name_ar}
                        </span>
                      ) : auction.region_id && getRegionById(auction.region_id) ? (
                        <span>{getRegionById(auction.region_id)?.name_ar}</span>
                      ) : (
                        <span>{auction.location || 'غير محدد'}</span>
                      )}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <CountdownTimer endsAt={auction.ends_at} />
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-lg p-4 shadow-md">
                <div className="text-sm text-amber-700 mb-1 font-medium">السعر الحالي</div>
                <div className="text-3xl font-black text-amber-600">
                  {auction.current_price.toLocaleString('ar-SA')} ر.س
                </div>
              </div>
            </div>

            {auction.description && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">الوصف</h3>
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {auction.description}
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-amber-600" />
                  ساحة المزايدة
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>مباشر</span>
                </div>
              </div>

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
                <ChatBox
                  auctionId={auction.id}
                  currentPrice={auction.current_price}
                  isClosed={auction.chat_status === 'closed' || auction.status !== 'active'}
                />
              )}
            </div>

            {isOwner && auction.status === 'active' && (
              <div className="space-y-4">
                {warningMessage && (
                  <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-orange-800 font-medium">{warningMessage}</p>
                  </div>
                )}

                {currentPlanType === 'gold' && (
                  <GoldAIWelcomeBanner />
                )}

                {(currentPlanType === 'free' || currentPlanType === 'silver') && (
                  <PlanAwareBanner
                    currentPlanType={currentPlanType}
                    onUpgradeClick={() => console.log('Upgrade clicked - to be implemented')}
                  />
                )}

                <SmartSuggestionsPanel
                  auctionId={auction.id}
                  currentPlanType={currentPlanType}
                  engagementLevel={engagementLevel}
                  onUpgradeClick={() => console.log('Upgrade clicked - to be implemented')}
                />

                <AuctionAlertsPanel
                  auctionId={auction.id}
                  userId={user?.id}
                />

                <ActivityLogPanel
                  auctionId={auction.id}
                  isOwner={isOwner}
                />

                <AuctionToolsPanel
                  availableTools={effectiveTools}
                  lockedTools={restrictedTools}
                  currentPlanType={currentPlanType}
                  onToolClick={async (tool) => {
                    const validation = await validateToolUsage(tool.tool_key);

                    if (!validation.allowed) {
                      showNotificationMessage(validation.reason || 'غير متاح');
                      return;
                    }

                    switch (tool.tool_key) {
                      case 'close_auction':
                        handleToggleChat();
                        break;
                      case 'mark_sold':
                        setShowSoldModal(true);
                        break;
                      case 'share_auction':
                        handleShareAuction();
                        break;
                      case 'republish':
                        await logRepublishAuction();
                        showNotificationMessage('تمت إعادة نشر المزاد');
                        break;
                      case 'closing_alert':
                        await logClosingAlert(2);
                        showNotificationMessage('تم إرسال إعلان قرب الانتهاء');
                        break;
                      case 'extend_auction':
                        const maxHours = getMaxExtendHours();
                        if (maxHours > 0) {
                          setExtendHours(Math.min(24, maxHours).toString());
                          setShowExtendModal(true);
                        } else {
                          showNotificationMessage('التمديد غير متاح في باقتك');
                        }
                        break;
                      case 'smart_assistant':
                        if (canUseAI()) {
                          setShowAIAssistant(true);
                        } else {
                          showNotificationMessage('المساعد الذكي متاح في الباقة الذهبية فقط');
                        }
                        break;
                      case 'edit_auction':
                        setShowEditModal(true);
                        break;
                      default:
                        showNotificationMessage('هذه الأداة قيد التطوير');
                    }
                  }}
                  onUpgradeClick={() => console.log('Upgrade clicked - to be implemented')}
                />
              </div>
            )}

          </div>

          <div className="h-24"></div>
        </div>

        <div className="sticky bottom-0 bg-amber-50/95 backdrop-blur-sm border-t border-amber-200 p-4 shadow-lg">
          <div className="max-w-4xl mx-auto grid grid-cols-2 gap-3">
            <button
              onClick={handleShareAuction}
              className="bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
            >
              <Share2 className="w-5 h-5" />
              مشاركة
            </button>
            <button
              onClick={handleWhatsAppContact}
              className="bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
            >
              <WhatsApp className="w-5 h-5" />
              واتساب
            </button>
          </div>
        </div>
      </div>

      <Modal isOpen={showExtendModal} onClose={() => setShowExtendModal(false)} title="تمديد المزاد">
        <div className="space-y-4">
          <p className="text-gray-600">حدد عدد الساعات</p>
          {getMaxExtendHours() > 0 && (
            <p className="text-sm text-blue-600">
              الحد الأقصى: {getMaxExtendHours()} ساعة
            </p>
          )}
          <input
            type="number"
            min="1"
            max={getMaxExtendHours()}
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

      <AIAuctionAssistant
        isOpen={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        auctionId={auction.id}
        auctionTitle={auction.title}
        currentPlanType={currentPlanType}
        onUpgradeClick={() => {
          setShowAIAssistant(false);
          console.log('Upgrade clicked - to be implemented');
        }}
      />


      {showEditModal && (
        <EditAuctionModal
          auction={auction}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            showNotificationMessage('تم حفظ التعديلات بنجاح! ✅');
          }}
        />
      )}
    </>
  );
}
