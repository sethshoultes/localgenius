import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from '@/components/shared/Input';

function renderInput(overrides: Partial<Parameters<typeof Input>[0]> = {}) {
  const props = {
    value: '',
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  };
  const result = render(<Input {...props} />);
  return { ...result, ...props };
}

describe('Input', () => {
  it('renders with placeholder', () => {
    renderInput({ placeholder: 'Type here...' });
    expect(screen.getByPlaceholderText('Type here...')).toBeInTheDocument();
  });

  it('calls onChange when typing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    // Start with empty value; parent controls value so we just verify onChange is called
    renderInput({ onChange });
    const textarea = screen.getByLabelText('Message input');
    await user.type(textarea, 'a');
    expect(onChange).toHaveBeenCalled();
  });

  it('calls onSubmit on Enter key (not shift+Enter)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderInput({ value: 'Hello', onSubmit });
    const textarea = screen.getByLabelText('Message input');
    await user.type(textarea, '{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('Hello');
  });

  it('does not call onSubmit on Shift+Enter', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderInput({ value: 'Hello', onSubmit });
    const textarea = screen.getByLabelText('Message input');
    await user.type(textarea, '{Shift>}{Enter}{/Shift}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('send button appears when text is entered', () => {
    renderInput({ value: 'Some text' });
    expect(screen.getByLabelText('Send message')).toBeInTheDocument();
  });

  it('send button hidden when input is empty', () => {
    renderInput({ value: '' });
    expect(screen.queryByLabelText('Send message')).not.toBeInTheDocument();
  });

  it('disabled state disables textarea', () => {
    renderInput({ disabled: true });
    expect(screen.getByLabelText('Message input')).toBeDisabled();
  });
});
