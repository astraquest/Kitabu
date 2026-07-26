import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
  Camera,
  ChevronRight,
  ChevronDown,
  Check,
  GraduationCap,
  Pencil,
  ShieldCheck,
  User,
  X,
} from 'lucide-react-native';

import { SchoolData, Subject, UserProfile } from '../types/app';
import type { BillingStatus } from '../types/app';
import { SUPPORTED_GRADES } from '../constants/grades';
import { AvatarArt, isLocalAvatarKey } from './AvatarArt';
import { CountryFlagIcon } from './CountryFlagIcon';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdmin: () => void;
  onOpenTeacher: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => Promise<void>;
  showTeacherPortalButton: boolean;
  showAdminPortalButton: boolean;
  canResendVerification?: boolean;
  onResendVerification?: () => Promise<string>;
  billingStatus: BillingStatus;
  externalPaymentsEnabled?: boolean;
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
  onSwapSubject: (replacedSubjectId: string, addedSubjectId: string) => void;
  subscriptionCheckoutOverlay?: React.ReactNode;
}

const GENDER_OPTIONS: UserProfile['gender'][] = [
  'Not Specified',
  'male',
  'female',
];

type EditableField = 'grade' | 'gender' | 'school';

const MAX_PROFILE_SUBJECTS = 5;
const SUBJECT_CARD_TONES = [
  ['#D9E9FF', '#BBD6FF'],
  ['#D8F8E5', '#B9ECCF'],
  ['#FFE0EF', '#F9BFD7'],
  ['#F0DFFF', '#DCC2FB'],
  ['#D9F7E6', '#B8E9CE'],
  ['#FFECCF', '#FFD59C'],
  ['#FFE3D3', '#FFC5A6'],
  ['#E1E6FF', '#C4CCFA'],
] as const;

const SUBJECT_ORDER = [
  'mathematics',
  'english',
  'kiswahili',
  'environmental',
  'creative_activities',
  'cre',
  'ire',
  'hre',
  'indigenous_languages',
  'hygiene_nutrition',
  'science',
  'agriculture',
  'creative_arts',
  'math',
  'ai_education',
  'social',
];

type ProfileCountryOption = {
  code: string;
  name: string;
};

const PROFILE_COUNTRIES: readonly ProfileCountryOption[] = [
  { code: 'KE', name: 'Kenya' },
  { code: 'UG', name: 'Uganda' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'ET', name: 'Ethiopia' },
];

const KENYAN_COUNTIES = [
  'Baringo',
  'Bomet',
  'Bungoma',
  'Busia',
  'Elgeyo-Marakwet',
  'Embu',
  'Garissa',
  'Homa Bay',
  'Isiolo',
  'Kajiado',
  'Kakamega',
  'Kericho',
  'Kiambu',
  'Kilifi',
  'Kirinyaga',
  'Kisii',
  'Kisumu',
  'Kitui',
  'Kwale',
  'Laikipia',
  'Lamu',
  'Machakos',
  'Makueni',
  'Mandera',
  'Marsabit',
  'Meru',
  'Migori',
  'Mombasa',
  "Murang'a",
  'Nairobi City',
  'Nakuru',
  'Nandi',
  'Narok',
  'Nyandarua',
  'Nyamira',
  'Nyeri',
  'Samburu',
  'Siaya',
  'Taita-Taveta',
  'Tana River',
  'Tharaka-Nithi',
  'Trans-Nzoia',
  'Turkana',
  'Uasin Gishu',
  'Vihiga',
  'Wajir',
  'West Pokot',
] as const;

const UGANDA_DISTRICTS = [
  'Kampala',
  'Wakiso',
  'Mukono',
  'Mpigi',
  'Buikwe',
  'Luwero',
  'Nakaseke',
  'Nakasongola',
  'Kayunga',
  'Mityana',
  'Mubende',
  'Kiboga',
  'Jinja',
  'Iganga',
  'Kamuli',
  'Mayuge',
  'Bugiri',
  'Busia',
  'Tororo',
  'Namutumba',
  'Kaliro',
  'Mbale',
  'Sironko',
  'Kapchorwa',
  'Budaka',
  'Pallisa',
  'Bududa',
  'Manafwa',
  'Soroti',
  'Kumi',
  'Katakwi',
  'Bukedea',
  'Serere',
  'Lira',
  'Dokolo',
  'Apac',
  'Oyam',
  'Kole',
  'Gulu',
  'Amuru',
  'Nwoya',
  'Kitgum',
  'Pader',
  'Agago',
  'Lamwo',
  'Arua',
  'Nebbi',
  'Zombo',
  'Adjumani',
  'Moyo',
  'Yumbe',
  'Koboko',
  'Maracha',
  'Masaka',
  'Kalangala',
  'Rakai',
  'Lyantonde',
  'Sembabule',
  'Mbarara',
  'Bushenyi',
  'Ntungamo',
  'Kabale',
  'Kisoro',
  'Rukungiri',
  'Kanungu',
  'Ibanda',
  'Isingiro',
  'Kiruhura',
  'Hoima',
  'Masindi',
  'Kibaale',
  'Buliisa',
  'Kabarole',
  'Kasese',
  'Kamwenge',
  'Kyenjojo',
  'Bundibugyo',
  'Moroto',
  'Kotido',
  'Kaabong',
  'Nakapiripirit',
] as const;

const TANZANIA_REGIONS = [
  'Arusha',
  'Dar es Salaam',
  'Dodoma',
  'Geita',
  'Iringa',
  'Kagera',
  'Katavi',
  'Kigoma',
  'Kilimanjaro',
  'Lindi',
  'Manyara',
  'Mara',
  'Mbeya',
  'Morogoro',
  'Mtwara',
  'Mwanza',
  'Njombe',
  'Pemba North',
  'Pemba South',
  'Pwani (Coast)',
  'Rukwa',
  'Ruvuma',
  'Shinyanga',
  'Simiyu',
  'Singida',
  'Songwe',
  'Tabora',
  'Tanga',
  'Zanzibar North (Unguja North)',
  'Zanzibar South (Unguja South)',
  'Zanzibar West (Mjini Magharibi)',
] as const;

const RWANDA_PROVINCES = [
  'Kigali City',
  'Northern Province',
  'Southern Province',
  'Eastern Province',
  'Western Province',
] as const;

const ETHIOPIA_STATES = [
  'Addis Ababa (Chartered City)',
  'Dire Dawa (Chartered City)',
  'Afar',
  'Amhara',
  'Benishangul-Gumuz',
  'Central Ethiopia',
  'Gambela',
  'Harari',
  'Oromia',
  'Sidama',
  'Somali',
  'South Ethiopia',
  'South West Ethiopia Peoples',
  'Tigray',
] as const;

