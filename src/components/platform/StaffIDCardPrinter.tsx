import { useState, useEffect } from 'react';
import { QrCode, Download, Printer, User, Briefcase, Hash, Building2, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StaffMember {
  id: string;
  full_name: string;
  staff_code: string;
  job_title: string;
  department: string;
  qr_code: string;
  qr_is_active: boolean;
  role: string;
}

export function StaffIDCardPrinter() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStaffList();
  }, []);

  const loadStaffList = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_staff')
        .select('id, full_name, staff_code, job_title, department, qr_code, qr_is_active, role')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setStaffList(data || []);
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintCard = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const downloadQRAsImage = async (staff: StaffMember) => {
    try {
      const link = document.createElement('a');
      link.href = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(staff.qr_code)}`;
      link.download = `QR-${staff.staff_code}-${staff.full_name}.png`;
      link.click();
    } catch (error) {
      console.error('Error downloading QR:', error);
      alert('فشل تحميل QR Code');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <QrCode className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">بطاقات الموظفين</h2>
            <p className="text-blue-100">طباعة وتحميل QR Codes</p>
          </div>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staffList.map((staff) => (
          <div
            key={staff.id}
            className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-shadow"
          >
            {/* Staff Info */}
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{staff.full_name}</h3>
                <p className="text-sm text-gray-600">{staff.job_title}</p>
              </div>
              {staff.qr_is_active ? (
                <div className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  مفعّل
                </div>
              ) : (
                <div className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                  معطّل
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Hash className="w-4 h-4" />
                <span>{staff.staff_code}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="w-4 h-4" />
                <span>{staff.department || 'بدون قسم'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shield className="w-4 h-4" />
                <span>{staff.role || 'بدون دور'}</span>
              </div>
            </div>

            {/* QR Preview */}
            {staff.qr_code && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="bg-white p-2 rounded inline-block">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: `
                        <div id="qr-${staff.id}" style="width: 100px; height: 100px;">
                          <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(staff.qr_code)}"
                               alt="QR Code"
                               style="width: 100%; height: 100%;" />
                        </div>
                      `
                    }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handlePrintCard(staff)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Printer className="w-4 h-4" />
                طباعة
              </button>
              <button
                onClick={() => downloadQRAsImage(staff)}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                تحميل
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Print Card Modal */}
      {selectedStaff && (
        <div className="hidden print:block fixed inset-0 bg-white z-50">
          <div className="w-[350px] h-[550px] mx-auto my-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-6 text-white shadow-2xl">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-3 bg-white rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold">{selectedStaff.full_name}</h2>
              <p className="text-blue-100 text-sm">{selectedStaff.job_title}</p>
            </div>

            {/* QR Code */}
            <div className="bg-white rounded-2xl p-6 mb-6">
              <div className="flex justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedStaff.qr_code)}`}
                  alt="QR Code"
                  className="w-48 h-48"
                />
              </div>
            </div>

            {/* Info */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 bg-white/20 rounded-lg p-3">
                <Hash className="w-4 h-4" />
                <div>
                  <div className="text-xs text-blue-100">رقم الموظف</div>
                  <div className="font-bold">{selectedStaff.staff_code}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/20 rounded-lg p-3">
                <Building2 className="w-4 h-4" />
                <div>
                  <div className="text-xs text-blue-100">القسم</div>
                  <div className="font-bold">{selectedStaff.department || 'عام'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/20 rounded-lg p-3">
                <Shield className="w-4 h-4" />
                <div>
                  <div className="text-xs text-blue-100">الدور</div>
                  <div className="font-bold">{selectedStaff.role || 'موظف'}</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-xs text-blue-100">
              بطاقة دخول رسمية - المنصة
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          .print\\:block {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
          }
        }
      `}</style>
    </div>
  );
}
