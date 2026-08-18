import React, { useEffect, useMemo, useRef, useState } from 'react';
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

import { SUPPORTED_GRADES } from '../constants/grades';
import { COUNTRY_OPTIONS, REGIONS_BY_COUNTRY, detectDefaultCountryCode } from '../constants/locations';
import { triggerHaptic } from '../services/haptics';
import { requestPushPermission } from '../services/pushNotifications';
import { buildPrimaryInstruction, getParentEnglishOnboardingCueId, useGuidedNarration } from '../services/narrationService';
import {
  emptyParentOnboardingOrder,
  loadParentOnboardingOrder,
  orderByLocalAggregate,
  recordParentOnboardingSelection,
  type ParentOnboardingOrderState,
} from '../utils/parentOnboardingOrdering';
import { parentOnboardingSubjectOptions } from '../utils/parentOnboardingSubjects';
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
  onSubmit: (input: ParentHouseholdOnboardingInput) => void;
  onRoleChange: (role: 'parent' | 'teacher') => void;
};

type Step =
  | 'language'
  | 'role'
  | 'parentAvatar'
  | 'parentName'
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
const VOICES: Array<{ name: OnboardingVoiceName; label: string; en: AudioSource }> = [
  { name: 'Samora', label: 'Warm and encouraging', en: require('../assets/Samora-Sekou-Eng.mp3') },
  { name: 'Barake', label: 'Calm and clear', en: require('../assets/Barake-Dexter-Eng.mp3') },
  { name: 'Bella', label: 'Bright and energetic', en: require('../assets/Bella-Anya-Eng.mp3') },
  { name: 'Judith', label: 'Patient and steady', en: require('../assets/Judith-cay-Eng.mp3') },
];

