import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  renderEmailVerification,
  renderPasswordChanged,
  renderPasswordReset,
} from '../src/modules/notification/email/templates.js';

if (process.env.NODE_ENV !== 'development') {
  throw new Error('Email template preview is available only with NODE_ENV=development');
}

const outputDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../tasks/be/32-email-template-foundation/artifacts',
);
const syntheticQuery = `token=synthetic-preview-value&context=${'preview-only-'.repeat(24)}`;
const templates = {
  'verify-email': renderEmailVerification({
    actionUrl: `https://cms.example.test/verify?${syntheticQuery}`,
    expiryDisplay: 'a synthetic review interval (not a real expiry)',
  }),
  'reset-password': renderPasswordReset({
    actionUrl: `https://cms.example.test/password/reset?${syntheticQuery}`,
    expiryDisplay: 'a synthetic review interval (not a real expiry)',
  }),
  'password-changed': renderPasswordChanged({
    changedAt: 'Synthetic preview timestamp: Monday, January 1, 2035 at 12:00 UTC.',
    device:
      'Synthetic preview device with deliberately long descriptive content for wrapping review.',
    location: 'Synthetic preview location used only to inspect long content wrapping.',
    supportUrl: 'https://cms.example.test/support?source=synthetic-preview',
  }),
};

await mkdir(outputDirectory, { recursive: true });
await Promise.all(
  Object.entries(templates).map(async ([name, template]) => {
    await Promise.all([
      writeFile(
        join(outputDirectory, `${name}.html`),
        template.html.replace(/[ \t]+$/gm, ''),
        'utf8',
      ),
      writeFile(
        join(outputDirectory, `${name}.txt`),
        `Subject: ${template.subject}\nPreview: ${template.previewText}\n\n${template.text}\n`,
        'utf8',
      ),
    ]);
  }),
);

process.stdout.write(`Email template previews written to ${outputDirectory}\n`);
