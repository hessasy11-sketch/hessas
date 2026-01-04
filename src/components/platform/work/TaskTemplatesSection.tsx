import { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, Camera, CheckCircle, FileCheck, AlertCircle, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  board: string;
  section: string;
  requires_proof: boolean;
  requires_approval: boolean;
  send_report_on_approval: boolean;
  checklist_items: string[];
  estimated_duration_minutes: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_active: boolean;
}

const BOARDS = [
  { value: 'b2b', label: 'المزادات (B2B)' },
  { value: 'b2f', label: 'استثمار المزارع (B2F)' },
  { value: 'operations', label: 'العمليات' },
  { value: 'general', label: 'عام' }
];

const PRIORITIES = [
  { value: 'low', label: 'منخفضة', color: 'bg-gray-500' },
  { value: 'medium', label: 'متوسطة', color: 'bg-blue-500' },
  { value: 'high', label: 'عالية', color: 'bg-orange-500' },
  { value: 'urgent', label: 'عاجلة', color: 'bg-red-500' }
];

export function TaskTemplatesSection() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القالب؟')) return;

    try {
      const { error } = await supabase
        .from('task_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-bold text-white">قوالب المهام</h2>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          إنشاء قالب جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => {
          const priority = PRIORITIES.find(p => p.value === template.priority);
          const board = BOARDS.find(b => b.value === template.board);

          return (
            <div
              key={template.id}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg mb-1">{template.name}</h3>
                  <p className="text-gray-400 text-sm">{template.description}</p>
                </div>
                <span className={`px-2 py-1 ${priority?.color} text-white text-xs rounded-lg`}>
                  {priority?.label}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="text-sm text-gray-300">
                  <span className="text-gray-500">اللوحة:</span> {board?.label}
                </div>
                {template.section && (
                  <div className="text-sm text-gray-300">
                    <span className="text-gray-500">القسم:</span> {template.section}
                  </div>
                )}
                {template.estimated_duration_minutes && (
                  <div className="text-sm text-gray-300">
                    <span className="text-gray-500">المدة المتوقعة:</span> {template.estimated_duration_minutes} دقيقة
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {template.requires_proof && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">
                    <Camera className="w-3 h-3" />
                    <span>يتطلب إثبات</span>
                  </div>
                )}
                {template.requires_approval && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded">
                    <CheckCircle className="w-3 h-3" />
                    <span>يتطلب اعتماد</span>
                  </div>
                )}
                {template.send_report_on_approval && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded">
                    <FileCheck className="w-3 h-3" />
                    <span>إرسال تقرير</span>
                  </div>
                )}
              </div>

              {template.checklist_items && template.checklist_items.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm text-gray-400 mb-2">قائمة التحقق:</div>
                  <ul className="space-y-1">
                    {template.checklist_items.slice(0, 3).map((item, idx) => (
                      <li key={idx} className="text-sm text-gray-300 flex items-center gap-2">
                        <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                        {item}
                      </li>
                    ))}
                    {template.checklist_items.length > 3 && (
                      <li className="text-sm text-gray-500">
                        +{template.checklist_items.length - 3} عنصر آخر
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowCreateModal(true);
                  }}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  تعديل
                </button>
                <button
                  onClick={() => deleteTemplate(template.id)}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {templates.length === 0 && (
          <div className="col-span-full text-center py-12">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">لا توجد قوالب مهام</p>
            <p className="text-gray-500 text-sm mt-2">قم بإنشاء قالب جديد للبدء</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateTemplateModal
          template={selectedTemplate}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedTemplate(null);
          }}
          onSuccess={() => {
            loadTemplates();
            setShowCreateModal(false);
            setSelectedTemplate(null);
          }}
        />
      )}
    </div>
  );
}

interface CreateTemplateModalProps {
  template: TaskTemplate | null;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateTemplateModal({ template, onClose, onSuccess }: CreateTemplateModalProps) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    board: template?.board || 'general',
    section: template?.section || '',
    requires_proof: template?.requires_proof || false,
    requires_approval: template?.requires_approval || false,
    send_report_on_approval: template?.send_report_on_approval || false,
    checklist_items: template?.checklist_items || [],
    estimated_duration_minutes: template?.estimated_duration_minutes || 0,
    priority: template?.priority || 'medium',
    is_active: template?.is_active ?? true
  });
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [saving, setSaving] = useState(false);

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setFormData({
        ...formData,
        checklist_items: [...formData.checklist_items, newChecklistItem.trim()]
      });
      setNewChecklistItem('');
    }
  };

  const removeChecklistItem = (index: number) => {
    setFormData({
      ...formData,
      checklist_items: formData.checklist_items.filter((_, i) => i !== index)
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('يرجى إدخال اسم القالب');
      return;
    }

    setSaving(true);
    try {
      if (template) {
        const { error } = await supabase
          .from('task_templates')
          .update(formData)
          .eq('id', template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('task_templates')
          .insert([formData]);
        if (error) throw error;
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-800 border-b border-white/10 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {template ? 'تعديل القالب' : 'إنشاء قالب جديد'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-bold mb-2">اسم المهمة</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                placeholder="مثال: مراجعة المزاد"
              />
            </div>

            <div>
              <label className="block text-white font-bold mb-2">الأولوية</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-white font-bold mb-2">الوصف</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
              rows={3}
              placeholder="وصف تفصيلي للمهمة..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-bold mb-2">اللوحة</label>
              <select
                value={formData.board}
                onChange={(e) => setFormData({ ...formData, board: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
              >
                {BOARDS.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white font-bold mb-2">القسم (اختياري)</label>
              <input
                type="text"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                placeholder="مثال: المالية"
              />
            </div>
          </div>

          <div>
            <label className="block text-white font-bold mb-2">المدة المتوقعة (دقيقة)</label>
            <input
              type="number"
              value={formData.estimated_duration_minutes}
              onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
              min="0"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
              <input
                type="checkbox"
                checked={formData.requires_proof}
                onChange={(e) => setFormData({ ...formData, requires_proof: e.target.checked })}
                className="w-5 h-5"
              />
              <Camera className="w-5 h-5 text-purple-400" />
              <span className="text-white">يتطلب إثبات بالصور</span>
            </label>

            <label className="flex items-center gap-2 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
              <input
                type="checkbox"
                checked={formData.requires_approval}
                onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                className="w-5 h-5"
              />
              <CheckCircle className="w-5 h-5 text-yellow-400" />
              <span className="text-white">يتطلب اعتماد</span>
            </label>

            {formData.requires_approval && (
              <label className="flex items-center gap-2 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all mr-8">
                <input
                  type="checkbox"
                  checked={formData.send_report_on_approval}
                  onChange={(e) => setFormData({ ...formData, send_report_on_approval: e.target.checked })}
                  className="w-5 h-5"
                />
                <FileCheck className="w-5 h-5 text-green-400" />
                <span className="text-white">إرسال تقرير توثيق بعد الاعتماد</span>
              </label>
            )}
          </div>

          <div>
            <label className="block text-white font-bold mb-2">قائمة التحقق</label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addChecklistItem()}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                placeholder="أضف عنصر..."
              />
              <button
                onClick={addChecklistItem}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {formData.checklist_items.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  <span className="flex-1 text-white text-sm">{item}</span>
                  <button
                    onClick={() => removeChecklistItem(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-slate-800 border-t border-white/10 p-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-bold transition-all"
          >
            {saving ? 'جاري الحفظ...' : (template ? 'حفظ التعديلات' : 'إنشاء القالب')}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
