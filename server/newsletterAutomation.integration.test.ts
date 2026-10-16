import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mysql, { type Pool } from 'mysql2/promise';

const sends = vi.hoisted(() => ({ send: vi.fn(), alert: vi.fn() }));
vi.mock('./email', async original => ({ ...await original<typeof import('./email')>(), sendNewsletterMessage: sends.send, sendCronErrorAlert: sends.alert }));
vi.mock('./newsletterContent', async original => ({ ...await original<typeof import('./newsletterContent')>(), NEWSLETTER_AUTOMATION_ENABLED: true }));

const enabled = process.env.NEWSLETTER_INTEGRATION_TEST === '1';
const dsn = process.env.DATABASE_URL;
if (enabled && (!dsn || new URL(dsn).hostname !== '127.0.0.1' || new URL(dsn).pathname !== '/newsletter_local_test')) {
  throw new Error('Integration tests require the explicit throwaway localhost newsletter database.');
}
let pool: Pool;
let automation: typeof import('./newsletterAutomation');
let seq = 0;
const tuesday = new Date('2026-10-19T20:00:00Z');

async function fixture(anchor: Date, legacy = false) {
  const email = `fixture-${++seq}@example.test`;
  let id: number;
  if (legacy) {
    const [r] = await pool.execute<mysql.ResultSetHeader>('INSERT INTO newsletterSubscribers(email,status,createdAt) VALUES(?,?,?)', [email, 'active', anchor]);
    id = r.insertId;
  } else {
    const r = await automation.createNewsletterSubscription(email);
    id = r.subscriberId!;
    await pool.execute('UPDATE newsletter_subscriber_state SET activationAnchor=? WHERE subscriberId=?', [anchor, id]);
    await pool.execute('UPDATE newsletter_delivery_ledger SET nextAttemptAt=? WHERE subscriberId=?', [anchor, id]);
  }
  return id;
}
async function rows(id: number) {
  const [r] = await pool.execute<mysql.RowDataPacket[]>('SELECT * FROM newsletter_delivery_ledger WHERE subscriberId=? ORDER BY id', [id]);
  return r;
}
async function token(id: number) {
  const [r] = await pool.execute<mysql.RowDataPacket[]>('SELECT unsubscribeToken FROM newsletter_subscriber_state WHERE subscriberId=?', [id]);
  return r[0].unsubscribeToken as string;
}
async function acceptedFollowup(id: number, at: Date) {
  await pool.execute("INSERT INTO newsletter_delivery_ledger(subscriberId,campaignKey,kind,status,sentAt,providerMessageId) VALUES(?,'followup:v1','followup','sent',?,'mock-followup')", [id, at]);
}

