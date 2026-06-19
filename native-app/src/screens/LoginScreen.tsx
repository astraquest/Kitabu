import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
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
  requestPhoneAuthCode,
  verifyPhoneAuthCode,
} from '../services/authService';
import { requestGoogleIdToken } from '../services/googleAuthService';
import { getUserFacingApiError } from '../services/requestHelpers';
import { AuthSession, PublicSignupRole } from '../types/app';
import { AvatarArt, LocalAvatarKey } from '../components/AvatarArt';
import {
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
  TERMS_OF_USE_SECTIONS,
} from '../content/legal';

interface LoginScreenProps {
  mode: 'login' | 'signup';
  email: string;
  password: string;
  fullName: string;
  signupRole: PublicSignupRole;
  acceptedTerms: boolean;
  error?: string | null;
  isSubmitting: boolean;
  onModeChange: (mode: 'login' | 'signup') => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onSignupRoleChange: (role: PublicSignupRole) => void;
  onAcceptedTermsChange: (value: boolean) => void;
  onAuthenticated: (session: AuthSession) => void;
  onSubmit: () => void;
}

type LegalSheet = 'terms' | 'privacy' | null;
type RoleOption = {
  role: PublicSignupRole;
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

export function LoginScreen({
  mode,
  email,
  password,
  fullName,
  signupRole,
  acceptedTerms,
  error,
  isSubmitting,
  onModeChange,
  onEmailChange,
  onPasswordChange,
  onFullNameChange,
  onSignupRoleChange,
  onAcceptedTermsChange,
  onAuthenticated,
  onSubmit,
}: LoginScreenProps) {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneStep, setPhoneStep] = useState<'request' | 'verify'>('request');
  const [providerState, setProviderState] = useState({
    isSubmitting: false,
    message: null as string | null,
    error: null as string | null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [activeSheet, setActiveSheet] = useState<LegalSheet>(null);
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
  const safeError = error ? getUserFacingApiError({ message: error }) : null;
  const safeProviderError = providerState.error
    ? getUserFacingApiError({ message: providerState.error })
    : null;
  const legalContent = useMemo(
    () =>
      activeSheet === 'terms'
        ? {
            title: 'Terms of Service',
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

  function changeMethod(method: 'email' | 'phone') {
    setAuthMethod(method);
    setPhoneStep('request');
    setPhoneCode('');
    setProviderState({ isSubmitting: false, message: null, error: null });
  }

  function changeMode() {
    onModeChange(mode === 'login' ? 'signup' : 'login');
    setPhoneStep('request');
    setPhoneCode('');
    setProviderState({ isSubmitting: false, message: null, error: null });
  }

  async function handlePhoneSubmit() {
    setProviderState({ isSubmitting: true, message: null, error: null });
    try {
      const purpose = mode === 'login' ? 'login' : 'signup';
      if (phoneStep === 'request') {
        if (mode === 'signup' && !acceptedTerms) {
          throw new Error('Accept the Terms of Service and Privacy Policy before creating an account.');
        }
        if (mode === 'signup' && !fullName.trim()) {
          throw new Error('Enter your full name to create an account.');
        }
        const response = await requestPhoneAuthCode({
          purpose,
          phoneNumber,
          ...(mode === 'signup'
            ? { fullName: fullName.trim(), role: signupRole, acceptedTerms: true as const }
            : {}),
        });
        setPhoneStep('verify');
        setPhoneCode(response.developmentCode || '');
        setProviderState({
          isSubmitting: false,
          message: response.developmentCode
            ? `Development code: ${response.developmentCode}`
            : response.message,
          error: null,
        });
        return;
      }

      const session = await verifyPhoneAuthCode({ purpose, phoneNumber, code: phoneCode.trim() });
      onAuthenticated(session);
    } catch (phoneError) {
      setProviderState({
        isSubmitting: false,
        message: null,
        error: phoneError instanceof Error ? phoneError.message : 'Phone authentication failed',
      });
    }
  }

  function handleEmailSubmit() {
    setProviderState({ isSubmitting: false, message: null, error: null });
    if (mode === 'signup' && !acceptedTerms) {
      setProviderState({
        isSubmitting: false,
        message: null,
        error: 'Accept the Terms of Service and Privacy Policy before creating an account.',
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
    onSubmit();
  }

  async function handleGoogleSubmit() {
    setProviderState({ isSubmitting: true, message: null, error: null });
    try {
      if (mode === 'signup' && !acceptedTerms) {
        throw new Error('Accept the Terms of Service and Privacy Policy before creating an account.');
      }
      const idToken = await requestGoogleIdToken();
      const session = await authenticateWithGoogleToken({
        idToken,
        ...(mode === 'signup'
          ? { role: signupRole, acceptedTerms: true as const }
          : {}),
      });
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
        behavior={Platform.select({ ios: 'padding', default: undefined })}
        style={styles.keyboardWrap}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
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

            <Text style={styles.title}>{title}</Text>

            <View style={styles.rolePanel}>
              <Text style={styles.rolePanelTitle}>Select account type</Text>
              <View style={styles.roleGrid}>
                {ROLE_OPTIONS.map(option => (
                  <RoleChoice
                    key={option.role}
                    option={option}
                    active={signupRole === option.role}
                    onPress={() => onSignupRoleChange(option.role)}
                  />
                ))}
              </View>
            </View>
          </LinearGradient>

          <View style={styles.form}>
            <View style={styles.methodTabs}>
              <Pressable
                accessibilityLabel="Use email"
                accessibilityRole="button"
                onPress={() => changeMethod('email')}
                style={[styles.methodTab, authMethod === 'email' && styles.methodTabActive]}>
                <Mail color={authMethod === 'email' ? '#FFFFFF' : '#475569'} size={17} />
                <Text style={[styles.methodTabText, authMethod === 'email' && styles.methodTabTextActive]}>Email</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Use phone"
                accessibilityRole="button"
                onPress={() => changeMethod('phone')}
                style={[styles.methodTab, authMethod === 'phone' && styles.methodTabActive]}>
                <Phone color={authMethod === 'phone' ? '#FFFFFF' : '#475569'} size={17} />
                <Text style={[styles.methodTabText, authMethod === 'phone' && styles.methodTabTextActive]}>Phone</Text>
              </Pressable>
            </View>

            {mode === 'signup' ? (
              <FieldShell label="Full Name" icon={<User color="#8B5CF6" size={16} />}>
                <TextInput
                  autoCapitalize="words"
                  onChangeText={onFullNameChange}
                  placeholder="Full name"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  value={fullName}
                />
              </FieldShell>
            ) : null}

            {authMethod === 'email' ? (
              <>
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
              </>
            ) : (
              <>
                <FieldShell label="Phone number" icon={<Phone color="#0F766E" size={16} />}>
                  <TextInput
                    autoCorrect={false}
                    editable={phoneStep === 'request'}
                    keyboardType="phone-pad"
                    onChangeText={setPhoneNumber}
                    placeholder="07xx xxx xxx"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                    value={phoneNumber}
                  />
                </FieldShell>
                {phoneStep === 'verify' ? (
                  <FieldShell label="Verification code" icon={<Lock color="#1D4ED8" size={16} />}>
                    <TextInput
                      keyboardType="number-pad"
                      maxLength={6}
                      onChangeText={setPhoneCode}
                      placeholder="6-digit code"
                      placeholderTextColor="#94A3B8"
                      style={styles.input}
                      value={phoneCode}
                    />
                  </FieldShell>
                ) : null}
              </>
            )}

            {mode === 'login' && authMethod === 'email' ? (
              <Pressable onPress={openForgotPassword} style={styles.textLinkWrap}>
                <Text style={styles.textLink}>Forgot password?</Text>
              </Pressable>
            ) : null}

            {mode === 'signup' ? (
              <Pressable
                onPress={() => onAcceptedTermsChange(!acceptedTerms)}
                style={styles.acceptanceRow}>
                <View style={[styles.acceptanceCheckbox, acceptedTerms && styles.acceptanceCheckboxActive]}>
                  {acceptedTerms ? <Check color="#FFFFFF" size={14} strokeWidth={2.8} /> : null}
                </View>
                <Text style={styles.acceptanceText}>
                  I Accept the Terms of Service and Privacy Policy.
                </Text>
              </Pressable>
            ) : null}

            {safeError ? <Text style={styles.errorText}>{safeError}</Text> : null}
            {safeProviderError ? <Text style={styles.errorText}>{safeProviderError}</Text> : null}
            {providerState.message ? <Text style={styles.successText}>{providerState.message}</Text> : null}

            <Pressable
              accessibilityLabel={authMethod === 'phone'
                ? phoneStep === 'request' ? 'Send verification code' : 'Verify and continue'
                : submitLabel}
              disabled={isBusy}
              onPress={authMethod === 'email' ? handleEmailSubmit : handlePhoneSubmit}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.submitButtonPressed,
                isBusy && styles.submitButtonDisabled,
              ]}>
              {isBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {authMethod === 'phone'
                    ? phoneStep === 'request' ? 'Send verification code' : 'Verify and continue'
                    : submitLabel}
                </Text>
              )}
            </Pressable>

            {authMethod === 'phone' && phoneStep === 'verify' ? (
              <Pressable onPress={() => changeMethod('phone')} style={styles.textLinkWrapCentered}>
                <Text style={styles.textLink}>Change phone number</Text>
              </Pressable>
            ) : null}

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
            <Pressable
              accessibilityLabel="Continue with Google"
              disabled={isBusy}
              onPress={handleGoogleSubmit}
              style={styles.googleButton}>
              <Text style={styles.googleMark}>G</Text>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </Pressable>
          </View>

          <View style={styles.footerRow}>
            <View style={styles.modePromptRow}>
              <Text style={styles.modePromptText}>
                {mode === 'login' ? "Don't Have an Account yet? " : 'Already have an account? '}
              </Text>
              <Pressable onPress={changeMode}>
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

function RoleChoice({
  option,
  active,
  onPress,
}: {
  option: RoleOption;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continue as ${option.label}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.roleCard,
        active && styles.roleCardActive,
        pressed && styles.roleCardPressed,
      ]}>
      <View style={[styles.roleAvatarFrame, active && styles.roleAvatarFrameActive]}>
        <AvatarArt avatarKey={option.avatar} size={46} />
      </View>
      <Text style={[styles.roleCardTitle, active && styles.roleCardTitleActive]}>
        {option.label}
      </Text>
      <Text style={[styles.roleCardDetail, active && styles.roleCardDetailActive]}>
        {option.detail}
      </Text>
    </Pressable>
  );
}

function GlassSheet({
  open,
  title,
  icon,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
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
          {open && title === 'Terms of Service' ? (
            <Pressable onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)} style={styles.hostedLinkButton}>
              <Text style={styles.hostedLinkButtonText}>Open hosted copy</Text>
            </Pressable>
          ) : null}
          {open && title === 'Privacy Policy' ? (
            <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} style={styles.hostedLinkButton}>
              <Text style={styles.hostedLinkButtonText}>Open hosted copy</Text>
            </Pressable>
          ) : null}
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
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 30,
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
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    gap: 16,
  },
  brandPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  brandLogo: {
    width: 24,
    height: 24,
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
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 34,
    textAlign: 'center',
  },
  rolePanel: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 22,
    borderWidth: 1,
    padding: 12,
  },
  rolePanelTitle: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  roleCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    minHeight: 136,
    paddingHorizontal: 7,
    paddingVertical: 10,
  },
  roleCardActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  roleCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  roleAvatarFrame: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    padding: 4,
  },
  roleAvatarFrameActive: {
    backgroundColor: '#DBEAFE',
  },
  roleCardTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 8,
  },
  roleCardTitleActive: {
    color: '#0F172A',
  },
  roleCardDetail: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  roleCardDetailActive: {
    color: '#475569',
  },
  form: {
    gap: 16,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 20,
  },
  methodTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  methodTab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  methodTabActive: { backgroundColor: '#2563EB' },
  methodTabText: { color: '#475569', fontSize: 14, fontWeight: '800' },
  methodTabTextActive: { color: '#FFFFFF' },
  fieldLabel: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
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
    minHeight: 58,
    paddingHorizontal: 14,
    gap: 12,
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
    fontSize: 16,
    paddingVertical: 14,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 16,
    paddingVertical: 14,
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
    fontSize: 14,
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
  submitButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 16,
    fontWeight: '800',
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.34)' },
  dividerText: { color: '#CBD5E1', fontSize: 13, fontWeight: '700' },
  googleButton: {
    minHeight: 54,
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
    paddingHorizontal: 22,
    paddingBottom: 22,
    gap: 10,
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
