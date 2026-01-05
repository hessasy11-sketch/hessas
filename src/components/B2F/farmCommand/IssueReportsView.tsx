import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface IssueReport {
  id: string;
  report_number: string;
  issue_title: string;
  issue_category: string;
  severity: string;
  status: string;
  reported_at: string;
  reported_by_staff: { full_name: string } | null;
}

export default function IssueReportsView({ farmId }: { farmId: string }) {
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, [farmId]);

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from('fc_issue_reports')
        .select(`
          *,
          reported_by_staff:platform_staff!reported_by(full_name)
        `)
        .eq('farm_id', farmId)
        .order('reported_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-orange-100 text-orange-700',
      critical: 'bg-red-100 text-red-700'
    };
    return colors[severity] || colors.medium;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      reported: 'bg-blue-100 text-blue-700',
      acknowledged: 'bg-purple-100 text-purple-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      resolved: 'bg-green-100 text-green-700',
      closed: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || colors.reported;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          إجمالي البلاغات: {reports.length}
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
          <Plus className="w-4 h-4" />
          بلاغ جديد
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">لا توجد بلاغات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-gray-500 font-mono">{report.report_number}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(report.severity)}`}>
                      {report.severity}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(report.status)}`}>
                      {report.status}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{report.issue_title}</h3>
                  <div className="text-sm text-gray-600">
                    <span>{report.issue_category}</span>
                    {report.reported_by_staff && (
                      <span className="mr-3">• البلاغ من: {report.reported_by_staff.full_name}</span>
                    )}
                    <span className="mr-3">
                      • {new Date(report.reported_at).toLocaleString('ar-SA')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
