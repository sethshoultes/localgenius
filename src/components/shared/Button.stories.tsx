import type { Meta, StoryObj } from '@storybook/react';
import Button from './Button';

const meta: Meta<typeof Button> = {
  title: 'Shared/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['default', 'small'],
    },
    loading: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    label: 'Approve Post',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    label: 'Edit Draft',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    label: 'Skip for Now',
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    label: 'Delete Post',
  },
};

export const Small: Story = {
  args: {
    variant: 'primary',
    size: 'small',
    label: 'Reply',
  },
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    label: 'Publishing...',
    loading: true,
  },
};

export const WithIcon: Story = {
  args: {
    variant: 'primary',
    label: 'Post to Google',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" x2="12" y1="19" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </svg>
    ),
  },
};

export const FullWidth: Story = {
  args: {
    variant: 'primary',
    label: 'Publish Brisket Taco Special',
    fullWidth: true,
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    label: 'Approve Post',
    disabled: true,
  },
};
