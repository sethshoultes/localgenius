import type { Meta, StoryObj } from '@storybook/react';
import NotificationBanner from './NotificationBanner';

const meta: Meta<typeof NotificationBanner> = {
  title: 'Shared/NotificationBanner',
  component: NotificationBanner,
  args: {
    visible: true,
    duration: 0, // Disable auto-dismiss in Storybook
    onDismiss: () => console.log('Dismissed'),
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: 100, paddingTop: 60 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof NotificationBanner>;

export const NewReview: Story = {
  args: {
    variant: 'review',
    message: 'You got a new 5-star review from Jake R.',
  },
};

export const ContentPublished: Story = {
  args: {
    variant: 'published',
    message: 'Your lunch special post is live on Instagram.',
  },
};

export const DigestReady: Story = {
  args: {
    variant: 'digest',
    message: 'Your weekly digest is ready.',
  },
};

export const Milestone: Story = {
  args: {
    variant: 'milestone',
    message: 'You just hit 100 Google reviews!',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    message: 'Your Instagram connection dropped.',
  },
};

export const WithAction: Story = {
  args: {
    variant: 'review',
    message: 'You got a new 5-star review from Jake R.',
    action: {
      label: 'View',
      onPress: () => console.log('View pressed'),
    },
  },
};
