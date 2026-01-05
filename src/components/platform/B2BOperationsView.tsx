import { useNavigate } from 'react-router-dom';
import ExecutiveOpsRoomB2B from './ExecutiveOpsRoomB2B';

export default function B2BOperationsView() {
  const navigate = useNavigate();

  return (
    <ExecutiveOpsRoomB2B onBack={() => navigate('/admin/operations-room')} />
  );
}
