import InvestorOpportunitiesView from './B2F/InvestorOpportunitiesView';

interface B2FSectionProps {
  onNavigate?: (page: string) => void;
  onGetReloadFunction?: (reloadFn: () => void) => void;
  sidebarOpen?: boolean;
  onSidebarOpenChange?: (isOpen: boolean) => void;
}

export default function B2FSection({
  onNavigate,
  onGetReloadFunction,
  sidebarOpen,
  onSidebarOpenChange
}: B2FSectionProps) {
  return (
    <InvestorOpportunitiesView
      sidebarOpen={sidebarOpen}
      onSidebarOpenChange={onSidebarOpenChange}
    />
  );
}
