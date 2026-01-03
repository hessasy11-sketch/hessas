import React, { useEffect, useState } from 'react';
import { FileText, Download, Calendar, DollarSign, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Contract {
  id: string;
  contract_number: string;
  investor_phone: string;
  farm_id: string;
  trees_count: number;
  amount_total: number;
  contract_type: string;
  status: string;
  start_date: string;
  end_date: string;
  document_url: string | null;
  pdf_generated: boolean;
  created_at: string;
}

interface Farm {
  id: string;
  name: string;
  location: string;
}

export default function InvestorMyContractsView() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [farms, setFarms] = useState<{ [key: string]: Farm }>({});
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  const investorPhone = localStorage.getItem('b2f_investor_phone');

  useEffect(() => {
    if (investorPhone) {
      loadContracts();
    }
  }, [investorPhone]);

  const loadContracts = async () => {
    try {
      setLoading(true);

      // جلب العقود
      const { data: contractsData, error: contractsError } = await supabase
        .from('b2f_contracts')
        .select('*')
        .eq('investor_phone', investorPhone)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (contractsError) throw contractsError;

      if (contractsData && contractsData.length > 0) {
        setContracts(contractsData);

        // جلب بيانات المزارع
        const farmIds = [...new Set(contractsData.map(c => c.farm_id))];
        const { data: farmsData, error: farmsError } = await supabase
          .from('b2f_farms')
          .select('id, name, location')
          .in('id', farmIds);

        if (!farmsError && farmsData) {
          const farmsMap: { [key: string]: Farm } = {};
          farmsData.forEach(farm => {
            farmsMap[farm.id] = farm;
          });
          setFarms(farmsMap);
        }
      }
    } catch (error) {
      console.error('Error loading contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePdf = async (contractId: string) => {
    try {
      setGeneratingPdf(contractId);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-luxury-contract-pdf`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ contract_id: contractId }),
        }
      );

      const result = await response.json();

      if (result.success) {
        // تحديث العقد محلياً
        setContracts(prev =>
          prev.map(c =>
            c.id === contractId
              ? { ...c, document_url: result.document_url, pdf_generated: true }
              : c
          )
        );
      } else {
        alert('فشل توليد وثيقة العقد');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ أثناء توليد الوثيقة');
    } finally {
      setGeneratingPdf(null);
    }
  };

  const downloadContract = (contract: Contract) => {
    if (!contract.document_url) {
      generatePdf(contract.id);
      return;
    }

    window.open(contract.document_url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!investorPhone) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
        <p className="text-amber-800">يرجى تسجيل الدخول لعرض عقودك</p>
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد عقود</h3>
        <p className="text-gray-600">لم يتم إصدار أي عقود لك بعد</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">عقودي</h2>
        <p className="text-emerald-100">جميع عقود الاستثمار الخاصة بك</p>
      </div>

      {/* قائمة العقود */}
      <div className="grid gap-6">
        {contracts.map((contract) => {
          const farm = farms[contract.farm_id];
          const isGenerating = generatingPdf === contract.id;

          return (
            <div
              key={contract.id}
              className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-emerald-500 transition-all duration-300 hover:shadow-lg"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4 space-x-reverse">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {contract.contract_number}
                    </h3>
                    <p className="text-gray-600">
                      {farm ? farm.name : 'المزرعة'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => downloadContract(contract)}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري التوليد...</span>
                    </>
                  ) : contract.pdf_generated ? (
                    <>
                      <Download className="w-5 h-5" />
                      <span>تحميل العقد</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      <span>توليد الوثيقة</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">عدد الأشجار</div>
                  <div className="text-lg font-bold text-gray-900">
                    {contract.trees_count} شجرة
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">قيمة العقد</div>
                  <div className="text-lg font-bold text-emerald-600">
                    {contract.amount_total.toLocaleString('ar-SA')} ر.س
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">تاريخ البداية</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {new Date(contract.start_date).toLocaleDateString('ar-SA')}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">تاريخ الانتهاء</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {new Date(contract.end_date).toLocaleDateString('ar-SA')}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    تم الإصدار: {new Date(contract.created_at).toLocaleDateString('ar-SA')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                    فعال
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
