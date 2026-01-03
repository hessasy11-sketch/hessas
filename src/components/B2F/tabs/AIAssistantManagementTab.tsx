import { useState, useEffect } from 'react';
import {
  Brain,
  MessageSquare,
  BookOpen,
  TrendingUp,
  Users,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  Upload,
  Sparkles,
  Target,
  BarChart3,
  Activity,
  Eye,
  MessageCircle,
  Lightbulb,
  BookMarked,
  GraduationCap,
  Zap
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface KnowledgeItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  priority: number;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

interface FrequentQuestion {
  id: string;
  question: string;
  answer: string;
  category: string;
  frequency: number;
  last_asked: string;
  is_active: boolean;
}

interface ConversationStats {
  total_conversations: number;
  active_today: number;
  total_messages: number;
  avg_satisfaction: number;
  resolved_rate: number;
}

interface LearningLog {
  id: string;
  conversation_id: string;
  learned_from: string;
  improvement_type: string;
  before_response: string;
  after_response: string;
  created_at: string;
}

export default function AIAssistantManagementTab() {
  const [activeSection, setActiveSection] = useState<'knowledge' | 'questions' | 'conversations' | 'learning' | 'analytics'>('knowledge');
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [frequentQuestions, setFrequentQuestions] = useState<FrequentQuestion[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [learningLogs, setLearningLogs] = useState<LearningLog[]>([]);
  const [stats, setStats] = useState<ConversationStats>({
    total_conversations: 0,
    active_today: 0,
    total_messages: 0,
    avg_satisfaction: 0,
    resolved_rate: 0
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    category: '',
    question: '',
    answer: '',
    keywords: '',
    priority: 5
  });

  const categories = [
    'عام',
    'الاستثمار',
    'التشغيل',
    'الصيانة',
    'الشهادات',
    'العقود',
    'الدفع',
    'الزيارات',
    'المواسم',
    'الإيصالات'
  ];

  useEffect(() => {
    loadData();
  }, [activeSection]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeSection === 'knowledge') {
        await loadKnowledgeBase();
      } else if (activeSection === 'questions') {
        await loadFrequentQuestions();
      } else if (activeSection === 'conversations') {
        await loadConversations();
      } else if (activeSection === 'learning') {
        await loadLearningLogs();
      } else if (activeSection === 'analytics') {
        await loadAnalytics();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadKnowledgeBase = async () => {
    const { data, error } = await supabase
      .from('b2f_ai_knowledge_base')
      .select('*')
      .order('priority', { ascending: false });

    if (!error && data) {
      setKnowledgeItems(data);
    }
  };

  const loadFrequentQuestions = async () => {
    const { data, error } = await supabase
      .from('b2f_ai_frequent_questions')
      .select('*')
      .order('frequency', { ascending: false })
      .limit(50);

    if (!error && data) {
      setFrequentQuestions(data);
    }
  };

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('b2f_ai_conversations')
      .select(`
        *,
        messages:b2f_ai_messages(count)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setConversations(data);
    }
  };

  const loadLearningLogs = async () => {
    const { data, error } = await supabase
      .from('b2f_ai_learning_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setLearningLogs(data);
    }
  };

  const loadAnalytics = async () => {
    const today = new Date().toISOString().split('T')[0];

    const { data: conversationsData } = await supabase
      .from('b2f_ai_conversations')
      .select('*');

    const { data: todayConversations } = await supabase
      .from('b2f_ai_conversations')
      .select('*')
      .gte('created_at', today);

    const { data: messagesData } = await supabase
      .from('b2f_ai_messages')
      .select('*');

    const { data: feedbackData } = await supabase
      .from('b2f_ai_feedback')
      .select('rating');

    const avgRating = feedbackData && feedbackData.length > 0
      ? feedbackData.reduce((sum, f) => sum + f.rating, 0) / feedbackData.length
      : 0;

    const resolvedCount = conversationsData?.filter(c => c.status === 'resolved').length || 0;
    const totalCount = conversationsData?.length || 1;

    setStats({
      total_conversations: conversationsData?.length || 0,
      active_today: todayConversations?.length || 0,
      total_messages: messagesData?.length || 0,
      avg_satisfaction: avgRating,
      resolved_rate: (resolvedCount / totalCount) * 100
    });
  };

  const handleAddKnowledge = async () => {
    if (!formData.question || !formData.answer) return;

    const keywords = formData.keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const { error } = await supabase
      .from('b2f_ai_knowledge_base')
      .insert({
        category: formData.category,
        question: formData.question,
        answer: formData.answer,
        keywords,
        priority: formData.priority,
        is_active: true,
        usage_count: 0
      });

    if (!error) {
      setShowAddModal(false);
      setFormData({ category: '', question: '', answer: '', keywords: '', priority: 5 });
      loadKnowledgeBase();
    }
  };

  const handleUpdateKnowledge = async () => {
    if (!editingItem) return;

    const keywords = formData.keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const { error } = await supabase
      .from('b2f_ai_knowledge_base')
      .update({
        category: formData.category,
        question: formData.question,
        answer: formData.answer,
        keywords,
        priority: formData.priority,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingItem.id);

    if (!error) {
      setEditingItem(null);
      setFormData({ category: '', question: '', answer: '', keywords: '', priority: 5 });
      loadKnowledgeBase();
    }
  };

  const handleDeleteKnowledge = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العنصر؟')) return;

    const { error } = await supabase
      .from('b2f_ai_knowledge_base')
      .delete()
      .eq('id', id);

    if (!error) {
      loadKnowledgeBase();
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('b2f_ai_knowledge_base')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (!error) {
      loadKnowledgeBase();
    }
  };

  const filteredKnowledge = knowledgeItems.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sections = [
    { id: 'knowledge', label: 'قاعدة المعرفة', icon: BookOpen, color: 'emerald' },
    { id: 'questions', label: 'الأسئلة الشائعة', icon: MessageSquare, color: 'blue' },
    { id: 'conversations', label: 'المحادثات', icon: MessageCircle, color: 'purple' },
    { id: 'learning', label: 'التعلم والتطور', icon: GraduationCap, color: 'orange' },
    { id: 'analytics', label: 'الإحصائيات', icon: BarChart3, color: 'pink' }
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">
              المساعد الذكي - لوحة الإدارة
            </h2>
            <p className="text-white/90 text-sm">
              إدارة قاعدة المعرفة، الأسئلة الشائعة، والتعلم الذاتي للمساعد الذكي
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl">
            <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
            <span className="text-white font-semibold">AI Powered</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <MessageCircle className="w-6 h-6 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">اليوم</span>
          </div>
          <div className="text-2xl font-bold mb-1">{stats.active_today}</div>
          <div className="text-xs opacity-90">محادثة نشطة</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-6 h-6 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">كلي</span>
          </div>
          <div className="text-2xl font-bold mb-1">{stats.total_conversations}</div>
          <div className="text-xs opacity-90">إجمالي المحادثات</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <MessageSquare className="w-6 h-6 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">رسائل</span>
          </div>
          <div className="text-2xl font-bold mb-1">{stats.total_messages}</div>
          <div className="text-xs opacity-90">إجمالي الرسائل</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <ThumbsUp className="w-6 h-6 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">تقييم</span>
          </div>
          <div className="text-2xl font-bold mb-1">{stats.avg_satisfaction.toFixed(1)}/5</div>
          <div className="text-xs opacity-90">متوسط الرضا</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-6 h-6 opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">حل</span>
          </div>
          <div className="text-2xl font-bold mb-1">{stats.resolved_rate.toFixed(0)}%</div>
          <div className="text-xs opacity-90">نسبة الحل</div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="bg-white rounded-xl shadow-lg p-2">
        <div className="flex flex-wrap gap-2">
          {sections.map(section => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? `bg-gradient-to-r from-${section.color}-500 to-${section.color}-600 text-white shadow-lg scale-105`
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-semibold">{section.label}</span>
                {isActive && (
                  <Sparkles className="w-4 h-4 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        {activeSection === 'knowledge' && (
          <div className="space-y-6">
            {/* Knowledge Base Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <BookOpen className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">قاعدة المعرفة</h3>
                  <p className="text-sm text-gray-500">إدارة المعلومات والإجابات الجاهزة</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(true);
                  setEditingItem(null);
                  setFormData({ category: '', question: '', answer: '', keywords: '', priority: 5 });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:shadow-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                <span>إضافة معرفة جديدة</span>
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="بحث في الأسئلة والأجوبة..."
                    className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">جميع الفئات</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Knowledge Items */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
                  <p className="text-gray-500 mt-4">جاري التحميل...</p>
                </div>
              ) : filteredKnowledge.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">لا توجد عناصر في قاعدة المعرفة</p>
                </div>
              ) : (
                filteredKnowledge.map(item => (
                  <div key={item.id} className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${item.is_active ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                        <BookMarked className={`w-5 h-5 ${item.is_active ? 'text-emerald-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-lg font-semibold">
                                {item.category}
                              </span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg">
                                أولوية: {item.priority}
                              </span>
                              <span className="text-xs text-gray-400">
                                استخدام: {item.usage_count} مرة
                              </span>
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 mb-2">
                              {item.question}
                            </h4>
                            <p className="text-gray-600 text-sm leading-relaxed">
                              {item.answer}
                            </p>
                            {item.keywords && item.keywords.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.keywords.map((keyword, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-purple-50 text-purple-600 text-xs rounded">
                                    #{keyword}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleActive(item.id, item.is_active)}
                              className={`p-2 rounded-lg transition-colors ${
                                item.is_active
                                  ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                              title={item.is_active ? 'تعطيل' : 'تفعيل'}
                            >
                              <Zap className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingItem(item);
                                setFormData({
                                  category: item.category,
                                  question: item.question,
                                  answer: item.answer,
                                  keywords: item.keywords.join(', '),
                                  priority: item.priority
                                });
                                setShowAddModal(true);
                              }}
                              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteKnowledge(item.id)}
                              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeSection === 'questions' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 rounded-xl">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">الأسئلة الأكثر تكراراً</h3>
                <p className="text-sm text-gray-500">الأسئلة التي يطرحها المستثمرون بشكل متكرر</p>
              </div>
            </div>

            <div className="space-y-3">
              {frequentQuestions.map((q, index) => (
                <div key={q.id} className="bg-gradient-to-r from-blue-50 to-white border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg">
                          {q.category}
                        </span>
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-lg">
                          {q.frequency} مرة
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 mb-2">{q.question}</h4>
                      <p className="text-gray-600 text-sm">{q.answer}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'conversations' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-purple-100 rounded-xl">
                <MessageCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">سجل المحادثات</h3>
                <p className="text-sm text-gray-500">جميع المحادثات مع المستثمرين</p>
              </div>
            </div>

            <div className="space-y-3">
              {conversations.map(conv => (
                <div key={conv.id} className="bg-gradient-to-r from-purple-50 to-white border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-gray-900">
                        {conv.visitor_name || 'زائر'}
                      </span>
                      {conv.phone && (
                        <span className="text-sm text-gray-500">({conv.phone})</span>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      conv.status === 'active' ? 'bg-green-100 text-green-700' :
                      conv.status === 'resolved' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {conv.status === 'active' ? 'نشطة' : conv.status === 'resolved' ? 'محلولة' : 'مغلقة'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      {conv.messages?.[0]?.count || 0} رسالة
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(conv.created_at).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'learning' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-orange-100 rounded-xl">
                <GraduationCap className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">سجل التعلم والتطور</h3>
                <p className="text-sm text-gray-500">كيف يتعلم المساعد الذكي من المحادثات</p>
              </div>
            </div>

            <div className="space-y-3">
              {learningLogs.map(log => (
                <div key={log.id} className="bg-gradient-to-r from-orange-50 to-white border border-orange-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-orange-600" />
                    <span className="font-semibold text-gray-900">{log.improvement_type}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(log.created_at).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="text-xs text-red-600 font-semibold mb-1">قبل التحسين:</div>
                      <p className="text-sm text-gray-700">{log.before_response}</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="text-xs text-green-600 font-semibold mb-1">بعد التحسين:</div>
                      <p className="text-sm text-gray-700">{log.after_response}</p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    تعلم من: {log.learned_from}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'analytics' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-pink-100 rounded-xl">
                <BarChart3 className="w-6 h-6 text-pink-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">تحليلات الأداء</h3>
                <p className="text-sm text-gray-500">إحصائيات شاملة عن أداء المساعد الذكي</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Activity className="w-6 h-6 text-blue-600" />
                  <h4 className="font-bold text-gray-900">النشاط اليومي</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">محادثات نشطة</span>
                    <span className="text-2xl font-bold text-blue-600">{stats.active_today}</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.min((stats.active_today / 50) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="w-6 h-6 text-green-600" />
                  <h4 className="font-bold text-gray-900">نسبة النجاح</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">الحل الناجح</span>
                    <span className="text-2xl font-bold text-green-600">{stats.resolved_rate.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${stats.resolved_rate}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ThumbsUp className="w-6 h-6 text-purple-600" />
                  <h4 className="font-bold text-gray-900">رضا المستخدمين</h4>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-600 mb-2">
                    {stats.avg_satisfaction.toFixed(1)}
                  </div>
                  <div className="flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <div key={star} className={`w-6 h-6 ${star <= stats.avg_satisfaction ? 'text-yellow-400' : 'text-gray-300'}`}>
                        ⭐
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MessageSquare className="w-6 h-6 text-orange-600" />
                  <h4 className="font-bold text-gray-900">حجم البيانات</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">المحادثات</span>
                    <span className="font-bold text-orange-600">{stats.total_conversations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">الرسائل</span>
                    <span className="font-bold text-orange-600">{stats.total_messages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">قاعدة المعرفة</span>
                    <span className="font-bold text-orange-600">{knowledgeItems.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-6 h-6" />
                  <h3 className="text-xl font-bold">
                    {editingItem ? 'تعديل المعرفة' : 'إضافة معرفة جديدة'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  الفئة
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">اختر الفئة</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  السؤال
                </label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="ما هو السؤال؟"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  الإجابة
                </label>
                <textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  placeholder="اكتب الإجابة التفصيلية..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  الكلمات المفتاحية (افصل بفاصلة)
                </label>
                <input
                  type="text"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="استثمار, أشجار, عقود"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  الأولوية (1-10)
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>منخفضة</span>
                  <span className="font-bold text-emerald-600">{formData.priority}</span>
                  <span>عالية</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={editingItem ? handleUpdateKnowledge : handleAddKnowledge}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  <Save className="w-5 h-5" />
                  <span>{editingItem ? 'حفظ التعديلات' : 'إضافة'}</span>
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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
