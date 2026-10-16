import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

const checks = vi.hoisted(() => ({ validate: vi.fn(), unsubscribe: vi.fn(), unsubscribeEmail: vi.fn() }));
vi.mock('./newsletterAutomation', () => ({
  getNewsletterAutomationHealth: () => ({ version: 'newsletter-v1', ready: true, enabled: false }),
  isValidNewsletterUnsubscribeToken: checks.validate,
  unsubscribeNewsletterByToken: checks.unsubscribe,
  unsubscribeNewsletterByEmail: checks.unsubscribeEmail,
}));
let server: Server;
let origin: string;
const token = 'test-opaque-token-012345678901234567890123456789';

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const { registerNewsletterRoutes } = await import('./newsletterRoutes');
  registerNewsletterRoutes(app);
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
beforeEach(() => {
  checks.validate.mockReset(); checks.unsubscribe.mockReset();
  checks.unsubscribeEmail.mockReset();
  checks.unsubscribeEmail.mockResolvedValue(undefined);
  process.env.AUTH_SESSION_SECRET = 'local-offline-unsubscribe-test-secret';
  checks.validate.mockResolvedValue(true); checks.unsubscribe.mockResolvedValue(true);
});
afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve())); });

describe('newsletter unsubscribe HTTP routes', () => {
  it('shows a confirmation without changing status on scanner GET requests', async () => {
    const res = await fetch(`${origin}/api/newsletter/unsubscribe?token=${token}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    expect(await res.text()).toContain('Confirm unsubscribe');
    expect(checks.unsubscribe).not.toHaveBeenCalled();
  });
  it('processes RFC8058 one-click POST with a blank 200 response', async () => {
    const res = await fetch(`${origin}/api/newsletter/unsubscribe?token=${token}`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click',
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('');
    expect(checks.unsubscribe).toHaveBeenCalledWith(token);
  });
  it('shows success after a manual confirmation POST', async () => {
    const res = await fetch(`${origin}/api/newsletter/unsubscribe`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token }).toString(),
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('You are unsubscribed');
  });
  it('rejects missing/unknown tokens without exposing recipient information', async () => {
    expect((await fetch(`${origin}/api/newsletter/unsubscribe`)).status).toBe(400);
    checks.validate.mockResolvedValue(false);
    const res = await fetch(`${origin}/api/newsletter/unsubscribe?token=${token}`);
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain(token);
  });
  it('does not claim unsubscribe succeeded when persistence is unavailable', async () => {
    checks.unsubscribe.mockRejectedValue(new Error('database unavailable'));
    const res = await fetch(`${origin}/api/newsletter/unsubscribe?token=${token}`, { method: 'POST' });
    expect(res.status).toBe(503);
  });
  it('exposes only non-personal readiness metadata', async () => {
    const res = await fetch(`${origin}/api/newsletter/health`);
    expect(await res.json()).toEqual({ version: 'newsletter-v1', ready: true, enabled: false });
  });
  it('preserves previously deployed signed invitation links without scanner-triggered unsubscribes', async () => {
    const { getNewsletterUnsubscribeUrl } = await import('./newsletter');
    const link = new URL(getNewsletterUnsubscribeUrl('invited@example.test'));
    const res = await fetch(`${origin}${link.pathname}${link.search}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('Confirm unsubscribe');
    expect(checks.unsubscribeEmail).not.toHaveBeenCalled();
    const confirmed = await fetch(`${origin}${link.pathname}${link.search}`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click',
    });
    expect(confirmed.status).toBe(200);
    expect(await confirmed.text()).toBe('');
    expect(checks.unsubscribeEmail).toHaveBeenCalledWith('invited@example.test');
  });
  it('rejects a signed invitation token paired with the wrong email', async () => {
    const { getNewsletterUnsubscribeUrl } = await import('./newsletter');
    const link = new URL(getNewsletterUnsubscribeUrl('invited@example.test'));
    link.searchParams.set('email', 'different@example.test');
    const res = await fetch(`${origin}${link.pathname}${link.search}`, { method: 'POST' });
    expect(res.status).toBe(404);
    expect(checks.unsubscribeEmail).not.toHaveBeenCalled();
  });
});
