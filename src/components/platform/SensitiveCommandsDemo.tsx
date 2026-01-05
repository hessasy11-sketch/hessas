import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Trash2,
  PowerOff,
  AlertOctagon,
  Database,
  RefreshCcw,
  Shield,
  Lock
} from 'lucide-react';
import ControlGuard from './ControlGuard';
import { useAbsoluteControl } from '../../hooks/useAbsoluteControl';
import { supabase } from '../../lib/supabase';

export default function SensitiveCommandsDemo() {
  const navigate = useNavigate();
  const { session } = useAbsoluteControl();
  const [result, setResult] = useState<string | null>(null);

  const logAction = async (action: string, details: any) => {
    await supabase
      .from('audit_logs')
      .insert({
        staff_id: 'gm-001',
        staff_name: 'المدير العام',
        action,
        category: 'platform',
        entity_type: 'sensitive_command',
        entity_id: null,
        entity_name: action,
        details,
        result: 'success',
        notes: `تم تنفيذ الأمر الحساس: ${action}`
      });
  };

  const handleDeleteFarm = async () => {
    const confirmed = confirm('هل أنت متأكد من حذف هذه المزرعة؟ لا يمكن التراجع عن هذا الإجراء.');
    if (confirmed) {
      await logAction('DELETE_FARM', { farm_id: 'demo-farm-001', farm_name: 'مزرعة تجريبية' });
      setResult('✅ تم حذف المزرعة بنجاح');
      setTimeout(() => setResult(null), 3000);
    }
  };

  const handleForceStop = async () => {
    const confirmed = confirm('هل تريد إيقاف جميع العمليات قسراً؟');
    if (confirmed) {
      await logAction('FORCE_STOP_OPERATIONS', { affected_operations: 5 });
      setResult('🛑 تم إيقاف جميع العمليات قسراً');
      setTimeout(() => setResult(null), 3000);
    }
  };

  const handleOverrideLock = async () => {
    await logAction('OVERRIDE_FINANCIAL_LOCK', { lock_id: 'demo-lock-001', reason: 'حالة طوارئ' });
    setResult('🔓 تم تجاوز القفل المالي');
    setTimeout(() => setResult(null), 3000);
  };

  const handleMassOperation = async () => {
    const confirmed = confirm('هل تريد تطبيق هذا على جميع المزارع؟');
    if (confirmed) {
      await logAction('MASS_OPERATION_UPDATE', { affected_farms: 15, operation: 'status_change' });
      setResult('⚡ تم تنفيذ العملية الجماعية على 15 مزرعة');
      setTimeout(() => setResult(null), 3000);
    }
  };

  const handleDataReset = async () => {
    const confirmed = confirm('⚠️ هذا الأمر سيحذف جميع البيانات التجريبية. هل تريد المتابعة؟');
    if (confirmed) {
      await logAction('RESET_TEST_DATA', { records_deleted: 100 });
      setResult('🗑️ تم حذف البيانات التجريبية');
      setTimeout(() => setResult(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50/20 to-slate-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-900 via-red-800 to-red-900 border-b border-red-700 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <button
                onClick={() => navigate('/admin/operations-room')}
                className="w-12 h-12 rounded-xl bg-red-800 hover:bg-red-700 border border-red-700 flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-red-300" />
              </button>

              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-400 via-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/50">
                <Shield className="w-9 h-9 text-white" />
              </div>

              <div>
                <h1 className="text-3xl font-bold text-white mb-1">
                  الأوامر الحساسة
                </h1>
                <p className="text-red-400">Sensitive Commands - Demo</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {session.isActive ? (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl animate-pulse">
                  <Shield className="w-4 h-4 text-emerald-300" />
                  <span className="text-emerald-200 text-sm font-medium">وضع نشط</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/20 border border-red-500/30 rounded-xl">
                  <Lock className="w-4 h-4 text-red-300" />
                  <span className="text-red-200 text-sm font-medium">محمي</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {result && (
          <div className="mb-6 bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 text-emerald-800 font-bold text-center animate-in fade-in duration-300">
            {result}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Delete Farm */}
          <ControlGuard customMessage="حذف المزرعة">
            <div className="bg-white rounded-2xl border-2 border-red-200 shadow-lg p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">حذف مزرعة</h3>
                  <p className="text-sm text-slate-600">Delete Farm Operation</p>
                </div>
              </div>
              <p className="text-slate-700 mb-4 text-sm">
                حذف المزرعة بشكل نهائي من النظام. لا يمكن التراجع عن هذا الإجراء.
              </p>
              <button
                onClick={handleDeleteFarm}
                className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
              >
                حذف الآن
              </button>
            </div>
          </ControlGuard>

          {/* Force Stop */}
          <ControlGuard customMessage="إيقاف قسري">
            <div className="bg-white rounded-2xl border-2 border-orange-200 shadow-lg p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                  <PowerOff className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">إيقاف قسري</h3>
                  <p className="text-sm text-slate-600">Force Stop Operations</p>
                </div>
              </div>
              <p className="text-slate-700 mb-4 text-sm">
                إيقاف جميع العمليات الجارية بشكل فوري وقسري.
              </p>
              <button
                onClick={handleForceStop}
                className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
              >
                إيقاف الآن
              </button>
            </div>
          </ControlGuard>

          {/* Override Lock */}
          <ControlGuard customMessage="تجاوز القفل">
            <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-lg p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center flex-shrink-0">
                  <AlertOctagon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">تجاوز القفل المالي</h3>
                  <p className="text-sm text-slate-600">Override Financial Lock</p>
                </div>
              </div>
              <p className="text-slate-700 mb-4 text-sm">
                تجاوز القفل المالي المفروض على العمليات الحساسة.
              </p>
              <button
                onClick={handleOverrideLock}
                className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
              >
                تجاوز القفل
              </button>
            </div>
          </ControlGuard>

          {/* Mass Operation */}
          <ControlGuard customMessage="عمليات جماعية">
            <div className="bg-white rounded-2xl border-2 border-purple-200 shadow-lg p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <RefreshCcw className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">عمليات جماعية</h3>
                  <p className="text-sm text-slate-600">Mass Operations</p>
                </div>
              </div>
              <p className="text-slate-700 mb-4 text-sm">
                تطبيق تغييرات على جميع المزارع دفعة واحدة.
              </p>
              <button
                onClick={handleMassOperation}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
              >
                تنفيذ الآن
              </button>
            </div>
          </ControlGuard>

          {/* Data Reset */}
          <ControlGuard customMessage="حذف البيانات">
            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-6 md:col-span-2">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center flex-shrink-0">
                  <Database className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">حذف البيانات التجريبية</h3>
                  <p className="text-sm text-slate-600">Reset Test Data</p>
                </div>
              </div>
              <p className="text-slate-700 mb-4 text-sm">
                حذف جميع البيانات التجريبية من النظام. يستخدم فقط في بيئة التطوير.
              </p>
              <button
                onClick={handleDataReset}
                className="px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl font-bold hover:shadow-lg transition-all"
              >
                حذف البيانات التجريبية
              </button>
            </div>
          </ControlGuard>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-blue-900 mb-2">كيفية استخدام الأوامر الحساسة:</h3>
              <ol className="text-blue-800 text-sm space-y-2 mr-6">
                <li className="list-decimal">اذهب إلى غرفة العمليات التنفيذية</li>
                <li className="list-decimal">اضغط على زر "السيطرة المطلقة" الأحمر</li>
                <li className="list-decimal">أدخل سبب التفعيل (مثل: صيانة طارئة، إصلاح خطأ حرج)</li>
                <li className="list-decimal">اضغط "تفعيل الآن"</li>
                <li className="list-decimal">عد إلى هذه الصفحة وسترى الأوامر بدلاً من الرسائل المحمية</li>
                <li className="list-decimal">بعد الانتهاء، عد وأوقف وضع السيطرة المطلقة</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
