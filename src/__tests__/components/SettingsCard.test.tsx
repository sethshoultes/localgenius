import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsCard from '@/components/conversation/SettingsCard';

const defaultFields = [
  { key: 'phone', label: 'Phone', value: '555-1234', type: 'tel' as const },
  { key: 'website', label: 'Website', value: 'https://example.com', type: 'url' as const },
];

const defaultProps = {
  title: 'Contact Info',
  description: 'Update your business contact details.',
  fields: defaultFields,
  onSave: vi.fn().mockResolvedValue(undefined),
  timestamp: '2:30 PM',
};

function renderCard(overrides = {}) {
  return render(<SettingsCard {...defaultProps} {...overrides} />);
}

describe('SettingsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and description', () => {
    renderCard();
    expect(screen.getByText('Contact Info')).toBeInTheDocument();
    expect(screen.getByText('Update your business contact details.')).toBeInTheDocument();
  });

  it('renders fields with labels', () => {
    renderCard();
    expect(screen.getByLabelText('Phone')).toBeInTheDocument();
    expect(screen.getByLabelText('Website')).toBeInTheDocument();
    expect(screen.getByDisplayValue('555-1234')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument();
  });

  it('updates field value on input change', async () => {
    const user = userEvent.setup();
    renderCard();
    const phoneInput = screen.getByLabelText('Phone');
    await user.clear(phoneInput);
    await user.type(phoneInput, '999-8888');
    expect(phoneInput).toHaveValue('999-8888');
  });

  it('calls onSave with current values on Save click', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderCard({ onSave });

    const phoneInput = screen.getByLabelText('Phone');
    await user.clear(phoneInput);
    await user.type(phoneInput, '111-2222');

    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        phone: '111-2222',
        website: 'https://example.com',
      });
    });
  });

  it('shows "Updated" with checkmark after successful save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderCard({ onSave });

    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Updated')).toBeInTheDocument();
    });
    // The saved state article has aria-label "Updated: Contact Info"
    expect(screen.getByLabelText('Updated: Contact Info')).toBeInTheDocument();
    // Checkmark SVG should be present (polyline with checkmark points)
    const svg = screen.getByLabelText('Updated: Contact Info').querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('shows error message when onSave rejects', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();
    renderCard({ onSave });

    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText(/Couldn\u2019t save that/)).toBeInTheDocument();
    });
  });

  it('Cancel resets fields to initial values', async () => {
    const user = userEvent.setup();
    renderCard();

    const phoneInput = screen.getByLabelText('Phone');
    await user.clear(phoneInput);
    await user.type(phoneInput, '000-0000');
    expect(phoneInput).toHaveValue('000-0000');

    await user.click(screen.getByText('Cancel'));

    expect(screen.getByLabelText('Phone')).toHaveValue('555-1234');
  });

  it('saved state shows field summaries', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderCard({ onSave });

    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Updated')).toBeInTheDocument();
    });
    expect(screen.getByText('Phone: 555-1234')).toBeInTheDocument();
    expect(screen.getByText('Website: https://example.com')).toBeInTheDocument();
  });
});
