import { Sprout, DollarSign, Package, FileText, Users, MapPin, Construction, AlertCircle, CheckCircle, Clock, Send } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

// التبويب 1: العمليات الزراعية
export function AgriculturalOperationsTab({ seasonId }: { seasonId: string }) {
  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
      <div className="flex items-center gap-3 mb-4">
        <Sprout className="w-8 h-8 text-green-600" />
        <h2 className="text-2xl font-bold text-gray-900">العمليات الزراعية</h2>
      </div>
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
        <Construction className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-blue-900 mb-2">قيد التطوير</h3>
        <p className="text-blue-700">
          سيتم إضافة تفاصيل العمليات الزراعية قريباً
        </p>
        <p className="text-sm text-blue-600 mt-2">
          Season ID: {seasonId}
        </p>
      </div>
    </div>
  );
}

// التبويب 2: المصاريف التشغيلية
export function OperationalExpensesTab({ seasonId }: { seasonId: string }) {
  const [feeData, setFeeData] = useState<any>(null);
  const [investorFees, setInvestorFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    feeAmount: '',
    dueDate: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFeeData();
  }, [seasonId]);

  const loadFeeData = async () => {
    try {
      setLoading(true);

      const { data: seasonFee } = await supabase
        .from('season_operation_fees')
        .select('*')
        .eq('season_id', seasonId)
        .single();

      setFeeData(seasonFee);

      if (seasonFee) {
        const { data: investorFeesData } = await supabase
          .from('investor_operation_fees')
          .select('*')
          .eq('season_fee_id', seasonFee.id)
          .order('created_at', { ascending: false });

        setInvestorFees(investorFeesData || []);
      }
    } catch (error) {
      console.error('Error loading fee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFee = async () => {
    if (!formData.feeAmount || !formData.dueDate) {
      alert('يرجى إدخال قيمة الرسوم وتاريخ الاستحقاق');
      return;
    }

    try {
      setSaving(true);

      const { data: newFee, error: feeError } = await supabase
        .from('season_operation_fees')
        .insert({
          season_id: seasonId,
          fee_amount: parseFloat(formData.feeAmount),
          due_date: formData.dueDate,
          description: formData.description || null,
          status: 'not_sent'
        })
        .select()
        .single();

      if (feeError) throw feeError;

      await supabase.rpc('distribute_fees_to_investors', {
        p_season_fee_id: newFee.id,
        p_season_id: seasonId,
        p_fee_amount: parseFloat(formData.feeAmount),
        p_due_date: formData.dueDate
      });

      await supabase
        .from('farm_seasons')
        .update({ operational_status: 'waiting_for_fees' })
        .eq('id', seasonId);

      alert('تم إنشاء رسوم التشغيل وتوزيعها على المستثمرين بنجاح');
      setShowForm(false);
      setFormData({ feeAmount: '', dueDate: '', description: '' });
      loadFeeData();
    } catch (error: any) {
      console.error('Error creating fee:', error);
      alert('حدث خطأ أثناء إنشاء الرسوم: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFee = async () => {
    if (!formData.feeAmount || !formData.dueDate) {
      alert('يرجى إدخال قيمة الرسوم وتاريخ الاستحقاق');
      return;
    }

    try {
      setSaving(true);

      await supabase
        .from('season_operation_fees')
        .update({
          fee_amount: parseFloat(formData.feeAmount),
          due_date: formData.dueDate,
          description: formData.description || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', feeData.id);

      await supabase
        .from('investor_operation_fees')
        .update({
          fee_amount: parseFloat(formData.feeAmount),
          due_date: formData.dueDate,
          updated_at: new Date().toISOString()
        })
        .eq('season_fee_id', feeData.id);

      alert('تم تحديث رسوم التشغيل بنجاح');
      setShowForm(false);
      loadFeeData();
    } catch (error: any) {
      console.error('Error updating fee:', error);
      alert('حدث خطأ أثناء تحديث الرسوم: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      not_sent: { text: 'لم يتم الإرسال', color: 'bg-gray-100 text-gray-700', icon: AlertCircle },
      pending_payment: { text: 'في انتظار السداد', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      under_review: { text: 'قيد المراجعة', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
      paid: { text: 'مدفوع', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      late: { text: 'متأخر', color: 'bg-red-100 text-red-700', icon: AlertCircle }
    };

    const config = statusConfig[status] || statusConfig.not_sent;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="w-4 h-4" />
        {config.text}
      </span>
    );
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
    <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900">المصاريف التشغيلية</h2>
        </div>
        {!feeData && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            إنشاء رسوم تشغيلية
          </button>
        )}
        {feeData && !showForm && (
          <button
            onClick={() => {
              setFormData({
                feeAmount: feeData.fee_amount.toString(),
                dueDate: feeData.due_date,
                description: feeData.description || ''
              });
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            تعديل الرسوم
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {feeData ? 'تعديل الرسوم التشغيلية' : 'إنشاء رسوم تشغيلية جديدة'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                قيمة الرسوم (ريال)
              </label>
              <input
                type="number"
                value={formData.feeAmount}
                onChange={(e) => setFormData({ ...formData, feeAmount: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="500"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاريخ الاستحقاق
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              وصف الرسوم (اختياري)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={3}
              placeholder="مثال: رسوم التشغيل والعناية للموسم 2025"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={feeData ? handleUpdateFee : handleCreateFee}
              disabled={saving}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {saving ? 'جاري الحفظ...' : (feeData ? 'حفظ التعديلات' : 'إنشاء وتوزيع')}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setFormData({ feeAmount: '', dueDate: '', description: '' });
              }}
              disabled={saving}
              className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {feeData && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">قيمة الرسوم</p>
                <p className="text-2xl font-bold text-green-700">{feeData.fee_amount} ر.س</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">تاريخ الاستحقاق</p>
                <p className="text-xl font-bold text-gray-900">{new Date(feeData.due_date).toLocaleDateString('ar-SA')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">الحالة العامة</p>
                {getStatusBadge(feeData.status)}
              </div>
            </div>
            {feeData.description && (
              <p className="text-gray-700 mt-4 pt-4 border-t border-green-200">
                {feeData.description}
              </p>
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              حالة السداد للمستثمرين ({investorFees.length})
            </h3>

            {investorFees.length === 0 ? (
              <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">لا توجد رسوم موزعة على المستثمرين</p>
              </div>
            ) : (
              <div className="space-y-3">
                {investorFees.map((fee) => (
                  <div key={fee.id} className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{fee.investor_name}</p>
                        <p className="text-sm text-gray-600">{fee.investor_phone}</p>
                      </div>
                      <div className="text-left mr-4">
                        <p className="text-lg font-bold text-green-700">{fee.fee_amount} ر.س</p>
                        {getStatusBadge(fee.status)}
                      </div>
                    </div>
                    {fee.ai_verification_notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">ملاحظات التحقق:</span> {fee.ai_verification_notes}
                        </p>
                      </div>
                    )}
                    {fee.paid_at && (
                      <div className="mt-2 text-sm text-gray-500">
                        تاريخ السداد: {new Date(fee.paid_at).toLocaleString('ar-SA')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!feeData && !showForm && (
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-8 text-center">
          <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">لم يتم إنشاء رسوم تشغيلية بعد</h3>
          <p className="text-gray-600 mb-4">
            قم بإنشاء رسوم التشغيل للموسم وسيتم توزيعها تلقائياً على جميع المستثمرين
          </p>
        </div>
      )}
    </div>
  );
}

// التبويب 3: الحصاد والعصر
export function HarvestAndProcessingTab({ seasonId }: { seasonId: string }) {
  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
      <div className="flex items-center gap-3 mb-4">
        <Package className="w-8 h-8 text-orange-600" />
        <h2 className="text-2xl font-bold text-gray-900">الحصاد والعصر</h2>
      </div>
      <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6 text-center">
        <Construction className="w-16 h-16 text-orange-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-orange-900 mb-2">قيد التطوير</h3>
        <p className="text-orange-700">
          سيتم إضافة تفاصيل الحصاد والإنتاج قريباً
        </p>
        <p className="text-sm text-orange-600 mt-2">
          Season ID: {seasonId}
        </p>
      </div>
    </div>
  );
}

// التبويب 4: الملفات والتقارير
export function FilesAndReportsTab({ seasonId }: { seasonId: string }) {
  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
      <div className="flex items-center gap-3 mb-4">
        <FileText className="w-8 h-8 text-purple-600" />
        <h2 className="text-2xl font-bold text-gray-900">الملفات والتقارير</h2>
      </div>
      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 text-center">
        <Construction className="w-16 h-16 text-purple-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-purple-900 mb-2">قيد التطوير</h3>
        <p className="text-purple-700">
          سيتم إضافة نظام إدارة الملفات والتقارير قريباً
        </p>
        <p className="text-sm text-purple-600 mt-2">
          Season ID: {seasonId}
        </p>
      </div>
    </div>
  );
}

// التبويب 5: المستثمرون
export function InvestorsTab({ seasonId }: { seasonId: string }) {
  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
      <div className="flex items-center gap-3 mb-4">
        <Users className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">المستثمرون المرتبطون بهذا الموسم</h2>
      </div>
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
        <Construction className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-blue-900 mb-2">قيد التطوير</h3>
        <p className="text-blue-700">
          سيتم عرض قائمة المستثمرين وتفاصيلهم قريباً
        </p>
        <p className="text-sm text-blue-600 mt-2">
          Season ID: {seasonId}
        </p>
      </div>
    </div>
  );
}

// التبويب 6: طلبات الزيارة
export function VisitRequestsTab({ seasonId }: { seasonId: string }) {
  const [visitRequests, setVisitRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadVisitRequests();
  }, [seasonId]);

  const loadVisitRequests = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('season_visit_requests')
        .select('*')
        .eq('season_id', seasonId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setVisitRequests(data || []);
    } catch (error) {
      console.error('Error loading visit requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string, adminNotes?: string) => {
    if (!editingRequest) return;

    try {
      setUpdating(true);

      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (adminNotes !== undefined) {
        updateData.admin_notes = adminNotes;
      }

      if (newStatus === 'scheduled') {
        updateData.scheduled_date = new Date().toISOString();
      } else if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('season_visit_requests')
        .update(updateData)
        .eq('id', editingRequest.id);

      if (error) throw error;

      alert('تم تحديث حالة الطلب بنجاح');
      setEditingRequest(null);
      loadVisitRequests();
    } catch (error: any) {
      console.error('Error updating request:', error);
      alert('حدث خطأ أثناء التحديث: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: any = {
      new: { text: 'طلب جديد', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
      scheduled: { text: 'تمت الجدولة', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      completed: { text: 'تمت الزيارة', color: 'bg-gray-100 text-gray-700', icon: CheckCircle },
      cancelled: { text: 'ملغية', color: 'bg-red-100 text-red-700', icon: AlertCircle }
    };

    const config = configs[status] || configs.new;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="w-4 h-4" />
        {config.text}
      </span>
    );
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-gray-600">جاري التحميل...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
      <div className="flex items-center gap-3 mb-6">
        <MapPin className="w-8 h-8 text-teal-600" />
        <h2 className="text-2xl font-bold text-gray-900">طلبات الزيارة</h2>
        <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-sm font-bold">
          {visitRequests.length}
        </span>
      </div>

      {visitRequests.length === 0 ? (
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-8 text-center">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد طلبات زيارة</h3>
          <p className="text-gray-600">
            لم يتم استلام أي طلبات زيارة لهذا الموسم بعد
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visitRequests.map((request) => (
            <div key={request.id} className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {request.investor_name}
                  </h3>
                  <p className="text-sm text-gray-600">{request.investor_phone}</p>
                </div>
                <div>
                  {getStatusBadge(request.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">نوع الزيارة</p>
                  <p className="font-bold text-gray-900 text-sm">{getVisitTypeText(request.visit_type)}</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">التاريخ المفضل</p>
                  <p className="font-bold text-gray-900 text-sm">
                    {new Date(request.preferred_date).toLocaleDateString('ar-SA')}
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">الفترة</p>
                  <p className="font-bold text-gray-900 text-sm">{getTimeText(request.preferred_time)}</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">تاريخ الطلب</p>
                  <p className="font-bold text-gray-900 text-sm">
                    {new Date(request.created_at).toLocaleDateString('ar-SA')}
                  </p>
                </div>
              </div>

              {request.notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-blue-700 font-medium mb-1">ملاحظات المستثمر:</p>
                  <p className="text-sm text-blue-900">{request.notes}</p>
                </div>
              )}

              {request.admin_notes && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-600 font-medium mb-1">ملاحظات الإدارة:</p>
                  <p className="text-sm text-gray-900">{request.admin_notes}</p>
                </div>
              )}

              <div className="flex gap-2">
                {request.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus('scheduled')}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      جدولة الزيارة
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('cancelled')}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      إلغاء الطلب
                    </button>
                  </>
                )}

                {request.status === 'scheduled' && (
                  <button
                    onClick={() => handleUpdateStatus('completed')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    تم تنفيذ الزيارة
                  </button>
                )}

                <button
                  onClick={() => setEditingRequest(request)}
                  className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  إضافة ملاحظات
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b-2 border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">تحديث الطلب</h3>
              <button
                onClick={() => setEditingRequest(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Send className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تحديث الحالة
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleUpdateStatus('scheduled', editingRequest.admin_notes)}
                    disabled={updating}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                  >
                    جدولة
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('completed', editingRequest.admin_notes)}
                    disabled={updating}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                  >
                    تم التنفيذ
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('cancelled', editingRequest.admin_notes)}
                    disabled={updating}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات الإدارة
                </label>
                <textarea
                  value={editingRequest.admin_notes || ''}
                  onChange={(e) => setEditingRequest({ ...editingRequest, admin_notes: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  rows={4}
                  placeholder="أدخل ملاحظات للمستثمر..."
                />
              </div>

              <button
                onClick={() => handleUpdateStatus(editingRequest.status, editingRequest.admin_notes)}
                disabled={updating}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {updating ? 'جاري الحفظ...' : 'حفظ الملاحظات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
