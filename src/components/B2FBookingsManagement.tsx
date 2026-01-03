import { useState, useEffect } from 'react';
import {
  X,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  FileText,
  Upload
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Booking {
  id: string;
  opportunity_id: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  number_of_trees: number;
  total_amount: number;
  status: string;
  receipt_url: string | null;
  contract_url: string | null;
  payment_verified: boolean;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  opportunity: {
    title: string;
    tree_type: string;
    location_city: string;
    location_region: string;
  } | null;
}

interface BookingStats {
  total: number;
  pending_review: number;
  waiting_payment: number;
  receipt_under_review: number;
  active: number;
}

interface B2FBookingsManagementProps {
  onClose: () => void;
}

export function B2FBookingsManagement({ onClose }: B2FBookingsManagementProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<BookingStats>({
    total: 0,
    pending_review: 0,
    waiting_payment: 0,
    receipt_under_review: 0,
    active: 0
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [treeTypeFilter, setTreeTypeFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  // Selected booking for details
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, statusFilter, treeTypeFilter, cityFilter, bookings]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tree_rental_reservations')
        .select(`
          *,
          opportunity:tree_rental_opportunities(
            title,
            tree_type,
            location_city,
            location_region
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const bookingsData = data || [];
      setBookings(bookingsData);

      // Calculate stats
      const newStats: BookingStats = {
        total: bookingsData.length,
        pending_review: bookingsData.filter(b => b.status === 'pending_review').length,
        waiting_payment: bookingsData.filter(b => b.status === 'waiting_payment').length,
        receipt_under_review: bookingsData.filter(b => b.status === 'receipt_under_review').length,
        active: bookingsData.filter(b => b.status === 'active').length
      };
      setStats(newStats);

    } catch (err) {
      console.error('Error loading bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...bookings];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(b =>
        b.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customer_phone.includes(searchQuery) ||
        b.id.includes(searchQuery)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter);
    }

    // Tree type filter
    if (treeTypeFilter !== 'all') {
      filtered = filtered.filter(b => b.opportunity?.tree_type === treeTypeFilter);
    }

    // City filter
    if (cityFilter !== 'all') {
      filtered = filtered.filter(b => b.opportunity?.location_city === cityFilter);
    }

    setFilteredBookings(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending_review: {
        label: 'قيد المراجعة',
        color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        icon: <Clock className="w-3.5 h-3.5" />
      },
      waiting_payment: {
        label: 'بانتظار الدفع',
        color: 'bg-orange-100 text-orange-700 border-orange-300',
        icon: <AlertTriangle className="w-3.5 h-3.5" />
      },
      receipt_under_review: {
        label: 'قيد مراجعة الإيصال',
        color: 'bg-blue-100 text-blue-700 border-blue-300',
        icon: <FileText className="w-3.5 h-3.5" />
      },
      active: {
        label: 'مفعّل',
        color: 'bg-green-100 text-green-700 border-green-300',
        icon: <CheckCircle className="w-3.5 h-3.5" />
      },
      finished: {
        label: 'منتهي',
        color: 'bg-gray-100 text-gray-700 border-gray-300',
        icon: <CheckCircle className="w-3.5 h-3.5" />
      },
      cancelled: {
        label: 'ملغي',
        color: 'bg-red-100 text-red-700 border-red-300',
        icon: <XCircle className="w-3.5 h-3.5" />
      }
    };

    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending_review;
  };

  const exportToCSV = () => {
    // TODO: Implement CSV export
    alert('سيتم إضافة وظيفة التصدير قريباً');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">إدارة الحجوزات</h2>
              <p className="text-emerald-100 text-sm mt-1">
                متابعة وإدارة جميع حجوزات المستثمرين
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
              <div className="text-sm text-gray-600 mb-1">إجمالي الحجوزات</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200">
              <div className="text-sm text-yellow-700 mb-1">قيد المراجعة</div>
              <div className="text-2xl font-bold text-yellow-800">{stats.pending_review}</div>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-200">
              <div className="text-sm text-orange-700 mb-1">بانتظار الدفع</div>
              <div className="text-2xl font-bold text-orange-800">{stats.waiting_payment}</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
              <div className="text-sm text-blue-700 mb-1">مراجعة إيصال</div>
              <div className="text-2xl font-bold text-blue-800">{stats.receipt_under_review}</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
              <div className="text-sm text-green-700 mb-1">مفعّلة</div>
              <div className="text-2xl font-bold text-green-800">{stats.active}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-8 py-4 bg-white border-b border-gray-200">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث برقم الحجز، الاسم أو الجوال..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">كل الحالات</option>
              <option value="pending_review">قيد المراجعة</option>
              <option value="waiting_payment">بانتظار الدفع</option>
              <option value="receipt_under_review">قيد مراجعة الإيصال</option>
              <option value="active">مفعّل</option>
              <option value="finished">منتهي</option>
              <option value="cancelled">ملغي</option>
            </select>

            {/* Actions */}
            <button
              onClick={loadBookings}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              تحديث
            </button>

            <button
              onClick={exportToCSV}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              تصدير
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-8 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">لا توجد حجوزات</h3>
              <p className="text-gray-600">لم يتم العثور على أي حجوزات مطابقة للفلاتر</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">رقم الحجز</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">اسم المستثمر</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">الجوال</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">نوع الشجرة</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">المدينة</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">العدد</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">المبلغ</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">الحالة</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => {
                  const statusBadge = getStatusBadge(booking.status);
                  return (
                    <tr key={booking.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{booking.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{booking.customer_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono" dir="ltr">{booking.customer_phone}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{booking.opportunity?.tree_type || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{booking.opportunity?.location_city || '-'}</td>
                      <td className="px-4 py-3 text-sm font-bold text-emerald-600">{booking.number_of_trees}</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">{booking.total_amount.toLocaleString('ar-SA')} ر.س</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border ${statusBadge.color}`}>
                          {statusBadge.icon}
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className="p-2 hover:bg-emerald-50 rounded-lg transition-colors group"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-4 h-4 text-gray-600 group-hover:text-emerald-600" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              عرض {filteredBookings.length} من {bookings.length} حجز
            </div>
            <div>
              آخر تحديث: الآن
            </div>
          </div>
        </div>

      </div>

      {/* Booking Details Panel - سيتم إضافته لاحقاً */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full">
            <h3 className="text-xl font-bold mb-4">تفاصيل الحجز</h3>
            <p className="text-gray-600 mb-4">رقم الحجز: {selectedBooking.id}</p>
            <button
              onClick={() => setSelectedBooking(null)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
