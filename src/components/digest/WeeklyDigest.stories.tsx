import type { Meta, StoryObj } from '@storybook/react';
import WeeklyDigest from './WeeklyDigest';

const meta: Meta<typeof WeeklyDigest> = {
  title: 'Digest/WeeklyDigest',
  component: WeeklyDigest,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 430, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof WeeklyDigest>;

export const FullDigest: Story = {
  args: {
    businessName: "Maria's Kitchen",
    ownerName: 'Maria',
    weekOf: 'Week of March 24 — 30, 2026',
    highlights: [
      {
        label: 'Profile views',
        value: '2,340',
        change: '↑ 18% vs last week',
      },
      {
        label: 'New reviews',
        value: '12',
        change: '↑ 4 more than usual',
        isBest: true,
      },
      {
        label: 'Direction requests',
        value: '47',
        change: '↑ 8% vs last week',
      },
    ],
    trendData: [1200, 1450, 1380, 1600, 1820, 2050, 1950, 2340],
    actions: [
      {
        description:
          'Published 3 Google posts — brisket taco Tuesday got 847 views, your best-performing post this month.',
        highlight: true,
      },
      {
        description:
          'Responded to 8 new reviews within 2 hours of each being posted.',
      },
      {
        description:
          "Updated your holiday hours for Easter weekend on Google Business Profile.",
      },
      {
        description:
          'Flagged 1 negative review (2 stars) and drafted a response for your approval.',
      },
    ],
    recommendation: {
      text: "Your brisket taco posts consistently outperform other content by 2-3x. I'd recommend making Taco Tuesday a weekly recurring post — I can handle it automatically with your approval each Monday morning.",
      primaryAction: {
        label: 'Set Up Weekly Post',
        onPress: () => console.log('Setting up weekly post'),
      },
      secondaryAction: {
        label: 'Maybe Later',
        onPress: () => console.log('Dismissed recommendation'),
      },
    },
  },
};
