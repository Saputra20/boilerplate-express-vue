import type { SendMailOptions } from 'nodemailer';
import { createSmtpEmailTransport, EmailDeliveryError } from '../src/config/email/transport.js';
import type { SmtpEmailConfig } from '../src/config/email/config.js';

const smtpConfig: SmtpEmailConfig = {
  enabled: true,
  host: 'smtp.example.test',
  port: 587,
  secure: false,
  username: 'mailer',
  password: 'private-smtp-password',
  fromEmail: 'no-reply@example.test',
  fromName: 'Example CMS',
};

const message = {
  to: 'recipient@example.test',
  subject: 'Verify your email',
  html: '<p>Verification message</p>',
  text: 'Verification message',
};

function createFakeMailer(send: (message: SendMailOptions) => Promise<unknown> = async () => ({})) {
  const sent: SendMailOptions[] = [];
  let closeCount = 0;

  return {
    sent,
    get closeCount() {
      return closeCount;
    },
    async sendMail(mail: SendMailOptions) {
      sent.push(mail);
      return send(mail);
    },
    close() {
      closeCount += 1;
    },
  };
}

describe('SMTP email transport', () => {
  it('uses the configured sender and sends through the injected test transport', async () => {
    const mailer = createFakeMailer();
    const options: unknown[] = [];
    const transport = createSmtpEmailTransport(smtpConfig, (transportOptions) => {
      options.push(transportOptions);
      return mailer;
    });

    await transport.send(message);

    expect(options).toEqual([
      {
        host: 'smtp.example.test',
        port: 587,
        secure: false,
        requireTLS: true,
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000,
        auth: { user: 'mailer', pass: 'private-smtp-password' },
      },
    ]);
    expect(mailer.sent).toEqual([
      {
        from: { name: 'Example CMS', address: 'no-reply@example.test' },
        ...message,
      },
    ]);
    expect(mailer.closeCount).toBe(0);
  });

  it('does not send or connect when the transport is constructed', () => {
    const mailer = createFakeMailer();

    createSmtpEmailTransport(smtpConfig, () => mailer);

    expect(mailer.sent).toEqual([]);
  });

  it('normalizes transient network and SMTP 4xx failures as retryable', async () => {
    const mailer = createFakeMailer(async () => {
      throw Object.assign(new Error('provider internals'), { responseCode: 451 });
    });
    const transport = createSmtpEmailTransport(smtpConfig, () => mailer);

    await expect(transport.send(message)).rejects.toMatchObject({
      name: 'EmailDeliveryError',
      kind: 'retryable',
      message: 'Email delivery failed',
    });

    const networkMailer = createFakeMailer(async () => {
      throw Object.assign(new Error('private network detail'), { code: 'ETIMEDOUT' });
    });
    await expect(
      createSmtpEmailTransport(smtpConfig, () => networkMailer).send(message),
    ).rejects.toMatchObject({
      kind: 'retryable',
      message: 'Email delivery failed',
    });
  });

  it('normalizes SMTP 5xx failures as permanent', async () => {
    const mailer = createFakeMailer(async () => {
      throw Object.assign(new Error('private provider detail'), { responseCode: 550 });
    });

    await expect(
      createSmtpEmailTransport(smtpConfig, () => mailer).send(message),
    ).rejects.toMatchObject({
      kind: 'permanent',
      message: 'Email delivery failed',
    });
  });

  it('normalizes network failure during DATA as uncertain', async () => {
    const mailer = createFakeMailer(async () => {
      throw Object.assign(new Error('private provider detail'), {
        code: 'ECONNECTION',
        command: 'DATA',
      });
    });
    await expect(
      createSmtpEmailTransport(smtpConfig, () => mailer).send(message),
    ).rejects.toMatchObject({
      kind: 'uncertain',
      message: 'Email delivery failed',
    });
  });

  it('does not expose provider secrets in normalized failures', async () => {
    const secret = 'do-not-expose-provider-password-or-token';
    const mailer = createFakeMailer(async () => {
      throw new Error(secret);
    });
    const transport = createSmtpEmailTransport(smtpConfig, () => mailer);

    try {
      await transport.send({ ...message, html: `<p>${secret}</p>`, text: secret });
      throw new Error('Expected the SMTP operation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(EmailDeliveryError);
      expect(error).toMatchObject({ message: 'Email delivery failed' });
      expect(error instanceof Error ? error.stack : '').not.toContain(secret);
    }
  });

  it('closes SMTP resources once and rejects later sends safely', async () => {
    const mailer = createFakeMailer();
    const transport = createSmtpEmailTransport(smtpConfig, () => mailer);

    await transport.close();
    await transport.close();

    expect(mailer.closeCount).toBe(1);
    await expect(transport.send(message)).rejects.toMatchObject({ kind: 'permanent' });
  });
});
