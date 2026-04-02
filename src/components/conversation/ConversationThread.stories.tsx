import type { Meta, StoryObj } from '@storybook/react';
import ConversationThread, { type ThreadMessage } from './ConversationThread';

const meta: Meta<typeof ConversationThread> = {
  title: 'Conversation/ConversationThread',
  component: ConversationThread,
  decorators: [
    (Story) => (
      <div style={{ height: 600, display: 'flex', flexDirection: 'column' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ConversationThread>;

const sampleMessages: ThreadMessage[] = [
  {
    id: '1',
    type: 'system_message',
    content:
      "Good morning, Maria! Your brisket taco post from Tuesday reached 847 people — 23% more than last week's enchilada post.",
    timestamp: '9:00 AM',
  },
  {
    id: '2',
    type: 'user_message',
    content: "That's great! Can we do another one for this weekend?",
    timestamp: '9:02 AM',
  },
  {
    id: '3',
    type: 'system_message',
    content:
      "Absolutely! I drafted a weekend special post for you. Take a look and approve it when you're ready.",
    timestamp: '9:02 AM',
  },
  {
    id: '4',
    type: 'approval_card',
    content:
      'This weekend only: family-size enchilada platter for $24.99. Feeds 4-5. Available Sat & Sun 11am-8pm. Tag a friend who needs this!',
    timestamp: '9:03 AM',
    metadata: {
      title: 'Weekend Special Post',
      description:
        'This weekend only: family-size enchilada platter for $24.99. Feeds 4-5. Available Sat & Sun 11am-8pm.',
      primaryLabel: 'Approve & Post',
      secondaryLabel: 'Edit First',
      status: 'pending',
    },
  },
  {
    id: '5',
    type: 'report_card',
    content:
      'Weekly summary: 12 new Google reviews (4.8 avg), 2,340 profile views (+18%), 47 direction requests. Your best week for reviews this month.',
    timestamp: '9:05 AM',
  },
  {
    id: '6',
    type: 'user_message',
    content: 'Love it. Also, did anyone leave a review about the salsa verde?',
    timestamp: '9:10 AM',
  },
];

export const FullThread: Story = {
  args: {
    messages: sampleMessages,
    isLoading: true,
  },
};
