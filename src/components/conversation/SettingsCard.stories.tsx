import type { Meta, StoryObj } from '@storybook/react';
import SettingsCard from './SettingsCard';

const meta: Meta<typeof SettingsCard> = {
  title: 'Conversation/SettingsCard',
  component: SettingsCard,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 400, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof SettingsCard>;

const mariasFields = [
  { key: 'name', label: 'Business Name', value: "Maria's Kitchen", type: 'text' as const },
  { key: 'phone', label: 'Phone', value: '(512) 555-0142', type: 'tel' as const },
  {
    key: 'hours',
    label: 'Hours',
    value: 'Mon-Sat 11am-9pm, Sun 11am-3pm',
    type: 'text' as const,
  },
  {
    key: 'address',
    label: 'Address',
    value: '2401 S Lamar Blvd, Austin, TX 78704',
    type: 'text' as const,
  },
];

export const Editing: Story = {
  args: {
    title: 'Update Business Details',
    description: "I'll update these across Google, Yelp, and your website.",
    fields: mariasFields,
    onSave: async (values) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('Saved:', values);
    },
    timestamp: 'Just now',
  },
};

export const Saved: Story = {
  args: {
    title: 'Update Business Details',
    description: "I'll update these across Google, Yelp, and your website.",
    fields: mariasFields,
    onSave: async () => {
      // Resolves instantly to trigger saved state
    },
    timestamp: '2 min ago',
  },
  play: async ({ canvasElement }) => {
    // Click Save to transition to the saved/collapsed state
    const button = canvasElement.querySelector('button');
    const saveBtn = Array.from(canvasElement.querySelectorAll('button')).find(
      (btn) => btn.textContent?.trim() === 'Save',
    );
    if (saveBtn) {
      saveBtn.click();
    }
  },
};

export const Error: Story = {
  args: {
    title: 'Update Business Details',
    description: "I'll update these across Google, Yelp, and your website.",
    fields: mariasFields,
    onSave: async () => {
      await new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network error')), 500),
      );
    },
    timestamp: 'Just now',
  },
  play: async ({ canvasElement }) => {
    // Click Save to trigger the error state
    await new Promise((resolve) => setTimeout(resolve, 100));
    const saveBtn = Array.from(canvasElement.querySelectorAll('button')).find(
      (btn) => btn.textContent?.trim() === 'Save',
    );
    if (saveBtn) {
      saveBtn.click();
    }
  },
};
