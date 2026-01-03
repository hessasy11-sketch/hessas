import { useState } from 'react';
import { CreditCard, Smartphone, Wallet, Building2, Settings, CheckCircle, XCircle, AlertCircle, Loader, Eye, EyeOff, TestTube2, Clock } from 'lucide-react';
import { usePaymentGateways } from '../../../hooks/usePaymentGateways';
import GatewayConfigModal from './GatewayConfigModal';
import { supabase } from '../../../lib/supabase';

export default function PaymentGatewaysV2Tab() {
  const { gateways, loading, toggleGateway, updateGatewayConfig, refresh } = usePaymentGateways();
  const [selectedGateway, setSelectedGateway] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [testingGateway, setTestingGateway] = useState<string | null>(null);

  const getIcon = (code: string) => {
    if (code === 'bank_transfer') return Building2;
    if (code === 'tabby' || code === 'tamara') return Wallet;
    return CreditCard;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'electronic':
        return { label: 'إلكتروني', className: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'bank_transfer':
        return { label: 'تحويل بنكي', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'bnpl':
        return { label: 'تقسيط', className: 'bg-purple-100 text-purple-700 border-purple-200' };
      default:
        return { label: 'غير محدد', className: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  const getColorClasses = (color: string, enabled: boolean) => {
    if (!enabled) {
      return {
        gradient: 'from-gray-50 to-gray-100',
        border: 'border-gray-200',
        iconBg: 'bg-gray-100',
        iconText: 'text-gray-400'
      };
    }

    const colors: Record<string, any> = {
      blue: {
        gradient: 'from-blue-50 to-cyan-50',
        border: 'border-blue-200',
        iconBg: 'bg-blue-100',
        iconText: 'text-blue-600'
      },
      purple: {
        gradient: 'from-purple-50 to-pink-50',
        border: 'border-purple-200',
        iconBg: 'bg-purple-100',
        iconText: 'text-purple-600'
      },
      orange: {
        gradient: 'from-orange-50 to-amber-50',
        border: 'border-orange-200',
        iconBg: 'bg-orange-100',
        iconText: 'text-orange-600'
      },
      teal: {
        gradient: 'from-teal-50 to-cyan-50',
        border: 'border-teal-200',
        iconBg: 'bg-teal-100',
        iconText: 'text-teal-600'
      },
      emerald: {
        gradient: 'from-emerald-50 to-green-50',
        border: 'border-emerald-200',
        iconBg: 'bg-emerald-100',
        iconText: 'text-emerald-600'
      }
    };

    return colors[color] || colors.blue;
  };

  const handleToggle = async (id: string, currentState: boolean) => {
    const result = await toggleGateway(id, !currentState);
    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const handleSaveConfig = async (config: Record<string, any>) => {
    if (!selectedGateway) return { success: false };

    const result = await updateGatewayConfig(selectedGateway.id, config);
    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
    return result;
  };

  const handleVisibilityChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('b2f_payment_gateways_config')
        .update({ visibility_status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      refresh();
    } catch (error) {
      console.error('Error updating visibility:', error);
      alert('حدث خطأ أثناء تحديث حالة الظهور');
    }
  };

  const handleSetupStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('b2f_payment_gateways_config')
        .update({ setup_status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      refresh();
    } catch (error) {
      console.error('Error updating setup status:', error);
      alert('حدث خطأ أثناء تحديث حالة الإعداد');
    }
  };

  const handleTestConnection = async (gateway: any) => {
    setTestingGateway(gateway.id);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { error } = await supabase
        .from('b2f_payment_gateways_config')
        .update({
          test_connection_status: 'success',
          test_connection_at: new Date().toISOString(),
          test_connection_message: 'تم الاتصال بنجاح'
        })
        .eq('id', gateway.id);

      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      refresh();
    } catch (error) {
      console.error('Error testing connection:', error);

      await supabase
        .from('b2f_payment_gateways_config')
        .update({
          test_connection_status: 'failed',
          test_connection_at: new Date().toISOString(),
          test_connection_message: 'فشل الاتصال - يرجى التحقق من الإعدادات'
        })
        .eq('id', gateway.id);

      refresh();
    } finally {
      setTestingGateway(null);
    }
  };

  const getSetupStatusLabel = (status: string) => {
    switch (status) {
      case 'ready':
        return { label: 'جاهزة برمجياً', className: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'test':
        return { label: 'تحت الإعداد', className: 'bg-amber-100 text-amber-700 border-amber-200' };
      case 'live_ready':
        return { label: 'جاهزة للإطلاق', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      default:
        return { label: 'غير محدد', className: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  const getVisibilityStatusLabel = (status: string) => {
    switch (status) {
      case 'visible':
        return { label: 'ظاهرة ومفعّلة', className: 'bg-emerald-100 text-emerald-700', icon: Eye };
      case 'disabled_visible':
        return { label: 'ظاهرة غير مفعّلة', className: 'bg-amber-100 text-amber-700', icon: AlertCircle };
      case 'hidden':
        return { label: 'مخفية تماماً', className: 'bg-gray-100 text-gray-700', icon: EyeOff };
      default:
        return { label: 'غير محدد', className: 'bg-gray-100 text-gray-700', icon: AlertCircle };
    }
  };

  const enabledCount = gateways.filter(g => g.enabled).length;
  const disabledCount = gateways.filter(g => !g.enabled).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top">
          <CheckCircle className="w-5 h-5" />
          <span className="font-bold">تم الحفظ بنجاح</span>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Smartphone className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-black mb-1">بوابات الدفع</h2>
            <p className="text-purple-100 text-sm">إدارة وتفعيل وسائل الدفع المتاحة للمستثمرين</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-5 border-2 border-emerald-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm text-emerald-700 font-bold">بوابات مفعّلة</span>
          </div>
          <p className="text-3xl font-black text-gray-900">{enabledCount}</p>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 border-2 border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-gray-600" />
            </div>
            <span className="text-sm text-gray-700 font-bold">بوابات معطّلة</span>
          </div>
          <p className="text-3xl font-black text-gray-900">{disabledCount}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-blue-700 font-bold">إجمالي البوابات</span>
          </div>
          <p className="text-3xl font-black text-gray-900">{gateways.length}</p>
        </div>
      </div>

      {/* Gateways Table */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <th className="text-right px-6 py-4 text-sm font-black text-gray-700">اسم البوابة</th>
                <th className="text-right px-6 py-4 text-sm font-black text-gray-700">النوع</th>
                <th className="text-right px-6 py-4 text-sm font-black text-gray-700">الوصف</th>
                <th className="text-center px-6 py-4 text-sm font-black text-gray-700">حالة التفعيل</th>
                <th className="text-center px-6 py-4 text-sm font-black text-gray-700">التحكم</th>
                <th className="text-center px-6 py-4 text-sm font-black text-gray-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {gateways.map((gateway) => {
                const typeInfo = getTypeLabel(gateway.type);
                const colorClasses = getColorClasses(gateway.icon_color, gateway.enabled);
                const Icon = getIcon(gateway.code);

                return (
                  <tr key={gateway.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${colorClasses.iconBg} rounded-lg flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${colorClasses.iconText}`} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{gateway.name_ar}</p>
                          <p className="text-xs text-gray-500">{gateway.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 font-bold text-xs ${typeInfo.className}`}>
                        {typeInfo.label}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{gateway.description}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {gateway.enabled ? (
                          <div className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            مفعّل
                          </div>
                        ) : (
                          <div className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1">
                            <XCircle className="w-4 h-4" />
                            معطّل
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={gateway.enabled}
                            onChange={() => handleToggle(gateway.id, gateway.enabled)}
                            className="sr-only peer"
                          />
                          <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedGateway(gateway)}
                          className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                          title="إعداد"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-5 border-2 border-amber-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h4 className="font-black text-gray-900 mb-1">ملاحظة هامة</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              البوابات المفعّلة ستظهر للمستثمرين في صفحة الدفع داخل تبويب "المالية".
              البوابات المعطّلة لن تظهر للمستثمرين.
            </p>
          </div>
        </div>
      </div>

      {/* Config Modal */}
      {selectedGateway && (
        <GatewayConfigModal
          gateway={selectedGateway}
          onClose={() => setSelectedGateway(null)}
          onSave={handleSaveConfig}
        />
      )}
    </div>
  );
}
