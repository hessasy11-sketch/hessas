import { useState, useEffect } from 'react';
import { X, Upload, CheckCircle, Share2, Image as ImageIcon, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useUserSubscription } from '../hooks/useUserSubscription';
import { useRegionsAndCities } from '../hooks/useRegionsAndCities';
import type { Database } from '../lib/database.types';

type AuctionInsert = Database['public']['Tables']['auctions']['Insert'];
type Section = 'public' | 'platform';

interface AuctionFormProps {
  section: Section;
  categoryId?: string;
  auctionType?: 'request' | 'offer';
  groupId?: string;
  onSubmit: (auction: AuctionInsert) => Promise<void>;
  onCancel: () => void;
}

interface Category {
  id: string;
  name_ar: string;
  icon: string;
}

type FormStep = 'welcome' | 'form' | 'confirm' | 'success';

export function AuctionForm({ section, categoryId, auctionType, groupId, onSubmit, onCancel }: AuctionFormProps) {
  const { user } = useAuth();
  const { currentPlanType } = useUserSubscription(user?.id);
  const { regions, getCitiesByRegion } = useRegionsAndCities();
  const [step, setStep] = useState<FormStep>('welcome');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    category_id: categoryId || '',
    title: '',
    description: '',
    starting_price: '',
    region_id: '',
    city_id: '',
    location: '',
    duration_hours: '24',
    seller_phone: '',
  });

  const [confirmData, setConfirmData] = useState({
    full_name: '',
    official_phone: '',
    agreed: false,
  });

  const [userProfile, setUserProfile] = useState<{ display_name: string; phone_number: string } | null>(null);

  useEffect(() => {
    fetchCategories();
    if (user) {
      fetchUserProfile();
    }
  }, [section, auctionType, user]);

  async function fetchUserProfile() {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, phone_number')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }

  async function fetchCategories() {
    try {
      let query = supabase
        .from('categories')
        .select('id, name_ar, icon')
        .eq('section', section)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      query = query.is('sub_type', null);

      const { data } = await query;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (selectedImages.length + files.length > 10) {
      alert('يمكنك رفع 10 صور كحد أقصى');
      return;
    }

    setSelectedImages(prev => [...prev, ...files]);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.region_id) {
      alert('⚠️ يرجى اختيار المنطقة');
      return;
    }

    if (!formData.city_id) {
      alert('⚠️ يرجى اختيار المدينة');
      return;
    }

    setStep('confirm');
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmData.agreed) return;

    setLoading(true);
    try {
      let userId = user?.id;
      const isLoggedIn = !!user && !!userProfile;

      if (!userId) {
        const email = `${confirmData.official_phone.replace(/^0/, '966')}@temp.auction`;
        const password = 'temp123456';

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: confirmData.full_name,
              phone: confirmData.official_phone,
            }
          }
        });

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (signInError) {
              alert('حدث خطأ في تسجيل الدخول. يرجى المحاولة مرة أخرى');
              return;
            }
            userId = signInData.user?.id;
          } else {
            throw signUpError;
          }
        } else {
          userId = signUpData.user?.id;
        }
      }

      if (!userId) {
        alert('حدث خطأ في إنشاء الحساب');
        return;
      }

      if (!isLoggedIn) {
        const { error: ensureProfileError } = await supabase.rpc('ensure_profile_exists', {
          user_id: userId,
          phone: confirmData.official_phone,
          name: confirmData.full_name,
        });

        if (ensureProfileError) {
          console.error('Error ensuring profile:', ensureProfileError);
          alert('حدث خطأ في إنشاء الملف الشخصي');
          return;
        }
      }

      const now = new Date();
      const endsAt = new Date(now.getTime() + parseInt(formData.duration_hours) * 60 * 60 * 1000);

      const imageUrls: string[] = [];

      for (const file of selectedImages) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError, data } = await supabase.storage
          .from('auction-images')
          .upload(fileName, file);

        if (!uploadError && data) {
          const { data: urlData } = supabase.storage
            .from('auction-images')
            .getPublicUrl(fileName);
          imageUrls.push(urlData.publicUrl);
        }
      }

      const priorityScore = currentPlanType === 'gold' ? 100 : currentPlanType === 'silver' ? 50 : 0;
      const isFeatured = currentPlanType === 'gold';

      const auction: AuctionInsert = {
        owner_id: userId,
        title: formData.title,
        description: formData.description,
        category_id: formData.category_id || null,
        section,
        request_offer_type: null,
        group_id: groupId || null,
        starting_price: parseFloat(formData.starting_price),
        current_price: parseFloat(formData.starting_price),
        region_id: formData.region_id || null,
        city_id: formData.city_id || null,
        location: formData.location || null,
        seller_phone: formData.seller_phone,
        status: 'active',
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        images: imageUrls,
        seller_plan_type: currentPlanType,
        is_featured: isFeatured,
        priority_score: priorityScore,
      };

      await onSubmit(auction);
      setStep('success');
    } catch (error) {
      console.error('Error creating auction:', error);
      alert('حدث خطأ أثناء إنشاء المزاد');
    } finally {
      setLoading(false);
    }
  };

  const handleShareWhatsApp = () => {
    const message = `مرحباً 👋\n\nشاهد حصتي الجديدة في منصة حصص زراعية للاستثمار:\n${formData.title}\n\nالسعر الابتدائي: ${formData.starting_price} ر.س\n\n🔗 ${window.location.origin}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (step === 'welcome') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" dir="rtl">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl">
          <div className="text-6xl mb-4">🌿</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            مرحباً بك في حصص زراعية للاستثمار
          </h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            يمكنك الآن إضافة مزادك بخطوات سهلة وسريعة
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setStep('form')}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              ابدأ الآن
              <span className="text-xl">➜</span>
            </button>
            <button
              onClick={onCancel}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    const isLoggedIn = !!user && !!userProfile;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" dir="rtl">
        <div className="bg-white rounded-2xl max-w-lg w-full my-4 shadow-2xl">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 rounded-t-2xl">
            <h2 className="text-2xl font-bold text-white text-center">
              📱 تأكيد بيانات البائع
            </h2>
          </div>

          <form onSubmit={handleFinalSubmit} className="p-6 space-y-5">
            {isLoggedIn ? (
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 mb-3">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-bold">بيانات حسابك الرسمي</span>
                </div>

                <div className="bg-white rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🧍‍♂️</span>
                    <div>
                      <p className="text-xs text-gray-500">الاسم</p>
                      <p className="font-bold text-gray-900">{userProfile.display_name}</p>
                    </div>
                  </div>

                  <div className="h-px bg-gray-200"></div>

                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📱</span>
                    <div>
                      <p className="text-xs text-gray-500">رقم الجوال</p>
                      <p className="font-bold text-gray-900" dir="ltr">{userProfile.phone_number}</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-600 text-center mt-2">
                  ستُستخدم هذه البيانات من حسابك المسجل
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    🧍‍♂️ الاسم الكامل *
                  </label>
                  <input
                    type="text"
                    required
                    value={confirmData.full_name}
                    onChange={(e) => setConfirmData({ ...confirmData, full_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-right"
                    placeholder="أدخل اسمك الكامل"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    ☎️ رقم الجوال الرسمي *
                  </label>
                  <input
                    type="tel"
                    required
                    value={confirmData.official_phone}
                    onChange={(e) => setConfirmData({ ...confirmData, official_phone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-right"
                    placeholder="مثال: 0501234567"
                    dir="ltr"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    سيُستخدم لإنشاء حسابك وإرسال رمز التحقق عبر واتساب
                  </p>
                </div>
              </>
            )}

            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmData.agreed}
                  onChange={(e) => setConfirmData({ ...confirmData, agreed: e.target.checked })}
                  className="mt-1 w-5 h-5 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <span className="text-sm text-gray-900 leading-relaxed">
                  أتعهد وأقسم بالله أن أدفع عمولة قدرها <strong>(1%)</strong> من قيمة البيع عند نجاح المزاد، وهي في الذمة حتى يتم البيع بإذن الله.
                </span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading || !confirmData.agreed}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-4 rounded-xl font-bold hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                {loading ? 'جاري النشر...' : '🟩 موافق ونشر المزاد الآن'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setStep('form')}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all"
            >
              رجوع
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" dir="rtl">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            ✅ تم نشر المزاد بنجاح
          </h2>
          <p className="text-gray-600 mb-6">
            يمكنك الآن متابعة مزادك أو مشاركته عبر واتساب
          </p>
          <div className="space-y-3">
            <button
              onClick={onCancel}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-4 rounded-xl font-bold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg"
            >
              عرض مزادي الآن
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center gap-2"
            >
              <Share2 className="w-5 h-5" />
              مشاركة عبر واتساب
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 md:p-6 flex justify-between items-center z-10 rounded-t-2xl">
          <h2 className="text-xl md:text-2xl font-bold text-white">إضافة مزاد جديد</h2>
          <button
            onClick={onCancel}
            className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-4 md:p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              🌿 القسم الفرعي *
            </label>
            <select
              required
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-right bg-white"
            >
              <option value="">اختر القسم الفرعي</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name_ar}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              🏷️ عنوان المزاد *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-right"
              placeholder="مثال: بيع نخيل سكري مثمر – مزاد مباشر"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              📝 وصف المزاد *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-right resize-none"
              placeholder="وضح تفاصيل السلعة، الموقع، الحالة..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              💰 السعر الابتدائي (ريال) *
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.starting_price}
              onChange={(e) => setFormData({ ...formData, starting_price: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-right"
              placeholder="أدخل سعر البداية"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              🕓 مدة المزاد *
            </label>
            <select
              value={formData.duration_hours}
              onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-right bg-white"
            >
              <option value="12">12 ساعة</option>
              <option value="24">24 ساعة</option>
              <option value="48">48 ساعة</option>
              <option value="72">72 ساعة</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                <MapPin className="inline w-4 h-4 ml-1" />
                المنطقة *
              </label>
              <select
                required
                value={formData.region_id}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    region_id: e.target.value,
                    city_id: ''
                  });
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-right"
              >
                <option value="">اختر المنطقة</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name_ar}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                <MapPin className="inline w-4 h-4 ml-1" />
                المدينة *
              </label>
              <select
                required
                value={formData.city_id}
                onChange={(e) => setFormData({ ...formData, city_id: e.target.value })}
                disabled={!formData.region_id}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-right disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">اختر المدينة</option>
                {formData.region_id && getCitiesByRegion(formData.region_id).map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name_ar}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              📞 رقم الجوال (واتساب) *
            </label>
            <input
              type="tel"
              required
              value={formData.seller_phone}
              onChange={(e) => setFormData({ ...formData, seller_phone: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-right"
              placeholder="مثال: 0501234567"
              dir="ltr"
            />
            <p className="text-xs text-gray-500 mt-1">
              سيُستخدم هذا الرقم في زر واتساب الخاص بالمزاد
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              📸 إضافة الصور (حتى 10 صور)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-emerald-500 transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
                id="image-upload"
                disabled={selectedImages.length >= 10}
              />
              <label
                htmlFor="image-upload"
                className={`flex flex-col items-center justify-center cursor-pointer ${
                  selectedImages.length >= 10 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Upload className="w-12 h-12 text-emerald-600 mb-2" />
                <p className="text-sm font-medium text-gray-900 mb-1">
                  اضغط لاختيار الصور
                </p>
                <p className="text-xs text-gray-500">
                  {selectedImages.length} / 10 صور محملة
                </p>
              </label>
            </div>

            {imagePreviewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {imagePreviewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {index === 0 && (
                      <div className="absolute bottom-1 left-1 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded">
                        الغلاف
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-4 rounded-xl font-bold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg"
            >
              أنشر المزاد الآن
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-100 text-gray-700 px-6 py-4 rounded-xl font-medium hover:bg-gray-200 transition-all"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
