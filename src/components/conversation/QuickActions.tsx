'use client';

/**
 * QuickActions — Suggested action chips above the input bar.
 *
 * Saves Maria from typing. She taps "Post to social" and the
 * input pre-fills with the command. Three to four chips max.
 *
 * Per product-design.md: the product should feel like talking
 * to an employee. These are the things Maria would most commonly
 * ask, surfaced so she doesn't have to think about phrasing.
 */

interface QuickAction {
  label: string;
  command: string;
  icon: string;
}

interface QuickActionsProps {
  onSelect: (command: string) => void;
  visible?: boolean;
}

function getActions(): QuickAction[] {
  return [
    {
      label: 'Post to social',
      command: 'Create a social media post for this week',
      icon: '📱',
    },
    {
      label: 'Check reviews',
      command: 'How are my reviews looking?',
      icon: '⭐',
    },
    {
      label: 'This week\'s digest',
      command: 'Show me this week\'s digest',
      icon: '📊',
    },
    {
      label: 'How am I doing?',
      command: 'How is my business doing this month?',
      icon: '💬',
    },
  ];
}

export default function QuickActions({
  onSelect,
  visible = true,
}: QuickActionsProps) {
  if (!visible) return null;

  return (
    <div
      className="flex gap-2 px-screen-margin py-2 overflow-x-auto scrollbar-none"
      role="toolbar"
      aria-label="Quick actions"
    >
      {getActions().map((action) => (
        <button
          key={action.label}
          onClick={() => onSelect(action.command)}
          className={[
            'flex-shrink-0 inline-flex items-center gap-1.5',
            'px-4 py-2 min-h-tap-min',
            'text-caption text-charcoal font-semibold',
            'bg-cream rounded-full',
            'hover:bg-terracotta-light active:bg-terracotta-light',
            'transition-colors duration-instant',
            'whitespace-nowrap',
          ].join(' ')}
        >
          <span>{action.icon}</span>
          {action.label}
        </button>
      ))}
    </div>
  );
}