const PROFILE_REGION_META: Record<
  string,
  { label: string; emptyLabel: string; options: readonly string[] }
> = {
  KE: {
    label: 'County',
    emptyLabel: 'Select county',
    options: KENYAN_COUNTIES,
  },
  UG: {
    label: 'District',
    emptyLabel: 'Select district',
    options: UGANDA_DISTRICTS,
  },
  TZ: {
    label: 'Region',
    emptyLabel: 'Select region',
    options: TANZANIA_REGIONS,
  },
  RW: {
    label: 'Province',
    emptyLabel: 'Select province',
    options: RWANDA_PROVINCES,
  },
  ET: { label: 'State', emptyLabel: 'Select state', options: ETHIOPIA_STATES },
};

function getAvatarUri(value?: string) {
  if (!value) {
    return null;
  }

  if (value.startsWith('avatar-seed-')) {
    const normalizedSeed = value.replace(/^avatar-seed-/, '');
    return `https://api.dicebear.com/7.x/adventurer/png?seed=${encodeURIComponent(
      normalizedSeed,
    )}`;
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value.replace('/svg?seed=', '/png?seed=').replace('/svg/', '/png/');
  }

  return `https://api.dicebear.com/7.x/adventurer/png?seed=${encodeURIComponent(
    value,
  )}`;
}

