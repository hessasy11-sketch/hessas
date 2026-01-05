import { useState, useEffect } from 'react';
import {
  Building2,
  Gavel,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  User,
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ExecutiveOpsRoomB2F from './ExecutiveOpsRoomB2F';
import ExecutiveOpsRoomB2B from './ExecutiveOpsRoomB2B';
import ExecutiveAuthorityPanel from './ExecutiveAuthorityPanel';

interface OperationsRoomCardProps {
  section: 'b2f' | 'b2b';
  onEnter: () => void;
}

interface PulseData {
  bookings_today?: number;
  bookings_unprocessed?: number;
  farms_not_ready?: number;
  critical_alerts?: number;
  active_auctions?: number;
  ending_soon?: number;
  no_bids?: number;
}

interface OwnerData {
  staff_id: string;
  name: string;
  assigned_at: string;
}

function OperationsRoomCard({ section, onEnter }: OperationsRoomCardProps) {
  const [pulse, setPulse] = useState<PulseData | null>(null);
  const [owner, setOwner] = useState<OwnerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCardData();
  }, [section]);

  const loadCardData = async () => {
    setLoading(true);

    try {
      if (section === 'b2f') {
        const { data: pulseData } = await supabase.rpc('get_executive_pulse_b2f');
        setPulse(pulseData);
      } else {
        const { data: pulseData } = await supabase.rpc('get_executive_pulse_b2b');
        setPulse(pulseData);
      }

      const { data: ownersData } = await supabase.rpc('get_executive_owners');
      if (ownersData) {
        const ownerKey = section === 'b2f' ? 'b2f' : 'b2b';
        setOwner(ownersData[ownerKey]);
      }
    } catch (error) {
      console.error('Error loading card data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    return section === 'b2f' ? Building2 : Gavel;
  };

  const getTitle = () => {
    return section === 'b2f'
      ? 'غرفة عمليات استثمار المزارع'
      : 'غرفة عمليات مزاد الشركات';
  };

  const getSubtitle = () => {
    return section === 'b2f'
      ? 'B2F Operations Room'
      : 'B2B Auction Operations';
  };

  const getAlert = () => {
    if (!pulse) return null;

    if (section === 'b2f') {
      if ((pulse.critical_alerts || 0) > 0) {
        return {
          type: 'critical' as const,
          message: `${pulse.critical_alerts} تنبيه حرج`
        };
      }
      if ((pulse.bookings_unprocessed || 0) > 5) {
        return {
          type: 'warning' as const,
          message: `${pulse.bookings_unprocessed} حجز غير معالج`
        };
      }
    } else {
      if ((pulse.ending_soon || 0) > 0) {
        return {
          type: 'warning' as const,
          message: `${pulse.ending_soon} مزاد ينتهي قريباً`
        };
      }
    }

    return null;
  };

  const Icon = getIcon();
  const alert = getAlert();

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
      <div className="p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
            section === 'b2f' ? 'bg-emerald-100' : 'bg-blue-100'
          }`}>
            <Icon className={`w-8 h-8 ${
              section === 'b2f' ? 'text-emerald-600' : 'text-blue-600'
            }`} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{getTitle()}</h3>
            <p className="text-sm text-gray-500">{getSubtitle()}</p>
          </div>
        </div>

        {alert && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            alert.type === 'critical'
              ? 'bg-red-50 border border-red-200'
              : 'bg-amber-50 border border-amber-200'
          }`}>
            <AlertTriangle className={`w-5 h-5 ${
              alert.type === 'critical' ? 'text-red-600' : 'text-amber-600'
            }`} />
            <span className={`text-sm font-medium ${
              alert.type === 'critical' ? 'text-red-800' : 'text-amber-800'
            }`}>
              {alert.message}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          {section === 'b2f' && pulse && (
            <>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs text-gray-600">الحجوزات اليوم</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {pulse.bookings_today || 0}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs text-gray-600">غير معالج</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {pulse.bookings_unprocessed || 0}
                </div>
              </div>
            </>
          )}

          {section === 'b2b' && pulse && (
            <>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-gray-600">مزادات نشطة</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {pulse.active_auctions || 0}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs text-gray-600">ينتهي قريباً</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {pulse.ending_soon || 0}
                </div>
              </div>
            </>
          )}
        </div>

        {owner && owner.name && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-600" />
              <div>
                <div className="text-xs text-gray-600 mb-1">المسؤول الرسمي</div>
                <div className="text-sm font-bold text-gray-900">{owner.name}</div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onEnter}
          className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
            section === 'b2f'
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <span>دخول غرفة العمليات</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default function ExecutiveOpsRoom() {
  const [activeRoom, setActiveRoom] = useState<'entry' | 'b2f' | 'b2b' | 'authority'>('entry');

  if (activeRoom === 'b2f') {
    return <ExecutiveOpsRoomB2F onBack={() => setActiveRoom('entry')} />;
  }

  if (activeRoom === 'b2b') {
    return <ExecutiveOpsRoomB2B onBack={() => setActiveRoom('entry')} />;
  }

  if (activeRoom === 'authority') {
    return <ExecutiveAuthorityPanel onBack={() => setActiveRoom('entry')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            لوحة الإدارة العليا
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            غرفة عمليات المنصة
          </p>
          <p className="text-sm text-gray-500">
            Executive Operations Command Center
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <OperationsRoomCard
            section="b2f"
            onEnter={() => setActiveRoom('b2f')}
          />
          <OperationsRoomCard
            section="b2b"
            onEnter={() => setActiveRoom('b2b')}
          />
        </div>

        <div className="text-center">
          <button
            onClick={() => setActiveRoom('authority')}
            className="px-8 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg font-medium hover:from-gray-900 hover:to-black transition-all shadow-lg"
          >
            لوحة الصلاحيات (Authority Panel)
          </button>
        </div>
      </div>
    </div>
  );
}
