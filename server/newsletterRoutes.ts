import type { Express, Request, Response } from 'express';
import {
  getNewsletterAutomationHealth,
  isValidNewsletterUnsubscribeToken,
  unsubscribeNewsletterByToken,
  unsubscribeNewsletterByEmail,
} from './newsletterAutomation';
import { isValidNewsletterUnsubscribeRequest } from './newsletter';

function requestLink(req: Request): { token: string; email?: string } | null {
  const token = typeof req.body?.token === 'string' ? req.body.token : typeof req.query.token === 'string' ? req.query.token : '';
  const email = typeof req.body?.email === 'string' ? req.body.email : typeof req.query.email === 'string' ? req.query.email : undefined;
  return /^[A-Za-z0-9_-]{32,128}$/.test(token) ? { token, ...(email ? { email } : {}) } : null;
}
function setNoStore(res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
}
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
function page(title: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | SnapPost Pro</title></head><body style="font-family:Arial,sans-serif;max-width:560px;margin:48px auto;padding:0 20px;color:#172033">${body}</body></html>`;
}
async function validLink(link: { token: string; email?: string }) {
  // Preserve the signed email+token URLs used by invitations already deployed.
  if (link.email) return isValidNewsletterUnsubscribeRequest(link.email, link.token);
  return isValidNewsletterUnsubscribeToken(link.token);
}
export function registerNewsletterRoutes(app: Express) {
  app.get('/api/newsletter/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(getNewsletterAutomationHealth());
  });
  // Both current opaque URLs and earlier signed invitation URLs remain valid.
  // GET never changes status: mail-scanner visits only see the confirmation.
  app.get('/api/newsletter/unsubscribe', async (req, res) => {
    setNoStore(res);
    const link = requestLink(req);
    if (!link) { res.status(400).type('text/plain').send('Invalid unsubscribe request.'); return; }
    try {
      if (!(await validLink(link))) { res.status(404).type('text/plain').send('Unsubscribe link not found.'); return; }
      const hiddenEmail = link.email ? `<input type="hidden" name="email" value="${escapeHtml(link.email)}">` : '';
      res.type('html').send(page('Unsubscribe', `<h1>Unsubscribe from SnapPost Pro newsletter emails?</h1><p>Confirm to stop newsletter emails. This does not cancel your account or billing emails.</p><form method="post" action="/api/newsletter/unsubscribe"><input type="hidden" name="token" value="${escapeHtml(link.token)}">${hiddenEmail}<button type="submit">Confirm unsubscribe</button></form>`));
    } catch { res.status(503).type('text/plain').send('Unsubscribe service unavailable.'); }
  });
  app.post('/api/newsletter/unsubscribe', async (req, res) => {
    setNoStore(res);
    const link = requestLink(req);
    if (!link) { res.status(400).type('text/plain').send('Invalid unsubscribe request.'); return; }
    try {
      if (link.email) {
        if (!(await validLink(link))) { res.status(404).type('text/plain').send('Unsubscribe link not found.'); return; }
        await unsubscribeNewsletterByEmail(link.email);
      } else if (!(await unsubscribeNewsletterByToken(link.token))) {
        res.status(404).type('text/plain').send('Unsubscribe link not found.'); return;
      }
      if (req.body?.['List-Unsubscribe'] === 'One-Click') { res.status(200).end(); return; }
      res.status(200).type('html').send(page('Unsubscribed', '<h1>You are unsubscribed</h1><p>You will no longer receive SnapPost Pro newsletter emails.</p>'));
    } catch { res.status(503).type('text/plain').send('Unsubscribe service unavailable.'); }
  });
}
