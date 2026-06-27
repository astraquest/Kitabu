export type AppRole = 'student' | 'teacher' | 'school_admin' | 'platform_admin' | 'parent' | 'sales_agent';

export interface AuthenticatedUser {
  id: string;
  schoolId: string | null;
  status?: string;
  sessionId: string | null;
  email: string;
  phoneNumber?: string | null;
  phoneVerified?: boolean;
  fullName: string;
  emailVerified: boolean;
  roles: AppRole[];
  gender?: 'male' | 'female' | 'not_specified';
  grade?: string | null;
  onboardingCompleted?: boolean;
  termsAcceptedAt?: string | null;
  termsVersion?: string | null;
  privacyVersion?: string | null;
  stepUp: boolean;
  mustRotatePassword?: boolean;
  isBreakGlass?: boolean;
}

export interface PasswordResetTokenRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
}

export interface EmailVerificationTokenRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
}
