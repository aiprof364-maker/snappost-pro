import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getNewsletterMessage, NEWSLETTER_WEEKLY_ISSUES } from './newsletterContent';

const send = vi.hoisted(() => vi.fn());
vi.mock('resend', () => ({ Resend: vi.fn(() => ({ emails: { send } })) }));
const unsubscribeUrl = 'https://snappostpro.com/api/newsletter/unsubscribe?token=abc123';

beforeEach(() => {
  vi.resetModules();
  send.mockReset();
  process.env.RESEND_API_KEY = 'test-key-not-a-real-credential';
});

describe('newsletter content', () => {
  it('replaces the contractor-only welcome and accurately describes the sequence', () => {
    const m = getNewsletterMessage('welcome', unsubscribeUrl);
    expect(m.text).toContain('local businesses');
    expect(m.text).toContain('In three days');
    expect(m.text).toContain('Tuesdays');
    expect(m.text).toContain('three branded post drafts total');
    expect(m.text).not.toMatch(/tradies|contractors|discount|early access|5\+ hours|guaranteed/i);
  });
  it('writes the complete follow-up without assuming the subscriber has an account', () => {
    const m = getNewsletterMessage('followup', unsubscribeUrl);
    expect(m.subject).toContain('3-day');
    expect(m.text).toContain('permission');
    expect(m.text).toContain('review');
    expect(m.text).toContain('connected Facebook Page');
    expect(m.text).not.toContain('You have already');
  });
  it('provides 26 distinct evergreen issues with valid plain text and HTML', () => {
    expect(NEWSLETTER_WEEKLY_ISSUES).toHaveLength(26);
    expect(new Set(NEWSLETTER_WEEKLY_ISSUES.map(i => i.subject)).size).toBe(26);
    for (let i = 0; i < 26; i++) {
      const m = getNewsletterMessage('weekly', unsubscribeUrl, i);
      expect(m.subject).toBe(NEWSLETTER_WEEKLY_ISSUES[i].subject);
      expect(m.html).toContain('Unsubscribe from the newsletter');
      expect(m.text).toContain(unsubscribeUrl);
      expect(m.text).not.toMatch(/\[your|\{\{.*?\}\}|tradies|contractors/i);
    }
    expect(getNewsletterMessage('weekly', unsubscribeUrl, 26).subject).toBe(NEWSLETTER_WEEKLY_ISSUES[0].subject);
  });
  it('escapes query strings inside the HTML unsubscribe link', () => {
    expect(getNewsletterMessage('welcome', unsubscribeUrl + '&source=email').html).toContain('&amp;source=email');
  });
  it('rejects non-SnapPost Pro unsubscribe URLs', () => {
    expect(() => getNewsletterMessage('welcome', 'https://other.example/unsubscribe')).toThrow();
    expect(() => getNewsletterMessage('welcome', 'http://snappostpro.com/api/newsletter/unsubscribe')).toThrow();
  });
});

describe('newsletter sender', () => {
  const input = { email: 'local-business@example.com', unsubscribeUrl, kind: 'welcome' as const, idempotencyKey: 'newsletter-1-welcome' };
  it('sends complete copy and one-click unsubscribe headers with stable idempotency', async () => {
    send.mockResolvedValue({ data: { id: 'accepted-123' }, error: null });
    const { sendNewsletterMessage } = await import('./email');
    await expect(sendNewsletterMessage(input)).resolves.toEqual({ id: 'accepted-123' });
    const [payload, options] = send.mock.calls[0];
    expect(payload.from).toBe('SnapPost Pro <noreply@snappostpro.com>');
    expect(payload.text).toContain('local businesses');
    expect(payload.headers).toEqual({ 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' });
    expect(options.idempotencyKey).toBe(input.idempotencyKey);
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
  it('does not treat a resolved API error as a sent email', async () => {
    send.mockResolvedValue({ data: null, error: { statusCode: 403, name: 'validation_error', message: 'No permission' } });
    const { sendNewsletterMessage } = await import('./email');
    await expect(sendNewsletterMessage(input)).rejects.toMatchObject({ ambiguous: false, permanent: true });
  });
  it('treats SDK network-error objects as unknown acceptance', async () => {
    send.mockResolvedValue({ data: null, error: { statusCode: null, name: 'application_error' } });
    const { sendNewsletterMessage } = await import('./email');
    await expect(sendNewsletterMessage(input)).rejects.toMatchObject({ ambiguous: true });
  });
  it('marks network throws and server errors ambiguous', async () => {
    const { sendNewsletterMessage } = await import('./email');
    send.mockRejectedValueOnce(new Error('Network timeout'));
    await expect(sendNewsletterMessage(input)).rejects.toMatchObject({ ambiguous: true });
    send.mockResolvedValue({ data: null, error: { statusCode: 500, name: 'application_error' } });
    await expect(sendNewsletterMessage(input)).rejects.toMatchObject({ ambiguous: true });
  });
  it('allows retrying explicit rate-limit failures', async () => {
    send.mockResolvedValue({ data: null, error: { statusCode: 429, name: 'rate_limit_exceeded' } });
    const { sendNewsletterMessage } = await import('./email');
    await expect(sendNewsletterMessage(input)).rejects.toMatchObject({ ambiguous: false, permanent: false });
  });
});
