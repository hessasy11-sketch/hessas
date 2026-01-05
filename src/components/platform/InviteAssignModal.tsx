import { useState, useEffect } from 'react';
import {
  X,
  Send,
  Copy,
  CheckCircle2,
  AlertCircle,
  Building2,
  Leaf,
  Globe,
  MapPin
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface RoleFromCatalog {
  role_code: string;
  role_name_ar: string;
  role_name_en: string;
  department: string;
  level: number;
  description_ar: string;
  requires_invitation: boolean;
  current_assignments: number;
  max_assignments: number | null;
}

interface Farm {
  id: string;
  name: string;
  location: string;
}

interface InviteAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  roles: RoleFromCatalog[];
  onSuccess: () => void;
}

export default function InviteAssignModal({
  isOpen,
  onClose,
  roles,
  onSuccess
}: InviteAssignModalProps) {
  const [inviteeName, setInviteeName] = useState('');
  const [inviteePhone, setInviteePhone] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [scopeType, setScopeType] = useState<'platform' | 'b2f' | 'b2b' | 'farm'>('platform');
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [notes, setNotes] = useState('');
  const [expiryDays, setExpiryDays] = useState(30);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && scopeType === 'farm') {
      loadFarms();
    }
  }, [isOpen, scopeType]);

  const loadFarms = async () => {
    const { data } = await supabase
      .from('b2f_farms')
      .select('id, name, location')
      .eq('status', 'active')
      .order('name');

    if (data) {
      setFarms(data);
    }
  };

  const handleSubmit = async () => {
    if (!inviteeName.trim()) {
      alert('الرجاء إدخال اسم المدعو');
      return;
    }

    if (!inviteePhone.trim()) {
      alert('الرجاء إدخال رقم الجوال');
      return;
    }

    if (!selectedRole) {
      alert('الرجاء اختيار الدور');
      return;
    }

    if (scopeType === 'farm' && !selectedFarmId) {
      alert('الرجاء اختيار المزرعة');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('create_authority_invitation', {
        p_invitee_name: inviteeName,
        p_invitee_phone: inviteePhone,
        p_authority_role: selectedRole,
        p_scope_type: scopeType,
        p_scope_farm_id: scopeType === 'farm' ? selectedFarmId : null,
        p_invited_by: 'GM',
        p_notes: notes || null,
        p_expiry_days: expiryDays
      });

      if (error) throw error;

      if (data?.success) {
        setInviteCode(data.invite_code);
      } else {
        alert(data?.message || 'فشل إنشاء الدعوة');
      }
    } catch (error) {
      console.error('Error creating invitation:', error);
      alert('حدث خطأ أثناء إنشاء الدعوة');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setInviteeName('');
    setInviteePhone('');
    setSelectedRole('');
    setScopeType('platform');
    setSelectedFarmId('');
    setNotes('');
    setExpiryDays(30);
    setInviteCode(null);
    setCopied(false);
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  const selectedRoleData = roles.find(r => r.role_code === selectedRole);

  if (inviteCode) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 rounded-t-2xl">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white text-center mb-2">تم إنشاء الدعوة بنجاح</h3>
            <p className="text-emerald-100 text-center text-sm">شارك هذا الكود مع المدعو</p>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-slate-50 rounded-xl p-6 text-center">
              <p className="text-sm text-slate-600 mb-2">كود الدعوة</p>
              <div className="text-4xl font-bold text-slate-900 tracking-wider mb-4 font-mono">
                {inviteCode}
              </div>
              <button
                onClick={handleCopyCode}
                className={`w-full px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  copied
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    تم النسخ
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    نسخ الكود
                  </>
                )}
              </button>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-bold mb-1">معلومات الدعوة:</p>
                  <ul className="space-y-1 text-xs">
                    <li>الاسم: {inviteeName}</li>
                    <li>الجوال: {inviteePhone}</li>
                    <li>الدور: {selectedRoleData?.role_name_ar}</li>
                    <li>النطاق: {scopeType}</li>
                    <li>صالح لمدة: {expiryDays} يوم</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full px-4 py-3 bg-slate-600 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Send className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">دعوة وتعيين</h3>
              <p className="text-blue-200 text-sm">إنشاء دعوة لموظف غير مسجل</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  اسم المدعو <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={inviteeName}
                  onChange={(e) => setInviteeName(e.target.value)}
                  placeholder="أدخل الاسم الكامل"
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  رقم الجوال <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={inviteePhone}
                  onChange={(e) => setInviteePhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                الدور <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              >
                <option value="">-- اختر الدور --</option>
                {roles.map((role) => (
                  <option key={role.role_code} value={role.role_code}>
                    {role.role_name_ar} ({role.role_name_en}) - Level {role.level}
                  </option>
                ))}
              </select>
              {selectedRoleData?.description_ar && (
                <p className="text-xs text-slate-600 mt-1">{selectedRoleData.description_ar}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                النطاق (Scope) <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setScopeType('platform')}
                  className={`px-3 py-3 rounded-xl font-bold text-sm transition-all flex flex-col items-center gap-1 ${
                    scopeType === 'platform'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Globe className="w-5 h-5" />
                  <span>Platform</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScopeType('b2f')}
                  className={`px-3 py-3 rounded-xl font-bold text-sm transition-all flex flex-col items-center gap-1 ${
                    scopeType === 'b2f'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Leaf className="w-5 h-5" />
                  <span>B2F</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScopeType('b2b')}
                  className={`px-3 py-3 rounded-xl font-bold text-sm transition-all flex flex-col items-center gap-1 ${
                    scopeType === 'b2b'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                  <span>B2B</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScopeType('farm')}
                  className={`px-3 py-3 rounded-xl font-bold text-sm transition-all flex flex-col items-center gap-1 ${
                    scopeType === 'farm'
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                  <span>Farm</span>
                </button>
              </div>
            </div>

            {scopeType === 'farm' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  اختر المزرعة <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedFarmId}
                  onChange={(e) => setSelectedFarmId(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                >
                  <option value="">-- اختر مزرعة --</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name} - {farm.location}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                مدة صلاحية الدعوة (بالأيام)
              </label>
              <input
                type="number"
                value={expiryDays}
                onChange={(e) => setExpiryDays(parseInt(e.target.value) || 30)}
                min="1"
                max="365"
                className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                ملاحظات (اختياري)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="أضف أي ملاحظات أو تعليمات خاصة..."
                className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none"
              />
            </div>

            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="font-bold mb-1">تنبيه:</p>
                  <p>سيتم توليد كود دعوة فريد. يجب على المدعو استخدام هذا الكود للتسجيل والحصول على الصلاحيات.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    إنشاء الدعوة
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
