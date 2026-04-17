import { describe, expect, it } from 'vitest';
import { UserAvatar } from './user-avatar';

describe('UserAvatar', () => {
  it('renders an img element when avatarUrl is provided', () => {
    const el = UserAvatar({
      avatarUrl: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      displayName: 'Ibrahim Samad',
    });
    expect(el.type).toBe('img');
    expect(el.props.src).toBe('https://lh3.googleusercontent.com/a/default-user=s96-c');
    expect(el.props.alt).toBe('');
    expect(el.props.referrerPolicy).toBe('no-referrer');
  });

  it('renders an initials tile when avatarUrl is null', () => {
    // Preserves the `.slice(0, 2)` behaviour from the old inline impl
    // in account-menu.tsx — "Ibrahim Samad" → "IB", not "IS".
    const el = UserAvatar({ avatarUrl: null, displayName: 'Ibrahim Samad' });
    expect(el.type).toBe('span');
    expect(el.props.children).toBe('IB');
    expect(el.props['aria-hidden']).toBe(true);
  });

  it('uppercases the initials regardless of input case', () => {
    const el = UserAvatar({ avatarUrl: null, displayName: 'alice' });
    expect(el.props.children).toBe('AL');
  });

  it('handles single-character displayName without crashing', () => {
    const el = UserAvatar({ avatarUrl: null, displayName: 'A' });
    expect(el.props.children).toBe('A');
  });

  it('falls back to a placeholder initial when displayName is empty', () => {
    const el = UserAvatar({ avatarUrl: null, displayName: '' });
    expect(el.type).toBe('span');
    expect(el.props.children).toBe('?');
  });

  it('forwards className to the rendered element', () => {
    const withImg = UserAvatar({
      avatarUrl: 'https://example.com/a.jpg',
      displayName: 'A',
      className: 'h-12 w-12',
    });
    expect(withImg.props.className).toContain('h-12 w-12');

    const withInitials = UserAvatar({ avatarUrl: null, displayName: 'A', className: 'h-12 w-12' });
    expect(withInitials.props.className).toContain('h-12 w-12');
  });
});
