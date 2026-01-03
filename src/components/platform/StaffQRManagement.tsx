import { useState } from 'react';
import { QrCode, Shield, Lock, Key, Printer, AlertTriangle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StaffAccessCard } from './StaffAccessCard';

interface StaffMember {
  id: string;
  user_id: string;
  full_name: string;
  job_title: string;
  role: string;
  department: string;
  phone_number: string;
  qr_token: string | null;
  qr_is_active: boolean;
  qr_generated_at: string | null;
  qr_last_scanned_at: string | null;
  requires_pin: boolean;
  pin_locked_until: string | null;
}

export function StaffQRManagement() {
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [showPrintCard, setShowPrintCard] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleGenerateQR = async (staffId: string) => {
    setIsGenerating(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.rpc('generate_staff_qr_token', {
        p_staff_id: staffId
      });

      if (error) throw error;

      setMessage({type: 'success', text: 'تم توليد الباركود بنجاح'});

      if (selectedStaff) {
        setSelectedStaff({
          ...selectedStaff,
          qr_token: data.qr_token,
          qr_is_active: true,
          qr_generated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error generating QR:', error);
      setMessage({type: 'error', text: 'فشل توليد الباركود'});
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleQR = async (staffId: string, newStatus: boolean) => {
    try {
      const { error } = await supabase.rpc('toggle_staff_qr_status', {
        p_staff_id: staffId,
        p_is_active: newStatus
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: newStatus ? 'تم تفعيل الباركود' : 'تم إيقاف الباركود'
      });

      if (selectedStaff) {
        setSelectedStaff({
          ...selectedStaff,
          qr_is_active: newStatus
        });
      }
    } catch (error) {
      console.error('Error toggling QR:', error);
      setMessage({type: 'error', text: 'فشل تحديث حالة الباركود'});
    }
  };

  const handleSetPin = async () => {
    if (pinCode.length !== 4) {
      setMessage({type: 'error', text: 'رمز PIN يجب أن يكون 4 أرقام'});
      return;
    }

    if (!selectedStaff) return;

    setIsSettingPin(true);
    setMessage(null);

    try {
      const { error } = await supabase.rpc('set_staff_pin', {
        p_staff_id: selectedStaff.id,
        p_pin_code: pinCode,
        p_requires_pin: true
      });

      if (error) throw error;

      setMessage({type: 'success', text: 'تم تعيين PIN بنجاح'});
      setPinCode('');

      if (selectedStaff) {
        setSelectedStaff({
          ...selectedStaff,
          requires_pin: true
        });
      }
    } catch (error) {
      console.error('Error setting PIN:', error);
      setMessage({type: 'error', text: 'فشل تعيين PIN'});
    } finally {
      setIsSettingPin(false);
    }
  };

  const handleRemovePin = async () => {
    if (!selectedStaff) return;

    try {
      const { error } = await supabase.rpc('remove_staff_pin', {
        p_staff_id: selectedStaff.id
      });

      if (error) throw error;

      setMessage({type: 'success', text: 'تم إلغاء PIN بنجاح'});

      if (selectedStaff) {
        setSelectedStaff({
          ...selectedStaff,
          requires_pin: false
        });
      }
    } catch (error) {
      console.error('Error removing PIN:', error);
      setMessage({type: 'error', text: 'فشل إلغاء PIN'});
    }
  };

  const handlePrintCard = () => {
    if (!selectedStaff || !selectedStaff.qr_token) {
      setMessage({type: 'error', text: 'يجب توليد باركود أولاً'});
      return;
    }
    setShowPrintCard(true);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">إدارة الباركود و PIN</h2>
            <p className="text-slate-400 text-sm">توليد وإدارة بطاقات الدخول للموظفين</p>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-4 ${
            message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              <p className={message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}>
                {message.text}
              </p>
            </div>
          </div>
        )}

        {selectedStaff ? (
          <div className="space-y-6">
            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedStaff.full_name}</h3>
                  <p className="text-slate-400 text-sm">{selectedStaff.job_title}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="px-3 py-1 bg-slate-700 rounded-full text-xs text-slate-300">
                      {selectedStaff.role}
                    </span>
                    <span className="px-3 py-1 bg-slate-700 rounded-full text-xs text-slate-300">
                      {selectedStaff.department}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStaff(null)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-400 text-xs mb-1">حالة الباركود</p>
                  <div className="flex items-center gap-2">
                    {selectedStaff.qr_token ? (
                      <>
                        {selectedStaff.qr_is_active ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">نشط</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-red-400" />
                            <span className="text-red-400 font-bold">متوقف</span>
                          </>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-500">لم يُنشأ بعد</span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-400 text-xs mb-1">يتطلب PIN</p>
                  <div className="flex items-center gap-2">
                    {selectedStaff.requires_pin ? (
                      <>
                        <Lock className="w-5 h-5 text-blue-400" />
                        <span className="text-blue-400 font-bold">نعم</span>
                      </>
                    ) : (
                      <span className="text-slate-500">لا</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {!selectedStaff.qr_token ? (
                  <button
                    onClick={() => handleGenerateQR(selectedStaff.id)}
                    disabled={isGenerating}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        جاري التوليد...
                      </>
                    ) : (
                      <>
                        <QrCode className="w-5 h-5" />
                        توليد باركود
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedStaff.qr_is_active ? (
                        <button
                          onClick={() => handleToggleQR(selectedStaff.id, false)}
                          className="py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                          <AlertTriangle className="w-5 h-5" />
                          إيقاف فوري
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleQR(selectedStaff.id, true)}
                          className="py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          تفعيل
                        </button>
                      )}

                      <button
                        onClick={handlePrintCard}
                        className="py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <Printer className="w-5 h-5" />
                        طباعة البطاقة
                      </button>
                    </div>

                    <div className="border-t border-slate-700 pt-4 mt-4">
                      <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                        <Key className="w-5 h-5 text-blue-400" />
                        إدارة PIN
                      </h4>

                      {!selectedStaff.requires_pin ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={pinCode}
                            onChange={(e) => setPinCode(e.target.value.replace(/\D/g, '').substring(0, 4))}
                            placeholder="أدخل 4 أرقام"
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white text-center text-2xl tracking-widest focus:outline-none focus:border-blue-500"
                            maxLength={4}
                          />
                          <button
                            onClick={handleSetPin}
                            disabled={isSettingPin || pinCode.length !== 4}
                            className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSettingPin ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                جاري التعيين...
                              </>
                            ) : (
                              <>
                                <Lock className="w-5 h-5" />
                                تعيين PIN
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-blue-400">
                              <Shield className="w-5 h-5" />
                              <span>هذا الموظف يتطلب PIN للدخول</span>
                            </div>
                          </div>
                          <button
                            onClick={handleRemovePin}
                            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
                          >
                            إلغاء PIN
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <QrCode className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">اختر موظفاً من القائمة لإدارة الباركود و PIN</p>
          </div>
        )}
      </div>

      {showPrintCard && selectedStaff && selectedStaff.qr_token && (
        <StaffAccessCard
          staffName={selectedStaff.full_name}
          jobTitle={selectedStaff.job_title}
          department={selectedStaff.department}
          qrToken={selectedStaff.qr_token}
          requiresPin={selectedStaff.requires_pin}
          onClose={() => setShowPrintCard(false)}
        />
      )}
    </div>
  );
}
