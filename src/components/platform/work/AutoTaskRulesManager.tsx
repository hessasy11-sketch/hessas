import { useState, useEffect } from 'react';
import { Zap, Plus, Settings, Trash2, CheckCircle, Clock, Calendar } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface AutoTaskRule {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  trigger_conditions: any;
  target_board: string;
  target_department: string;
  priority: string;
  is_active: boolean;
  template_id: string;
  template?: {
    name: string;
  };
}

export function AutoTaskRulesManager() {
  const [rules, setRules] = useState<AutoTaskRule[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from('auto_task_rules')
        .select('*, template:task_templates(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error loading rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRuleStatus = async (ruleId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('auto_task_rules')
        .update({ is_active: !currentStatus })
        .eq('id', ruleId);

      if (error) throw error;
      loadRules();
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه القاعدة؟')) return;

    try {
      const { error } = await supabase
        .from('auto_task_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      loadRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'qr_scan': return <Zap className="w-5 h-5 text-blue-400" />;
      case 'time_based': return <Clock className="w-5 h-5 text-green-400" />;
      case 'event_based': return <Calendar className="w-5 h-5 text-purple-400" />;
      case 'workload_based': return <Settings className="w-5 h-5 text-orange-400" />;
      default: return <Zap className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTriggerLabel = (type: string) => {
    const labels: Record<string, string> = {
      qr_scan: 'عند مسح QR',
      time_based: 'حسب الوقت',
      event_based: 'حسب حدث',
      workload_based: 'حسب حمل العمل'
    };
    return labels[type] || type;
  };

  if (loading) {
    return <div className="text-white text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">قواعد التوليد التلقائي</h2>
          <p className="text-gray-400 text-sm mt-1">إدارة قواعد إنشاء المهام تلقائياً</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-bold transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          قاعدة جديدة
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`rounded-2xl border p-6 transition-all ${
              rule.is_active
                ? 'bg-white/5 border-white/10 hover:bg-white/10'
                : 'bg-gray-900/50 border-gray-700/50 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {getTriggerIcon(rule.trigger_type)}
                <div>
                  <h3 className="text-white font-bold">{rule.name}</h3>
                  <p className="text-gray-400 text-sm">{rule.description}</p>
                </div>
              </div>
              <button
                onClick={() => toggleRuleStatus(rule.id, rule.is_active)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  rule.is_active
                    ? 'bg-green-500/20 text-green-300'
                    : 'bg-gray-500/20 text-gray-400'
                }`}
              >
                {rule.is_active ? 'نشط' : 'معطل'}
              </button>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">المشغل:</span>
                <span className="text-white font-bold">{getTriggerLabel(rule.trigger_type)}</span>
              </div>
              {rule.template && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">القالب:</span>
                  <span className="text-white font-bold">{rule.template.name}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">اللوحة:</span>
                <span className="text-white font-bold">{rule.target_board || 'الكل'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">الأولوية:</span>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  rule.priority === 'urgent' ? 'bg-red-500/20 text-red-300' :
                  rule.priority === 'high' ? 'bg-orange-500/20 text-orange-300' :
                  rule.priority === 'medium' ? 'bg-blue-500/20 text-blue-300' :
                  'bg-gray-500/20 text-gray-300'
                }`}>
                  {rule.priority}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => deleteRule(rule.id)}
                className="flex-1 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      {rules.length === 0 && (
        <div className="text-center py-12">
          <Zap className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">لا توجد قواعد حالياً</p>
          <p className="text-gray-500 text-sm">أنشئ قاعدة لتوليد المهام تلقائياً</p>
        </div>
      )}
    </div>
  );
}
