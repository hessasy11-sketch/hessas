import { useState, useEffect } from 'react';
import { X, Shield, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface GatewayCard {
  id: string;
  card_key: string;
  title_ar: string;
  description_ar?: string;
  icon: string;
}

interface GrantAccessModalProps {
  staffId: string;
  staffName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function GrantAccessModal({
  staffId,
  staffName,
  onClose,
  onSuccess,
}: GrantAccessModalProps) {
  const [cards, setCards] = useState<GatewayCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [accessLevel, setAccessLevel] = useState('view');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gateway_cards')
        .select('id, card_key, title_ar, description_ar, icon')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setCards(data || []);
    } catch (err) {
      console.error('Error loading cards:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCard = (cardKey: string) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardKey)) {
        next.delete(cardKey);
      } else {
        next.add(cardKey);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedCards.size === 0) {
      alert('يرجى اختيار بطاقة واحدة على الأقل');
      return;
    }

    setSaving(true);
    try {
      const gmId = JSON.parse(localStorage.getItem('staff_session') || '{}').staffId;

      for (const cardKey of Array.from(selectedCards)) {
        const { error } = await supabase.rpc('grant_gateway_access', {
          p_user_id: staffId,
          p_card_key: cardKey,
          p_access_level: accessLevel,
          p_granted_by: gmId,
          p_valid_until: null,
          p_notes: `منح من المدير العام`
        });

        if (error) {
          console.error('Error granting access:', error);
          alert(`فشل في منح الصلاحية: ${error.message}`);
          return;
        }
      }

      alert(`تم منح ${selectedCards.size} صلاحية بنجاح!`);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error granting access:', err);
      alert('حدث خطأ أثناء منح الصلاحيات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">منح صلاحيات الوصول</h2>
                <p className="text-purple-100 text-sm mt-1">للموظف: {staffName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Access Level */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-3">
              مستوى الصلاحية
            </label>
            <div className="grid grid-cols-4 gap-3">
              {['view', 'operate', 'manage', 'full'].map((level) => (
                <button
                  key={level}
                  onClick={() => setAccessLevel(level)}
                  className={`px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                    accessLevel === level
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  {level === 'view' && 'عرض'}
                  {level === 'operate' && 'تشغيل'}
                  {level === 'manage' && 'إدارة'}
                  {level === 'full' && 'كامل'}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-3">
              البطاقات المتاحة ({selectedCards.size} محددة)
            </label>

            {loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-600">جاري تحميل البطاقات...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cards.map((card) => {
                  const isSelected = selectedCards.has(card.card_key);
                  return (
                    <button
                      key={card.id}
                      onClick={() => toggleCard(card.card_key)}
                      className={`w-full p-4 rounded-xl border-2 text-right transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900">{card.title_ar}</h3>
                            {isSelected && (
                              <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                          {card.description_ar && (
                            <p className="text-sm text-gray-600 mt-1">{card.description_ar}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl border-2 border-gray-300 font-bold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || selectedCards.size === 0}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'جاري الحفظ...' : `منح ${selectedCards.size} صلاحية`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
