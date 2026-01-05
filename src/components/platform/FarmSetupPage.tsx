import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFarmSetup } from '../../hooks/useFarmSetup';
import { supabase } from '../../lib/supabase';
import {
  Tractor,
  Users,
  CheckCircle,
  AlertTriangle,
  UserPlus,
  Plus,
  Loader2,
  ArrowRight,
  Lock,
  Info,
  ChevronRight
} from 'lucide-react';

interface Farm {
  id: string;
  name: string;
  location: string;
  city: string;
  total_trees_available: number;
}

interface StaffMember {
  id: string;
  name_ar: string;
  staff_code: string;
  department: string;
  role: string;
}

export default function FarmSetupPage() {
  const { farmId } = useParams<{ farmId: string }>();
  const navigate = useNavigate();
  const { operationalFarm, teams, loading, assignFarmManager, createTeam, isSetupComplete, refetch } = useFarmSetup(farmId || null);

  const [farm, setFarm] = useState<Farm | null>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [teamName, setTeamName] = useState('');
  const [teamRole, setTeamRole] = useState('operations');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (farmId) {
      loadFarmDetails();
      loadStaffList();
    }
  }, [farmId]);

  const loadFarmDetails = async () => {
    if (!farmId) return;

    const { data, error } = await supabase
      .from('b2f_farms')
      .select('id, name, location, city, total_trees_available')
      .eq('id', farmId)
      .maybeSingle();

    if (error) {
      console.error('Error loading farm:', error);
      return;
    }

    setFarm(data);
  };

  const loadStaffList = async () => {
    const { data, error } = await supabase
      .from('platform_staff')
      .select('id, name_ar, staff_code, department, role')
      .eq('is_active', true)
      .order('name_ar');

    if (error) {
      console.error('Error loading staff:', error);
      return;
    }

    setStaffList(data || []);
  };

  const handleAssignManager = async () => {
    if (!selectedStaff) return;

    setSubmitting(true);
    const result = await assignFarmManager(selectedStaff);
    setSubmitting(false);

    if (result.success) {
      setShowManagerModal(false);
      setSelectedStaff('');
      refetch();
    } else {
      alert('حدث خطأ: ' + result.error);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName) return;

    setSubmitting(true);
    const result = await createTeam({
      team_name: teamName,
      team_role: teamRole
    });
    setSubmitting(false);

    if (result.success) {
      setShowTeamModal(false);
      setTeamName('');
      setTeamRole('operations');
      refetch();
    } else {
      alert('حدث خطأ: ' + result.error);
    }
  };

  if (loading || !farm) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!operationalFarm) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              المزرعة غير مُفعلة تشغيلياً
            </h2>
            <p className="text-gray-600 mb-6">
              يجب إصدار عقد واحد على الأقل لهذه المزرعة لتفعيلها تلقائياً
            </p>
            <button
              onClick={() => navigate('/admin/b2f/sales')}
              className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              الذهاب إلى إدارة المبيعات
            </button>
          </div>
        </div>
      </div>
    );
  }

  const setupComplete = isSetupComplete();
  const readinessScore = operationalFarm.readiness_score || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Farm Header */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <Tractor className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-1">{farm.name}</h1>
                <p className="text-emerald-100 text-sm">
                  {farm.location} • {farm.city}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{readinessScore}%</div>
              <div className="text-sm text-emerald-100">نسبة الجاهزية</div>
            </div>
          </div>
        </div>

        {/* Setup Status Banner */}
        {!setupComplete && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-yellow-900 font-semibold mb-1">
                  إعداد المزرعة غير مكتمل
                </p>
                <p className="text-sm text-yellow-700 mb-3">
                  يجب إتمام الإعداد الأولي قبل الوصول للعمليات والمهام والبلاغات
                </p>
                <div className="flex items-center gap-2 text-sm text-yellow-800">
                  <Info className="w-4 h-4" />
                  <span>المتطلبات: مدير مزرعة + فريق واحد على الأقل</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {setupComplete && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div className="flex-1">
                <p className="text-green-900 font-semibold">
                  الإعداد مكتمل - المزرعة جاهزة للتشغيل
                </p>
                <p className="text-sm text-green-700">
                  يمكنك الآن الوصول لجميع العمليات والمهام
                </p>
              </div>
              <button
                onClick={() => navigate(`/admin/b2f/farm-command/${farmId}/operations`)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                انتقل للعمليات
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Farm Manager Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-gray-900">مدير المزرعة</h3>
              </div>
              {operationalFarm.farm_manager_id ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              )}
            </div>

            {operationalFarm.farm_manager_id ? (
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                <p className="text-sm text-emerald-700 mb-1">المدير الحالي:</p>
                <p className="text-lg font-semibold text-emerald-900">
                  {operationalFarm.farm_manager_name}
                </p>
                <button
                  onClick={() => setShowManagerModal(true)}
                  className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  تغيير المدير
                </button>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 text-sm mb-4">
                  قم بتعيين مدير للمزرعة ليكون مسؤولاً عن جميع العمليات
                </p>
                <button
                  onClick={() => setShowManagerModal(true)}
                  className="w-full px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-5 h-5" />
                  تعيين مدير المزرعة
                </button>
              </div>
            )}
          </div>

          {/* Teams Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-gray-900">الفرق العاملة</h3>
              </div>
              {teams.length > 0 ? (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold">
                  {teams.length} فريق
                </span>
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              )}
            </div>

            {teams.length > 0 ? (
              <div className="space-y-2 mb-4">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{team.team_name}</p>
                        <p className="text-xs text-gray-600">
                          {team.members_count} عضو
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {team.team_role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm mb-4">
                قم بإنشاء فريق واحد على الأقل لبدء التشغيل
              </p>
            )}

            <button
              onClick={() => setShowTeamModal(true)}
              className="w-full px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              إنشاء فريق جديد
            </button>
          </div>
        </div>

        {/* Hard Gate - Locked Operations */}
        {!setupComplete && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'المهام اليومية', icon: CheckCircle },
              { label: 'الإدارة المالية', icon: Tractor },
              { label: 'البلاغات الفنية', icon: AlertTriangle }
            ].map((item, index) => (
              <div
                key={index}
                className="bg-gray-100 rounded-xl p-6 text-center border-2 border-dashed border-gray-300 opacity-60"
              >
                <Lock className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">{item.label}</p>
                <p className="text-xs text-gray-500 mt-1">مقفل حتى إتمام الإعداد</p>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Assign Manager Modal */}
      {showManagerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              تعيين مدير المزرعة
            </h3>

            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4"
            >
              <option value="">اختر الموظف...</option>
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name_ar} - {staff.staff_code} ({staff.role})
                </option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={() => setShowManagerModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={submitting}
              >
                إلغاء
              </button>
              <button
                onClick={handleAssignManager}
                disabled={!selectedStaff || submitting}
                className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {submitting ? 'جاري الحفظ...' : 'تعيين'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              إنشاء فريق جديد
            </h3>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم الفريق
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="مثال: فريق الري والتسميد"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  دور الفريق
                </label>
                <select
                  value={teamRole}
                  onChange={(e) => setTeamRole(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                >
                  <option value="operations">عمليات</option>
                  <option value="maintenance">صيانة</option>
                  <option value="harvest">حصاد</option>
                  <option value="irrigation">ري</option>
                  <option value="fertilization">تسميد</option>
                  <option value="pest_control">مكافحة آفات</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTeamModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={submitting}
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateTeam}
                disabled={!teamName || submitting}
                className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {submitting ? 'جاري الإنشاء...' : 'إنشاء'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
