import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  endsAt: string;
  onExpire?: () => void;
  size?: 'small' | 'large';
  sold?: boolean;
}

export function CountdownTimer({ endsAt, onExpire, size = 'small', sold = false }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [status, setStatus] = useState<'active' | 'ending' | 'expired' | 'sold'>('active');

  useEffect(() => {
    if (sold) {
      setStatus('sold');
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endsAt).getTime();
      const difference = end - now;

      if (difference <= 0) {
        setTimeLeft(null);
        setStatus('expired');
        if (onExpire) onExpire();
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      if (difference < 60 * 60 * 1000) {
        setStatus('ending');
      } else {
        setStatus('active');
      }

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [endsAt, onExpire, sold]);

  if (status === 'sold') {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
        <span className="text-xl font-bold text-gray-600">مباع ✅</span>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
        <span className={size === 'large' ? 'text-2xl font-bold text-gray-600' : 'text-base font-bold text-gray-600'}>
          انتهى المزاد
        </span>
      </div>
    );
  }

  if (!timeLeft) return null;

  if (size === 'large') {
    return (
      <div
        className={`flex items-center justify-center gap-3 px-6 py-4 rounded-2xl ${
          status === 'ending'
            ? 'bg-red-50 border-2 border-red-300'
            : 'bg-emerald-50 border-2 border-emerald-300'
        }`}
      >
        <div className="flex items-center gap-4 text-center">
          {timeLeft.days > 0 && (
            <div className="flex flex-col">
              <span className={`text-4xl font-bold ${
                status === 'ending' ? 'text-red-700' : 'text-emerald-700'
              }`}>
                {timeLeft.days.toString().padStart(2, '0')}
              </span>
              <span className="text-xs text-gray-600 mt-1">يوم</span>
            </div>
          )}
          <div className="flex flex-col">
            <span className={`text-4xl font-bold ${
              status === 'ending' ? 'text-red-700' : 'text-emerald-700'
            }`}>
              {timeLeft.hours.toString().padStart(2, '0')}
            </span>
            <span className="text-xs text-gray-600 mt-1">ساعة</span>
          </div>
          <span className={`text-3xl font-bold ${
            status === 'ending' ? 'text-red-700' : 'text-emerald-700'
          }`}>:</span>
          <div className="flex flex-col">
            <span className={`text-4xl font-bold ${
              status === 'ending' ? 'text-red-700' : 'text-emerald-700'
            }`}>
              {timeLeft.minutes.toString().padStart(2, '0')}
            </span>
            <span className="text-xs text-gray-600 mt-1">دقيقة</span>
          </div>
          <span className={`text-3xl font-bold ${
            status === 'ending' ? 'text-red-700' : 'text-emerald-700'
          }`}>:</span>
          <div className="flex flex-col">
            <span className={`text-4xl font-bold ${
              status === 'ending' ? 'text-red-700 animate-pulse' : 'text-emerald-700'
            }`}>
              {timeLeft.seconds.toString().padStart(2, '0')}
            </span>
            <span className="text-xs text-gray-600 mt-1">ثانية</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
        status === 'ending'
          ? 'bg-red-100 text-red-700'
          : 'bg-emerald-100 text-emerald-700'
      }`}
    >
      <Clock className="w-4 h-4" />
      <span>
        {timeLeft.days > 0 && `${timeLeft.days} يوم `}
        {`${timeLeft.hours.toString().padStart(2, '0')}:${timeLeft.minutes.toString().padStart(2, '0')}:${timeLeft.seconds.toString().padStart(2, '0')}`}
      </span>
    </div>
  );
}
