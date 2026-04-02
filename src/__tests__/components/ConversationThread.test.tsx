import { render, screen } from '@testing-library/react';
import ConversationThread, {
  type ThreadMessage,
} from '@/components/conversation/ConversationThread';

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

const userMsg: ThreadMessage = {
  id: '1',
  type: 'user_message',
  content: 'How is my business doing?',
  timestamp: '9:00 AM',
};

const systemMsg: ThreadMessage = {
  id: '2',
  type: 'system_message',
  content: 'Your reviews are up 20%.',
  timestamp: '9:01 AM',
};

const approvalMsg: ThreadMessage = {
  id: '3',
  type: 'approval_card',
  content: 'Draft reply to a 5-star review.',
  timestamp: '9:02 AM',
  metadata: {
    title: 'Reply to Review',
    primaryLabel: 'Approve',
    secondaryLabel: 'Edit',
    status: 'pending',
  },
};

const reportMsg: ThreadMessage = {
  id: '4',
  type: 'report_card',
  content: 'Weekly summary: 150 new views.',
  timestamp: '9:03 AM',
};

describe('ConversationThread', () => {
  it('renders user messages as MessageBubble', () => {
    render(<ConversationThread messages={[userMsg]} />);
    expect(screen.getByText('How is my business doing?')).toBeInTheDocument();
  });

  it('renders system messages as MessageBubble', () => {
    render(<ConversationThread messages={[systemMsg]} />);
    expect(screen.getByText('Your reviews are up 20%.')).toBeInTheDocument();
  });

  it('renders approval cards for approval_card type', () => {
    render(<ConversationThread messages={[approvalMsg]} />);
    expect(screen.getByText('Reply to Review')).toBeInTheDocument();
    expect(screen.getByText('Draft reply to a 5-star review.')).toBeInTheDocument();
  });

  it('renders report cards', () => {
    render(<ConversationThread messages={[reportMsg]} />);
    expect(screen.getByText('Weekly summary: 150 new views.')).toBeInTheDocument();
  });

  it('shows typing indicator when isLoading=true', () => {
    const { container } = render(
      <ConversationThread messages={[]} isLoading />,
    );
    const dots = container.querySelectorAll('.animate-pulse-glow');
    expect(dots.length).toBe(3);
  });

  it('has role="log" for accessibility', () => {
    render(<ConversationThread messages={[]} />);
    expect(screen.getByRole('log')).toBeInTheDocument();
  });

  it('empty messages array renders without error', () => {
    const { container } = render(<ConversationThread messages={[]} />);
    expect(container).toBeTruthy();
  });
});
