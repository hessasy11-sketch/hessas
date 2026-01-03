import { useState, useEffect } from 'react';
import { ArrowRight, User, DollarSign, Clock, CheckCircle, XCircle, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { PurchaseOffer } from '../hooks/useMyRequests';

interface OffersViewProps {
  requestId: string;
  requestTitle: string;
  onBack: () => void;
  onOfferAccepted?: () => void;
}

export function OffersView({ requestId, requestTitle, onBack, onOfferAccepted }: OffersViewProps) {
  const { user } = useAuth();
  const [offers, setOffers] = useState<PurchaseOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingOfferId, setProcessingOfferId] = useState<string | null>(null);

  useEffect(() => {
    fetchOffers();
  }, [requestId]);

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
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

      if (error) throw error;

      const formatted = data?.map((offer: any) => ({
        ...offer,
        supplier: offer.profiles
      })) || [];

      setOffers(formatted);
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async (offerId: string, offerPrice: number) => {
    if (!user) return;

    setProcessingOfferId(offerId);

    try {
      await supabase.from('purchase_offers').update({ status: 'accepted' }).eq('id', offerId);

      await supabase.from('user_purchase_requests').update({ status: 'under_review' }).eq('id', requestId);

      const commission = offerPrice * 0.01;

      const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (wallet) {
        await supabase.from('commissions').insert({
          user_id: user.id,
          amount: commission,
          percentage: 1.0,
          status: 'pending'
        });

        await supabase.from('wallets').update({
          pending_commissions: supabase.rpc('increment', { x: commission })
        }).eq('user_id', user.id);
      }

      await supabase.from('user_activities').insert({
        user_id: user.id,
        activity_type: 'offer_accepted',
        activity_description: `قبل عرضاً على "${requestTitle}" بقيمة ${offerPrice.toLocaleString('ar-SA')} ريال`,
        reference_id: requestId
      });

      await fetchOffers();
      onOfferAccepted?.();
    } catch (error) {
      console.error('Error accepting offer:', error);
      alert('حدث خطأ أثناء قبول العرض');
    } finally {
      setProcessingOfferId(null);
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    setProcessingOfferId(offerId);

    try {
      await supabase.from('purchase_offers').update({ status: 'rejected' }).eq('id', offerId);

      await fetchOffers();
    } catch (error) {
      console.error('Error rejecting offer:', error);
      alert('حدث خطأ أثناء رفض العرض');
    } finally {
      setProcessingOfferId(null);
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">جاري تحميل العروض...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50" dir="rtl">
      <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 flex items-center gap-3 shadow-lg sticky top-0 z-10">
        <button
          onClick={onBack}
          className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">العروض المقدمة</h2>
          <p className="text-sm text-white/80 mt-1 line-clamp-1">{requestTitle}</p>
        </div>
        <div className="bg-white/20 px-4 py-2 rounded-full">
          <span className="text-white font-bold text-lg">{offers.length}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4 pb-20">
        {offers.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg border-2 border-gray-100">
            <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium text-lg">لم يتم تقديم عروض بعد</p>
            <p className="text-sm text-gray-400 mt-2">سيتم إشعارك عندما يقدم الموردون عروضهم</p>
          </div>
        ) : (
          offers.map((offer) => {
            const isProcessing = processingOfferId === offer.id;
            const statusConfig = {
              pending: { label: 'معلق', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
              accepted: { label: 'مقبول', color: 'bg-green-100 text-green-700', icon: CheckCircle },
              rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-700', icon: XCircle }
            };

            const status = statusConfig[offer.status as keyof typeof statusConfig];
            const StatusIcon = status.icon;

            return (
              <div
                key={offer.id}
                className="bg-white border-2 border-gray-100 hover:border-green-200 rounded-2xl overflow-hidden transition-all shadow-lg"
              >
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b-2 border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">
                          {offer.supplier?.display_name || 'مورد'}
                        </h3>
                        {offer.supplier?.phone && (
                          <p className="text-sm text-gray-600">{offer.supplier.phone}</p>
                        )}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-green-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-green-600 mb-2">
                        <DollarSign className="w-5 h-5" />
                        <span className="text-sm font-bold">السعر المعروض</span>
                      </div>
                      <p className="text-2xl font-bold text-green-700">
                        {formatCurrency(Number(offer.price))} ريال
                      </p>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-blue-600 mb-2">
                        <Clock className="w-5 h-5" />
                        <span className="text-sm font-bold">مدة التسليم</span>
                      </div>
                      <p className="text-xl font-bold text-blue-700">
                        {offer.delivery_time || 'غير محدد'}
                      </p>
                    </div>
                  </div>

                  {offer.notes && (
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                      <h4 className="font-bold text-gray-700 mb-2 text-sm">ملاحظات المورد:</h4>
                      <p className="text-gray-600 text-sm leading-relaxed">{offer.notes}</p>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mb-4">
                    تاريخ العرض: {formatDate(offer.created_at)}
                  </div>

                  {offer.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptOffer(offer.id, Number(offer.price))}
                        disabled={isProcessing}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            جاري القبول...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            قبول العرض
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleRejectOffer(offer.id)}
                        disabled={isProcessing}
                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-red-700 border-t-transparent rounded-full animate-spin" />
                            جاري الرفض...
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5" />
                            رفض العرض
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {offer.status === 'accepted' && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-green-700 font-bold">تم قبول هذا العرض</p>
                      <p className="text-sm text-green-600 mt-1">سيتم التواصل معك قريباً</p>
                    </div>
                  )}

                  {offer.status === 'rejected' && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-center">
                      <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                      <p className="text-red-700 font-bold">تم رفض هذا العرض</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
