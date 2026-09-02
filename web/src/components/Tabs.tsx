export type Tab = 'feed' | 'ride' | 'leaderboard' | 'challenges'

const TABS: Tab[] = ['feed', 'ride', 'leaderboard', 'challenges']

interface TabsProps {
  activeTab: Tab
  onSelect: (tab: Tab) => void
}

export function Tabs({ activeTab, onSelect }: TabsProps) {
  return (
    <nav className="tabs">
      {TABS.map((tab) => (
        <button
          key={tab}
          className={`tab${activeTab === tab ? ' tab--active' : ''}`}
          onClick={() => onSelect(tab)}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </nav>
  )
}
