import { Routes, Route } from 'react-router-dom';
import B2FSection from './components/B2FSection';
import FarmsManagerDashboard from './components/FarmsManagerDashboard';
import FarmManagerDashboard from './components/platform/FarmManagerDashboard';
import { B2FAdminPage } from './components/platform/B2FAdminPage';

function App() {
  return (
    <Routes>
      {/* الواجهة العامة - الصفحة الرئيسية للمنصة */}
      <Route path="/" element={<B2FSection />} />
      <Route path="/b2f" element={<B2FSection />} />

      {/* مسارات Admin مخفية - لا تظهر إلا بعد تسجيل دخول صحيح */}
      <Route path="/admin/farms-manager-dashboard" element={<FarmsManagerDashboard />} />
      <Route path="/admin/farm-manager-dashboard" element={<FarmManagerDashboard />} />
      <Route path="/admin/b2f" element={<B2FAdminPage />} />

      {/* أي مسار آخر → الواجهة العامة */}
      <Route path="*" element={<B2FSection />} />
    </Routes>
  );
}

export default App;
