import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  AlertTriangle,
  Building2,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Shield
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ExecutiveOpsRoomB2FProps {
  onBack: () => void;
}

interface PulseData {
  bookings_today: number;
  bookings_unprocessed: number;
  farms_not_ready: number;
  critical_alerts: number;
  updated_at: string;
}

interface OwnerData {
  staff_id: string;
  name: string;
  assigned_at: string;
}

interface Decision {
  id: string;
  title: string;
  description: string;
  priority: string;
  requested_by_name: string;
  created_at: string;
  decision_type: string;
}

interface MasterAction {
  action_code: string;
  action_name_ar: string;
  description: string;
  danger_level: string;
}

export default function ExecutiveOpsRoomB2F({ onBack }: ExecutiveOpsRoomB2FProps) {
  const [pulse, setPulse] = useState<PulseData | null>(null);
  const [owners, setOwners] = useState<{ b2f: OwnerData | null; farm_command: OwnerData | null }>({ b2f: null, farm_command: null });
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [actions, setActions] = useState<MasterAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingDecision, setProcessingDecision] = useState<string | null>(null);

  useEffect(() => {
    loadRoomData();
    const interval = setInterval(loadRoomData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadRoomData = async () => {
    try {
      const [pulseRes, ownersRes, decisionsRes, actionsRes] = await Promise.all([
        supabase.rpc('get_executive_pulse_b2f'),
        supabase.rpc('get_executive_owners'),
        supabase.rpc('get_executive_decision_queue', { p_section: 'b2f' }),
        supabase.from('executive_master_actions').select('*').eq('section', 'b2f').eq('is_active', true)
      ]);

      if (pulseRes.data) setPulse(pulseRes.data);
      if (ownersRes.data) {
        setOwners({
          b2f: ownersRes.data.b2f,
          farm_command: ownersRes.data.farm_command
        });
      }
      if (decisionsRes.data) setDecisions(decisionsRes.data);
      if (actionsRes.data) setActions(actionsRes.data);
    } catch (error) {
      console.error('Error loading room data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (decisionId: string, status: 'approved' | 'rejected') => {
    setProcessingDecision(decisionId);

    try {
      const staffId = sessionStorage.getItem('staff_id');
      if (!staffId) {
        alert('غير مصرح');
        return;
      }

      const { error } = await supabase.rpc('decide_on_request', {
        p_decision_id: decisionId,
        p_decided_by: staffId,
        p_status: status,
        p_notes: status === 'approved' ? 'تم الاعتماد' : 'تم الرفض'
      });

      if (error) throw error;

      alert(status === 'approved' ? 'تم اعتماد القرار' : 'تم رفض القرار');
      loadRoomData();
    } catch (error: any) {
      console.error('Error processing decision:', error);
      alert('حدث خطأ: ' + error.message);
    } finally {
      setProcessingDecision(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-300';
      case 'urgent': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'high': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'medium': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getDangerColor = (level: string) => {
    switch (level) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-amber-500 bg-amber-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>العودة</span>
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border-2 border-emerald-200">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">غرفة عمليات B2F</h1>
              <p className="text-sm text-gray-600">Farm Investment Operations Room</p>
            </div>
          </div>

          {pulse && (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm text-emerald-700 font-medium">الحجوزات اليوم</span>
                </div>
                <div className="text-3xl font-bold text-emerald-900">{pulse.bookings_today}</div>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span className="text-sm text-amber-700 font-medium">غير معالج</span>
                </div>
                <div className="text-3xl font-bold text-amber-900">{pulse.bookings_unprocessed}</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-blue-700 font-medium">مزارع غير جاهزة</span>
                </div>
                <div className="text-3xl font-bold text-blue-900">{pulse.farms_not_ready}</div>
              </div>
              <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-red-700 font-medium">تنبيهات حرجة</span>
                </div>
                <div className="text-3xl font-bold text-red-900">{pulse.critical_alerts}</div>
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
                <h2 className="text-xl font-bold text-gray-900">قائمة القرارات</h2>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                  {decisions.length}
                </span>
              </div>

              {decisions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>لا توجد قرارات معلقة</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {decisions.map((decision) => (
                    <div
                      key={decision.id}
                      className="border-2 border-gray-200 rounded-lg p-4 hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-gray-900">{decision.title}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(decision.priority)}`}>
                              {decision.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{decision.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>طلب من: {decision.requested_by_name}</span>
                            <span>•</span>
                            <span>{new Date(decision.created_at).toLocaleDateString('ar-SA')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDecision(decision.id, 'approved')}
                          disabled={processingDecision === decision.id}
                          className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>اعتماد</span>
                        </button>
                        <button
                          onClick={() => handleDecision(decision.id, 'rejected')}
                          disabled={processingDecision === decision.id}
                          className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>رفض</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-6 h-6 text-emerald-600" />
                <h2 className="text-xl font-bold text-gray-900">المسؤولين</h2>
              </div>

              <div className="space-y-4">
                <div className="border-2 border-emerald-200 rounded-lg p-4 bg-emerald-50">
                  <div className="text-xs text-emerald-700 font-medium mb-2">مساعد المدير العام</div>
                  {owners.b2f && owners.b2f.name ? (
                    <div className="font-bold text-gray-900">{owners.b2f.name}</div>
                  ) : (
                    <div className="text-sm text-gray-500">لم يتم التعيين</div>
                  )}
                </div>

                <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                  <div className="text-xs text-blue-700 font-medium mb-2">مدير المزارع الوطني</div>
                  {owners.farm_command && owners.farm_command.name ? (
                    <div className="font-bold text-gray-900">{owners.farm_command.name}</div>
                  ) : (
                    <div className="text-sm text-gray-500">لم يتم التعيين</div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-gray-600" />
                <h2 className="text-xl font-bold text-gray-900">إجراءات تنفيذية</h2>
              </div>

              <div className="space-y-3">
                {actions.map((action) => (
                  <button
                    key={action.action_code}
                    className={`w-full p-3 rounded-lg border-2 text-right hover:shadow-md transition-all ${getDangerColor(action.danger_level)}`}
                  >
                    <div className="font-medium text-gray-900 text-sm mb-1">
                      {action.action_name_ar}
                    </div>
                    <div className="text-xs text-gray-600">{action.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
