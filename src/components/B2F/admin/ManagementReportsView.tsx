import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { FileText, Eye, CheckCircle, Calendar, Building, Image as ImageIcon, Clock, Users, Send } from 'lucide-react';

interface TimelineEvent {
  event_type: string;
  actor_name: string;
  actor_role: string;
  description: string;
  created_at: string;
  metadata?: any;
}

interface ManagementReport {
  id: string;
  farm_id: string;
  task_id: string;
  created_by_name: string;
  title: string;
  summary: string;
  selected_photos: Array<{ url: string; approved: boolean }>;
  approved_photos: any;
  report_type: string;
  priority: string;
  sent_at: string;
  viewed_by_admin: boolean;
  viewed_at: string | null;
  admin_notes: string | null;
  created_at: string;
  farm_name?: string;
  approved_by: string | null;
  approved_at: string | null;
  operation_id: string | null;
  status: string;
  investors_notified_count?: number;
  timeline?: TimelineEvent[];
}

export default function ManagementReportsView() {
  const [reports, setReports] = useState<ManagementReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ManagementReport | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // نموذج إنشاء تقرير يدوي
  const [farms, setFarms] = useState<any[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualSummary, setManualSummary] = useState('');
  const [manualPhotos, setManualPhotos] = useState<File[]>([]);

  useEffect(() => {
    loadReports();
    loadFarms();
  }, []);

  const loadFarms = async () => {
    try {
      const { data, error } = await supabase
        .from('b2f_farms')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setFarms(data || []);
    } catch (error) {
      console.error('Error loading farms:', error);
    }
  };

  const loadReports = async () => {
    try {
      // استخدام View الجديد مع Timeline
      const { data, error } = await supabase
        .from('management_reports_with_timeline')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      alert('حدث خطأ في تحميل التقارير');
    } finally {
      setLoading(false);
    }
  };

  const openReportDetail = async (report: ManagementReport) => {
    setSelectedReport(report);
    setAdminNotes(report.admin_notes || '');
    setShowDetailModal(true);

    // استخدام الدالة المحصنة لتحديد التقرير كمقروء
    if (!report.viewed_by_admin) {
      try {
        await supabase.rpc('mark_report_as_viewed', {
          p_report_id: report.id
        });

        // تحديث القائمة
        setReports(prev =>
          prev.map(r =>
            r.id === report.id
              ? { ...r, viewed_by_admin: true, viewed_at: new Date().toISOString(), status: 'viewed' }
              : r
          )
        );
      } catch (error) {
        console.error('Error marking report as viewed:', error);
      }
    }
  };

  const saveAdminNotes = async () => {
    if (!selectedReport) return;

    try {
      // استخدام الدالة المحصنة لحفظ الملاحظات
      await supabase.rpc('add_admin_notes_to_report', {
        p_report_id: selectedReport.id,
        p_admin_notes: adminNotes
      });

      alert('تم حفظ الملاحظات بنجاح');
      loadReports();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('حدث خطأ في حفظ الملاحظات');
    }
  };

  const approveReport = async (reportId: string) => {
    if (!confirm('هل أنت متأكد من اعتماد هذا التقرير؟')) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('management_reports')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      alert('تم اعتماد التقرير بنجاح');
      loadReports();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error approving report:', error);
      alert('حدث خطأ في اعتماد التقرير');
    } finally {
      setProcessing(false);
    }
  };

  const returnReport = async (reportId: string) => {
    const reason = prompt('اذكر سبب إعادة التقرير للتعديل:');
    if (!reason) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('management_reports')
        .update({
          status: 'returned',
          admin_notes: reason
        })
        .eq('id', reportId);

      if (error) throw error;

      alert('تم إعادة التقرير للتعديل');
      loadReports();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error returning report:', error);
      alert('حدث خطأ في إعادة التقرير');
    } finally {
      setProcessing(false);
    }
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
    setSelectedFarmId('');
    setManualTitle('');
    setManualSummary('');
    setManualPhotos([]);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + manualPhotos.length > 5) {
      alert('الحد الأقصى 5 صور');
      return;
    }
    setManualPhotos(prev => [...prev, ...files]);
  };

  const createManualReport = async () => {
    if (!selectedFarmId || !manualTitle || !manualSummary) {
      alert('يجب ملء جميع الحقول المطلوبة');
      return;
    }

    if (manualPhotos.length === 0) {
      alert('يجب إرفاق صورة واحدة على الأقل');
      return;
    }

    setProcessing(true);
    try {
      // رفع الصور
      const uploadedUrls: string[] = [];

      for (const file of manualPhotos) {
        const fileName = `manual/${selectedFarmId}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('season-files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('season-files')
          .getPublicUrl(uploadData.path);

        uploadedUrls.push(publicUrl);
      }

      // إنشاء التقرير اليدوي
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('غير مصرح');

      const { error: insertError } = await supabase
        .from('management_reports')
        .insert({
          farm_id: selectedFarmId,
          title: manualTitle,
          summary: manualSummary,
          selected_photos: uploadedUrls.map(url => ({ url, approved: true })),
          report_type: 'manual',
          priority: 'normal',
          sent_at: new Date().toISOString(),
          sent_to_admin: true,
          created_by_name: 'المدير العام',
          status: 'approved'
        });

      if (insertError) throw insertError;

      alert('تم إنشاء التقرير بنجاح');
      setShowCreateModal(false);
      loadReports();
    } catch (error) {
      console.error('Error creating manual report:', error);
      alert('حدث خطأ في إنشاء التقرير');
    } finally {
      setProcessing(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      low: { label: 'منخفضة', color: 'bg-gray-500' },
      normal: { label: 'عادية', color: 'bg-blue-500' },
      high: { label: 'عالية', color: 'bg-orange-500' },
      urgent: { label: 'عاجلة', color: 'bg-red-500' }
    };

    const config = configs[priority] || configs.normal;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-white ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4">
          <div className="text-2xl font-bold">{reports.length}</div>
          <div className="text-sm opacity-90">إجمالي التقارير</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4">
          <div className="text-2xl font-bold">
            {reports.filter(r => r.viewed_by_admin).length}
          </div>
          <div className="text-sm opacity-90">مُشاهَدة</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-4">
          <div className="text-2xl font-bold">
            {reports.filter(r => !r.viewed_by_admin).length}
          </div>
          <div className="text-sm opacity-90">جديدة</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-4">
          <div className="text-2xl font-bold">
            {reports.filter(r => r.priority === 'urgent' || r.priority === 'high').length}
          </div>
          <div className="text-sm opacity-90">عالية الأولوية</div>
        </div>
      </div>

      {/* قائمة التقارير */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">تقارير توثيق المزارع</h2>
            <p className="text-sm text-gray-600 mt-1">التقارير المرسلة من مدراء المزارع</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            إنشاء تقرير يدوي
          </button>
        </div>

        <div className="divide-y divide-gray-200">
          {reports.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>لا توجد تقارير حالياً</p>
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                  !report.viewed_by_admin ? 'bg-blue-50' : ''
                }`}
                onClick={() => openReportDetail(report)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-gray-800">{report.title}</h3>
                      {getPriorityBadge(report.priority)}
                      {!report.viewed_by_admin && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded text-xs">
                          <Eye className="w-3 h-3" />
                          جديد
                        </span>
                      )}
                    </div>

                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{report.summary}</p>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {report.farm_name && (
                        <span className="flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {report.farm_name}
                        </span>
                      )}
                      <span>مُرسِل: {report.created_by_name}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(report.sent_at).toLocaleDateString('ar-SA')}
                      </span>
                      {report.selected_photos && report.selected_photos.length > 0 && (
                        <span className="flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          {report.selected_photos.length} صور
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openReportDetail(report);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    عرض
                  </button>
                </div>

                {/* معاينة الصور */}
                {report.selected_photos && report.selected_photos.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {report.selected_photos.slice(0, 3).map((photo, index) => (
                      <div
                        key={index}
                        className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200"
                      >
                        <img
                          src={photo.url}
                          alt={`صورة ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* نافذة تفاصيل التقرير */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{selectedReport.title}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Building className="w-4 h-4" />
                      {selectedReport.farm_name}
                    </span>
                    <span>مُرسِل: {selectedReport.created_by_name}</span>
                    <span>{new Date(selectedReport.sent_at).toLocaleString('ar-SA')}</span>
                  </div>
                </div>
                {getPriorityBadge(selectedReport.priority)}
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* الملخص */}
              <div>
                <h4 className="font-medium text-gray-800 mb-2">الملخص</h4>
                <p className="text-gray-600 whitespace-pre-wrap">{selectedReport.summary}</p>
              </div>

              {/* الصور المعتمدة */}
              {selectedReport.selected_photos && selectedReport.selected_photos.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">الصور المعتمدة</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedReport.selected_photos.map((photo, index) => (
                      <a
                        key={index}
                        href={photo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-green-500 transition-colors"
                      >
                        <img
                          src={photo.url}
                          alt={`صورة ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                          <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {photo.approved && (
                          <div className="absolute top-2 right-2 p-1 bg-green-500 rounded-full">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* معلومات الاعتماد والربط */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                {selectedReport.approved_at && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">تاريخ الاعتماد</p>
                    <p className="font-medium text-gray-800">
                      {new Date(selectedReport.approved_at).toLocaleString('ar-SA')}
                    </p>
                  </div>
                )}
                {selectedReport.operation_id && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">حالة التشغيل</p>
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      <Send className="w-3 h-3" />
                      تم الإرسال للمستثمرين
                    </span>
                  </div>
                )}
                {selectedReport.investors_notified_count && selectedReport.investors_notified_count > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">عدد المستثمرين</p>
                    <span className="inline-flex items-center gap-1 font-medium text-gray-800">
                      <Users className="w-4 h-4" />
                      {selectedReport.investors_notified_count} مستثمر
                    </span>
                  </div>
                )}
              </div>

              {/* Timeline */}
              {selectedReport.timeline && selectedReport.timeline.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    السجل الزمني
                  </h4>
                  <div className="space-y-3">
                    {selectedReport.timeline.map((event, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                          {index < selectedReport.timeline!.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-300 mx-auto mt-1"></div>
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-sm font-medium text-gray-800">{event.description}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span>{event.actor_name}</span>
                            <span>•</span>
                            <span>{new Date(event.created_at).toLocaleString('ar-SA')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ملاحظات المدير العام */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات المدير العام
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                  placeholder="أضف ملاحظاتك على هذا التقرير..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 space-y-3">
              {/* أزرار الإجراءات */}
              {selectedReport.status === 'sent_to_admin' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => approveReport(selectedReport.id)}
                    disabled={processing}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-5 h-5" />
                    اعتماد التقرير
                  </button>

                  <button
                    onClick={() => returnReport(selectedReport.id)}
                    disabled={processing}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors disabled:opacity-50"
                  >
                    <Eye className="w-5 h-5" />
                    إعادة للتعديل
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={saveAdminNotes}
                  disabled={processing}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
                >
                  حفظ الملاحظات
                </button>

                <button
                  onClick={() => setShowDetailModal(false)}
                  disabled={processing}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors disabled:opacity-50"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إنشاء تقرير يدوي */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">إنشاء تقرير توثيق يدوي</h3>
              <p className="text-sm text-gray-600 mt-1">للتقارير التي لا ترتبط بمهمة محددة</p>
            </div>

            <div className="p-6 space-y-4">
              {/* اختيار المزرعة */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المزرعة <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedFarmId}
                  onChange={(e) => setSelectedFarmId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">اختر المزرعة</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* عنوان التقرير */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  عنوان التقرير <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="مثال: تقرير حالة المزرعة - يناير 2026"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* ملخص التقرير */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملخص التقرير <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={manualSummary}
                  onChange={(e) => setManualSummary(e.target.value)}
                  rows={4}
                  placeholder="اكتب ملخصاً شاملاً للتقرير..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* رفع الصور */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الصور (1-5 صور) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                  id="manual-photos"
                  disabled={manualPhotos.length >= 5}
                />
                <label
                  htmlFor="manual-photos"
                  className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    manualPhotos.length >= 5
                      ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                      : 'border-blue-300 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  <ImageIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {manualPhotos.length >= 5 ? 'تم الوصول للحد الأقصى' : 'اختر الصور'}
                  </span>
                </label>

                {manualPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    {manualPhotos.map((file, index) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-lg overflow-hidden border border-gray-200"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`صورة ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() =>
                            setManualPhotos((prev) => prev.filter((_, i) => i !== index))
                          }
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={createManualReport}
                disabled={processing}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {processing ? 'جاري الإنشاء...' : 'إنشاء التقرير'}
              </button>

              <button
                onClick={() => setShowCreateModal(false)}
                disabled={processing}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
