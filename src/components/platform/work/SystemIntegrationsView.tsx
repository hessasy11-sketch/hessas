import { useState, useEffect } from 'react';
import { ArrowLeft, Link, Check, X, Shield } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Department {
  id: string;
  name_ar: string;
  code: string;
}

interface Props {
  department: Department;
  onBack: () => void;
}

interface Integration {
  id: string;
  system_code: string;
  access_level: string;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_view_reports: boolean;
  can_export: boolean;
  is_active: boolean;
}

export function SystemIntegrationsView({ department, onBack }: Props) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  const systems = [
    { code: 'b2b_auctions', name: 'نظام المزادات', color: 'from-blue-500 to-cyan-600' },
    { code: 'b2f_farms', name: 'إدارة المزارع', color: 'from-green-500 to-emerald-600' },
    { code: 'b2f_operations', name: 'العمليات التشغيلية', color: 'from-purple-500 to-pink-600' },
    { code: 'b2f_sales', name: 'المبيعات والمالية', color: 'from-orange-500 to-red-600' }
  ];

  useEffect(() => {
    loadIntegrations();
  }, [department.id]);

  const loadIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('system_integrations')
        .select('*')
        .eq('department_id', department.id);

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (
    integrationId: string,
    field: string,
    currentValue: boolean
  ) => {
    try {
      const { error } = await supabase
        .from('system_integrations')
        .update({ [field]: !currentValue })
        .eq('id', integrationId);

      if (error) throw error;
      loadIntegrations();
    } catch (error: any) {
      alert('خطأ: ' + error.message);
    }
  };

  const toggleActive = async (integrationId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('system_integrations')
        .update({ is_active: !currentStatus })
        .eq('id', integrationId);

      if (error) throw error;
      loadIntegrations();
    } catch (error: any) {
      alert('خطأ: ' + error.message);
    }
  };

  if (loading) {
    return <div className="text-white text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">ربط الأنظمة</h2>
          <p className="text-gray-400 text-sm">{department.name_ar} - {department.code}</p>
        </div>
      </div>

      {/* Systems Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {systems.map((system) => {
          const integration = integrations.find(i => i.system_code === system.code);

          return (
            <div
              key={system.code}
              className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div
                    className={`inline-block px-4 py-2 rounded-lg bg-gradient-to-r ${system.color} text-white font-bold mb-2`}
                  >
                    {system.name}
                  </div>
                  <p className="text-gray-400 text-sm">{system.code}</p>
                </div>
                {integration && (
                  <button
                    onClick={() => toggleActive(integration.id, integration.is_active)}
                    className={`px-4 py-2 rounded-lg font-bold transition-all ${
                      integration.is_active
                        ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                        : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                    }`}
                  >
                    {integration.is_active ? 'نشط' : 'معطل'}
                  </button>
                )}
              </div>

              {integration ? (
                <div className="space-y-3">
                  {/* Access Level */}
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="text-gray-400 text-sm mb-1">مستوى الوصول</div>
                    <div className="text-white font-bold">
                      {integration.access_level === 'full' && 'صلاحيات كاملة'}
                      {integration.access_level === 'write' && 'قراءة وكتابة'}
                      {integration.access_level === 'read' && 'قراءة فقط'}
                      {integration.access_level === 'none' && 'بدون وصول'}
                    </div>
                  </div>

                  {/* Permissions Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => togglePermission(integration.id, 'can_create', integration.can_create)}
                      className={`p-3 rounded-lg text-sm font-bold transition-all flex items-center justify-between ${
                        integration.can_create
                          ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                      }`}
                    >
                      <span>إنشاء</span>
                      {integration.can_create ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => togglePermission(integration.id, 'can_edit', integration.can_edit)}
                      className={`p-3 rounded-lg text-sm font-bold transition-all flex items-center justify-between ${
                        integration.can_edit
                          ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                      }`}
                    >
                      <span>تعديل</span>
                      {integration.can_edit ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => togglePermission(integration.id, 'can_delete', integration.can_delete)}
                      className={`p-3 rounded-lg text-sm font-bold transition-all flex items-center justify-between ${
                        integration.can_delete
                          ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                      }`}
                    >
                      <span>حذف</span>
                      {integration.can_delete ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => togglePermission(integration.id, 'can_approve', integration.can_approve)}
                      className={`p-3 rounded-lg text-sm font-bold transition-all flex items-center justify-between ${
                        integration.can_approve
                          ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                      }`}
                    >
                      <span>موافقة</span>
                      {integration.can_approve ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => togglePermission(integration.id, 'can_view_reports', integration.can_view_reports)}
                      className={`p-3 rounded-lg text-sm font-bold transition-all flex items-center justify-between ${
                        integration.can_view_reports
                          ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                      }`}
                    >
                      <span>تقارير</span>
                      {integration.can_view_reports ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => togglePermission(integration.id, 'can_export', integration.can_export)}
                      className={`p-3 rounded-lg text-sm font-bold transition-all flex items-center justify-between ${
                        integration.can_export
                          ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                      }`}
                    >
                      <span>تصدير</span>
                      {integration.can_export ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Link className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm mb-3">غير مربوط</p>
                  <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg font-bold transition-all">
                    ربط النظام
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
