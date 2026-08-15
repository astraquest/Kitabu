import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Check,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  X,
} from 'lucide-react-native';

import {
  authenticateWithGoogleToken,
  requestPasswordReset,
} from '../services/authService';
import { requestGoogleIdToken } from '../services/googleAuthService';
import { getUserFacingApiError } from '../services/requestHelpers';
import { AuthSession, ParentChildSummary, PublicSignupRole, UserProfile } from '../types/app';
import { AvatarArt, LocalAvatarKey } from '../components/AvatarArt';
import {
  AccountChoice,
  AccountChoiceGrid,
  AccountChoiceRole,
} from '../components/AccountChoiceGrid';
import type { LocalProfileIndexEntry } from '../services/profileIndexService';
import { GoogleLogo } from '../components/GoogleLogo';
import {
  PRIVACY_POLICY_SECTIONS,
  TERMS_OF_USE_SECTIONS,
} from '../content/legal';

interface LoginScreenProps {
  mode: 'login' | 'signup';
  email: string;
  password: string;
  fullName: string;
  signupRole: PublicSignupRole | null;
  lastUsedRole?: RoleChoice | null;
  knownProfiles?: LocalProfileIndexEntry[];
  knownProfile?: Pick<UserProfile, 'name' | 'role' | 'avatar'> | null;
  knownChildren?: Array<Pick<ParentChildSummary, 'id' | 'name' | 'grade'>>;
  acceptedTerms: boolean;
  optionalPhoneNumber: string;
  error?: string | null;
  isSubmitting: boolean;
  onModeChange: (mode: 'login' | 'signup') => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onSignupRoleChange: (role: PublicSignupRole | null) => void;
  onAcceptedTermsChange: (value: boolean) => void;
  onOptionalPhoneNumberChange: (value: string) => void;
  onAuthenticated: (session: AuthSession) => void;
  onDemoLogin: () => void | Promise<void>;
  onSubmit: () => void;
}

type LegalSheet = 'terms' | 'privacy' | null;
type RoleChoice = Extract<PublicSignupRole, 'student' | 'teacher' | 'parent'>;
type RoleOption = {
  role: RoleChoice;
  label: string;
  detail: string;
  avatar: LocalAvatarKey;
};

const logoAsset = require('../assets/logo.png');
const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'student',
    label: 'Student',
    detail: 'Learn, quiz, and submit homework',
    avatar: 'avatar-afro-boy',
  },
  {
    role: 'teacher',
    label: 'Teacher',
    detail: 'Assign work and review progress',
    avatar: 'avatar-afro-girl',
  },
  {
    role: 'parent',
    label: 'Parent',
    detail: 'Track learning and homework',
    avatar: 'avatar-afro-girl',
  },
];
const SIGNUP_ROLE_OPTIONS = ROLE_OPTIONS.filter(option => option.role === 'teacher' || option.role === 'parent');
const LOGIN_ROLE_OPTIONS = ROLE_OPTIONS.filter(option => option.role === 'student' || option.role === 'parent');

function sanitizePersonName(value: string) {
  return value.replace(/\d/g, '');
}

function isValidPersonName(value: string) {
  const trimmed = value.trim();
  return trimmed.length >= 2 && /[A-Za-z]/.test(trimmed) && !/\d/.test(trimmed);
}

function getKnownRole(role?: string): AccountChoiceRole | null {
  const normalized = role?.toLowerCase() ?? '';
  if (normalized.includes('parent')) return 'parent';
  if (normalized.includes('student')) return 'student';
  return null;
}

