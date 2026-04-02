import type { Meta, StoryObj } from '@storybook/react';
import Skeleton, { MessageSkeleton, DigestSkeleton } from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'Shared/Skeleton',
  component: Skeleton,
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'circle', 'card', 'image'],
    },
    lines: { control: 'number' },
    width: { control: 'text' },
    height: { control: 'text' },
  },
};
export default meta;

type Story = StoryObj<typeof Skeleton>;

export const TextOneLine: Story = {
  args: {
    variant: 'text',
    lines: 1,
  },
};

export const TextThreeLines: Story = {
  args: {
    variant: 'text',
    lines: 3,
  },
};

export const Circle: Story = {
  args: {
    variant: 'circle',
  },
};

export const Card: Story = {
  args: {
    variant: 'card',
  },
};

export const Image: Story = {
  args: {
    variant: 'image',
  },
};

export const MessageSkeletonStory: StoryObj = {
  name: 'MessageSkeleton',
  render: () => <MessageSkeleton />,
};

export const DigestSkeletonStory: StoryObj = {
  name: 'DigestSkeleton',
  render: () => <DigestSkeleton />,
};
