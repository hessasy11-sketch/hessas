import { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Eye, EyeOff, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OpportunityCard {
  id: string;
  type: string;
  icon: string;
  badge: 'exclusive' | 'featured' | 'limited';
  price: number;
  duration: number;
  category: string;
  features: string[];
  is_active: boolean;
  display_order: number;
  offer_name?: string;
  region?: string;
  total_trees_available?: number;
  reserved_trees?: number;
  farm_features?: string[];
  price_note?: string;
}

interface OpportunityCardsManagementProps {
  onClose: () => void;
}

export function OpportunityCardsManagement({ onClose }: OpportunityCardsManagementProps) {
  const [cards, setCards] = useState<OpportunityCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState<OpportunityCard | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('investment_opportunity_cards')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      setCards(data.map(card => ({
        ...card,
        features: Array.isArray(card.features) ? card.features : [],
        farm_features: Array.isArray(card.farm_features) ? card.farm_features : []
      })) || []);
    } catch (error) {
      console.error('Error loading cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (cardId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('investment_opportunity_cards')
        .update({ is_active: !currentStatus })
        .eq('id', cardId);

      if (error) throw error;
      await loadCards();
    } catch (error) {
      console.error('Error toggling card status:', error);
    }
  };

  const handleDelete = async (cardId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه البطاقة؟')) return;

    try {
      const { error } = await supabase
        .from('investment_opportunity_cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;
      await loadCards();
    } catch (error) {
      console.error('Error deleting card:', error);
    }
  };

  const handleSave = async (card: Partial<OpportunityCard>) => {
    try {
      if (card.id) {
        const { error } = await supabase
          .from('investment_opportunity_cards')
          .update({
            type: card.type,
            icon: card.icon,
            badge: card.badge,
            price: card.price,
            duration: card.duration,
            category: card.category,
            features: card.features,
            display_order: card.display_order,
            offer_name: card.offer_name,
            region: card.region,
            total_trees_available: card.total_trees_available,
            reserved_trees: card.reserved_trees,
            farm_features: card.farm_features,
            price_note: card.price_note
          })
          .eq('id', card.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('investment_opportunity_cards')
          .insert({
            type: card.type,
            icon: card.icon,
            badge: card.badge,
            price: card.price,
            duration: card.duration,
            category: card.category,
            features: card.features,
            display_order: card.display_order || 0,
            is_active: true,
            offer_name: card.offer_name,
            region: card.region,
            total_trees_available: card.total_trees_available || 100,
            reserved_trees: card.reserved_trees || 0,
            farm_features: card.farm_features,
            price_note: card.price_note
          });

        if (error) throw error;
      }

      setEditingCard(null);
      setIsAddingNew(false);
      await loadCards();
    } catch (error) {
      console.error('Error saving card:', error);
    }
  };

  const CardEditor = ({ card }: { card: Partial<OpportunityCard> }) => {
    const [formData, setFormData] = useState<Partial<OpportunityCard>>(card);
    const [featuresText, setFeaturesText] = useState(
      card.features?.join('\n') || ''
    );
    const [farmFeaturesText, setFarmFeaturesText] = useState(
      card.farm_features?.join('\n') || ''
    );

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleSave({
        ...formData,
        features: featuresText.split('\n').filter(f => f.trim()),
        farm_features: farmFeaturesText.split('\n').filter(f => f.trim())
      });
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-6 flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">
              {card.id ? 'تعديل البطاقة' : 'إضافة بطاقة جديدة'}
            </h3>
            <button
              onClick={() => {
                setEditingCard(null);
                setIsAddingNew(false);
              }}
              className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  نوع الاستثمار
                </label>
                <input
                  type="text"
                  value={formData.type || ''}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  الأيقونة
                </label>
                <input
                  type="text"
                  value={formData.icon || ''}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none text-2xl"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                اسم العرض (اختياري)
              </label>
              <input
                type="text"
                value={formData.offer_name || ''}
                onChange={(e) => setFormData({ ...formData, offer_name: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                placeholder="مثال: عرض استثماري مميز"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  السعر (ريال)
                </label>
                <input
                  type="number"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                  required
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  المدة (سنوات)
                </label>
                <input
                  type="number"
                  value={formData.duration || ''}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                  required
                  min="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  التصنيف
                </label>
                <select
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                  required
                >
                  <option value="">اختر التصنيف</option>
                  <option value="palm">نخيل</option>
                  <option value="olive">زيتون</option>
                  <option value="mango">مانجو</option>
                  <option value="banana">موز</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  نوع الشارة
                </label>
                <select
                  value={formData.badge || ''}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value as any })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                  required
                >
                  <option value="">اختر الشارة</option>
                  <option value="exclusive">عرض حصري</option>
                  <option value="featured">موصى به</option>
                  <option value="limited">عرض محدود</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  المنطقة
                </label>
                <input
                  type="text"
                  value={formData.region || ''}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                  placeholder="المنطقة الوسطى"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  إجمالي الأشجار
                </label>
                <input
                  type="number"
                  value={formData.total_trees_available || 100}
                  onChange={(e) => setFormData({ ...formData, total_trees_available: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  الأشجار المحجوزة
                </label>
                <input
                  type="number"
                  value={formData.reserved_trees || 0}
                  onChange={(e) => setFormData({ ...formData, reserved_trees: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ترتيب العرض
              </label>
              <input
                type="number"
                value={formData.display_order || 0}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                توضيح السعر
              </label>
              <textarea
                value={formData.price_note || ''}
                onChange={(e) => setFormData({ ...formData, price_note: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                rows={2}
                placeholder="المبلغ يغطي كامل مدة العقد. لا توجد رسوم سنوية."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                المميزات الأساسية (كل ميزة في سطر منفصل)
              </label>
              <textarea
                value={featuresText}
                onChange={(e) => setFeaturesText(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                rows={4}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                مميزات المزرعة (كل ميزة في سطر منفصل)
              </label>
              <textarea
                value={farmFeaturesText}
                onChange={(e) => setFarmFeaturesText(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                rows={4}
                placeholder="نظام ري متطور&#10;إدارة احترافية&#10;تقارير شهرية"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                <span>حفظ التغييرات</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingCard(null);
                  setIsAddingNew(false);
                }}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[55] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">إدارة بطاقات الفرص الاستثمارية</h2>
            <p className="text-emerald-100 text-sm mt-1">
              تحكم في البطاقات المعروضة للمستثمرين
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <button
              onClick={() => {
                setIsAddingNew(true);
                setEditingCard({
                  type: '',
                  icon: '🌳',
                  badge: 'featured',
                  price: 0,
                  duration: 0,
                  category: '',
                  features: [],
                  is_active: true,
                  display_order: cards.length
                });
              }}
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>إضافة بطاقة جديدة</span>
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">جاري التحميل...</p>
              </div>
            </div>
          ) : cards.length === 0 ? (
            <div className="text-center py-20">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">لا توجد بطاقات حالياً</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className={`bg-white border-2 rounded-xl p-4 ${
                    card.is_active ? 'border-gray-200' : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{card.icon}</div>
                      <div>
                        <h3 className="font-bold text-gray-900">{card.type}</h3>
                        <p className="text-sm text-gray-600">
                          {card.price} ريال - {card.duration} سنوات
                        </p>
                      </div>
                    </div>
                    {!card.is_active && (
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                        غير نشط
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setEditingCard(card)}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>تعديل</span>
                    </button>
                    <button
                      onClick={() => handleToggleActive(card.id, card.is_active)}
                      className={`flex-1 ${
                        card.is_active
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                      } font-semibold py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2`}
                    >
                      {card.is_active ? (
                        <>
                          <EyeOff className="w-4 h-4" />
                          <span>إخفاء</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          <span>إظهار</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(card.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-2 px-3 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {(editingCard || isAddingNew) && editingCard && (
        <CardEditor card={editingCard} />
      )}
    </div>
  );
}
