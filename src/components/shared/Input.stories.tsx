import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import Input from './Input';

const meta: Meta<typeof Input> = {
  title: 'Shared/Input',
  component: Input,
  decorators: [
    (Story) => (
      <div style={{ height: 200, position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof Input>;

const InputWrapper = ({
  initialValue = '',
  placeholder,
  disabled,
}: {
  initialValue?: string;
  placeholder?: string;
  disabled?: boolean;
}) => {
  const [value, setValue] = useState(initialValue);
  return (
    <Input
      value={value}
      onChange={setValue}
      onSubmit={(text) => alert(`Sent: ${text}`)}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
};

export const Default: Story = {
  render: () => <InputWrapper />,
};

export const WithPlaceholder: Story = {
  render: () => (
    <InputWrapper placeholder="Ask about your brisket taco post..." />
  ),
};

export const WithValue: Story = {
  render: () => (
    <InputWrapper initialValue="How did our brisket taco post perform this week?" />
  ),
};

export const Disabled: Story = {
  render: () => <InputWrapper disabled />,
};
