import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { appConfig } from './config.js';

const googleJwks = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs')
);

export interface VerifiedGoogleIdentity {
  subject: string;
  email: string;
  fullName: string;
}

export function getGoogleClientIds() {
  return appConfig.KITABU_GOOGLE_CLIENT_IDS
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

export function parseVerifiedGoogleClaims(payload: JWTPayload): VerifiedGoogleIdentity {
  if (
    typeof payload.sub !== 'string' ||
    typeof payload.email !== 'string' ||
    payload.email_verified !== true
  ) {
    throw new Error('Google account does not provide a verified email address');
  }

  const fullName = typeof payload.name === 'string' && payload.name.trim()
    ? payload.name.trim()
    : payload.email.split('@')[0];

  return {
    subject: payload.sub,
    email: payload.email.trim().toLowerCase(),
    fullName
  };
}

export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleIdentity> {
  const audiences = getGoogleClientIds();
  if (audiences.length === 0) {
    throw new Error('Google authentication is not configured');
  }

  const { payload } = await jwtVerify(idToken, googleJwks, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: audiences
  });

  return parseVerifiedGoogleClaims(payload);
}
