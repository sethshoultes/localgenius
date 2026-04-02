import type { Meta, StoryObj } from '@storybook/react';
import ApprovalCard from './ApprovalCard';

const meta: Meta<typeof ApprovalCard> = {
  title: 'Conversation/ApprovalCard',
  component: ApprovalCard,
  argTypes: {
    status: {
      control: 'select',
      options: ['pending', 'approved', 'published', 'dismissed', 'error'],
    },
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

type Story = StoryObj<typeof ApprovalCard>;

const defaultActions = {
  primaryAction: {
    label: 'Approve & Post',
    onPress: () => console.log('Approved'),
  },
  secondaryAction: {
    label: 'Edit First',
    onPress: () => console.log('Edit'),
  },
};

export const Pending: Story = {
  args: {
    title: 'New Google Post Ready',
    description:
      "Brisket taco Tuesday is BACK! Slow-smoked for 14 hours, served on handmade tortillas with our house-made salsa verde. Stop by Maria's Kitchen — first 20 customers get a free agua fresca.",
    status: 'pending',
    timestamp: 'Just now',
    ...defaultActions,
  },
};

export const Approved: Story = {
  args: {
    title: 'Weekend Special Post',
    description:
      'This weekend only: family-size enchilada platter for $24.99. Feeds 4-5 people. Available Saturday and Sunday 11am-8pm.',
    status: 'approved',
    timestamp: '10 min ago',
    ...defaultActions,
  },
};

export const Published: Story = {
  args: {
    title: 'Review Response',
    description:
      "Thank you so much for the kind words, Sarah! We're thrilled you loved the brisket tacos. The secret is our 14-hour smoke — come back Tuesday for our next batch!",
    status: 'published',
    timestamp: '1 hour ago',
    ...defaultActions,
  },
};

export const Dismissed: Story = {
  args: {
    title: 'Suggested Post: Taco Tuesday Reminder',
    description:
      "Don't forget — it's Taco Tuesday at Maria's Kitchen! Our famous brisket tacos are waiting for you.",
    status: 'dismissed',
    timestamp: 'Yesterday',
    ...defaultActions,
  },
};

export const WithPreview: Story = {
  args: {
    title: 'Photo Post Ready',
    description:
      "Here's a post featuring your new patio seating. I picked the photo with the best lighting.",
    status: 'pending',
    timestamp: 'Just now',
    preview: (
      <div
        style={{
          width: '100%',
          height: 160,
          background: 'linear-gradient(135deg, #F2EDE8 0%, #E8D5C4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#8B7355',
          fontSize: 14,
        }}
      >
        [Patio photo preview]
      </div>
    ),
    ...defaultActions,
  },
};

export const ErrorState: Story = {
  args: {
    title: 'Google Post Failed',
    description:
      'Your brisket taco post was approved but failed to publish. Tap to try again.',
    status: 'error',
    timestamp: '5 min ago',
    ...defaultActions,
  },
};