function buildLoginChoices(
  knownProfiles: LocalProfileIndexEntry[] = [],
  knownProfile?: Pick<UserProfile, 'name' | 'role' | 'avatar'> | null,
  knownChildren: Array<Pick<ParentChildSummary, 'id' | 'name' | 'grade'>> = [],
): AccountChoice[] {
  const choices: AccountChoice[] = [];
  knownProfiles.forEach(profile => {
    if (profile.role !== 'student' && profile.role !== 'parent') {
      return;
    }

    choices.push({
      id: `known-${profile.id}`,
      role: profile.role,
      name: profile.displayName,
      detail: profile.role === 'parent' ? 'Parent account' : 'Student account',
      avatar: profile.avatarKey,
    });
  });

  if (knownProfiles.length > 0) {
    return choices;
  }

  const profileName = knownProfile?.name?.trim();
  const profileRole = getKnownRole(knownProfile?.role);

  if (profileName && profileName !== 'Kitabu User' && profileRole) {
    const option = LOGIN_ROLE_OPTIONS.find(item => item.role === profileRole)!;
    choices.push({
      id: `known-${profileRole}`,
      role: profileRole,
      name: profileName,
      detail: profileRole === 'parent' ? 'Parent account' : 'Student account',
      avatar: knownProfile?.avatar === 'avatar-afro-girl' ? 'avatar-afro-girl' : option.avatar,
    });
  }

  knownChildren.forEach(child => {
    const name = child.name.trim();
    if (!name) return;
    choices.push({
      id: `child-${child.id}`,
      role: 'student',
      name,
      detail: child.grade ? `${child.grade} · Student profile` : 'Student profile',
      avatar: 'avatar-afro-boy',
    });
  });

  return choices;
}

