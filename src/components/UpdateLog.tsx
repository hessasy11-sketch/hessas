import { useState, useEffect } from 'react';
import { ArrowRight, Activity, Calendar, TreePine, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Update {
  id: string;
  booking_id: string;
  title: string;
  description: string;
  update_type: 'status_change' | 'harvest' | 'maintenance' | 'general';
  created_at: string;
  booking_title: string;
}

interface UpdateLogProps {
  onBack: () => void;
}

export function UpdateLog({ onBack }: UpdateLogProps) {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUpdates();
    }
  }, [user]);

  const loadUpdates = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: reservations } = await supabase
        .from('tree_rental_reservations')
        .select(`
          id,
          status,
          created_at,
          updated_at,
          tree_rental_opportunities!inner (
            title
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (reservations) {
        const formattedUpdates = reservations.flatMap((res: any) => {
          const updates = [];

          updates.push({
            id: `${res.id}-created`,
            booking_id: res.id,
            title: 'تم إنشاء الحجز',
            description: `تم إنشاء حجز جديد لـ ${res.tree_rental_opportunities.title}`,
            update_type: 'status_change',
            created_at: res.created_at,
            booking_title: res.tree_rental_opportunities.title
          });

          if (res.status === 'confirmed') {
            updates.push({
              id: `${res.id}-confirmed`,
              booking_id: res.id,
              title: 'تم تأكيد الحجز',
              description: `تم تأكيد حجزك في ${res.tree_rental_opportunities.title}`,
              update_type: 'status_change',
              created_at: res.updated_at || res.created_at,
              booking_title: res.tree_rental_opportunities.title
            });
          }

          return updates;
        });

        setUpdates(formattedUpdates.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
      }
    } catch (error) {
      console.error('Error loading updates:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'status_change':
        return <CheckCircle className="w-6 h-6 text-blue-600" />;
      case 'harvest':
        return <TreePine className="w-6 h-6 text-green-600" />;
      case 'maintenance':
        return <Clock className="w-6 h-6 text-yellow-600" />;
      default:
        return <TrendingUp className="w-6 h-6 text-purple-600" />;
    }
  };

  const getUpdateColor = (type: string) => {
    switch (type) {
      case 'status_change':
        return 'border-blue-200 bg-blue-50';
      case 'harvest':
        return 'border-green-200 bg-green-50';
      case 'maintenance':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-purple-200 bg-purple-50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium mb-6 transition-all group"
        >
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          رجوع
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-emerald-200 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl shadow-lg">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                سجل التحديثات
              </h1>
              <p className="text-gray-600 mt-1">عرض زمني مبسط لتقدم حجوزاتك</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">جاري تحميل التحديثات...</p>
          </div>
        ) : updates.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">لا توجد تحديثات حتى الآن</p>
            <p className="text-gray-400 text-sm mt-2">ستظهر هنا جميع التحديثات المتعلقة بحجوزاتك</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute right-[29px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-200 via-teal-200 to-transparent"></div>

            <div className="space-y-6">
              {updates.map((update, index) => (
                <div key={update.id} className="relative">
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 relative z-10">
                      <div className={`bg-white p-3 rounded-xl shadow-lg border-2 ${getUpdateColor(update.update_type)}`}>
                        {getUpdateIcon(update.update_type)}
                      </div>
                    </div>

                    <div className="flex-1 bg-white rounded-xl shadow-lg p-6 border-2 border-emerald-100 hover:border-emerald-300 transition-all">
                      <h3 className="text-lg font-bold text-gray-800 mb-2">{update.title}</h3>
                      <p className="text-gray-600 mb-3">{update.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(update.created_at).toLocaleDateString('ar-SA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TreePine className="w-4 h-4" />
                          <span>{update.booking_title}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
