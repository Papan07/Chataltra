import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CustomEmojiPicker from '../EmojiPicker';

// Mock the emoji-picker-react component
vi.mock('emoji-picker-react', () => ({
  default: ({ onEmojiClick }) => (
    <div data-testid="emoji-picker">
      <button 
        onClick={() => onEmojiClick({ emoji: '😀' })}
        data-testid="emoji-button"
      >
        😀
      </button>
    </div>
  )
}));

describe('CustomEmojiPicker', () => {
  const mockOnEmojiClick = vi.fn();
  const mockOnClose = vi.fn();
  const mockAnchorRef = { current: document.createElement('div') };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(
      <CustomEmojiPicker
        isOpen={true}
        onEmojiClick={mockOnEmojiClick}
        onClose={mockOnClose}
        anchorRef={mockAnchorRef}
      />
    );

    expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <CustomEmojiPicker
        isOpen={false}
        onEmojiClick={mockOnEmojiClick}
        onClose={mockOnClose}
        anchorRef={mockAnchorRef}
      />
    );

    expect(screen.queryByTestId('emoji-picker')).not.toBeInTheDocument();
  });

  it('calls onEmojiClick when an emoji is selected', () => {
    render(
      <CustomEmojiPicker
        isOpen={true}
        onEmojiClick={mockOnEmojiClick}
        onClose={mockOnClose}
        anchorRef={mockAnchorRef}
      />
    );

    fireEvent.click(screen.getByTestId('emoji-button'));
    expect(mockOnEmojiClick).toHaveBeenCalledWith({ emoji: '😀' });
  });
});
