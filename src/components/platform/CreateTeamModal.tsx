import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Users, Briefcase, User, MapPin, CheckCircle } from 'lucide-react';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Template {
  id: string;
  template_name: string;
  department: string;
  description: string;
  roles_structure: any;
}

interface Manager {
  id: string;
  display_name: string;
  phone_number: string;
}

interface Farm {
  id: string;
  name: string;
}

export default function CreateTeamModal({ isOpen, onClose, onSuccess }: CreateTeamModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [managerPhone, setManagerPhone] = useState('');
  const [supervisorPhones, setSupervisorPhones] = useState<string[]>(['']);
  const [selectedFarms, setSelectedFarms] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      loadManagers();
      loadFarms();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    const { data } = await supabase
      .from('team_templates')
      .select('*')
      .eq('is_active', true)
      .order('template_name');
    if (data) setTemplates(data);
  };

  const loadManagers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, phone_number')
      .order('display_name');
    if (data) setManagers(data);
  };

  const loadFarms = async () => {
    const { data } = await supabase
      .from('b2f_farms')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    if (data) setFarms(data);
  };

  const addSupervisorField = () => {
    setSupervisorPhones([...supervisorPhones, '']);
  };

  const removeSupervisorField = (index: number) => {
    setSupervisorPhones(supervisorPhones.filter((_, i) => i !== index));
  };

  const updateSupervisorPhone = (index: number, value: string) => {
    const updated = [...supervisorPhones];
    updated[index] = value;
    setSupervisorPhones(updated);
  };

  const toggleFarm = (farmId: string) => {
    setSelectedFarms(prev =>
      prev.includes(farmId)
        ? prev.filter(id => id !== farmId)
        : [...prev, farmId]
    );
  };

  const handleSubmit = async () => {
    if (!selectedTemplate || !managerPhone) return;

    setLoading(true);
    try {
      const template = templates.find(t => t.id === selectedTemplate);
      if (!template) throw new Error('Template not found');

      const { data: managerData } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone_number', managerPhone)
        .maybeSingle();

      if (!managerData) {
        alert('رقم هاتف المدير غير مسجل في النظام');
        setLoading(false);
        return;
      }

      const rolesStructure = template.roles_structure as any[];

      const teamMembers = [];
      teamMembers.push({
        phone: managerPhone,
        user_id: managerData.id,
        role: 'manager',
        department: template.department,
        job_title: rolesStructure.find((r: any) => r.role === 'manager')?.title || 'مدير الفريق',
        scope_farms: selectedFarms.length > 0 ? selectedFarms : null
      });

      for (const phone of supervisorPhones.filter(p => p)) {
        const { data: supervisorData } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone_number', phone)
          .maybeSingle();

        if (supervisorData) {
          teamMembers.push({
            phone,
            user_id: supervisorData.id,
            role: 'supervisor',
            department: template.department,
            job_title: rolesStructure.find((r: any) => r.role === 'supervisor')?.title || 'مشرف',
            manager_user_id: managerData.id,
            scope_farms: selectedFarms.length > 0 ? selectedFarms : null
          });
        }
      }

      const insertData = teamMembers.map(member => ({
        user_id: member.user_id,
        role: member.role,
        department: member.department,
        job_title: member.job_title,
        manager_user_id: member.manager_user_id || null,
        scope_farms: member.scope_farms,
        is_active: true
      }));

      const { error } = await supabase
        .from('platform_staff')
        .insert(insertData);

      if (error) throw error;

      await supabase.rpc('log_platform_action', {
        p_action_type: 'create_team',
        p_target_type: 'team',
        p_target_id: selectedTemplate,
        p_changes: {
          template_name: template.template_name,
          manager: managerPhone,
          supervisors: supervisorPhones.filter(p => p),
          farms_count: selectedFarms.length
        }
      });

      onSuccess();
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating team:', error);
      alert('حدث خطأ أثناء إنشاء الفريق');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedTemplate('');
    setManagerPhone('');
    setSupervisorPhones(['']);
    setSelectedFarms([]);
  };

  if (!isOpen) return null;

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">إنشاء فريق جاهز</h2>
              <p className="text-emerald-100 text-sm">الخطوة {step} من 3</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">اختر قالب الفريق</h3>
                <p className="text-gray-600">حدد نوع الفريق الذي تريد إنشاءه</p>
              </div>

              {templates.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">لا توجد قوالب متاحة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map(template => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`w-full p-6 rounded-xl border-2 text-right transition-all ${
                        selectedTemplate === template.id
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Briefcase className={`w-5 h-5 ${
                              selectedTemplate === template.id ? 'text-emerald-600' : 'text-gray-600'
                            }`} />
                            <h4 className="text-lg font-bold text-gray-900">{template.template_name}</h4>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{template.description}</p>
                          <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                            {template.department}
                          </span>
                        </div>
                        {selectedTemplate === template.id && (
                          <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setStep(2)}
                  disabled={!selectedTemplate}
                  className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  التالي
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">تحديد الأعضاء</h3>
                <p className="text-gray-600">أدخل أرقام هواتف أعضاء الفريق</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  رقم هاتف المدير
                </label>
                <input
                  type="tel"
                  value={managerPhone}
                  onChange={(e) => setManagerPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  أرقام هواتف المشرفين
                </label>
                <div className="space-y-3">
                  {supervisorPhones.map((phone, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => updateSupervisorPhone(index, e.target.value)}
                        placeholder="05xxxxxxxx"
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                      />
                      {supervisorPhones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSupervisorField(index)}
                          className="w-12 h-12 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl transition-all"
                        >
                          <X className="w-5 h-5 mx-auto" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addSupervisorField}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-xl hover:border-emerald-500 hover:text-emerald-600 transition-all font-semibold"
                  >
                    + إضافة مشرف
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t-2 border-gray-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                >
                  السابق
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!managerPhone}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  التالي
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">تحديد النطاق</h3>
                <p className="text-gray-600">اختر المزارع التي سيعمل عليها الفريق</p>
              </div>

              {selectedTemplateData?.department === 'B2F' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    المزارع المتاحة
                  </label>
                  <div className="bg-slate-50 rounded-xl p-4 max-h-64 overflow-y-auto space-y-2">
                    {farms.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">لا توجد مزارع متاحة</p>
                    ) : (
                      farms.map(farm => (
                        <label
                          key={farm.id}
                          className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-slate-100 cursor-pointer transition-all"
                        >
                          <input
                            type="checkbox"
                            checked={selectedFarms.includes(farm.id)}
                            onChange={() => toggleFarm(farm.id)}
                            className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                          />
                          <span className="text-gray-700 font-medium">{farm.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {selectedFarms.length === 0 ? 'لم يتم تحديد مزارع (الوصول لجميع المزارع)' : `تم تحديد ${selectedFarms.length} مزرعة`}
                  </p>
                </div>
              )}

              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6">
                <h4 className="font-bold text-emerald-900 mb-3">ملخص الفريق</h4>
                <div className="space-y-2 text-sm">
                  <p className="text-emerald-800">
                    <span className="font-semibold">القالب:</span> {selectedTemplateData?.template_name}
                  </p>
                  <p className="text-emerald-800">
                    <span className="font-semibold">القسم:</span> {selectedTemplateData?.department}
                  </p>
                  <p className="text-emerald-800">
                    <span className="font-semibold">المدير:</span> {managerPhone}
                  </p>
                  <p className="text-emerald-800">
                    <span className="font-semibold">المشرفين:</span> {supervisorPhones.filter(p => p).length} مشرف
                  </p>
                  {selectedTemplateData?.department === 'B2F' && (
                    <p className="text-emerald-800">
                      <span className="font-semibold">المزارع:</span> {selectedFarms.length || 'جميع المزارع'}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t-2 border-gray-100">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                >
                  السابق
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'جاري الإنشاء...' : 'إنشاء الفريق'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
