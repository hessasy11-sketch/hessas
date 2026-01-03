import { useNavigate } from 'react-router-dom';
import { EnhancedAuctionsManagement } from '../EnhancedAuctionsManagement';

export function AuctionsAdminPage() {
  const navigate = useNavigate();

  return (
    <EnhancedAuctionsManagement
      onClose={() => navigate('/hq', { replace: true })}
    />
  );
}
