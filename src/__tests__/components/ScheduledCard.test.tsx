import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScheduledCard from '@/components/conversation/ScheduledCard';

function renderCard(overrides: Partial<Parameters<typeof ScheduledCard>[0]> = {}) {
  const props = {
    title: 'Weekend Brunch Post',
    description: 'Highlighting the new brunch menu.',
    scheduledTime: 'Thursday at 5pm',
    platform: 'instagram' as const,
    onCancel: vi.fn(),
    timestamp: '1 hour ago',
    ...overrides,
  };
  const result = render(<ScheduledCard {...props} />);
  return { ...result, ...props };
}

describe('ScheduledCard', () => {
  it('renders the title', () => {
    renderCard();
    expect(screen.getByText('Weekend Brunch Post')).toBeInTheDocument();
  });

  it('renders the scheduled time', () => {
    renderCard();
    expect(screen.getByText('Thursday at 5pm')).toBeInTheDocument();
  });

  it('renders the platform label', () => {
    renderCard();
    expect(screen.getByText('on Instagram')).toBeInTheDocument();
  });

  it('renders the description', () => {
    renderCard();
    expect(screen.getByText('Highlighting the new brunch menu.')).toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    renderCard();
    expect(screen.getByLabelText('Scheduled: Weekend Brunch Post for Thursday at 5pm')).toBeInTheDocument();
  });

  it('renders the timestamp', () => {
    renderCard();
    expect(screen.getByText('1 hour ago')).toBeInTheDocument();
  });

  it('calls onCancel and shows cancelled state when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderCard();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Cancelled: Weekend Brunch Post')).toBeInTheDocument();
  });

  it('shows Undo button after cancellation', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.getByText('Undo')).toBeInTheDocument();
  });

  it('restores the card when Undo is clicked', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    await user.click(screen.getByText('Undo'));

    expect(screen.getByText('Weekend Brunch Post')).toBeInTheDocument();
    expect(screen.getByText('Thursday at 5pm')).toBeInTheDocument();
  });
});
