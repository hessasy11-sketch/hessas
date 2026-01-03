import { useState, useEffect } from 'react';
import { X, Save, Sparkles, Crown, Image as ImageIcon, Upload, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useUserSubscription } from '../hooks/useUserSubscription';

interface Auction {
  id: string;
  title: string;
  description: string;
  starting_price: number;
  location: string;
  category_id: string;
  start_time: string;
  end_time: string;
  status: string;
  images: string[];
  section: string;
  current_bid?: number;
  bid_count?: number;
}

interface Category {
  id: string;
  name_ar: string;
}

interface EditAuctionModalProps {
  auction: Auction;
  onClose: () => void;
  onSaved: () => void;
}

export function EditAuctionModal({ auction, onClose, onSaved }: EditAuctionModalProps) {
  const { user } = useAuth();
  const { currentPlanType } = useUserSubscription(user?.id);

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showAiAssistant, setShowAiAssistant] = useState(false);

  const isFree = currentPlanType === 'free';
  const isSilver = currentPlanType === 'silver';
  const isGold = currentPlanType === 'gold';
  const isSilverOrHigher = isSilver || isGold;

  const isAuctionEnded = new Date(auction.end_time) < new Date();
  const isAuctionClosed = auction.status === 'closed';
  const isAuctionSold = auction.status === 'sold';

  const canEdit = !isAuctionEnded && !isAuctionClosed && !isAuctionSold;

  const [formData, setFormData] = useState({
    title: auction.title,
    description: auction.description,
    starting_price: auction.starting_price,
    location: auction.location,
    category_id: auction.category_id,
    start_time: auction.start_time,
    end_time: auction.end_time,
  });

  const [existingImages, setExistingImages] = useState<string[]>(auction.images || []);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    loadCategories();
    if (isGold) {
      generateAiSuggestions();
    }
  }, [auction.section]);

  const loadCategories = async () => {
    try {
      const { data } = await supabase
        .from('categories')
        .select('id, name_ar')
        .eq('section', auction.section)
        .eq('is_active', true)
        .order('sort_order');

      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const generateAiSuggestions = async () => {
    const suggestions = [
      `يمكنك تحسين العنوان ليكون أكثر جذباً: "${auction.title} - فرصة مميزة!"`,
      'أضف تفاصيل أكثر عن حالة المنتج في الوصف',
      'فكر في تعديل السعر بناءً على اهتمام المشترين',
      'الصور الإضافية من زوايا مختلفة تزيد فرص البيع بنسبة 40%',
    ];
    setAiSuggestions(suggestions);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + existingImages.length + newImages.length > 8) {
      alert('الحد الأقصى 8 صور للإعلان');
      return;
    }

    setNewImages((prev) => [...prev, ...files]);

    const previews = files.map((file) => URL.createObjectURL(file));
    setNewImagePreviews((prev) => [...prev, ...previews]);
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(newImagePreviews[index]);
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadNewImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const file of newImages) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${auction.id}/${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('auction-images')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Image upload error:', uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('auction-images')
        .getPublicUrl(filePath);

      uploadedUrls.push(urlData.publicUrl);
    }

    return uploadedUrls;
  };

  const handleSave = async () => {
    if (!canEdit) {
      alert('لا يمكن تعديل هذا المزاد');
      return;
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);

    try {
      const uploadedImageUrls = await uploadNewImages();
      const allImages = [...existingImages, ...uploadedImageUrls];

      const updateData: any = {
        title: formData.title,
        description: formData.description,
        starting_price: formData.starting_price,
        location: formData.location,
        images: allImages,
        updated_at: new Date().toISOString(),
      };

      if (isSilverOrHigher) {
        updateData.category_id = formData.category_id;
        updateData.start_time = formData.start_time;
        updateData.end_time = formData.end_time;
      }

      const { error: updateError } = await supabase
        .from('auctions')
        .update(updateData)
        .eq('id', auction.id);

      if (updateError) throw updateError;

      await supabase.from('auction_activity_logs').insert({
        auction_id: auction.id,
        user_id: user?.id,
        action: 'edit',
        details: {
          plan_type: currentPlanType,
          changed_fields: Object.keys(updateData),
          timestamp: new Date().toISOString(),
        },
      });

      alert('تم حفظ التعديلات بنجاح! ✅');
      onSaved();
      onClose();
    } catch (error) {
      console.error('Error saving auction:', error);
      alert('حدث خطأ أثناء حفظ التعديلات');
    } finally {
      setLoading(false);
    }
  };

  if (!canEdit) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">تعديل الإعلان</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="text-center py-8">
            <div className="text-6xl mb-4">⚠️</div>
            <h4 className="text-xl font-bold text-red-600 mb-2">التعديل غير متاح</h4>
            <p className="text-gray-600 mb-4">
              {isAuctionSold
                ? 'لا يمكن تعديل المزاد لأنه تم بيعه'
                : isAuctionClosed
                ? 'لا يمكن تعديل المزاد لأنه مغلق'
                : 'لا يمكن تعديل المزاد لأنه انتهى'}
            </p>
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-bold text-gray-900">تعديل الإعلان</h3>
            {isFree && (
              <span className="text-xs bg-gray-400 text-white px-3 py-1 rounded-full">مجاني</span>
            )}
            {isSilver && (
              <span className="text-xs bg-gradient-to-r from-blue-400 to-blue-600 text-white px-3 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                فضي
              </span>
            )}
            {isGold && (
              <span className="text-xs bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-3 py-1 rounded-full flex items-center gap-1">
                <Crown className="w-3 h-3" />
                ذهبي
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                العنوان *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="عنوان المزاد"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                الوصف *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="وصف تفصيلي للمزاد"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  السعر الابتدائي *
                </label>
                <input
                  type="number"
                  value={formData.starting_price}
                  onChange={(e) => setFormData({ ...formData, starting_price: Number(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  الموقع *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="المدينة"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                الصور (حد أقصى 8 صور)
              </label>

              <div className="grid grid-cols-4 gap-3 mb-3">
                {existingImages.map((url, index) => (
                  <div key={`existing-${index}`} className="relative group">
                    <img
                      src={url}
                      alt={`صورة ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeExistingImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {newImagePreviews.map((url, index) => (
                  <div key={`new-${index}`} className="relative group">
                    <img
                      src={url}
                      alt={`صورة جديدة ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border-2 border-green-400"
                    />
                    <button
                      onClick={() => removeNewImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {existingImages.length + newImages.length < 8 && (
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">إضافة صور</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {isSilverOrHigher && (
              <>
                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <h4 className="font-bold text-blue-700">إعدادات متقدمة (الباقة الفضية وما فوق)</h4>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        الفئة
                      </label>
                      <select
                        value={formData.category_id}
                        onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name_ar}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          وقت البدء
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.start_time.slice(0, 16)}
                          onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          وقت النهاية
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.end_time.slice(0, 16)}
                          onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {isGold && (
              <div className="border-t pt-6">
                <button
                  onClick={() => setShowAiAssistant(!showAiAssistant)}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-3 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all w-full justify-center font-bold"
                >
                  <Crown className="w-5 h-5" />
                  <span>{showAiAssistant ? 'إخفاء' : 'إظهار'} المساعد الذكي</span>
                </button>

                {showAiAssistant && (
                  <div className="mt-4 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4">
                    <h4 className="font-bold text-purple-700 mb-3 flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      اقتراحات ذكية لتحسين إعلانك
                    </h4>
                    <ul className="space-y-2">
                      {aiSuggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-purple-900">
                          <span className="text-purple-500 font-bold">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {isFree && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <strong>💡 نصيحة:</strong> ترقّ للباقة الفضية أو الذهبية لتتمكن من تعديل الفئة وأوقات المزاد والحصول على المساعد الذكي!
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-2xl flex gap-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-bold flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 font-bold"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
