import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewAlertCard from '@/components/conversation/ReviewAlertCard';

function renderCard(overrides: Partial<Parameters<typeof ReviewAlertCard>[0]> = {}) {
  const props = {
    reviewerName: 'Jane D.',
    rating: 4,
    reviewText: 'Great tacos, friendly staff!',
    platform: 'google' as const,
    draftResponse: 'Thank you for your kind review, Jane!',
    onApproveResponse: vi.fn(),
    onEditResponse: vi.fn(),
    timestamp: '10 minutes ago',
    ...overrides,
  };
  const result = render(<ReviewAlertCard {...props} />);
  return { ...result, ...props };
}

describe('ReviewAlertCard', () => {
  it('renders the reviewer name', () => {
    renderCard();
    expect(screen.getByText(/Jane D\./)).toBeInTheDocument();
  });

  it('renders the star rating with aria-label', () => {
    renderCard({ rating: 3 });
    expect(screen.getByLabelText('3 out of 5 stars')).toBeInTheDocument();
  });

  it('has correct aria-label on article', () => {
    renderCard();
    expect(screen.getByLabelText('New 4-star review from Jane D.')).toBeInTheDocument();
  });

  it('renders the review text', () => {
    renderCard();
    expect(screen.getByText(/Great tacos, friendly staff!/)).toBeInTheDocument();
  });

  it('renders the timestamp', () => {
    renderCard();
    expect(screen.getByText('10 minutes ago')).toBeInTheDocument();
  });

  it('shows See AI Response and Respond Now buttons initially', () => {
    renderCard();
    expect(screen.getByRole('button', { name: /see ai response/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /respond now/i })).toBeInTheDocument();
  });

  it('shows draft response when See AI Response is clicked', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /see ai response/i }));

    expect(screen.getByText('Thank you for your kind review, Jane!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send this response/i })).toBeInTheDocument();
  });

  it('shows textarea when Respond Now is clicked', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /respond now/i }));

    expect(screen.getByLabelText('Edit review response')).toBeInTheDocument();
  });

  it('calls onApproveResponse when Send this response is clicked', async () => {
    const user = userEvent.setup();
    const { onApproveResponse } = renderCard();

    await user.click(screen.getByRole('button', { name: /see ai response/i }));
    await user.click(screen.getByRole('button', { name: /send this response/i }));

    expect(onApproveResponse).toHaveBeenCalledWith('Thank you for your kind review, Jane!');
    expect(screen.getByText(/Response sent to Jane D\./)).toBeInTheDocument();
  });

  it('shows Needs your attention for negative reviews', () => {
    renderCard({ rating: 1 });
    expect(screen.getByText('Needs your attention')).toBeInTheDocument();
  });

  it('does not show Needs your attention for positive reviews', () => {
    renderCard({ rating: 4 });
    expect(screen.queryByText('Needs your attention')).not.toBeInTheDocument();
  });
});
