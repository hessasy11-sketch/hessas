import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  PackageCheck,
  Gift,
  Heart,
  ArrowRightLeft,
  HelpCircle,
  Filter,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Edit3,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useSystemMessages } from '../../../hooks/useSystemMessages';
import SystemMessageBanner from '../SystemMessageBanner';

interface ServiceRequest {
  id: string;
  investorName: string;
  investorPhone: string;
  serviceType: string;
  status: string;
  contractNumber: string;
  requestDetails: any;
  investorNotes: string | null;
  adminNotes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  farm: {
    name: string;
    city: string;
  };
  serviceTypeInfo: {
    nameAr: string;
    icon: string;
    color: string;
  };
}

interface ServiceType {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string;
  icon: string;
  color: string;
}

export default function InvestorServiceTab() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [stats, setStats] = useState<any>(null);
  const { getMessage } = useSystemMessages('investor_service');

  useEffect(() => {
    loadData();
  }, [selectedType, selectedStatus]);

  const loadData = async () => {
    try {
      setLoading(true);

      // جلب أنواع الخدمات
      const { data: typesData } = await supabase
        .from('b2f_service_types')
        .select('*')
        .order('order_number');

      if (typesData) setServiceTypes(typesData);

      // جلب الإحصائيات
      const { data: statsData } = await supabase.rpc('get_investor_service_stats');
      if (statsData) setStats(statsData);

      // جلب الطلبات
      let query = supabase
        .from('b2f_investor_service_requests')
        .select(`
          *,
          farm:b2f_farms(name, city)
        `)
        .order('created_at', { ascending: false });

      if (selectedType !== 'all') {
        query = query.eq('service_type', selectedType);
      }

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data: requestsData, error } = await query;

      if (error) throw error;

      // دمج بيانات نوع الخدمة
      const enrichedRequests = (requestsData || []).map(req => {
        const serviceType = typesData?.find(t => t.id === req.service_type);
        return {
          ...req,
          serviceTypeInfo: {
            nameAr: serviceType?.nameAr || req.service_type,
            icon: serviceType?.icon || 'help-circle',
            color: serviceType?.color || 'gray'
          }
        };
      });

      setRequests(enrichedRequests);
    } catch (error) {
      console.error('Error loading service requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getServiceIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      'package-check': PackageCheck,
      'gift': Gift,
      'heart': Heart,
      'file-transfer': ArrowRightLeft,
      'help-circle': HelpCircle
    };
    return icons[iconName] || HelpCircle;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
      new: { label: 'جديد', color: 'blue', icon: Clock },
      processing: { label: 'تحت المعالجة', color: 'amber', icon: Loader2 },
      completed: { label: 'مكتمل', color: 'emerald', icon: CheckCircle },
      completed_special: { label: 'مكتمل - تنفيذ خاص', color: 'green', icon: CheckCircle },
      rejected: { label: 'مرفوض', color: 'red', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.new;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 bg-${config.color}-100 text-${config.color}-700 text-xs font-semibold rounded-full`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* الإحصائيات */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 opacity-80" />
              <span className="text-2xl font-bold">{stats.total || 0}</span>
            </div>
            <p className="text-sm opacity-90">إجمالي الطلبات</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 opacity-80" />
              <span className="text-2xl font-bold">{stats.new || 0}</span>
            </div>
            <p className="text-sm opacity-90">طلبات جديدة</p>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <Loader2 className="w-5 h-5 opacity-80" />
              <span className="text-2xl font-bold">{stats.processing || 0}</span>
            </div>
            <p className="text-sm opacity-90">تحت المعالجة</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-5 h-5 opacity-80" />
              <span className="text-2xl font-bold">{stats.completed || 0}</span>
            </div>
            <p className="text-sm opacity-90">مكتملة</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <Filter className="w-5 h-5 opacity-80" />
              <span className="text-2xl font-bold">{requests.length}</span>
            </div>
            <p className="text-sm opacity-90">معروضة حالياً</p>
          </div>
        </div>
      )}

      {/* رسالة استلام الطلب */}
      {getMessage('investor_service', 'request_submitted') && (
        <SystemMessageBanner
          message={getMessage('investor_service', 'request_submitted')?.message_text || ''}
          icon={getMessage('investor_service', 'request_submitted')?.icon}
          type="info"
        />
      )}

      {/* الفلاتر */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
        {/* فلتر نوع الخدمة */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">نوع الخدمة</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedType === 'all'
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              الكل ({stats?.total || 0})
            </button>
            {serviceTypes.map(type => {
              const Icon = getServiceIcon(type.icon);
              const count = stats?.byType?.[type.id] || 0;

              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedType === type.id
                      ? `bg-${type.color}-500 text-white shadow-lg`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {type.nameAr} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* فلتر الحالة */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">حالة الطلب</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedStatus === 'all'
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              الكل
            </button>
            {[
              { id: 'new', label: 'جديد', icon: Clock },
              { id: 'processing', label: 'تحت المعالجة', icon: Loader2 },
              { id: 'completed', label: 'مكتمل', icon: CheckCircle },
              { id: 'rejected', label: 'مرفوض', icon: XCircle }
            ].map(status => {
              const Icon = status.icon;
              return (
                <button
                  key={status.id}
                  onClick={() => setSelectedStatus(status.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedStatus === status.id
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {status.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* قائمة الطلبات */}
      {requests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد طلبات</h3>
          <p className="text-gray-600">
            {selectedType === 'all' && selectedStatus === 'all'
              ? 'لم يتم تقديم أي طلبات خدمة بعد'
              : 'لا توجد طلبات تطابق الفلاتر المحددة'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map(request => {
            const ServiceIcon = getServiceIcon(request.serviceTypeInfo.icon);
            const color = request.serviceTypeInfo.color;

            return (
              <div
                key={request.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-3 bg-${color}-100 rounded-lg`}>
                        <ServiceIcon className={`w-6 h-6 text-${color}-600`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {request.investorName}
                          </h3>
                          {getStatusBadge(request.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{request.investorPhone}</span>
                          <span>•</span>
                          <span className={`font-medium text-${color}-600`}>
                            {request.serviceTypeInfo.nameAr}
                          </span>
                          <span>•</span>
                          <span>{request.farm?.name || 'غير محدد'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">رقم العقد</div>
                      <div className="text-sm font-mono font-semibold text-gray-900">
                        {request.contractNumber}
                      </div>
                    </div>
                  </div>

                  {/* تفاصيل الطلب */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="text-xs font-semibold text-gray-700 mb-2">تفاصيل الطلب</div>
                    <RequestDetails type={request.serviceType} details={request.requestDetails} />
                  </div>

                  {/* ملاحظات */}
                  {request.investorNotes && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <div className="text-xs font-semibold text-blue-900 mb-1">ملاحظات المستثمر</div>
                      <p className="text-sm text-blue-800">{request.investorNotes}</p>
                    </div>
                  )}

                  {request.adminNotes && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <div className="text-xs font-semibold text-green-900 mb-1">ملاحظات الإدارة</div>
                      <p className="text-sm text-green-800">{request.adminNotes}</p>
                    </div>
                  )}

                  {request.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <div className="text-xs font-semibold text-red-900 mb-1">سبب الرفض</div>
                      <p className="text-sm text-red-800">{request.rejectionReason}</p>
                    </div>
                  )}

                  {/* التاريخ */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <Clock className="w-4 h-4" />
                    <span>تاريخ الطلب: {new Date(request.createdAt).toLocaleDateString('ar-SA')}</span>
                  </div>

                  {/* أزرار الإجراءات */}
                  <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      معالجة الطلب
                    </button>
                    <button
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      التفاصيل الكاملة
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* نافذة معالجة الطلب */}
      {selectedRequest && (
        <ProcessRequestModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onSuccess={() => {
            setSelectedRequest(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// مكون عرض تفاصيل الطلب
function RequestDetails({ type, details }: { type: string; details: any }) {
  if (!details) return <p className="text-sm text-gray-600">لا توجد تفاصيل</p>;

  const renderDetails = () => {
    switch (type) {
      case 'harvest_delivery':
        return (
          <div className="space-y-1 text-sm">
            <p><span className="text-gray-600">العنوان:</span> <span className="font-medium">{details.address || 'غير محدد'}</span></p>
            <p><span className="text-gray-600">المدينة:</span> <span className="font-medium">{details.city || 'غير محدد'}</span></p>
            <p><span className="text-gray-600">الهاتف:</span> <span className="font-medium">{details.phone || 'غير محدد'}</span></p>
            {details.preferred_date && (
              <p><span className="text-gray-600">التاريخ المفضل:</span> <span className="font-medium">{details.preferred_date}</span></p>
            )}
          </div>
        );

      case 'gift_harvest':
        return (
          <div className="space-y-1 text-sm">
            <p><span className="text-gray-600">اسم المستلم:</span> <span className="font-medium">{details.recipient_name || 'غير محدد'}</span></p>
            <p><span className="text-gray-600">هاتف المستلم:</span> <span className="font-medium">{details.recipient_phone || 'غير محدد'}</span></p>
            <p><span className="text-gray-600">عنوان المستلم:</span> <span className="font-medium">{details.recipient_address || 'غير محدد'}</span></p>
            {details.message && (
              <p><span className="text-gray-600">رسالة:</span> <span className="font-medium">{details.message}</span></p>
            )}
          </div>
        );

      case 'charity_waqf':
        return (
          <div className="space-y-1 text-sm">
            {details.organization_name && (
              <p><span className="text-gray-600">الجهة:</span> <span className="font-medium">{details.organization_name}</span></p>
            )}
            {details.waqf_type && (
              <p><span className="text-gray-600">النوع:</span> <span className="font-medium">{details.waqf_type === 'general' ? 'وقف عام' : 'وقف خاص'}</span></p>
            )}
            {details.notes && (
              <p><span className="text-gray-600">ملاحظات:</span> <span className="font-medium">{details.notes}</span></p>
            )}
          </div>
        );

      case 'transfer_contract':
        return (
          <div className="space-y-1 text-sm">
            <p><span className="text-gray-600">المستفيد الجديد:</span> <span className="font-medium">{details.new_beneficiary_name || 'غير محدد'}</span></p>
            <p><span className="text-gray-600">هاتف المستفيد:</span> <span className="font-medium">{details.new_beneficiary_phone || 'غير محدد'}</span></p>
            {details.new_beneficiary_id && (
              <p><span className="text-gray-600">الهوية:</span> <span className="font-medium">{details.new_beneficiary_id}</span></p>
            )}
            {details.relationship && (
              <p><span className="text-gray-600">القرابة:</span> <span className="font-medium">{details.relationship}</span></p>
            )}
            {details.reason && (
              <p><span className="text-gray-600">السبب:</span> <span className="font-medium">{details.reason}</span></p>
            )}
          </div>
        );

      case 'inquiry_visit':
        return (
          <div className="space-y-1 text-sm">
            {details.inquiry_type && (
              <p><span className="text-gray-600">النوع:</span> <span className="font-medium">
                {details.inquiry_type === 'visit' ? 'زيارة' : details.inquiry_type === 'question' ? 'استفسار' : 'شكوى'}
              </span></p>
            )}
            {details.subject && (
              <p><span className="text-gray-600">الموضوع:</span> <span className="font-medium">{details.subject}</span></p>
            )}
            {details.message && (
              <p><span className="text-gray-600">الرسالة:</span> <span className="font-medium">{details.message}</span></p>
            )}
            {details.preferred_visit_date && (
              <p><span className="text-gray-600">تاريخ الزيارة المفضل:</span> <span className="font-medium">{details.preferred_visit_date}</span></p>
            )}
          </div>
        );

      default:
        return <pre className="text-xs text-gray-600">{JSON.stringify(details, null, 2)}</pre>;
    }
  };

  return <div>{renderDetails()}</div>;
}

// مكون معالجة الطلب
interface ProcessRequestModalProps {
  request: ServiceRequest;
  onClose: () => void;
  onSuccess: () => void;
}

function ProcessRequestModal({ request, onClose, onSuccess }: ProcessRequestModalProps) {
  const [newStatus, setNewStatus] = useState(request.status);
  const [adminNotes, setAdminNotes] = useState(request.adminNotes || '');
  const [rejectionReason, setRejectionReason] = useState(request.rejectionReason || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (newStatus === 'rejected' && !rejectionReason) {
      alert('الرجاء إدخال سبب الرفض');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('update_service_request_status', {
        p_request_id: request.id,
        p_new_status: newStatus,
        p_admin_notes: adminNotes || null,
        p_rejection_reason: newStatus === 'rejected' ? rejectionReason : null
      });

      if (error) throw error;

      alert('تم تحديث حالة الطلب بنجاح');
      onSuccess();
    } catch (error) {
      console.error('Error updating request:', error);
      alert('حدث خطأ أثناء التحديث');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">معالجة طلب الخدمة</h2>
          <p className="text-sm text-gray-600 mt-1">
            {request.investorName} • {request.serviceTypeInfo.nameAr}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* الحالة الجديدة */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              الحالة الجديدة
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'new', label: 'جديد', icon: Clock },
                { value: 'processing', label: 'تحت المعالجة', icon: Loader2 },
                { value: 'completed', label: 'مكتمل', icon: CheckCircle },
                { value: 'completed_special', label: 'مكتمل - تنفيذ خاص', icon: CheckCircle },
                { value: 'rejected', label: 'مرفوض', icon: XCircle }
              ].map(status => {
                const Icon = status.icon;
                return (
                  <button
                    key={status.value}
                    onClick={() => setNewStatus(status.value)}
                    className={`p-3 rounded-lg border-2 text-right transition-all ${
                      newStatus === status.value
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span className="font-medium text-gray-900 text-sm">{status.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ملاحظات الإدارة */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              ملاحظات الإدارة
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="أضف ملاحظات حول معالجة الطلب..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
          </div>

          {/* سبب الرفض */}
          {newStatus === 'rejected' && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                سبب الرفض *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="اكتب سبب رفض الطلب..."
                rows={3}
                className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              />
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري التحديث...
              </>
            ) : (
              'تحديث الطلب'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
