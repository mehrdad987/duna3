import { ReactNode, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
}

export function Tabs({ tabs, defaultTab, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  // Keep activeTab in sync if tabs list or defaultTab changes
  useEffect(() => {
    const exists = tabs.some((t) => t.id === activeTab);
    if (!exists) {
      setActiveTab(defaultTab || tabs[0]?.id);
    }
  }, [tabs, defaultTab, activeTab]);

  const onKeyNav = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const nextIdx =
        e.key === 'ArrowRight'
          ? Math.min(idx + 1, tabs.length - 1)
          : Math.max(idx - 1, 0);
      const nextId = tabs[nextIdx]?.id;
      if (nextId) {
        setActiveTab(nextId);
        const el = document.getElementById(`tab-${nextId}`);
        el?.focus();
      }
    }
  };

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className={cn("w-full", className)}>
      {/* Tab Navigation */}
      <div className="bg-muted/30 p-1 rounded-xl mb-6 overflow-x-auto" role="tablist" aria-label="Tabs">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab, idx) => (
            <button
              id={`tab-${tab.id}`}
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onKeyDown={(e) => onKeyNav(e, idx)}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center justify-center gap-1.5 px-3 py-3 rounded-lg text-xs font-medium transition-all duration-200 min-w-0 flex-shrink-0",
                "sm:gap-2 sm:px-4 sm:text-sm",
                activeTab === tab.id
                  ? "bg-white shadow-sm text-primary border border-border/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/50"
              )}
            >
              {tab.icon && (
                <span className={cn(
                  "transition-colors flex-shrink-0",
                  activeTab === tab.id ? "text-primary" : "text-muted-foreground"
                )}>
                  {tab.icon}
                </span>
              )}
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        {activeTabContent}
      </div>
    </div>
  );
}
