import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioSource,
  type AudioStatus,
} from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { GoogleLogo } from '../components/GoogleLogo';
import { OnboardingVisualShell } from '../components/OnboardingVisualShell';
import { MobileAnalyticsConsentCard } from '../components/MobileAnalyticsConsentCard';

import { SUPPORTED_GRADES } from '../constants/grades';
import { COUNTRY_OPTIONS, REGIONS_BY_COUNTRY, detectDefaultCountryCode } from '../constants/locations';
import { WHATSAPP_CALLING_COUNTRIES, type WhatsAppCallingCountry } from '../constants/whatsappCallingCountries';
import { WHATSAPP_MOBILE_NSN_LENGTHS } from '../constants/whatsappMobileNsnLengths';
import { triggerHaptic } from '../services/haptics';
import { requestPushPermission } from '../services/pushNotifications';
import { buildPrimaryInstruction, getParentEnglishOnboardingCueId, getParentSwahiliOnboardingCueId, useGuidedNarration } from '../services/narrationService';
import {
  emptyParentOnboardingOrder,
  loadParentOnboardingOrder,
  orderByLocalAggregate,
  recordParentOnboardingSelection,
  type ParentOnboardingOrderState,
} from '../utils/parentOnboardingOrdering';
import { parentOnboardingSubjectOptions } from '../utils/parentOnboardingSubjects';
import { parentHouseholdCopy } from '../onboarding/parentHouseholdOnboardingCopy';
import { recordSchoolSelection, type SchoolCatalogRecord } from '../services/appDataService';
import { filterCountyOptions } from '../utils/countySearch';
import type {
  GenderOption,
  OnboardingMascotKey,
  OnboardingLanguageCode,
  OnboardingVoiceName,
  SchoolData,
} from '../types/app';

export type ParentHouseholdChildInput = {
  name: string;
  age: string;
  gender: GenderOption;
  county: string;
  schoolId: string | null;
  schoolDirectoryId: string | null;
  school: string;
  grade: string;
  performance: 'far_behind' | 'behind' | 'at_grade_level' | 'ahead' | 'far_ahead' | 'not_sure';
  subjects: string[];
  commitmentAccepted: boolean;
  commitmentSignature?: string;
  commitmentMinutes: 20;
  mascotKey?: OnboardingMascotKey;
  voiceName?: OnboardingVoiceName;
};

export type ParentHouseholdOnboardingInput = {
  role: 'parent';
  languageCode: OnboardingLanguageCode;
  displayName: string;
  gender: GenderOption;
  grade: string;
  schoolId: null;
  countryCode: string;
  whatsappNumber?: string;
  children: ParentHouseholdChildInput[];
  parentChildren: ParentHouseholdChildInput[];
  selectedSubjectIds: string[];
  mascotKey: OnboardingMascotKey;
  voiceName?: OnboardingVoiceName;
  referralSource?: string;
  reminderEnabled: boolean;
  signupMethod?: 'email' | 'phone' | 'google';
  signupEmail?: string;
  signupPassword?: string;
};

type Props = {
  schools: SchoolData[];
  isSubmitting: boolean;
  error?: string | null;
  collectSignupCredentials?: boolean;
  initialParentName?: string;
  initialCountryCode?: string;
  skipHouseholdSetup?: boolean;
  onCreateSchool?: (input: { schoolName: string; county: string }) => Promise<SchoolData>;
  onSearchSchools?: (input: { county?: string; query?: string; limit?: number }) => Promise<SchoolCatalogRecord[]>;
  onProfileSetupStarted?: (role: 'parent', grade?: string) => void;
  onSubmit: (input: ParentHouseholdOnboardingInput) => void;
  onRoleChange: (role: 'parent' | 'teacher') => void;
};

type Step =
  | 'language'
  | 'role'
  | 'parentAvatar'
  | 'parentName'
  | 'whatsappNumber'
  | 'country'
  | 'childName'
  | 'childAge'
  | 'childGender'
  | 'childSchool'
  | 'childGrade'
  | 'childPerformance'
  | 'childSubjects'
  | 'addAnother'
  | 'microphone'
  | 'reminder'
  | 'referral'
  | 'tutorIntro'
  | 'mascot'
  | 'rafiki'
  | 'voice'
  | 'socialProof'
  | 'commitment'
  | 'childReady'
  | 'loading'
  | 'ready'
  | 'signup';

type SignaturePoint = { x: number; y: number };
type ParentAvatarKey = 'mum1' | 'dad1' | 'mum2' | 'dad2';

const PERFORMANCE_OPTIONS: Array<{ value: ParentHouseholdChildInput['performance']; label: string }> = [
  { value: 'far_behind', label: 'Far behind' },
  { value: 'behind', label: 'Behind' },
  { value: 'at_grade_level', label: 'At Grade Level' },
  { value: 'ahead', label: 'Ahead' },
  { value: 'far_ahead', label: 'Far Ahead' },
  { value: 'not_sure', label: "I'm Not Sure" },
];
const PARENT_AVATARS: Array<{ key: ParentAvatarKey; label: string; gender: Extract<GenderOption, 'female' | 'male'>; source: number }> = [
  { key: 'mum1', label: 'Mum', gender: 'female', source: require('../../assets/avatars/mum1.png') },
  { key: 'dad1', label: 'Dad', gender: 'male', source: require('../../assets/avatars/dad1.png') },
  { key: 'mum2', label: 'Mum', gender: 'female', source: require('../../assets/avatars/mum2.png') },
  { key: 'dad2', label: 'Dad', gender: 'male', source: require('../../assets/avatars/dad2.png') },
];
const REFERRAL_OPTIONS = [
  { value: 'friend_or_family', label: 'Friend or family' },
  { value: 'school_or_teacher', label: 'School or teacher' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'tiktok', label: 'Tiktok' },
  { value: 'youtube', label: 'Youtube' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'church', label: 'Church' },
  { value: 'search', label: 'Search' },
  { value: 'other', label: 'Other' },
] as const;
const MASCOTS: Array<{ key: OnboardingMascotKey; label: string; source: number }> = [
  { key: 'rabbit', label: 'Rafiki the Rabbit', source: require('../assets/mascot/sungura-rabbit.png') },
  { key: 'lion', label: 'Rafiki the Lion', source: require('../assets/mascot/simba-lion.png') },
  { key: 'elephant', label: 'Rafiki the Elephant', source: require('../assets/mascot/ndovu-elephant.png') },
  { key: 'panda', label: 'Rafiki the Panda', source: require('../assets/mascot/panda.png') },
];
const VOICES: Array<{ name: OnboardingVoiceName; label: string; en: AudioSource; sw: AudioSource }> = [
  { name: 'Samora', label: 'Warm and encouraging', en: require('../assets/Samora-Sekou-Eng.mp3'), sw: require('../assets/Samora-Sekou-Kisw.mp3') },
  { name: 'Barake', label: 'Calm and clear', en: require('../assets/Barake-Dexter-Eng.mp3'), sw: require('../assets/Barake-Dexter-Kisw.mp3') },
  { name: 'Bella', label: 'Bright and energetic', en: require('../assets/Bella-Anya-Eng.mp3'), sw: require('../assets/Bella-Anya-Kisw.mp3') },
  { name: 'Judith', label: 'Patient and steady', en: require('../assets/Judith-cay-Eng.mp3'), sw: require('../assets/Judith-Cay-Kisw.mp3') },
];
const WHATSAPP_REGIONAL_COUNTRY_CODES = new Set(COUNTRY_OPTIONS.map(option => option.code));

export function orderWhatsappCallingCountries(
  countries: readonly WhatsAppCallingCountry[],
  detectedCountryCode: string,
  regionalCountryCodes: ReadonlySet<string> = WHATSAPP_REGIONAL_COUNTRY_CODES,
): WhatsAppCallingCountry[] {
  const uniqueCountries = Array.from(new Map(countries.map(country => [country.iso2, country])).values());
  const tier = (country: WhatsAppCallingCountry) => country.iso2 === detectedCountryCode ? 0 : regionalCountryCodes.has(country.iso2) ? 1 : 2;
  return uniqueCountries.sort((left, right) => tier(left) - tier(right) || left.name.localeCompare(right.name, 'en') || left.iso2.localeCompare(right.iso2));
}