function blankChild(): ParentHouseholdChildInput {
  return {
    name: '', age: '', gender: 'not_specified', county: '', schoolId: null, school: '',
    grade: '', performance: '' as ParentHouseholdChildInput['performance'], subjects: [], commitmentAccepted: false, commitmentMinutes: 20,
  };
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
  onSubmit,
  onRoleChange,
}: Props) {
  const initialStep: Step = skipHouseholdSetup ? 'childName' : 'language';
  const [stepHistory, setStepHistory] = useState<Step[]>([initialStep]);
  const [languageCode, setLanguageCode] = useState<OnboardingLanguageCode | null>(null);
  const [parentName, setParentName] = useState(initialParentName);
  const [parentAvatarKey, setParentAvatarKey] = useState<ParentAvatarKey | null>(null);
  const [parentGender, setParentGender] = useState<GenderOption>('not_specified');
  const [countryCode, setCountryCode] = useState<string>(initialCountryCode ?? detectDefaultCountryCode());
  const detectedCountryCode = initialCountryCode ?? detectDefaultCountryCode();
  const [children, setChildren] = useState<ParentHouseholdChildInput[]>([blankChild()]);
  const [childIndex, setChildIndex] = useState(0);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countyPickerOpen, setCountyPickerOpen] = useState(false);
  const [schoolPickerOpen, setSchoolPickerOpen] = useState(false);
  const [schoolQuery, setSchoolQuery] = useState('');
  const [addSchoolOpen, setAddSchoolOpen] = useState(false);
  const [manualSchoolName, setManualSchoolName] = useState('');
  const [schoolError, setSchoolError] = useState<string | null>(null);
  const [isAddingSchool, setIsAddingSchool] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [referralSource, setReferralSource] = useState('');
  const [ordering, setOrdering] = useState<ParentOnboardingOrderState>(emptyParentOnboardingOrder);
  const [voicePreviewingName, setVoicePreviewingName] = useState<OnboardingVoiceName | null>(null);
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
  const countySchools = useMemo(
    () => schools.filter(school => !child.county || school.location.toLowerCase() === child.county.toLowerCase()),
    [child.county, schools],
  );
  const filteredSchools = countySchools.filter(school => school.name.toLowerCase().includes(schoolQuery.toLowerCase().trim()));
  const subjectOptionsForGrade = parentOnboardingSubjectOptions(child.grade);
  const subjectIdsForGrade = subjectOptionsForGrade.map(subject => subject.id);
  const allAreasSelected = subjectIdsForGrade.length > 0 && subjectIdsForGrade.every(subjectId => child.subjects.includes(subjectId));
  const referralOptions = orderByLocalAggregate(REFERRAL_OPTIONS, ordering.referral);
  const subjectOptions = orderByLocalAggregate(subjectOptionsForGrade.map(subject => ({ value: subject.id, subject })), ordering.subject).map(item => item.subject);
  const step = stepHistory[stepHistory.length - 1];
  const progress = ['language', 'role', 'parentAvatar', 'parentName', 'country', 'childName', 'childAge', 'childGender', 'childSchool', 'childGrade', 'childPerformance', 'childSubjects', 'addAnother', 'microphone', 'reminder', 'referral', 'tutorIntro', 'mascot', 'voice', 'rafiki', 'socialProof', 'commitment', 'childReady', 'ready', 'signup'];
  const progressValue = Math.round(((progress.indexOf(step) + 1) / progress.length) * 100);

  function updateChild(update: Partial<ParentHouseholdChildInput>) {
    setChildren(current => current.map((item, index) => index === childIndex ? { ...item, ...update } : item));
    setLocalError(null);
  }

  function selectMascot(value: OnboardingMascotKey) {
    updateChild({ mascotKey: value });
  }

  function selectParentAvatar(option: (typeof PARENT_AVATARS)[number]) {
    setParentAvatarKey(option.key);
    setParentGender(option.gender);
    setLocalError(null);
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
    setVoicePreviewingName(null);
  }

  async function previewVoice(option: (typeof VOICES)[number]) {
    stopVoicePreview();
    const requestId = voicePreviewRequestIdRef.current;
    selectVoice(option.name);
    setVoicePreviewedName(null);
    setVoicePreviewingName(option.name);

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
      const player = createAudioPlayer(option.en, { downloadFirst: true });
      voicePlayerRef.current = player;
      voicePreviewSubscriptionRef.current = player.addListener(
        'playbackStatusUpdate',
        (status: AudioStatus) => {
          if (voicePreviewRequestIdRef.current !== requestId) {
            return;
          }
          if (status.playing) {
            setVoicePreviewedName(option.name);
            setVoicePreviewingName(null);
          }
          if (status.didJustFinish) {
            setVoicePreviewingName(null);
          }
        },
      );
      player.play();
    } catch {
      if (voicePreviewRequestIdRef.current === requestId) {
        setVoicePreviewingName(null);
      }
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
    if (step === 'language') { if (!languageCode) { setLocalError('Choose a language to continue.'); return; } next('role'); return; }
    if (step === 'role') { onRoleChange('parent'); next('parentAvatar'); return; }
    if (step === 'parentAvatar') { if (!parentAvatarKey) { setLocalError('Choose an avatar to continue.'); return; } next('parentName'); return; }
    if (step === 'parentName') {
      if (parentName.trim().length < 2 || /\d/.test(parentName)) { setLocalError('Enter your name to continue.'); triggerHaptic('error'); return; }
      next('country'); return;
    }
    if (step === 'country') { next('childName'); return; }
    if (step === 'childName') {
      if (child.name.trim().length < 2) { setLocalError('Enter your child\'s name to continue.'); return; }
      next('childAge'); return;
    }
    if (step === 'childAge') {
      const age = Number(child.age);
      if (!Number.isInteger(age) || age < 4 || age > 20) { setLocalError('Age must be between 4 and 20.'); return; }
      next('childGender'); return;
    }
    if (step === 'childGender') { if (child.gender !== 'female' && child.gender !== 'male') { setLocalError('Choose Girl or Boy to continue.'); return; } next('childSchool'); return; }
    if (step === 'childSchool') {
      if (!child.county || !child.school) { setLocalError('Select a county and school to continue.'); return; }
      next('childGrade'); return;
    }
    if (step === 'childGrade') { if (!child.grade) { setLocalError('Select a grade to continue.'); return; } next('childPerformance'); return; }
    if (step === 'childPerformance') { if (!child.performance) { setLocalError('Choose a performance level to continue.'); return; } next('childSubjects'); return; }
    if (step === 'childSubjects') { if (!child.subjects.length) { setLocalError('Select at least one subject.'); return; } next('addAnother'); return; }
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
      if (!referralSource) { setLocalError('Choose how you heard about Kitabu.'); return; }
      next('tutorIntro'); return;
    }
    if (step === 'tutorIntro') { next('mascot'); return; }
    if (step === 'mascot') { if (!child.mascotKey) { setLocalError('Choose a tutor to continue.'); return; } next('voice'); return; }
    if (step === 'voice') { if (!child.voiceName) { setLocalError('Choose a tutor voice to continue.'); return; } next('rafiki'); return; }
    if (step === 'rafiki') { next('socialProof'); return; }
    if (step === 'socialProof') { next('commitment'); return; }
    if (step === 'commitment') {
      if (!child.commitmentAccepted) {
        setLocalError('Choose Yes to make the commitment.');
        return;
      }
      if (!child.commitmentSignature) {
        setLocalError('Sign before continuing.');
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
      if (!signupEmail.trim() || !signupEmail.includes('@')) { setLocalError('Enter a valid email address.'); return; }
      if (signupPassword.length < 8) { setLocalError('Use at least 8 characters for your password.'); return; }
      if (signupPassword !== signupPasswordConfirm) { setLocalError('Passwords do not match.'); return; }
      submit();
    }
  }

  function submit(methodOverride: 'email' | 'google' = signupMethod) {
    const selectedSubjectIds = Array.from(new Set(children.flatMap(item => item.subjects)));
    onSubmit({
      role: 'parent', languageCode, displayName: parentName.trim(), gender: parentGender, grade: children[0].grade,
      schoolId: null, countryCode, children, parentChildren: children, selectedSubjectIds,
      mascotKey: children[0].mascotKey!, voiceName: children[0].voiceName!, referralSource: referralSource.trim() || undefined, reminderEnabled,
      signupMethod: methodOverride, signupEmail: signupEmail.trim(), signupPassword,
    });
  }

  async function addSchool() {
    const name = manualSchoolName.trim();
    if (name.length < 2 || !child.county) { setSchoolError('Enter a school name and select a county first.'); return; }
    setIsAddingSchool(true); setSchoolError(null);
    try {
      const created = onCreateSchool ? await onCreateSchool({ schoolName: name, county: child.county }) : null;
      updateChild({ schoolId: created?.id ?? null, school: created?.name ?? name });
      setSchoolQuery(created?.name ?? name); setAddSchoolOpen(false); setSchoolPickerOpen(false);
    } catch {
      // Manual entry is an intentional no-admin-contact fallback when the school request is unavailable.
      updateChild({ schoolId: null, school: name });
      setSchoolQuery(name); setAddSchoolOpen(false); setSchoolPickerOpen(false);
    } finally { setIsAddingSchool(false); }
  }

  const selectedMascot = MASCOTS.find(option => option.key === child.mascotKey) ?? MASCOTS[0];
  const tutorIntroTitle = childIndex > 0 ? `Now it’s ${child.name || `Learner ${childIndex + 1}`}’s turn to select their Tutor` : "Parent, please let the learner choose their tutor. Don't choose for them";
  const commitmentName = child.name.trim() || `Learner ${childIndex + 1}`;
  const title = step === 'language' ? 'Choose your language' : step === 'role' ? 'Who are you?' : step === 'parentAvatar' ? 'Choose your avatar' : step === 'parentName' ? 'What is your name?' : step === 'country' ? 'Is This Your Country?' : step === 'childName' ? "What is Your Child's name?" : step === 'childAge' ? `How old is ${child.name || 'your child'}?` : step === 'childGender' ? `What is ${child.name || 'your child'}'s gender?` : step === 'childSchool' ? `Where does ${child.name || 'your child'} go to school?` : step === 'childGrade' ? `What grade is ${child.name || 'your child'} in?` : step === 'childPerformance' ? `How is ${child.name || 'your child'} performing?` : step === 'childSubjects' ? 'Which subjects need help?' : step === 'addAnother' ? 'Add another child?' : step === 'microphone' ? 'Allow microphone access' : step === 'reminder' ? 'Allow progress notifications' : step === 'referral' ? 'How did you hear about Kitabu?' : step === 'tutorIntro' ? tutorIntroTitle : step === 'socialProof' ? 'Practise makes Perfect' : step === 'mascot' ? 'Choose Rafiki' : step === 'rafiki' ? 'Meet Rafiki' : step === 'voice' ? 'Choose Rafiki\'s voice' : step === 'commitment' ? `${child.name || 'Your child'}'s daily commitment` : step === 'childReady' ? `${child.name || 'Your learner'} is ready to learn!` : step === 'loading' ? 'Creating Your Study Plan' : step === 'ready' ? 'Your Study Plan is Ready!' : 'Save your family account';
  const parentCueId = getParentEnglishOnboardingCueId(step, childIndex, child.mascotKey, child.commitmentAccepted);
  const parentNarrationCue = buildPrimaryInstruction(
    'parent-onboarding',
    `${step}-${childIndex}-${parentCueId ?? 'none'}`,
    title,
    'Bella',
    parentCueId ? { language: 'en', publicCueId: parentCueId } : undefined,
  );
  // Parent signup uses the fixed Bella catalog voice; student onboarding remains out of scope.
  useGuidedNarration(parentNarrationCue, Boolean(parentCueId));

  if (step === 'loading') {
    const studyPlanMessages = ['Checking curriculum', 'Adding quizzes', 'Adding games', 'Finding your classmates', 'Adding more fun', 'Finding your teachers', 'Making quizzes harder', 'Adding mwakenya', 'Just kidding', 'Throwing in some magic'];
    return <OnboardingVisualShell style={styles.screen}><View style={styles.center}><ActivityIndicator size="large" color="#0F766E" /><Text style={styles.title}>{title}</Text><Text style={styles.studyPlanMessage}>{studyPlanMessages[Math.min(Math.floor(studyPlanProgress / 10), studyPlanMessages.length - 1)]}…</Text><View style={styles.studyPlanTrack}><View style={[styles.studyPlanFill, { width: `${studyPlanProgress}%` }]} /></View><Text style={styles.studyPlanPercent}>{studyPlanProgress}%</Text></View></OnboardingVisualShell>;
  }

  return (
    <OnboardingVisualShell style={styles.screen}>
      <View style={styles.progress}><View style={[styles.progressFill, { width: `${progressValue}%` }]} /></View>
      {step !== 'language' ? <Pressable accessibilityLabel="Back in parent setup" onPress={goBack} style={styles.back}><Text style={styles.backText}>‹ Back</Text></Pressable> : null}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>KITABU · ACCOUNT SETUP</Text>
        <Text style={styles.title}>{title}</Text>

        {step === 'language' ? <View style={styles.grid}><Pressable accessibilityLabel="Kiswahili unavailable" accessibilityState={{ disabled: true }} disabled style={[styles.choice, styles.disabled]}><Text style={styles.choiceText}>Kiswahili</Text></Pressable><Pressable accessibilityLabel="Choose English" onPress={() => { setLanguageCode('en'); next('role'); }} style={[styles.choice, languageCode === 'en' && styles.selected]}><Text style={styles.choiceText}>English</Text></Pressable></View> : null}
        {step === 'role' ? <View style={styles.grid}><Pressable onPress={() => { onRoleChange('parent'); next('parentAvatar'); }} style={styles.choice}><Text style={styles.choiceText}>👨‍👩‍👧 Parent</Text></Pressable><Pressable onPress={() => onRoleChange('teacher')} style={styles.choice}><Text style={styles.choiceText}>👩‍🏫 Teacher</Text></Pressable></View> : null}
        {step === 'parentAvatar' ? <View style={styles.grid}>{PARENT_AVATARS.map(option => <Pressable key={option.key} accessibilityLabel={`Choose parent avatar ${option.key}`} accessibilityRole="radio" accessibilityState={{ selected: parentAvatarKey === option.key }} onPress={() => selectParentAvatar(option)} style={({ pressed }) => [styles.avatarChoice, parentAvatarKey === option.key && styles.selected, pressed && styles.pressed]}><Image accessibilityLabel={`${option.label} avatar artwork`} resizeMode="contain" source={option.source} style={styles.parentAvatarImage} /><Text style={styles.choiceText}>{parentAvatarKey === option.key ? '✓ ' : ''}{option.label}</Text></Pressable>)}</View> : null}
        {step === 'parentName' ? <TextInput autoFocus value={parentName} onChangeText={value => { if (/\d/.test(value)) { triggerHaptic('error'); } setParentName(value.replace(/\d/g, '')); setLocalError(null); }} placeholder="Your name" style={styles.input} /> : null}
        {step === 'country' ? <Pressable accessibilityLabel="Select family country" onPress={() => setCountryPickerOpen(true)} style={[styles.panel, styles.countryPanel]}><Text style={styles.countryFlag}>{COUNTRY_OPTIONS.find(option => option.code === countryCode)?.flag}</Text><Text style={styles.choiceText}>{COUNTRY_OPTIONS.find(option => option.code === countryCode)?.name}</Text><Text style={styles.centeredCopy}>{COUNTRY_OPTIONS.find(option => option.code === countryCode)?.curriculum} curriculum</Text><Text style={styles.changeCountry}>Choose another country</Text></Pressable> : null}
        {step === 'childName' ? <TextInput autoFocus value={child.name} onChangeText={value => { if (/\d/.test(value)) { triggerHaptic('error'); } updateChild({ name: value.replace(/\d/g, '') }); }} placeholder="Child's name" style={styles.input} /> : null}
        {step === 'childAge' ? <TextInput autoFocus keyboardType="number-pad" value={child.age} onChangeText={value => updateChild({ age: value.replace(/\D/g, '').slice(0, 2) })} placeholder="Age" style={styles.input} /> : null}
        {step === 'childGender' ? <View style={styles.grid}>{(['female', 'male'] as GenderOption[]).map(value => <Pressable key={value} onPress={() => { updateChild({ gender: value }); next('childSchool'); }} style={[styles.choice, child.gender === value && styles.selected]}><Text style={styles.choiceText}>{value === 'female' ? 'Girl' : 'Boy'}</Text></Pressable>)}</View> : null}
        {step === 'childSchool' ? <>
          <Pressable onPress={() => setCountyPickerOpen(true)} style={styles.input}><Text>{child.county || `Select ${regionMeta.label.toLowerCase()}`}</Text></Pressable>
          <Pressable disabled={!child.county} onPress={() => setSchoolPickerOpen(true)} style={[styles.input, !child.county && styles.disabled]}><Text>{child.school || 'Select school'}</Text></Pressable>
        </> : null}
        {step === 'childGrade' ? <View style={styles.grid}>{SUPPORTED_GRADES.map(value => <Pressable key={value} onPress={() => updateChild({ grade: value, subjects: child.grade === value ? child.subjects : [] })} style={[styles.choice, child.grade === value && styles.selected]}><Text style={styles.choiceText}>{value}</Text></Pressable>)}</View> : null}
        {step === 'childPerformance' ? <View style={styles.grid}>{PERFORMANCE_OPTIONS.map(option => <Pressable key={option.value} onPress={() => { updateChild({ performance: option.value }); next('childSubjects'); }} style={[styles.choice, child.performance === option.value && styles.selected]}><Text style={styles.choiceText}>{option.label}</Text></Pressable>)}</View> : null}
        {step === 'childSubjects' ? <View style={styles.grid}>
          <Pressable onPress={() => updateChild({ subjects: allAreasSelected ? [] : subjectIdsForGrade })} style={[styles.choice, allAreasSelected && styles.selected]}>
            <Text style={styles.choiceText}>{allAreasSelected ? '✓ ' : ''}All Areas</Text>
          </Pressable>
          {subjectOptions.map(subject => {
            const selected = child.subjects.includes(subject.id);
            return <Pressable key={subject.id} onPress={() => { setOrdering(current => recordParentOnboardingSelection(current, 'subject', subject.id)); updateChild({ subjects: selected ? child.subjects.filter(id => id !== subject.id) : [...child.subjects, subject.id] }); }} style={[styles.choice, selected && styles.selected]}><Text style={styles.choiceText}>{selected ? '✓ ' : ''}{subject.name}</Text></Pressable>;
          })}
        </View> : null}
        {step === 'addAnother' ? <View style={styles.grid}><Pressable onPress={() => { setChildren(current => [...current, blankChild()]); setChildIndex(children.length); next('childName'); }} style={styles.choice}><Text style={styles.choiceText}>Yes, add another child</Text></Pressable><Pressable onPress={() => { setChildIndex(0); next('microphone'); }} style={styles.choice}><Text style={styles.choiceText}>No, continue</Text></Pressable></View> : null}
        {step === 'microphone' ? <><Text style={styles.panel}>We need microphone access for spoken tutoring</Text><View style={styles.permissionChoices}><Pressable onPress={() => next('reminder')} style={styles.choice}><Text style={styles.choiceText}>Not now</Text></Pressable><Pressable onPress={() => { if (Platform.OS === 'web') { next('reminder'); return; } requestRecordingPermissionsAsync().catch(() => undefined).finally(() => next('reminder')); }} style={[styles.choice, styles.permissionAllow]}><Text style={styles.choiceText}>Allow</Text></Pressable></View></> : null}
        {step === 'reminder' ? <><Text style={styles.panel}>Click Allow so as not to miss assignments and progress reports</Text><View style={styles.permissionChoices}><Pressable onPress={() => { setReminderEnabled(false); next('referral'); }} style={styles.choice}><Text style={styles.choiceText}>Not now</Text></Pressable><Pressable onPress={() => requestPushPermission().then(permission => setReminderEnabled(permission.granted)).catch(() => setReminderEnabled(false)).finally(() => next('referral'))} style={[styles.choice, styles.permissionAllow]}><Text style={styles.choiceText}>Allow</Text></Pressable></View></> : null}
        {step === 'referral' ? <View style={styles.grid}>{referralOptions.map(option => <Pressable key={option.value} onPress={() => { setReferralSource(option.value); recordParentOnboardingSelection(ordering, 'referral', option.value); }} style={[styles.choice, referralSource === option.value && styles.selected]}><Text style={styles.choiceText}>{option.label}</Text></Pressable>)}</View> : null}
        {step === 'tutorIntro' ? <View style={styles.tutorIntro}><Text style={styles.tutorIntroCopy}>{childIndex > 0 ? tutorIntroTitle : `${child.name || `Learner ${childIndex + 1}`} will choose their own tutor, voice, and commitment.`}</Text></View> : null}
        {step === 'mascot' ? <View style={styles.grid}>{MASCOTS.map(option => <Pressable key={option.key} onPress={() => selectMascot(option.key)} style={[styles.choice, child.mascotKey === option.key && styles.selected]}><Image accessibilityLabel={`${option.label} artwork`} resizeMode="contain" source={option.source} style={styles.mascotImage} /><Text style={styles.choiceText}>{option.label}</Text></Pressable>)}</View> : null}
        {step === 'rafiki' ? <LinearGradient colors={['#FFF0DD', '#E6F4EE']} style={styles.tutorPanel}><Image accessibilityLabel="Selected Rafiki artwork" resizeMode="contain" source={selectedMascot.source} style={styles.revealMascotImage} /><Text style={styles.choiceText}>Hi learner. My name is Rafiki the {selectedMascot.label.replace('Rafiki the ', '')} and I will be your Tutor. Are you ready to learn?</Text></LinearGradient> : null}
        {step === 'voice' ? <><View style={styles.selectedVoiceMascot}><Image accessibilityLabel="Selected mascot on voice screen" resizeMode="contain" source={selectedMascot.source} style={styles.voiceMascotImage} /><Text style={styles.centeredCopy}>{selectedMascot.label}</Text></View><View style={styles.grid}>{VOICES.map(option => {
          const selected = child.voiceName === option.name;
          const isPlaying = voicePreviewingName === option.name;
          const previewComplete = voicePreviewedName === option.name;
          return <Pressable key={option.name} onPress={() => selectVoice(option.name)} style={[styles.choice, selected && styles.selected]}>
            <Text style={styles.choiceText}>{option.label}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Preview ${option.name} voice`} onPress={(event?: { stopPropagation?: () => void }) => { event?.stopPropagation?.(); previewVoice(option).catch(() => undefined); }} style={styles.previewButton}>
              <Text style={styles.preview}>{isPlaying ? 'Playing…' : previewComplete ? 'Preview complete' : 'Preview voice'}</Text>
            </Pressable>
          </Pressable>;
        })}</View></> : null}
        {step === 'socialProof' ? <View style={styles.panel}><Text style={styles.centeredCopy}>89% of learners who practice for at least 20 minutes every day improve their grades in less than 1 month</Text></View> : null}
        {step === 'commitment' ? <View style={styles.panel}><Text style={styles.commitmentPrompt}>{commitmentName}, are you ready to make that commitment?</Text><View style={styles.permissionChoices}><Pressable onPress={() => { updateChild({ commitmentAccepted: false, commitmentSignature: undefined }); setSignaturePoints([]); }} style={styles.choice}><Text style={styles.choiceText}>No</Text></Pressable><Pressable onPress={() => updateChild({ commitmentAccepted: true })} style={[styles.choice, child.commitmentAccepted && styles.selected]}><Text style={styles.choiceText}>Yes</Text></Pressable></View>{child.commitmentAccepted ? <><Text style={styles.signatureLabel}>Sign here</Text><View style={styles.signatureRow}><View accessibilityLabel="Signature canvas" onStartShouldSetResponder={() => true} onResponderGrant={event => startSignature(event.nativeEvent.locationX, event.nativeEvent.locationY)} onResponderMove={event => extendSignature(event.nativeEvent.locationX, event.nativeEvent.locationY)} onResponderRelease={event => finishSignature(event.nativeEvent.locationX, event.nativeEvent.locationY)} onResponderTerminate={event => finishSignature(event.nativeEvent.locationX, event.nativeEvent.locationY)} style={[styles.signatureCanvas, child.commitmentSignature && styles.selected]}>{(signaturePointsByChild[childIndex] ?? []).slice(1).map((point, index) => { const previous = signaturePointsByChild[childIndex][index]; const length = Math.hypot(point.x - previous.x, point.y - previous.y); const angle = Math.atan2(point.y - previous.y, point.x - previous.x) * 180 / Math.PI; return <View key={`${index}-${point.x}-${point.y}`} pointerEvents="none" style={[styles.signatureStroke, { left: (previous.x + point.x) / 2 - length / 2, top: (previous.y + point.y) / 2 - 1, width: length, transform: [{ rotate: `${angle}deg` }] }]} />; })}{child.commitmentSignature ? null : <Text pointerEvents="none" style={styles.signatureHint}>Draw your signature</Text>}</View><Image accessibilityLabel="Commitment mascot artwork" resizeMode="contain" source={selectedMascot.source} style={styles.signatureMascot} /></View>{child.commitmentSignature ? <Text style={styles.signaturePreview}>✓ Signed by {child.name || `Learner ${childIndex + 1}`}</Text> : null}</> : null}</View> : null}
        {step === 'childReady' ? <LinearGradient colors={['#123F59', '#1A6A73']} style={styles.readyHero}><Image accessibilityLabel="Ready mascot artwork" resizeMode="contain" source={selectedMascot.source} style={styles.readyMascotImage} /><View style={styles.readyCopy}><Text style={styles.readyTitle}>{child.name || `Learner ${childIndex + 1}`} is ready to learn!</Text><Text style={styles.readyText}>Great choice—Rafiki is ready to begin.</Text></View></LinearGradient> : null}
        {step === 'ready' ? <LinearGradient colors={['#123F59', '#1A6A73']} style={styles.readyHero}><View pointerEvents="none" style={styles.confettiLayer}>{['●', '✦', '▲', '◆'].map((piece, index) => <Animated.Text key={piece} style={[styles.confettiPiece, { left: `${14 + index * 24}%`, transform: [{ translateY: confettiFall.interpolate({ inputRange: [0, 1], outputRange: [-90 - index * 24, 220] }) }, { rotate: `${index % 2 ? 180 : 360}deg` }] }]}>{piece}</Animated.Text>)}</View><Image accessibilityLabel="Ready mascot artwork" resizeMode="contain" source={selectedMascot.source} style={styles.readyMascotImage} /><View style={styles.readyCopy}><Text style={styles.readyTitle}>Your Study Plan is Ready!</Text><Text style={styles.readyText}>{children.length} learner{children.length === 1 ? '' : 's'} · {countryCode} · daily practice</Text>{children.map((item, index) => <Text key={`${item.name}-${index}`} style={styles.readyRow}>✓ {item.name || `Child ${index + 1}`} study plan prepared</Text>)}</View></LinearGradient> : null}
        {step === 'signup' ? <View style={styles.accountPanel}><Text style={styles.accountText}>Keep your children’s plans, progress reports, and tutor settings together.</Text><Pressable accessibilityLabel="Continue with Google" accessibilityRole="button" disabled={isSubmitting} onPress={() => { setSignupMethod('google'); submit('google'); }} style={[styles.googleButton, isSubmitting && styles.googleDisabled]}><GoogleLogo size={20} /><Text style={styles.googleText}>Continue with Google</Text></Pressable><Text style={styles.orText}>or use email</Text><TextInput autoCapitalize="none" keyboardType="email-address" value={signupEmail} onChangeText={setSignupEmail} placeholder="Email" style={styles.input} /><View style={styles.passwordRow}><TextInput autoCapitalize="none" secureTextEntry={!showSignupPassword} value={signupPassword} onChangeText={setSignupPassword} placeholder="Password" style={styles.passwordInput} /><Pressable accessibilityLabel={showSignupPassword ? 'Hide password' : 'Show password'} onPress={() => setShowSignupPassword(value => !value)} style={styles.visibilityButton}><Text style={styles.visibilityText}>{showSignupPassword ? 'Hide' : 'Show'}</Text></Pressable></View><View style={styles.passwordRow}><TextInput autoCapitalize="none" secureTextEntry={!showSignupPasswordConfirm} value={signupPasswordConfirm} onChangeText={setSignupPasswordConfirm} placeholder="Confirm password" style={styles.passwordInput} /><Pressable accessibilityLabel={showSignupPasswordConfirm ? 'Hide confirm password' : 'Show confirm password'} onPress={() => setShowSignupPasswordConfirm(value => !value)} style={styles.visibilityButton}><Text style={styles.visibilityText}>{showSignupPasswordConfirm ? 'Hide' : 'Show'}</Text></Pressable></View></View> : null}
        {localError || error ? <Text style={styles.error}>{localError || error}</Text> : null}
      </ScrollView>
      {step !== 'language' && step !== 'childGender' && step !== 'childPerformance' && step !== 'microphone' && step !== 'reminder' ? <Pressable disabled={isSubmitting || (step === 'commitment' && (!child.commitmentAccepted || !child.commitmentSignature))} onPress={validateAndContinue} style={styles.button}><Text style={styles.buttonText}>{isSubmitting ? 'Saving…' : step === 'country' ? 'Confirm country' : step === 'signup' ? 'Create Account' : 'Continue'}</Text></Pressable> : null}

      <Modal transparent visible={countryPickerOpen} onRequestClose={() => setCountryPickerOpen(false)}><Pressable style={styles.modalBackdrop} onPress={() => setCountryPickerOpen(false)}><View style={styles.sheet}><Text style={styles.sheetTitle}>Choose your country</Text><ScrollView>{[...COUNTRY_OPTIONS].sort((left, right) => Number(right.code === detectedCountryCode) - Number(left.code === detectedCountryCode)).map(option => <Pressable key={option.code} onPress={() => { setCountryCode(option.code); setCountryPickerOpen(false); }} style={styles.sheetRow}><Text style={styles.choiceText}>{option.flag} {option.name}{option.code === detectedCountryCode ? ' · Detected' : ''}</Text><Text>{option.curriculum} curriculum</Text></Pressable>)}</ScrollView></View></Pressable></Modal>
      <Modal transparent visible={countyPickerOpen} onRequestClose={() => setCountyPickerOpen(false)}><Pressable style={styles.modalBackdrop} onPress={() => setCountyPickerOpen(false)}><View style={styles.sheet}><ScrollView>{regionMeta.options.map(option => <Pressable key={option} onPress={() => { updateChild({ county: option, schoolId: null, school: '' }); setCountyPickerOpen(false); }} style={styles.sheetRow}><Text>{option}</Text></Pressable>)}</ScrollView></View></Pressable></Modal>
      <Modal transparent visible={schoolPickerOpen} onRequestClose={() => setSchoolPickerOpen(false)}><Pressable style={styles.modalBackdrop} onPress={() => setSchoolPickerOpen(false)}><View style={styles.sheet}><TextInput accessibilityLabel="Search school by name" autoFocus value={schoolQuery} onChangeText={setSchoolQuery} placeholder="Search schools" style={styles.input} /><ScrollView>{filteredSchools.map(school => <Pressable key={school.id} onPress={() => { updateChild({ schoolId: school.id, school: school.name }); setSchoolQuery(school.name); setSchoolPickerOpen(false); }} style={styles.sheetRow}><Text>{school.name}</Text></Pressable>)}{filteredSchools.length === 0 ? <Text style={styles.empty}>No match yet. Add your school below.</Text> : null}<Pressable accessibilityLabel="Add your school" onPress={() => { setManualSchoolName(schoolQuery); setSchoolPickerOpen(false); setAddSchoolOpen(true); }} style={styles.addSchool}><Text style={styles.addSchoolText}>Add Your School</Text></Pressable></ScrollView></View></Pressable></Modal>
      <Modal transparent visible={addSchoolOpen} onRequestClose={() => setAddSchoolOpen(false)}><View style={styles.modalBackdrop}><View style={styles.sheet}><Text style={styles.sheetTitle}>Add Your School</Text><Text style={styles.county}>Selected county: {child.county}</Text><TextInput accessibilityLabel="School name" autoFocus value={manualSchoolName} onChangeText={setManualSchoolName} placeholder="Enter school name" style={styles.input} />{schoolError ? <Text style={styles.error}>{schoolError}</Text> : null}<Pressable disabled={isAddingSchool} onPress={addSchool} style={styles.modalButton}><Text style={styles.buttonText}>{isAddingSchool ? 'Saving…' : 'Save and Continue'}</Text></Pressable></View></View></Modal>
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
  previewButton: { alignSelf: 'stretch', paddingVertical: 4 },
  preview: { color: '#B45309', fontSize: 12, fontWeight: '800', marginTop: 4, textAlign: 'center' },
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
