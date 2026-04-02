import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeeklyDigest from '@/components/digest/WeeklyDigest';

const baseProps = {
  businessName: 'Sunrise Bakery',
  ownerName: 'Maria',
  weekOf: 'Week of March 24',
  highlights: [
    { label: 'new reviews', value: '12', change: '+30%' },
    { label: 'profile views', value: '340', change: '+15%' },
    { label: 'posts published', value: '3' },
  ],
  actions: [
    { description: 'Replied to 8 reviews' },
    { description: 'Published 3 social posts' },
  ],
  recommendation: null,
};

describe('WeeklyDigest', () => {
  it('renders greeting with owner name', () => {
    render(<WeeklyDigest {...baseProps} />);
    expect(screen.getByText(/good morning, maria/i)).toBeInTheDocument();
  });

  it('renders business name', () => {
    render(<WeeklyDigest {...baseProps} />);
    expect(screen.getByText(/sunrise bakery/i)).toBeInTheDocument();
  });

  it('renders all highlight metrics', () => {
    render(<WeeklyDigest {...baseProps} />);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('new reviews')).toBeInTheDocument();
    expect(screen.getByText('+30%')).toBeInTheDocument();
    expect(screen.getByText('340')).toBeInTheDocument();
    expect(screen.getByText('profile views')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('posts published')).toBeInTheDocument();
  });

  it('renders action list items', () => {
    render(<WeeklyDigest {...baseProps} />);
    expect(screen.getByText('Replied to 8 reviews')).toBeInTheDocument();
    expect(screen.getByText('Published 3 social posts')).toBeInTheDocument();
  });

  it('renders recommendation text and buttons when provided', () => {
    const recommendation = {
      text: 'Try posting a behind-the-scenes reel this week.',
      primaryAction: { label: 'Create Post', onPress: vi.fn() },
      secondaryAction: { label: 'Skip', onPress: vi.fn() },
    };
    render(<WeeklyDigest {...baseProps} recommendation={recommendation} />);
    expect(screen.getByText(recommendation.text)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create post/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument();
  });

  it('renders without recommendation when null', () => {
    render(<WeeklyDigest {...baseProps} recommendation={null} />);
    expect(screen.queryByText(/here's what i recommend/i)).not.toBeInTheDocument();
  });
});
