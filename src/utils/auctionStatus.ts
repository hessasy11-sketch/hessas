export type AuctionStatus = 'upcoming' | 'active' | 'closing_soon' | 'closed' | 'sold' | 'extended';

export interface AuctionStatusInfo {
  status: AuctionStatus;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  gradient: string;
  icon: string;
  timeText?: string;
  shouldAnimate: boolean;
  priority: number;
}

export function getAuctionStatus(
  startsAt: string,
  endsAt: string,
  dbStatus: string,
  isExtended?: boolean
): AuctionStatusInfo {
  const now = new Date().getTime();
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const timeUntilEnd = end - now;
  const timeUntilStart = start - now;

  // تحديد الحالة من قاعدة البيانات أولاً
  if (dbStatus === 'sold') {
    return {
      status: 'sold',
      label: 'تم البيع',
      color: 'text-yellow-800',
      bgColor: 'bg-gradient-to-r from-yellow-50 to-amber-50',
      borderColor: 'border-yellow-400',
      gradient: 'from-yellow-500 to-amber-600',
      icon: '✓',
      shouldAnimate: false,
      priority: 1
    };
  }

  if (dbStatus === 'closed' || timeUntilEnd <= 0) {
    return {
      status: 'closed',
      label: 'مغلق',
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-300',
      gradient: 'from-gray-500 to-slate-600',
      icon: '🔒',
      shouldAnimate: false,
      priority: 2
    };
  }

  // المزاد القادم (لم يبدأ بعد)
  if (timeUntilStart > 0) {
    const hoursUntilStart = Math.floor(timeUntilStart / (1000 * 60 * 60));
    const daysUntilStart = Math.floor(hoursUntilStart / 24);

    let timeText = '';
    if (daysUntilStart > 0) {
      timeText = `يبدأ خلال ${daysUntilStart} يوم`;
    } else if (hoursUntilStart > 0) {
      timeText = `يبدأ خلال ${hoursUntilStart} ساعة`;
    } else {
      timeText = 'يبدأ قريباً';
    }

    return {
      status: 'upcoming',
      label: 'قادم',
      color: 'text-purple-700',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-300',
      gradient: 'from-purple-500 to-violet-600',
      icon: '⏰',
      timeText,
      shouldAnimate: timeUntilStart < 1000 * 60 * 60, // animate if less than 1 hour
      priority: 3
    };
  }

  // المزاد ممدد
  if (isExtended || dbStatus === 'extended') {
    return {
      status: 'extended',
      label: 'ممدد',
      color: 'text-orange-700',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
      gradient: 'from-orange-500 to-amber-600',
      icon: '🔄',
      shouldAnimate: true,
      priority: 4
    };
  }

  // قريب الانتهاء (أقل من ساعتين)
  if (timeUntilEnd < 1000 * 60 * 60 * 2) {
    const minutesRemaining = Math.floor(timeUntilEnd / (1000 * 60));
    let timeText = '';

    if (minutesRemaining > 60) {
      const hours = Math.floor(minutesRemaining / 60);
      timeText = `باقي ${hours} ساعة`;
    } else if (minutesRemaining > 0) {
      timeText = `باقي ${minutesRemaining} دقيقة`;
    } else {
      timeText = 'ينتهي الآن';
    }

    return {
      status: 'closing_soon',
      label: 'قريب الانتهاء',
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      gradient: 'from-red-500 to-rose-600',
      icon: '🔥',
      timeText,
      shouldAnimate: true,
      priority: 5
    };
  }

  // نشط (المزاد جاري)
  const hoursRemaining = Math.floor(timeUntilEnd / (1000 * 60 * 60));
  const daysRemaining = Math.floor(hoursRemaining / 24);

  let timeText = '';
  if (daysRemaining > 1) {
    timeText = `باقي ${daysRemaining} يوم`;
  } else if (hoursRemaining > 0) {
    timeText = `باقي ${hoursRemaining} ساعة`;
  }

  return {
    status: 'active',
    label: 'متاح',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    gradient: 'from-green-500 to-emerald-600',
    icon: '⚡',
    timeText,
    shouldAnimate: false,
    priority: 6
  };
}

export function formatTimeRemaining(endsAt: string): string {
  const now = new Date().getTime();
  const end = new Date(endsAt).getTime();
  const diff = end - now;

  if (diff <= 0) return 'انتهى';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days} يوم`;
  if (hours > 0) return `${hours} ساعة`;
  if (minutes > 0) return `${minutes} دقيقة`;
  return 'أقل من دقيقة';
}
