import { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  MapPin,
  UserCog,
  TreePine,
  Briefcase,
  ChevronRight,
  Plus,
  Edit3,
  Trash2,
  Eye,
  FileCheck,
  TrendingUp,
  Activity,
  Settings,
  Network
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import FarmsTab from '../B2F/tabs/FarmsTab';
import InvestmentApprovalsTab from '../B2F/tabs/InvestmentApprovalsTab';
import ManagementReportsView from '../B2F/admin/ManagementReportsView';
import MyFarmsTab from '../B2F/tabs/MyFarmsTab';
import EnhancedOperationsManagement from './EnhancedOperationsManagement';

interface FarmDirector {
  id: string;
  staff_id: string | null;
  name_ar: string;
  name_en: string | null;
  phone: string;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface FarmStaff {
  id: string;
  farm_id: string;
  staff_id: string | null;
  role: 'farm_manager' | 'supervisor' | 'engineer' | 'staff' | 'worker';
  reports_to: string | null;
  name_ar: string;
  name_en: string | null;
  phone: string;
  email: string | null;
  hire_date: string;
  salary: number | null;
  notes: string | null;
  is_active: boolean;
}

type SubTab = 'directors' | 'farms' | 'hierarchy' | 'operations' | 'approvals' | 'reports' | 'my_farms';

export default function ComprehensiveFarmManagement() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('directors');
  const [directors, setDirectors] = useState<FarmDirector[]>([]);
  const [selectedDirector, setSelectedDirector] = useState<FarmDirector | null>(null);
  const [showDirectorModal, setShowDirectorModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDirectors();
  }, []);

  const loadDirectors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('farm_directors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDirectors(data || []);
    } catch (error) {
      console.error('Error loading directors:', error);
    } finally {
      setLoading(false);
    }
  };

  const subTabs = [
    { id: 'directors', label: 'مديرو المزارع', icon: UserCog, color: 'from-blue-500 to-indigo-600' },
    { id: 'farms', label: 'المزارع', icon: TreePine, color: 'from-emerald-500 to-green-600' },
    { id: 'hierarchy', label: 'الهيكل التنظيمي', icon: Network, color: 'from-purple-500 to-pink-600' },
    { id: 'operations', label: 'إدارة التشغيل', icon: Activity, color: 'from-orange-500 to-red-600' },
    { id: 'approvals', label: 'اعتماد الاستثمار', icon: FileCheck, color: 'from-teal-500 to-cyan-600' },
    { id: 'reports', label: 'تقارير الإدارة', icon: TrendingUp, color: 'from-rose-500 to-pink-600' },
    { id: 'my_farms', label: 'مزارعي', icon: MapPin, color: 'from-amber-500 to-orange-600' }
  ];

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-2">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as SubTab)}
              className={`px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                activeSubTab === tab.id
                  ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeSubTab === 'directors' && (
        <DirectorsManagement
          directors={directors}
          loading={loading}
          onRefresh={loadDirectors}
        />
      )}

      {activeSubTab === 'farms' && <FarmsTab />}

      {activeSubTab === 'hierarchy' && (
        <HierarchyManagement directors={directors} />
      )}

      {activeSubTab === 'operations' && (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">إدارة التشغيل والمتابعة</h2>
              <p className="text-gray-400 text-sm mt-1">إدارة شاملة لجميع العمليات التشغيلية مع ربط مديري المزارع والموظفين</p>
            </div>
          </div>
          <EnhancedOperationsManagement />
        </div>
      )}

      {activeSubTab === 'approvals' && <InvestmentApprovalsTab />}

      {activeSubTab === 'reports' && <ManagementReportsView />}

      {activeSubTab === 'my_farms' && <MyFarmsTab />}
    </div>
  );
}

function DirectorsManagement({
  directors,
  loading,
  onRefresh
}: {
  directors: FarmDirector[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedDirector, setSelectedDirector] = useState<FarmDirector | null>(null);
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    phone: '',
    email: '',
    notes: ''
  });

  const handleAdd = () => {
    setSelectedDirector(null);
    setFormData({
      name_ar: '',
      name_en: '',
      phone: '',
      email: '',
      notes: ''
    });
    setShowModal(true);
  };

  const handleEdit = (director: FarmDirector) => {
    setSelectedDirector(director);
    setFormData({
      name_ar: director.name_ar,
      name_en: director.name_en || '',
      phone: director.phone,
      email: director.email || '',
      notes: director.notes || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (selectedDirector) {
        const { error } = await supabase
          .from('farm_directors')
          .update(formData)
          .eq('id', selectedDirector.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('farm_directors')
          .insert([formData]);

        if (error) throw error;
      }

      setShowModal(false);
      onRefresh();
    } catch (error) {
      console.error('Error saving director:', error);
      alert('حدث خطأ أثناء الحفظ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المدير؟')) return;

    try {
      const { error } = await supabase
        .from('farm_directors')
        .delete()
        .eq('id', id);

      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Error deleting director:', error);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-white">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white">مديرو المزارع</h3>
          <p className="text-gray-400 mt-1">إدارة مديري المزارع والإشراف على عدة مزارع</p>
        </div>
        <button
          onClick={handleAdd}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          إضافة مدير مزارع
        </button>
      </div>

      {directors.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-12 text-center">
          <UserCog className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-white text-lg font-bold mb-2">لا يوجد مديرو مزارع</p>
          <p className="text-gray-400">ابدأ بإضافة مدير مزارع جديد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {directors.map((director) => (
            <DirectorCard
              key={director.id}
              director={director}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showModal && (
        <DirectorFormModal
          director={selectedDirector}
          formData={formData}
          onChange={setFormData}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function DirectorCard({
  director,
  onEdit,
  onDelete
}: {
  director: FarmDirector;
  onEdit: (director: FarmDirector) => void;
  onDelete: (id: string) => void;
}) {
  const [stats, setStats] = useState({ total_farms: 0, active_farms: 0, total_staff: 0 });

  useEffect(() => {
    loadStats();
  }, [director.id]);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_director_statistics', { p_director_id: director.id });

      if (error) throw error;
      setStats(data || { total_farms: 0, active_farms: 0, total_staff: 0 });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 hover:bg-white/10 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <UserCog className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="text-white font-bold text-lg">{director.name_ar}</h4>
            {director.name_en && (
              <p className="text-gray-400 text-sm">{director.name_en}</p>
            )}
          </div>
        </div>
        {director.is_active ? (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">
            نشط
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-500/20 text-gray-400">
            موقوف
          </span>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-gray-300 text-sm">
          <span className="text-gray-500">📱</span>
          {director.phone}
        </div>
        {director.email && (
          <div className="flex items-center gap-2 text-gray-300 text-sm">
            <span className="text-gray-500">📧</span>
            {director.email}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <TreePine className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{stats.total_farms}</p>
          <p className="text-xs text-gray-400">مزرعة</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <Activity className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{stats.active_farms}</p>
          <p className="text-xs text-gray-400">نشطة</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <Users className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{stats.total_staff}</p>
          <p className="text-xs text-gray-400">موظف</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onEdit(director)}
          className="flex-1 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg font-bold hover:bg-blue-500/30 transition-all flex items-center justify-center gap-2"
        >
          <Edit3 className="w-4 h-4" />
          تعديل
        </button>
        <button
          onClick={() => onDelete(director.id)}
          className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg font-bold hover:bg-red-500/30 transition-all flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          حذف
        </button>
      </div>
    </div>
  );
}

function DirectorFormModal({
  director,
  formData,
  onChange,
  onSave,
  onClose
}: {
  director: FarmDirector | null;
  formData: any;
  onChange: (data: any) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-white/10 max-w-2xl w-full p-8" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-2xl font-bold text-white mb-6">
          {director ? 'تعديل مدير المزارع' : 'إضافة مدير مزارع جديد'}
        </h3>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-white font-bold mb-2">الاسم بالعربي *</label>
            <input
              type="text"
              value={formData.name_ar}
              onChange={(e) => onChange({ ...formData, name_ar: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500"
              placeholder="أدخل الاسم بالعربي"
            />
          </div>

          <div>
            <label className="block text-white font-bold mb-2">الاسم بالإنجليزي</label>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => onChange({ ...formData, name_en: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter name in English"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-bold mb-2">رقم الجوال *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => onChange({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500"
                placeholder="05xxxxxxxx"
              />
            </div>

            <div>
              <label className="block text-white font-bold mb-2">البريد الإلكتروني</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => onChange({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500"
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-white font-bold mb-2">ملاحظات</label>
            <textarea
              value={formData.notes}
              onChange={(e) => onChange({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 resize-none"
              placeholder="أضف أي ملاحظات إضافية..."
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onSave}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-indigo-700 transition-all"
          >
            حفظ
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white/5 text-white rounded-xl font-bold hover:bg-white/10 transition-all"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

function HierarchyManagement({ directors }: { directors: FarmDirector[] }) {
  const [selectedFarm, setSelectedFarm] = useState<string | null>(null);
  const [farms, setFarms] = useState<any[]>([]);
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFarms();
  }, []);

  useEffect(() => {
    if (selectedFarm) {
      loadHierarchy(selectedFarm);
    }
  }, [selectedFarm]);

  const loadFarms = async () => {
    try {
      const { data, error } = await supabase
        .from('b2f_farms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFarms(data || []);
      if (data && data.length > 0) {
        setSelectedFarm(data[0].id);
      }
    } catch (error) {
      console.error('Error loading farms:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHierarchy = async (farmId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_farm_hierarchy', { p_farm_id: farmId });

      if (error) throw error;
      setHierarchy(data || []);
    } catch (error) {
      console.error('Error loading hierarchy:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-white">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-white mb-2">الهيكل التنظيمي للمزارع</h3>
        <p className="text-gray-400">عرض وإدارة الموظفين والتسلسل الهرمي لكل مزرعة</p>
      </div>

      {farms.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-12 text-center">
          <Network className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-white text-lg font-bold mb-2">لا توجد مزارع</p>
          <p className="text-gray-400">قم بإضافة مزرعة أولاً لعرض الهيكل التنظيمي</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {farms.map((farm) => (
              <button
                key={farm.id}
                onClick={() => setSelectedFarm(farm.id)}
                className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                  selectedFarm === farm.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                    : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <TreePine className="w-5 h-5" />
                {farm.name_ar}
              </button>
            ))}
          </div>

          {hierarchy.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-12 text-center">
              <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-white text-lg font-bold mb-2">لا يوجد موظفين</p>
              <p className="text-gray-400">لم يتم إضافة موظفين لهذه المزرعة بعد</p>
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
              <div className="space-y-4">
                {hierarchy.map((staff, index) => (
                  <HierarchyNode key={staff.id} staff={staff} index={index} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function HierarchyNode({ staff, index }: { staff: any; index: number }) {
  const roleColors = {
    farm_manager: 'from-blue-500 to-indigo-600',
    supervisor: 'from-purple-500 to-pink-600',
    engineer: 'from-teal-500 to-cyan-600',
    staff: 'from-orange-500 to-red-600',
    worker: 'from-gray-500 to-gray-600'
  };

  const roleLabels = {
    farm_manager: 'مدير المزرعة',
    supervisor: 'مشرف',
    engineer: 'مهندس',
    staff: 'موظف',
    worker: 'عامل'
  };

  return (
    <div className="flex items-center gap-4" style={{ paddingRight: `${staff.level * 40}px` }}>
      {staff.level > 1 && (
        <ChevronRight className="w-5 h-5 text-gray-500" />
      )}
      <div className="flex-1 bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${roleColors[staff.role as keyof typeof roleColors]} flex items-center justify-center`}>
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-white font-bold">{staff.name_ar}</h4>
              <p className="text-gray-400 text-sm">{roleLabels[staff.role as keyof typeof roleLabels]}</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-gray-300 text-sm">{staff.phone}</p>
            {staff.email && (
              <p className="text-gray-400 text-xs">{staff.email}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
