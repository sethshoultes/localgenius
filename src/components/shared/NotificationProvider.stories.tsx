import type { Meta, StoryObj } from '@storybook/react';
import NotificationProvider, { useNotification } from './NotificationProvider';

function InteractiveDemo() {
  const { show } = useNotification();

  return (
    <div style={{ display: 'flex', gap: 12, padding: 16 }}>
      <button
        onClick={() =>
          show({
            message: 'You got a new 5-star review from Jake R.',
            variant: 'review',
          })
        }
        style={{
          padding: '10px 16px',
          borderRadius: 8,
          border: '1px solid #ccc',
          background: '#fff',
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        Show Review Alert
      </button>
      <button
        onClick={() =>
          show({
            message: 'Your lunch special post is live on Instagram.',
            variant: 'published',
          })
        }
        style={{
          padding: '10px 16px',
          borderRadius: 8,
          border: '1px solid #ccc',
          background: '#fff',
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        Show Published
      </button>
      <button
        onClick={() =>
          show({
            message: 'Your Instagram connection dropped.',
            variant: 'error',
          })
        }
        style={{
          padding: '10px 16px',
          borderRadius: 8,
          border: '1px solid #ccc',
          background: '#fff',
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        Show Error
      </button>
    </div>
  );
}

const meta: Meta<typeof NotificationProvider> = {
  title: 'Shared/NotificationProvider',
  component: NotificationProvider,
  decorators: [
    (Story) => (
      <div style={{ minHeight: 200 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof NotificationProvider>;

export const Interactive: Story = {
  render: () => (
    <NotificationProvider>
      <InteractiveDemo />
    </NotificationProvider>
  ),
};
