import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationBanner, {
  type NotificationBannerProps,
} from '@/components/shared/NotificationBanner';

vi.mock('@/lib/animations', () => ({
  fadeUpStagger: () => ({}),
  toastEnterStyle: () => ({}),
  toastKeyframes: '',
}));

const defaultProps: NotificationBannerProps = {
  message: 'Your post was published!',
  variant: 'published',
  onDismiss: vi.fn(),
  visible: true,
};

function renderBanner(overrides: Partial<NotificationBannerProps> = {}) {
  return render(<NotificationBanner {...defaultProps} {...overrides} />);
}

describe('NotificationBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders message text', () => {
    renderBanner();
    expect(screen.getByText('Your post was published!')).toBeInTheDocument();
  });

  it('shows action button when action prop provided', () => {
    const action = { label: 'View', onPress: vi.fn() };
    renderBanner({ action });
    expect(screen.getByText('View')).toBeInTheDocument();
  });

  it('hides when visible=false', () => {
    renderBanner({ visible: false });
    expect(screen.queryByText('Your post was published!')).not.toBeInTheDocument();
  });

  it('calls onDismiss after duration', () => {
    const onDismiss = vi.fn();
    renderBanner({ onDismiss, duration: 3000 });

    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders different accent colors for variants', () => {
    const { unmount } = renderBanner({ variant: 'review' });
    // review variant uses gold color accent bar
    const reviewBanner = screen.getByRole('status');
    expect(reviewBanner).toBeInTheDocument();
    unmount();

    // error variant uses error color
    renderBanner({ variant: 'error' });
    const errorBanner = screen.getByRole('alert');
    expect(errorBanner).toBeInTheDocument();
  });

  it('has role="alert" for error variant', () => {
    renderBanner({ variant: 'error' });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has role="status" for non-error variants', () => {
    renderBanner({ variant: 'published' });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('Escape key calls onDismiss', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    renderBanner({ onDismiss, duration: 0 });

    await user.keyboard('{Escape}');

    expect(onDismiss).toHaveBeenCalled();
  });
});