function blankChild(): ParentHouseholdChildInput {
  return {
    name: '', age: '', gender: 'not_specified', county: '', schoolId: null, schoolDirectoryId: null, school: '',
    grade: '', performance: '' as ParentHouseholdChildInput['performance'], subjects: [], commitmentAccepted: false, commitmentMinutes: 20,
  };
}

export function canonicalizeWhatsappNumber(value: string, callingCode: string): string {
  const digits = value.replace(/\D/g, '');
  const nationalDigits = value.trim().startsWith('+') && digits.startsWith(callingCode)
    ? digits.slice(callingCode.length)
    : digits;
  return nationalDigits ? `+${callingCode}${nationalDigits.replace(/^0/, '')}` : '';
}

export function sanitizeWhatsappNationalNumber(value: string, callingCode: string, maxLength: number): string {
  let digits = value.replace(/\D/g, '');
  if (value.trim().startsWith('+') && digits.startsWith(callingCode)) {
    digits = digits.slice(callingCode.length);
  } else if (digits.startsWith(callingCode) && digits.length >= maxLength + callingCode.length) {
    digits = digits.slice(callingCode.length);
  }
  return digits.replace(/^0+/, '').slice(0, maxLength);
}

export function ParentHouseholdOnboardingScreen({
  schools,
  isSubmitting,
  error,
  collectSignupCredentials = true,
  initialParentName = '',
  initialCountryCode,
  skipHouseholdSetup = false,
  onCreateSchool,
  onSearchSchools,
  onProfileSetupStarted,
  onSubmit,
  onRoleChange,
}: Props) {
  const initialStep: Step = skipHouseholdSetup ? 'childName' : 'language';
  const detectedCountryCode = initialCountryCode ?? detectDefaultCountryCode();
  const [stepHistory, setStepHistory] = useState<Step[]>([initialStep]);
  const [languageCode, setLanguageCode] = useState<OnboardingLanguageCode | null>(null);
  const [parentName, setParentName] = useState(initialParentName);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [parentAvatarKey, setParentAvatarKey] = useState<ParentAvatarKey | null>(null);
  const [parentGender, setParentGender] = useState<GenderOption>('not_specified');
  const [countryCode, setCountryCode] = useState<string>(initialCountryCode ?? detectDefaultCountryCode());
  const [whatsappCallingCountryCode, setWhatsappCallingCountryCode] = useState(detectedCountryCode);
  const [children, setChildren] = useState<ParentHouseholdChildInput[]>([blankChild()]);
  const [childIndex, setChildIndex] = useState(0);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [whatsappCountryPickerOpen, setWhatsappCountryPickerOpen] = useState(false);
  const [whatsappCountryQuery, setWhatsappCountryQuery] = useState('');
  const [countyPickerOpen, setCountyPickerOpen] = useState(false);
  const [countyQuery, setCountyQuery] = useState('');
  const [schoolPickerOpen, setSchoolPickerOpen] = useState(false);
  const [schoolQuery, setSchoolQuery] = useState('');
  const [addSchoolOpen, setAddSchoolOpen] = useState(false);
  const [manualSchoolName, setManualSchoolName] = useState('');
  const [schoolError, setSchoolError] = useState<string | null>(null);
  const [directorySchools, setDirectorySchools] = useState<SchoolCatalogRecord[]>([]);
  const [isLoadingDirectorySchools, setIsLoadingDirectorySchools] = useState(false);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const directoryRequestIdRef = useRef(0);
  const [isAddingSchool, setIsAddingSchool] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [referralSource, setReferralSource] = useState('');
  const [ordering, setOrdering] = useState<ParentOnboardingOrderState>(emptyParentOnboardingOrder);
  const [voicePreviewedName, setVoicePreviewedName] = useState<OnboardingVoiceName | null>(null);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupMethod, setSignupMethod] = useState<'email' | 'google'>('email');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupPasswordConfirm, setShowSignupPasswordConfirm] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [studyPlanProgress, setStudyPlanProgress] = useState(0);
  const [signaturePointsByChild, setSignaturePointsByChild] = useState<Record<number, SignaturePoint[]>>({});
  const voicePlayerRef = useRef<AudioPlayer | null>(null);
  const voicePreviewSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const voicePreviewRequestIdRef = useRef(0);
  const signaturePointsRef = useRef<Record<number, SignaturePoint[]>>({});
  const confettiFall = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadParentOnboardingOrder().then(setOrdering).catch(() => undefined);
  }, []);

  const child = children[childIndex];
  const regionMeta = REGIONS_BY_COUNTRY[countryCode as keyof typeof REGIONS_BY_COUNTRY] ?? REGIONS_BY_COUNTRY.KE;
  const selectedWhatsappCallingCountry = WHATSAPP_CALLING_COUNTRIES.find(option => option.iso2 === whatsappCallingCountryCode)
    ?? WHATSAPP_CALLING_COUNTRIES.find(option => option.iso2 === 'KE')!;
  useEffect(() => {
    if (!schoolPickerOpen || !child.county) return undefined;
    if (!onSearchSchools) {
      const query = schoolQuery.trim().toLowerCase();
      setDirectorySchools(schools
        .filter(school => (school.county ?? school.location ?? '').trim().toLowerCase() === child.county!.trim().toLowerCase())
        .filter(school => !query || school.name.trim().toLowerCase().includes(query))
        .slice(0, 24)
        .map(school => ({
          schoolId: school.id,
          sourceRecordKey: school.sourceRecordKey ?? null,
          name: school.name,
          county: school.county ?? school.location ?? null,
          subCounty: school.subCounty ?? null,
          level: school.catalogLevel ?? '',
          schoolCode: school.schoolCode ?? '',
          selectionCount: school.selectionCount ?? 0,
          activeEnrollment: school.totalStudents,
        })));
      setDirectoryError(null);
      return undefined;
    }
    const requestId = ++directoryRequestIdRef.current;
    const timer = setTimeout(() => {
      setIsLoadingDirectorySchools(true);
      setDirectoryError(null);
      onSearchSchools({ county: child.county, query: schoolQuery, limit: 24 })
        .then(results => { if (requestId === directoryRequestIdRef.current) setDirectorySchools(results); })
        .catch(() => {
          if (requestId === directoryRequestIdRef.current) {
            setDirectorySchools([]);
            setDirectoryError(languageCode === 'sw' ? 'Imeshindikana kupakia shule.' : 'Could not load schools. Try again.');
          }
        })
        .finally(() => { if (requestId === directoryRequestIdRef.current) setIsLoadingDirectorySchools(false); });
    }, 220);
    return () => clearTimeout(timer);
  }, [child.county, languageCode, onSearchSchools, schoolPickerOpen, schoolQuery, schools]);
  const orderedWhatsappCallingCountries = orderWhatsappCallingCountries(WHATSAPP_CALLING_COUNTRIES, detectedCountryCode);
  const filteredWhatsappCallingCountries = orderedWhatsappCallingCountries.filter(option => {
    const query = whatsappCountryQuery.trim().toLowerCase();
    return !query || option.name.toLowerCase().includes(query) || option.iso2.toLowerCase() === query || option.callingCode.includes(query.replace(/^\+/, ''));
  });
  const subjectOptionsForGrade = parentOnboardingSubjectOptions(child.grade);
  const subjectIdsForGrade = subjectOptionsForGrade.map(subject => subject.id);
  const allAreasSelected = subjectIdsForGrade.length > 0 && subjectIdsForGrade.every(subjectId => child.subjects.includes(subjectId));
  const referralOptions = orderByLocalAggregate(REFERRAL_OPTIONS, ordering.referral);
  const subjectOptions = orderByLocalAggregate(subjectOptionsForGrade.map(subject => ({ value: subject.id, subject })), ordering.subject).map(item => item.subject);
  const step = stepHistory[stepHistory.length - 1];
  const progress = ['language', 'role', 'parentAvatar', 'parentName', 'whatsappNumber', 'country', 'childName', 'childAge', 'childGender', 'childSchool', 'childGrade', 'childPerformance', 'childSubjects', 'addAnother', 'microphone', 'reminder', 'referral', 'tutorIntro', 'mascot', 'voice', 'rafiki', 'socialProof', 'commitment', 'childReady', 'ready', 'signup'];
  const progressValue = Math.round(((progress.indexOf(step) + 1) / progress.length) * 100);
  const copy = parentHouseholdCopy(languageCode, child.name, childIndex, children.length);
  const continueDisabled = isSubmitting || (step === 'voice' && (!child.voiceName || voicePreviewedName !== child.voiceName)) || (step === 'commitment' && (!child.commitmentAccepted || !child.commitmentSignature));

  function updateChild(update: Partial<ParentHouseholdChildInput>) {
    onProfileSetupStarted?.('parent', (update.grade ?? child.grade) || undefined);
    setChildren(current => current.map((item, index) => index === childIndex ? { ...item, ...update } : item));
    setLocalError(null);
  }

  function selectMascot(value: OnboardingMascotKey) {
    updateChild({ mascotKey: value });
    next('voice');
  }

  function selectParentAvatar(option: (typeof PARENT_AVATARS)[number]) {
    setParentAvatarKey(option.key);
    setParentGender(option.gender);
    setLocalError(null);
    next('parentName');
  }

  function selectVoice(value: OnboardingVoiceName) {
    updateChild({ voiceName: value });
  }

  function setSignaturePoints(points: SignaturePoint[]) {
    signaturePointsRef.current = { ...signaturePointsRef.current, [childIndex]: points };
    setSignaturePointsByChild(current => ({ ...current, [childIndex]: points }));
  }

  function startSignature(x: number, y: number) {
    updateChild({ commitmentSignature: undefined });
    setSignaturePoints([{ x, y }]);
  }

  function extendSignature(x: number, y: number) {
    const points = signaturePointsRef.current[childIndex] ?? [];
    const lastPoint = points[points.length - 1];
    if (!lastPoint || Math.hypot(x - lastPoint.x, y - lastPoint.y) < 3) {
      return;
    }
    setSignaturePoints([...points, { x, y }]);
  }

  function finishSignature(x: number, y: number) {
    extendSignature(x, y);
    if ((signaturePointsRef.current[childIndex] ?? []).length >= 2) {
      updateChild({ commitmentSignature: `signed-${Date.now()}` });
    }
  }

  function next(nextStep: Step) {
    setLocalError(null);
    setStepHistory(current => [...current, nextStep]);
  }

  function closePickers() {
    setCountryPickerOpen(false);
    setWhatsappCountryPickerOpen(false);
    setCountyPickerOpen(false);
    setSchoolPickerOpen(false);
    setAddSchoolOpen(false);
    setSchoolError(null);
  }

  function stopVoicePreview() {
    voicePreviewRequestIdRef.current += 1;
    voicePreviewSubscriptionRef.current?.remove();
    voicePreviewSubscriptionRef.current = null;
    voicePlayerRef.current?.pause();
    voicePlayerRef.current?.remove();
    voicePlayerRef.current = null;
  }

  async function previewVoice(option: (typeof VOICES)[number]) {
    stopVoicePreview();
    const requestId = voicePreviewRequestIdRef.current;
    selectVoice(option.name);
    setVoicePreviewedName(null);

    try {
      if (Platform.OS !== 'web') {
        await setAudioModeAsync({
          allowsRecording: false,
          interruptionMode: 'duckOthers',
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          shouldRouteThroughEarpiece: false,
        });
      }
      if (voicePreviewRequestIdRef.current !== requestId) {
        return;
      }
      const player = createAudioPlayer(languageCode === 'sw' ? option.sw : option.en, { downloadFirst: true });
      voicePlayerRef.current = player;
      voicePreviewSubscriptionRef.current = player.addListener(
        'playbackStatusUpdate',
        (status: AudioStatus) => {
          if (voicePreviewRequestIdRef.current !== requestId) {
            return;
          }
          if (status.playing) {
            setVoicePreviewedName(option.name);
          }
        },
      );
      player.play();
    } catch {
      // Playback failures leave the selected voice unverified, so Continue stays disabled.
    }
  }

  useEffect(() => () => {
    voicePreviewRequestIdRef.current += 1;
    voicePreviewSubscriptionRef.current?.remove();
    voicePreviewSubscriptionRef.current = null;
    voicePlayerRef.current?.pause();
    voicePlayerRef.current?.remove();
    voicePlayerRef.current = null;
  }, []);

  useEffect(() => {
    if (step !== 'loading') {
      return;
    }
    setStudyPlanProgress(0);
    const timer = setInterval(() => {
      setStudyPlanProgress(current => Math.min(current + 10, 100));
    }, 800);
    const completionTimer = setTimeout(() => {
      clearInterval(timer);
      setStudyPlanProgress(100);
      next('ready');
    }, 8_400);
    return () => {
      clearInterval(timer);
      clearTimeout(completionTimer);
    };
  }, [step]);

  useEffect(() => {
    if (step !== 'ready') {
      return;
    }
    confettiFall.setValue(0);
    const animation = Animated.loop(Animated.timing(confettiFall, {
      toValue: 1,
      duration: 2_600,
      useNativeDriver: true,
    }));
    animation.start();
    return () => animation.stop();
  }, [confettiFall, step]);

  function goBack() {
    stopVoicePreview();
    closePickers();
    setLocalError(null);
    if (stepHistory.length <= 1) {
      return;
    }
    if (step === 'childName' && childIndex > 0) {
      setChildren(current => current.slice(0, -1));
      setChildIndex(current => current - 1);
    }
    if (step === 'commitment' && childIndex > 0 && stepHistory[stepHistory.length - 2] === 'commitment') {
      setChildIndex(current => current - 1);
    }
    setStepHistory(current => current.slice(0, -1));
  }

  function validateAndContinue() {
    if (step === 'language') { if (!languageCode) { setLocalError(copy.validation.language); return; } next('role'); return; }
    if (step === 'role') { onRoleChange('parent'); next('parentAvatar'); return; }
    if (step === 'parentAvatar') { if (!parentAvatarKey) { setLocalError(copy.validation.avatar); return; } next('parentName'); return; }
    if (step === 'parentName') {
      if (parentName.trim().length < 2 || /\d/.test(parentName)) { setLocalError(copy.validation.name); triggerHaptic('error'); return; }
      next('whatsappNumber'); return;
    }
    if (step === 'whatsappNumber') {
      const lengths = WHATSAPP_MOBILE_NSN_LENGTHS[selectedWhatsappCallingCountry.iso2];
      const nationalDigits = sanitizeWhatsappNationalNumber(whatsappNumber, selectedWhatsappCallingCountry.callingCode, Math.max(...lengths));
      if (!lengths.includes(nationalDigits.length)) {
        setLocalError(copy.whatsappValidation(lengths, selectedWhatsappCallingCountry.callingCode));
        triggerHaptic('error');
        return;
      }
      next('country'); return;
    }
    if (step === 'country') { next('childName'); return; }
    if (step === 'childName') {
      if (child.name.trim().length < 2) { setLocalError(copy.validation.childName); return; }
      next('childAge'); return;
    }
    if (step === 'childAge') {
      const age = Number(child.age);
      if (!Number.isInteger(age) || age < 4 || age > 20) { setLocalError(copy.validation.age); return; }
      next('childGender'); return;
    }
    if (step === 'childGender') { if (child.gender !== 'female' && child.gender !== 'male') { setLocalError(copy.validation.gender); return; } next('childSchool'); return; }
    if (step === 'childSchool') {
      if (!child.county || !child.school) { setLocalError(copy.validation.school); return; }
      next('childGrade'); return;
    }
    if (step === 'childGrade') { if (!child.grade) { setLocalError(copy.validation.grade); return; } next('childPerformance'); return; }
    if (step === 'childPerformance') { if (!child.performance) { setLocalError(copy.validation.performance); return; } next('childSubjects'); return; }
    if (step === 'childSubjects') { if (!child.subjects.length) { setLocalError(copy.validation.subjects); return; } next('addAnother'); return; }
    if (step === 'addAnother') {
      if (children.length < 8) {
        setChildren(current => [...current, blankChild()]);
        setChildIndex(children.length);
        next('childName');
      } else {
        setChildIndex(0);
        next('microphone');
      }
      return;
    }
    if (step === 'microphone' || step === 'reminder') { next(step === 'microphone' ? 'reminder' : 'referral'); return; }
    if (step === 'referral') {
      if (!referralSource) { setLocalError(copy.validation.referral); return; }
      next('tutorIntro'); return;
    }
    if (step === 'tutorIntro') { next('mascot'); return; }
    if (step === 'mascot') { if (!child.mascotKey) { setLocalError(copy.validation.tutor); return; } next('voice'); return; }
    if (step === 'voice') { if (!child.voiceName || voicePreviewedName !== child.voiceName) { setLocalError(copy.validation.voice); return; } next('rafiki'); return; }
    if (step === 'rafiki') { next('socialProof'); return; }
    if (step === 'socialProof') { next('commitment'); return; }
    if (step === 'commitment') {
      if (!child.commitmentAccepted) {
        setLocalError(copy.validation.commitment);
        return;
      }
      if (!child.commitmentSignature) {
        setLocalError(copy.validation.sign);
        return;
      }
      next('childReady'); return;
    }
    if (step === 'childReady') {
      if (childIndex < children.length - 1) { setChildIndex(current => current + 1); next('tutorIntro'); return; }
      next('loading'); return;
    }
    if (step === 'ready') { if (collectSignupCredentials) { next('signup'); } else { submit(); } return; }
    if (step === 'signup') {
      if (!collectSignupCredentials) { submit(); return; }
      if (!signupEmail.trim() || !signupEmail.includes('@')) { setLocalError(copy.validation.email); return; }
      if (signupPassword.length < 8) { setLocalError(copy.validation.password); return; }
      if (signupPassword !== signupPasswordConfirm) { setLocalError(copy.validation.match); return; }
      submit();
    }
  }

  function submit(methodOverride: 'email' | 'google' = signupMethod) {
    const selectedSubjectIds = Array.from(new Set(children.flatMap(item => item.subjects)));
    onSubmit({
      role: 'parent', languageCode, displayName: parentName.trim(), gender: parentGender, grade: children[0].grade,
      schoolId: null, countryCode, whatsappNumber: canonicalizeWhatsappNumber(whatsappNumber, selectedWhatsappCallingCountry.callingCode) || undefined, children, parentChildren: children, selectedSubjectIds,
      mascotKey: children[0].mascotKey!, voiceName: children[0].voiceName!, referralSource: referralSource.trim() || undefined, reminderEnabled,
      signupMethod: methodOverride, signupEmail: signupEmail.trim(), signupPassword,
    });
  }

  function selectSchool(school: SchoolCatalogRecord) {
    updateChild({ schoolId: null, schoolDirectoryId: school.schoolId, school: school.name, county: school.county ?? child.county });
    recordSchoolSelection(school.schoolId).catch(() => undefined);
    setSchoolQuery(school.name);
    setSchoolPickerOpen(false);
  }

  async function addSchool() {
    const name = manualSchoolName.trim();
    if (name.length < 2 || !child.county) { setSchoolError(copy.schoolNameValidation); return; }
    setIsAddingSchool(true); setSchoolError(null);
    try {
      const created = onCreateSchool ? await onCreateSchool({ schoolName: name, county: child.county }) : null;
      updateChild({ schoolId: created?.id ?? null, schoolDirectoryId: null, school: created?.name ?? name });
      setSchoolQuery(created?.name ?? name); setAddSchoolOpen(false); setSchoolPickerOpen(false);
    } catch {
      // Manual entry is an intentional no-admin-contact fallback when the school request is unavailable.
      updateChild({ schoolId: null, school: name });
      setSchoolQuery(name); setAddSchoolOpen(false); setSchoolPickerOpen(false);
    } finally { setIsAddingSchool(false); }
  }

  const selectedMascot = MASCOTS.find(option => option.key === child.mascotKey) ?? MASCOTS[0];
  const tutorIntroTitle = copy.tutorIntro;
  const title = step === 'language' ? copy.language : step === 'role' ? copy.title.role : step === 'parentAvatar' ? copy.title.avatar : step === 'parentName' ? copy.title.name : step === 'whatsappNumber' ? copy.title.whatsapp : step === 'country' ? copy.title.country : step === 'childName' ? copy.title.childName : step === 'childAge' ? copy.title.age : step === 'childGender' ? copy.title.gender : step === 'childSchool' ? copy.title.school : step === 'childGrade' ? copy.title.grade : step === 'childPerformance' ? copy.title.performance : step === 'childSubjects' ? copy.title.subjects : step === 'addAnother' ? copy.title.add : step === 'microphone' ? copy.title.microphone : step === 'reminder' ? copy.title.reminder : step === 'referral' ? copy.title.referral : step === 'tutorIntro' ? tutorIntroTitle : step === 'socialProof' ? copy.title.social : step === 'mascot' ? copy.title.tutor : step === 'rafiki' ? copy.title.meet : step === 'voice' ? copy.title.voice : step === 'commitment' ? copy.title.commitment : step === 'childReady' ? copy.title.readyChild : step === 'loading' ? copy.title.loading : step === 'ready' ? copy.title.ready : copy.title.signup;
  const parentCueId = languageCode === 'en'
    ? getParentEnglishOnboardingCueId(step, childIndex, child.mascotKey, child.commitmentAccepted)
    : languageCode === 'sw'
      ? getParentSwahiliOnboardingCueId(step, childIndex, child.mascotKey, child.commitmentAccepted)
      : undefined;
  const parentNarrationCue = parentCueId
    ? buildPrimaryInstruction(
        'parent-onboarding',
        `${step}-${childIndex}-${parentCueId}`,
        title,
        'Bella',
        { language: languageCode ?? undefined, publicCueId: parentCueId },
      )
    : null;
  // Parent signup uses the fixed Bella catalog voice; student onboarding remains out of scope.
  useGuidedNarration(parentNarrationCue, Boolean(parentCueId));

  if (step === 'loading') {
    const studyPlanMessages = copy.studyPlanMessages;
    return <OnboardingVisualShell style={styles.screen}><View style={styles.center}><ActivityIndicator size="large" color="#0F766E" /><Text style={styles.title}>{title}</Text><Text style={styles.studyPlanMessage}>{studyPlanMessages[Math.min(Math.floor(studyPlanProgress / 10), studyPlanMessages.length - 1)]}…</Text><View style={styles.studyPlanTrack}><View style={[styles.studyPlanFill, { width: `${studyPlanProgress}%` }]} /></View><Text style={styles.studyPlanPercent}>{studyPlanProgress}%</Text></View></OnboardingVisualShell>;
  }

  return (
    <OnboardingVisualShell style={styles.screen}>
      <View style={styles.progress}><View style={[styles.progressFill, { width: `${progressValue}%` }]} /></View>
      {step !== 'language' ? <Pressable accessibilityLabel={copy.sw ? 'Rudi kwenye usanidi wa mzazi' : 'Back in parent setup'} onPress={goBack} style={styles.back}><Text style={styles.backText}>{copy.back}</Text></Pressable> : null}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>{copy.kicker}</Text>
        <Text style={styles.title}>{title}</Text>

        {step === 'language' ? <><Text style={styles.languagePrompt}>{copy.prompt}</Text><View style={styles.grid}><Pressable accessibilityLabel="Choose Kiswahili" onPress={() => { setLanguageCode('sw'); next('role'); }} style={({ pressed }) => [styles.choice, pressed && styles.pressed]}><Text style={styles.choiceText}>Kiswahili</Text></Pressable><Pressable accessibilityLabel="Choose English" onPress={() => { setLanguageCode('en'); next('role'); }} style={({ pressed }) => [styles.choice, pressed && styles.pressed]}><Text style={styles.choiceText}>English</Text></Pressable></View></> : null}
        {step === 'role' ? <View style={styles.grid}><Pressable onPress={() => { onRoleChange('parent'); next('parentAvatar'); }} style={styles.choice}><Text style={styles.choiceText}>{copy.roleParent}</Text></Pressable><Pressable onPress={() => onRoleChange('teacher')} style={styles.choice}><Text style={styles.choiceText}>{copy.roleTeacher}</Text></Pressable></View> : null}
        {step === 'parentAvatar' ? <View style={styles.grid}>{PARENT_AVATARS.map(option => <Pressable key={option.key} accessibilityLabel={`${copy.avatarLabel} ${option.key}`} accessibilityRole="radio" accessibilityState={{ selected: parentAvatarKey === option.key }} onPress={() => selectParentAvatar(option)} style={({ pressed }) => [styles.avatarChoice, parentAvatarKey === option.key && styles.selected, pressed && styles.pressed]}><Image accessibilityLabel={copy.sw ? `Mchoro wa ${option.gender === 'female' ? copy.mum : copy.dad}` : `${copy.avatarLabel} ${option.gender === 'female' ? copy.mum : copy.dad} artwork`} resizeMode="contain" source={option.source} style={styles.parentAvatarImage} /><Text style={styles.choiceText}>{parentAvatarKey === option.key ? '✓ ' : ''}{option.gender === 'female' ? copy.mum : copy.dad}</Text></Pressable>)}</View> : null}
        {step === 'parentName' ? <TextInput autoFocus value={parentName} onChangeText={value => { if (/\d/.test(value)) { triggerHaptic('error'); } setParentName(value.replace(/\d/g, '')); setLocalError(null); }} placeholder={copy.namePlaceholder} style={styles.input} /> : null}
        {step === 'whatsappNumber' ? <View style={styles.panel}><Text style={styles.centeredCopy}>{copy.whatsappCopy}</Text><Text style={styles.centeredCopy}>{copy.whatsappHint(WHATSAPP_MOBILE_NSN_LENGTHS[selectedWhatsappCallingCountry.iso2], selectedWhatsappCallingCountry.callingCode)}</Text><View style={styles.whatsappEntryRow}><Pressable accessibilityLabel={copy.sw ? 'Chagua msimbo wa nchi wa WhatsApp' : 'Select WhatsApp country calling code'} accessibilityRole="button" accessibilityValue={{ text: `${selectedWhatsappCallingCountry.name}, +${selectedWhatsappCallingCountry.callingCode}` }} accessibilityState={{ expanded: whatsappCountryPickerOpen }} onPress={() => { setWhatsappCountryQuery(''); setWhatsappCountryPickerOpen(true); }} style={({ pressed }) => [styles.callingCountrySelector, pressed && styles.pressed]}><Text accessibilityLabel={`${selectedWhatsappCallingCountry.name}, +${selectedWhatsappCallingCountry.callingCode}`} ellipsizeMode="tail" numberOfLines={1} style={styles.choiceText}>{selectedWhatsappCallingCountry.iso2} +{selectedWhatsappCallingCountry.callingCode}</Text></Pressable><TextInput accessibilityLabel={copy.sw ? 'Nambari ya WhatsApp' : 'WhatsApp number'} autoCapitalize="none" autoCorrect={false} autoComplete="tel" textContentType="telephoneNumber" autoFocus keyboardType="phone-pad" maxLength={Math.max(...WHATSAPP_MOBILE_NSN_LENGTHS[selectedWhatsappCallingCountry.iso2])} multiline={false} numberOfLines={1} value={whatsappNumber} onChangeText={value => { setWhatsappNumber(sanitizeWhatsappNationalNumber(value, selectedWhatsappCallingCountry.callingCode, Math.max(...WHATSAPP_MOBILE_NSN_LENGTHS[selectedWhatsappCallingCountry.iso2]))); setLocalError(null); }} placeholder={selectedWhatsappCallingCountry.iso2 === 'KE' ? '712345678' : '1'.repeat(Math.max(...WHATSAPP_MOBILE_NSN_LENGTHS[selectedWhatsappCallingCountry.iso2]))} style={[styles.input, styles.whatsappNumberInput]} /> </View>{localError ? <Text style={styles.error}>{localError}</Text> : null}</View> : null}
        {step === 'country' ? <Pressable accessibilityLabel={copy.sw ? 'Chagua nchi ya familia' : 'Select family country'} onPress={() => setCountryPickerOpen(true)} style={[styles.panel, styles.countryPanel]}><Text style={styles.countryFlag}>{COUNTRY_OPTIONS.find(option => option.code === countryCode)?.flag}</Text><Text style={styles.choiceText}>{COUNTRY_OPTIONS.find(option => option.code === countryCode)?.name}</Text><Text style={styles.centeredCopy}>{COUNTRY_OPTIONS.find(option => option.code === countryCode)?.curriculum} {copy.curriculum}</Text><Text style={styles.changeCountry}>{copy.country}</Text></Pressable> : null}
        {step === 'childName' ? <TextInput autoFocus value={child.name} onChangeText={value => { if (/\d/.test(value)) { triggerHaptic('error'); } updateChild({ name: value.replace(/\d/g, '') }); }} placeholder={copy.childPlaceholder} style={styles.input} /> : null}
        {step === 'childAge' ? <TextInput autoFocus keyboardType="number-pad" value={child.age} onChangeText={value => updateChild({ age: value.replace(/\D/g, '').slice(0, 2) })} placeholder={copy.agePlaceholder} style={styles.input} /> : null}
        {step === 'childGender' ? <View style={styles.grid}>{(['female', 'male'] as GenderOption[]).map(value => <Pressable key={value} onPress={() => { updateChild({ gender: value }); next('childSchool'); }} style={[styles.choice, child.gender === value && styles.selected]}><Text style={styles.choiceText}>{value === 'female' ? copy.girl : copy.boy}</Text></Pressable>)}</View> : null}
        {step === 'childSchool' ? <>
          <Pressable onPress={() => { setCountyQuery(''); setCountyPickerOpen(true); }} style={styles.input}><Text>{child.county || copy.selectRegion(copy.sw ? regionMeta.labelSw : regionMeta.label)}</Text></Pressable>
          <Pressable disabled={!child.county} onPress={() => setSchoolPickerOpen(true)} style={[styles.input, !child.county && styles.disabled]}><Text>{child.school || copy.selectSchool}</Text></Pressable>
        </> : null}
        {step === 'childGrade' ? <View style={styles.grid}>{SUPPORTED_GRADES.map(value => <Pressable key={value} onPress={() => updateChild({ grade: value, subjects: child.grade === value ? child.subjects : [] })} style={[styles.choice, child.grade === value && styles.selected]}><Text style={styles.choiceText}>{copy.grade(value)}</Text></Pressable>)}</View> : null}
        {step === 'childPerformance' ? <View style={styles.grid}>{PERFORMANCE_OPTIONS.map(option => <Pressable key={option.value} onPress={() => { updateChild({ performance: option.value }); next('childSubjects'); }} style={[styles.choice, child.performance === option.value && styles.selected]}><Text style={styles.choiceText}>{copy.performance(option.label)}</Text></Pressable>)}</View> : null}
        {step === 'childSubjects' ? <View style={styles.grid}>
          <Pressable onPress={() => updateChild({ subjects: allAreasSelected ? [] : subjectIdsForGrade })} style={[styles.choice, allAreasSelected && styles.selected]}>
            <Text style={styles.choiceText}>{allAreasSelected ? '✓ ' : ''}{copy.allAreas}</Text>
          </Pressable>
          {subjectOptions.map(subject => {
            const selected = child.subjects.includes(subject.id);
            return <Pressable key={subject.id} onPress={() => { setOrdering(current => recordParentOnboardingSelection(current, 'subject', subject.id)); updateChild({ subjects: selected ? child.subjects.filter(id => id !== subject.id) : [...child.subjects, subject.id] }); }} style={[styles.choice, selected && styles.selected]}><Text style={styles.choiceText}>{selected ? '✓ ' : ''}{copy.subject(subject.name)}</Text></Pressable>;
          })}
        </View> : null}
        {step === 'addAnother' ? <View style={styles.grid}><Pressable onPress={() => { setChildren(current => [...current, blankChild()]); setChildIndex(children.length); next('childName'); }} style={styles.choice}><Text style={styles.choiceText}>{copy.yesAdd}</Text></Pressable><Pressable onPress={() => { setChildIndex(0); next('microphone'); }} style={styles.choice}><Text style={styles.choiceText}>{copy.noContinue}</Text></Pressable></View> : null}
        {step === 'microphone' ? <><Text style={styles.panel}>{copy.microphoneCopy}</Text><View style={styles.permissionChoices}><Pressable onPress={() => next('reminder')} style={styles.choice}><Text style={styles.choiceText}>{copy.notNow}</Text></Pressable><Pressable onPress={() => { if (Platform.OS === 'web') { next('reminder'); return; } requestRecordingPermissionsAsync().catch(() => undefined).finally(() => next('reminder')); }} style={[styles.choice, styles.permissionAllow]}><Text style={styles.choiceText}>{copy.allow}</Text></Pressable></View></> : null}
        {step === 'reminder' ? <><Text style={styles.panel}>{copy.reminderCopy}</Text><View style={styles.permissionChoices}><Pressable onPress={() => { setReminderEnabled(false); next('referral'); }} style={styles.choice}><Text style={styles.choiceText}>{copy.notNow}</Text></Pressable><Pressable onPress={() => requestPushPermission().then(permission => setReminderEnabled(permission.granted)).catch(() => setReminderEnabled(false)).finally(() => next('referral'))} style={[styles.choice, styles.permissionAllow]}><Text style={styles.choiceText}>{copy.allow}</Text></Pressable></View></> : null}
        {step === 'referral' ? <View style={styles.grid}>{referralOptions.map(option => <Pressable key={option.value} onPress={() => { setReferralSource(option.value); recordParentOnboardingSelection(ordering, 'referral', option.value); }} style={[styles.choice, referralSource === option.value && styles.selected]}><Text style={styles.choiceText}>{copy.referral(option.label)}</Text></Pressable>)}</View> : null}
        {step === 'tutorIntro' ? <View style={styles.tutorIntro}><Text style={styles.tutorIntroCopy}>{childIndex > 0 ? tutorIntroTitle : copy.tutorIntroForChild}</Text></View> : null}
        {step === 'mascot' ? <View style={styles.grid}>{MASCOTS.map(option => <Pressable key={option.key} accessibilityRole="button" accessibilityLabel={copy.sw ? `Chagua na uendelee na ${copy.mascot(option.key)}` : `Select ${copy.mascot(option.key)} and continue`} onPress={() => selectMascot(option.key)} style={({ pressed }) => [styles.choice, child.mascotKey === option.key && styles.selected, pressed && styles.pressed]}><Image accessibilityLabel={copy.sw ? `Mchoro wa ${copy.mascot(option.key)}` : `${copy.mascot(option.key)} artwork`} resizeMode="contain" source={option.source} style={styles.mascotImage} /><Text style={styles.choiceText}>{copy.mascot(option.key)}</Text></Pressable>)}</View> : null}
        {step === 'rafiki' ? <LinearGradient colors={['#FFF0DD', '#E6F4EE']} style={styles.tutorPanel}><Image accessibilityLabel={copy.sw ? `Mchoro wa ${copy.mascot(selectedMascot.key)} aliyechaguliwa` : 'Selected Rafiki artwork'} resizeMode="contain" source={selectedMascot.source} style={styles.revealMascotImage} /><Text style={styles.choiceText}>{copy.rafiki(selectedMascot.key)}</Text></LinearGradient> : null}
        {step === 'voice' ? <><View style={styles.selectedVoiceMascot}><Image accessibilityLabel={copy.sw ? `Mnyama aliyechaguliwa: ${copy.mascot(selectedMascot.key)}` : 'Selected mascot on voice screen'} resizeMode="contain" source={selectedMascot.source} style={styles.voiceMascotImage} /><Text style={styles.centeredCopy}>{copy.mascot(selectedMascot.key)}</Text></View><View style={styles.grid}>{VOICES.map(option => {
          const selected = child.voiceName === option.name;
          return <Pressable key={option.name} accessibilityRole="button" accessibilityLabel={copy.sw ? `Chagua na usikilize sauti ya ${option.name}` : `Select and preview ${option.name} voice`} onPress={() => { previewVoice(option).catch(() => undefined); }} style={({ pressed }) => [styles.choice, selected && styles.selected, pressed && styles.pressed]}>
            <Text style={styles.choiceText}>{copy.voice(option.name)}</Text>
          </Pressable>;
        })}</View></> : null}
        {step === 'socialProof' ? <View style={styles.panel}><Text style={styles.centeredCopy}>{copy.social}</Text></View> : null}
        {step === 'commitment' ? <View style={styles.panel}><Text style={styles.commitmentPrompt}>{copy.commitmentPrompt}</Text><View style={styles.permissionChoices}><Pressable onPress={() => { updateChild({ commitmentAccepted: false, commitmentSignature: undefined }); setSignaturePoints([]); }} style={styles.choice}><Text style={styles.choiceText}>{copy.no}</Text></Pressable><Pressable onPress={() => updateChild({ commitmentAccepted: true })} style={[styles.choice, child.commitmentAccepted && styles.selected]}><Text style={styles.choiceText}>{copy.yes}</Text></Pressable></View>{child.commitmentAccepted ? <><Text style={styles.signatureLabel}>{copy.sign}</Text><View style={styles.signatureRow}><View accessibilityLabel={copy.sw ? 'Eneo la saini' : 'Signature canvas'} onStartShouldSetResponder={() => true} onResponderGrant={event => startSignature(event.nativeEvent.locationX, event.nativeEvent.locationY)} onResponderMove={event => extendSignature(event.nativeEvent.locationX, event.nativeEvent.locationY)} onResponderRelease={event => finishSignature(event.nativeEvent.locationX, event.nativeEvent.locationY)} onResponderTerminate={event => finishSignature(event.nativeEvent.locationX, event.nativeEvent.locationY)} style={[styles.signatureCanvas, child.commitmentSignature && styles.selected]}>{(signaturePointsByChild[childIndex] ?? []).slice(1).map((point, index) => { const previous = signaturePointsByChild[childIndex][index]; const length = Math.hypot(point.x - previous.x, point.y - previous.y); const angle = Math.atan2(point.y - previous.y, point.x - previous.x) * 180 / Math.PI; return <View key={`${index}-${point.x}-${point.y}`} pointerEvents="none" style={[styles.signatureStroke, { left: (previous.x + point.x) / 2 - length / 2, top: (previous.y + point.y) / 2 - 1, width: length, transform: [{ rotate: `${angle}deg` }] }]} />; })}{child.commitmentSignature ? null : <Text pointerEvents="none" style={styles.signatureHint}>{copy.draw}</Text>}</View><Image accessibilityLabel={copy.sw ? `Mchoro wa ${copy.mascot(selectedMascot.key)} kwa ahadi` : 'Commitment mascot artwork'} resizeMode="contain" source={selectedMascot.source} style={styles.signatureMascot} /></View>{child.commitmentSignature ? <Text style={styles.signaturePreview}>{copy.signed(child.name)}</Text> : null}</> : null}</View> : null}
        {step === 'childReady' ? <LinearGradient colors={['#123F59', '#1A6A73']} style={styles.readyHero}><Image accessibilityLabel={copy.sw ? 'Mchoro wa Rafiki: mtoto yuko tayari' : 'Ready mascot artwork'} resizeMode="contain" source={selectedMascot.source} style={styles.readyMascotImage} /><View style={styles.readyCopy}><Text style={styles.readyTitle}>{copy.title.readyChild}</Text><Text style={styles.readyText}>{copy.readyCopy}</Text></View></LinearGradient> : null}
        {step === 'ready' ? <LinearGradient colors={['#123F59', '#1A6A73']} style={styles.readyHero}><View pointerEvents="none" style={styles.confettiLayer}>{['●', '✦', '▲', '◆'].map((piece, index) => <Animated.Text key={piece} style={[styles.confettiPiece, { left: `${14 + index * 24}%`, transform: [{ translateY: confettiFall.interpolate({ inputRange: [0, 1], outputRange: [-90 - index * 24, 220] }) }, { rotate: `${index % 2 ? 180 : 360}deg` }] }]}>{piece}</Animated.Text>)}</View><Image accessibilityLabel={copy.sw ? 'Mchoro wa Rafiki: mpango uko tayari' : 'Ready mascot artwork'} resizeMode="contain" source={selectedMascot.source} style={styles.readyMascotImage} /><View style={styles.readyCopy}><Text style={styles.readyTitle}>{copy.title.ready}</Text><Text style={styles.readyText}>{copy.readyText(countryCode)}</Text>{children.map((item, index) => <Text key={`${item.name}-${index}`} style={styles.readyRow}>{copy.readyRow(item.name, index)}</Text>)}</View></LinearGradient> : null}
        {step === 'signup' ? <View style={styles.accountPanel}><Text style={styles.accountText}>{copy.signupCopy}</Text><MobileAnalyticsConsentCard role="parent" /><Pressable accessibilityLabel={copy.google} accessibilityRole="button" disabled={isSubmitting} onPress={() => { setSignupMethod('google'); submit('google'); }} style={[styles.googleButton, isSubmitting && styles.googleDisabled]}><GoogleLogo size={20} /><Text style={styles.googleText}>{copy.google}</Text></Pressable><Text style={styles.orText}>{copy.email}</Text><TextInput autoCapitalize="none" keyboardType="email-address" value={signupEmail} onChangeText={setSignupEmail} placeholder={copy.emailPlaceholder} style={styles.input} /><View style={styles.passwordRow}><TextInput autoCapitalize="none" secureTextEntry={!showSignupPassword} value={signupPassword} onChangeText={setSignupPassword} placeholder={copy.password} style={styles.passwordInput} /><Pressable accessibilityLabel={showSignupPassword ? copy.hide : copy.show} onPress={() => setShowSignupPassword(value => !value)} style={styles.visibilityButton}><Text style={styles.visibilityText}>{showSignupPassword ? copy.hide : copy.show}</Text></Pressable></View><View style={styles.passwordRow}><TextInput autoCapitalize="none" secureTextEntry={!showSignupPasswordConfirm} value={signupPasswordConfirm} onChangeText={setSignupPasswordConfirm} placeholder={copy.confirmPassword} style={styles.passwordInput} /><Pressable accessibilityLabel={showSignupPasswordConfirm ? copy.hide : copy.show} onPress={() => setShowSignupPasswordConfirm(value => !value)} style={styles.visibilityButton}><Text style={styles.visibilityText}>{showSignupPasswordConfirm ? copy.hide : copy.show}</Text></Pressable></View></View> : null}
        {(localError || error) && step !== 'whatsappNumber' ? <Text style={styles.error}>{localError || error}</Text> : null}
      </ScrollView>
      {step !== 'language' && step !== 'childGender' && step !== 'childPerformance' && step !== 'microphone' && step !== 'reminder' ? <Pressable disabled={continueDisabled} onPress={validateAndContinue} style={[styles.button, continueDisabled && styles.disabled]}><Text style={styles.buttonText}>{isSubmitting ? copy.saving : step === 'country' ? copy.confirmCountry : step === 'signup' ? (copy.sw ? 'Fungua akaunti' : 'Create Account') : copy.continue}</Text></Pressable> : null}

      <Modal transparent visible={countryPickerOpen} onRequestClose={() => setCountryPickerOpen(false)}><Pressable style={styles.modalBackdrop} onPress={() => setCountryPickerOpen(false)}><View style={styles.sheet}><Text style={styles.sheetTitle}>{copy.sw ? 'Chagua nchi yako' : 'Choose your country'}</Text><ScrollView>{[...COUNTRY_OPTIONS].sort((left, right) => Number(right.code === detectedCountryCode) - Number(left.code === detectedCountryCode)).map(option => <Pressable key={option.code} onPress={() => { setCountryCode(option.code); setCountryPickerOpen(false); }} style={styles.sheetRow}><Text style={styles.choiceText}>{option.flag} {option.name}{option.code === detectedCountryCode ? (copy.sw ? ' · Imetambuliwa' : ' · Detected') : ''}</Text><Text>{option.curriculum} {copy.curriculum}</Text></Pressable>)}</ScrollView></View></Pressable></Modal>
      <Modal transparent visible={whatsappCountryPickerOpen} onRequestClose={() => setWhatsappCountryPickerOpen(false)}><Pressable style={styles.modalBackdrop} onPress={() => setWhatsappCountryPickerOpen(false)}><View style={styles.sheet}><Text style={styles.sheetTitle}>{copy.sw ? 'Chagua nchi ya WhatsApp' : 'Choose WhatsApp country'}</Text><TextInput accessibilityLabel={copy.sw ? 'Tafuta nchi za WhatsApp' : 'Search WhatsApp countries'} autoFocus value={whatsappCountryQuery} onChangeText={setWhatsappCountryQuery} placeholder={copy.sw ? 'Tafuta nchi' : 'Search countries'} style={styles.input} /><ScrollView>{filteredWhatsappCallingCountries.map(option => <Pressable key={option.iso2} accessibilityRole="radio" accessibilityLabel={`${option.name}, ${option.iso2} +${option.callingCode}`} accessibilityState={{ selected: option.iso2 === whatsappCallingCountryCode }} onPress={() => { setWhatsappCallingCountryCode(option.iso2); setWhatsappNumber(current => sanitizeWhatsappNationalNumber(current, option.callingCode, Math.max(...WHATSAPP_MOBILE_NSN_LENGTHS[option.iso2]))); setWhatsappCountryPickerOpen(false); }} style={[styles.sheetRow, option.iso2 === whatsappCallingCountryCode && styles.selected]}><Text style={styles.choiceText}>{option.iso2} +{option.callingCode}</Text></Pressable>)}</ScrollView></View></Pressable></Modal>
      <Modal transparent visible={countyPickerOpen} onRequestClose={() => setCountyPickerOpen(false)}><Pressable style={styles.modalBackdrop} onPress={() => setCountyPickerOpen(false)}><View style={styles.sheet}><TextInput accessibilityLabel={copy.sw ? 'Tafuta kaunti' : 'Search county'} autoFocus value={countyQuery} onChangeText={setCountyQuery} placeholder={copy.sw ? 'Tafuta kaunti' : 'Search counties'} style={styles.input} /><ScrollView>{filterCountyOptions(regionMeta.options, countyQuery).map(option => <Pressable key={option} onPress={() => { updateChild({ county: option, schoolId: null, schoolDirectoryId: null, school: '' }); setSchoolQuery(''); setCountyQuery(''); setCountyPickerOpen(false); }} style={styles.sheetRow}><Text>{option}</Text></Pressable>)}{filterCountyOptions(regionMeta.options, countyQuery).length === 0 ? <Text style={styles.empty}>{copy.sw ? 'Hakuna kaunti inayolingana.' : 'No counties match your search.'}</Text> : null}</ScrollView></View></Pressable></Modal>
      <Modal transparent visible={schoolPickerOpen} onRequestClose={() => setSchoolPickerOpen(false)}><Pressable style={styles.modalBackdrop} onPress={() => setSchoolPickerOpen(false)}><View style={styles.sheet}><TextInput accessibilityLabel={copy.sw ? 'Tafuta shule kwa jina' : 'Search school by name'} autoFocus value={schoolQuery} onChangeText={setSchoolQuery} placeholder={copy.sw ? 'Tafuta shule' : 'Search schools'} style={styles.input} />{isLoadingDirectorySchools ? <ActivityIndicator accessibilityLabel={copy.sw ? 'Inapakia shule' : 'Loading schools'} color="#F97316" /> : null}{directoryError ? <Text style={styles.error}>{directoryError}</Text> : null}<ScrollView>{directorySchools.map(school => <Pressable key={school.schoolId} onPress={() => selectSchool(school)} style={styles.sheetRow}><Text onPress={() => selectSchool(school)}>{school.name}</Text><Text style={styles.county}>{school.county ?? child.county}</Text></Pressable>)}{!isLoadingDirectorySchools && !directoryError && directorySchools.length === 0 ? <Text style={styles.empty}>{copy.sw ? 'Hakuna inayolingana. Ongeza shule yako hapa chini.' : 'No schools found. Add your school below.'}</Text> : null}<Pressable accessibilityLabel={copy.sw ? 'Ongeza shule yako' : 'Add your school'} onPress={() => { setManualSchoolName(schoolQuery); setSchoolPickerOpen(false); setAddSchoolOpen(true); }} style={styles.addSchool}><Text style={styles.addSchoolText}>{copy.sw ? 'Ongeza shule yako' : 'Add Your School'}</Text></Pressable></ScrollView></View></Pressable></Modal>
      <Modal transparent visible={addSchoolOpen} onRequestClose={() => setAddSchoolOpen(false)}><View style={styles.modalBackdrop}><View style={styles.sheet}><Text style={styles.sheetTitle}>{copy.sw ? 'Ongeza shule yako' : 'Add Your School'}</Text><Text style={styles.county}>{copy.sw ? 'Kaunti iliyochaguliwa' : 'Selected county'}: {child.county}</Text><TextInput accessibilityLabel={copy.sw ? 'Jina la shule' : 'School name'} autoFocus value={manualSchoolName} onChangeText={setManualSchoolName} placeholder={copy.sw ? 'Andika jina la shule' : 'Enter school name'} style={styles.input} />{schoolError ? <Text style={styles.error}>{schoolError}</Text> : null}<Pressable disabled={isAddingSchool} onPress={addSchool} style={styles.modalButton}><Text style={styles.buttonText}>{isAddingSchool ? copy.saving : (copy.sw ? 'Hifadhi na uendelee' : 'Save and Continue')}</Text></Pressable></View></View></Modal>
    </OnboardingVisualShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.82)', borderColor: 'rgba(255,255,255,0.9)', borderRadius: 28, borderWidth: 1, flex: 1, gap: 18, justifyContent: 'center', margin: 24, padding: 24 },
  progress: { backgroundColor: 'rgba(255,255,255,0.72)', height: 6, width: '100%' },
  progressFill: { backgroundColor: '#F97316', height: 5 },
  back: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.82)', borderColor: 'rgba(255,255,255,0.9)', borderRadius: 999, borderWidth: 1, marginLeft: 20, marginTop: 12, paddingHorizontal: 16, paddingVertical: 9 },
  backText: { color: '#123F59', fontSize: 15, fontWeight: '800' },
  content: { alignItems: 'center', flexGrow: 1, gap: 16, justifyContent: 'center', padding: 24, paddingBottom: 126 },
  kicker: { color: '#B45309', fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textAlign: 'center' },
  title: { color: '#123F59', fontSize: 28, fontWeight: '900', lineHeight: 34, textAlign: 'center' },
  languagePrompt: { color: '#52636A', fontSize: 15, fontWeight: '700', lineHeight: 20, textAlign: 'center' },
  subtitle: { color: '#52636A', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  grid: { alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  choice: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.94)', borderColor: 'rgba(255,255,255,0.98)', borderRadius: 18, borderWidth: 1, minHeight: 52, justifyContent: 'center', padding: 14, width: '48%' },
  avatarChoice: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.94)', borderColor: 'rgba(255,255,255,0.98)', borderRadius: 20, borderWidth: 1, minHeight: 170, justifyContent: 'center', padding: 12, width: '48%' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  selected: { backgroundColor: '#FFF0DD', borderColor: '#F97316' },
  choiceText: { color: '#123F59', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  mascotImage: { alignSelf: 'center', height: 84, width: 84 },
  parentAvatarImage: { height: 120, width: 120 },
  input: { backgroundColor: '#FFFFFF', borderColor: '#D8D0C5', borderRadius: 12, borderWidth: 1, color: '#123F59', fontSize: 16, minHeight: 52, paddingHorizontal: 14, paddingVertical: 12 },
  whatsappEntryRow: { alignSelf: 'stretch', flexDirection: 'row', gap: 8, minWidth: 0 },
  callingCountrySelector: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D8D0C5', borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 52, paddingHorizontal: 8, paddingVertical: 12, width: 92 },
  whatsappNumberInput: { flex: 1, minWidth: 0, paddingHorizontal: 8 },
  disabled: { opacity: 0.45 },
  panel: { alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.92)', borderColor: 'rgba(255,255,255,0.98)', borderRadius: 20, borderWidth: 1, gap: 8, padding: 18 },
  countryPanel: { alignItems: 'center' },
  tutorPanel: { alignSelf: 'stretch', borderRadius: 16, gap: 8, padding: 18 },
  tutorIntro: { alignSelf: 'stretch', backgroundColor: '#FFFFFF', borderColor: '#E8E0D4', borderRadius: 18, borderWidth: 1, gap: 12, padding: 22 },
  tutorIntroCopy: { color: '#52636A', fontSize: 16, lineHeight: 24, textAlign: 'center' },
  tutorNames: { color: '#123F59', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  commitmentRow: { borderColor: '#E8E0D4', borderRadius: 12, borderWidth: 1, padding: 14 },
  commitmentPrompt: { color: '#123F59', fontSize: 19, fontWeight: '900', textAlign: 'center' },
  signatureLabel: { color: '#123F59', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  signatureCanvas: { alignItems: 'center', borderColor: '#B45309', borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, flex: 1, justifyContent: 'center', minHeight: 100, overflow: 'hidden', position: 'relative' },
  signatureStroke: { backgroundColor: '#123F59', borderRadius: 999, height: 3, position: 'absolute' },
  signatureRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  signatureHint: { color: '#8A7F72', fontWeight: '700' },
  signaturePreview: { color: '#16704A', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  signatureMascot: { height: 94, width: 94 },
  proof: { color: '#F97316', fontSize: 38, fontWeight: '900' },
  countryFlag: { fontSize: 42 },
  changeCountry: { color: '#B45309', fontWeight: '800' },
  rafiki: { fontSize: 64, textAlign: 'center' },
  revealMascotImage: { alignSelf: 'center', height: 150, width: 150 },
  selectedVoiceMascot: { alignItems: 'center', gap: 4 },
  voiceMascotImage: { height: 72, width: 72 },
  centeredCopy: { textAlign: 'center' },
  permissionChoices: { alignSelf: 'stretch', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  permissionAllow: { backgroundColor: '#FFF0DD', borderColor: '#F97316' },
  passwordRow: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: '#FFFFFF', borderColor: '#D8D0C5', borderRadius: 12, borderWidth: 1, flexDirection: 'row', minHeight: 52 },
  passwordInput: { color: '#123F59', flex: 1, fontSize: 16, paddingHorizontal: 14, paddingVertical: 12 },
  visibilityButton: { paddingHorizontal: 14, paddingVertical: 12 },
  visibilityText: { color: '#B45309', fontSize: 13, fontWeight: '900' },
  readyHero: { alignItems: 'center', alignSelf: 'stretch', borderRadius: 20, flexDirection: 'row', gap: 16, minHeight: 190, overflow: 'hidden', padding: 20 },
  readyMascotImage: { height: 128, width: 108 },
  readyCopy: { flex: 1, gap: 8 },
  readyTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  readyText: { color: '#D9F4EE', fontSize: 14 },
  readyRow: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  accountPanel: { alignSelf: 'stretch', backgroundColor: '#FFFFFF', borderColor: '#E8E0D4', borderRadius: 18, borderWidth: 1, gap: 12, padding: 18 },
  accountText: { color: '#52636A', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  googleButton: { alignItems: 'center', borderColor: '#D8D0C5', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 10, minHeight: 50, justifyContent: 'center', paddingHorizontal: 14 },
  googleDisabled: { opacity: 0.55 },
  googleText: { color: '#52636A', fontSize: 15, fontWeight: '800' },
  orText: { color: '#8A7F72', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  error: { color: '#B91C1C', fontSize: 14, fontWeight: '700' },
  button: { backgroundColor: '#0F766E', borderRadius: 18, bottom: 24, left: 24, minHeight: 54, justifyContent: 'center', paddingHorizontal: 18, position: 'absolute', right: 24 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(18,63,89,0.35)', flex: 1, justifyContent: 'center', padding: 24 },
  sheet: { alignSelf: 'stretch', backgroundColor: '#FFFFFF', borderRadius: 22, maxHeight: '70%', maxWidth: 440, padding: 18 },
  sheetTitle: { color: '#123F59', fontSize: 20, fontWeight: '900', marginBottom: 10 },
  sheetRow: { borderBottomColor: '#EFE8DE', borderBottomWidth: 1, padding: 16 },
  addSchool: { backgroundColor: '#FFF0DD', borderRadius: 12, marginTop: 12, padding: 14 },
  addSchoolText: { color: '#B45309', fontWeight: '900', textAlign: 'center' },
  empty: { color: '#52636A', paddingVertical: 14 },
  county: { color: '#123F59', fontWeight: '800', marginBottom: 10 },
  modalButton: { backgroundColor: '#F97316', borderRadius: 14, marginTop: 14, minHeight: 52, justifyContent: 'center', paddingHorizontal: 18 },
  studyPlanMessage: { color: '#52636A', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  studyPlanTrack: { backgroundColor: 'rgba(15,118,110,0.18)', borderRadius: 999, height: 12, overflow: 'hidden', width: '100%' },
  studyPlanFill: { backgroundColor: '#0F766E', height: '100%' },
  studyPlanPercent: { color: '#123F59', fontSize: 18, fontWeight: '900' },
  confettiLayer: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  confettiPiece: { color: '#FDE68A', fontSize: 22, fontWeight: '900', position: 'absolute', top: 0 },
});
