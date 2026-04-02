import type { Preview } from '@storybook/react';
import '../src/styles/globals.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'warm-white',
      values: [
        { name: 'warm-white', value: '#FAF8F5' },
        { name: 'cream', value: '#F2EDE8' },
        { name: 'white', value: '#FFFFFF' },
      ],
    },
  },
};
export default preview;
