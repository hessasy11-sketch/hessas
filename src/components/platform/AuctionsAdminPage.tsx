import { useNavigate } from 'react-router-dom';
import { SessionTracker } from './SessionTracker';
import { EnhancedAuctionsManagement } from '../EnhancedAuctionsManagement';

export function AuctionsAdminPage() {
  const navigate = useNavigate();

  return (
    <>
      <SessionTracker />
      <EnhancedAuctionsManagement
        onClose={() => navigate('/admin', { replace: true })}
      />
    </>
  );
}
