import { render, screen } from '@testing-library/react';
import MessageBubble from '@/components/conversation/MessageBubble';

describe('MessageBubble', () => {
  const baseProps = {
    content: 'Hello world',
    timestamp: '10:30 AM',
  };

  it('renders content text', () => {
    render(<MessageBubble variant="user" {...baseProps} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('user variant has right-aligned justify-end', () => {
    const { container } = render(<MessageBubble variant="user" {...baseProps} />);
    const outer = container.firstElementChild as HTMLElement;
    expect(outer.className).toContain('justify-end');
  });

  it('system variant has left-aligned justify-start', () => {
    const { container } = render(<MessageBubble variant="system" {...baseProps} />);
    const outer = container.firstElementChild as HTMLElement;
    expect(outer.className).toContain('justify-start');
  });

  it('shows timestamp when showTimestamp=true', () => {
    render(<MessageBubble variant="user" {...baseProps} showTimestamp />);
    expect(screen.getByText('10:30 AM')).toBeInTheDocument();
  });

  it('hides timestamp when showTimestamp=false', () => {
    render(<MessageBubble variant="user" {...baseProps} showTimestamp={false} />);
    expect(screen.queryByText('10:30 AM')).not.toBeInTheDocument();
  });

  it('failed status shows Retry button', () => {
    render(<MessageBubble variant="user" {...baseProps} status="failed" />);
    expect(screen.getByText('Retry')).toBeInTheDocument();
    expect(screen.getByLabelText('Message failed. Tap to retry.')).toBeInTheDocument();
  });

  it('sending status has opacity class', () => {
    const { container } = render(
      <MessageBubble variant="user" {...baseProps} status="sending" />,
    );
    // The bubble div (inside the outer flex wrapper) should have opacity-70
    const bubble = container.querySelector('.opacity-70');
    expect(bubble).toBeInTheDocument();
  });
});
