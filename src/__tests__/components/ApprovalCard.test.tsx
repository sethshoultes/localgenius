import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApprovalCard from '@/components/conversation/ApprovalCard';
import { publishContent, ApiError } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  publishContent: vi.fn(),
  respondToReview: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(m: string, s: number) {
      super(m);
      this.status = s;
    }
  },
}));

const mockedPublish = vi.mocked(publishContent);

function renderCard(overrides: Partial<Parameters<typeof ApprovalCard>[0]> = {}) {
  const props = {
    title: 'Post Ready',
    description: 'Your Instagram post is ready to publish.',
    primaryAction: { label: 'Approve', onPress: vi.fn() },
    secondaryAction: { label: 'Edit', onPress: vi.fn() },
    timestamp: '2 hours ago',
    ...overrides,
  };
  const result = render(<ApprovalCard {...props} />);
  return { ...result, ...props };
}

describe('ApprovalCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and description', () => {
    renderCard();
    expect(screen.getByText('Post Ready')).toBeInTheDocument();
    expect(screen.getByText('Your Instagram post is ready to publish.')).toBeInTheDocument();
  });

  it('shows primary and secondary action buttons when pending', () => {
    renderCard();
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('calls primary action onPress when approve clicked', async () => {
    const user = userEvent.setup();
    mockedPublish.mockResolvedValueOnce(undefined as never);
    const { primaryAction } = renderCard({ contentId: 'c-1' });

    await user.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(primaryAction.onPress).toHaveBeenCalledTimes(1);
    });
  });

  it('shows "Approved" text after approval', async () => {
    const user = userEvent.setup();
    mockedPublish.mockResolvedValueOnce(undefined as never);
    renderCard({ contentId: 'c-1' });

    await user.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });
  });

  it('shows error message on API failure', async () => {
    const user = userEvent.setup();
    mockedPublish.mockRejectedValueOnce(new ApiError('fail', 500));
    renderCard({ contentId: 'c-1' });

    await user.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });
});
