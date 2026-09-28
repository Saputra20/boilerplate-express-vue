import { z } from 'zod';

export type RenderedEmail = {
  subject: string;
  previewText: string;
  html: string;
  text: string;
};

export type ActionEmailInput = {
  actionUrl: string;
  expiryDisplay: string;
};

export type EmailRenderOptions = {
  allowLoopbackHttp?: boolean;
};

export type PasswordChangedEmailInput = {
  changedAt?: string;
  device?: string;
  location?: string;
  supportUrl?: string;
};

const identity = {
  name: 'CMS',
  label: 'Content workspace',
  mark: 'C',
};

const colors = {
  emailPrimary: '#465fff',
  emailPrimaryLight: '#ecf3ff',
  emailText: '#1d2939',
  emailMuted: '#667085',
  emailBorder: '#e4e7ec',
  emailBackground: '#f9fafb',
  emailSurface: '#ffffff',
  darkBackground: '#101828',
  darkSurface: '#141c2b',
  darkText: '#f2f4f7',
  darkMuted: '#98a2b3',
  darkBorder: '#1d2939',
};

function actionUrlSchema(allowLoopbackHttp: boolean) {
  return z
    .string()
    .url()
    .max(2048)
    .refine((value) => {
      try {
        const url = new URL(value);
        const localHttp =
          allowLoopbackHttp &&
          url.protocol === 'http:' &&
          ['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname);
        return (url.protocol === 'https:' || localHttp) && !url.username && !url.password;
      } catch {
        return false;
      }
    }, 'Expected HTTPS, or loopback HTTP in development/test, without embedded credentials');
}

const secureUrl = z
  .string()
  .url()
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password;
    } catch {
      return false;
    }
  }, 'Expected an absolute HTTPS URL without embedded credentials');

const displayText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine(
      (value) =>
        !Array.from(value).some((character) => {
          const code = character.charCodeAt(0);
          return code <= 31 || code === 127;
        }),
    );

const expiryDisplay = displayText(160);
const detailText = displayText(240);

const passwordChangedInput = z
  .object({
    changedAt: detailText.optional(),
    device: detailText.optional(),
    location: detailText.optional(),
    supportUrl: secureUrl.optional(),
  })
  .strict();

type EmailKind = 'verification' | 'password-reset' | 'password-changed';

