import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InsightCard from '@/components/conversation/InsightCard';

function renderCard(overrides: Partial<Parameters<typeof InsightCard>[0]> = {}) {
  const props = {
    insight: 'Your Tuesday lunch posts get 34% more engagement.',
    suggestion: 'Try posting more lunch specials on Tuesdays.',
    onAccept: vi.fn(),
    onDismiss: vi.fn(),
    timestamp: '3 hours ago',
    ...overrides,
  };
  const result = render(<InsightCard {...props} />);
  return { ...result, ...props };
}

describe('InsightCard', () => {
  it('renders the insight text', () => {
    renderCard();
    expect(screen.getByText('Your Tuesday lunch posts get 34% more engagement.')).toBeInTheDocument();
  });

  it('renders the suggestion text', () => {
    renderCard();
    expect(screen.getByText('Try posting more lunch specials on Tuesdays.')).toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    renderCard();
    expect(screen.getByLabelText('Insight: Your Tuesday lunch posts get 34% more engagement.')).toBeInTheDocument();
  });

  it('renders the timestamp', () => {
    renderCard();
    expect(screen.getByText('3 hours ago')).toBeInTheDocument();
  });

  it('renders Sounds good and Not now buttons', () => {
    renderCard();
    expect(screen.getByRole('button', { name: /sounds good/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /not now/i })).toBeInTheDocument();
  });

  it('calls onAccept and shows accepted state when Sounds good is clicked', async () => {
    const user = userEvent.setup();
    const { onAccept } = renderCard();

    await user.click(screen.getByRole('button', { name: /sounds good/i }));

    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/I'll handle that/i)).toBeInTheDocument();
  });

  it('calls onDismiss and hides when Not now is clicked', async () => {
    const user = userEvent.setup();
    const { onDismiss, container } = renderCard();

    await user.click(screen.getByRole('button', { name: /not now/i }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(container.innerHTML).toBe('');
  });
});
