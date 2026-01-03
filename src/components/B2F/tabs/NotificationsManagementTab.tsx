import { useState, useEffect } from 'react';
import { Bell, Send, Users, User, Search, X, CheckCircle, AlertCircle, Sparkles, Megaphone, Calendar, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface InvestorAccount {
  id: string;
  contact_name: string;
  contact_phone: string;
}

interface NotificationFormData {
  recipientType: 'all' | 'specific' | 'opportunity';
  recipientId?: string;
  opportunityId?: string;
  type: 'booking' | 'payment' | 'contract' | 'certificate' | 'operation' | 'visit' | 'season' | 'system';
  priority: 'normal' | 'important' | 'urgent';
  title: string;
  message: string;
  icon: string;
  link?: string;
}

interface GuestNotificationFormData {
  type: 'announcement' | 'offer' | 'update' | 'event' | 'system';
  priority: 'normal' | 'important' | 'urgent';
  title: string;
  message: string;
  icon: string;
  link?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
}

const notificationTypes = [
  { value: 'system', label: 'إعلان عام', icon: '📢' },
  { value: 'booking', label: 'حجوزات', icon: '🌳' },
  { value: 'payment', label: 'مدفوعات', icon: '💳' },
  { value: 'contract', label: 'عقود', icon: '📄' },
  { value: 'certificate', label: 'شهادات', icon: '🎖️' },
  { value: 'operation', label: 'تشغيل', icon: '🔧' },
  { value: 'visit', label: 'زيارات', icon: '🚗' },
  { value: 'season', label: 'مواسم', icon: '🌾' }
];

const guestNotificationTypes = [
  { value: 'announcement', label: 'إعلان', icon: '📢' },
  { value: 'offer', label: 'عرض خاص', icon: '🎁' },
  { value: 'update', label: 'تحديث', icon: '✨' },
  { value: 'event', label: 'حدث', icon: '🎉' },
  { value: 'system', label: 'النظام', icon: '🔔' }
];

const priorityOptions = [
  { value: 'normal', label: 'عادي', color: 'bg-gray-100 text-gray-700' },
  { value: 'important', label: 'مهم', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'urgent', label: 'عاجل', color: 'bg-red-100 text-red-700' }
];

const iconOptions = [
  '📢', '🎉', '✨', '🚀', '🌟', '💡', '🎁', '🔔',
  '🌳', '💰', '💳', '📄', '🎖️', '🔧', '🚗', '🌾',
  '⚡', '🔥', '✅', '⚠️', '📢', '📣', '🎯', '💼'
];

export default function NotificationsManagementTab() {
  const [activeTab, setActiveTab] = useState<'investors' | 'guests'>('investors');

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">إدارة الإشعارات</h2>
            <p className="text-emerald-100 text-sm">إرسال إشعارات للمستثمرين والزوار</p>
          </div>
        </div>
      </div>

      {/* التبويبات */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTab('investors')}
            className={`px-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'investors'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>إشعارات المستثمرين</span>
          </button>

          <button
            onClick={() => setActiveTab('guests')}
            className={`px-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'guests'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Megaphone className="w-5 h-5" />
            <span>إشعارات الزوار</span>
          </button>
        </div>
      </div>

      {/* المحتوى */}
      {activeTab === 'investors' ? <InvestorNotificationsSection /> : <GuestNotificationsSection />}
    </div>
  );
}

function InvestorNotificationsSection() {
  const [formData, setFormData] = useState<NotificationFormData>({
    recipientType: 'all',
    type: 'system',
    priority: 'normal',
    title: '',
    message: '',
    icon: '📢'
  });

  const [investors, setInvestors] = useState<InvestorAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvestor, setSelectedInvestor] = useState<InvestorAccount | null>(null);
  const [showInvestorSearch, setShowInvestorSearch] = useState(false);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0 });

  useEffect(() => {
    loadInvestors();
    loadOpportunities();
  }, []);

  const loadInvestors = async () => {
    const { data } = await supabase
      .from('b2f_investor_accounts')
      .select('id, contact_name, contact_phone')
      .order('created_at', { ascending: false });

    setInvestors(data || []);
  };

  const loadOpportunities = async () => {
    const { data } = await supabase
      .from('b2f_opportunities')
      .select('id, title')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    setOpportunities(data || []);
  };

  const filteredInvestors = investors.filter(inv =>
    inv.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.contact_phone.includes(searchTerm)
  );

  const handleSendNotification = async () => {
    if (!formData.title || !formData.message) {
      setErrorMessage('الرجاء ملء العنوان والرسالة');
      return;
    }

    if (formData.recipientType === 'specific' && !selectedInvestor) {
      setErrorMessage('الرجاء اختيار المستثمر');
      return;
    }

    if (formData.recipientType === 'opportunity' && !formData.opportunityId) {
      setErrorMessage('الرجاء اختيار الفرصة الاستثمارية');
      return;
    }

    setSending(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      let recipientIds: string[] = [];

      if (formData.recipientType === 'all') {
        recipientIds = investors.map(inv => inv.id);
      } else if (formData.recipientType === 'specific' && selectedInvestor) {
        recipientIds = [selectedInvestor.id];
      } else if (formData.recipientType === 'opportunity' && formData.opportunityId) {
        const { data: requests } = await supabase
          .from('b2f_investment_requests')
          .select('investor_account_id')
          .eq('opportunity_id', formData.opportunityId);

        recipientIds = [...new Set(requests?.map(r => r.investor_account_id) || [])];
      }

      setStats({ total: recipientIds.length, sent: 0, failed: 0 });

      const notifications = recipientIds.map(investorId => ({
        investor_account_id: investorId,
        type: formData.type,
        priority: formData.priority,
        title: formData.title,
        message: formData.message,
        icon: formData.icon,
        link: formData.link || null,
        is_read: false
      }));

      const { data, error } = await supabase
        .from('b2f_notifications')
        .insert(notifications);

      if (error) throw error;

      setStats({ total: recipientIds.length, sent: recipientIds.length, failed: 0 });
      setSuccessMessage(`تم إرسال ${recipientIds.length} إشعار بنجاح`);

      setFormData({
        recipientType: 'all',
        type: 'system',
        priority: 'normal',
        title: '',
        message: '',
        icon: '📢'
      });
      setSelectedInvestor(null);
      setSearchTerm('');

      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error sending notifications:', error);
      setErrorMessage('حدث خطأ أثناء الإرسال');
    } finally {
      setSending(false);
    }
  };

  const quickTemplates = [
    {
      title: 'مزرعة جديدة متاحة',
      message: 'يسعدنا إعلامكم بإضافة مزرعة جديدة متميزة! استثمر الآن في فرص مربحة 🌳',
      type: 'system' as const,
      icon: '🌳',
      priority: 'important' as const
    },
    {
      title: 'عرض خاص محدود',
      message: 'عرض حصري لفترة محدودة! خصم خاص على رسوم التشغيل للمستثمرين الجدد 🎁',
      type: 'system' as const,
      icon: '🎁',
      priority: 'urgent' as const
    },
    {
      title: 'تحديث هام',
      message: 'تم تحديث النظام بميزات جديدة لتحسين تجربتكم الاستثمارية ✨',
      type: 'system' as const,
      icon: '✨',
      priority: 'normal' as const
    }
  ];

  return (
    <div className="space-y-6">

      {successMessage && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-green-900">{successMessage}</p>
            <p className="text-sm text-green-700">تم: {stats.sent} من {stats.total}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <p className="font-bold text-red-900">{errorMessage}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-3">المستلمون</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => {
                setFormData({ ...formData, recipientType: 'all' });
                setSelectedInvestor(null);
              }}
              className={`p-4 rounded-xl border-2 transition-all ${
                formData.recipientType === 'all'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-emerald-300'
              }`}
            >
              <Users className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
              <p className="font-bold text-sm">جميع المستثمرين</p>
              <p className="text-xs text-gray-600">{investors.length} مستثمر</p>
            </button>

            <button
              onClick={() => {
                setFormData({ ...formData, recipientType: 'specific' });
                setShowInvestorSearch(true);
              }}
              className={`p-4 rounded-xl border-2 transition-all ${
                formData.recipientType === 'specific'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-emerald-300'
              }`}
            >
              <User className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
              <p className="font-bold text-sm">مستثمر محدد</p>
              <p className="text-xs text-gray-600">اختر من القائمة</p>
            </button>

            <button
              onClick={() => setFormData({ ...formData, recipientType: 'opportunity' })}
              className={`p-4 rounded-xl border-2 transition-all ${
                formData.recipientType === 'opportunity'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-emerald-300'
              }`}
            >
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
              <p className="font-bold text-sm">حسب الفرصة</p>
              <p className="text-xs text-gray-600">مستثمري فرصة معينة</p>
            </button>
          </div>

          {formData.recipientType === 'specific' && selectedInvestor && (
            <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-emerald-900">{selectedInvestor.contact_name}</p>
                  <p className="text-sm text-emerald-600">{selectedInvestor.contact_phone}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedInvestor(null);
                    setShowInvestorSearch(true);
                  }}
                  className="text-emerald-600 hover:text-emerald-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {formData.recipientType === 'opportunity' && (
            <div className="mt-3">
              <select
                value={formData.opportunityId || ''}
                onChange={(e) => setFormData({ ...formData, opportunityId: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">اختر الفرصة الاستثمارية...</option>
                {opportunities.map(opp => (
                  <option key={opp.id} value={opp.id}>{opp.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">نوع الإشعار</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {notificationTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">الأولوية</label>
            <div className="flex gap-2">
              {priorityOptions.map(priority => (
                <button
                  key={priority.value}
                  onClick={() => setFormData({ ...formData, priority: priority.value as any })}
                  className={`flex-1 px-4 py-3 rounded-xl font-bold transition-all ${
                    formData.priority === priority.value
                      ? priority.color + ' border-2 border-current'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:border-gray-300'
                  }`}
                >
                  {priority.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">الأيقونة</label>
          <div className="grid grid-cols-8 md:grid-cols-12 gap-2">
            {iconOptions.map(icon => (
              <button
                key={icon}
                onClick={() => setFormData({ ...formData, icon })}
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${
                  formData.icon === icon
                    ? 'bg-emerald-100 border-2 border-emerald-500 scale-110'
                    : 'bg-gray-100 border-2 border-transparent hover:border-emerald-300'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">عنوان الإشعار</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="مثال: مزرعة جديدة متاحة للاستثمار"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">محتوى الرسالة</label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="اكتب رسالتك هنا..."
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">رابط (اختياري)</label>
          <input
            type="text"
            value={formData.link || ''}
            onChange={(e) => setFormData({ ...formData, link: e.target.value })}
            placeholder="/b2f/opportunities"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div className="border-t-2 border-gray-200 pt-4">
          <p className="text-sm font-bold text-gray-700 mb-3">قوالب جاهزة</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {quickTemplates.map((template, index) => (
              <button
                key={index}
                onClick={() => setFormData({
                  ...formData,
                  title: template.title,
                  message: template.message,
                  type: template.type,
                  icon: template.icon,
                  priority: template.priority
                })}
                className="p-3 text-right bg-gray-50 hover:bg-emerald-50 border-2 border-gray-200 hover:border-emerald-300 rounded-xl transition-all"
              >
                <p className="font-bold text-sm text-gray-900">{template.icon} {template.title}</p>
                <p className="text-xs text-gray-600 line-clamp-2">{template.message}</p>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSendNotification}
          disabled={sending || !formData.title || !formData.message}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
        >
          {sending ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>جاري الإرسال...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>إرسال الإشعار</span>
            </>
          )}
        </button>
      </div>

      {showInvestorSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowInvestorSearch(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b-2 border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-900">اختر المستثمر</h3>
                <button
                  onClick={() => setShowInvestorSearch(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ابحث بالاسم أو رقم الهاتف..."
                  className="w-full pr-10 pl-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {filteredInvestors.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-bold">لم يتم العثور على مستثمرين</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredInvestors.map(investor => (
                    <button
                      key={investor.id}
                      onClick={() => {
                        setSelectedInvestor(investor);
                        setShowInvestorSearch(false);
                      }}
                      className="w-full p-4 bg-gray-50 hover:bg-emerald-50 border-2 border-gray-200 hover:border-emerald-300 rounded-xl transition-all text-right"
                    >
                      <p className="font-bold text-gray-900">{investor.contact_name}</p>
                      <p className="text-sm text-gray-600">{investor.contact_phone}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GuestNotificationsSection() {
  const [formData, setFormData] = useState<GuestNotificationFormData>({
    type: 'announcement',
    priority: 'normal',
    title: '',
    message: '',
    icon: '📢',
    startDate: new Date().toISOString().split('T')[0],
    isActive: true
  });

  const [guestNotifications, setGuestNotifications] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadGuestNotifications();
  }, []);

  const loadGuestNotifications = async () => {
    const { data } = await supabase
      .from('b2f_guest_notifications')
      .select('*')
      .order('created_at', { ascending: false });

    setGuestNotifications(data || []);
  };

  const handleCreateNotification = async () => {
    if (!formData.title || !formData.message) {
      setErrorMessage('الرجاء ملء العنوان والرسالة');
      return;
    }

    setSending(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { error } = await supabase
        .from('b2f_guest_notifications')
        .insert({
          type: formData.type,
          priority: formData.priority,
          title: formData.title,
          message: formData.message,
          icon: formData.icon,
          link: formData.link || null,
          is_active: formData.isActive,
          start_date: formData.startDate,
          end_date: formData.endDate || null
        });

      if (error) throw error;

      setSuccessMessage('تم إنشاء الإشعار بنجاح');
      setFormData({
        type: 'announcement',
        priority: 'normal',
        title: '',
        message: '',
        icon: '📢',
        startDate: new Date().toISOString().split('T')[0],
        isActive: true
      });

      loadGuestNotifications();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error creating guest notification:', error);
      setErrorMessage('حدث خطأ أثناء الإنشاء');
    } finally {
      setSending(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('b2f_guest_notifications')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (!error) {
      loadGuestNotifications();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإشعار؟')) return;

    const { error } = await supabase
      .from('b2f_guest_notifications')
      .delete()
      .eq('id', id);

    if (!error) {
      loadGuestNotifications();
    }
  };

  const quickGuestTemplates = [
    {
      title: 'مرحباً بكم في استثمار أشجار المزارع',
      message: 'اكتشف فرص استثمارية مربحة ومستدامة في مزارع الأشجار! سجل الآن وابدأ رحلتك الاستثمارية',
      type: 'announcement' as const,
      icon: '🌳',
      priority: 'important' as const
    },
    {
      title: 'عرض خاص - خصم على رسوم التشغيل',
      message: 'احصل على خصم 20% على رسوم التشغيل للمستثمرين الجدد! العرض ساري لفترة محدودة',
      type: 'offer' as const,
      icon: '🎁',
      priority: 'urgent' as const
    },
    {
      title: 'تحديثات جديدة على المنصة',
      message: 'تم إضافة ميزات جديدة لتحسين تجربة الاستثمار. اطلع على آخر التحديثات الآن',
      type: 'update' as const,
      icon: '✨',
      priority: 'normal' as const
    }
  ];

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
          <p className="font-bold text-green-900">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <p className="font-bold text-red-900">{errorMessage}</p>
        </div>
      )}

      {/* نموذج إنشاء إشعار جديد */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 space-y-6">
        <div className="flex items-center gap-2 text-blue-600 mb-4">
          <Megaphone className="w-6 h-6" />
          <h3 className="text-xl font-bold">إنشاء إشعار للزوار</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">نوع الإشعار</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {guestNotificationTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">الأولوية</label>
            <div className="flex gap-2">
              {priorityOptions.map(priority => (
                <button
                  key={priority.value}
                  onClick={() => setFormData({ ...formData, priority: priority.value as any })}
                  className={`flex-1 px-4 py-3 rounded-xl font-bold transition-all ${
                    formData.priority === priority.value
                      ? priority.color + ' border-2 border-current'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:border-gray-300'
                  }`}
                >
                  {priority.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">الأيقونة</label>
          <div className="grid grid-cols-8 md:grid-cols-12 gap-2">
            {iconOptions.map(icon => (
              <button
                key={icon}
                onClick={() => setFormData({ ...formData, icon })}
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${
                  formData.icon === icon
                    ? 'bg-blue-100 border-2 border-blue-500 scale-110'
                    : 'bg-gray-100 border-2 border-transparent hover:border-blue-300'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">عنوان الإشعار</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="مثال: مرحباً بكم في استثمار المزارع"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">محتوى الرسالة</label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="اكتب رسالتك هنا..."
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">رابط (اختياري)</label>
          <input
            type="text"
            value={formData.link || ''}
            onChange={(e) => setFormData({ ...formData, link: e.target.value })}
            placeholder="/b2f/opportunities"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              تاريخ البدء
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              تاريخ الانتهاء (اختياري)
            </label>
            <input
              type="date"
              value={formData.endDate || ''}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
          <label htmlFor="isActive" className="font-bold text-gray-700">
            تفعيل الإشعار فوراً
          </label>
        </div>

        <div className="border-t-2 border-gray-200 pt-4">
          <p className="text-sm font-bold text-gray-700 mb-3">قوالب جاهزة</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {quickGuestTemplates.map((template, index) => (
              <button
                key={index}
                onClick={() => setFormData({
                  ...formData,
                  title: template.title,
                  message: template.message,
                  type: template.type,
                  icon: template.icon,
                  priority: template.priority
                })}
                className="p-3 text-right bg-gray-50 hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-300 rounded-xl transition-all"
              >
                <p className="font-bold text-sm text-gray-900">{template.icon} {template.title}</p>
                <p className="text-xs text-gray-600 line-clamp-2">{template.message}</p>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleCreateNotification}
          disabled={sending || !formData.title || !formData.message}
          className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
        >
          {sending ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>جاري الإنشاء...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>إنشاء الإشعار</span>
            </>
          )}
        </button>
      </div>

      {/* قائمة الإشعارات الموجودة */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">الإشعارات الموجودة ({guestNotifications.length})</h3>

        {guestNotifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-bold">لا توجد إشعارات حالياً</p>
          </div>
        ) : (
          <div className="space-y-3">
            {guestNotifications.map(notification => (
              <div
                key={notification.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  notification.is_active
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{notification.icon}</span>
                      <h4 className="font-bold text-gray-900">{notification.title}</h4>
                      {notification.is_active && (
                        <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full font-bold">
                          نشط
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>البداية: {new Date(notification.start_date).toLocaleDateString('ar-SA')}</span>
                      {notification.end_date && (
                        <span>النهاية: {new Date(notification.end_date).toLocaleDateString('ar-SA')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(notification.id, notification.is_active)}
                      className={`px-3 py-2 rounded-lg font-bold text-xs transition-all ${
                        notification.is_active
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {notification.is_active ? 'إيقاف' : 'تفعيل'}
                    </button>
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-bold text-xs transition-all"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
