import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Filter, Eye, CheckCircle, Clock, Calendar, Sprout, AlertCircle, MessageSquare } from 'lucide-react';

interface Report {
  id: string;
  farm_id: string;
  task_id: string | null;
  report_type: string;
  title: string;
  content: string;
  photos: string[] | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  admin_notes: string | null;
  farm_name: string;
}

export default function ReportsView() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'sent_to_admin' | 'reviewed'>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => {
    loadReports();
  }, [filter]);

  const loadReports = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('management_reports')
        .select(`
          *,
          b2f_farms!inner(name)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Management reports table not found:', error);
        setReports([]);
        return;
      }

      const formattedReports = data.map((r: any) => ({
        ...r,
        farm_name: r.b2f_farms?.name || 'غير معروف'
      }));

      setReports(formattedReports);
    } catch (error) {
      console.error('Error loading reports:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsReviewed = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('management_reports')
        .update({
          status: 'reviewed',
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNote || null
        })
        .eq('id', reportId);

      if (error) throw error;

      alert('تم وسم التقرير كمُراجع');
      setSelectedReport(null);
      setAdminNote('');
      loadReports();
    } catch (error) {
      console.error('Error marking as reviewed:', error);
      alert('حدث خطأ');
    }
  };

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      irrigation: 'ري',
      fertilization: 'تسميد',
      pruning: 'تقليم',
      pest_control: 'مكافحة آفات',
      harvest: 'حصاد',
      maintenance: 'صيانة',
      inspection: 'فحص دوري',
      other: 'أخرى'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'sent_to_admin') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
          <Clock className="w-3 h-3" />
          بانتظار المراجعة
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
        <CheckCircle className="w-3 h-3" />
        مُراجع
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل التقارير...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* تنبيه */}
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Eye className="w-6 h-6 text-teal-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-teal-900 mb-2">تقارير التوثيق - إشراف فقط</h3>
            <p className="text-sm text-teal-800 leading-relaxed">
              هذه التقارير قادمة من التشغيل. يمكنك مراجعتها وإضافة ملاحظات فقط. لا يمكن التعديل أو التنفيذ.
            </p>
          </div>
        </div>
      </div>

      {/* الفلاتر والإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`p-6 rounded-xl border-2 transition-all text-right ${
            filter === 'all'
              ? 'bg-gradient-to-br from-blue-50 to-sky-50 border-blue-300'
              : 'bg-white border-gray-200 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-blue-700">
              {reports.length}
            </span>
          </div>
          <h4 className="font-bold text-gray-900">جميع التقارير</h4>
        </button>

        <button
          onClick={() => setFilter('sent_to_admin')}
          className={`p-6 rounded-xl border-2 transition-all text-right ${
            filter === 'sent_to_admin'
              ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300'
              : 'bg-white border-gray-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-amber-700">
              {reports.filter(r => r.status === 'sent_to_admin').length}
            </span>
          </div>
          <h4 className="font-bold text-gray-900">بانتظار المراجعة</h4>
        </button>

        <button
          onClick={() => setFilter('reviewed')}
          className={`p-6 rounded-xl border-2 transition-all text-right ${
            filter === 'reviewed'
              ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300'
              : 'bg-white border-gray-200 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-emerald-700">
              {reports.filter(r => r.status === 'reviewed').length}
            </span>
          </div>
          <h4 className="font-bold text-gray-900">مُراجعة</h4>
        </button>
      </div>

      {/* قائمة التقارير */}
      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-300 rounded-xl p-12 text-center">
            <Sprout className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">نظام استثمار الأشجار غير مفعل</h3>
            <p className="text-gray-600 mb-2">عند تفعيل نظام B2F ستظهر التقارير هنا</p>
            <p className="text-xs text-gray-500">هذه اللوحة جاهزة ومنتظرة البيانات من نظام العمليات</p>
          </div>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-7 h-7 text-teal-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 mb-1">{report.title}</h4>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {getStatusBadge(report.status)}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getReportTypeLabel(report.report_type)}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          <Sprout className="w-3 h-3" />
                          {report.farm_name}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(report.created_at).toLocaleDateString('ar-SA')}
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-4 leading-relaxed line-clamp-2">
                    {report.content}
                  </p>

                  {report.admin_notes && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-blue-900 mb-1">ملاحظات الإدارة:</div>
                          <div className="text-sm text-blue-800">{report.admin_notes}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      عرض التفاصيل
                    </button>
                    {report.status === 'sent_to_admin' && (
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setAdminNote('');
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        وسم كمُراجع
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal - عرض التفاصيل */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-5 rounded-t-2xl">
              <h3 className="text-xl font-bold">{selectedReport.title}</h3>
              <p className="text-teal-100 text-sm mt-1">تفاصيل التقرير</p>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">المزرعة</div>
                  <div className="font-bold text-gray-900">{selectedReport.farm_name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">نوع التقرير</div>
                  <div className="font-bold text-gray-900">{getReportTypeLabel(selectedReport.report_type)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">التاريخ</div>
                  <div className="font-bold text-gray-900">
                    {new Date(selectedReport.created_at).toLocaleString('ar-SA')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">الحالة</div>
                  <div>{getStatusBadge(selectedReport.status)}</div>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-2">المحتوى</div>
                <div className="bg-gray-50 rounded-lg p-4 text-gray-900 leading-relaxed">
                  {selectedReport.content}
                </div>
              </div>

              {selectedReport.photos && selectedReport.photos.length > 0 && (
                <div>
                  <div className="text-sm text-gray-600 mb-2">الصور المرفقة</div>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedReport.photos.map((photo, idx) => (
                      <img
                        key={idx}
                        src={photo}
                        alt={`صورة ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                      />
                    ))}
                  </div>
                </div>
              )}

              {selectedReport.status === 'sent_to_admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملاحظات الإدارة (اختياري)
                  </label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:ring-0 resize-none"
                    placeholder="أضف ملاحظاتك هنا..."
                  />
                </div>
              )}

              {selectedReport.admin_notes && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="text-sm font-bold text-blue-900 mb-2">ملاحظات الإدارة السابقة:</div>
                  <div className="text-sm text-blue-800">{selectedReport.admin_notes}</div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-2xl flex items-center gap-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setSelectedReport(null);
                  setAdminNote('');
                }}
                className="flex-1 px-4 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-bold transition-all"
              >
                إغلاق
              </button>
              {selectedReport.status === 'sent_to_admin' && (
                <button
                  onClick={() => markAsReviewed(selectedReport.id)}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  وسم كمُراجع
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
