import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickActions from '@/components/conversation/QuickActions';

describe('QuickActions', () => {
  it('renders 4 action buttons', () => {
    render(<QuickActions onSelect={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
  });

  it('renders expected action labels', () => {
    render(<QuickActions onSelect={vi.fn()} />);
    expect(screen.getByText('Post to social')).toBeInTheDocument();
    expect(screen.getByText('Check reviews')).toBeInTheDocument();
    expect(screen.getByText("This week's digest")).toBeInTheDocument();
    expect(screen.getByText('How am I doing?')).toBeInTheDocument();
  });

  it('calls onSelect with the command when an action is clicked', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    render(<QuickActions onSelect={handleSelect} />);

    await user.click(screen.getByText('Post to social'));
    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith("Create a social media post for this week");
  });

  it('renders nothing when visible is false', () => {
    const { container } = render(<QuickActions onSelect={vi.fn()} visible={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders toolbar when visible is true', () => {
    render(<QuickActions onSelect={vi.fn()} visible={true} />);
    expect(screen.getByRole('toolbar', { name: /quick actions/i })).toBeInTheDocument();
  });
});
