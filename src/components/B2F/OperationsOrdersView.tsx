import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Trees,
  Clock,
  PlayCircle,
  CheckCircle2,
  Edit3,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OperationOrder {
  id: string;
  contract_number: string;
  investor_name: string;
  investor_phone: string;
  farm_name: string;
  opportunity_title: string;
  trees_count: number;
  status: string;
  last_update: string;
  notes: string;
}

export function OperationsOrdersView() {
  const [orders, setOrders] = useState<OperationOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [newNotes, setNewNotes] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data: orders, error } = await supabase
        .from('b2f_operations_orders')
        .select(`
          id,
          investor_phone,
          trees_count,
          status,
          last_update,
          notes,
          b2f_contracts (
            contract_number,
            b2f_investor_accounts (
              full_name
            ),
            b2f_opportunities (
              title,
              b2f_farms (
                name
              )
            )
          )
        `)
        .neq('status', 'completed')
        .order('last_update', { ascending: false });

      if (error) {
        console.error('Error loading operations orders:', error);
        return;
      }

      const formatted = (orders || []).map((order: any) => ({
        id: order.id,
        contract_number: order.b2f_contracts?.contract_number || 'غير محدد',
        investor_name: order.b2f_contracts?.b2f_investor_accounts?.full_name || 'غير محدد',
        investor_phone: order.investor_phone,
        farm_name: order.b2f_contracts?.b2f_opportunities?.b2f_farms?.name || 'غير محدد',
        opportunity_title: order.b2f_contracts?.b2f_opportunities?.title || 'غير محدد',
        trees_count: order.trees_count,
        status: order.status,
        last_update: order.last_update,
        notes: order.notes || ''
      }));

      setOrders(formatted);
    } catch (error) {
      console.error('Error loading operations orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (order: OperationOrder) => {
    setEditingOrder(order.id);
    setNewStatus(order.status);
    setNewNotes(order.notes);
  };

  const cancelEditing = () => {
    setEditingOrder(null);
    setNewStatus('');
    setNewNotes('');
  };

  const updateOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('b2f_operations_orders')
        .update({
          status: newStatus,
          notes: newNotes,
          last_update: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      alert('تم تحديث حالة التشغيل بنجاح!');
      setEditingOrder(null);
      await loadOrders();
    } catch (error: any) {
      console.error('Error updating order:', error);
      alert('حدث خطأ أثناء تحديث الحالة: ' + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-100">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-3 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">أوامر التشغيل</h2>
            <p className="text-gray-600 mt-1">متابعة وتحديث حالة أوامر التشغيل النشطة</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600 mt-4">جاري التحميل...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">لا توجد أوامر تشغيل نشطة حالياً</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-gradient-to-br from-white to-blue-50/30 rounded-xl border-2 border-blue-100 p-6"
              >
                {editingOrder === order.id ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full font-mono">
                          {order.contract_number}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateOrder(order.id)}
                          className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-all"
                        >
                          حفظ
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-all"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          الحالة
                        </label>
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="pending_start">في انتظار البدء</option>
                          <option value="in_progress">قيد التشغيل</option>
                          <option value="harvest_ready">جاهز للحصاد</option>
                          <option value="completed">مكتمل</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          ملاحظات
                        </label>
                        <input
                          type="text"
                          value={newNotes}
                          onChange={(e) => setNewNotes(e.target.value)}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="أضف ملاحظات..."
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full font-mono">
                            {order.contract_number}
                          </span>
                          {getStatusBadge(order.status)}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {order.investor_name}
                        </h3>
                        <p className="text-gray-600">{order.farm_name} - {order.opportunity_title}</p>
                      </div>
                      <button
                        onClick={() => startEditing(order)}
                        className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-all"
                        title="تحديث الحالة"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white/60 rounded-lg p-3 border border-blue-100">
                        <div className="flex items-center gap-2 text-blue-700 mb-1">
                          <Trees className="w-4 h-4" />
                          <span className="text-xs font-semibold">عدد الأشجار</span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">{order.trees_count}</p>
                      </div>

                      <div className="bg-white/60 rounded-lg p-3 border border-blue-100">
                        <div className="flex items-center gap-2 text-blue-700 mb-1">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs font-semibold">آخر تحديث</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(order.last_update).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                    </div>

                    {order.notes && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">ملاحظات: </span>
                          {order.notes}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
