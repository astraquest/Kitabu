import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Camera,
  ChevronRight,
  ChevronDown,
  Check,
  Clock3,
  GraduationCap,
  Search,
  Settings,
  ShieldCheck,
  User,
  X,
} from 'lucide-react-native';

import { SchoolData, Subject, UserProfile } from '../types/app';
import type { BillingStatus } from '../types/app';
import { SUPPORTED_GRADES } from '../constants/grades';
import {
  AvatarArt,
  isLocalAvatarKey,
  LOCAL_AVATAR_OPTIONS,
  type LocalAvatarKey,
} from './AvatarArt';
import { SubjectSelector } from './SubjectGrid';
import { prioritizeSchoolsByEnrollment } from '../utils/locationOptionPriority';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdmin: () => void;
  onOpenTeacher: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => Promise<void>;
  showTeacherPortalButton: boolean;
  showAdminPortalButton: boolean;
  canResendVerification: boolean;
  onResendVerification: () => Promise<string>;
  billingStatus: BillingStatus;
  onManageSubscription: () => void;
  focusModeActive: boolean;
  focusModeSetupRequired: boolean;
  focusModeError: string | null;
  focusModeSecondsRemaining: number;
  dailyLimitSeconds: number;
  isStartingFocusMode: boolean;
  onStartFocusMode: () => void;
  onOpenFocusModeSettings: () => void;
  user: UserProfile;
  onSave: (updatedUser: UserProfile) => void;
  schools: SchoolData[];
  allSubjects: Subject[];
  selectedSubjectIds: string[];
  onToggleSubject: (subjectId: string) => void;
}

const GENDER_OPTIONS: UserProfile['gender'][] = [
  'Not Specified',
  'male',
  'female',
];

type EditableField = 'grade' | 'gender' | 'school';

function getAvatarUri(value?: string) {
  if (!value) {
    return null;
  }

  if (value.startsWith('avatar-seed-')) {
    const normalizedSeed = value.replace(/^avatar-seed-/, '');
    return `https://api.dicebear.com/7.x/adventurer/png?seed=${encodeURIComponent(normalizedSeed)}`;
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value.replace('/svg?seed=', '/png?seed=').replace('/svg/', '/png/');
  }

  return `https://api.dicebear.com/7.x/adventurer/png?seed=${encodeURIComponent(value)}`;
}

