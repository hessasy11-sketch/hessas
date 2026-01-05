import { useNavigate } from 'react-router-dom';
import ExecutiveOpsRoomB2F from './ExecutiveOpsRoomB2F';

export default function B2FOperationsView() {
  const navigate = useNavigate();

  return (
    <ExecutiveOpsRoomB2F onBack={() => navigate('/admin/operations-room')} />
  );
}
