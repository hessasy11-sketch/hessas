import { useState } from 'react';
import { ArrowRight, TreePine, Hash, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useInvestorAuth } from '../../contexts/InvestorAuthContext';
import { UnifiedRegistrationModal } from './UnifiedRegistrationModal';

interface OpportunityDetails {
  id: string;
  farm_id: string;
  title: string;
  tree_type: string;
  custom_tree_type: string | null;
  price_per_tree: number;
  min_trees: number;
  max_trees: number | null;
  available_trees: number;
  contract_duration_years: number;
}

interface TreeBookingPageProps {
  opportunity: OpportunityDetails;
  onBack: () => void;
  onSuccess: () => void;
}

type Step = 'booking' | 'register' | 'success';

export function TreeBookingPage({ opportunity, onBack, onSuccess }: TreeBookingPageProps) {
  const { user, account } = useInvestorAuth();
  const [step, setStep] = useState<Step>('booking');

  const [bookingData, setBookingData] = useState({
    numberOfTrees: opportunity.min_trees,
    guestName: '',
    guestPhone: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingBookingData, setPendingBookingData] = useState<any>(null);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (bookingData.numberOfTrees < opportunity.min_trees) {
        throw new Error(`الحد الأدنى للحجز هو ${opportunity.min_trees} أشجار`);
      }

      if (opportunity.max_trees && bookingData.numberOfTrees > opportunity.max_trees) {
        throw new Error(`الحد الأقصى للحجز هو ${opportunity.max_trees} أشجار`);
      }

      if (!user) {
        if (!bookingData.guestName.trim()) {
          throw new Error('الرجاء إدخال اسمك');
        }
        if (!bookingData.guestPhone.trim()) {
          throw new Error('الرجاء إدخال رقم جوالك');
        }

        const phoneNumber = bookingData.guestPhone.startsWith('+966')
          ? bookingData.guestPhone
          : `+966${bookingData.guestPhone.replace(/^0+/, '')}`;

        if (!/^\+966\d{9}$/.test(phoneNumber)) {
          throw new Error('رقم الجوال غير صحيح');
        }

        const { data: existingAccount, error: checkError } = await supabase
          .from('b2f_investor_accounts')
          .select('id, contact_phone')
          .eq('contact_phone', phoneNumber)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking existing account:', checkError);
        }

        if (existingAccount) {
          throw new Error('هذا الرقم مسجل مسبقاً. الرجاء تسجيل الدخول للمتابعة');
        }

        const treeTypeName = opportunity.custom_tree_type || opportunity.tree_type;

        setPendingBookingData({
          farm_id: opportunity.farm_id,
          opportunity_id: opportunity.id,
          investor_name: bookingData.guestName,
          investor_phone: phoneNumber,
          tree_type: treeTypeName,
          number_of_trees: bookingData.numberOfTrees,
          price_per_tree: opportunity.price_per_tree,
          total_amount: bookingData.numberOfTrees * opportunity.price_per_tree,
          status: 'collection_queue'
        });

        setStep('register');
      } else {
        const treeTypeName = opportunity.custom_tree_type || opportunity.tree_type;
        const investorPhone = account?.contact_phone || user.phone || '';

        const { error: insertError } = await supabase
          .from('b2f_sales_requests')
          .insert({
            farm_id: opportunity.farm_id,
            opportunity_id: opportunity.id,
            investor_account_id: account?.id || null,
            investor_name: account?.contact_name || 'مستثمر',
            investor_phone: investorPhone,
            investor_email: account?.contact_email || null,
            tree_type: treeTypeName,
            number_of_trees: bookingData.numberOfTrees,
            price_per_tree: opportunity.price_per_tree,
            total_amount: bookingData.numberOfTrees * opportunity.price_per_tree,
            status: 'collection_queue'
          });

        if (insertError) throw insertError;

        setStep('success');
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err: any) {
      console.error('Booking error:', err);
      setError(err.message || 'حدث خطأ في الحجز');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrationSuccess = async () => {
    console.log('Registration success callback triggered');

    try {
      if (pendingBookingData) {
        console.log('Creating booking request after successful registration...');

        const { error: insertError } = await supabase
          .from('b2f_sales_requests')
          .insert(pendingBookingData);

        if (insertError) {
          console.error('Error creating booking request:', insertError);
          throw insertError;
        }

        console.log('Booking request created successfully');
      }

      onSuccess();
    } catch (error) {
      console.error('Error in handleRegistrationSuccess:', error);
      setError('تم إنشاء حسابك بنجاح، لكن حدث خطأ في إنشاء الحجز. الرجاء المحاولة مرة أخرى.');
      setStep('booking');
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">تم الحجز بنجاح!</h3>
            <p className="text-gray-600 mb-6">
              تم حجز {bookingData.numberOfTrees} شجرة بنجاح. سيتم التواصل معك لإتمام الإجراءات.
            </p>
            <div className="bg-emerald-50 rounded-2xl p-4">
              <p className="text-sm text-emerald-900 font-semibold">
                يمكنك متابعة حجزك من خلال قسم "حسابي"
              </p>
            </div>
            <button
              onClick={onBack}
              className="mt-6 w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-3 rounded-xl transition-all"
            >
              العودة
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'register') {
    return (
      <UnifiedRegistrationModal
        isOpen={true}
        onClose={() => {
          console.log('Registration modal closed without completing');
          setPendingBookingData(null);
          setStep('booking');
          setError('تم إلغاء التسجيل. لم يتم إنشاء الحجز.');
        }}
        onSuccess={handleRegistrationSuccess}
        title="لإتمام الحجز"
        subtitle="سجل حسابك الآن للوصول إلى حجزك ومتابعته"
        context="booking"
        prefilledData={{
          fullName: bookingData.guestName,
          phone: bookingData.guestPhone
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50" dir="rtl">
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold transition-colors group"
        >
          <ArrowRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          العودة للتفاصيل
        </button>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom">
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-6">
            <h2 className="text-3xl font-black text-white mb-2">احجز الآن</h2>
            <p className="text-white/90">اختر عدد الأشجار وأدخل بياناتك</p>
          </div>

          <form onSubmit={handleBooking} className="p-6">
            {error && (
              <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-900 font-medium">{error}</p>
              </div>
            )}

            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-5 mb-6 border-2 border-emerald-100">
              <div className="flex items-start gap-3 mb-3">
                <TreePine className="w-7 h-7 text-emerald-600 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{opportunity.title}</h3>
                  <p className="text-gray-600">{opportunity.tree_type}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-emerald-200">
                <span className="text-gray-600">السعر للشجرة</span>
                <span className="text-xl font-black text-emerald-600">
                  {opportunity.price_per_tree.toLocaleString()} ريال
                </span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                عدد الأشجار
              </label>
              <div className="relative">
                <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={bookingData.numberOfTrees}
                  onChange={(e) => setBookingData({ ...bookingData, numberOfTrees: parseInt(e.target.value) || opportunity.min_trees })}
                  min={opportunity.min_trees}
                  max={opportunity.max_trees || undefined}
                  className="w-full pr-11 pl-4 py-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all outline-none text-lg font-bold"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                الحد الأدنى: {opportunity.min_trees} شجرة
                {opportunity.max_trees && ` • الحد الأقصى: ${opportunity.max_trees} شجرة`}
              </p>
            </div>

            {!user && (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    الاسم الكامل
                  </label>
                  <input
                    type="text"
                    value={bookingData.guestName}
                    onChange={(e) => setBookingData({ ...bookingData, guestName: e.target.value })}
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all outline-none"
                    placeholder="أدخل اسمك الكامل"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    رقم الجوال
                  </label>
                  <input
                    type="tel"
                    value={bookingData.guestPhone}
                    onChange={(e) => setBookingData({ ...bookingData, guestPhone: e.target.value })}
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all outline-none text-left"
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">مثال: 0512345678</p>
                </div>
              </>
            )}

            <div className="bg-gradient-to-br from-gray-50 to-emerald-50 rounded-2xl p-5 mb-6 border-2 border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-600">عدد الأشجار</span>
                <span className="font-bold text-gray-900 text-lg">{bookingData.numberOfTrees}</span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-600">السعر للشجرة</span>
                <span className="font-bold text-gray-900 text-lg">{opportunity.price_per_tree.toLocaleString()} ريال</span>
              </div>
              <div className="border-t-2 border-emerald-200 pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-lg">الإجمالي</span>
                  <span className="text-3xl font-black text-emerald-600">
                    {(bookingData.numberOfTrees * opportunity.price_per_tree).toLocaleString()} ريال
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black py-5 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {loading ? 'جاري الحجز...' : 'تأكيد الحجز'}
            </button>

            {!user && (
              <div className="mt-4 bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-900 leading-relaxed">
                  💡 بعد تأكيد الحجز، يمكنك إنشاء حساب لمتابعة حجزك بسهولة
                </p>
              </div>
            )}

            {user && (
              <div className="mt-4 bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-900 leading-relaxed">
                  سيتم التواصل معك لإتمام باقي الإجراءات بعد تأكيد الحجز
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
