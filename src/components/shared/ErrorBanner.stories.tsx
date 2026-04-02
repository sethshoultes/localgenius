import type { Meta, StoryObj } from '@storybook/react';
import ErrorBanner from './ErrorBanner';

const meta: Meta<typeof ErrorBanner> = {
  title: 'Shared/ErrorBanner',
  component: ErrorBanner,
  argTypes: {
    message: { control: 'text' },
  },
};
export default meta;

type Story = StoryObj<typeof ErrorBanner>;

export const WithRetry: Story = {
  args: {
    message: "Couldn't publish your brisket taco post. Check your connection and try again.",
    onRetry: () => alert('Retrying...'),
  },
};

export const WithDismiss: Story = {
  args: {
    message: 'Failed to load weekly digest for Maria\'s Kitchen.',
    onDismiss: () => alert('Dismissed'),
  },
};

export const WithBoth: Story = {
  args: {
    message: 'Something went wrong posting your Google Business update.',
    onRetry: () => alert('Retrying...'),
    onDismiss: () => alert('Dismissed'),
  },
};