describe.runIf(enabled && Boolean(dsn))('newsletter local MySQL integration — all provider sends mocked', () => {
  beforeAll(async () => {
    process.env.NEWSLETTER_AUTOMATION_TEST_MODE = 'true';
    process.env.RESEND_API_KEY = 'fake-test-key-never-used';
    pool = mysql.createPool({ uri: dsn!, timezone: 'Z' });
    await pool.query("SET time_zone='+00:00'");
    // This DSN is explicitly validated above. Never run cleanup on production.
    await pool.query('DROP TABLE IF EXISTS newsletter_delivery_ledger');
    await pool.query('DROP TABLE IF EXISTS newsletter_subscriber_state');
    automation = await import('./newsletterAutomation');
    await automation.ensureNewsletterSchema();
    await automation.initializeNewsletterAutomation();
  });
  beforeEach(async () => {
    await pool.query('DELETE FROM newsletter_delivery_ledger');
    await pool.query('DELETE FROM newsletter_subscriber_state');
    await pool.query('DELETE FROM newsletterSubscribers');
    sends.send.mockReset(); sends.alert.mockReset();
    sends.send.mockImplementation(async () => ({ id: `mock-${Date.now()}` }));
    sends.alert.mockResolvedValue({ id: 'mock-alert' });
  });
  afterAll(async () => { await pool.end(); });

  it('normalizes signup, persists welcome atomically, preserves duplicates and never reactivates an unsubscribe', async () => {
    const first = await automation.createNewsletterSubscription('  LOCAL@Example.Test  ');
    expect(first.created).toBe(true);
    expect(await automation.createNewsletterSubscription('local@example.test')).toEqual({ created: false });
    const opaque = await token(first.subscriberId!);
    expect(opaque).toHaveLength(43);
    expect((await rows(first.subscriberId!))[0].status).toBe('pending');
    await automation.unsubscribeNewsletterByToken(opaque);
    expect((await rows(first.subscriberId!))[0].status).toBe('cancelled');
    expect(await automation.createNewsletterSubscription('LOCAL@example.test')).toEqual({ created: false });
    expect(await token(first.subscriberId!)).toBe(opaque);
  });

  it('never sends automated emails to reserved example.com test addresses', async () => {
    const at = new Date('2026-10-01T00:00:00Z');
    const result = await automation.createNewsletterSubscription('old-demo@example.com');
    await pool.execute('UPDATE newsletter_subscriber_state SET activationAnchor=? WHERE subscriberId=?', [at, result.subscriberId!]);
    await pool.execute('UPDATE newsletter_delivery_ledger SET nextAttemptAt=? WHERE subscriberId=?', [at, result.subscriberId!]);
    await automation.runNewsletterAutomation({ now: tuesday });
    expect(sends.send).not.toHaveBeenCalled();
  });

  it('sends one welcome and the follow-up only at or after exactly 72 hours', async () => {
    const signup = new Date('2026-10-10T00:00:00Z');
    const id = await fixture(signup);
    await automation.runNewsletterAutomation({ now: signup });
    expect(sends.send).toHaveBeenCalledTimes(1);
    expect(sends.send.mock.calls[0][0].kind).toBe('welcome');
    await automation.runNewsletterAutomation({ now: new Date(signup.getTime() + 72 * 3600000 - 1000) });
    expect(sends.send).toHaveBeenCalledTimes(1);
    await automation.runNewsletterAutomation({ now: new Date(signup.getTime() + 72 * 3600000) });
    expect(sends.send).toHaveBeenCalledTimes(2);
    expect(sends.send.mock.calls[1][0].kind).toBe('followup');
    await automation.runNewsletterAutomation({ now: new Date(signup.getTime() + 73 * 3600000) });
    expect(sends.send).toHaveBeenCalledTimes(2);
  });

  it('honours the unsent legacy follow-up without replaying a welcome', async () => {
    const id = await fixture(new Date('2026-10-01T00:00:00Z'), true);
    await automation.runNewsletterAutomation({ now: tuesday });
    expect(sends.send).toHaveBeenCalledTimes(1);
    expect(sends.send.mock.calls[0][0].kind).toBe('followup');
    expect((await rows(id)).map(r => r.kind)).toEqual(['followup']);
  });

  it('starts at issue zero, sends at most once per NZ calendar week, then advances to issue one', async () => {
    const id = await fixture(new Date('2026-09-01T00:00:00Z'), true);
    await automation.runNewsletterAutomation({ now: new Date('2026-10-01T00:00:00Z') });
    sends.send.mockClear();
    await automation.runNewsletterAutomation({ now: tuesday });
    expect(sends.send.mock.calls[0][0]).toMatchObject({ kind: 'weekly', issueIndex: 0 });
    await automation.runNewsletterAutomation({ now: new Date(tuesday.getTime() + 15 * 60000) });
    expect(sends.send).toHaveBeenCalledTimes(1);
    await automation.runNewsletterAutomation({ now: new Date(tuesday.getTime() + 7 * 86400000) });
    expect(sends.send.mock.calls[1][0]).toMatchObject({ kind: 'weekly', issueIndex: 1 });
    expect((await rows(id)).filter(r => r.kind === 'weekly')).toHaveLength(2);
  });

  it('does not begin weekly emails midweek if the follow-up was too recent on Tuesday', async () => {
    const id = await fixture(new Date('2026-10-01T00:00:00Z'), true);
    await automation.runNewsletterAutomation({ now: new Date('2026-10-16T21:00:00Z') });
    sends.send.mockClear();
    await automation.runNewsletterAutomation({ now: tuesday });
    await automation.runNewsletterAutomation({ now: new Date('2026-10-21T20:00:00Z') });
    expect(sends.send).not.toHaveBeenCalled();
    await automation.runNewsletterAutomation({ now: new Date(tuesday.getTime() + 7 * 86400000) });
    expect(sends.send).toHaveBeenCalledTimes(1);
    expect((await rows(id)).filter(r => r.kind === 'weekly')).toHaveLength(1);
  });

  it('keeps the original ambiguity window even after a newer known-rejection attempt', async () => {
    const { NewsletterSendError } = await import('./email');
    const at = new Date('2026-10-01T00:00:00Z');
    const id = await fixture(at);
    sends.send.mockRejectedValueOnce(new NewsletterSendError('unknown', true));
    await automation.runNewsletterAutomation({ now: at });
    sends.send.mockRejectedValueOnce(new NewsletterSendError('rate limit', false));
    await automation.runNewsletterAutomation({ now: new Date(at.getTime() + 20 * 3600000) });
    const before = sends.send.mock.calls.length;
    await automation.runNewsletterAutomation({ now: new Date(at.getTime() + 24 * 3600000) });
    expect(sends.send.mock.calls.length).toBe(before);
    expect((await rows(id))[0].status).toBe('uncertain');
    expect(sends.alert).toHaveBeenCalledTimes(1);
  });

  it('retries known failures with the same campaign key and records only accepted IDs', async () => {
    const { NewsletterSendError } = await import('./email');
    const at = new Date('2026-10-01T00:00:00Z');
    const id = await fixture(at);
    sends.send.mockRejectedValueOnce(new NewsletterSendError('rate limit', false));
    await automation.runNewsletterAutomation({ now: at });
    expect((await rows(id))[0].status).toBe('retry');
    await automation.runNewsletterAutomation({ now: new Date(at.getTime() + 15 * 60000) });
    expect(sends.send.mock.calls[1][0].idempotencyKey).toBe(sends.send.mock.calls[0][0].idempotencyKey);
    expect((await rows(id))[0]).toMatchObject({ status: 'sent', attempts: 2 });
  });

  it('cancels stale known-unaccepted weekly sends instead of stacking two issues in a new week', async () => {
    const id = await fixture(new Date('2026-09-01T00:00:00Z'), true);
    await automation.runNewsletterAutomation({ now: new Date('2026-10-01T00:00:00Z') });
    sends.send.mockClear();
    await pool.execute("INSERT INTO newsletter_delivery_ledger(subscriberId,campaignKey,kind,issueIndex,status,nextAttemptAt) VALUES(?,'weekly:v1:2026-10-12','weekly',0,'retry',?)", [id, tuesday]);
    await automation.runNewsletterAutomation({ now: tuesday });
    expect(sends.send).toHaveBeenCalledTimes(1);
    const weekly = (await rows(id)).filter(r => r.kind === 'weekly');
    expect(weekly.map(r => r.status)).toEqual(['cancelled', 'sent']);
  });

  it('blocks future weekly issues while a stale ambiguous weekly outcome is uncertain', async () => {
    const id = await fixture(new Date('2026-09-01T00:00:00Z'), true);
    await automation.runNewsletterAutomation({ now: new Date('2026-10-01T00:00:00Z') });
    sends.send.mockClear();
    await pool.execute("INSERT INTO newsletter_delivery_ledger(subscriberId,campaignKey,kind,issueIndex,status,firstAttemptAt,ambiguousSince,nextAttemptAt) VALUES(?,'weekly:v1:2026-10-12','weekly',0,'retry',?,?,?)", [id, new Date('2026-10-15T00:00:00Z'), new Date('2026-10-15T00:00:00Z'), tuesday]);
    await automation.runNewsletterAutomation({ now: tuesday });
    expect(sends.send).not.toHaveBeenCalled();
    expect((await rows(id)).filter(r => r.kind === 'weekly')[0].status).toBe('uncertain');
  });

  it('allows unsubscribe and signup during an in-flight dispatch, while preventing overlapping worker sends', async () => {
    const at = new Date('2026-10-01T00:00:00Z');
    const first = await fixture(at);
    const second = await fixture(at);
    let resolveSend!: (v: { id: string }) => void;
    let started!: () => void;
    const startedPromise = new Promise<void>(r => { started = r; });
    sends.send.mockImplementationOnce(() => { started(); return new Promise(r => { resolveSend = r; }); });
    const dispatch = automation.runNewsletterAutomation({ now: at });
    await startedPromise;
    expect(await automation.runNewsletterAutomation({ now: at })).toEqual({ ran: false, sent: 0 });
    await expect(automation.unsubscribeNewsletterByToken(await token(second))).resolves.toBe(true);
    await expect(automation.createNewsletterSubscription('parallel-signup@example.test')).resolves.toMatchObject({ created: true });
    resolveSend({ id: 'mock-first' });
    await dispatch;
    expect(sends.send).toHaveBeenCalledTimes(1);
    expect((await rows(first))[0].status).toBe('sent');
    expect((await rows(second))[0].status).toBe('cancelled');
  });
}, 20000);

