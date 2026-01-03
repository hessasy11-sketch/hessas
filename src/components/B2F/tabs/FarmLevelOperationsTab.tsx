import { useState } from 'react';
import FarmOperationsManager from '../operations/FarmOperationsManager';
import FarmOperationPage from '../operations/FarmOperationPage';

export default function FarmLevelOperationsTab() {
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);

  if (selectedFarmId) {
    return (
      <FarmOperationPage
        farmId={selectedFarmId}
        onBack={() => setSelectedFarmId(null)}
      />
    );
  }

  return (
    <FarmOperationsManager
      onSelectFarm={(farmId) => setSelectedFarmId(farmId)}
    />
  );
}