export function ProfileModal({
  isOpen,
  onClose,
  onOpenAdmin,
  onOpenTeacher,
  onSignOut,
  onDeleteAccount,
  showTeacherPortalButton,
  showAdminPortalButton,
  canResendVerification,
  onResendVerification,
  billingStatus,
  onManageSubscription,
  focusModeActive,
  focusModeSetupRequired,
  focusModeError,
  focusModeSecondsRemaining,
  dailyLimitSeconds,
  isStartingFocusMode,
  onStartFocusMode,
  onOpenFocusModeSettings,
  user,
  onSave,
  schools,
  allSubjects,
  selectedSubjectIds,
  onToggleSubject,
}: ProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserProfile>(user);
  const [schoolPickerOpen, setSchoolPickerOpen] = useState(false);
  const [schoolQuery, setSchoolQuery] = useState('');
  const [verificationState, setVerificationState] = useState<{
    isSending: boolean;
    message: string | null;
    error: string | null;
  }>({
    isSending: false,
    message: null,
    error: null,
  });
  const [deleteState, setDeleteState] = useState<{
    isOpen: boolean;
    isSubmitting: boolean;
    confirmationText: string;
    error: string | null;
  }>({
    isOpen: false,
    isSubmitting: false,
    confirmationText: '',
    error: null,
  });
  const avatarUri = getAvatarUri(formData.avatar);
  const filteredSchools = prioritizeSchoolsByEnrollment(
    schools.filter(school =>
      school.name.toLowerCase().includes(schoolQuery.trim().toLowerCase()),
    ),
    formData.grade,
  );

  useEffect(() => {
    if (isOpen) {
      setFormData(user);
      setIsEditing(false);
      setSchoolPickerOpen(false);
      setSchoolQuery('');
      setVerificationState({
        isSending: false,
        message: null,
        error: null,
      });
      setDeleteState({
        isOpen: false,
        isSubmitting: false,
        confirmationText: '',
        error: null,
      });
    }
  }, [isOpen, user]);

  function handleChange(field: keyof UserProfile, value: string) {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleAvatarChange(nextAvatar: LocalAvatarKey) {
    setFormData(prev => ({
      ...prev,
      avatar: nextAvatar,
      gender: nextAvatar === 'avatar-afro-girl' ? 'female' : prev.gender,
    }));
  }

  async function handleResendVerification() {
    setVerificationState({
      isSending: true,
      message: null,
      error: null,
    });

    try {
      const message = await onResendVerification();
      setVerificationState({
        isSending: false,
        message,
        error: null,
      });
    } catch (error) {
      setVerificationState({
        isSending: false,
        message: null,
        error: error instanceof Error ? error.message : 'Could not send verification email.',
      });
    }
  }

  async function handleDeleteAccount() {
    setDeleteState(current => ({
      ...current,
      isSubmitting: true,
      error: null,
    }));

    try {
      await onDeleteAccount();
    } catch (error) {
      setDeleteState({
        isOpen: true,
        isSubmitting: false,
        confirmationText: deleteState.confirmationText,
        error: error instanceof Error ? error.message : 'Could not delete account.',
      });
    }
  }

  function renderSelectField(label: string, field: EditableField, options: string[]) {
    return (
      <View style={styles.detailBlock}>
        <Text style={styles.detailLabel}>{label}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.optionRail}>
          {options.map(option => {
            const isSelected = (formData[field] || '') === option;

            return (
              <Pressable
                key={option}
                onPress={() => handleChange(field, option)}
                style={({ pressed }) => [
                  styles.optionChip,
                  isSelected && styles.optionChipActive,
                  pressed && styles.optionChipPressed,
                ]}>
                <Text
                  style={[
                    styles.optionChipText,
                    isSelected && styles.optionChipTextActive,
                  ]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <Modal
      animationType="fade"
      transparent
      visible={isOpen}
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.card}>
          <LinearGradient
            colors={['#3B82F6', '#8B5CF6', '#4F46E5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X color="#FFFFFF" size={20} strokeWidth={2.5} />
            </Pressable>
          </LinearGradient>

          {!isEditing && (showTeacherPortalButton || showAdminPortalButton) ? (
            <View style={styles.portalRow}>
              {showTeacherPortalButton ? (
                <Pressable
                  onPress={onOpenTeacher}
                  style={[styles.portalButton, styles.teacherPortalButton]}>
                  <GraduationCap color="#2563EB" size={14} strokeWidth={2.4} />
                  <Text style={styles.teacherPortalText}>Teachers Portal</Text>
                </Pressable>
              ) : null}

              {showAdminPortalButton ? (
                <Pressable
                  onPress={onOpenAdmin}
                  style={[styles.portalButton, styles.adminPortalButton]}>
                  <Text style={styles.adminPortalText}>Admin</Text>
                  <ChevronRight color="#7C3AED" size={14} strokeWidth={2.5} />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <View pointerEvents="box-none" style={styles.avatarWrap}>
            <Pressable onPress={() => setIsEditing(true)} style={styles.avatarPressable}>
              {formData.avatar && isLocalAvatarKey(formData.avatar) ? (
                <AvatarArt avatarKey={formData.avatar} size={100} />
              ) : avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <User color="#94A3B8" size={40} strokeWidth={2.1} />
                </View>
              )}
              <View style={styles.cameraBadge}>
                <Camera color="#FFFFFF" size={14} strokeWidth={2.4} />
              </View>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}>
            <View style={styles.identityBlock}>
              {isEditing ? (
                <TextInput
                  value={formData.name}
                  onChangeText={text => handleChange('name', text)}
                  placeholder="Your Name"
                  placeholderTextColor="#CBD5E1"
                  style={styles.nameInput}
                />
              ) : (
                <Pressable onPress={() => setIsEditing(true)}>
                  <Text style={styles.nameText}>{formData.name}</Text>
                </Pressable>
              )}
              <Text style={styles.roleText}>{formData.role || 'Student Account'}</Text>
            </View>

            {canResendVerification ? (
              <View style={styles.verificationCard}>
                <View style={styles.verificationCopy}>
                  <Text style={styles.verificationTitle}>Verify your email</Text>
                  <Text style={styles.verificationBody}>
                    Confirm your email address to secure account recovery and verification flows.
                  </Text>
                </View>
                <Pressable
                  onPress={handleResendVerification}
                  disabled={verificationState.isSending}
                  style={({ pressed }) => [
                    styles.verificationButton,
                    pressed && styles.optionChipPressed,
                    verificationState.isSending && styles.verificationButtonDisabled,
                  ]}>
                  {verificationState.isSending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.verificationButtonText}>Resend email</Text>
                  )}
                </Pressable>
                {verificationState.message ? (
                  <Text style={styles.verificationSuccess}>{verificationState.message}</Text>
                ) : null}
                {verificationState.error ? (
                  <Text style={styles.verificationError}>{verificationState.error}</Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.verificationCard}>
              <View style={styles.verificationCopy}>
                <Text style={styles.verificationTitle}>Subscription</Text>
                <Text style={styles.verificationBody}>
                  {billingStatus.subscription
                    ? `${billingStatus.subscription.name} active until ${new Date(billingStatus.subscription.periodEnd).toLocaleDateString()}`
                    : 'No active subscription. Premium learning actions will prompt an M-Pesa checkout.'}
                </Text>
                {billingStatus.maskedMpesaPhoneNumber ? (
                  <Text style={styles.verificationBody}>
                    Saved M-Pesa number: {billingStatus.maskedMpesaPhoneNumber}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={onManageSubscription}
                style={({ pressed }) => [
                  styles.verificationButton,
                  pressed && styles.optionChipPressed,
                ]}>
                <Text style={styles.verificationButtonText}>
                  {billingStatus.subscription ? 'Change plan' : 'Subscribe now'}
                </Text>
              </Pressable>
            </View>

            <FocusModeProfileCard
              active={focusModeActive}
              setupRequired={focusModeSetupRequired}
              error={focusModeError}
              secondsRemaining={focusModeSecondsRemaining}
              limitSeconds={dailyLimitSeconds}
              isStarting={isStartingFocusMode}
              onStart={onStartFocusMode}
              onOpenSettings={onOpenFocusModeSettings}
            />

            <View style={styles.accountSection}>
              <SubjectSelector
                allSubjects={allSubjects}
                selectedSubjectIds={selectedSubjectIds}
                onToggleSubject={onToggleSubject}
              />
            </View>

            {isEditing ? (
              <View style={styles.avatarOptionsSection}>
                <Text style={styles.avatarOptionsLabel}>Choose Avatar</Text>
                <View style={styles.avatarOptionsGrid}>
                  {LOCAL_AVATAR_OPTIONS.map(option => {
                    const isSelected = formData.avatar === option.key;

                    return (
                      <Pressable
                        key={option.key}
                        onPress={() => handleAvatarChange(option.key)}
                        style={[
                          styles.avatarOption,
                          isSelected && styles.avatarOptionSelected,
                        ]}>
                        <AvatarArt avatarKey={option.key} size={60} />
                        <Text style={styles.avatarOptionLabel}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {isEditing ? (
              <>
                {renderSelectField('Grade', 'grade', [...SUPPORTED_GRADES])}
                {renderSelectField('Gender', 'gender', GENDER_OPTIONS)}
                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>School</Text>
                  <Pressable
                    onPress={() => setSchoolPickerOpen(open => !open)}
                    style={({ pressed }) => [
                      styles.schoolSelectShell,
                      schoolPickerOpen && styles.schoolSelectShellActive,
                      pressed && styles.optionChipPressed,
                    ]}>
                    <Text style={styles.schoolSelectValue}>
                      {formData.school || 'Select your school'}
                    </Text>
                    <ChevronDown
                      color="#64748B"
                      size={18}
                      strokeWidth={2.2}
                      style={schoolPickerOpen ? styles.chevronOpen : undefined}
                    />
                  </Pressable>
                  {schoolPickerOpen ? (
                    <View style={styles.schoolDropdown}>
                      <View style={styles.schoolSearchRow}>
                        <Search color="#94A3B8" size={16} strokeWidth={2.3} />
                        <TextInput
                          value={schoolQuery}
                          onChangeText={setSchoolQuery}
                          placeholder="Type to find a school"
                          placeholderTextColor="#94A3B8"
                          style={styles.schoolSearchInput}
                        />
                      </View>
                      <ScrollView
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={false}
                        style={styles.schoolResultsList}>
                        {filteredSchools.length ? (
                          filteredSchools.map(school => {
                            const isSelected = formData.school === school.name;
                            return (
                              <Pressable
                                key={school.id}
                                onPress={() => {
                                  handleChange('school', school.name);
                                  setSchoolQuery('');
                                  setSchoolPickerOpen(false);
                                }}
                                style={({ pressed }) => [
                                  styles.schoolOption,
                                  isSelected && styles.schoolOptionActive,
                                  pressed && styles.optionChipPressed,
                                ]}>
                                <View style={styles.schoolOptionTextWrap}>
                                  <Text style={styles.schoolOptionName}>{school.name}</Text>
                                  <Text style={styles.schoolOptionMeta}>{school.location}</Text>
                                </View>
                                {isSelected ? (
                                  <Check color="#2563EB" size={16} strokeWidth={2.6} />
                                ) : null}
                              </Pressable>
                            );
                          })
                        ) : (
                          <Text style={styles.schoolEmptyText}>No matching schools.</Text>
                        )}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>

                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <TextInput
                    value={formData.email || ''}
                    onChangeText={text => handleChange('email', text)}
                    placeholder="student@school.edu"
                    placeholderTextColor="#94A3B8"
                    style={styles.textField}
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <TextInput
                    value={formData.phone || ''}
                    onChangeText={text => handleChange('phone', text)}
                    placeholder="+254..."
                    placeholderTextColor="#94A3B8"
                    style={styles.textField}
                    keyboardType="phone-pad"
                  />
                </View>
              </>
            ) : (
              <View style={styles.readOnlyList}>
                {[
                  { label: 'Grade', value: formData.grade || 'N/A' },
                  { label: 'Gender', value: formData.gender || 'N/A' },
                  { label: 'School', value: formData.school || 'N/A' },
                  { label: 'Email', value: formData.email || 'N/A' },
                  { label: 'Phone', value: formData.phone || 'N/A' },
                ].map(item => (
                  <Pressable
                    key={item.label}
                    onPress={() => setIsEditing(true)}
                    style={styles.readOnlyRow}>
                    <View style={styles.readOnlyTextWrap}>
                      <Text style={styles.readOnlyLabel}>{item.label}</Text>
                      <Text style={styles.readOnlyValue}>{item.value}</Text>
                    </View>
                  </Pressable>
                ))}
                <View style={styles.accountDeletionPanel}>
                  <Text style={styles.accountDeletionTitle}>Account deletion</Text>
                  <Text style={styles.accountDeletionCopy}>
                    Request deletion only if you want this account and its data removed from our servers.
                    Requests are fulfilled in 30 days.
                  </Text>
                  <Pressable
                    onPress={() =>
                      setDeleteState({
                        isOpen: true,
                        isSubmitting: false,
                        confirmationText: '',
                        error: null,
                      })
                    }
                    style={({ pressed }) => [
                      styles.accountDeletionButton,
                      pressed && styles.footerButtonPressed,
                    ]}>
                    <Text style={styles.accountDeletionButtonText}>Request Account Deletion</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <View style={styles.footerSpacer} />
          </ScrollView>

          <View style={styles.footer}>
            {isEditing ? (
              <Pressable
                onPress={() => {
                  onSave(formData);
                  setIsEditing(false);
                  setSchoolPickerOpen(false);
                  setSchoolQuery('');
                }}
                style={({ pressed }) => [
                  styles.primaryFooterButton,
                  pressed && styles.footerButtonPressed,
                ]}>
                <Text style={styles.primaryFooterButtonText}>Save Changes</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={onSignOut}
                style={({ pressed }) => [
                  styles.secondaryFooterButton,
                  pressed && styles.footerButtonPressed,
                ]}>
                <Text style={styles.secondaryFooterButtonText}>Sign Out</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={deleteState.isOpen}
        onRequestClose={() =>
          setDeleteState({
            isOpen: false,
            isSubmitting: false,
            confirmationText: '',
            error: null,
          })
        }>
        <View style={styles.overlay}>
          <Pressable
            style={styles.backdrop}
            onPress={() =>
              setDeleteState({
                isOpen: false,
                isSubmitting: false,
                confirmationText: '',
                error: null,
              })
            }
          />
          <View style={styles.deleteDialog}>
            <Text style={styles.deleteDialogTitle}>Delete account?</Text>
            <Text style={styles.deleteDialogCopy}>
              This creates an account deletion request. You will be signed out now, and all account data
              will be deleted from our servers in 30 days.
            </Text>
            <Text style={styles.deleteDialogCopy}>
              Type DELETE MY ACCOUNT to continue.
            </Text>
            <TextInput
              value={deleteState.confirmationText}
              onChangeText={confirmationText =>
                setDeleteState(current => ({
                  ...current,
                  confirmationText,
                  error: null,
                }))
              }
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!deleteState.isSubmitting}
              placeholder="DELETE MY ACCOUNT"
              placeholderTextColor="#94A3B8"
              style={styles.deleteConfirmationInput}
            />
            {deleteState.error ? (
              <Text style={styles.verificationError}>{deleteState.error}</Text>
            ) : null}
            <View style={styles.footerActionRow}>
              <Pressable
                onPress={() =>
                  setDeleteState({
                    isOpen: false,
                    isSubmitting: false,
                    confirmationText: '',
                    error: null,
                  })
                }
                style={({ pressed }) => [
                  styles.secondaryFooterButton,
                  styles.footerActionButton,
                  pressed && styles.footerButtonPressed,
                ]}>
                <Text style={styles.secondaryFooterButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteAccount}
                disabled={deleteState.isSubmitting || deleteState.confirmationText !== 'DELETE MY ACCOUNT'}
                style={({ pressed }) => [
                  styles.dangerFooterButton,
                  styles.footerActionButton,
                  pressed && styles.footerButtonPressed,
                  (deleteState.isSubmitting || deleteState.confirmationText !== 'DELETE MY ACCOUNT') &&
                    styles.footerButtonDisabled,
                ]}>
                {deleteState.isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.dangerFooterButtonText}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

function FocusModeProfileCard({
  active,
  setupRequired,
  error,
  secondsRemaining,
  limitSeconds,
  isStarting,
  onStart,
  onOpenSettings,
}: {
  active: boolean;
  setupRequired: boolean;
  error: string | null;
  secondsRemaining: number;
  limitSeconds: number;
  isStarting: boolean;
  onStart: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <View style={styles.focusCard}>
      <View style={styles.focusHeader}>
        <View style={styles.focusIcon}>
          <ShieldCheck color="#0F766E" size={21} strokeWidth={2.5} />
        </View>
        <View style={styles.focusTitleWrap}>
          <Text style={styles.focusTitle}>Focus Mode</Text>
          <Text style={styles.focusMeta}>Default session: {formatDuration(limitSeconds)}</Text>
        </View>
      </View>
      <Text style={styles.focusBody}>
        Focus Mode keeps KITABU on screen while your child learns.
      </Text>
      <Text style={styles.focusBody}>
        To leave Focus Mode, Android will ask for your phone PIN.
      </Text>
      <Text style={styles.focusBody}>KITABU does not create a separate PIN.</Text>

      {active ? (
        <View style={styles.focusStatusRow}>
          <Clock3 color="#0F766E" size={16} strokeWidth={2.4} />
          <Text style={styles.focusStatusText}>
            Active - {formatDuration(secondsRemaining)} remaining
          </Text>
        </View>
      ) : null}

      {setupRequired ? (
        <View style={styles.focusSetupBox}>
          <Text style={styles.focusSetupTitle}>
            Turn on App Pinning to keep KITABU on screen.
          </Text>
          <Text style={styles.focusSetupText}>
            After turning it on, Android will ask for your phone PIN when someone tries to leave KITABU.
          </Text>
          <Text style={styles.focusSetupText}>
            If the phone does not have a PIN, set one in Android security settings first.
          </Text>
          <Pressable onPress={onOpenSettings} style={styles.focusSettingsButton}>
            <Settings color="#0F766E" size={17} strokeWidth={2.4} />
            <Text style={styles.focusSettingsButtonText}>Open Settings</Text>
          </Pressable>
        </View>
      ) : null}

      {error ? <Text style={styles.focusError}>{error}</Text> : null}

      <Pressable
        disabled={active || isStarting}
        onPress={onStart}
        style={({ pressed }) => [
          styles.focusStartButton,
          pressed && styles.footerButtonPressed,
          (active || isStarting) && styles.footerButtonDisabled,
        ]}>
        {isStarting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.focusStartButtonText}>Start Focus Mode</Text>
        )}
      </Pressable>
    </View>
  );
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${Math.max(1, minutes)}m`;
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    maxHeight: '92%',
    overflow: 'hidden',
    width: '100%',
  },
  headerGradient: {
    height: 128,
  },
  closeButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    marginRight: 16,
    marginTop: 16,
    width: 36,
  },
  portalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -6,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  portalButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#F3F4F6',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 4,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  teacherPortalButton: {},
  adminPortalButton: {},
  portalButtonDisabled: {
    opacity: 0.45,
  },
  teacherPortalText: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '800',
  },
  adminPortalText: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '800',
  },
  avatarWrap: {
    alignItems: 'center',
    marginTop: -30,
    zIndex: 11,
  },
  avatarPressable: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 6,
    elevation: 4,
    height: 112,
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    width: 112,
  },
  avatarImage: {
    borderRadius: 999,
    height: '100%',
    width: '100%',
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  cameraBadge: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 999,
    bottom: 2,
    height: 30,
    justifyContent: 'center',
    position: 'absolute',
    right: 2,
    width: 30,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  identityBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  nameText: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  nameInput: {
    borderBottomColor: '#DBEAFE',
    borderBottomWidth: 2,
    color: '#111827',
    fontSize: 24,
    fontWeight: '700',
    paddingBottom: 8,
    textAlign: 'center',
    width: '100%',
  },
  roleText: {
    color: '#6B7280',
    fontSize: 14,
  },
  verificationCard: {
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    padding: 16,
    marginBottom: 20,
    gap: 10,
  },
  verificationCopy: {
    gap: 4,
  },
  verificationTitle: {
    color: '#1E1B4B',
    fontSize: 15,
    fontWeight: '800',
  },
  verificationBody: {
    color: '#4338CA',
    fontSize: 13,
    lineHeight: 19,
  },
  verificationButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#312E81',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationButtonDisabled: {
    opacity: 0.75,
  },
  verificationButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  verificationSuccess: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '700',
  },
  verificationError: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
  },
  focusCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#99F6E4',
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    marginBottom: 20,
    padding: 16,
  },
  focusHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  focusIcon: {
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    borderRadius: 16,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  focusTitleWrap: {
    flex: 1,
  },
  focusTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
  },
  focusMeta: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  focusBody: {
    color: '#134E4A',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  focusStatusRow: {
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 7,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  focusStatusText: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '900',
  },
  focusSetupBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#99F6E4',
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginTop: 4,
    padding: 12,
  },
  focusSetupTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },
  focusSetupText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
  },
  focusSettingsButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#CCFBF1',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  focusSettingsButtonText: {
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '900',
  },
  focusError: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '800',
  },
  focusStartButton: {
    alignItems: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 46,
  },
  focusStartButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  accountSection: {
    marginBottom: 20,
  },
  avatarOptionsSection: {
    marginBottom: 20,
  },
  avatarOptionsLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    marginBottom: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  avatarOptionsGrid: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  avatarOption: {
    alignItems: 'center',
    borderColor: '#E5E7EB',
    borderRadius: 24,
    borderWidth: 2,
    opacity: 0.9,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  avatarOptionSelected: {
    borderColor: '#3B82F6',
    opacity: 1,
    transform: [{ scale: 1.03 }],
  },
  avatarOptionImage: {
    height: 48,
    width: 48,
  },
  avatarOptionLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
  },
  detailBlock: {
    marginBottom: 18,
  },
  detailLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    marginBottom: 8,
    marginLeft: 2,
    textTransform: 'uppercase',
  },
  optionRail: {
    gap: 8,
  },
  optionChip: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  optionChipPressed: {
    opacity: 0.82,
  },
  optionChipText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },
  optionChipTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  schoolSelectShell: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 54,
    paddingHorizontal: 16,
  },
  schoolSelectShellActive: {
    borderColor: '#93C5FD',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  schoolSelectValue: {
    color: '#0F172A',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    paddingRight: 12,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  schoolDropdown: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  schoolSearchRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  schoolSearchInput: {
    color: '#0F172A',
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  schoolResultsList: {
    marginTop: 10,
    maxHeight: 180,
  },
  schoolOption: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  schoolOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  schoolOptionTextWrap: {
    flex: 1,
    gap: 3,
  },
  schoolOptionName: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  schoolOptionMeta: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  schoolEmptyText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 14,
  },
  textField: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readOnlyList: {
    marginBottom: 10,
  },
  readOnlyRow: {
    borderBottomColor: '#F3F4F6',
    borderBottomWidth: 1,
    paddingVertical: 14,
  },
  readOnlyTextWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  readOnlyLabel: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  readOnlyValue: {
    color: '#111827',
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 12,
    textAlign: 'right',
    textTransform: 'capitalize',
  },
  accountDeletionPanel: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginTop: 18,
    padding: 14,
  },
  accountDeletionTitle: {
    color: '#78350F',
    fontSize: 14,
    fontWeight: '900',
  },
  accountDeletionCopy: {
    color: '#92400E',
    fontSize: 13,
    lineHeight: 19,
  },
  accountDeletionButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  accountDeletionButtonText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '900',
  },
  footerSpacer: {
    height: 88,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#F9FAFB',
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    padding: 24,
    position: 'absolute',
    right: 0,
  },
  footerActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  footerActionButton: {
    flex: 1,
  },
  primaryFooterButton: {
    backgroundColor: '#2563EB',
    borderRadius: 18,
    paddingVertical: 15,
  },
  primaryFooterButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  secondaryFooterButton: {
    backgroundColor: '#FEF2F2',
    borderRadius: 18,
    paddingVertical: 15,
  },
  secondaryFooterButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  dangerFooterButton: {
    backgroundColor: '#B91C1C',
    borderRadius: 18,
    paddingVertical: 15,
  },
  dangerFooterButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  footerButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  footerButtonDisabled: {
    opacity: 0.7,
  },
  deleteDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    gap: 14,
    maxWidth: 420,
    padding: 20,
    width: '100%',
  },
  deleteDialogTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900',
  },
  deleteDialogCopy: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
  },
  deleteConfirmationInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: 14,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
