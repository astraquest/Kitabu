import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env');
const requiredKeys = [
  'KITABU_MPESA_ENV',
  'KITABU_MPESA_CONSUMER_KEY',
  'KITABU_MPESA_CONSUMER_SECRET',
  'KITABU_MPESA_SHORTCODE',
  'KITABU_MPESA_PASSKEY',
  'KITABU_MPESA_CALLBACK_URL',
];

function parseEnvFile(path) {
  if (!existsSync(path)) {
    return {};
  }

  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .reduce((values, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return values;
      }

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) {
        return values;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      values[key] = rawValue.replace(/^['"]|['"]$/g, '');
      return values;
    }, {});
}

const env = {
  ...parseEnvFile(envPath),
  ...process.env,
};
const missing = requiredKeys.filter(key => !env[key]?.trim());

if (missing.length > 0) {
  console.error(`M-Pesa config missing: ${missing.join(', ')}`);
  process.exit(1);
}

const baseUrl =
  env.KITABU_MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
const credentials = Buffer.from(
  `${env.KITABU_MPESA_CONSUMER_KEY}:${env.KITABU_MPESA_CONSUMER_SECRET}`,
).toString('base64');

try {
  const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });
  const responseText = await response.text();

  if (!response.ok) {
    console.error(`M-Pesa Daraja OAuth failed with HTTP ${response.status}.`);
    if (responseText) {
      console.error(`Daraja response: ${responseText.slice(0, 500)}`);
    }
    process.exit(1);
  }

  const payload = JSON.parse(responseText);
  if (!payload.access_token) {
    console.error('M-Pesa Daraja OAuth response did not include an access token.');
    process.exit(1);
  }

  console.log(`M-Pesa Daraja credentials valid for ${env.KITABU_MPESA_ENV}.`);
} catch (error) {
  console.error(`M-Pesa Daraja validation failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exit(1);
}
