import { render, screen } from '@testing-library/react';
import PublishedCard from '@/components/conversation/PublishedCard';

function renderCard(overrides: Partial<Parameters<typeof PublishedCard>[0]> = {}) {
  const props = {
    platform: 'instagram' as const,
    title: 'Taco Tuesday Special',
    preview: 'Come try our new taco platter!',
    postUrl: 'https://instagram.com/p/123',
    timestamp: '5 minutes ago',
    ...overrides,
  };
  return render(<PublishedCard {...props} />);
}

describe('PublishedCard', () => {
  it('renders the title with platform label', () => {
    renderCard();
    expect(screen.getByText('Posted to Instagram')).toBeInTheDocument();
  });

  it('renders the preview text', () => {
    renderCard();
    expect(screen.getByText('Come try our new taco platter!')).toBeInTheDocument();
  });

  it('renders a link to the live post when postUrl is provided', () => {
    renderCard();
    const link = screen.getByRole('link', { name: /view live post/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://instagram.com/p/123');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('does not render the link when postUrl is not provided', () => {
    renderCard({ postUrl: undefined });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('does not render preview when not provided', () => {
    renderCard({ preview: undefined });
    expect(screen.queryByText('Come try our new taco platter!')).not.toBeInTheDocument();
  });

  it('renders the timestamp', () => {
    renderCard();
    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    renderCard();
    expect(screen.getByLabelText('Published to Instagram: Taco Tuesday Special')).toBeInTheDocument();
  });

  it('renders facebook platform correctly', () => {
    renderCard({ platform: 'facebook' });
    expect(screen.getByText('Posted to Facebook')).toBeInTheDocument();
  });

  it('renders google platform correctly', () => {
    renderCard({ platform: 'google' });
    expect(screen.getByText('Posted to Google')).toBeInTheDocument();
  });
});
