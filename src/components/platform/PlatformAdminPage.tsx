import { useNavigate } from 'react-router-dom';
import PlatformCommandCenter from './PlatformCommandCenter';

export function PlatformAdminPage() {
  const navigate = useNavigate();

  return (
    <PlatformCommandCenter
      onClose={() => navigate('/admin', { replace: true })}
      onNavigateToB2F={() => navigate('/admin/b2f', { replace: true })}
      onNavigateToAuctions={() => navigate('/admin/auctions', { replace: true })}
    />
  );
}
