import { useState, useEffect, useRef } from 'react';
import { Scan, AlertTriangle, CheckCircle2, XCircle, RefreshCw, BarChart3, Shield, Users } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '../../lib/supabase';

interface QRStatus {
  valid: boolean;
  status: string;
  staff_count: number;
  staff_records: any[];
  issues: any[];
  message: string;
}

interface QRStatistics {
  total_staff: number;
  active_qr: number;
  inactive_qr: number;
  duplicate_qr: number;
  missing_qr: number;
  health_score: number;
}

interface CleanupReport {
  total_staff: number;
  active_qr: number;
  inactive_staff_with_qr: number;
  no_department_with_qr: number;
  orphaned_qr: number;
  need_cleanup: number;
  cleanup_needed: boolean;
  health_status: string;
}

export function QRScannerValidator() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [statistics, setStatistics] = useState<QRStatistics | null>(null);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cleanupReport, setCleanupReport] = useState<CleanupReport | null>(null);
  const [orphanedQRs, setOrphanedQRs] = useState<any[]>([]);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    loadStatistics();
    loadDuplicates();
    loadCleanupReport();
    loadOrphanedQRs();
  }, []);

  const loadStatistics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_qr_codes_statistics');
      if (error) throw error;
      setStatistics(data);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const loadDuplicates = async () => {
    try {
      const { data, error } = await supabase.rpc('find_duplicate_qr_codes');
      if (error) throw error;
      setDuplicates(data || []);
    } catch (error) {
      console.error('Error loading duplicates:', error);
    }
  };

  const loadCleanupReport = async () => {
    try {
      const { data, error } = await supabase.rpc('get_qr_cleanup_report');
      if (error) throw error;
      setCleanupReport(data);
    } catch (error) {
      console.error('Error loading cleanup report:', error);
    }
  };

  const loadOrphanedQRs = async () => {
    try {
      const { data, error } = await supabase.rpc('get_orphaned_qr_codes');
      if (error) throw error;
      setOrphanedQRs(data || []);
    } catch (error) {
      console.error('Error loading orphaned QRs:', error);
    }
  };

  const startScanner = () => {
    setScanning(true);
    setScanResult(null);

    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        'qr-scanner',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        false
      );

      scanner.render(
        async (decodedText) => {
          scanner.clear();
          setScanning(false);
          await scanQRCode(decodedText);
        },
        (error) => {
          console.log('QR scan error:', error);
        }
      );

      scannerRef.current = scanner;
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const scanQRCode = async (qrCode: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('scan_qr_and_get_info', {
        p_qr_code: qrCode
      });

      if (error) throw error;
      setScanResult(data);
    } catch (error) {
      console.error('Error scanning QR:', error);
      setScanResult({
        success: false,
        qr_status: {
          valid: false,
          message: 'فشل مسح QR Code'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const fixDuplicates = async () => {
    if (!confirm('هل أنت متأكد من إصلاح جميع QR المكررة؟\nسيتم توليد رموز جديدة للموظفين المتأثرين.')) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('fix_duplicate_qr_codes');
      if (error) throw error;

      alert(data.message);
      await loadStatistics();
      await loadDuplicates();
    } catch (error) {
      console.error('Error fixing duplicates:', error);
      alert('فشل إصلاح التكرارات');
    } finally {
      setLoading(false);
    }
  };

  const cleanupOrphanedQRs = async () => {
    if (!confirm('هل تريد تنظيف جميع QR اليتيمة؟\n- سيتم تعطيل QR للموظفين المعطّلين\n- سيتم مسح QR للموظفين بدون قسم')) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('cleanup_orphaned_qr_codes');
      if (error) throw error;

      alert(data.message);
      await loadStatistics();
      await loadCleanupReport();
      await loadOrphanedQRs();
    } catch (error) {
      console.error('Error cleaning up:', error);
      alert('فشل التنظيف');
    } finally {
      setLoading(false);
    }
  };

  const syncQRStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('sync_qr_with_staff_status');
      if (error) throw error;

      alert(data.message);
      await loadStatistics();
      await loadCleanupReport();
      await loadOrphanedQRs();
    } catch (error) {
      console.error('Error syncing:', error);
      alert('فشلت المزامنة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{statistics.total_staff}</div>
                <div className="text-xs text-gray-600">إجمالي الموظفين</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{statistics.active_qr}</div>
                <div className="text-xs text-gray-600">QR نشط</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{statistics.inactive_qr}</div>
                <div className="text-xs text-gray-600">QR معطّل</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{statistics.duplicate_qr}</div>
                <div className="text-xs text-gray-600">QR مكرر</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <XCircle className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">{statistics.missing_qr}</div>
                <div className="text-xs text-gray-600">بدون QR</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{statistics.health_score}%</div>
                <div className="text-xs text-gray-600">الصحة</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Section */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Scan className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">مسح QR Code</h3>
                <p className="text-sm text-gray-600">افحص صحة وحالة QR</p>
              </div>
            </div>
          </div>

          {/* Scanner */}
          {!scanning && !scanResult && (
            <div className="text-center py-12">
              <Scan className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-6">اضغط لبدء المسح</p>
              <button
                onClick={startScanner}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
              >
                ابدأ المسح
              </button>
            </div>
          )}

          {scanning && (
            <div>
              <div id="qr-scanner" className="mb-4"></div>
              <button
                onClick={stopScanner}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors"
              >
                إيقاف المسح
              </button>
            </div>
          )}

          {/* Scan Result */}
          {scanResult && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border-2 ${
                  scanResult.qr_status.valid
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  {scanResult.qr_status.valid ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                  <div>
                    <div className="font-bold text-lg">
                      {scanResult.qr_status.message}
                    </div>
                    <div className="text-sm opacity-75">
                      الحالة: {scanResult.qr_status.status}
                    </div>
                  </div>
                </div>

                {/* Issues */}
                {scanResult.qr_status.issues && scanResult.qr_status.issues.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <div className="font-bold text-sm">المشاكل المكتشفة:</div>
                    {scanResult.qr_status.issues.map((issue: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg ${
                          issue.severity === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm font-bold">{issue.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Staff Info */}
                {scanResult.qr_status.staff_records && (
                  <div className="mt-4 space-y-2">
                    <div className="font-bold text-sm">الموظفين:</div>
                    {scanResult.qr_status.staff_records.map((staff: any) => (
                      <div key={staff.id} className="bg-white p-3 rounded-lg border">
                        <div className="font-bold">{staff.full_name}</div>
                        <div className="text-sm text-gray-600">
                          {staff.staff_code} • {staff.department} • {staff.role}
                        </div>
                        <div className="flex gap-2 mt-2">
                          {staff.is_active ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              موظف نشط
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                              موظف معطّل
                            </span>
                          )}
                          {staff.qr_is_active ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              QR مفعّل
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                              QR معطّل
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setScanResult(null);
                  startScanner();
                }}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Scan className="w-5 h-5" />
                مسح آخر
              </button>
            </div>
          )}
        </div>

        {/* Duplicates Section */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">QR مكررة</h3>
                <p className="text-sm text-gray-600">
                  {duplicates.length} رمز مكرر
                </p>
              </div>
            </div>
            {duplicates.length > 0 && (
              <button
                onClick={fixDuplicates}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    جاري الإصلاح...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    إصلاح الكل
                  </>
                )}
              </button>
            )}
          </div>

          {duplicates.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600 font-bold">لا توجد QR مكررة</p>
              <p className="text-sm text-gray-500">جميع الرموز فريدة</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {duplicates.map((dup, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <div className="font-bold text-red-700 mb-1">
                        رمز مكرر ({dup.duplicate_count} مرات)
                      </div>
                      <div className="text-xs text-gray-600 font-mono bg-white px-2 py-1 rounded">
                        {dup.qr_code}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-bold text-gray-700">الموظفين المتأثرين:</div>
                    {dup.staff_names.map((name: string, i: number) => (
                      <div key={i} className="text-sm text-gray-600 bg-white px-3 py-2 rounded-lg">
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cleanup & Maintenance Section */}
      {cleanupReport && cleanupReport.cleanup_needed && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${
                cleanupReport.health_status === 'excellent' ? 'bg-green-100' :
                cleanupReport.health_status === 'good' ? 'bg-blue-100' :
                cleanupReport.health_status === 'warning' ? 'bg-yellow-100' :
                'bg-red-100'
              }`}>
                <Shield className={`w-6 h-6 ${
                  cleanupReport.health_status === 'excellent' ? 'text-green-600' :
                  cleanupReport.health_status === 'good' ? 'text-blue-600' :
                  cleanupReport.health_status === 'warning' ? 'text-yellow-600' :
                  'text-red-600'
                }`} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">صيانة تلقائية</h3>
                <p className="text-sm text-gray-600">
                  {cleanupReport.need_cleanup} عنصر يحتاج تنظيف
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={syncQRStatus}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    مزامنة...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    مزامنة
                  </>
                )}
              </button>
              <button
                onClick={cleanupOrphanedQRs}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    تنظيف...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    تنظيف تلقائي
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Cleanup Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-gray-900">
                {cleanupReport.inactive_staff_with_qr}
              </div>
              <div className="text-sm text-gray-600">موظف معطّل بـ QR نشط</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-gray-900">
                {cleanupReport.no_department_with_qr}
              </div>
              <div className="text-sm text-gray-600">بدون قسم ولديهم QR</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-gray-900">
                {cleanupReport.orphaned_qr}
              </div>
              <div className="text-sm text-gray-600">QR يتيمة</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
              <div className="text-2xl font-bold text-blue-600">
                {cleanupReport.health_status === 'excellent' ? 'ممتاز' :
                 cleanupReport.health_status === 'good' ? 'جيد' :
                 cleanupReport.health_status === 'warning' ? 'تحذير' : 'حرج'}
              </div>
              <div className="text-sm text-gray-600">حالة النظام</div>
            </div>
          </div>

          {/* Orphaned QRs List */}
          {orphanedQRs.length > 0 && (
            <div>
              <div className="font-bold text-gray-900 mb-3">QR تحتاج صيانة:</div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {orphanedQRs.map((qr: any) => (
                  <div
                    key={qr.staff_id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-900">{qr.full_name}</div>
                        <div className="text-sm text-gray-600">
                          {qr.staff_code} • {qr.department || 'بدون قسم'}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!qr.is_active && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                            معطّل
                          </span>
                        )}
                        {(!qr.department || qr.department === '') && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                            بلا قسم
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
