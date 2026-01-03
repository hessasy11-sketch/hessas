import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { ArrowRight, MapPin, Users, FileText, Loader2, Clock, TrendingUp, Plus, PlayCircle, Edit3, Image as ImageIcon, CheckCircle, ClipboardList, UserCheck, Settings, Info, TreePine } from 'lucide-react';
import AddOperationUpdateModal from './AddOperationUpdateModal';
import SupervisorTasksView from '../supervisor/SupervisorTasksView';
import FarmManagerApprovalsView from '../manager/FarmManagerApprovalsView';
import CreateTaskModal from '../manager/CreateTaskModal';
import FarmTeamManagement from './FarmTeamManagement';

interface Farm {
  id: string;
  name: string;
  location: string;
  city: string;
  total_trees_available: number;
}

interface FarmOperation {
  id: string;
  current_phase: string;
  progress_percentage: number;
  last_update_title: string;
  last_update_description: string;
  last_update_date: string;
  is_active: boolean;
}

interface Contract {
  id: string;
  contract_number: string;
  investor_phone: string;
  trees_count: number;
  investor_account?: {
    full_name: string;
  };
}

interface OperationUpdate {
  id: string;
  update_type: string;
  title: string;
  description: string;
  created_at: string;
  admin_name?: string;
  related_phase?: string;
  images?: any[];
}

interface FarmOperationPageProps {
  farmId: string;
  onBack: () => void;
}

