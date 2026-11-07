import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { parseEnvironment } from '../src/config/env.js';
import { createApp } from '../src/app.js';
import { buildVerificationEmailContent } from '../src/templates/verification-email.template.js';
import { errorContext } from '../src/config/logger.js';

describe('Notify service unit and template checks', () => {
  it('responds with 200 on /health', async () => {
    const app = createApp();
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', service: 'notify' });
  });

  it('renders email content and sanitizes malicious input', () => {
    const { html, text } = buildVerificationEmailContent({
      name: 'Chef <script>alert(1)</script>',
      code: '849201',
    });
    expect(html).toContain('849201');
    expect(html).toContain('OrderFirst');
    expect(html).not.toContain('<script>');
    expect(html).toContain('Chef &lt;script&gt;alert(1)&lt;/script&gt;');
    expect(text).toContain('849201');
    expect(text).toContain('Chef <script>alert(1)</script>');
  });

  it('redacts sensitive information in error context', () => {
    const err = new Error('SMTP connection failed with passwordHash: secret');
    const ctx = errorContext(err);
    const serialized = JSON.stringify(ctx);
    expect(serialized).not.toContain('secret');
  });

  it('gracefully handles empty-string environment variables without failing validation', () => {
    const parsed = parseEnvironment({
      EMAIL_USER: '',
      EMAIL_APP_PASSWORD: '',
      RABBITMQ_URL: '',
    });
    expect(parsed.EMAIL_USER).toBeUndefined();
    expect(parsed.EMAIL_APP_PASSWORD).toBeUndefined();
    expect(parsed.RABBITMQ_URL).toBe('amqp://guest:guest@localhost:5672');
  });
});

