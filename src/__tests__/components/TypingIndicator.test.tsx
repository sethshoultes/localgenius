import { render, screen } from '@testing-library/react';
import TypingIndicator from '@/components/conversation/TypingIndicator';

describe('TypingIndicator', () => {
  it('renders with status role', () => {
    render(<TypingIndicator />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-label for accessibility', () => {
    render(<TypingIndicator />);
    expect(screen.getByLabelText('LocalGenius is thinking')).toBeInTheDocument();
  });

  it('renders three dots', () => {
    const { container } = render(<TypingIndicator />);
    const dots = container.querySelectorAll('span.rounded-full');
    expect(dots).toHaveLength(3);
  });

  it('dots have staggered animation delays', () => {
    const { container } = render(<TypingIndicator />);
    const dots = container.querySelectorAll('span.rounded-full');
    expect(dots[0]).toHaveStyle({ animationDelay: '0ms' });
    expect(dots[1]).toHaveStyle({ animationDelay: '200ms' });
    expect(dots[2]).toHaveStyle({ animationDelay: '400ms' });
  });
});