export default function FarmOperationPage({ farmId, onBack }: FarmOperationPageProps) {
  const [farm, setFarm] = useState<Farm | null>(null);
  const [operation, setOperation] = useState<FarmOperation | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [updates, setUpdates] = useState<OperationUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUpdate, setShowAddUpdate] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'farm_management' | 'farm_team' | 'updates' | 'contracts' | 'history' | 'tasks' | 'approvals'>('overview');
  const [userRole, setUserRole] = useState<'farm_manager' | 'farm_supervisor' | 'admin' | null>(null);

  useEffect(() => {
    loadData();
    loadUserRole();
  }, [farmId]);

  const loadUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserRole(null);
        return;
      }

      // أولاً: التحقق من كونه مدير نظام B2F
      const { data: isAdmin, error: adminError } = await supabase.rpc('is_system_admin', {
        check_user_id: user.id
      });

      if (!adminError && isAdmin) {
        setUserRole('admin');
        return;
      }

      // ثانياً: التحقق من دوره في farm_team_members مع التأكد من وجود user_id
      const { data: teamMember } = await supabase
        .from('farm_team_members')
        .select('role, is_active, user_id')
        .eq('farm_id', farmId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .not('user_id', 'is', null) // شرط أساسي: user_id موجود
        .maybeSingle();

      if (teamMember && teamMember.user_id) {
        setUserRole(teamMember.role as 'farm_manager' | 'farm_supervisor');
      } else {
        setUserRole(null); // لا يوجد دور صالح
      }
    } catch (error) {
      console.error('Error loading user role:', error);
      setUserRole(null);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // جلب بيانات المزرعة
      const { data: farmData, error: farmError } = await supabase
        .from('b2f_farms')
        .select('*')
        .eq('id', farmId)
        .single();

      if (farmError) throw farmError;
      setFarm(farmData);

      // جلب التشغيل النشط
      const { data: operationData } = await supabase
        .from('b2f_farm_operations')
        .select('*')
        .eq('farm_id', farmId)
        .eq('is_active', true)
        .maybeSingle();

      setOperation(operationData);

      // جلب العقود المرتبطة
      const { data: contractsData } = await supabase
        .from('b2f_contracts')
        .select(`
          *,
          investor_account:b2f_investor_accounts(full_name)
        `)
        .eq('farm_id', farmId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      setContracts(contractsData || []);

      // جلب التحديثات إذا كان هناك تشغيل نشط
      if (operationData) {
        const { data: updatesData } = await supabase
          .from('b2f_farm_operation_updates')
          .select('*')
          .eq('farm_operation_id', operationData.id)
          .order('created_at', { ascending: false });

        setUpdates(updatesData || []);
      }
    } catch (error) {
      console.error('Error loading farm data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOperation = async () => {
    if (!farm) return;

    try {
      const { data, error } = await supabase.rpc('create_farm_operation', {
        p_farm_id: farmId,
        p_initial_phase: 'preparation'
      });

      if (error) throw error;

      if (data?.success) {
        alert('تم إنشاء التشغيل بنجاح');
        loadData();
      } else {
        alert(data?.error || 'حدث خطأ');
      }
    } catch (error) {
      console.error('Error creating operation:', error);
      alert('حدث خطأ أثناء إنشاء التشغيل');
    }
  };

  const getUpdateTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      phase_change: TrendingUp,
      progress_update: Clock,
      maintenance: Edit3,
      irrigation: 'droplet',
      fertilization: 'sprout',
      pest_control: 'shield',
      harvest: 'package',
      general: 'info'
    };
    return icons[type] || Clock;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!farm) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">المزرعة غير موجودة</p>
      </div>
    );
  }

  const totalInvestors = new Set(contracts.map(c => c.investor_phone)).size;
  const totalTrees = contracts.reduce((sum, c) => sum + c.trees_count, 0);

  return (
    <div className="space-y-6">
      {/* الرأس */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
          العودة لقائمة المزارع
        </button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{farm.name}</h1>
            <div className="flex items-center gap-4 text-emerald-100">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {farm.location}
              </span>
              <span>•</span>
              <span>{farm.city}</span>
            </div>
          </div>

          {!operation && (
            <button
              onClick={handleCreateOperation}
              className="px-6 py-3 bg-white text-emerald-600 rounded-lg font-semibold hover:bg-emerald-50 transition-all flex items-center gap-2 shadow-lg"
            >
              <PlayCircle className="w-5 h-5" />
              تفعيل التشغيل
            </button>
          )}
        </div>

        {/* الإحصائيات */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold mb-1">{contracts.length}</div>
            <div className="text-sm text-emerald-100">عقد نشط</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold mb-1">{totalInvestors}</div>
            <div className="text-sm text-emerald-100">مستثمر</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold mb-1">{totalTrees.toLocaleString()}</div>
            <div className="text-sm text-emerald-100">شجرة</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold mb-1">{operation?.progress_percentage || 0}%</div>
            <div className="text-sm text-emerald-100">نسبة التقدم</div>
          </div>
        </div>
      </div>

      {!operation ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <PlayCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">التشغيل غير مفعّل</h3>
          <p className="text-gray-600 mb-6">
            لبدء تسجيل التحديثات التشغيلية، قم بتفعيل التشغيل أولاً
          </p>
          <button
            onClick={handleCreateOperation}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
          >
            <PlayCircle className="w-5 h-5" />
            تفعيل التشغيل الآن
          </button>
        </div>
      ) : (
        <>
          {/* التبويبات */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="border-b border-gray-200">
              <div className="flex gap-2 p-2 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex-1 min-w-[120px] px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'overview'
                      ? 'bg-emerald-500 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  نظرة عامة
                </button>
                <button
                  onClick={() => setActiveTab('farm_management')}
                  className={`flex-1 min-w-[140px] px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'farm_management'
                      ? 'bg-emerald-500 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  إدارة المزرعة
                </button>
                <button
                  onClick={() => setActiveTab('farm_team')}
                  className={`flex-1 min-w-[160px] px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'farm_team'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  إدارة فريق المزرعة
                </button>
                <button
                  onClick={() => setActiveTab('updates')}
                  className={`flex-1 min-w-[120px] px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'updates'
                      ? 'bg-emerald-500 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  سجل التحديثات ({updates.length})
                </button>

                {/* تبويب مهامي - للمشرفين */}
                {userRole === 'farm_supervisor' && (
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className={`flex-1 min-w-[120px] px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'tasks'
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    مهامي
                  </button>
                )}

                {/* تبويب اعتمادات المشرفين - للمدراء */}
                {(userRole === 'farm_manager' || userRole === 'admin') && (
                  <button
                    onClick={() => setActiveTab('approvals')}
                    className={`flex-1 min-w-[180px] px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'approvals'
                        ? 'bg-purple-500 text-white shadow-lg'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    اعتمادات المشرفين
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('contracts')}
                  className={`flex-1 min-w-[150px] px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'contracts'
                      ? 'bg-emerald-500 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  العقود المرتبطة ({contracts.length})
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 min-w-[120px] px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'history'
                      ? 'bg-emerald-500 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  السجل التاريخي
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* نظرة عامة */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* آخر تحديث */}
                  {operation.last_update_title && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-emerald-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-emerald-900 mb-1">
                            {operation.last_update_title}
                          </h4>
                          <p className="text-sm text-emerald-700 mb-2">
                            {operation.last_update_description}
                          </p>
                          <p className="text-xs text-emerald-600">
                            {new Date(operation.last_update_date).toLocaleDateString('ar-SA', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* أزرار الإجراءات */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* زر إضافة تحديث */}
                    <button
                      onClick={() => setShowAddUpdate(true)}
                      className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                    >
                      <Plus className="w-5 h-5" />
                      إضافة تحديث تشغيلي
                    </button>

                    {/* زر إنشاء مهمة - للمدراء فقط */}
                    {(userRole === 'farm_manager' || userRole === 'admin') && (
                      <button
                        onClick={() => setShowCreateTask(true)}
                        className="px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                      >
                        <ClipboardList className="w-5 h-5" />
                        إنشاء مهمة للمشرف
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 text-center">
                    سيصل التحديث تلقائياً لـ <span className="font-bold text-emerald-600">{totalInvestors}</span> مستثمر
                    لديهم <span className="font-bold text-emerald-600">{contracts.length}</span> عقد نشط
                  </p>
                </div>
              )}

              {/* إدارة المزرعة */}
              {activeTab === 'farm_management' && (
                <div className="space-y-6">
                  {/* معلومات المزرعة الأساسية */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center">
                        <Info className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">معلومات المزرعة</h3>
                        <p className="text-sm text-gray-600">البيانات الأساسية للمزرعة</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-emerald-100">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-emerald-600 mt-0.5" />
                          <div>
                            <div className="text-xs text-gray-500 mb-1">الموقع</div>
                            <div className="font-semibold text-gray-900">{farm.location}</div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-emerald-100">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-emerald-600 mt-0.5" />
                          <div>
                            <div className="text-xs text-gray-500 mb-1">المدينة</div>
                            <div className="font-semibold text-gray-900">{farm.city}</div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-emerald-100">
                        <div className="flex items-start gap-3">
                          <TreePine className="w-5 h-5 text-emerald-600 mt-0.5" />
                          <div>
                            <div className="text-xs text-gray-500 mb-1">إجمالي الأشجار</div>
                            <div className="font-semibold text-gray-900">{farm.total_trees_available.toLocaleString()} شجرة</div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-emerald-100">
                        <div className="flex items-start gap-3">
                          <TreePine className="w-5 h-5 text-emerald-600 mt-0.5" />
                          <div>
                            <div className="text-xs text-gray-500 mb-1">الأشجار المستثمرة</div>
                            <div className="font-semibold text-gray-900">{totalTrees.toLocaleString()} شجرة</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* إحصائيات التعاقد */}
                  <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">إحصائيات التعاقد</h3>
                        <p className="text-sm text-gray-600">العقود والمستثمرين النشطين</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-blue-100 text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-1">
                          {contracts.length}
                        </div>
                        <div className="text-sm text-gray-600">عقد نشط</div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-blue-100 text-center">
                        <div className="text-3xl font-bold text-teal-600 mb-1">
                          {totalInvestors}
                        </div>
                        <div className="text-sm text-gray-600">مستثمر</div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-blue-100 text-center">
                        <div className="text-3xl font-bold text-emerald-600 mb-1">
                          {totalTrees.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">شجرة متعاقد عليها</div>
                      </div>
                    </div>
                  </div>

                  {/* حالة التشغيل */}
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
                        <Settings className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">حالة التشغيل</h3>
                        <p className="text-sm text-gray-600">معلومات التشغيل الحالية</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-amber-100">
                        <div className="text-xs text-gray-500 mb-2">المرحلة الحالية</div>
                        <div className="font-semibold text-gray-900 text-lg">
                          {operation.current_phase || 'لم يبدأ'}
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-amber-100">
                        <div className="text-xs text-gray-500 mb-2">نسبة التقدم</div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-amber-500 h-3 rounded-full transition-all"
                                style={{ width: `${operation.progress_percentage}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-2xl font-bold text-amber-600">
                            {operation.progress_percentage}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* إجراءات الإدارة */}
                  <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">إجراءات الإدارة</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <button className="px-4 py-3 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-emerald-500 text-gray-700 hover:text-emerald-600 rounded-lg font-medium transition-all flex items-center justify-center gap-2">
                        <Edit3 className="w-5 h-5" />
                        تعديل معلومات المزرعة
                      </button>

                      <button className="px-4 py-3 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-amber-500 text-gray-700 hover:text-amber-600 rounded-lg font-medium transition-all flex items-center justify-center gap-2">
                        <Settings className="w-5 h-5" />
                        إعدادات التشغيل
                      </button>

                      <button className="px-4 py-3 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-teal-500 text-gray-700 hover:text-teal-600 rounded-lg font-medium transition-all flex items-center justify-center gap-2">
                        <FileText className="w-5 h-5" />
                        تقارير الإدارة
                      </button>

                      <button className="px-4 py-3 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-cyan-500 text-gray-700 hover:text-cyan-600 rounded-lg font-medium transition-all flex items-center justify-center gap-2">
                        <MapPin className="w-5 h-5" />
                        إدارة القطاعات
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* إدارة فريق المزرعة */}
              {activeTab === 'farm_team' && (
                <FarmTeamManagement farmId={farmId} userRole={userRole} />
              )}

              {/* سجل التحديثات */}
              {activeTab === 'updates' && (
                <div className="space-y-4">
                  {updates.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">لا توجد تحديثات بعد</p>
                    </div>
                  ) : (
                    updates.map((update) => {
                      const Icon = getUpdateTypeIcon(update.update_type);
                      return (
                        <div
                          key={update.id}
                          className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                        >
                          <div className="flex items-start gap-3">
                            {typeof Icon === 'function' ? (
                              <Icon className="w-5 h-5 text-emerald-600 mt-0.5" />
                            ) : (
                              <Clock className="w-5 h-5 text-emerald-600 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-1">
                                {update.title}
                              </h4>
                              <p className="text-sm text-gray-700 mb-2">
                                {update.description}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>
                                  {new Date(update.created_at).toLocaleDateString('ar-SA', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                {update.admin_name && (
                                  <>
                                    <span>•</span>
                                    <span>بواسطة: {update.admin_name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* العقود المرتبطة */}
              {activeTab === 'contracts' && (
                <div className="space-y-3">
                  {contracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">
                            {contract.investor_account?.full_name || 'مستثمر'}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>رقم العقد: {contract.contract_number}</span>
                            <span>•</span>
                            <span>{contract.investor_phone}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-emerald-600">
                            {contract.trees_count}
                          </div>
                          <div className="text-xs text-gray-500">شجرة</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* السجل التاريخي - للإدارة */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-blue-900 mb-1">سجل الإدارة</h4>
                    <p className="text-sm text-blue-700">
                      جميع العمليات التشغيلية المسجلة على هذه المزرعة مع حالة الإرسال للمستثمرين
                    </p>
                  </div>

                  {updates.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">لا توجد سجلات تشغيلية بعد</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-100 border-b border-gray-200">
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">التاريخ</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">نوع العملية</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">العنوان</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الوصف</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">تم الإرسال؟</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">عدد المستثمرين</th>
                          </tr>
                        </thead>
                        <tbody>
                          {updates.map((update: any) => (
                            <tr key={update.id} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {new Date(update.created_at).toLocaleDateString('ar-SA', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                  {update.update_type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {update.title}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                                {update.description}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {update.sent_to_investors ? (
                                  <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                                ) : (
                                  <span className="text-xs text-gray-500">لا</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {update.sent_to_investors ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                    {update.investors_count || 0}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* تبويب مهامي - للمشرفين */}
              {activeTab === 'tasks' && userRole === 'farm_supervisor' && (
                <SupervisorTasksView />
              )}

              {/* تبويب اعتمادات المشرفين - للمدراء */}
              {activeTab === 'approvals' && (userRole === 'farm_manager' || userRole === 'admin') && (
                <FarmManagerApprovalsView farmId={farmId} />
              )}
            </div>
          </div>
        </>
      )}

      {/* نافذة إضافة تحديث */}
      {showAddUpdate && operation && (
        <AddOperationUpdateModal
          farmId={farmId}
          farmName={farm.name}
          affectedContracts={contracts.length}
          onClose={() => setShowAddUpdate(false)}
          onSuccess={() => {
            setShowAddUpdate(false);
            loadData();
          }}
        />
      )}

      {/* نافذة إنشاء مهمة */}
      {showCreateTask && (
        <CreateTaskModal
          farmId={farmId}
          onClose={() => setShowCreateTask(false)}
          onSuccess={() => {
            setShowCreateTask(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