function normalizeRegionName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(
      /\b(county|region|province|district|state|kenya|uganda|tanzania|rwanda|ethiopia)\b/g,
      '',
    )
    .replace(/\s+city$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function regionMatchesLocation(region: string, location: string) {
  return normalizeRegionName(region) === normalizeRegionName(location);
}

function getProfileCountry(value?: string) {
  const normalized = value?.trim().toLowerCase();
  return (
    PROFILE_COUNTRIES.find(
      country =>
        country.name.toLowerCase() === normalized ||
        country.code.toLowerCase() === normalized,
    ) ?? PROFILE_COUNTRIES[0]
  );
}

function compareProfileLabels(left: string, right: string) {
  return left.localeCompare(right, undefined, { sensitivity: 'base' });
}

function getSchoolRegionOptions(countryCode: string, schools: SchoolData[]) {
  const regionMeta = PROFILE_REGION_META[countryCode] ?? PROFILE_REGION_META.KE;
  const schoolLocations = Array.from(
    new Set(schools.map(school => school.location.trim()).filter(Boolean)),
  );

  if (countryCode !== 'KE') {
    return [...regionMeta.options].sort(compareProfileLabels);
  }

  const officialOptions = [...regionMeta.options];
  const extraOptions = schoolLocations.filter(
    location =>
      !officialOptions.some(option => regionMatchesLocation(option, location)),
  );

  return [...officialOptions, ...extraOptions].sort(compareProfileLabels);
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
  billingStatus,
  externalPaymentsEnabled = true,
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
  onSwapSubject,
  subscriptionCheckoutOverlay,
}: ProfileModalProps) {
  const [editCardVisible, setEditCardVisible] = useState(false);
  const [accountToolsOpen, setAccountToolsOpen] = useState(false);
  const [lockModalVisible, setLockModalVisible] = useState(false);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [schoolPickerOpen, setSchoolPickerOpen] = useState(false);
  const [schoolQuery, setSchoolQuery] = useState('');
  const [swapCandidate, setSwapCandidate] = useState<Subject | null>(null);
  const [formData, setFormData] = useState<UserProfile>(user);
  const editCardProgress = useRef(new Animated.Value(0)).current;
  const lockModalProgress = useRef(new Animated.Value(0)).current;
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
  const orderedSubjects = useMemo(
    () => orderProfileSubjects(allSubjects),
    [allSubjects],
  );
  const selectedSubjectCount = selectedSubjectIds.length;
  const selectedSubjects = useMemo(
    () => orderedSubjects.filter(subject => selectedSubjectIds.includes(subject.id)),
    [orderedSubjects, selectedSubjectIds],
  );

  useEffect(() => {
    if (
      !isOpen ||
      selectedSubjectCount < MAX_PROFILE_SUBJECTS ||
      (swapCandidate && selectedSubjectIds.includes(swapCandidate.id))
    ) {
      setSwapCandidate(null);
    }
  }, [isOpen, selectedSubjectCount, selectedSubjectIds, swapCandidate]);
  const selectedCountry = useMemo(
    () => getProfileCountry(formData.country),
    [formData.country],
  );
  const regionMeta =
    PROFILE_REGION_META[selectedCountry.code] ?? PROFILE_REGION_META.KE;
  const schoolSummary = formData.school?.trim();
  const genderSummary =
    formData.gender && formData.gender !== 'Not Specified'
      ? formData.gender
      : '';
  const gradeSummary = formData.grade?.trim();
  const countrySummary = formData.country?.trim();
  const regionSummary = formData.county?.trim();
  const emailSummary = formData.email?.trim();
  const phoneSummary = formData.phone?.trim();
  const hasHeroDetails = Boolean(
    genderSummary || gradeSummary || countrySummary,
  );
  const hasHeroContacts = Boolean(emailSummary || phoneSummary);
  const regionOptions = useMemo(
    () => getSchoolRegionOptions(selectedCountry.code, schools),
    [schools, selectedCountry.code],
  );
  const filteredSchools = useMemo(
    () =>
      formData.county
        ? schools
            .filter(
              school =>
                regionMatchesLocation(formData.county || '', school.location) &&
                school.name
                  .toLowerCase()
                  .includes(schoolQuery.trim().toLowerCase()),
            )
            .sort((left, right) => compareProfileLabels(left.name, right.name))
        : [],
    [formData.county, schoolQuery, schools],
  );

  useEffect(() => {
    if (isOpen) {
      setFormData(user);
      setEditCardVisible(false);
      setAccountToolsOpen(false);
      setLockModalVisible(false);
      setCountryPickerOpen(false);
      setRegionPickerOpen(false);
      setSchoolPickerOpen(false);
      setSchoolQuery('');
      editCardProgress.setValue(0);
      lockModalProgress.setValue(0);
      setDeleteState({
        isOpen: false,
        isSubmitting: false,
        confirmationText: '',
        error: null,
      });
    }
  }, [editCardProgress, isOpen, lockModalProgress, user]);

  function openEditCard() {
    setFormData(user);
    setCountryPickerOpen(false);
    setRegionPickerOpen(false);
    setSchoolPickerOpen(false);
    setSchoolQuery('');
    editCardProgress.setValue(0);
    setEditCardVisible(true);
    Animated.timing(editCardProgress, {
      toValue: 1,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }

  function closeEditCard({ reset = true }: { reset?: boolean } = {}) {
    Animated.timing(editCardProgress, {
      toValue: 0,
      duration: 190,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        if (reset) {
          setFormData(user);
        }
        setEditCardVisible(false);
      }
    });
  }

  function saveEditCard() {
    onSave(formData);
    closeEditCard({ reset: false });
  }

  function handleSwapSubject(replacedSubjectId: string) {
    if (!swapCandidate) {
      return;
    }

    onSwapSubject(replacedSubjectId, swapCandidate.id);
    setSwapCandidate(null);
  }

  function openLockModal() {
    lockModalProgress.setValue(0);
    setLockModalVisible(true);
    Animated.timing(lockModalProgress, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }

  function closeLockModal() {
    Animated.timing(lockModalProgress, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setLockModalVisible(false);
      }
    });
  }

  function handleLockPhoneAction() {
    if (focusModeSetupRequired) {
      closeLockModal();
      onOpenFocusModeSettings();
      return;
    }

    onStartFocusMode();
    closeLockModal();
  }

  function handleChange(field: keyof UserProfile, value: string) {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
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
        error:
          error instanceof Error ? error.message : 'Could not delete account.',
      });
    }
  }

  function selectCountry(country: ProfileCountryOption) {
    setFormData(prev => ({
      ...prev,
      country: country.name,
      county: '',
      school: '',
    }));
    setCountryPickerOpen(false);
    setRegionPickerOpen(false);
    setSchoolPickerOpen(false);
    setSchoolQuery('');
  }

  function selectRegion(region: string) {
    setFormData(prev => ({
      ...prev,
      county: region,
      school: '',
    }));
    setRegionPickerOpen(false);
    setSchoolPickerOpen(true);
    setSchoolQuery('');
  }

  function selectSchool(school: SchoolData) {
    setFormData(prev => ({
      ...prev,
      school: school.name,
      county: school.location || prev.county,
    }));
    setSchoolPickerOpen(false);
    setSchoolQuery('');
  }

  function renderSelectField(
    label: string,
    field: EditableField,
    options: string[],
  ) {
    return (
      <View style={styles.detailBlock}>
        <Text style={styles.detailLabel}>{label}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.optionRail}
        >
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
                ]}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    isSelected && styles.optionChipTextActive,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  const lockModalTranslateY = lockModalProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 0],
  });
  const lockModalScale = lockModalProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });
  const editCardTranslateY = editCardProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-46, 0],
  });
  const editCardScale = editCardProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });

  return (
    <Modal
      animationType="fade"
      transparent
      visible={isOpen}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.card}>
          <View style={styles.sheetHeader}>
            <LinearGradient
              colors={['#F97316', '#F59E0B', '#16A34A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.headerAccent}
            />
            <View style={styles.sheetTitleRow}>
              <View style={styles.sheetTitleIcon}>
                <User color="#0F172A" size={20} strokeWidth={2.5} />
              </View>
              <Text style={styles.sheetTitle}>Account Profile</Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <X color="#334155" size={19} strokeWidth={2.6} />
              </Pressable>
            </View>
            <LinearGradient
              colors={['#F97316', '#F59E0B', '#16A34A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accountHero}
            >
              <View style={styles.heroMainRow}>
                <Pressable
                  onPress={openEditCard}
                  style={styles.compactAvatarPressable}
                >
                  {formData.avatar && isLocalAvatarKey(formData.avatar) ? (
                    <AvatarArt avatarKey={formData.avatar} size={62} />
                  ) : avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <User color="#94A3B8" size={28} strokeWidth={2.1} />
                    </View>
                  )}
                  <View style={styles.cameraBadge}>
                    <Camera color="#FFFFFF" size={11} strokeWidth={2.5} />
                  </View>
                </Pressable>
                <View style={styles.headerCopy}>
                  <Pressable onPress={openEditCard}>
                    <Text style={styles.nameText} numberOfLines={1}>
                      {formData.name}
                    </Text>
                  </Pressable>
                  {schoolSummary || regionSummary ? (
                    <View style={styles.heroSchoolRow}>
                      {schoolSummary ? (
                        <Text style={styles.heroSchoolText} numberOfLines={1}>
                          {schoolSummary}
                        </Text>
                      ) : null}
                      {regionSummary ? (
                        <Text style={styles.heroLocationText} numberOfLines={1}>
                          {regionSummary}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                  {hasHeroDetails ? (
                    <View style={styles.heroDetailRow}>
                      {genderSummary ? (
                        <Text style={styles.heroDetailPill} numberOfLines={1}>
                          {genderSummary}
                        </Text>
                      ) : null}
                      {gradeSummary ? (
                        <Text style={styles.heroDetailPill} numberOfLines={1}>
                          {gradeSummary}
                        </Text>
                      ) : null}
                      {countrySummary ? (
                        <Text style={styles.heroDetailPill} numberOfLines={1}>
                          {countrySummary}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </View>
              {hasHeroContacts ? (
                <View style={styles.heroContactRow}>
                  {emailSummary ? (
                    <Text
                      style={[
                        styles.heroContactText,
                        styles.heroContactTextLeft,
                        !phoneSummary && styles.heroContactTextOnly,
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.62}
                    >
                      {emailSummary}
                    </Text>
                  ) : null}
                  {phoneSummary ? (
                    <Text
                      style={[
                        styles.heroContactText,
                        styles.heroContactTextRight,
                        !emailSummary && styles.heroContactTextOnly,
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.62}
                    >
                      {phoneSummary}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              <Pressable
                onPress={openEditCard}
                accessibilityLabel="Edit profile"
                style={styles.heroEditIconButton}
              >
                <Pencil color="#FFFFFF" size={16} strokeWidth={2.5} />
              </Pressable>
            </LinearGradient>
            <View style={styles.profileQuickActions}>
              <Pressable
                accessibilityLabel={externalPaymentsEnabled ? 'Manage subscription' : 'View subscription status'}
                onPress={onManageSubscription}
                style={({ pressed }) => [
                  styles.subscriptionQuickGroup,
                  billingStatus.subscription
                    ? styles.subscriptionQuickButtonActive
                    : styles.subscriptionQuickButtonInactive,
                  pressed && styles.optionChipPressed,
                ]}
              >
                <View style={styles.subscriptionRowCopy}>
                  <Text
                    style={[
                      styles.subscriptionQuickTitle,
                      billingStatus.subscription
                        ? styles.subscriptionQuickTitleActive
                        : styles.subscriptionQuickTitleInactive,
                    ]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                  >
                    {billingStatus.subscription
                      ? 'Subscription Active'
                      : 'Subscription Inactive'}
                  </Text>
                  <Text style={styles.subscriptionQuickMeta} numberOfLines={1}>
                    {billingStatus.subscription
                      ? `until ${formatShortDate(
                          billingStatus.subscription.periodEnd,
                        )}`
                      : 'No active plan'}
                  </Text>
                </View>
                <View
                  accessibilityLabel="Subscription status action"
                  style={[
                    styles.subscriptionQuickCtaButton,
                    billingStatus.subscription
                      ? styles.subscriptionQuickCtaActive
                      : styles.subscriptionQuickCtaInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.subscriptionQuickCta,
                      billingStatus.subscription
                        ? styles.subscriptionQuickCtaTextActive
                        : styles.subscriptionQuickCtaTextInactive,
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                  >
                    {billingStatus.subscription
                      ? externalPaymentsEnabled
                        ? 'Upgrade'
                        : 'Active'
                      : externalPaymentsEnabled
                        ? 'Pay Now'
                        : 'Managed'}
                  </Text>
                </View>
              </Pressable>
              <FocusModeProfileCard
                active={focusModeActive}
                isStarting={isStartingFocusMode}
                onOpen={openLockModal}
              />
            </View>
          </View>

          {showTeacherPortalButton || showAdminPortalButton ? (
            <View style={styles.portalRow}>
              {showTeacherPortalButton ? (
                <Pressable
                  onPress={onOpenTeacher}
                  style={[styles.portalButton, styles.teacherPortalButton]}
                >
                  <GraduationCap color="#2563EB" size={14} strokeWidth={2.4} />
                  <Text style={styles.teacherPortalText}>Teachers Portal</Text>
                </Pressable>
              ) : null}

              {showAdminPortalButton ? (
                <Pressable
                  onPress={onOpenAdmin}
                  style={[styles.portalButton, styles.adminPortalButton]}
                >
                  <Text style={styles.adminPortalText}>Admin</Text>
                  <ChevronRight color="#15803D" size={14} strokeWidth={2.5} />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
          >
            <ProfileSubjectTab
              subjects={orderedSubjects}
              selectedSubjectIds={selectedSubjectIds}
              selectedCount={selectedSubjectCount}
              onToggleSubject={onToggleSubject}
              onRequestSwap={setSwapCandidate}
            />

            <View
              style={[
                styles.footerSpacer,
                styles.subjectsFooterSpacer,
                accountToolsOpen && styles.subjectsFooterSpacerExpanded,
                swapCandidate && styles.subjectsFooterSpacerSwap,
                accountToolsOpen &&
                  swapCandidate &&
                  styles.subjectsFooterSpacerSwapExpanded,
              ]}
            />
          </ScrollView>

          <View style={styles.footer} testID="profile-footer">
            {swapCandidate ? (
              <View testID="profile-subject-swap-slot">
                <SubjectSwapPanel
                  candidate={swapCandidate}
                  onCancel={() => setSwapCandidate(null)}
                  onSwap={handleSwapSubject}
                  selectedSubjects={selectedSubjects}
                />
              </View>
            ) : null}
            <Pressable
              testID="profile-sign-out-button"
              onPress={onSignOut}
              style={({ pressed }) => [
                styles.secondaryFooterButton,
                pressed && styles.footerButtonPressed,
              ]}
            >
              <Text style={styles.secondaryFooterButtonText}>Sign Out</Text>
            </Pressable>
            <Pressable
              onPress={() => setAccountToolsOpen(open => !open)}
              style={({ pressed }) => [
                styles.footerManageAccountToggle,
                pressed && styles.optionChipPressed,
              ]}
            >
              <Text style={styles.footerManageAccountText}>
                Advanced account options
              </Text>
              <ChevronDown
                color="#94A3B8"
                size={15}
                strokeWidth={2.4}
                style={accountToolsOpen ? styles.chevronOpen : undefined}
              />
            </Pressable>
            {accountToolsOpen ? (
              <View style={styles.accountDeletionPanel}>
                <View style={styles.accountDeletionCopyWrap}>
                  <Text style={styles.accountDeletionTitle}>
                    Delete account
                  </Text>
                  <Text style={styles.accountDeletionCopy}>
                    Requires typed confirmation.
                  </Text>
                </View>
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
                  ]}
                >
                  <Text style={styles.accountDeletionButtonText}>Request</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
        {subscriptionCheckoutOverlay}
      </View>

      <Modal
        animationType="none"
        transparent
        visible={editCardVisible}
        onRequestClose={() => closeEditCard()}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={12}
          style={styles.editKeyboardAvoider}
        >
          <View style={styles.editOverlay}>
            <Pressable
              style={styles.editCardBackdrop}
              onPress={() => closeEditCard()}
            />
            <Animated.View
              style={[
                styles.editGlassCard,
                {
                  opacity: editCardProgress,
                  transform: [
                    { translateY: editCardTranslateY },
                    { scale: editCardScale },
                  ],
                },
              ]}
            >
              <ScrollView
                contentContainerStyle={styles.editCardScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.editCardHeader}>
                  <View>
                    <Text style={styles.editCardTitle}>Edit profile</Text>
                  </View>
                  <Pressable
                    onPress={() => closeEditCard()}
                    style={styles.editCardClose}
                  >
                    <X color="#475569" size={17} strokeWidth={2.5} />
                  </Pressable>
                </View>

                <View style={styles.editFieldGroup}>
                  <Text style={styles.detailLabel}>Name</Text>
                  <TextInput
                    value={formData.name}
                    onChangeText={text => handleChange('name', text)}
                    placeholder="Student name"
                    placeholderTextColor="#94A3B8"
                    style={styles.editTextField}
                  />
                </View>

                <View style={styles.editLocationRow}>
                  <View
                    style={[styles.editFieldGroup, styles.editLocationField]}
                  >
                    <Text style={styles.detailLabel}>Country</Text>
                    <Pressable
                      accessibilityLabel="Country selector"
                      accessibilityRole="button"
                      onPress={() => setCountryPickerOpen(open => !open)}
                      style={[
                        styles.schoolSelectShell,
                        countryPickerOpen && styles.schoolSelectShellActive,
                      ]}
                    >
                      <View style={styles.countrySelectValue}>
                        <CountryFlagIcon
                          countryCode={selectedCountry.code}
                          accessibilityLabel={`${selectedCountry.name} flag`}
                          width={20}
                          height={14}
                        />
                        <Text
                          style={styles.countrySelectText}
                          numberOfLines={1}
                        >
                          {selectedCountry.name}
                        </Text>
                      </View>
                      <ChevronDown
                        color="#64748B"
                        size={17}
                        strokeWidth={2.5}
                        style={
                          countryPickerOpen ? styles.chevronOpen : undefined
                        }
                      />
                    </Pressable>
                    {countryPickerOpen ? (
                      <View style={styles.schoolDropdown}>
                        {PROFILE_COUNTRIES.map(country => {
                          const selected =
                            selectedCountry.code === country.code;
                          return (
                            <Pressable
                              accessibilityLabel={`Select ${country.name}`}
                              accessibilityRole="radio"
                              accessibilityState={{ checked: selected }}
                              key={country.code}
                              onPress={() => selectCountry(country)}
                              style={[
                                styles.schoolOption,
                                selected && styles.schoolOptionActive,
                              ]}
                            >
                              <View style={styles.countryOptionContent}>
                                <CountryFlagIcon
                                  countryCode={country.code}
                                  accessibilityLabel={`${country.name} flag`}
                                  width={20}
                                  height={14}
                                />
                                <Text style={styles.countryOptionText}>
                                  {country.name}
                                </Text>
                              </View>
                              {selected ? (
                                <Check
                                  color="#2563EB"
                                  size={17}
                                  strokeWidth={3}
                                />
                              ) : null}
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>

                  <View
                    style={[styles.editFieldGroup, styles.editLocationField]}
                  >
                    <Text style={styles.detailLabel}>{regionMeta.label}</Text>
                    <Pressable
                      accessibilityLabel={`${regionMeta.label} selector`}
                      accessibilityRole="button"
                      onPress={() => setRegionPickerOpen(open => !open)}
                      style={[
                        styles.schoolSelectShell,
                        regionPickerOpen && styles.schoolSelectShellActive,
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.schoolSelectValue,
                          !formData.county && styles.dropdownPlaceholder,
                        ]}
                      >
                        {formData.county || regionMeta.emptyLabel}
                      </Text>
                      <ChevronDown
                        color="#64748B"
                        size={17}
                        strokeWidth={2.5}
                        style={
                          regionPickerOpen ? styles.chevronOpen : undefined
                        }
                      />
                    </Pressable>
                    {regionPickerOpen ? (
                      <View style={styles.schoolDropdown}>
                        <ScrollView
                          keyboardShouldPersistTaps="handled"
                          nestedScrollEnabled
                          style={styles.regionOptionList}
                        >
                          {regionOptions.map(region => {
                            const selected = formData.county === region;
                            return (
                              <Pressable
                                accessibilityLabel={`Select ${region}`}
                                accessibilityRole="radio"
                                accessibilityState={{ checked: selected }}
                                key={region}
                                onPress={() => selectRegion(region)}
                                style={[
                                  styles.schoolOption,
                                  selected && styles.schoolOptionActive,
                                ]}
                              >
                                <Text style={styles.schoolOptionName}>
                                  {region}
                                </Text>
                                {selected ? (
                                  <Check
                                    color="#2563EB"
                                    size={17}
                                    strokeWidth={3}
                                  />
                                ) : null}
                              </Pressable>
                            );
                          })}
                          {regionOptions.length === 0 ? (
                            <Text style={styles.schoolEmptyText}>
                              No {regionMeta.label.toLowerCase()} options yet.
                            </Text>
                          ) : null}
                        </ScrollView>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={styles.editFieldGroup}>
                  <Text style={styles.detailLabel}>School</Text>
                  <Pressable
                    accessibilityLabel="School selector"
                    accessibilityRole="button"
                    disabled={!formData.county}
                    onPress={() => setSchoolPickerOpen(open => !open)}
                    style={[
                      styles.schoolSelectShell,
                      schoolPickerOpen && styles.schoolSelectShellActive,
                      !formData.county && styles.inputDisabled,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.schoolSelectValue,
                        !formData.school && styles.dropdownPlaceholder,
                      ]}
                    >
                      {formData.school ||
                        (formData.county
                          ? 'Select school'
                          : `Select ${regionMeta.label.toLowerCase()} first`)}
                    </Text>
                    <ChevronDown
                      color="#64748B"
                      size={17}
                      strokeWidth={2.5}
                      style={schoolPickerOpen ? styles.chevronOpen : undefined}
                    />
                  </Pressable>
                  {schoolPickerOpen ? (
                    <View style={styles.schoolDropdown}>
                      <View style={styles.schoolSearchRow}>
                        <TextInput
                          autoCapitalize="words"
                          autoCorrect={false}
                          editable={Boolean(formData.county)}
                          onChangeText={setSchoolQuery}
                          placeholder="Search school"
                          placeholderTextColor="#94A3B8"
                          style={styles.schoolSearchInput}
                          value={schoolQuery}
                        />
                      </View>
                      <ScrollView
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled
                        style={styles.schoolResultsList}
                      >
                        {filteredSchools.map(school => {
                          const selected = formData.school === school.name;
                          return (
                            <Pressable
                              accessibilityLabel={`Choose ${school.name}`}
                              accessibilityRole="radio"
                              accessibilityState={{ checked: selected }}
                              key={school.id}
                              onPress={() => selectSchool(school)}
                              style={[
                                styles.schoolOption,
                                selected && styles.schoolOptionActive,
                              ]}
                            >
                              <Text style={styles.schoolOptionName}>
                                {school.name}
                              </Text>
                              {selected ? (
                                <Check
                                  color="#2563EB"
                                  size={17}
                                  strokeWidth={3}
                                />
                              ) : null}
                            </Pressable>
                          );
                        })}
                        {filteredSchools.length === 0 ? (
                          <Text style={styles.schoolEmptyText}>
                            {formData.county
                              ? 'No matching schools in this location.'
                              : `Select ${regionMeta.label.toLowerCase()} first.`}
                          </Text>
                        ) : null}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>

                {renderSelectField('Gender', 'gender', GENDER_OPTIONS)}
                {renderSelectField('Grade', 'grade', [...SUPPORTED_GRADES])}

                <View style={styles.editFieldGroup}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <TextInput
                    value={formData.email || ''}
                    onChangeText={text => handleChange('email', text)}
                    placeholder="student@school.edu"
                    placeholderTextColor="#94A3B8"
                    style={styles.editTextField}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.editFieldGroup}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <TextInput
                    value={formData.phone || ''}
                    onChangeText={text => handleChange('phone', text)}
                    placeholder="+254..."
                    placeholderTextColor="#94A3B8"
                    style={styles.editTextField}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.editCardActions}>
                  <Pressable
                    onPress={() => closeEditCard()}
                    style={({ pressed }) => [
                      styles.editCardSecondary,
                      pressed && styles.footerButtonPressed,
                    ]}
                  >
                    <Text style={styles.editCardSecondaryText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={saveEditCard}
                    style={({ pressed }) => [
                      styles.editCardPrimary,
                      pressed && styles.footerButtonPressed,
                    ]}
                  >
                    <Text style={styles.editCardPrimaryText}>Save</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="none"
        transparent
        visible={lockModalVisible}
        onRequestClose={closeLockModal}
      >
        <View style={styles.overlay}>
          <Pressable
            style={styles.lockModalBackdrop}
            onPress={closeLockModal}
          />
          <Animated.View
            style={[
              styles.lockDialog,
              {
                opacity: lockModalProgress,
                transform: [
                  { translateY: lockModalTranslateY },
                  { scale: lockModalScale },
                ],
              },
            ]}
          >
            <View style={styles.lockDialogHeader}>
              <View style={styles.lockDialogIcon}>
                <ShieldCheck color="#0F766E" size={20} strokeWidth={2.6} />
              </View>
              <View style={styles.lockDialogTitleWrap}>
                <Text style={styles.lockDialogTitle}>
                  {focusModeActive
                    ? 'Phone locked'
                    : focusModeSetupRequired
                    ? 'Set up phone lock'
                    : 'Enter PIN'}
                </Text>
                <Text style={styles.lockDialogMeta}>
                  {focusModeActive
                    ? `${formatDuration(focusModeSecondsRemaining)} remaining`
                    : focusModeSetupRequired
                    ? 'Required before locking'
                    : `${formatDuration(dailyLimitSeconds)} focus session`}
                </Text>
              </View>
              <Pressable
                onPress={closeLockModal}
                style={styles.lockDialogClose}
              >
                <X color="#475569" size={17} strokeWidth={2.5} />
              </Pressable>
            </View>
            <Text style={styles.lockDialogCopy}>
              {focusModeSetupRequired
                ? 'Turn on Android App Pinning and set a phone PIN. Once locked, the student cannot use any other app except Kitabu until the phone is unlocked by the parent PIN.'
                : 'Confirm the parent PIN to lock this phone to Kitabu.'}
            </Text>
            {focusModeError ? (
              <Text style={styles.focusError}>{focusModeError}</Text>
            ) : null}
            <View style={styles.lockDialogActions}>
              <Pressable
                onPress={closeLockModal}
                style={({ pressed }) => [
                  styles.lockDialogSecondary,
                  pressed && styles.footerButtonPressed,
                ]}
              >
                <Text style={styles.lockDialogSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleLockPhoneAction}
                disabled={focusModeActive || isStartingFocusMode}
                style={({ pressed }) => [
                  styles.lockDialogPrimary,
                  pressed && styles.footerButtonPressed,
                  (focusModeActive || isStartingFocusMode) &&
                    styles.footerButtonDisabled,
                ]}
              >
                {isStartingFocusMode ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.lockDialogPrimaryText}>
                    {focusModeSetupRequired ? 'Open Settings' : 'Enter PIN'}
                  </Text>
                )}
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

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
        }
      >
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
              This creates an account deletion request. You will be signed out
              now, and all account data will be deleted from our servers in 30
              days.
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
                ]}
              >
                <Text style={styles.secondaryFooterButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteAccount}
                disabled={
                  deleteState.isSubmitting ||
                  deleteState.confirmationText !== 'DELETE MY ACCOUNT'
                }
                style={({ pressed }) => [
                  styles.dangerFooterButton,
                  styles.footerActionButton,
                  pressed && styles.footerButtonPressed,
                  (deleteState.isSubmitting ||
                    deleteState.confirmationText !== 'DELETE MY ACCOUNT') &&
                    styles.footerButtonDisabled,
                ]}
              >
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

function ProfileSubjectTab({
  subjects,
  selectedSubjectIds,
  selectedCount,
  onToggleSubject,
  onRequestSwap,
}: {
  subjects: Subject[];
  selectedSubjectIds: string[];
  selectedCount: number;
  onToggleSubject: (subjectId: string) => void;
  onRequestSwap: (subject: Subject) => void;
}) {
  const hasReachedLimit = selectedCount >= MAX_PROFILE_SUBJECTS;

  function handleSubjectPress(subject: Subject, selected: boolean) {
    if (selected || !hasReachedLimit) {
      onToggleSubject(subject.id);
      return;
    }

    onRequestSwap(subject);
  }

  return (
    <View style={styles.subjectTab}>
      <View style={styles.subjectTabHeader}>
        <View style={styles.subjectTabTitleWrap}>
          <Text style={styles.subjectTabTitle}>Your Subjects</Text>
          <Text
            style={styles.subjectTabSubtitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
          >
            Select what subjects appear on your learning dashboard.
          </Text>
        </View>
        <Text style={styles.subjectCountPill}>
          {selectedCount}/{MAX_PROFILE_SUBJECTS} selected
        </Text>
      </View>

      <View style={styles.profileSubjectGrid}>
        {subjects.map((subject, index) => {
          const selected = selectedSubjectIds.includes(subject.id);
          const requiresSwap = !selected && hasReachedLimit;
          const tone = SUBJECT_CARD_TONES[index % SUBJECT_CARD_TONES.length];

          return (
            <Pressable
              key={subject.id}
              accessibilityLabel={`${subject.name}, ${selected ? 'selected' : 'not selected'}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() => handleSubjectPress(subject, selected)}
              style={({ pressed }) => [
                styles.profileSubjectCard,
                {
                  backgroundColor: tone[0],
                  borderColor: selected ? '#22C55E' : tone[1],
                },
                selected && styles.profileSubjectCardSelected,
                requiresSwap && styles.profileSubjectCardSwapTarget,
                pressed && styles.optionChipPressed,
              ]}
            >
              <Text style={styles.profileSubjectName} numberOfLines={1}>
                {subject.name}
              </Text>
              {selected ? (
                <View
                  accessibilityLabel={`${subject.name} selected`}
                  style={styles.profileSubjectCheck}
                >
                  <Check color="#16A34A" size={13} strokeWidth={3} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.subjectConfirmation}>
        <Text style={styles.subjectConfirmationText}>
          {hasReachedLimit
            ? `Perfect. You've selected ${MAX_PROFILE_SUBJECTS} subjects.`
            : `Choose ${MAX_PROFILE_SUBJECTS - selectedCount} more subject${
                MAX_PROFILE_SUBJECTS - selectedCount === 1 ? '' : 's'
              }.`}
        </Text>
      </View>
    </View>
  );
}

function SubjectSwapPanel({
  candidate,
  onCancel,
  onSwap,
  selectedSubjects,
}: {
  candidate: Subject;
  onCancel: () => void;
  onSwap: (replacedSubjectId: string) => void;
  selectedSubjects: Subject[];
}) {
  return (
    <View
      accessibilityLabel={`Choose a subject to replace with ${candidate.name}`}
      style={[styles.subjectSwapPanel, styles.subjectSwapPanelFooter]}
      testID="profile-subject-swap-panel"
    >
      <View style={styles.subjectSwapHeader}>
        <Text style={styles.subjectSwapTitle}>
          Swap {candidate.name} with which subject?
        </Text>
        <Pressable
          accessibilityLabel="Cancel subject swap"
          onPress={onCancel}
          style={({ pressed }) => [
            styles.subjectSwapCancel,
            pressed && styles.optionChipPressed,
          ]}
        >
          <Text style={styles.subjectSwapCancelText}>Cancel</Text>
        </Pressable>
      </View>
      <View style={styles.subjectSwapOptions}>
        {selectedSubjects.map(subject => (
          <Pressable
            accessibilityLabel={`Replace ${subject.name} with ${candidate.name}`}
            key={subject.id}
            onPress={() => onSwap(subject.id)}
            style={({ pressed }) => [
              styles.subjectSwapOption,
              pressed && styles.optionChipPressed,
            ]}
          >
            <Text style={styles.subjectSwapOptionText}>{subject.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function FocusModeProfileCard({
  active,
  isStarting,
  onOpen,
}: {
  active: boolean;
  isStarting: boolean;
  onOpen: () => void;
}) {
  return (
    <Pressable
      disabled={isStarting}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityState={{ busy: isStarting, selected: active }}
      style={({ pressed }) => [
        styles.lockPhoneButton,
        active && styles.lockPhoneButtonActive,
        pressed && styles.optionChipPressed,
      ]}
    >
      {isStarting ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <ShieldCheck color="#FFFFFF" size={16} strokeWidth={2.5} />
      )}
      <Text
        style={styles.lockPhoneButtonText}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.82}
      >
        Lock Phone
      </Text>
    </Pressable>
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

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
}

function orderProfileSubjects(items: Subject[]) {
  const orderMap = new Map(SUBJECT_ORDER.map((id, index) => [id, index]));
  return [...items].sort((left, right) => {
    const leftOrder = orderMap.get(left.id) ?? 99;
    const rightOrder = orderMap.get(right.id) ?? 99;
    return leftOrder - rightOrder;
  });
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
    borderRadius: 24,
    elevation: 10,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    width: '100%',
  },
  sheetHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#EEF2F7',
    borderBottomWidth: 1,
    gap: 10,
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    position: 'relative',
  },
  headerAccent: {
    height: 5,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  headerGradient: {
    height: 128,
  },
  sheetTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  sheetTitleIcon: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#EEF2F7',
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  sheetTitle: {
    color: '#0F172A',
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
  },
  accountHero: {
    alignItems: 'stretch',
    borderRadius: 18,
    gap: 8,
    minHeight: 122,
    overflow: 'hidden',
    padding: 12,
    position: 'relative',
  },
  heroMainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  profileQuickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  subscriptionQuickGroup: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
    minHeight: 44,
    minWidth: 0,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  subscriptionQuickButtonActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  subscriptionQuickButtonInactive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  subscriptionQuickTitle: {
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 14,
    textAlign: 'center',
  },
  subscriptionQuickTitleActive: {
    color: '#15803D',
  },
  subscriptionQuickTitleInactive: {
    color: '#B91C1C',
  },
  subscriptionQuickMeta: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
    textAlign: 'center',
  },
  subscriptionQuickCta: {
    fontSize: 11,
    fontWeight: '900',
  },
  subscriptionQuickCtaButton: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 62,
    paddingHorizontal: 8,
  },
  subscriptionQuickCtaActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderWidth: 1,
  },
  subscriptionQuickCtaInactive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  subscriptionQuickCtaTextActive: {
    color: '#EA580C',
  },
  subscriptionQuickCtaTextInactive: {
    color: '#B91C1C',
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  portalRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    zIndex: 10,
  },
  portalButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#F3F4F6',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
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
  compactAvatarPressable: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 3,
    elevation: 2,
    height: 66,
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    width: 66,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  identityMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rolePill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 5,
    textTransform: 'capitalize',
  },
  gradePill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    color: '#3730A3',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 5,
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
    bottom: -1,
    height: 22,
    justifyContent: 'center',
    position: 'absolute',
    right: -1,
    width: 22,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  identityBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0,
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
  compactNameInput: {
    borderBottomColor: 'rgba(255,255,255,0.55)',
    borderBottomWidth: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    paddingBottom: 4,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  roleText: {
    color: '#6B7280',
    fontSize: 14,
  },
  heroSchoolRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    minWidth: 0,
    width: '100%',
  },
  heroSchoolText: {
    color: 'rgba(255,255,255,0.82)',
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    minWidth: 0,
  },
  heroLocationText: {
    color: 'rgba(255,255,255,0.78)',
    flexShrink: 0,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
    marginLeft: 'auto',
    maxWidth: 96,
    minWidth: 0,
    textAlign: 'right',
  },
  heroDetailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  heroDetailPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.26)',
    borderRadius: 999,
    borderWidth: 1,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    maxWidth: 112,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: 'capitalize',
  },
  heroContactRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    minWidth: 0,
    paddingRight: 44,
  },
  heroContactText: {
    color: 'rgba(255,255,255,0.76)',
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 13,
    minWidth: 0,
  },
  heroContactTextLeft: {
    flex: 1.6,
    textAlign: 'left',
  },
  heroContactTextRight: {
    flex: 1,
    textAlign: 'right',
  },
  heroContactTextOnly: {
    flex: 0,
    maxWidth: '100%',
  },
  heroEditIconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.18)',
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 999,
    borderWidth: 1,
    bottom: 10,
    height: 34,
    justifyContent: 'center',
    position: 'absolute',
    right: 10,
    width: 34,
  },
  noticeCard: {
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 12,
    padding: 12,
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
    flex: 1,
    gap: 4,
  },
  verificationTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  verificationBody: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
  },
  verificationButton: {
    backgroundColor: '#312E81',
    alignItems: 'center',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 14,
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
  subscriptionCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFF',
    borderColor: '#DBEAFE',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    padding: 14,
  },
  subscriptionStatusDot: {
    backgroundColor: '#10B981',
    borderColor: '#D1FAE5',
    borderRadius: 999,
    borderWidth: 5,
    height: 22,
    width: 22,
  },
  subscriptionCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  sectionRowTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },
  sectionRowMeta: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  inlineActionButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 13,
  },
  inlineActionButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  focusCard: {
    backgroundColor: '#F0FDFA',
    borderColor: '#A7F3D0',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    marginBottom: 14,
    padding: 14,
  },
  focusHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  focusIcon: {
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40,
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
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  focusSettingsButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#CCFBF1',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  focusSettingsButtonText: {
    color: '#0F766E',
    fontSize: 11,
    fontWeight: '900',
  },
  focusSwitch: {
    alignItems: 'center',
    backgroundColor: '#CBD5E1',
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    paddingHorizontal: 3,
    width: 52,
  },
  focusSwitchActive: {
    alignItems: 'flex-end',
    backgroundColor: '#10B981',
  },
  focusSwitchDisabled: {
    opacity: 0.6,
  },
  focusSwitchThumb: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    height: 24,
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    width: 24,
  },
  focusSwitchThumbActive: {
    alignSelf: 'flex-end',
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
    minHeight: 42,
  },
  focusStartButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  accountSection: {
    marginBottom: 14,
  },
  subjectTab: {
    gap: 12,
  },
  subjectTabHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginTop: 2,
  },
  subjectTabTitleWrap: {
    flex: 1,
    gap: 6,
  },
  subjectTabTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
  },
  subjectTabSubtitle: {
    color: '#64748B',
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  subjectCountPill: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  profileSubjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileSubjectCard: {
    alignItems: 'center',
    borderRadius: 9,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 9,
    paddingVertical: 8,
    position: 'relative',
    width: '48.6%',
  },
  profileSubjectCardSelected: {
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
  },
  profileSubjectCardSwapTarget: {
    opacity: 0.82,
  },
  profileSubjectCheck: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
    borderRadius: 999,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    position: 'absolute',
    right: 6,
    top: 6,
    width: 22,
  },
  profileSubjectName: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 16,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  subjectConfirmation: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  subjectSwapPanel: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  subjectSwapPanelFooter: {
    marginBottom: 10,
  },
  subjectSwapHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  subjectSwapTitle: {
    color: '#7C2D12',
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  subjectSwapCancel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FDBA74',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  subjectSwapCancelText: {
    color: '#EA580C',
    fontSize: 11,
    fontWeight: '900',
  },
  subjectSwapOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  subjectSwapOption: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FDBA74',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  subjectSwapOptionText: {
    color: '#9A3412',
    fontSize: 12,
    fontWeight: '900',
  },
  subjectConfirmationText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '900',
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
    backgroundColor: 'rgba(255,255,255,0.68)',
    borderColor: 'rgba(251,146,60,0.28)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 54,
    paddingHorizontal: 16,
  },
  schoolSelectShellActive: {
    borderColor: '#16A34A',
    shadowColor: '#16A34A',
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
  countrySelectValue: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minWidth: 0,
    paddingRight: 12,
  },
  countrySelectText: {
    color: '#0F172A',
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    minWidth: 0,
  },
  countryOptionContent: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minWidth: 0,
  },
  countryOptionText: {
    color: '#0F172A',
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  dropdownPlaceholder: {
    color: '#94A3B8',
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    opacity: 0.72,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  schoolDropdown: {
    backgroundColor: 'rgba(255,251,235,0.96)',
    borderColor: 'rgba(251,146,60,0.3)',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  schoolSearchRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderColor: 'rgba(251,146,60,0.28)',
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
  regionOptionList: {
    maxHeight: 190,
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
    backgroundColor: 'rgba(220,252,231,0.82)',
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
  subscriptionRowCopy: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  lockPhoneButton: {
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 11,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 10,
    width: 116,
  },
  lockPhoneButtonActive: {
    backgroundColor: '#DC2626',
  },
  lockPhoneButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    minWidth: 0,
  },
  accountDeletionPanel: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 8,
    padding: 12,
  },
  accountDeletionCopyWrap: {
    flex: 1,
    gap: 3,
  },
  accountDeletionTitle: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '900',
  },
  accountDeletionCopy: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  accountDeletionButton: {
    alignSelf: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  accountDeletionButtonText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '900',
  },
  footerSpacer: {
    height: 76,
  },
  subjectsFooterSpacer: {
    height: 122,
  },
  subjectsFooterSpacerSwap: {
    height: 256,
  },
  subjectsFooterSpacerSwapExpanded: {
    height: 322,
  },
  subjectsFooterSpacerExpanded: {
    height: 188,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#F9FAFB',
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingBottom: 18,
    paddingHorizontal: 20,
    paddingTop: 14,
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
    backgroundColor: '#16A34A',
    borderRadius: 16,
    paddingVertical: 14,
  },
  primaryFooterButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  secondaryFooterButton: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    paddingVertical: 14,
  },
  secondaryFooterButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  footerManageAccountToggle: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 5,
    marginTop: 9,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  footerManageAccountText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
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
  editKeyboardAvoider: {
    flex: 1,
  },
  editOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,247,237,0.56)',
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  editCardBackdrop: {
    backgroundColor: 'rgba(67,43,22,0.22)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  editGlassCard: {
    backgroundColor: 'rgba(255,251,235,0.9)',
    borderColor: 'rgba(251,146,60,0.42)',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 18,
    gap: 12,
    height: '90%',
    padding: 16,
    shadowColor: '#9A3412',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.2,
    shadowRadius: 34,
    width: '100%',
  },
  editCardScrollContent: {
    gap: 12,
    paddingBottom: 2,
  },
  editCardHeader: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.38)',
    borderColor: 'rgba(22,163,74,0.18)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  editCardTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },
  editCardSubtitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  editCardClose: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderColor: 'rgba(251,146,60,0.24)',
    borderWidth: 1,
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  editFieldGroup: {
    gap: 7,
  },
  editLocationRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editLocationField: {
    flex: 1,
    minWidth: 0,
  },
  editTextField: {
    backgroundColor: 'rgba(255,255,255,0.74)',
    borderColor: 'rgba(251,146,60,0.28)',
    borderRadius: 14,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  editCardActions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 2,
  },
  editCardSecondary: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.68)',
    borderColor: 'rgba(251,146,60,0.28)',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
  },
  editCardSecondaryText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '900',
  },
  editCardPrimary: {
    alignItems: 'center',
    backgroundColor: '#168A4A',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
  },
  editCardPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  lockModalBackdrop: {
    backgroundColor: 'rgba(15,23,42,0.38)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  lockDialog: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(255,255,255,0.74)',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 14,
    gap: 14,
    maxWidth: 360,
    padding: 18,
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    width: '100%',
  },
  lockDialogHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  lockDialogIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(204,251,241,0.86)',
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  lockDialogTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  lockDialogTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },
  lockDialogMeta: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
  },
  lockDialogClose: {
    alignItems: 'center',
    backgroundColor: 'rgba(241,245,249,0.78)',
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  lockDialogCopy: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  lockDialogActions: {
    flexDirection: 'row',
    gap: 10,
  },
  lockDialogSecondary: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  lockDialogSecondaryText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '900',
  },
  lockDialogPrimary: {
    alignItems: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
  },
  lockDialogPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
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
