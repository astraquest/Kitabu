import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { importSPKI, importPKCS8, jwtVerify, SignJWT } from 'jose';
import { authenticator } from 'otplib';
import { appConfig } from './config.js';
import type { AuthenticatedUser, AppRole } from './types.js';

const accessPrivateKeyPromise = importPKCS8(appConfig.KITABU_JWT_PRIVATE_KEY, 'RS256');
const accessPublicKeyPromise = importSPKI(appConfig.KITABU_JWT_PUBLIC_KEY, 'RS256');

export interface AuthTokenPayload {
  sub: string;
  schoolId: string | null;
  sid?: string;
  email: string;
  phoneNumber?: string | null;
  phoneVerified?: boolean;
  fullName: string;
  emailVerified: boolean;
  roles: AppRole[];
  gender?: 'male' | 'female' | 'not_specified';
  grade?: string | null;
  onboardingCompleted?: boolean;
  stepUp: boolean;
  mustRotatePassword?: boolean;
  isBreakGlass?: boolean;
  type: 'access';
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashOpaqueToken(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

export function deriveSessionBindingFingerprint(input: {
  userAgent?: string;
  deviceId?: string;
  acceptLanguage?: string;
}): string {
  const normalized = [
    input.deviceId?.trim().toLowerCase() || 'no-device-id',
    input.userAgent?.trim().toLowerCase() || 'no-user-agent',
    input.acceptLanguage?.trim().toLowerCase() || 'no-language'
  ].join('|');

  return hashOpaqueToken(normalized);
}

export async function signAccessToken(payload: Omit<AuthTokenPayload, 'type'>): Promise<string> {
  const privateKey = await accessPrivateKeyPromise;
  return new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(appConfig.KITABU_JWT_ISSUER)
    .setAudience(appConfig.KITABU_JWT_AUDIENCE)
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${payload.stepUp ? appConfig.KITABU_STEP_UP_TTL_SECONDS : appConfig.KITABU_ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(privateKey);
}

export async function verifyAccessToken(token: string): Promise<AuthenticatedUser> {
  const publicKey = await accessPublicKeyPromise;
  const { payload } = await jwtVerify<AuthTokenPayload>(token, publicKey, {
    issuer: appConfig.KITABU_JWT_ISSUER,
    audience: appConfig.KITABU_JWT_AUDIENCE
  });

  return {
    id: payload.sub,
    schoolId: payload.schoolId,
    status: 'active',
    sessionId: payload.sid ?? null,
    email: payload.email,
    phoneNumber: payload.phoneNumber ?? null,
    phoneVerified: Boolean(payload.phoneVerified),
    fullName: payload.fullName,
    emailVerified: payload.emailVerified,
    roles: payload.roles,
    gender: payload.gender,
    grade: payload.grade ?? null,
    onboardingCompleted: Boolean(payload.onboardingCompleted),
    stepUp: payload.stepUp,
    mustRotatePassword: payload.mustRotatePassword,
    isBreakGlass: payload.isBreakGlass
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function verifyTotpToken(secret: string, token: string): boolean {
  return authenticator.verify({ secret, token });
}

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function buildTotpUri(email: string, secret: string): string {
  return authenticator.keyuri(email, 'Kitabu AI', secret);
}
