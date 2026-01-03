import { useState, useEffect } from 'react';
import { MapPin, Calendar, Clock, MessageSquare, Video, User, Check, X, AlertCircle, CheckCircle, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InvestorVisitRequestViewProps {
  investorPhone: string;
}

export function InvestorVisitRequestView({ investorPhone }: InvestorVisitRequestViewProps) {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<any>(null);
  const [visitRequests, setVisitRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    visitType: 'field_visit',
    preferredDate: '',
    preferredTime: 'morning',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [investorPhone]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: requests } = await supabase
        .from('b2f_investment_requests')
        .select('id, investor_name, season_id, number_of_trees')
        .eq('investor_phone', investorPhone)
        .eq('status', 'operational');

      if (requests && requests.length > 0) {
        const requestIds = requests.map(r => r.id);

        const { data: seasonsData } = await supabase
          .from('farm_seasons')
          .select(`
            *,
            farm:b2f_farms(id, name, location)
          `)
          .in('id', requests.map(r => r.season_id).filter(Boolean))
          .order('created_at', { ascending: false });

        if (seasonsData) {
          const enrichedSeasons = seasonsData.map(s => {
            const request = requests.find(r => r.season_id === s.id);
            return {
              ...s,
              request_id: request?.id,
              contact_name: request?.investor_name,
              tree_count: request?.number_of_trees
            };
          });
          setSeasons(enrichedSeasons);
        }

        const { data: visitsData } = await supabase
          .from('season_visit_requests')
          .select('*')
          .eq('investor_phone', investorPhone)
          .order('created_at', { ascending: false });

        setVisitRequests(visitsData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedSeason || !formData.preferredDate) {
      alert('يرجى اختيار الموسم وتاريخ الزيارة المفضل');
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('season_visit_requests')
        .insert({
          season_id: selectedSeason.id,
          farm_id: selectedSeason.farm_id,
          request_id: selectedSeason.request_id,
          investor_phone: investorPhone,
          investor_name: selectedSeason.contact_name,
          visit_type: formData.visitType,
          preferred_date: formData.preferredDate,
          preferred_time: formData.preferredTime,
          notes: formData.notes || null,
          status: 'pending'
        });

      if (error) throw error;

      alert('تم إرسال طلب الزيارة بنجاح! سيتم التواصل معك قريباً.');
      setShowRequestForm(false);
      setSelectedSeason(null);
      setFormData({
        visitType: 'field_visit',
        preferredDate: '',
        preferredTime: 'morning',
        notes: ''
      });
      loadData();
    } catch (error: any) {
      console.error('Error submitting visit request:', error);
      alert('حدث خطأ أثناء إرسال الطلب: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: any = {
      new: {
        text: 'طلب جديد',
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: AlertCircle,
        message: 'تم استلام طلبك وجاري المراجعة'
      },
      scheduled: {
        text: 'تمت الجدولة',
        color: 'bg-green-100 text-green-700 border-green-200',
        icon: CheckCircle,
        message: 'تمت جدولة الزيارة! سيتم التواصل معك لتأكيد التفاصيل'
      },
      completed: {
        text: 'تمت الزيارة',
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        icon: Check,
        message: 'تم تنفيذ الزيارة بنجاح'
      },
      cancelled: {
        text: 'ملغية',
        color: 'bg-red-100 text-red-700 border-red-200',
        icon: X,
        message: 'تم إلغاء طلب الزيارة'
      }
    };
    return configs[status] || configs.new;
  };

  const getVisitTypeText = (type: string) => {
    const types: any = {
      field_visit: 'زيارة ميدانية',
      video_visit: 'زيارة عبر الفيديو',
      both: 'الاثنين معاً'
    };
    return types[type] || type;
  };

  const getTimeText = (time: string) => {
    const times: any = {
      morning: 'صباحاً',
      evening: 'مساءً',
      anytime: 'في أي وقت'
    };
    return times[time] || time;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">جاري التحميل...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <MapPin className="w-8 h-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">طلبات الزيارة</h2>
        </div>
        <p className="text-gray-700">
          يمكنك طلب زيارة مزرعتك لمتابعة حالة أشجارك
        </p>
      </div>

      {seasons.length === 0 ? (
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-8 text-center">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد مواسم تشغيلية</h3>
          <p className="text-gray-600">
            لا يمكن طلب زيارة حالياً. يجب أن يكون لديك موسم تشغيلي نشط.
          </p>
        </div>
      ) : (
        <>
          {!showRequestForm && (
            <button
              onClick={() => setShowRequestForm(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg hover:shadow-xl"
            >
              <Send className="w-5 h-5" />
              طلب زيارة جديدة
            </button>
          )}

          {showRequestForm && (
            <div className="bg-white border-2 border-blue-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">طلب زيارة المزرعة</h3>
                <button
                  onClick={() => {
                    setShowRequestForm(false);
                    setSelectedSeason(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اختر الموسم/المزرعة
                  </label>
                  <select
                    value={selectedSeason?.id || ''}
                    onChange={(e) => {
                      const season = seasons.find(s => s.id === e.target.value);
                      setSelectedSeason(season);
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- اختر الموسم --</option>
                    {seasons.map(season => (
                      <option key={season.id} value={season.id}>
                        {season.farm?.name} - موسم {season.season_number} ({season.season_year})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نوع الزيارة
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      onClick={() => setFormData({ ...formData, visitType: 'field_visit' })}
                      className={`p-4 border-2 rounded-lg flex items-center gap-3 transition-all ${
                        formData.visitType === 'field_visit'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">زيارة ميدانية</span>
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, visitType: 'video_visit' })}
                      className={`p-4 border-2 rounded-lg flex items-center gap-3 transition-all ${
                        formData.visitType === 'video_visit'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <Video className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">زيارة فيديو</span>
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, visitType: 'both' })}
                      className={`p-4 border-2 rounded-lg flex items-center gap-3 transition-all ${
                        formData.visitType === 'both'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <Check className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">الاثنين معاً</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اليوم المفضل
                    </label>
                    <input
                      type="date"
                      value={formData.preferredDate}
                      onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الفترة المفضلة
                    </label>
                    <select
                      value={formData.preferredTime}
                      onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="morning">صباحاً</option>
                      <option value="evening">مساءً</option>
                      <option value="anytime">في أي وقت</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملاحظات إضافية (اختياري)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="أي ملاحظات أو طلبات خاصة..."
                  />
                </div>

                <button
                  onClick={handleSubmitRequest}
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-4 rounded-lg font-bold transition-colors"
                >
                  {submitting ? 'جاري الإرسال...' : 'إرسال طلب الزيارة'}
                </button>
              </div>
            </div>
          )}

          {visitRequests.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                طلبات الزيارة السابقة ({visitRequests.length})
              </h3>

              {visitRequests.map((request) => {
                const statusConfig = getStatusConfig(request.status);
                const StatusIcon = statusConfig.icon;
                const season = seasons.find(s => s.id === request.season_id);

                return (
                  <div key={request.id} className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 mb-1">
                          {season?.farm?.name || 'مزرعة'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          موسم {season?.season_number} - {season?.season_year}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border-2 inline-flex items-center gap-1 ${statusConfig.color}`}>
                        <StatusIcon className="w-4 h-4" />
                        {statusConfig.text}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-xs text-gray-600">نوع الزيارة</span>
                        </div>
                        <p className="font-bold text-gray-900 text-sm">{getVisitTypeText(request.visit_type)}</p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-xs text-gray-600">التاريخ المفضل</span>
                        </div>
                        <p className="font-bold text-gray-900 text-sm">
                          {new Date(request.preferred_date).toLocaleDateString('ar-SA')}
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-xs text-gray-600">الفترة</span>
                        </div>
                        <p className="font-bold text-gray-900 text-sm">{getTimeText(request.preferred_time)}</p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-xs text-gray-600">تاريخ الطلب</span>
                        </div>
                        <p className="font-bold text-gray-900 text-sm">
                          {new Date(request.created_at).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                    </div>

                    {request.notes && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-blue-700 font-medium mb-1">ملاحظاتك:</p>
                            <p className="text-sm text-blue-900">{request.notes}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className={`border-2 rounded-lg p-3 ${statusConfig.color.replace('text-', 'border-')}`}>
                      <div className="flex items-start gap-2">
                        <StatusIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${statusConfig.color.split(' ')[1]}`} />
                        <p className={`text-sm ${statusConfig.color.split(' ')[1]}`}>
                          {statusConfig.message}
                        </p>
                      </div>
                    </div>

                    {request.admin_notes && (
                      <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="text-xs text-gray-600 font-medium mb-1">ملاحظات الإدارة:</p>
                        <p className="text-sm text-gray-900">{request.admin_notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
