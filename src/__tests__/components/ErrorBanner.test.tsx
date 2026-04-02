import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBanner from '@/components/shared/ErrorBanner';

describe('ErrorBanner', () => {
  it('renders message', () => {
    render(<ErrorBanner message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows retry button when onRetry provided', () => {
    render(<ErrorBanner message="Error" onRetry={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('calls onRetry on click', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorBanner message="Error" onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows dismiss button when onDismiss provided', () => {
    render(<ErrorBanner message="Error" onDismiss={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Dismiss error' })).toBeInTheDocument();
  });

  it('calls onDismiss on dismiss click', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<ErrorBanner message="Error" onDismiss={onDismiss} />);

    await user.click(screen.getByRole('button', { name: 'Dismiss error' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('has role="alert"', () => {
    render(<ErrorBanner message="Error" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
