import { Routes, Route, Navigate } from 'react-router-dom';
import SimplifiedLogin from './components/SimplifiedLogin';
import FarmsManagerDashboard from './components/FarmsManagerDashboard';
import FarmManagerDashboard from './components/platform/FarmManagerDashboard';
import { B2FAdminPage } from './components/platform/B2FAdminPage';
import B2FSection from './components/B2FSection';

function App() {
  return (
    <Routes>
      {/* Default redirect to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Simplified Login - جوال + كلمة مرور فقط */}
      <Route path="/login" element={<SimplifiedLogin />} />

      {/* Farms Manager Dashboard - مدير المزارع (صاحب المنصة) */}
      <Route path="/admin/farms-manager-dashboard" element={<FarmsManagerDashboard />} />

      {/* Farm Manager Dashboard - مدير مزرعة */}
      <Route path="/admin/farm-manager-dashboard" element={<FarmManagerDashboard />} />

      {/* B2F System - نظام استثمار الأشجار للإدارة */}
      <Route path="/admin/b2f" element={<B2FAdminPage />} />

      {/* B2F Public View - للمستثمرين */}
      <Route path="/b2f" element={<B2FSection />} />

      {/* Catch all - redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
