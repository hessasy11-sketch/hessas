import { useState } from 'react';
import {
  MoreVertical,
  Power,
  PowerOff,
  UserCheck,
  DollarSign,
  CheckCircle2,
  X
} from 'lucide-react';
import { useCreateDecision, type DecisionType } from '../../hooks/useCreateDecision';

interface Farm {
  id: string;
  name: string;
  bookings_enabled: boolean;
}

interface FarmDecisionActionsMenuProps {
  farm: Farm;
  requestedBy: string;
}

export default function FarmDecisionActionsMenu({ farm, requestedBy }: FarmDecisionActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { createDecision, loading } = useCreateDecision();

  const handleCreateDecision = async (
    decisionType: DecisionType,
    label: string,
    priority: 'normal' | 'high' = 'normal'
  ) => {
    const result = await createDecision({
      decisionType,
      farmId: farm.id,
      requestedBy,
      priority,
      notes: `طلب ${label} للمزرعة: ${farm.name}`
    });

    if (result.success) {
      setShowSuccess(true);
      setIsOpen(false);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const actions = [
    {
      type: 'toggle_bookings_off' as DecisionType,
      label: 'إيقاف الحجوزات',
      icon: PowerOff,
      color: 'text-red-600',
      bgColor: 'hover:bg-red-50',
      visible: farm.bookings_enabled,
      priority: 'high' as const
    },
    {
      type: 'toggle_bookings_on' as DecisionType,
      label: 'فتح الحجوزات',
      icon: Power,
      color: 'text-emerald-600',
      bgColor: 'hover:bg-emerald-50',
      visible: !farm.bookings_enabled,
      priority: 'normal' as const
    },
    {
      type: 'change_farm_manager' as DecisionType,
      label: 'تغيير مدير المزرعة',
      icon: UserCheck,
      color: 'text-blue-600',
      bgColor: 'hover:bg-blue-50',
      visible: true,
      priority: 'normal' as const
    },
    {
      type: 'review_farm_expenses' as DecisionType,
      label: 'مراجعة مصروفات',
      icon: DollarSign,
      color: 'text-amber-600',
      bgColor: 'hover:bg-amber-50',
      visible: true,
      priority: 'normal' as const
    }
  ];

  const visibleActions = actions.filter(action => action.visible);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        disabled={loading}
        className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
        title="إجراءات"
      >
        <MoreVertical className="w-5 h-5 text-slate-600" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border-2 border-slate-200 z-50 overflow-hidden">
            <div className="p-2 border-b border-slate-200 bg-slate-50">
              <p className="text-xs font-bold text-slate-700">إنشاء قرار</p>
              <p className="text-xs text-slate-500">{farm.name}</p>
            </div>

            <div className="py-1">
              {visibleActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.type}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateDecision(action.type, action.label, action.priority);
                    }}
                    disabled={loading}
                    className={`w-full px-4 py-2.5 text-right flex items-center gap-3 ${action.bgColor} transition-colors disabled:opacity-50`}
                  >
                    <Icon className={`w-4 h-4 ${action.color}`} />
                    <span className={`text-sm font-medium ${action.color}`}>
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {showSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-5">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold">تم إنشاء القرار بنجاح</span>
            <button
              onClick={() => setShowSuccess(false)}
              className="mr-2 hover:bg-emerald-600 rounded-lg p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
