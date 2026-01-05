import { useState } from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useApprovalRequests } from '../../hooks/useApprovalRequests';

export default function ApprovalRequestsPanel() {
  const { requests, loading, approveRequest, rejectRequest, getRequestTypeLabel, getStatusLabel } = useApprovalRequests();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

  const handleApprove = async (requestId: string) => {
    if (!confirm('هل تريد الموافقة على هذا الطلب؟')) return;

    setProcessingId(requestId);
    const result = await approveRequest(requestId, 'admin_user', 'تمت الموافقة من القيادة');
    setProcessingId(null);

    if (result.success) {
      alert('تمت الموافقة بنجاح');
    } else {
      alert('حدث خطأ: ' + result.error);
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt('أدخل سبب الرفض:');
    if (!reason) return;

    setProcessingId(requestId);
    const result = await rejectRequest(requestId, 'admin_user', reason);
    setProcessingId(null);

    if (result.success) {
      alert('تم رفض الطلب');
    } else {
      alert('حدث خطأ: ' + result.error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-3">
        {['all', 'pending', 'approved', 'rejected'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-emerald-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {f === 'all' && 'الكل'}
            {f === 'pending' && 'قيد الانتظار'}
            {f === 'approved' && 'تمت الموافقة'}
            {f === 'rejected' && 'مرفوضة'}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">لا توجد طلبات</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {getRequestTypeLabel(request.request_type)}
                    </h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        request.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : request.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {getStatusLabel(request.status)}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    {request.farm && (
                      <div>المزرعة: {request.farm.name}</div>
                    )}
                    {request.requester && (
                      <div>الطالب: {request.requester.name_ar}</div>
                    )}
                    <div>التاريخ: {new Date(request.created_at).toLocaleString('ar-SA')}</div>
                  </div>

                  {request.request_data && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 font-mono">
                        {JSON.stringify(request.request_data, null, 2)}
                      </p>
                    </div>
                  )}

                  {request.review_notes && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-900">
                        <span className="font-semibold">ملاحظات المراجعة:</span> {request.review_notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {request.status === 'pending' && (
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleApprove(request.id)}
                    disabled={processingId === request.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 transition-colors"
                  >
                    {processingId === request.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    الموافقة
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    disabled={processingId === request.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 transition-colors"
                  >
                    {processingId === request.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    الرفض
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
