import type { Meta, StoryObj } from '@storybook/react';
import MessageBubble from './MessageBubble';

const meta: Meta<typeof MessageBubble> = {
  title: 'Conversation/MessageBubble',
  component: MessageBubble,
  argTypes: {
    variant: {
      control: 'select',
      options: ['user', 'system'],
    },
    status: {
      control: 'select',
      options: ['sending', 'sent', 'failed'],
    },
    showTimestamp: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 400, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof MessageBubble>;

export const UserMessage: Story = {
  args: {
    variant: 'user',
    content: 'How did our brisket taco post do this week?',
    timestamp: '2:34 PM',
    status: 'sent',
  },
};

export const SystemMessage: Story = {
  args: {
    variant: 'system',
    content:
      "Great news! Your brisket taco post reached 847 people this week — that's 23% more than your enchilada post last Tuesday. Three people saved it and two asked for directions.",
    timestamp: '2:35 PM',
    status: 'sent',
  },
};

export const WithTimestamp: Story = {
  args: {
    variant: 'system',
    content: 'I drafted a reply to the 5-star review from @TacoLover512. Want to take a look?',
    timestamp: 'Today, 9:12 AM',
    showTimestamp: true,
    status: 'sent',
  },
};

export const Failed: Story = {
  args: {
    variant: 'user',
    content: 'Publish the weekend special post now',
    timestamp: '3:01 PM',
    status: 'failed',
  },
};

export const Sending: Story = {
  args: {
    variant: 'user',
    content: 'Can you update our hours for the holiday?',
    timestamp: '4:15 PM',
    status: 'sending',
  },
};
