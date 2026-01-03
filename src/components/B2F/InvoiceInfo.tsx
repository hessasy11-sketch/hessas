import { FileText, Calendar, DollarSign, Download, Printer, CheckCircle, Hash } from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  issued_at: string;
  issued_by: string | null;
  pdf_url: string | null;
  created_at: string;
}

interface InvoiceInfoProps {
  invoice: Invoice;
}

export default function InvoiceInfo({ invoice }: InvoiceInfoProps) {
  const downloadInvoice = () => {
    alert(`سيتم تحميل الفاتورة: ${invoice.invoice_number}\n\nهذه الميزة قيد التطوير.`);
  };

  const printInvoice = () => {
    window.print();
  };

  return (
    <div className="bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50 rounded-2xl p-6 border-2 border-teal-200 shadow-lg" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 pb-4 border-b-2 border-teal-200">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 flex items-center justify-center shadow-lg">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-teal-900">معلومات الفاتورة</h3>
          <p className="text-sm text-teal-700">فاتورة معتمدة من النظام</p>
        </div>
        <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-xl text-xs font-bold flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5" />
          صادرة
        </span>
      </div>

      {/* Invoice Number */}
      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-4 border border-teal-200">
        <div className="flex items-center gap-2 mb-2">
          <Hash className="w-5 h-5 text-teal-600" />
          <p className="text-xs text-teal-700 font-medium">رقم الفاتورة</p>
        </div>
        <p className="text-xl font-bold text-teal-900 font-mono">{invoice.invoice_number}</p>
      </div>

      {/* Date */}
      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-4 border border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <p className="text-xs text-blue-700 font-medium">تاريخ الإصدار</p>
        </div>
        <p className="text-base font-bold text-blue-900">
          {new Date(invoice.issued_at).toLocaleDateString('ar-SA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>

      {/* Amount */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 mb-4 border-2 border-emerald-200">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          <p className="text-sm text-emerald-700 font-bold">المبلغ الإجمالي</p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-base text-emerald-900 font-bold">المبلغ النهائي شامل الضريبة:</span>
          <span className="text-2xl font-bold text-emerald-900">{invoice.amount.toFixed(2)} ر.س</span>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={downloadInvoice}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg hover:scale-105"
        >
          <Download className="w-4 h-4" />
          تحميل PDF
        </button>

        <button
          onClick={printInvoice}
          className="bg-gradient-to-r from-gray-600 to-gray-700 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg hover:scale-105"
        >
          <Printer className="w-4 h-4" />
          طباعة
        </button>
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <p className="text-xs text-blue-800 leading-relaxed">
          <span className="font-bold">ملاحظة:</span> هذه فاتورة رسمية معتمدة من النظام.
          يمكنك تحميلها أو طباعتها في أي وقت. بعد إصدار الفاتورة سيتم إصدار العقد تلقائياً.
        </p>
      </div>
    </div>
  );
}
