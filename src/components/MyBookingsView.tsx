import { useState, useEffect } from 'react';
import { ArrowRight, Calendar, MapPin, DollarSign, CheckCircle, Clock, AlertCircle, TreePine } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface TreeRentalReservation {
  id: string;
  opportunity_id: string;
  customer_name: string;
  customer_phone: string;
  number_of_trees: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  opportunity: {
    title: string;
    tree_type: string;
    location_city: string;
    location_region: string;
  };
}

interface MyBookingsViewProps {
  onBack: () => void;
}

export function MyBookingsView({ onBack }: MyBookingsViewProps) {
  const { user } = useAuth();
  const [treeReservations, setTreeReservations] = useState<TreeRentalReservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: treeRes } = await supabase
        .from('tree_rental_reservations')
        .select(`
          id,
          opportunity_id,
          customer_name,
          customer_phone,
          number_of_trees,
          total_amount,
          status,
          created_at,
          tree_rental_opportunities!inner (
            title,
            tree_type,
            location_city,
            location_region
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (treeRes) {
        const formatted = treeRes.map((item: any) => ({
          ...item,
          opportunity: item.tree_rental_opportunities
        }));
        setTreeReservations(formatted);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      confirmed: 'bg-green-100 text-green-800 border-green-300',
      completed: 'bg-gray-100 text-gray-800 border-gray-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300'
    };

    const labels = {
      pending: 'قيد الانتظار',
      confirmed: 'مؤكد',
      completed: 'مكتمل',
      cancelled: 'ملغي'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-6 h-6 text-yellow-600" />;
      case 'confirmed':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-gray-600" />;
      case 'cancelled':
        return <AlertCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Clock className="w-6 h-6 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium mb-6 transition-all group"
          >
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            رجوع
          </button>

          <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-emerald-200">
            <div className="flex items-center gap-4 mb-2">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl shadow-lg">
                <TreePine className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  حجوزاتي
                </h1>
                <p className="text-gray-600 mt-1">جميع حجوزات استئجار الأشجار</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-emerald-100">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6">
            <div className="flex items-center gap-3 text-white">
              <TreePine className="w-6 h-6" />
              <span className="text-xl font-bold">استئجار الأشجار</span>
              {treeReservations.length > 0 && (
                <span className="bg-white text-emerald-600 px-3 py-1 rounded-full text-sm font-bold">
                  {treeReservations.length}
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600">جاري تحميل الحجوزات...</p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {treeReservations.length === 0 ? (
                <div className="text-center py-12">
                  <TreePine className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">لا توجد حجوزات لاستئجار الأشجار</p>
                </div>
              ) : (
                treeReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="bg-white rounded-xl shadow-lg p-6 border-2 border-emerald-100 hover:border-emerald-300 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-gradient-to-br from-emerald-100 to-teal-100 p-3 rounded-xl">
                          {getStatusIcon(reservation.status)}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">{reservation.opportunity.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <MapPin className="w-4 h-4" />
                            <span>{reservation.opportunity.location_city} - {reservation.opportunity.location_region}</span>
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(reservation.status)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">نوع الشجرة</p>
                        <p className="font-bold text-gray-800">{reservation.opportunity.tree_type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">عدد الأشجار</p>
                        <p className="font-bold text-gray-800">{reservation.number_of_trees} شجرة</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">المبلغ الإجمالي</p>
                        <p className="font-bold text-emerald-600">{reservation.total_amount.toLocaleString()} ر.س</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">تاريخ الحجز</p>
                        <p className="font-bold text-gray-800">
                          {new Date(reservation.created_at).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
