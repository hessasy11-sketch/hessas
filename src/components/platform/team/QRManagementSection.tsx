import { useState, useEffect } from 'react';
import {
  QrCode,
  Download,
  RefreshCw,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle,
  X,
  Key,
  Search,
  Shield
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface StaffMember {
  id: string;
  phone_number: string;
  full_name: string;
  role: string;
  department: string;
  qr_code: string | null;
  requires_pin: boolean;
  is_active: boolean;
}

interface QRManagementSectionProps {
  onQRUpdated: () => void;
}

export default function QRManagementSection({ onQRUpdated }: QRManagementSectionProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    filterStaffList();
  }, [searchTerm, staff]);

  const loadStaff = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('platform_staff')
        .select('id, phone_number, full_name, role, department, qr_code, requires_pin, is_active')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;

      setStaff(data || []);
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterStaffList = () => {
    let filtered = staff;

    if (searchTerm) {
      filtered = filtered.filter(
        (member) =>
          member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.phone_number.includes(searchTerm)
      );
    }

    setFilteredStaff(filtered);
  };

  const generateQR = async (staffId: string, requiresPIN: boolean) => {
    try {
      const qrCode = `STAFF_${staffId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const { error } = await supabase
        .from('platform_staff')
        .update({
          qr_code: qrCode,
          requires_pin: requiresPIN,
        })
        .eq('id', staffId);

      if (error) throw error;

      await loadStaff();
      onQRUpdated();

      alert('تم إنشاء الباركود بنجاح');
    } catch (error) {
      console.error('Error generating QR:', error);
      alert('فشل إنشاء الباركود');
    }
  };

  const revokeQR = async (staffId: string) => {
    if (!confirm('هل أنت متأكد من إلغاء الباركود؟ سيتعين على الموظف طلب باركود جديد.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('platform_staff')
        .update({
          qr_code: null,
          requires_pin: false,
        })
        .eq('id', staffId);

      if (error) throw error;

      await loadStaff();
      onQRUpdated();

      alert('تم إلغاء الباركود بنجاح');
    } catch (error) {
      console.error('Error revoking QR:', error);
      alert('فشل إلغاء الباركود');
    }
  };

  const togglePINRequirement = async (staffId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('platform_staff')
        .update({ requires_pin: !currentValue })
        .eq('id', staffId);

      if (error) throw error;

      await loadStaff();
      onQRUpdated();
    } catch (error) {
      console.error('Error toggling PIN:', error);
      alert('فشل تحديث متطلب الـ PIN');
    }
  };

  const viewQR = (member: StaffMember) => {
    setSelectedStaff(member);
    setShowQRModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-emerald-400 mx-auto mb-4" />
          <p className="text-white font-medium">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-200 text-sm leading-relaxed">
              <strong>نظام الباركود:</strong> يمكنك إصدار باركود لكل موظف مع خيار إضافة PIN (4 أرقام) للحماية الإضافية.
              يمكنك إلغاء أي باركود فوراً (Kill switch) في حالة الطوارئ.
            </p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="بحث بالاسم أو رقم الجوال..."
          className="w-full pr-12 pl-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredStaff.map((member) => (
          <div
            key={member.id}
            className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                  member.qr_code ? 'from-emerald-500 to-teal-600' : 'from-orange-500 to-red-600'
                } flex items-center justify-center flex-shrink-0`}>
                  <QrCode className="w-6 h-6 text-white" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-white font-bold text-lg">{member.full_name}</h3>
                    <span className="px-2 py-1 rounded-lg text-xs font-bold bg-white/10 text-gray-300">
                      {member.phone_number}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    {member.qr_code ? (
                      <>
                        <div className="flex items-center gap-2 text-emerald-400">
                          <CheckCircle className="w-4 h-4" />
                          باركود نشط
                        </div>
                        {member.requires_pin ? (
                          <div className="flex items-center gap-2 text-blue-400">
                            <Lock className="w-4 h-4" />
                            محمي بـ PIN
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Unlock className="w-4 h-4" />
                            بدون PIN
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-orange-400">
                        <AlertCircle className="w-4 h-4" />
                        بدون باركود
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {member.qr_code ? (
                  <>
                    <button
                      onClick={() => viewQR(member)}
                      className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                      <QrCode className="w-4 h-4" />
                      عرض
                    </button>

                    <button
                      onClick={() => togglePINRequirement(member.id, member.requires_pin)}
                      className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
                        member.requires_pin
                          ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                          : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                      }`}
                    >
                      <Key className="w-4 h-4" />
                      PIN
                    </button>

                    <button
                      onClick={() => revokeQR(member.id)}
                      className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      إلغاء
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => generateQR(member.id, false)}
                      className="px-4 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                      <QrCode className="w-4 h-4" />
                      إصدار بدون PIN
                    </button>

                    <button
                      onClick={() => generateQR(member.id, true)}
                      className="px-4 py-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      إصدار مع PIN
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredStaff.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-400">لا توجد نتائج</p>
        </div>
      )}

      {showQRModal && selectedStaff && (
        <QRViewModal
          staff={selectedStaff}
          onClose={() => {
            setShowQRModal(false);
            setSelectedStaff(null);
          }}
        />
      )}
    </div>
  );
}

interface QRViewModalProps {
  staff: StaffMember;
  onClose: () => void;
}

function QRViewModal({ staff, onClose }: QRViewModalProps) {
  const downloadQR = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 500;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 400, 500);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(staff.full_name, 200, 30);

    ctx.font = '14px Arial';
    ctx.fillText(staff.phone_number, 200, 50);

    ctx.fillStyle = '#666666';
    ctx.font = '12px Arial';
    ctx.fillText('باركود الدخول', 200, 480);

    const qrSize = 300;
    const qrX = 50;
    const qrY = 80;
    const cellSize = qrSize / 25;

    for (let i = 0; i < 25; i++) {
      for (let j = 0; j < 25; j++) {
        if (Math.random() > 0.5) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(qrX + j * cellSize, qrY + i * cellSize, cellSize, cellSize);
        }
      }
    }

    const link = document.createElement('a');
    link.download = `qr_${staff.full_name}_${staff.phone_number}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl max-w-md w-full border border-white/10 shadow-2xl">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">باركود الدخول</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-2">{staff.full_name}</h3>
            <p className="text-gray-400">{staff.phone_number}</p>
          </div>

          <div className="bg-white rounded-xl p-8 flex items-center justify-center">
            <div className="text-center">
              <QrCode className="w-48 h-48 text-black mx-auto" />
              <p className="text-gray-600 text-sm mt-4 font-mono">
                {staff.qr_code?.substring(0, 20)}...
              </p>
            </div>
          </div>

          {staff.requires_pin && (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-purple-200 font-bold">محمي بـ PIN</p>
                  <p className="text-purple-300 text-sm">
                    يتطلب إدخال رمز PIN (4 أرقام) عند المسح
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={downloadQR}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            تحميل الباركود
          </button>
        </div>
      </div>
    </div>
  );
}