type LayoutInput = {
  kind: EmailKind;
  label: string;
  heading: string;
  previewText: string;
  summary: string;
  action?: { label: string; url: string };
  expiry?: string;
  notice: string;
  details?: Array<{ label: string; value: string }>;
  supportUrl?: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

function detailRows(details: LayoutInput['details']): string {
  return (details ?? [])
    .map(
      ({ label, value }) => `
        <tr>
          <td class="email-muted" style="padding:8px 12px 8px 0;color:${colors.emailMuted};font-family:Outfit,Arial,Helvetica,sans-serif;font-size:13px;vertical-align:top;">
            ${escapeHtml(label)}
          </td>
          <td class="email-body" style="padding:8px 0;color:${colors.emailText};font-family:Outfit,Arial,Helvetica,sans-serif;font-size:13px;vertical-align:top;word-break:break-word;">
            ${escapeHtml(value)}
          </td>
        </tr>`,
    )
    .join('');
}

function renderLayout(input: LayoutInput): RenderedEmail {
  const actionUrl = input.action ? escapeHtml(input.action.url) : undefined;
  const actionHtml =
    input.action && actionUrl
      ? `
      <tr>
        <td align="center" style="padding:8px 0 20px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td align="center" bgcolor="${colors.emailPrimary}" style="border-radius:8px;">
                <a href="${actionUrl}" style="display:inline-block;min-height:44px;box-sizing:border-box;padding:14px 28px;border-radius:8px;background-color:${colors.emailPrimary};color:#ffffff;font-family:Outfit,Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;line-height:20px;text-align:center;text-decoration:none;">
                  ${escapeHtml(input.action.label)}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 0 18px;color:${colors.emailMuted};font-family:Outfit,Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;text-align:center;">
          If the button does not work, copy this link into your browser:<br />
          <a href="${actionUrl}" style="color:${colors.emailPrimary};overflow-wrap:anywhere;word-break:break-word;">${actionUrl}</a>
        </td>
      </tr>`
      : '';
  const expiryHtml = input.expiry
    ? `<tr><td style="padding:0 0 16px;color:${colors.emailMuted};font-family:Outfit,Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;text-align:center;">This link expires in ${escapeHtml(input.expiry)}.</td></tr>`
    : '';
  const detailsHtml = input.details?.length
    ? `<tr><td class="email-info email-border" style="padding:16px 20px;background-color:${colors.emailBackground};border:1px solid ${colors.emailBorder};border-radius:8px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${detailRows(input.details)}</table>
      </td></tr>`
    : '';
  const supportHtml = input.supportUrl
    ? `<tr><td align="center" style="padding:12px 0 0;font-family:Outfit,Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;"><a href="${escapeHtml(input.supportUrl)}" style="color:${colors.emailPrimary};font-weight:600;">Contact support</a></td></tr>`
    : '';
  const plainAction = input.action
    ? `\n${input.action.label}:\n${input.action.url}\n\nIf the button does not work, copy and paste the link above into your browser.\n\nThis link expires in ${input.expiry}.\n`
    : '';
  const plainDetails = (input.details ?? [])
    .map(({ label, value }) => `${label}: ${value}`)
    .join('\n');
  const text = [
    input.heading,
    '',
    input.summary,
    plainAction.trimEnd(),
    plainDetails,
    '',
    input.notice,
    input.supportUrl ? `\nContact support: ${input.supportUrl}` : '',
    '',
    identity.name,
    identity.label,
  ]
    .filter(Boolean)
    .join('\n');

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${escapeHtml(input.heading)}</title>
    <style>
      @media only screen and (max-width: 620px) {
        .email-outer { padding: 12px !important; }
        .email-content { padding: 28px 20px !important; }
        .email-footer { padding: 16px 20px !important; }
        .email-mark { width: 40px !important; height: 40px !important; }
      }
      @media (prefers-color-scheme: dark) {
        .email-page { background-color: ${colors.darkBackground} !important; }
        .email-card, .email-footer { background-color: ${colors.darkSurface} !important; }
        .email-title, .email-body, .email-brand { color: ${colors.darkText} !important; }
        .email-muted { color: ${colors.darkMuted} !important; }
        .email-border { border-color: ${colors.darkBorder} !important; }
        .email-info { background-color: ${colors.darkBackground} !important; }
      }
    </style>
  </head>
  <body class="email-page" style="margin:0;padding:0;background-color:${colors.emailBackground};">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${escapeHtml(input.previewText)}</span>
    <table role="presentation" class="email-page" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${colors.emailBackground}" style="width:100%;background-color:${colors.emailBackground};">
      <tr>
        <td class="email-outer" align="center" style="padding:32px 16px;">
          <table role="presentation" class="email-card email-border" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;border:1px solid ${colors.emailBorder};border-radius:12px;background-color:${colors.emailSurface};overflow:hidden;">
            <tr>
              <td class="email-footer email-border" style="padding:20px 28px;border-bottom:1px solid ${colors.emailBorder};background-color:${colors.emailSurface};">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td width="44" valign="middle">
                      <span class="email-mark" style="display:inline-block;width:44px;height:44px;border-radius:10px;background-color:${colors.emailPrimary};color:#ffffff;font-family:Outfit,Arial,Helvetica,sans-serif;font-size:21px;font-weight:700;line-height:44px;text-align:center;">${identity.mark}</span>
                    </td>
                    <td valign="middle" style="padding-left:12px;">
                      <strong class="email-brand" style="display:block;color:${colors.emailText};font-family:Outfit,Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;">${identity.name}</strong>
                      <span class="email-muted" style="display:block;color:${colors.emailMuted};font-family:Outfit,Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;">${identity.label}</span>
                    </td>
                    <td align="right" valign="middle" class="email-muted" style="color:${colors.emailMuted};font-family:Outfit,Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;">${escapeHtml(input.label)}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-content" style="padding:36px 48px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" style="padding:0 0 12px;">
                      <span aria-hidden="true" style="display:inline-block;width:64px;height:64px;border-radius:50%;background-color:${colors.emailPrimaryLight};color:${colors.emailPrimary};font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:600;line-height:64px;text-align:center;">${input.kind === 'verification' ? '&#9993;' : input.kind === 'password-reset' ? '&#8635;' : '&#10003;'}</span>
                    </td>
                  </tr>
                  <tr><td style="padding:0 0 10px;"><h1 class="email-title" style="margin:0;color:${colors.emailText};font-family:Outfit,Arial,Helvetica,sans-serif;font-size:24px;font-weight:600;line-height:32px;text-align:center;">${escapeHtml(input.heading)}</h1></td></tr>
                  <tr><td class="email-body" style="padding:0 0 22px;color:${colors.emailMuted};font-family:Outfit,Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;text-align:center;"><p style="margin:0;">${escapeHtml(input.summary)}</p></td></tr>
                  ${actionHtml}
                  ${expiryHtml}
                  ${detailsHtml}
                  <tr><td class="email-muted" style="padding:18px 0 0;color:${colors.emailMuted};font-family:Outfit,Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;text-align:center;"><p style="margin:0;">${escapeHtml(input.notice)}</p></td></tr>
                  ${supportHtml}
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-footer email-border" style="padding:18px 28px;border-top:1px solid ${colors.emailBorder};background-color:${colors.emailBackground};">
                <strong class="email-brand" style="display:block;color:${colors.emailText};font-family:Outfit,Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;">${identity.name}</strong>
                <span class="email-muted" style="display:block;color:${colors.emailMuted};font-family:Outfit,Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;">${identity.label}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: input.heading, previewText: input.previewText, html, text };
}

function parseTemplateInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error('Invalid email template input');
  return parsed.data;
}

export function renderEmailVerification(
  input: ActionEmailInput,
  options: EmailRenderOptions = {},
): RenderedEmail {
  const data = parseTemplateInput(
    z
      .object({ actionUrl: actionUrlSchema(options.allowLoopbackHttp ?? false), expiryDisplay })
      .strict(),
    input,
  );
  return renderLayout({
    kind: 'verification',
    label: 'Email verification',
    heading: 'Verify your email address',
    previewText: 'Verify your email address to continue.',
    summary: 'Use the secure link below to verify your email address.',
    action: { label: 'Verify email address', url: data.actionUrl },
    expiry: data.expiryDisplay,
    notice: 'If you did not request this email, you can ignore it.',
  });
}

export function renderPasswordReset(
  input: ActionEmailInput,
  options: EmailRenderOptions = {},
): RenderedEmail {
  const data = parseTemplateInput(
    z
      .object({ actionUrl: actionUrlSchema(options.allowLoopbackHttp ?? false), expiryDisplay })
      .strict(),
    input,
  );
  return renderLayout({
    kind: 'password-reset',
    label: 'Password reset',
    heading: 'Reset your password',
    previewText: 'Use this secure link to reset your password.',
    summary: 'We received a request to reset your account password.',
    action: { label: 'Reset password', url: data.actionUrl },
    expiry: data.expiryDisplay,
    notice: 'If you did not request a password reset, you can ignore this email.',
  });
}

export function renderPasswordChanged(input: PasswordChangedEmailInput): RenderedEmail {
  const data = parseTemplateInput(passwordChangedInput, input);
  const details = [
    data.changedAt ? { label: 'Changed on', value: data.changedAt } : undefined,
    data.device ? { label: 'Device', value: data.device } : undefined,
    data.location ? { label: 'Location', value: data.location } : undefined,
  ].filter((detail): detail is { label: string; value: string } => detail !== undefined);

  return renderLayout({
    kind: 'password-changed',
    label: 'Password changed',
    heading: 'Your password has changed',
    previewText: 'Your account password was changed.',
    summary: 'Your account password was changed successfully.',
    notice: 'If you did not make this change, take steps to secure your account.',
    details,
    supportUrl: data.supportUrl,
  });
}
