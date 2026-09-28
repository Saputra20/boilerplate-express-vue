import {
  renderEmailVerification,
  renderPasswordChanged,
  renderPasswordReset,
} from '../src/modules/notification/email/templates.js';

describe('transactional email templates', () => {
  it('renders verification HTML and text with one shared action URL and expiry', () => {
    const actionUrl = 'https://cms.example.test/verify?token=synthetic&source=email';
    const message = renderEmailVerification({
      actionUrl,
      expiryDisplay: 'the approved verification period',
    });

    expect(message.subject).toBe('Verify your email address');
    expect(message.previewText).toContain('Verify your email address');
    expect(message.html).toContain('CMS');
    expect(
      message.html.split('https://cms.example.test/verify?token=synthetic&amp;source=email')
        .length - 1,
    ).toBe(3);
    expect(message.html).toContain('the approved verification period');
    expect(message.text).toContain(actionUrl);
    expect(message.text).toContain('the approved verification period');
    expect(message.html).toContain('If you did not request this email');
  });

  it('renders password reset with the same fallback destination', () => {
    const actionUrl = 'https://cms.example.test/password/reset?token=synthetic';
    const message = renderPasswordReset({
      actionUrl,
      expiryDisplay: 'the approved reset period',
    });

    expect(message.subject).toBe('Reset your password');
    expect(message.html.split(actionUrl).length - 1).toBe(3);
    expect(message.text).toContain(actionUrl);
    expect(message.html).toContain('If you did not request a password reset');
  });

  it('keeps long links wrap-safe and escapes caller-provided expiry wording', () => {
    const actionUrl = `https://cms.example.test/${'x'.repeat(1900)}`;
    const message = renderEmailVerification({
      actionUrl,
      expiryDisplay: '<strong>approved wording</strong>',
    });

    expect(message.html).toContain('overflow-wrap:anywhere;word-break:break-word;');
    expect(message.html).toContain('@media only screen and (max-width: 620px)');
    expect(message.html).toContain('&lt;strong&gt;approved wording&lt;/strong&gt;');
    expect(message.text).toContain('<strong>approved wording</strong>');
    expect(message.text).toContain(actionUrl);
  });

  it('escapes untrusted display values and rejects unsafe URLs', () => {
    const message = renderPasswordChanged({
      changedAt: '<script>alert(1)</script>',
      device: 'Browser & device',
      location: 'Jakarta <office>',
    });

    expect(message.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(message.html).toContain('Browser &amp; device');
    expect(message.html).toContain('Jakarta &lt;office&gt;');
    expect(message.text).toContain('<script>alert(1)</script>');

    const sensitiveUrl = 'javascript:private-reset-token';
    expect(() =>
      renderEmailVerification({ actionUrl: sensitiveUrl, expiryDisplay: 'one day' }),
    ).toThrow('Invalid email template input');
    expect(() =>
      renderEmailVerification({
        actionUrl: 'http://cms.example.test/verify',
        expiryDisplay: 'one day',
      }),
    ).toThrow();
    try {
      renderEmailVerification({ actionUrl: sensitiveUrl, expiryDisplay: 'one day' });
    } catch (error) {
      expect(error).not.toHaveProperty('issues');
      expect(error instanceof Error ? error.message : '').not.toContain(sensitiveUrl);
    }
  });

  it('permits only explicit loopback HTTP action URLs in development/test mode', () => {
    const localUrls = [
      'http://localhost:5173/verify-email?token=test',
      'http://127.0.0.1:5173/reset-password?token=test',
      'http://[::1]:5173/verify-email?token=test',
    ];
    for (const actionUrl of localUrls) {
      expect(() =>
        renderEmailVerification(
          { actionUrl, expiryDisplay: '24 hours' },
          { allowLoopbackHttp: true },
        ),
      ).not.toThrow();
    }

    expect(() =>
      renderEmailVerification(
        { actionUrl: 'https://example.test/verify-email?token=test', expiryDisplay: '24 hours' },
        { allowLoopbackHttp: true },
      ),
    ).not.toThrow();
    for (const actionUrl of [
      'http://example.com/verify-email?token=test',
      'http://192.168.1.10:5173/verify-email?token=test',
      'http://10.0.0.5/verify-email?token=test',
      'http://user:pass@localhost:5173/verify-email',
      'not a url',
    ]) {
      expect(() =>
        renderEmailVerification(
          { actionUrl, expiryDisplay: '24 hours' },
          { allowLoopbackHttp: true },
        ),
      ).toThrow('Invalid email template input');
    }
  });

  it('keeps loopback HTTP disabled by default for production rendering', () => {
    expect(() =>
      renderEmailVerification({
        actionUrl: 'http://localhost:5173/verify-email?token=test',
        expiryDisplay: '24 hours',
      }),
    ).toThrow('Invalid email template input');
  });

  it('omits absent optional password-change details and support link', () => {
    const message = renderPasswordChanged({});

    expect(message.subject).toBe('Your password has changed');
    expect(message.html).not.toContain('Changed on');
    expect(message.html).not.toContain('Device');
    expect(message.html).not.toContain('Location');
    expect(message.html).not.toContain('Contact support');
    expect(message.text).not.toContain('Changed on');
  });

  it('renders a configured support link only as a validated secure URL', () => {
    const message = renderPasswordChanged({
      supportUrl: 'https://support.example.test/contact?from=cms&topic=security',
    });

    expect(message.html).toContain('Contact support');
    expect(message.html).toContain(
      'https://support.example.test/contact?from=cms&amp;topic=security',
    );
    expect(message.text).toContain('https://support.example.test/contact?from=cms&topic=security');
  });
});
