import React, { useState, useEffect } from 'react';
import {
  FileSignature,
  Trees,
  Calendar,
  ExternalLink,
  Archive,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Contract {
  id: string;
  contract_number: string;
  farm_name: string;
  opportunity_title: string;
  trees_count: number;
  amount_total: number;
  contract_type: string;
  start_date: string;
  end_date: string;
  status: string;
  operation_status: string;
  document_url: string;
  created_at: string;
  archived_at: string;
}

interface InvestorContractsViewProps {
  investorPhone: string;
}

export function InvestorContractsView({ investorPhone }: InvestorContractsViewProps) {
  const [activeSection, setActiveSection] = useState<'active' | 'archived'>('active');
  const [activeContracts, setActiveContracts] = useState<Contract[]>([]);
  const [archivedContracts, setArchivedContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContracts();
  }, [investorPhone, activeSection]);

  const loadContracts = async () => {
    setLoading(true);
    try {
      if (activeSection === 'active') {
        await loadActiveContracts();
      } else {
        await loadArchivedContracts();
      }
    } catch (error) {
      console.error('Error loading contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveContracts = async () => {
    const { data: contracts, error } = await supabase
      .from('b2f_contracts')
      .select(`
        id,
        contract_number,
        trees_count,
        amount_total,
        contract_type,
        start_date,
        end_date,
        status,
        document_url,
        created_at,
        b2f_opportunities (
          title,
          b2f_farms (
            name
          )
        ),
        b2f_operations_orders (
          status
        )
      `)
      .eq('investor_phone', investorPhone)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading active contracts:', error);
      return;
    }

    const formatted = (contracts || []).map((contract: any) => ({
      id: contract.id,
      contract_number: contract.contract_number,
      farm_name: contract.b2f_opportunities?.b2f_farms?.name || 'غير محدد',
      opportunity_title: contract.b2f_opportunities?.title || 'غير محدد',
      trees_count: contract.trees_count,
      amount_total: contract.amount_total,
      contract_type: contract.contract_type,
      start_date: contract.start_date,
      end_date: contract.end_date,
      status: contract.status,
      operation_status: contract.b2f_operations_orders?.[0]?.status || 'pending_start',
      document_url: contract.document_url,
      created_at: contract.created_at,
      archived_at: ''
    }));

    setActiveContracts(formatted);
  };

  const loadArchivedContracts = async () => {
    const { data: contracts, error } = await supabase
      .from('b2f_contracts')
      .select(`
        id,
        contract_number,
        trees_count,
        amount_total,
        contract_type,
        start_date,
        end_date,
        document_url,
        archived_at,
        b2f_opportunities (
          title,
          b2f_farms (
            name
          )
        )
      `)
      .eq('investor_phone', investorPhone)
      .eq('status', 'archived')
      .order('archived_at', { ascending: false });

    if (error) {
      console.error('Error loading archived contracts:', error);
      return;
    }

    const formatted = (contracts || []).map((contract: any) => ({
      id: contract.id,
      contract_number: contract.contract_number,
      farm_name: contract.b2f_opportunities?.b2f_farms?.name || 'غير محدد',
      opportunity_title: contract.b2f_opportunities?.title || 'غير محدد',
      trees_count: contract.trees_count,
      amount_total: contract.amount_total,
      contract_type: contract.contract_type,
      start_date: contract.start_date,
      end_date: contract.end_date,
      status: 'archived',
      operation_status: '',
      document_url: contract.document_url,
      created_at: '',
      archived_at: contract.archived_at
    }));

    setArchivedContracts(formatted);
  };

  const getOperationStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; bg: string; icon: any }> = {
      pending_start: { text: 'في انتظار البدء', bg: 'bg-gray-100 text-gray-700', icon: Clock },
      in_progress: { text: 'قيد التشغيل', bg: 'bg-blue-100 text-blue-700', icon: Sparkles },
      harvest_ready: { text: 'جاهز للحصاد', bg: 'bg-amber-100 text-amber-700', icon: Trees },
      completed: { text: 'مكتمل', bg: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 }
    };

    const badge = badges[status] || badges.pending_start;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${badge.bg}`}>
        <Icon className="w-3.5 h-3.5" />
        {badge.text}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border-2 border-emerald-100">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-3 shadow-lg">
            <FileSignature className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">عقودي</h2>
            <p className="text-gray-600 mt-1">عرض ومتابعة عقود الاستثمار الخاصة بك</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
        <div className="flex border-b-2 border-gray-200">
          <button
            onClick={() => setActiveSection('active')}
            className={`flex-1 px-6 py-4 font-semibold transition-all ${
              activeSection === 'active'
                ? 'bg-emerald-50 text-emerald-700 border-b-4 border-emerald-500'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span>عقود فعّالة</span>
              {activeContracts.length > 0 && (
                <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {activeContracts.length}
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => setActiveSection('archived')}
            className={`flex-1 px-6 py-4 font-semibold transition-all ${
              activeSection === 'archived'
                ? 'bg-gray-50 text-gray-700 border-b-4 border-gray-500'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Archive className="w-5 h-5" />
              <span>عقود منتهية</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
              <p className="text-gray-600 mt-4">جاري التحميل...</p>
            </div>
          ) : (
            <>
              {/* Active Contracts */}
              {activeSection === 'active' && (
                <div className="space-y-4">
                  {activeContracts.length === 0 ? (
                    <div className="text-center py-12">
                      <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">لا توجد عقود فعّالة حالياً</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {activeContracts.map((contract) => (
                        <div
                          key={contract.id}
                          className="bg-gradient-to-br from-white to-emerald-50/30 rounded-xl border-2 border-emerald-100 p-6 hover:shadow-lg transition-all"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full font-mono">
                                  {contract.contract_number}
                                </span>
                                {getOperationStatusBadge(contract.operation_status)}
                              </div>
                              <h3 className="text-xl font-bold text-gray-900 mb-1">
                                {contract.farm_name}
                              </h3>
                              <p className="text-gray-600">{contract.opportunity_title}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-white/60 rounded-lg p-3 border border-emerald-100">
                              <div className="flex items-center gap-2 text-emerald-700 mb-1">
                                <Trees className="w-4 h-4" />
                                <span className="text-xs font-semibold">عدد الأشجار</span>
                              </div>
                              <p className="text-lg font-bold text-gray-900">{contract.trees_count}</p>
                            </div>

                            <div className="bg-white/60 rounded-lg p-3 border border-emerald-100">
                              <div className="flex items-center gap-2 text-emerald-700 mb-1">
                                <Calendar className="w-4 h-4" />
                                <span className="text-xs font-semibold">مدة العقد</span>
                              </div>
                              <p className="text-sm font-semibold text-gray-900">
                                {new Date(contract.start_date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short' })}
                                {' - '}
                                {new Date(contract.end_date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short' })}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-emerald-100">
                            <div className="text-sm text-gray-600">
                              تاريخ الإصدار: {new Date(contract.created_at).toLocaleDateString('ar-SA')}
                            </div>
                            {contract.document_url && (
                              <button
                                onClick={() => window.open(contract.document_url, '_blank')}
                                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-all"
                              >
                                <ExternalLink className="w-4 h-4" />
                                <span>عرض العقد</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Archived Contracts */}
              {activeSection === 'archived' && (
                <div className="space-y-4">
                  {archivedContracts.length === 0 ? (
                    <div className="text-center py-12">
                      <Archive className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">لا توجد عقود مؤرشفة</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {archivedContracts.map((contract) => (
                        <div
                          key={contract.id}
                          className="bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 p-6 hover:shadow-lg transition-all opacity-75"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-full font-mono">
                                  {contract.contract_number}
                                </span>
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                  <Archive className="w-3.5 h-3.5" />
                                  مؤرشف
                                </span>
                              </div>
                              <h3 className="text-xl font-bold text-gray-900 mb-1">
                                {contract.farm_name}
                              </h3>
                              <p className="text-gray-600">{contract.opportunity_title}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center gap-2 text-gray-700 mb-1">
                                <Trees className="w-4 h-4" />
                                <span className="text-xs font-semibold">عدد الأشجار</span>
                              </div>
                              <p className="text-lg font-bold text-gray-900">{contract.trees_count}</p>
                            </div>

                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center gap-2 text-gray-700 mb-1">
                                <Calendar className="w-4 h-4" />
                                <span className="text-xs font-semibold">مدة العقد</span>
                              </div>
                              <p className="text-sm font-semibold text-gray-900">
                                {new Date(contract.start_date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short' })}
                                {' - '}
                                {new Date(contract.end_date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short' })}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <div className="text-sm text-gray-600">
                              تاريخ الأرشفة: {new Date(contract.archived_at).toLocaleDateString('ar-SA')}
                            </div>
                            {contract.document_url && (
                              <button
                                onClick={() => window.open(contract.document_url, '_blank')}
                                className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-all"
                              >
                                <ExternalLink className="w-4 h-4" />
                                <span>عرض العقد</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