// Calendar calculations are pure and do not open the local DB.
describe('Auckland weekly scheduling', () => {
  it('uses 09:00 NZDT in summer and 09:00 NZST in winter', async () => {
    const { getDueWeeklyCampaign } = await import('./newsletterAutomation');
    expect(getDueWeeklyCampaign(new Date('2026-10-19T19:59:59Z'))).toBeNull();
    expect(getDueWeeklyCampaign(new Date('2026-10-19T20:00:00Z'))?.scheduledAt.toISOString()).toBe('2026-10-19T20:00:00.000Z');
    expect(getDueWeeklyCampaign(new Date('2026-06-15T20:59:59Z'))).toBeNull();
    expect(getDueWeeklyCampaign(new Date('2026-06-15T21:00:00Z'))?.scheduledAt.toISOString()).toBe('2026-06-15T21:00:00.000Z');
  });
  it('uses a stable weekly key even after the issue count advances or wraps', async () => {
    const { getDueWeeklyCampaign } = await import('./newsletterAutomation');
    const first = getDueWeeklyCampaign(tuesday, 0)!;
    expect(first.issueIndex).toBe(0);
    expect(getDueWeeklyCampaign(tuesday, 1)?.campaignKey).toBe(first.campaignKey);
    expect(getDueWeeklyCampaign(tuesday, 26)?.issueIndex).toBe(0);
  });
});
