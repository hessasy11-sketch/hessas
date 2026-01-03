import { Shield } from 'lucide-react';

export default function RootAccessBadge() {
  return (
    <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg animate-pulse">
      <Shield className="w-5 h-5" />
      <span className="font-bold text-sm">صلاحيات مطلقة (Root Access)</span>
    </div>
  );
}
