type Section = 'companies' | 'b2f';

interface SectionConfig {
  id: Section;
  name: string;
  color: string;
  icon: string;
}

const SECTIONS: SectionConfig[] = [
  { id: 'companies', name: 'مزاد الشركات و المزارع', color: '#3B82F6', icon: '🏢' },
  { id: 'b2f', name: 'استثمار أشجار المزارع', color: '#10B981', icon: '🌳' },
];

interface SectionTabsProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
}

export function SectionTabs({ activeSection, onSectionChange }: SectionTabsProps) {
  return (
    <div className="w-full bg-white/50 backdrop-blur-sm py-1.5 shadow-sm border-b border-gray-100" dir="rtl">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div
          className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {SECTIONS.map((section) => {
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all duration-300 ease-in-out"
                style={{
                  background: isActive ? section.color : 'rgba(255, 255, 255, 0.5)',
                  backdropFilter: 'blur(8px)',
                  boxShadow: isActive
                    ? `0 2px 8px ${section.color}40`
                    : '0 1px 3px rgba(0, 0, 0, 0.05)',
                  border: isActive ? 'none' : '1px solid rgba(107, 107, 107, 0.15)',
                }}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-base sm:text-lg">{section.icon}</span>
                  <span
                    className="text-xs sm:text-sm font-bold whitespace-nowrap"
                    style={{
                      color: isActive ? '#FFFFFF' : '#6B6B6B',
                      textShadow: isActive ? '0 1px 2px rgba(0, 0, 0, 0.2)' : 'none',
                    }}
                  >
                    {section.name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        .overflow-x-auto::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

export type { Section };
