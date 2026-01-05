import { useState, useEffect } from 'react';
import { Wrench, ListChecks, AlertTriangle, Plus, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { useFarmOpsLite } from '../../../hooks/useFarmOpsLite';
import { supabase } from '../../../lib/supabase';

interface OpsLiteHubProps {
  operationalFarmId: string;
}

type Tab = 'tasks' | 'incidents' | 'maintenance';

export default function OpsLiteHub({ operationalFarmId }: OpsLiteHubProps) {
  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const {
    stats,
    tasks,
    incidents,
    maintenance,
    loading,
    createTask,
    updateTaskStatus,
    createIncident,
    updateIncidentStatus,
    createMaintenance
  } = useFarmOpsLite(operationalFarmId);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');

  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [incidentType, setIncidentType] = useState('other');
  const [incidentPriority, setIncidentPriority] = useState('medium');

  const [equipmentName, setEquipmentName] = useState('');
  const [equipmentType, setEquipmentType] = useState('other');
  const [maintenanceType, setMaintenanceType] = useState('routine');
  const [statusAfter, setStatusAfter] = useState('working');
  const [maintenanceNotes, setMaintenanceNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const tabs = [
    { id: 'tasks' as Tab, name: 'المهام اليومية', icon: ListChecks },
    { id: 'incidents' as Tab, name: 'بلاغات الأعطال', icon: AlertTriangle },
    { id: 'maintenance' as Tab, name: 'صيانة المعدات', icon: Wrench },
  ];

  const handleCreateTask = async () => {
    if (!taskTitle) return;

    setSubmitting(true);
    const result = await createTask({
      task_title: taskTitle,
      task_description: taskDesc,
      priority: taskPriority
    });
    setSubmitting(false);

    if (result.success) {
      setShowTaskModal(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskPriority('medium');
    } else {
      alert('حدث خطأ: ' + result.error);
    }
  };

  const handleCreateIncident = async () => {
    if (!incidentTitle) return;

    setSubmitting(true);
    const result = await createIncident({
      incident_title: incidentTitle,
      incident_description: incidentDesc,
      incident_type: incidentType,
      priority: incidentPriority
    });
    setSubmitting(false);

    if (result.success) {
      setShowIncidentModal(false);
      setIncidentTitle('');
      setIncidentDesc('');
      setIncidentType('other');
      setIncidentPriority('medium');
    } else {
      alert('حدث خطأ: ' + result.error);
    }
  };

  const handleCreateMaintenance = async () => {
    if (!equipmentName) return;

    setSubmitting(true);
    const result = await createMaintenance({
      equipment_name: equipmentName,
      equipment_type: equipmentType,
      maintenance_type: maintenanceType,
      status_after: statusAfter,
      notes: maintenanceNotes
    });
    setSubmitting(false);

    if (result.success) {
      setShowMaintenanceModal(false);
      setEquipmentName('');
      setEquipmentType('other');
      setMaintenanceType('routine');
      setStatusAfter('working');
      setMaintenanceNotes('');
    } else {
      alert('حدث خطأ: ' + result.error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-700';
      case 'medium': return 'bg-blue-100 text-blue-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'critical': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'reported': return 'bg-yellow-100 text-yellow-700';
      case 'acknowledged': return 'bg-blue-100 text-blue-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      case 'closed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
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
    <div className="space-y-6" dir="rtl">
      {/* Header with Stats */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">التشغيل (Ops Lite)</h2>
        <p className="text-sm text-gray-600 mb-4">
          إدارة مبسطة للمهام والبلاغات والصيانة
        </p>

        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-blue-700 mb-1">المهام</div>
              <div className="text-2xl font-bold text-blue-900">{stats.tasks.total}</div>
              <div className="text-xs text-blue-600 mt-1">
                {stats.tasks.pending} معلقة • {stats.tasks.completed} مكتملة
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="text-sm text-red-700 mb-1">البلاغات</div>
              <div className="text-2xl font-bold text-red-900">{stats.incidents.total}</div>
              <div className="text-xs text-red-600 mt-1">
                {stats.incidents.open} مفتوحة • {stats.incidents.critical} حرجة
              </div>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <div className="text-sm text-amber-700 mb-1">الصيانة</div>
              <div className="text-2xl font-bold text-amber-900">{stats.maintenance.total}</div>
              <div className="text-xs text-amber-600 mt-1">
                {stats.maintenance.this_month} هذا الشهر
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${
                  isActive
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div>
        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">المهام اليومية</h3>
              <button
                onClick={() => setShowTaskModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                مهمة جديدة
              </button>
            </div>

            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <ListChecks className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">لا توجد مهام بعد</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{task.task_title}</h4>
                        {task.task_description && (
                          <p className="text-sm text-gray-600 mt-1">{task.task_description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                      </div>
                    </div>

                    {task.status !== 'completed' && task.status !== 'cancelled' && (
                      <div className="flex gap-2 mt-3">
                        {task.status === 'pending' && (
                          <button
                            onClick={() => updateTaskStatus(task.id, 'in_progress')}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                          >
                            بدء العمل
                          </button>
                        )}
                        {task.status === 'in_progress' && (
                          <button
                            onClick={() => updateTaskStatus(task.id, 'completed')}
                            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                          >
                            إتمام
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Incidents Tab */}
        {activeTab === 'incidents' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">بلاغات الأعطال</h3>
              <button
                onClick={() => setShowIncidentModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                بلاغ جديد
              </button>
            </div>

            <div className="space-y-3">
              {incidents.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">لا توجد بلاغات</p>
                </div>
              ) : (
                incidents.map((incident) => (
                  <div key={incident.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{incident.incident_title}</h4>
                        {incident.incident_description && (
                          <p className="text-sm text-gray-600 mt-1">{incident.incident_description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">النوع: {incident.incident_type}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(incident.priority)}`}>
                          {incident.priority}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(incident.status)}`}>
                          {incident.status}
                        </span>
                      </div>
                    </div>

                    {incident.status !== 'resolved' && incident.status !== 'closed' && (
                      <div className="flex gap-2 mt-3">
                        {incident.status === 'reported' && (
                          <button
                            onClick={() => updateIncidentStatus(incident.id, 'acknowledged')}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                          >
                            تأكيد الاستلام
                          </button>
                        )}
                        {incident.status === 'acknowledged' && (
                          <button
                            onClick={() => updateIncidentStatus(incident.id, 'in_progress')}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                          >
                            بدء المعالجة
                          </button>
                        )}
                        {incident.status === 'in_progress' && (
                          <button
                            onClick={() => updateIncidentStatus(incident.id, 'resolved', 'تم الحل')}
                            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                          >
                            حل البلاغ
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Maintenance Tab */}
        {activeTab === 'maintenance' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">صيانة المعدات</h3>
              <button
                onClick={() => setShowMaintenanceModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                تسجيل صيانة
              </button>
            </div>

            <div className="space-y-3">
              {maintenance.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">لا توجد سجلات صيانة</p>
                </div>
              ) : (
                maintenance.map((m) => (
                  <div key={m.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{m.equipment_name}</h4>
                        <p className="text-sm text-gray-600 mt-1">النوع: {m.equipment_type}</p>
                        <p className="text-sm text-gray-600">نوع الصيانة: {m.maintenance_type}</p>
                        {m.notes && (
                          <p className="text-sm text-gray-600 mt-1">{m.notes}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        m.status_after === 'working' ? 'bg-green-100 text-green-700' :
                        m.status_after === 'broken' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {m.status_after}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(m.maintenance_date).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">مهمة جديدة</h3>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">عنوان المهمة</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="مثال: ري القطاع الشمالي"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الوصف</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="تفاصيل المهمة..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الأولوية</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="low">منخفضة</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية</option>
                  <option value="urgent">عاجلة</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTaskModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                disabled={submitting}
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateTask}
                disabled={!taskTitle || submitting}
                className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:bg-gray-300"
              >
                {submitting ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incident Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">بلاغ عطل جديد</h3>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">عنوان البلاغ</label>
                <input
                  type="text"
                  value={incidentTitle}
                  onChange={(e) => setIncidentTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="مثال: عطل في نظام الري"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الوصف</label>
                <textarea
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="تفاصيل العطل..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع العطل</label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="equipment_failure">عطل معدات</option>
                  <option value="irrigation_issue">مشكلة ري</option>
                  <option value="pest_problem">مشكلة آفات</option>
                  <option value="tree_damage">ضرر أشجار</option>
                  <option value="weather_damage">ضرر جوي</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الأولوية</label>
                <select
                  value={incidentPriority}
                  onChange={(e) => setIncidentPriority(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="low">منخفضة</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية</option>
                  <option value="critical">حرجة</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowIncidentModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                disabled={submitting}
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateIncident}
                disabled={!incidentTitle || submitting}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300"
              >
                {submitting ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Modal */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">تسجيل صيانة</h3>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اسم المعدة</label>
                <input
                  type="text"
                  value={equipmentName}
                  onChange={(e) => setEquipmentName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="مثال: مضخة الري الرئيسية"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع المعدة</label>
                <select
                  value={equipmentType}
                  onChange={(e) => setEquipmentType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="irrigation_system">نظام ري</option>
                  <option value="tractor">جرار</option>
                  <option value="harvesting_tool">أداة حصاد</option>
                  <option value="sprayer">رشاش</option>
                  <option value="generator">مولد</option>
                  <option value="pump">مضخة</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع الصيانة</label>
                <select
                  value={maintenanceType}
                  onChange={(e) => setMaintenanceType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="routine">دورية</option>
                  <option value="repair">إصلاح</option>
                  <option value="emergency">طارئة</option>
                  <option value="inspection">فحص</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الحالة بعد الصيانة</label>
                <select
                  value={statusAfter}
                  onChange={(e) => setStatusAfter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="working">تعمل</option>
                  <option value="needs_attention">تحتاج متابعة</option>
                  <option value="broken">معطلة</option>
                  <option value="replaced">تم الاستبدال</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات</label>
                <textarea
                  value={maintenanceNotes}
                  onChange={(e) => setMaintenanceNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="ملاحظات الصيانة..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowMaintenanceModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                disabled={submitting}
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateMaintenance}
                disabled={!equipmentName || submitting}
                className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-gray-300"
              >
                {submitting ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
