import { useState, useEffect } from 'react';
import { FileText, User, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function SmartLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const { data } = await supabase
      .from('system_logs')
      .select('*, profiles(display_name)')
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setLogs(data);
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center p-8"><RefreshCw className="w-8 h-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">السجلات الذكية</h3>
        <p className="text-gray-600">تتبع جميع التعديلات مع تحليل الذكاء الصناعي</p>
      </div>

      {logs.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">لا توجد سجلات متاحة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log, i) => (
            <div key={i} className="bg-white rounded-xl p-5 border-2 border-gray-100">
              <div className="flex items-start gap-4">
                <User className="w-6 h-6 text-blue-600" />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-bold text-gray-900">{log.profiles?.display_name || 'مسؤول'}</h4>
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(log.created_at).toLocaleString('ar-SA')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">الإجراء: {log.action_type}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
