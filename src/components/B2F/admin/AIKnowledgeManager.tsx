import { useState, useEffect } from 'react';
import { Brain, Plus, Edit2, Trash2, Save, X, TrendingUp, BookOpen, HelpCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface KnowledgeEntry {
  id: string;
  category: 'faq' | 'term' | 'process' | 'guidance';
  question: string;
  answer: string;
  keywords: string[];
  is_active: boolean;
  priority: number;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

interface FrequentQuestion {
  id: string;
  question_text: string;
  question_count: number;
  is_answered: boolean;
  last_asked_at: string;
}

export default function AIKnowledgeManager() {
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeEntry[]>([]);
  const [frequentQuestions, setFrequentQuestions] = useState<FrequentQuestion[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [activeTab, setActiveTab] = useState<'knowledge' | 'frequent'>('knowledge');
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    category: 'faq' as const,
    question: '',
    answer: '',
    keywords: '',
    priority: 5,
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: kb } = await supabase
        .from('b2f_ai_knowledge_base')
        .select('*')
        .order('priority', { ascending: false });

      const { data: fq } = await supabase
        .from('b2f_ai_frequent_questions')
        .select('*')
        .order('question_count', { ascending: false })
        .limit(20);

      if (kb) setKnowledgeBase(kb);
      if (fq) setFrequentQuestions(fq);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const keywordsArray = formData.keywords.split(',').map(k => k.trim()).filter(k => k);

      if (editingEntry) {
        await supabase
          .from('b2f_ai_knowledge_base')
          .update({
            category: formData.category,
            question: formData.question,
            answer: formData.answer,
            keywords: keywordsArray,
            priority: formData.priority,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingEntry.id);
      } else {
        await supabase.from('b2f_ai_knowledge_base').insert({
          category: formData.category,
          question: formData.question,
          answer: formData.answer,
          keywords: keywordsArray,
          priority: formData.priority,
          is_active: formData.is_active,
        });
      }

      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving:', error);
      alert('حدث خطأ أثناء الحفظ');
    }
  };

  const handleEdit = (entry: KnowledgeEntry) => {
    setEditingEntry(entry);
    setFormData({
      category: entry.category,
      question: entry.question,
      answer: entry.answer,
      keywords: entry.keywords.join(', '),
      priority: entry.priority,
      is_active: entry.is_active,
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإدخال؟')) return;

    try {
      await supabase.from('b2f_ai_knowledge_base').delete().eq('id', id);
      loadData();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      await supabase
        .from('b2f_ai_knowledge_base')
        .update({ is_active: !currentState })
        .eq('id', id);
      loadData();
    } catch (error) {
      console.error('Error toggling active:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      category: 'faq',
      question: '',
      answer: '',
      keywords: '',
      priority: 5,
      is_active: true,
    });
    setEditingEntry(null);
    setShowAddModal(false);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      faq: 'أسئلة شائعة',
      term: 'مصطلحات',
      process: 'عمليات',
      guidance: 'إرشادات',
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      faq: 'bg-blue-100 text-blue-700',
      term: 'bg-purple-100 text-purple-700',
      process: 'bg-orange-100 text-orange-700',
      guidance: 'bg-green-100 text-green-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">إدارة المساعد الذكي</h2>
              <p className="text-sm text-gray-600">قاعدة المعرفة والأسئلة المتكررة</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <Plus className="w-5 h-5" />
            إضافة معرفة جديدة
          </button>
        </div>

        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`px-6 py-3 font-medium transition ${
              activeTab === 'knowledge'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              قاعدة المعرفة ({knowledgeBase.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('frequent')}
            className={`px-6 py-3 font-medium transition ${
              activeTab === 'frequent'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              الأسئلة المتكررة ({frequentQuestions.length})
            </div>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : activeTab === 'knowledge' ? (
        <div className="grid gap-4">
          {knowledgeBase.map(entry => (
            <div
              key={entry.id}
              className={`bg-white rounded-lg border-2 p-4 transition ${
                entry.is_active ? 'border-gray-200' : 'border-red-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(entry.category)}`}>
                      {getCategoryLabel(entry.category)}
                    </span>
                    <span className="text-xs text-gray-500">أولوية: {entry.priority}</span>
                    <span className="text-xs text-gray-500">استخدم {entry.usage_count} مرة</span>
                  </div>
                  <h4 className="font-bold text-gray-800 mb-2">{entry.question}</h4>
                  <p className="text-sm text-gray-600 mb-2">{entry.answer}</p>
                  {entry.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {entry.keywords.map((keyword, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mr-4">
                  <button
                    onClick={() => toggleActive(entry.id, entry.is_active)}
                    className={`px-3 py-1 rounded text-xs font-medium transition ${
                      entry.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {entry.is_active ? 'نشط' : 'معطل'}
                  </button>
                  <button
                    onClick={() => handleEdit(entry)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {frequentQuestions.map(fq => (
            <div key={fq.id} className="bg-white rounded-lg border-2 border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800 mb-2">{fq.question_text}</h4>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>تكرر {fq.question_count} مرة</span>
                    <span>آخر مرة: {new Date(fq.last_asked_at).toLocaleDateString('ar-SA')}</span>
                    <span className={fq.is_answered ? 'text-green-600' : 'text-orange-600'}>
                      {fq.is_answered ? 'تم الإجابة' : 'يحتاج إجابة'}
                    </span>
                  </div>
                </div>
                <HelpCircle className="w-5 h-5 text-orange-500" />
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">
                {editingEntry ? 'تعديل المعرفة' : 'إضافة معرفة جديدة'}
              </h3>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">التصنيف</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="faq">أسئلة شائعة</option>
                  <option value="term">مصطلحات</option>
                  <option value="process">عمليات</option>
                  <option value="guidance">إرشادات</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">السؤال</label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={e => setFormData({ ...formData, question: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="مثال: كيف أحجز أشجار؟"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الإجابة</label>
                <textarea
                  value={formData.answer}
                  onChange={e => setFormData({ ...formData, answer: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="اكتب إجابة واضحة ومفصلة..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الكلمات المفتاحية (مفصولة بفواصل)
                </label>
                <input
                  type="text"
                  value={formData.keywords}
                  onChange={e => setFormData({ ...formData, keywords: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="حجز, أشجار, كيف"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الأولوية (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  نشط
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  <Save className="w-5 h-5" />
                  {editingEntry ? 'حفظ التعديلات' : 'إضافة'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
