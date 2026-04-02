import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '@/components/shared/Button';

describe('Button', () => {
  it('renders label text', () => {
    render(<Button label="Click me" />);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('renders primary variant with correct classes', () => {
    render(<Button label="Primary" variant="primary" />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-terracotta');
  });

  it('renders secondary variant with correct classes', () => {
    render(<Button label="Secondary" variant="secondary" />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('text-terracotta');
    expect(btn.className).toContain('border');
  });

  it('renders ghost variant with correct classes', () => {
    render(<Button label="Ghost" variant="ghost" />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-transparent');
    expect(btn.className).toContain('text-terracotta');
  });

  it('renders danger variant with correct classes', () => {
    render(<Button label="Danger" variant="danger" />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('text-error');
    expect(btn.className).toContain('border-error');
  });

  it('disabled state sets disabled attribute', () => {
    render(<Button label="Disabled" disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('loading state shows loading indicator and disables button', () => {
    render(<Button label="Submit" loading />);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    expect(screen.queryByText('Submit')).not.toBeInTheDocument();
  });

  it('fullWidth adds w-full class', () => {
    render(<Button label="Full" fullWidth />);
    expect(screen.getByRole('button').className).toContain('w-full');
  });

  it('calls onClick handler', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button label="Click" onClick={handleClick} />);
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders icon when provided', () => {
    render(<Button label="With Icon" icon={<span data-testid="icon">*</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
