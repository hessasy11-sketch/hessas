import { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { PaymentGateway } from '../../../hooks/usePaymentGateways';

interface GatewayConfigModalProps {
  gateway: PaymentGateway;
  onClose: () => void;
  onSave: (config: Record<string, any>) => Promise<{ success: boolean }>;
}

export default function GatewayConfigModal({ gateway, onClose, onSave }: GatewayConfigModalProps) {
  const [config, setConfig] = useState(gateway.config);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const result = await onSave(config);
    setSaving(false);

    if (result.success) {
      onClose();
    }
  };

  const updateField = (field: string, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const renderElectronicFields = () => (
    <>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          البيئة
        </label>
        <select
          value={config.environment || 'test'}
          onChange={(e) => updateField('environment', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="test">اختبار (Test)</option>
          <option value="live">مباشر (Live)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Merchant ID
        </label>
        <input
          type="text"
          value={config.merchant_id || ''}
          onChange={(e) => updateField('merchant_id', e.target.value)}
          placeholder="أدخل Merchant ID"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          API Key
        </label>
        <input
          type="password"
          value={config.api_key || ''}
          onChange={(e) => updateField('api_key', e.target.value)}
          placeholder="أدخل API Key"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          API Secret
        </label>
        <input
          type="password"
          value={config.api_secret || ''}
          onChange={(e) => updateField('api_secret', e.target.value)}
          placeholder="أدخل API Secret"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Callback URL
        </label>
        <input
          type="url"
          value={config.callback_url || ''}
          onChange={(e) => updateField('callback_url', e.target.value)}
          placeholder="https://example.com/callback"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {gateway.code === 'cards' && (
        <>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <input
              type="checkbox"
              id="apple_pay"
              checked={config.supports_apple_pay || false}
              onChange={(e) => updateField('supports_apple_pay', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300"
            />
            <label htmlFor="apple_pay" className="text-sm font-bold text-gray-700">
              دعم Apple Pay
            </label>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <input
              type="checkbox"
              id="stc_pay"
              checked={config.supports_stc_pay || false}
              onChange={(e) => updateField('supports_stc_pay', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300"
            />
            <label htmlFor="stc_pay" className="text-sm font-bold text-gray-700">
              دعم STC Pay
            </label>
          </div>
        </>
      )}
    </>
  );

  const renderBNPLFields = () => (
    <>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          البيئة
        </label>
        <select
          value={config.environment || 'test'}
          onChange={(e) => updateField('environment', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="test">اختبار (Test)</option>
          <option value="live">مباشر (Live)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Merchant ID
        </label>
        <input
          type="text"
          value={config.merchant_id || ''}
          onChange={(e) => updateField('merchant_id', e.target.value)}
          placeholder="أدخل Merchant ID"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {gateway.code === 'tabby' ? (
        <>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Public Key
            </label>
            <input
              type="text"
              value={config.public_key || ''}
              onChange={(e) => updateField('public_key', e.target.value)}
              placeholder="أدخل Public Key"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Secret Key
            </label>
            <input
              type="password"
              value={config.secret_key || ''}
              onChange={(e) => updateField('secret_key', e.target.value)}
              placeholder="أدخل Secret Key"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Webhook Secret
            </label>
            <input
              type="password"
              value={config.webhook_secret || ''}
              onChange={(e) => updateField('webhook_secret', e.target.value)}
              placeholder="أدخل Webhook Secret"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              API Token
            </label>
            <input
              type="password"
              value={config.api_token || ''}
              onChange={(e) => updateField('api_token', e.target.value)}
              placeholder="أدخل API Token"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Notification Token
            </label>
            <input
              type="password"
              value={config.notification_token || ''}
              onChange={(e) => updateField('notification_token', e.target.value)}
              placeholder="أدخل Notification Token"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </>
      )}
    </>
  );

  const renderBankTransferFields = () => (
    <>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          اسم البنك
        </label>
        <input
          type="text"
          value={config.bank_name || ''}
          onChange={(e) => updateField('bank_name', e.target.value)}
          placeholder="مثال: البنك الأهلي السعودي"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          اسم الحساب
        </label>
        <input
          type="text"
          value={config.account_name || ''}
          onChange={(e) => updateField('account_name', e.target.value)}
          placeholder="مثال: شركة استثمار أشجار المزارع"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          رقم الحساب
        </label>
        <input
          type="text"
          value={config.account_number || ''}
          onChange={(e) => updateField('account_number', e.target.value)}
          placeholder="مثال: 1234567890"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          الآيبان (IBAN)
        </label>
        <input
          type="text"
          value={config.iban || ''}
          onChange={(e) => updateField('iban', e.target.value)}
          placeholder="SA0000000000000000000000"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          ملاحظات إضافية
        </label>
        <textarea
          value={config.notes || ''}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="أي ملاحظات أو تعليمات للمستثمر"
          rows={3}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black mb-1">إعداد بوابة الدفع</h2>
              <p className="text-blue-100 text-sm">{gateway.name_ar}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Info Box */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-bold mb-1">ملاحظة هامة</p>
                <p className="leading-relaxed">
                  هذه الإعدادات لن يتم استخدامها حالياً للربط الفعلي مع مزود الدفع.
                  يتم حفظها للمرحلة التالية من التطوير.
                </p>
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            {gateway.type === 'electronic' && renderElectronicFields()}
            {gateway.type === 'bnpl' && renderBNPLFields()}
            {gateway.type === 'bank_transfer' && renderBankTransferFields()}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 p-6 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white hover:bg-gray-100 border-2 border-gray-300 text-gray-700 font-bold rounded-xl transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