export function LoginScreen({
  mode,
  email,
  password,
  fullName,
  signupRole,
  lastUsedRole = null,
  knownProfiles = [],
  knownProfile = null,
  knownChildren = [],
  acceptedTerms,
  optionalPhoneNumber,
  error,
  isSubmitting,
  onModeChange,
  onEmailChange,
  onPasswordChange,
  onFullNameChange,
  onSignupRoleChange,
  onAcceptedTermsChange,
  onOptionalPhoneNumberChange,
  onAuthenticated,
  onDemoLogin,
  onSubmit,
}: LoginScreenProps) {
  const [authStep, setAuthStep] = useState<'gateway' | 'details'>('gateway');
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [providerState, setProviderState] = useState({
    isSubmitting: false,
    message: null as string | null,
    error: null as string | null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [activeSheet, setActiveSheet] = useState<LegalSheet>(null);
  const [isTermsAcceptanceOpen, setIsTermsAcceptanceOpen] = useState(false);
  const [termsViewportHeight, setTermsViewportHeight] = useState(0);
  const [termsContentHeight, setTermsContentHeight] = useState(0);
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [forgotEmail, setForgotEmail] = useState(email);
  const [forgotState, setForgotState] = useState<{
    open: boolean;
    isSubmitting: boolean;
    message: string | null;
    error: string | null;
  }>({
    open: false,
    isSubmitting: false,
    message: null,
    error: null,
  });

  const title = mode === 'login' ? 'Welcome back' : 'Create account';
  const submitLabel = mode === 'login' ? 'Sign in' : 'Create account';
  const isBusy = isSubmitting || providerState.isSubmitting;
  const selectedRole = ROLE_OPTIONS.find(option => option.role === signupRole) ?? null;
  const loginChoices = useMemo(
    () => buildLoginChoices(knownProfiles, knownProfile, knownChildren),
    [knownChildren, knownProfile, knownProfiles],
  );
  const hasKnownProfiles = loginChoices.length > 0;
  const safeError = error ? getUserFacingApiError({ message: error }) : null;
  const safeProviderError = providerState.error
    ? getUserFacingApiError({ message: providerState.error })
    : null;
  const legalContent = useMemo(
    () =>
      activeSheet === 'terms'
        ? {
            title: 'Terms of Use',
            icon: <FileText color="#FFFFFF" size={18} strokeWidth={2.3} />,
            sections: TERMS_OF_USE_SECTIONS,
          }
        : activeSheet === 'privacy'
          ? {
              title: 'Privacy Policy',
              icon: <ShieldCheck color="#FFFFFF" size={18} strokeWidth={2.3} />,
              sections: PRIVACY_POLICY_SECTIONS,
            }
          : null,
    [activeSheet],
  );

  useEffect(() => {
    setAuthStep('gateway');
    setSelectedChoiceId(null);
  }, [mode]);

  useEffect(() => {
    if (!isTermsAcceptanceOpen) {
      setTermsViewportHeight(0);
      setTermsContentHeight(0);
      setHasReadTerms(false);
    }
  }, [isTermsAcceptanceOpen]);

  useEffect(() => {
    if (isTermsAcceptanceOpen) {
      updateTermsReadProgress(0, termsViewportHeight, termsContentHeight);
    }
  }, [isTermsAcceptanceOpen, termsViewportHeight, termsContentHeight]);

  function updateTermsReadProgress(offsetY: number, viewportHeight: number, contentHeight: number) {
    if (contentHeight <= 0 || viewportHeight <= 0) {
      return;
    }
    const bottomBuffer = 24;
    if (contentHeight <= viewportHeight + bottomBuffer || offsetY + viewportHeight >= contentHeight - bottomBuffer) {
      setHasReadTerms(true);
    }
  }

  function openTermsAcceptance() {
    setIsTermsAcceptanceOpen(true);
  }

  function acceptTerms() {
    onAcceptedTermsChange(true);
    setIsTermsAcceptanceOpen(false);
  }

  async function handleForgotPassword() {
    const normalizedEmail = forgotEmail.trim();
    if (!normalizedEmail) {
      setForgotState(current => ({
        ...current,
        error: 'Enter your email first.',
        message: null,
      }));
      return;
    }

    setForgotState(current => ({
      ...current,
      isSubmitting: true,
      error: null,
      message: null,
    }));

    try {
      const response = await requestPasswordReset(normalizedEmail);
      setForgotState(current => ({
        ...current,
        isSubmitting: false,
        message: response.message,
        error: null,
      }));
    } catch (forgotError) {
      setForgotState(current => ({
        ...current,
        isSubmitting: false,
        error:
          forgotError instanceof Error
            ? forgotError.message
            : 'Could not submit reset request.',
        message: null,
      }));
    }
  }

  function openForgotPassword() {
    setForgotEmail(email);
    setForgotState({
      open: true,
      isSubmitting: false,
      message: null,
      error: null,
    });
  }

  function changeMode() {
    const nextMode = mode === 'login' ? 'signup' : 'login';
    if (nextMode === 'signup') {
      onSignupRoleChange(null);
    }
    onModeChange(nextMode);
    setProviderState({ isSubmitting: false, message: null, error: null });
  }

  function selectRole(role: PublicSignupRole) {
    onSignupRoleChange(role);
    setProviderState({ isSubmitting: false, message: null, error: null });
    setAuthStep('details');
  }

  function selectChoice(choice: AccountChoice) {
    setSelectedChoiceId(choice.id);
    selectRole(choice.role);
  }

  function openLoginDetails() {
    setSelectedChoiceId(null);
    onSignupRoleChange(null);
    setProviderState({ isSubmitting: false, message: null, error: null });
    setAuthStep('details');
  }

  function startAddAccount() {
    openLoginDetails();
  }

  function startSignup() {
    onSignupRoleChange(null);
    onModeChange('signup');
    setProviderState({ isSubmitting: false, message: null, error: null });
  }

  function handleEmailSubmit() {
    setProviderState({ isSubmitting: false, message: null, error: null });
    if (mode === 'signup' && !signupRole) {
      setProviderState({
        isSubmitting: false,
        message: null,
        error: 'Choose an account role before creating an account.',
      });
      return;
    }
    if (mode === 'signup' && !acceptedTerms) {
      setProviderState({
        isSubmitting: false,
        message: null,
        error: 'Accept the Terms of Use and Privacy Policy before creating an account.',
      });
      return;
    }
    if (mode === 'signup' && !fullName.trim()) {
      setProviderState({
        isSubmitting: false,
        message: null,
        error: 'Enter your full name to create an account.',
      });
      return;
    }
    if (mode === 'signup' && !isValidPersonName(fullName)) {
      setProviderState({
        isSubmitting: false,
        message: null,
        error: 'Enter a full name without numbers to create an account.',
      });
      return;
    }
    onSubmit();
  }

  function handleFullNameChange(value: string) {
    onFullNameChange(sanitizePersonName(value));
  }

  async function handleGoogleSubmit() {
    setProviderState({ isSubmitting: true, message: null, error: null });
    try {
      let session: AuthSession;
      if (mode === 'signup') {
        const role = signupRole;
        if (!role) {
          throw new Error('Choose an account role before creating an account.');
        }
        if (!acceptedTerms) {
          throw new Error('Accept the Terms of Use and Privacy Policy before creating an account.');
        }
        const idToken = await requestGoogleIdToken();
        session = await authenticateWithGoogleToken({ idToken, role, acceptedTerms: true });
      } else {
        const idToken = await requestGoogleIdToken();
        session = await authenticateWithGoogleToken({ idToken });
      }
      onAuthenticated(session);
    } catch (googleError) {
      setProviderState({
        isSubmitting: false,
        message: null,
        error: googleError instanceof Error ? googleError.message : 'Google authentication failed',
      });
    }
  }

  return (
    <LinearGradient
      colors={['#0b1c32', '#15385f', '#2b557f', '#6b3fd8']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}>
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardWrap}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <LinearGradient
            colors={['rgba(59,130,246,0.34)', 'rgba(139,92,246,0.24)']}
            style={styles.heroStrip}>
            <View style={styles.brandPill}>
              <Image source={logoAsset} style={styles.brandLogo} resizeMode="contain" />
              <Text style={styles.brandPillText}>KITABU AI</Text>
            </View>

            <View style={styles.stepHeader}>
              <Text style={styles.title}>
                {authStep === 'gateway' ? (mode === 'login' ? "Who's using Kitabu?" : 'Choose your role') : title}
              </Text>
              <Text style={styles.stepCopy}>
                {authStep === 'gateway'
                  ? mode === 'login'
                    ? hasKnownProfiles
                      ? 'Choose a profile to continue securely.'
                      : 'Sign in or create an account to continue securely.'
                    : 'Select how you use Kitabu AI.'
                  : `${selectedRole?.label ?? 'Account'} details`}
              </Text>
            </View>
          </LinearGradient>

          {authStep === 'gateway' ? (
            <View style={styles.roleStep}>
              <View style={styles.rolePanel}>
                {mode === 'signup' || hasKnownProfiles ? (
                  <AccountChoiceGrid
                    choices={mode === 'signup'
                      ? SIGNUP_ROLE_OPTIONS.map(option => ({
                          id: `role-${option.role}`,
                          role: option.role,
                          name: option.label,
                          detail: option.detail,
                          avatar: option.avatar,
                        }))
                      : loginChoices}
                    lastUsedRole={mode === 'login' ? lastUsedRole : null}
                    onSelect={selectChoice}
                    selectedId={selectedChoiceId}
                  />
                ) : (
                  <View style={styles.gatewayActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Sign in"
                      onPress={openLoginDetails}
                      style={styles.gatewayButton}>
                      <Text style={styles.gatewayButtonText}>Sign in</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Create account"
                      onPress={startSignup}
                      style={[styles.gatewayButton, styles.gatewayButtonSecondary]}>
                      <Text style={[styles.gatewayButtonText, styles.gatewayButtonSecondaryText]}>
                        Create account
                      </Text>
                    </Pressable>
                  </View>
                )}
                {mode === 'login' && hasKnownProfiles ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="+ Add account"
                    onPress={startAddAccount}
                    style={styles.addAccountButton}>
                    <Text style={styles.addAccountText}>+ Add account</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : (
          <View style={styles.form}>
            <View style={styles.selectedRoleRow}>
              <View style={styles.selectedRoleBadge}>
                <AvatarArt avatarKey={selectedRole?.avatar ?? 'avatar-afro-boy'} size={30} />
                <View>
                  <Text style={styles.selectedRoleLabel}>{selectedRole?.label ?? 'Choose role'}</Text>
                  <Text style={styles.selectedRoleDetail}>
                    {selectedRole?.detail ?? 'Select how you use Kitabu AI'}
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change role"
                onPress={() => setAuthStep('gateway')}
                style={styles.changeRoleButton}>
                <Text style={styles.changeRoleText}>Change</Text>
              </Pressable>
            </View>

            <Pressable
              accessibilityLabel="Continue with Google"
              disabled={isBusy}
              onPress={handleGoogleSubmit}
              style={styles.googleButton}>
              <GoogleLogo size={20} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or use email</Text>
              <View style={styles.dividerLine} />
            </View>

            {mode === 'signup' ? (
              <FieldShell label="Full Name" icon={<User color="#15803D" size={16} />}>
                <TextInput
                  autoCapitalize="words"
                  onChangeText={handleFullNameChange}
                  placeholder="Full name"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  value={fullName}
                />
              </FieldShell>
            ) : null}

            <FieldShell label="Email" icon={<Mail color="#0F766E" size={16} />}>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={onEmailChange}
                placeholder="Email"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={email}
              />
            </FieldShell>

            <FieldShell label="Password" icon={<Lock color="#1D4ED8" size={16} />}>
              <View style={styles.passwordRow}>
                <TextInput
                  autoCapitalize="none"
                  onChangeText={onPasswordChange}
                  placeholder="Password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  style={styles.passwordInput}
                  value={password}
                />
                <Pressable
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  onPress={() => setShowPassword(value => !value)}
                  style={styles.visibilityButton}>
                  {showPassword ? (
                    <EyeOff color="#64748B" size={18} strokeWidth={2.2} />
                  ) : (
                    <Eye color="#64748B" size={18} strokeWidth={2.2} />
                  )}
                </Pressable>
              </View>
            </FieldShell>

            <FieldShell label="Phone number (optional)" icon={<Phone color="#0F766E" size={16} />}>
              <TextInput
                autoCorrect={false}
                keyboardType="phone-pad"
                onChangeText={onOptionalPhoneNumberChange}
                placeholder="07xx xxx xxx"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={optionalPhoneNumber}
              />
            </FieldShell>

            {mode === 'login' ? (
              <Pressable onPress={openForgotPassword} style={styles.textLinkWrap}>
                <Text style={styles.textLink}>Forgot password?</Text>
              </Pressable>
            ) : null}

            {mode === 'signup' ? (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acceptedTerms }}
                accessibilityLabel="I accept the Terms of Use and Privacy Policy"
                onPress={openTermsAcceptance}
                style={styles.acceptanceRow}>
                <View style={[styles.acceptanceCheckbox, acceptedTerms && styles.acceptanceCheckboxActive]}>
                  {acceptedTerms ? <Check color="#FFFFFF" size={14} strokeWidth={2.8} /> : null}
                </View>
                <Text style={styles.acceptanceText}>
                  I Accept the Terms of Use and Privacy Policy.
                </Text>
              </Pressable>
            ) : null}

            {safeError ? <Text style={styles.errorText}>{safeError}</Text> : null}
            {safeProviderError ? <Text style={styles.errorText}>{safeProviderError}</Text> : null}
            {providerState.message ? <Text style={styles.successText}>{providerState.message}</Text> : null}

            <View style={styles.submitRow}>
              {mode === 'login' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Demo Account"
                  disabled={isBusy}
                  onPress={onDemoLogin}
                  style={({ pressed }) => [
                    styles.demoButton,
                    pressed && styles.submitButtonPressed,
                    isBusy && styles.submitButtonDisabled,
                  ]}>
                  <Text style={styles.demoButtonText}>Demo Account</Text>
                </Pressable>
              ) : null}

              <Pressable
                accessibilityLabel={submitLabel}
                disabled={isBusy}
                onPress={handleEmailSubmit}
                style={({ pressed }) => [
                  styles.submitButton,
                  mode === 'login' && styles.submitButtonInRow,
                  pressed && styles.submitButtonPressed,
                  isBusy && styles.submitButtonDisabled,
                ]}>
                {isBusy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>{submitLabel}</Text>
                )}
              </Pressable>
            </View>
          </View>
          )}

          <View style={styles.footerRow}>
            <View style={styles.modePromptRow}>
              <Text style={styles.modePromptText}>
                {mode === 'login' ? "Don't Have an Account yet? " : 'Already have an account? '}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={mode === 'login' ? 'Switch to sign up' : 'Switch to sign in'}
                onPress={changeMode}>
                <Text style={styles.modePromptLink}>
                  {mode === 'login' ? 'Sign Up' : 'Sign In'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.legalRow}>
              <Pressable onPress={() => setActiveSheet('terms')}>
                <Text style={styles.footerLink}>Terms</Text>
              </Pressable>
              <Text style={styles.footerDivider}>•</Text>
              <Pressable onPress={() => setActiveSheet('privacy')}>
                <Text style={styles.footerLink}>Privacy</Text>
              </Pressable>
            </View>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <GlassSheet
        open={activeSheet !== null}
        title={legalContent?.title || ''}
        icon={legalContent?.icon || null}
        onClose={() => setActiveSheet(null)}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {(legalContent?.sections || []).map(section => (
            <View key={section.heading} style={styles.sheetSection}>
              <Text style={styles.sheetHeading}>{section.heading}</Text>
              {section.paragraphs.map(paragraph => (
                <Text key={paragraph} style={styles.sheetCopy}>
                  {paragraph}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>
      </GlassSheet>

      <GlassSheet
        open={isTermsAcceptanceOpen}
        title="Terms of Use"
        icon={<FileText color="#FFFFFF" size={18} strokeWidth={2.3} />}
        onClose={() => setIsTermsAcceptanceOpen(false)}
        footer={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="I accept Terms of Use"
            disabled={!hasReadTerms}
            onPress={acceptTerms}
            style={({ pressed }) => [
              styles.termsAcceptButton,
              !hasReadTerms && styles.termsAcceptButtonDisabled,
              pressed && hasReadTerms && styles.submitButtonPressed,
            ]}>
            <Text style={[styles.termsAcceptButtonText, !hasReadTerms && styles.termsAcceptButtonTextDisabled]}>
              I accept Terms of Use
            </Text>
          </Pressable>
        }>
        <ScrollView
          onContentSizeChange={(_, height) => {
            setTermsContentHeight(height);
            updateTermsReadProgress(0, termsViewportHeight, height);
          }}
          onLayout={event => {
            const height = event.nativeEvent.layout.height;
            setTermsViewportHeight(height);
            updateTermsReadProgress(0, height, termsContentHeight);
          }}
          onScroll={event => {
            updateTermsReadProgress(
              event.nativeEvent.contentOffset.y,
              event.nativeEvent.layoutMeasurement.height,
              event.nativeEvent.contentSize.height,
            );
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator>
          {TERMS_OF_USE_SECTIONS.map(section => (
            <View key={section.heading} style={styles.sheetSection}>
              <Text style={styles.sheetHeading}>{section.heading}</Text>
              {section.paragraphs.map(paragraph => (
                <Text key={paragraph} style={styles.sheetCopy}>
                  {paragraph}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>
      </GlassSheet>

      <GlassSheet
        open={forgotState.open}
        title="Forgot Password"
        icon={<Lock color="#FFFFFF" size={18} strokeWidth={2.3} />}
        onClose={() =>
          setForgotState({
            open: false,
            isSubmitting: false,
            message: null,
            error: null,
          })
        }>
        <View style={styles.sheetForm}>
          <Text style={styles.sheetLabel}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={setForgotEmail}
            placeholder="Email"
            placeholderTextColor="#94A3B8"
            style={styles.sheetInput}
            value={forgotEmail}
          />

          {forgotState.error ? <Text style={styles.errorText}>{forgotState.error}</Text> : null}
          {forgotState.message ? (
            <Text style={styles.successText}>{forgotState.message}</Text>
          ) : null}

          <Pressable
            disabled={forgotState.isSubmitting}
            onPress={handleForgotPassword}
            style={({ pressed }) => [
              styles.sheetPrimaryButton,
              pressed && styles.submitButtonPressed,
              forgotState.isSubmitting && styles.submitButtonDisabled,
            ]}>
            {forgotState.isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.sheetPrimaryButtonText}>Request reset</Text>
            )}
          </Pressable>
        </View>
      </GlassSheet>
    </LinearGradient>
  );
}

function FieldShell({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldShell}>
        <View style={styles.fieldIcon}>{icon}</View>
        <View style={styles.fieldBody}>{children}</View>
      </View>
    </View>
  );
}

function GlassSheet({
  open,
  title,
  icon,
  children,
  footer,
  onClose,
}: {
  open: boolean;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal animationType="fade" transparent visible={open} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalCard}>
          <LinearGradient
            colors={['rgba(59,130,246,0.34)', 'rgba(139,92,246,0.28)']}
            style={styles.modalHeader}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalBadge}>{icon}</View>
              <Text style={styles.modalTitle}>{title}</Text>
              <Pressable onPress={onClose} style={styles.modalCloseButton}>
                <X color="#FFFFFF" size={18} strokeWidth={2.5} />
              </Pressable>
            </View>
          </LinearGradient>
          <View style={styles.modalBody}>{children}</View>
          {footer ? footer : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  bgOrbTop: {
    position: 'absolute',
    top: 70,
    right: -20,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bgOrbBottom: {
    position: 'absolute',
    bottom: 40,
    left: -30,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  keyboardWrap: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 14,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 12,
  },
  heroStrip: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 10,
  },
  brandPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  brandLogo: {
    width: 22,
    height: 22,
  },
  brandPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  fieldLabelCentered: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.6,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
    textAlign: 'center',
  },
  stepHeader: {
    alignItems: 'center',
    gap: 5,
  },
  stepCopy: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  roleStep: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
  },
  rolePanel: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 22,
    borderWidth: 1,
    padding: 12,
  },
  gatewayActions: {
    gap: 10,
  },
  gatewayButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  gatewayButtonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.36)',
  },
  gatewayButtonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },
  gatewayButtonSecondaryText: {
    color: '#FFFFFF',
  },
  addAccountButton: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.42)',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  addAccountText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  rolePanelTitle: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  form: {
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
  },
  selectedRoleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  selectedRoleBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  selectedRoleLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  selectedRoleDetail: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
  },
  changeRoleButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
  },
  changeRoleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  fieldLabel: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  fieldShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    minHeight: 46,
    paddingHorizontal: 12,
    gap: 10,
  },
  fieldIcon: {
    width: 24,
    alignItems: 'center',
  },
  fieldBody: {
    flex: 1,
  },
  input: {
    color: '#0F172A',
    fontSize: 15,
    paddingVertical: 10,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 15,
    paddingVertical: 10,
  },
  visibilityButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  roleChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    paddingVertical: 12,
  },
  roleChipActive: {
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  roleChipText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
  },
  roleChipTextActive: {
    color: '#0F172A',
  },
  textLinkWrap: {
    alignSelf: 'flex-end',
  },
  textLinkWrapCentered: { alignSelf: 'center' },
  textLink: {
    color: '#E0F2FE',
    fontSize: 13,
    fontWeight: '700',
  },
  acceptanceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  acceptanceCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  acceptanceCheckboxActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  acceptanceText: {
    color: '#E2E8F0',
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: {
    color: '#FECACA',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  successText: {
    color: '#BBF7D0',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  submitRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.38)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  submitButton: {
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonInRow: {
    flex: 1,
  },
  submitButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.34)' },
  dividerText: { color: '#CBD5E1', fontSize: 13, fontWeight: '700' },
  googleButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleMark: { color: '#4285F4', fontSize: 20, fontWeight: '900' },
  googleButtonText: { color: '#1E293B', fontSize: 15, fontWeight: '800' },
  footerRow: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 16,
    gap: 8,
  },
  modePromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  modePromptText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '500',
  },
  modePromptLink: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  footerLink: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
  },
  footerDivider: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,6,23,0.55)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '82%',
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15,23,42,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  modalBody: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    flexShrink: 1,
    padding: 18,
    gap: 14,
  },
  hostedLinkButton: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    minHeight: 50,
  },
  hostedLinkButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  termsAcceptButton: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  termsAcceptButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  termsAcceptButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  termsAcceptButtonTextDisabled: {
    color: '#64748B',
  },
  sheetSection: {
    marginBottom: 18,
    gap: 8,
  },
  sheetHeading: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  sheetCopy: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 22,
  },
  sheetForm: {
    gap: 14,
  },
  sheetLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sheetInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: 16,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  sheetPrimaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
