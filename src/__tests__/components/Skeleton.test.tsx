import { render, screen } from '@testing-library/react';
import Skeleton, {
  MessageSkeleton,
  DigestSkeleton,
} from '@/components/shared/Skeleton';

describe('Skeleton', () => {
  it('renders text variant with correct number of lines', () => {
    const { container } = render(<Skeleton variant="text" lines={4} />);
    // Each line is a child div with h-4 class inside the flex container
    const lines = container.querySelectorAll('.h-4');
    expect(lines).toHaveLength(4);
  });

  it('renders circle variant with specified dimensions', () => {
    const { container } = render(
      <Skeleton variant="circle" width="64px" height="64px" />,
    );
    const circle = container.firstChild as HTMLElement;
    expect(circle).toHaveClass('rounded-full');
    expect(circle).toHaveStyle({ width: '64px', height: '64px' });
  });

  it('renders card variant', () => {
    const { container } = render(<Skeleton variant="card" />);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('card-subtle');
    // Card has 3 skeleton lines (40%, 100%, 75%)
    const lines = card.querySelectorAll('.h-4');
    expect(lines).toHaveLength(3);
  });

  it('renders image variant', () => {
    const { container } = render(
      <Skeleton variant="image" height="150px" />,
    );
    const image = container.firstChild as HTMLElement;
    expect(image).toHaveClass('loading-glow');
    expect(image).toHaveStyle({ height: '150px' });
  });

  it('MessageSkeleton renders without error', () => {
    const { container } = render(<MessageSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('DigestSkeleton renders without error', () => {
    const { container } = render(<DigestSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
