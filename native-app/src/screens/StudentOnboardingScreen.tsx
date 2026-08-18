import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import type {
  ImageSourcePropType,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  ViewStyle,
} from 'react-native';
import { Asset } from 'expo-asset';
import { LinearGradient } from 'expo-linear-gradient';
import {
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioSource,
  type AudioStatus,
} from 'expo-audio';
import Svg, { Path } from 'react-native-svg';
import {
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Plus,
  X,
} from 'lucide-react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import {
  DEFAULT_GRADE,
  LOWER_PRIMARY_GRADES,
  LOWER_PRIMARY_SUBJECTS,
  SUPPORTED_GRADES,
} from '../constants/grades';
import { SUBJECTS } from '../data/mockData';
import { requestPhoneAuthCode } from '../services/authService';
import { triggerHaptic } from '../services/haptics';
import {
  ONBOARDING_ANALYTICS_VERSION,
  postOnboardingSelectionEvent,
  type OnboardingEventType,
} from '../services/onboardingAnalyticsService';
import { requestPushPermission } from '../services/pushNotifications';
import { AvatarArt, selectAvatarKey } from '../components/AvatarArt';
import { AssessmentNarrationControls } from '../components/AssessmentNarrationControls';
import { GoogleLogo } from '../components/GoogleLogo';
import { stableShuffledOptions } from '../utils/onboardingOptionOrder';
import {
  buildPrimaryInstruction,
  getStudentEnglishOnboardingLandingCueId,
  useGuidedNarration,
} from '../services/narrationService';
import {
  getOnboardingStepMetadata,
  type OnboardingIntroStep,
} from '../onboarding/onboardingFlowRegistry';
import {
  COUNTRY_OPTIONS,
  REGIONS_BY_COUNTRY as SHARED_REGIONS_BY_COUNTRY,
  detectDefaultCountryCode,
} from '../constants/locations';
import {
  GenderOption,
  OnboardingAchievementKey,
  OnboardingConcernKey,
  OnboardingGoalKey,
  OnboardingInterestKey,
  OnboardingLanguageCode,
  OnboardingMascotKey,
  OnboardingNeedKey,
  OnboardingVoiceName,
  PublicSignupRole,
  SchoolData,
} from '../types/app';

const MPESA_PHONE_ERROR = 'Enter a valid Safaricom M-Pesa number, for example 0716175485.';
const MAX_ONBOARDING_SUBJECTS = 5;
const LEARNER_MIN_AGE = 4;
const LEARNER_MAX_AGE = 20;
const AUTO_ADVANCE_DELAY_MS = 200;
const MASCOT_AUTO_ADVANCE_DELAY_MS = 240;
const LOADING_PROGRESS_INTERVAL_MS = 50;
const LOADING_PROGRESS_INCREMENT = 2;
const LOADING_DONE_DELAY_MS = 700;
const ZERO_SAFE_AREA_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

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
  ...SHARED_REGIONS_BY_COUNTRY.UG.options,
] as const;

// Tanzania is administered as regions (mikoa).
const TANZANIA_REGIONS = [
  ...SHARED_REGIONS_BY_COUNTRY.TZ.options,
] as const;

// Rwanda has four provinces plus Kigali City.
const RWANDA_PROVINCES = [
  'Kigali City', 'Northern Province', 'Southern Province', 'Eastern Province', 'Western Province',
] as const;

// Ethiopia has regional states plus two federally chartered cities.
const ETHIOPIA_STATES = [
  ...SHARED_REGIONS_BY_COUNTRY.ET.options,
] as const;

// Per-country administrative region lists plus the local label used in the picker.
const REGIONS_BY_COUNTRY: Record<
  string,
  { label: string; labelSw: string; options: readonly string[] }
> = {
  KE: { label: 'County', labelSw: 'Kaunti', options: KENYAN_COUNTIES },
  UG: { label: 'District', labelSw: 'Wilaya', options: UGANDA_DISTRICTS },
  TZ: { label: 'Region', labelSw: 'Mkoa', options: TANZANIA_REGIONS },
  RW: { label: 'Province', labelSw: 'Intara', options: RWANDA_PROVINCES },
  ET: { label: 'State', labelSw: 'Jimbo', options: ETHIOPIA_STATES },
};

const ONBOARDING_COLORS = {
  bg: '#FFFFFF',
  bgSoft: '#FBF8F3',
  border: '#E8E0D4',
  primary: '#E07B00',
  primaryDark: '#B5620A',
  primaryLight: '#FEF0D9',
  accent: '#2D8653',
  accentLight: '#D6F0E3',
  // Professional slate-blue used for the teacher flow so the brand orange stays
  // reserved for the primary call-to-action instead of saturating whole screens.
  pro: '#235A8C',
  proDark: '#173B5C',
  proLight: '#E7EEF5',
  textPrimary: '#123F59',
  textSecondary: '#385D68',
  textMuted: '#789197',
  danger: '#C0392B',
  dangerLight: '#FDECEA',
  white: '#FFFFFF',
} as const;
const sunguraRabbitMascot = require('../assets/mascot/sungura-rabbit.png');
const simbaLionMascot = require('../assets/mascot/simba-lion.png');
const ndovuElephantMascot = require('../assets/mascot/ndovu-elephant.png');
const pandaMascot = require('../assets/mascot/panda.png');
const studentGirlUpperPhoto = require('../assets/good-news/student-girl-upper.png');
const studentBoyUpperPhoto = require('../assets/good-news/student-boy-upper.png');
const studentGirlJuniorPhoto = require('../assets/good-news/student-girl-junior.png');
const studentBoyJuniorPhoto = require('../assets/good-news/student-boy-junior.png');
const teacherStudioStudyPhoto = require('../assets/good-news/teacher-studio.png');
const parentProgressPhoto = require('../assets/good-news/parent-progress.png');

type OnboardingMascot = {
  key: OnboardingMascotKey;
  source: ImageSourcePropType;
  label: string;
  name: string;
  description: string;
};

type GoodNewsBenefit = {
  key: string;
  icon: string;
  title: string;
  body: string;
  accent: string;
};

type GoodNewsPlan = {
  badge: string;
  badgeIcon: string;
  headlineAccent: string;
  headlineRest: string;
  body: string;
  photo: ImageSourcePropType;
  photoLabel: string;
  beforeLabel: string;
  beforeValue: string;
  afterLabel: string;
  afterValue: string;
  midpoint: string;
  progressCaption: string;
  supportLine: string;
  subjectLabels: string[];
  benefits: GoodNewsBenefit[];
};

type IntroStep = OnboardingIntroStep;

type SignupStep = 'method' | 'email' | 'phone' | 'verify';
type SignupMethod = 'email' | 'phone' | 'google';
type MascotPose = 'wave' | 'cool' | 'think' | 'happy' | 'cheer' | 'worried' | 'sleep' | 'celebrate';

type LanguageOption = {
  code: OnboardingLanguageCode;
  label: string;
  description: string;
};

type NeedOption = {
  key: OnboardingNeedKey;
  icon?: string;
  label: string;
  description: string;
};

type NeedStepCopy = {
  eyebrow: string;
  heading: string;
};

type NameStepCopy = {
  eyebrow: string;
  placeholder: string;
  subText: string;
};

type AgeStepCopy = {
  eyebrow: string;
  heading: (name: string) => string;
  placeholder: string;
  subText: string;
};

type SchoolStepCopy = {
  eyebrow: string;
  heading: string;
};

type GenderChoiceOption = {
  label: string;
  accessibilityLabel?: string;
  value: Extract<GenderOption, 'male' | 'female'> | 'alien';
  description: string;
  avatar: string;
  bgColor: string;
  accent: string;
  alien?: boolean;
};

type OnboardingSubjectOption = {
  id: string;
  name: string;
};

type ParentChildOnboardingInput = {
  name: string;
  age: string;
  grade: string;
  subjects?: string[];
};

type VoiceOption = {
  name: OnboardingVoiceName;
  description: string;
  en: AudioSource;
  sw: AudioSource;
};

type RoleChoiceOption = {
  key: string;
  icon?: string;
  label: string;
  swLabel?: string;
  description: string;
  recommended?: boolean;
};

type OnboardingRoleOption = {
  role: PublicSignupRole;
  icon: string;
  label: string;
  swLabel: string;
  description: string;
  swDescription: string;
};

type OnboardingContent = {
  eyebrow: string;
  title: string;
  body: string;
  statusLabel: string;
  backToStartLabel: string;
  stepOneKicker: string;
  stepOneTitle: string;
  stepOneText: string;
  stepOneBenefits: readonly string[];
  gradeLabel: string;
  gradeStatusPrefix: string;
  schoolStatusPrefix: string;
  paymentStatusPrefix: string;
  reviewTitle: string;
  reviewGradeLabel: string;
  schoolText: string;
  phoneText: string;
  accent: string;
  mascot: OnboardingMascot;
  coachTips: readonly [string, string, string];
  gradient: readonly [string, string, string];
};

const ONBOARDING_CONTENT: Record<PublicSignupRole, OnboardingContent> = {
  student: {
    eyebrow: 'Student setup',
    title: 'Make Kitabu feel like your space',
    body: 'A few quick choices help us tune lessons, homework, checkout, and exams to your learning path.',
    statusLabel: 'Learner setup summary',
    backToStartLabel: 'Back to profile',
    stepOneKicker: 'Learner profile',
    stepOneTitle: 'Tell us your class',
    stepOneText: 'Pick your profile and grade so Kitabu can open the right subjects and diagnostics.',
    stepOneBenefits: ['Smart lessons', 'CBC grade', 'Exam ready'],
    gradeLabel: 'Grade',
    gradeStatusPrefix: 'Learning path',
    schoolStatusPrefix: 'School link',
    paymentStatusPrefix: 'Checkout shortcut',
    reviewTitle: 'Learning setup ready',
    reviewGradeLabel: 'Grade',
    schoolText: 'This helps us match your school package, teacher links, and local learning setup.',
    phoneText: 'Add a number now for faster checkout later. You can skip this and add it when you pay.',
    accent: ONBOARDING_COLORS.primary,
    mascot: {
      key: 'rabbit',
      source: sunguraRabbitMascot,
      label: 'Rafiki the Rabbit student mascot',
      name: 'Rafiki the Rabbit',
      description: 'Fast revision and playful practice.',
    },
    coachTips: ['Pick grade', 'Find school', 'M-Pesa optional'],
    gradient: ['#F2FFFB', '#DDF8F2', '#BFEDE7'],
  },
  other: {
    eyebrow: 'Learning setup',
    title: 'Make Kitabu useful for you',
    body: 'A few quick choices help us tune learning, practice, and support to what you need right now.',
    statusLabel: 'Learning setup summary',
    backToStartLabel: 'Back to profile',
    stepOneKicker: 'Learning profile',
    stepOneTitle: 'Tell us your level',
    stepOneText: 'Pick your grade or closest level so Kitabu can open useful CBC practice and support.',
    stepOneBenefits: ['Smart lessons', 'CBC context', 'Useful practice'],
    gradeLabel: 'Grade or level',
    gradeStatusPrefix: 'Learning path',
    schoolStatusPrefix: 'School link',
    paymentStatusPrefix: 'Checkout shortcut',
    reviewTitle: 'Learning setup ready',
    reviewGradeLabel: 'Level',
    schoolText: 'This helps us match local learning context. You can skip this and add a school later.',
    phoneText: 'Add a number now for faster checkout later. You can skip this and add it when you pay.',
    accent: ONBOARDING_COLORS.primary,
    mascot: {
      key: 'rabbit',
      source: sunguraRabbitMascot,
      label: 'Rafiki the Rabbit learning mascot',
      name: 'Rafiki the Rabbit',
      description: 'Quick help for learning and practice.',
    },
    coachTips: ['Pick level', 'Find school', 'M-Pesa optional'],
    gradient: ['#F2FFFB', '#DDF8F2', '#BFEDE7'],
  },
  teacher: {
    eyebrow: 'Teacher setup',
    title: 'Set up your class workspace',
    body: 'Choose the school and grade you teach most so assignments, students, and reports open in the right context.',
    statusLabel: 'Teacher setup summary',
    backToStartLabel: 'Back to class',
    stepOneKicker: 'Class focus',
    stepOneTitle: 'Choose your main class',
    stepOneText: 'You can still work across classes later. This starts your dashboard with the most useful roster.',
    stepOneBenefits: ['Rosters', 'Assignments', 'Reports'],
    gradeLabel: 'Primary class',
    gradeStatusPrefix: 'Class focus',
    schoolStatusPrefix: 'Roster link',
    paymentStatusPrefix: 'Billing shortcut',
    reviewTitle: 'Class setup ready',
    reviewGradeLabel: 'Main class',
    schoolText: 'We use your school to connect rosters, assignments, and school-managed billing.',
    phoneText: 'Add a school or personal M-Pesa number if you want faster plan checkout later.',
    accent: ONBOARDING_COLORS.pro,
    mascot: {
      key: 'lion',
      source: simbaLionMascot,
      label: 'Rafiki the Lion teacher mascot',
      name: 'Rafiki the Lion',
      description: 'Confident class planning and reporting.',
    },
    coachTips: ['Choose class', 'Link school', 'Billing ready'],
    gradient: ['#F2FCFF', '#E0F7F3', '#C7EDE9'],
  },
  parent: {
    eyebrow: 'Parent setup',
    title: 'Prepare your family dashboard',
    body: 'Choose your child\'s grade and school so homework, progress, and review alerts are easier to follow.',
    statusLabel: 'Family setup summary',
    backToStartLabel: 'Back to child',
    stepOneKicker: 'Child profile',
    stepOneTitle: 'Start with one learner',
    stepOneText: 'Pick the grade you want to monitor first. You can link more children from the dashboard.',
    stepOneBenefits: ['Homework alerts', 'Progress view', 'More children later'],
    gradeLabel: 'Child grade',
    gradeStatusPrefix: 'Learner focus',
    schoolStatusPrefix: 'School context',
    paymentStatusPrefix: 'Payment shortcut',
    reviewTitle: 'Family setup ready',
    reviewGradeLabel: 'Child grade',
    schoolText: 'This helps Kitabu match school pricing and the right homework context for your child.',
    phoneText: 'Add your M-Pesa number now to make subscription checkout faster when you are ready.',
    accent: ONBOARDING_COLORS.accent,
    mascot: {
      key: 'elephant',
      source: ndovuElephantMascot,
      label: 'Rafiki the Elephant parent mascot',
      name: 'Rafiki the Elephant',
      description: 'Steady family support and progress tracking.',
    },
    coachTips: ['Pick grade', 'Find school', 'Pay later'],
    gradient: ['#F2FFFB', '#D8F7EE', '#BFE9DF'],
  },
};

const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  {
    code: 'sw',
    label: 'Kiswahili',
    description: 'Lugha ya taifa',
  },
  {
    code: 'en',
    label: 'English',
    description: 'International',
  },
];

const MASCOT_OPTIONS: readonly OnboardingMascot[] = [
  {
    key: 'lion',
    source: simbaLionMascot,
    label: 'Rafiki the Lion mascot',
    name: 'Rafiki the Lion',
    description: 'Bold and brave',
  },
  {
    key: 'rabbit',
    source: sunguraRabbitMascot,
    label: 'Rafiki the Rabbit mascot',
    name: 'Rafiki the Rabbit',
    description: 'Quick and playful',
  },
  {
    key: 'elephant',
    source: ndovuElephantMascot,
    label: 'Rafiki the Elephant mascot',
    name: 'Rafiki the Elephant',
    description: 'Wise and strong',
  },
  {
    key: 'panda',
    source: pandaMascot,
    label: 'Rafiki the Panda mascot',
    name: 'Rafiki the Panda',
    description: 'Calm and curious',
  },
];
const MASCOT_PICKER_COLORS: Record<OnboardingMascotKey, { color: string; lightColor: string; animalLabel: string }> = {
  lion: { color: '#D97706', lightColor: '#FEF3C7', animalLabel: 'The Lion' },
  rabbit: { color: '#0E9F6E', lightColor: '#D6F0E3', animalLabel: 'The Rabbit' },
  elephant: { color: '#2563EB', lightColor: '#DBEAFE', animalLabel: 'The Elephant' },
  panda: { color: '#475569', lightColor: '#E2E8F0', animalLabel: 'The Panda' },
};

const VOICE_OPTIONS: readonly VoiceOption[] = [
  {
    name: 'Samora',
    description: 'Warm and encouraging',
    en: require('../assets/Samora-Sekou-Eng.mp3'),
    sw: require('../assets/Samora-Sekou-Kisw.mp3'),
  },
  {
    name: 'Barake',
    description: 'Calm and clear',
    en: require('../assets/Barake-Dexter-Eng.mp3'),
    sw: require('../assets/Barake-Dexter-Kisw.mp3'),
  },
  {
    name: 'Bella',
    description: 'Bright and energetic',
    en: require('../assets/Bella-Anya-Eng.mp3'),
    sw: require('../assets/Bella-Anya-Kisw.mp3'),
  },
  {
    name: 'Judith',
    description: 'Patient and steady',
    en: require('../assets/Judith-cay-Eng.mp3'),
    sw: require('../assets/Judith-Cay-Kisw.mp3'),
  },
];

const ROLE_OPTIONS: readonly OnboardingRoleOption[] = [
  {
    role: 'student',
    icon: '🧑‍🎓',
    label: 'Student',
    swLabel: 'Mwanafunzi',
    description: 'I need help studying',
    swDescription: 'Natafuta msaada',
  },
  {
    role: 'teacher',
    icon: '👩‍🏫',
    label: 'Teacher',
    swLabel: 'Mwalimu',
    description: 'I support students',
    swDescription: 'Nasaidia wanafunzi',
  },
  {
    role: 'parent',
    icon: '👨‍👩‍👧',
    label: 'Parent',
    swLabel: 'Mzazi',
    description: 'For my child',
    swDescription: 'Mtoto wangu',
  },
  {
    role: 'other',
    icon: '🚀',
    label: 'Other',
    swLabel: 'Nyingine',
    description: '',
    swDescription: '',
  },
];
// Signup is parent-led now. Student accounts remain supported for legacy and
// school-managed paths, but a new public signup must start with a parent or teacher.
const PUBLIC_ROLE_OPTIONS = ROLE_OPTIONS.filter(option => option.role === 'parent' || option.role === 'teacher');
const INTERNAL_ROLE_OPTIONS = ROLE_OPTIONS.filter(option => option.role !== 'other');

const NEED_OPTIONS: Record<PublicSignupRole, readonly NeedOption[]> = {
  student: [
    {
      key: 'exam',
      icon: '📝',
      label: 'I have an exam coming up',
      description: 'Quick study plan, no stress.',
    },
    {
      key: 'grades',
      icon: '📈',
      label: 'I want better grades',
      description: 'Smarter studying, better results.',
    },
  ],
  teacher: [
    {
      key: 'resources',
      icon: '📋',
      label: 'Better lesson resources',
      description: 'Engaging, curriculum-aligned content.',
    },
    {
      key: 'results',
      icon: '📊',
      label: 'Improve student results',
      description: 'Track gaps and fill them fast.',
    },
  ],
  parent: [
    {
      key: 'support',
      label: 'Support my child\'s learning',
      description: 'Be involved without the overwhelm.',
    },
    {
      key: 'progress',
      label: 'Track their progress',
      description: 'Know exactly how they are doing.',
    },
  ],
  other: [
    {
      key: 'learn',
      icon: '🧠',
      label: 'I want to learn',
      description: 'Useful explanations and practice.',
    },
    {
      key: 'help',
      icon: '🤝',
      label: 'Help someone else',
      description: 'Support another learner with Kitabu.',
    },
  ],
};

const SWAHILI_NEED_OPTIONS: Record<PublicSignupRole, readonly NeedOption[]> = {
  student: [
    {
      key: 'exam',
      icon: '📝',
      label: 'Nina mtihani karibu',
      description: 'Mpango wa haraka, bila wasiwasi.',
    },
    {
      key: 'grades',
      icon: '📈',
      label: 'Nataka alama bora',
      description: 'Masomo ya akili, matokeo mazuri.',
    },
  ],
  teacher: [
    {
      key: 'resources',
      icon: '📋',
      label: 'Nyenzo bora za mafunzo',
      description: 'Maudhui yanayofuata mtaala.',
    },
    {
      key: 'results',
      icon: '📊',
      label: 'Kuboresha matokeo ya wanafunzi',
      description: 'Fuatilia na jaza maeneo dhaifu.',
    },
  ],
  parent: [
    {
      key: 'support',
      label: 'Saidia masomo ya mtoto wangu',
      description: 'Kushiriki bila msongo wa mawazo.',
    },
    {
      key: 'progress',
      label: 'Fuatilia maendeleo yake',
      description: 'Jua jinsi wanavyoendelea.',
    },
  ],
  other: [
    {
      key: 'learn',
      icon: '🧠',
      label: 'Nataka kujifunza',
      description: 'Maelezo na mazoezi yanayosaidia.',
    },
    {
      key: 'help',
      icon: '🤝',
      label: 'Kumsaidia mtu mwingine',
      description: 'Msaidie mwanafunzi mwingine na Kitabu.',
    },
  ],
};

const NEED_STEP_COPY: Record<PublicSignupRole, NeedStepCopy> = {
  student: {
    eyebrow: 'So I know how to help \uD83D\uDC47',
    heading: 'What do you need most right now?',
  },
  teacher: {
    eyebrow: 'Your teaching priority \uD83D\uDCCB',
    heading: 'What\'s your main priority?',
  },
  parent: {
    eyebrow: 'What matters most to you \uD83D\uDC47',
    heading: 'What do you need most right now?',
  },
  other: {
    eyebrow: 'So I know how to help \uD83D\uDC47',
    heading: 'What do you need most right now?',
  },
};

const SWAHILI_NEED_STEP_COPY: Record<PublicSignupRole, NeedStepCopy> = {
  student: {
    eyebrow: 'Ili nikujue \uD83D\uDC47',
    heading: 'Unahitaji nini zaidi sasa hivi?',
  },
  teacher: {
    eyebrow: 'Kipaumbele chako cha ufundishaji \uD83D\uDCCB',
    heading: 'Kipaumbele chako kikuu ni kipi?',
  },
  parent: {
    eyebrow: 'Kinachokusumbua zaidi \uD83D\uDC47',
    heading: 'Unahitaji nini zaidi sasa hivi?',
  },
  other: {
    eyebrow: 'Ili nikujue \uD83D\uDC47',
    heading: 'Unahitaji nini zaidi sasa hivi?',
  },
};

const NAME_STEP_COPY: Record<PublicSignupRole, NameStepCopy> = {
  student: {
    eyebrow: 'Let\'s get introduced \uD83D\uDC4B',
    placeholder: 'Type your name...',
    subText: 'Your Kitabu AI tutor will know you by name.',
  },
  teacher: {
    eyebrow: 'Let\'s get introduced \uD83D\uDC4B',
    placeholder: 'Your name...',
    subText: 'Your students and Rafiki will know you by name.',
  },
  parent: {
    eyebrow: 'Nice to meet you \uD83D\uDC4B',
    placeholder: 'Your name...',
    subText: 'Rafiki will personalise the experience for your family.',
  },
  other: {
    eyebrow: 'Let\'s get introduced \uD83D\uDC4B',
    placeholder: 'Type your name...',
    subText: 'Your Kitabu AI tutor will know you by name.',
  },
};

const SWAHILI_NAME_STEP_COPY: Record<PublicSignupRole, NameStepCopy> = {
  student: {
    eyebrow: 'Tuonane \uD83D\uDC4B',
    placeholder: 'Andika jina lako...',
    subText: 'Mwalimu wako wa Kitabu AI atakujua kwa jina lako.',
  },
  teacher: {
    eyebrow: 'Tuonane \uD83D\uDC4B',
    placeholder: 'Jina lako...',
    subText: 'Wanafunzi wako na Rafiki watakujua kwa jina lako.',
  },
  parent: {
    eyebrow: 'Karibu \uD83D\uDC4B',
    placeholder: 'Jina lako...',
    subText: 'Rafiki ataandaa uzoefu wa familia yako.',
  },
  other: {
    eyebrow: 'Tuonane \uD83D\uDC4B',
    placeholder: 'Andika jina lako...',
    subText: 'Mwalimu wako wa Kitabu AI atakujua kwa jina lako.',
  },
};

const AGE_STEP_COPY: Record<OnboardingLanguageCode, AgeStepCopy> = {
  en: {
    eyebrow: 'A few more details 👇',
    heading: name => (name ? `How old are you, ${name}?` : 'How old are you?'),
    placeholder: 'Your age...',
    subText: 'We tailor content to your age group.',
  },
  sw: {
    eyebrow: 'Maelezo zaidi 👇',
    heading: name => (name ? `Una miaka mingapi, ${name}?` : 'Una miaka mingapi?'),
    placeholder: 'Umri wako...',
    subText: 'Tunabadilisha maudhui kulingana na umri wako.',
  },
};

const SCHOOL_STEP_COPY: Record<PublicSignupRole, SchoolStepCopy> = {
  student: {
    eyebrow: 'Your school \uD83C\uDFEB',
    heading: 'Which school do you attend?',
  },
  teacher: {
    eyebrow: 'Your school \uD83C\uDFEB',
    heading: 'Which school do you teach at?',
  },
  parent: {
    eyebrow: 'Your child\'s school \uD83C\uDFEB',
    heading: 'Which school does your child attend?',
  },
  other: {
    eyebrow: 'Your school \uD83C\uDFEB',
    heading: 'Which school do you attend?',
  },
};

const SWAHILI_SCHOOL_STEP_COPY: Record<PublicSignupRole, SchoolStepCopy> = {
  student: {
    eyebrow: 'Shule yako \uD83C\uDFEB',
    heading: 'Unasoma shule gani?',
  },
  teacher: {
    eyebrow: 'Shule yako \uD83C\uDFEB',
    heading: 'Unafundisha shule gani?',
  },
  parent: {
    eyebrow: 'Shule ya mtoto wako \uD83C\uDFEB',
    heading: 'Mtoto wako anasoma shule gani?',
  },
  other: {
    eyebrow: 'Shule yako \uD83C\uDFEB',
    heading: 'Unasoma shule gani?',
  },
};

const GENDER_OPTIONS: Record<OnboardingLanguageCode, readonly GenderChoiceOption[]> = {
  en: [
    {
      label: 'Male',
      value: 'male',
      description: 'Boy / Man',
      avatar: '\uD83D\uDC68\uD83C\uDFFE',
      bgColor: '#EBF5FB',
      accent: '#2E86C1',
    },
    {
      label: 'Female',
      value: 'female',
      description: 'Girl / Woman',
      avatar: '\uD83D\uDC69\uD83C\uDFFE',
      bgColor: '#FDEDEC',
      accent: '#C0392B',
    },
    {
      label: 'Alien',
      accessibilityLabel: 'Alien from space',
      value: 'alien',
      description: '...really?',
      avatar: '\uD83D\uDC7D',
      bgColor: '#E9F7EF',
      accent: '#1D8348',
      alien: true,
    },
  ],
  sw: [
    {
      label: 'Mvulana',
      value: 'male',
      description: 'Kijana / Mwanaume',
      avatar: '\uD83D\uDC68\uD83C\uDFFE',
      bgColor: '#EBF5FB',
      accent: '#2E86C1',
    },
    {
      label: 'Msichana',
      value: 'female',
      description: 'Msichana / Mwanamke',
      avatar: '\uD83D\uDC69\uD83C\uDFFE',
      bgColor: '#FDEDEC',
      accent: '#C0392B',
    },
    {
      label: 'Mgeni wa Nje ya Dunia',
      value: 'alien',
      description: '...kweli?',
      avatar: '\uD83D\uDC7D',
      bgColor: '#E9F7EF',
      accent: '#1D8348',
      alien: true,
    },
  ],
};

const TEACHER_GRADE_BANDS: Array<{ label: string; grades: readonly string[] }> = [
  {
    label: 'Lower Primary (CBC)',
    grades: LOWER_PRIMARY_GRADES,
  },
  {
    label: 'Upper Primary (CBC)',
    grades: ['Grade 4', 'Grade 5', 'Grade 6'],
  },
  {
    label: 'Junior Secondary (CBC)',
    grades: ['Grade 7', 'Grade 8', 'Grade 9'],
  },
  {
    label: 'Senior School',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
  },
];

type CbcGradeBand = 'lower' | 'upper' | 'junior' | 'senior';

const CBC_SUBJECTS_BY_GRADE_BAND: Record<CbcGradeBand, readonly string[]> = {
  lower: LOWER_PRIMARY_SUBJECTS,
  upper: [
    'English',
    'Mathematics',
    'Kiswahili',
    'Science & Technology',
    'Social Studies',
    'Religious Education',
    'Creative Arts',
    'Agriculture & Nutrition',
  ],
  junior: [
    'English',
    'Mathematics',
    'Kiswahili',
    'Integrated Science',
    'Pre-Technical Studies',
    'Social Studies',
    'Business Studies',
    'Agriculture',
    'Creative Arts & Sports',
    'Life Skills',
    'Religious Education',
  ],
  senior: [
    'English',
    'Mathematics',
    'Kiswahili',
    'Biology',
    'Chemistry',
    'Physics',
    'Computer Studies',
    'Agriculture',
    'Home Science',
    'Drawing & Design',
    'General Science',
    'History & Citizenship',
    'Geography',
    'Business Education',
    'CRE / IRE / HRE',
    'French',
    'German',
    'Arabic',
    'Mandarin',
    'Visual Arts',
    'Performing Arts',
    'Music',
    'Sports Science',
  ],
};

const CBC_CORE_SUBJECTS_BY_GRADE_BAND: Record<CbcGradeBand, readonly string[]> = {
  lower: ['English', 'Kiswahili', 'Mathematics'],
  upper: ['English', 'Mathematics', 'Kiswahili'],
  junior: ['English', 'Mathematics', 'Kiswahili'],
  senior: ['English', 'Mathematics', 'Kiswahili'],
};

const GRADE_BAND_LABELS: Record<CbcGradeBand, Record<OnboardingLanguageCode, string>> = {
  lower: {
    en: 'Lower Primary (CBC)',
    sw: 'Shule ya Msingi - Chini (CBC)',
  },
  upper: {
    en: 'Upper Primary (CBC)',
    sw: 'Shule ya Msingi - Juu (CBC)',
  },
  junior: {
    en: 'Junior Secondary (CBC)',
    sw: 'Shule ya Sekondari ya Chini (CBC)',
  },
  senior: {
    en: 'Senior School (KNEC)',
    sw: 'Shule ya Sekondari ya Juu (KNEC)',
  },
};

const ONBOARDING_SUBJECT_ID_ALIASES: Record<string, string> = {
  English: 'english',
  Mathematics: 'math',
  Kiswahili: 'kiswahili',
  'Social Studies': 'social',
  Agriculture: 'agriculture',
  'Creative Arts': 'creative_arts',
  Environmental: 'environmental',
  CRE: 'cre',
  IRE: 'ire',
  HRE: 'hre',
  'Indigenous Languages': 'indigenous_languages',
  'Hygiene and Nutrition': 'hygiene_nutrition',
  'Creative Activities': 'creative_activities',
};

function gradeBandForGrade(gradeValue: string): CbcGradeBand {
  const gradeNumber = Number(gradeValue.replace(/\D/g, ''));

  if (gradeNumber >= 10) {
    return 'senior';
  }

  if (gradeNumber >= 7) {
    return 'junior';
  }

  if (gradeNumber <= 3) {
    return 'lower';
  }

  return 'upper';
}

function displayGradeLabel(gradeValue: string) {
  if (gradeValue === 'Grade 11') {
    return 'Form 3';
  }
  if (gradeValue === 'Grade 12') {
    return 'Form 4';
  }
  return gradeValue;
}

function displayGradeChipLabel(gradeValue: string) {
  const label = displayGradeLabel(gradeValue);
  return gradeValue === 'Grade 11' || gradeValue === 'Grade 12' ? `${label} · KNEC` : label;
}

function displayGradeBandLabel(gradeValue: string, languageCode: OnboardingLanguageCode) {
  if (gradeValue === 'Grade 11' || gradeValue === 'Grade 12') {
    return languageCode === 'sw' ? 'Sekondari ya Juu (KNEC)' : 'Senior School (KNEC)';
  }
  if (gradeValue === 'Grade 10') {
    return languageCode === 'sw' ? 'Shule ya Sekondari ya Juu (CBC)' : 'Senior School (CBC)';
  }
  return GRADE_BAND_LABELS[gradeBandForGrade(gradeValue)][languageCode];
}

function isValidLearnerAge(value: string) {
  const parsed = Number(value.trim());
  return Number.isInteger(parsed) && parsed >= LEARNER_MIN_AGE && parsed <= LEARNER_MAX_AGE;
}

function isValidDisplayName(value: string) {
  const trimmed = value.trim();
  return trimmed.length >= 2 && /[A-Za-z]/.test(trimmed) && !/\d/.test(trimmed);
}

function subjectIdFromName(name: string) {
  return ONBOARDING_SUBJECT_ID_ALIASES[name] ?? `cbc-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

function cbcSubjectOptionsForGrades(grades: readonly string[]): OnboardingSubjectOption[] {
  const seen = new Set<string>();

  return grades
    .flatMap(gradeValue => CBC_SUBJECTS_BY_GRADE_BAND[gradeBandForGrade(gradeValue)])
    .filter(subjectName => {
      if (seen.has(subjectName)) {
        return false;
      }

      seen.add(subjectName);
      return true;
    })
    .map(subjectName => ({
      id: subjectIdFromName(subjectName),
      name: subjectName,
    }));
}

const GOAL_OPTIONS: Record<PublicSignupRole, readonly RoleChoiceOption[]> = {
  student: [
    {
      key: 'habit',
      icon: '\uD83C\uDF31',
      label: 'Build a Daily Study Habit',
      description: '10 min / day',
    },
    {
      key: 'top',
      icon: '\u2B50',
      label: 'Become a Top Student',
      description: '15 min / day',
      recommended: true,
    },
    {
      key: 'specific',
      icon: '\uD83D\uDCAA',
      label: 'Improve in Specific Subjects',
      description: '30 min / day',
    },
    {
      key: 'full',
      icon: '\uD83D\uDD25',
      label: 'Reach my full potential',
      description: '60+ min / day',
    },
  ],
  teacher: [
    {
      key: 'engage',
      icon: '\uD83C\uDFAF',
      label: 'Engage my students better',
      description: 'Interactive resources',
      recommended: true,
    },
    {
      key: 'results',
      icon: '\uD83D\uDCCA',
      label: 'Improve exam results',
      description: 'Track and close gaps',
    },
    {
      key: 'plan',
      icon: '\uD83D\uDCCB',
      label: 'Better lesson planning',
      description: 'Save prep time',
    },
    {
      key: 'feedback',
      icon: '\uD83D\uDCAC',
      label: 'Give richer feedback',
      description: 'Personalised to each student',
    },
  ],
  parent: [
    {
      key: 'best_in_class',
      label: 'Best in their class',
      description: '',
    },
    {
      key: 'okay',
      label: 'Okay',
      description: '',
    },
    {
      key: 'average',
      label: 'Average',
      description: '',
    },
    {
      key: 'far_behind',
      label: 'Far behind',
      description: '',
    },
    {
      key: 'poorly',
      label: 'Poorly',
      description: '',
    },
  ],
  other: [
    {
      key: 'learn',
      icon: '\uD83E\uDDE0',
      label: 'Learn at my own pace',
      description: '',
    },
    {
      key: 'help',
      icon: '\uD83E\uDD1D',
      label: 'Help someone I care about',
      description: '',
      recommended: true,
    },
    {
      key: 'explore',
      icon: '\uD83D\uDD0D',
      label: 'Explore what\'s possible',
      description: '',
    },
    {
      key: 'community',
      icon: '\uD83C\uDF0D',
      label: 'Support my community',
      description: '',
    },
  ],
};

const SWAHILI_GOAL_OPTIONS: Record<PublicSignupRole, readonly RoleChoiceOption[]> = {
  student: [
    {
      key: 'habit',
      icon: '\uD83C\uDF31',
      label: 'Jenga tabia ya kila siku',
      description: 'dakika 10 / siku',
    },
    {
      key: 'consistent',
      icon: '\u2B50',
      label: 'Kuwa thabiti',
      description: 'dakika 15 / siku',
      recommended: true,
    },
    {
      key: 'top',
      icon: '\uD83D\uDCAA',
      label: 'Kuwa mwanafunzi bora',
      description: 'dakika 45 / siku',
    },
    {
      key: 'full',
      icon: '\uD83D\uDD25',
      label: 'Fikia uwezo kamili',
      description: 'saa 1+ / siku',
    },
  ],
  teacher: [
    {
      key: 'engage',
      icon: '\uD83C\uDFAF',
      label: 'Washirikishe wanafunzi vizuri zaidi',
      description: 'Nyenzo za maingiliano',
      recommended: true,
    },
    {
      key: 'results',
      icon: '\uD83D\uDCCA',
      label: 'Boresha matokeo ya mitihani',
      description: 'Fuatilia na jaza maeneo dhaifu',
    },
    {
      key: 'plan',
      icon: '\uD83D\uDCCB',
      label: 'Kupanga masomo vizuri',
      description: 'Punguza muda wa maandalizi',
    },
    {
      key: 'feedback',
      icon: '\uD83D\uDCAC',
      label: 'Toa maoni bora',
      description: 'Kwa kila mwanafunzi',
    },
  ],
  parent: [
    {
      key: 'best_in_class',
      label: 'Wa kwanza darasani',
      description: '',
    },
    {
      key: 'okay',
      label: 'Sawa',
      description: '',
    },
    {
      key: 'average',
      label: 'Kwa wastani',
      description: '',
    },
    {
      key: 'far_behind',
      label: 'Yuko nyuma sana',
      description: '',
    },
    {
      key: 'poorly',
      label: 'Vibaya',
      description: '',
    },
  ],
  other: [
    {
      key: 'learn',
      icon: '\uD83E\uDDE0',
      label: 'Jifunze kwa kasi yangu',
      description: '',
    },
    {
      key: 'help',
      icon: '\uD83E\uDD1D',
      label: 'Msaidie mtu ninayemjali',
      description: '',
      recommended: true,
    },
    {
      key: 'explore',
      icon: '\uD83D\uDD0D',
      label: 'Chunguza kinachowezekana',
      description: '',
    },
    {
      key: 'community',
      icon: '\uD83C\uDF0D',
      label: 'Saidia jamii yangu',
      description: '',
    },
  ],
};

const GOAL_CONFIRM_TIME_COPY: Record<string, Record<OnboardingLanguageCode, string>> = {
  habit: { en: '10 min', sw: 'dakika 10' },
  consistent: { en: '15 min', sw: 'dakika 15' },
  top: { en: '45 min', sw: 'dakika 45' },
  full: { en: '60+ min', sw: 'saa 1+' },
};

const CONCERN_OPTIONS: Record<PublicSignupRole, readonly RoleChoiceOption[]> = {
  student: [
    {
      key: 'stress',
      icon: '\uD83D\uDE24',
      label: 'Exams are giving me stress.',
      description: '',
    },
    {
      key: 'pace',
      icon: '\uD83D\uDE2F',
      label: 'My teacher goes too fast.',
      description: '',
    },
    {
      key: 'homework',
      icon: '\u23F3',
      label: 'I spend too much time on homework.',
      description: '',
    },
    {
      key: 'start',
      icon: '\uD83D\uDE35',
      label: 'I don\'t know where to start studying.',
      description: '',
    },
    {
      key: 'grades',
      icon: '\uD83C\uDFEB',
      label: 'I want better grades but don\'t know how.',
      description: '',
    },
    {
      key: 'focus',
      icon: '\uD83C\uDFAF',
      label: 'I forget things quickly after studying.',
      description: '',
    },
  ],
  teacher: [
    {
      key: 'engagement',
      icon: '\uD83D\uDE14',
      label: 'Low student engagement in class.',
      description: '',
    },
    {
      key: 'workload',
      icon: '\u23F3',
      label: 'Too much marking and admin work.',
      description: '',
    },
    {
      key: 'gaps',
      icon: '\uD83D\uDCCA',
      label: 'Hard to identify each student\'s weak areas.',
      description: '',
    },
    {
      key: 'resources',
      icon: '\uD83D\uDCDA',
      label: 'Lack of good learning resources.',
      description: '',
    },
    {
      key: 'coverage',
      icon: '\u23F1\uFE0F',
      label: 'Struggling to cover the full syllabus.',
      description: '',
    },
    {
      key: 'results',
      icon: '\uD83D\uDCC9',
      label: 'Students underperforming in exams.',
      description: '',
    },
  ],
  parent: [
    {
      key: 'motivation',
      label: 'My child is not motivated to study.',
      description: '',
    },
    {
      key: 'time',
      label: 'Too much time on phone/TV instead of studying.',
      description: '',
    },
    {
      key: 'grades',
      label: 'Their grades have been dropping.',
      description: '',
    },
    {
      key: 'understand',
      label: 'They don\'t understand what they\'re taught.',
      description: '',
    },
    {
      key: 'homework',
      label: 'Homework is a constant battle at home.',
      description: '',
    },
    {
      key: 'involve',
      label: 'I don\'t know how to help them at home.',
      description: '',
    },
  ],
  other: [
    {
      key: 'time',
      icon: '\u23F0',
      label: 'Not enough time to study.',
      description: '',
    },
    {
      key: 'start',
      icon: '\uD83D\uDE35',
      label: 'Don\'t know where to start.',
      description: '',
    },
    {
      key: 'retain',
      icon: '\uD83E\uDDE0',
      label: 'Hard to retain what I learn.',
      description: '',
    },
    {
      key: 'cost',
      icon: '\uD83D\uDCB8',
      label: 'Good tutoring is too expensive.',
      description: '',
    },
    {
      key: 'access',
      icon: '\uD83D\uDCF6',
      label: 'Limited access to quality resources.',
      description: '',
    },
    {
      key: 'focus',
      icon: '\uD83C\uDFAF',
      label: 'Hard to stay focused while studying.',
      description: '',
    },
  ],
};

const SWAHILI_CONCERN_OPTIONS: Record<PublicSignupRole, readonly RoleChoiceOption[]> = {
  student: [
    { key: 'stress', icon: '\uD83D\uDE24', label: 'Mitihani inanisumbua sana.', description: '' },
    { key: 'pace', icon: '\uD83D\uDE2F', label: 'Mwalimu anafundisha haraka sana.', description: '' },
    { key: 'homework', icon: '\u23F3', label: 'Kazi za nyumbani zinachukua muda mwingi.', description: '' },
    { key: 'start', icon: '\uD83D\uDE35', label: 'Sijui nianze wapi kustudy.', description: '' },
    { key: 'grades', icon: '\uD83C\uDFEB', label: 'Nataka alama bora, sijui jinsi.', description: '' },
    { key: 'focus', icon: '\uD83C\uDFAF', label: 'Ninasahau haraka ninachojifunza.', description: '' },
  ],
  teacher: [
    { key: 'engagement', icon: '\uD83D\uDE14', label: 'Wanafunzi hawashirikiani vizuri darasani.', description: '' },
    { key: 'workload', icon: '\u23F3', label: 'Kazi nyingi za kuandika na usimamizi.', description: '' },
    { key: 'gaps', icon: '\uD83D\uDCCA', label: 'Ni vigumu kujua maeneo dhaifu ya kila mwanafunzi.', description: '' },
    { key: 'resources', icon: '\uD83D\uDCDA', label: 'Ukosefu wa nyenzo nzuri za kufundishia.', description: '' },
    { key: 'coverage', icon: '\u23F1\uFE0F', label: 'Inashindikana kukamilisha silabasi yote.', description: '' },
    { key: 'results', icon: '\uD83D\uDCC9', label: 'Wanafunzi wanapata matokeo mabaya katika mitihani.', description: '' },
  ],
  parent: [
    { key: 'motivation', label: 'Mtoto wangu hana hamasa ya kustudy.', description: '' },
    { key: 'time', label: 'Anatumia muda mwingi kwenye simu/TV badala ya kusoma.', description: '' },
    { key: 'grades', label: 'Alama zake zimekuwa zikishuka.', description: '' },
    { key: 'understand', label: 'Haelewi kinachofundishwa shuleni.', description: '' },
    { key: 'homework', label: 'Kazi za nyumbani ni ugomvi wa kila siku nyumbani.', description: '' },
    { key: 'involve', label: 'Sijui jinsi ya kumsaidia nyumbani.', description: '' },
  ],
  other: [
    { key: 'time', icon: '\u23F0', label: 'Sina muda wa kutosha kusoma.', description: '' },
    { key: 'start', icon: '\uD83D\uDE35', label: 'Sijui nianze wapi.', description: '' },
    { key: 'retain', icon: '\uD83E\uDDE0', label: 'Ni vigumu kukumbuka ninachojifunza.', description: '' },
    { key: 'cost', icon: '\uD83D\uDCB8', label: 'Mafunzo mazuri ni ghali sana.', description: '' },
    { key: 'access', icon: '\uD83D\uDCF6', label: 'Sina nyenzo bora za kujifunzia.', description: '' },
    { key: 'focus', icon: '\uD83C\uDFAF', label: 'Ni vigumu kubaki makini nikisoma.', description: '' },
  ],
};

const ACHIEVEMENT_OPTIONS: Record<PublicSignupRole, readonly RoleChoiceOption[]> = {
  student: [
    {
      key: 'ace',
      icon: '\uD83D\uDE80',
      label: 'Ace my upcoming tests.',
      description: '',
    },
    {
      key: 'improve',
      icon: '\uD83D\uDCCA',
      label: 'Turn bad grades into good ones.',
      description: '',
    },
    {
      key: 'faster',
      icon: '\u26A1',
      label: 'Finish homework faster (more free time).',
      description: '',
    },
    {
      key: 'uni',
      icon: '\uD83C\uDF93',
      label: 'Get into my dream university.',
      description: '',
    },
    {
      key: 'understand',
      icon: '\uD83E\uDDE0',
      label: 'Actually understand what I\'m learning.',
      description: '',
    },
    {
      key: 'confidence',
      icon: '\u2728',
      label: 'Feel more confident in class.',
      description: '',
    },
  ],
  teacher: [
    {
      key: 'improve',
      icon: '\uD83D\uDCCA',
      label: 'Raise my class average by 10%+.',
      description: '',
    },
    {
      key: 'save',
      icon: '\u23F0',
      label: 'Save at least 3 hours per week on prep.',
      description: '',
    },
    {
      key: 'engage',
      icon: '\uD83C\uDFAF',
      label: 'Make every lesson more engaging.',
      description: '',
    },
    {
      key: 'identify',
      icon: '\uD83D\uDD0D',
      label: 'Identify weak students early and help them.',
      description: '',
    },
    {
      key: 'complete',
      icon: '\u2705',
      label: 'Complete the full syllabus on time.',
      description: '',
    },
    {
      key: 'feedback',
      icon: '\uD83D\uDCAC',
      label: 'Give better personalised feedback.',
      description: '',
    },
  ],
  parent: [
    {
      key: 'phone_yes',
      label: 'Yes',
      description: '',
    },
    {
      key: 'phone_no',
      label: 'No',
      description: '',
    },
  ],
  other: [
    {
      key: 'understand',
      icon: '\uD83E\uDDE0',
      label: 'Understand a subject I\'ve always found hard.',
      description: '',
    },
    {
      key: 'help',
      icon: '\uD83E\uDD1D',
      label: 'Help the student I care about succeed.',
      description: '',
    },
    {
      key: 'explore',
      icon: '\uD83D\uDD0D',
      label: 'Explore what AI-powered learning can do.',
      description: '',
    },
    {
      key: 'career',
      icon: '\uD83D\uDCBC',
      label: 'Support a career change or upskilling.',
      description: '',
    },
  ],
};

const SWAHILI_ACHIEVEMENT_OPTIONS: Record<PublicSignupRole, readonly RoleChoiceOption[]> = {
  student: [
    { key: 'ace', icon: '\uD83D\uDE80', label: 'Shangilia mitihani inayokuja.', description: '' },
    { key: 'improve', icon: '\uD83D\uDCCA', label: 'Badilisha alama mbaya kuwa nzuri.', description: '' },
    { key: 'faster', icon: '\u26A1', label: 'Maliza kazi haraka (muda zaidi wa michezo).', description: '' },
    { key: 'uni', icon: '\uD83C\uDF93', label: 'Ingia chuo kikuu ninachotaka.', description: '' },
    { key: 'understand', icon: '\uD83E\uDDE0', label: 'Elewa vizuri ninachojifunza.', description: '' },
    { key: 'confidence', icon: '\u2728', label: 'Jisikie imara zaidi darasani.', description: '' },
  ],
  teacher: [
    { key: 'improve', icon: '\uD83D\uDCCA', label: 'Panda wastani wa darasa kwa 10%+.', description: '' },
    { key: 'save', icon: '\u23F0', label: 'Okoa angalau masaa 3 kwa wiki ya maandalizi.', description: '' },
    { key: 'engage', icon: '\uD83C\uDFAF', label: 'Fanya kila somo liwe la kuvutia.', description: '' },
    { key: 'identify', icon: '\uD83D\uDD0D', label: 'Tambua wanafunzi dhaifu mapema na uwasaidie.', description: '' },
    { key: 'complete', icon: '\u2705', label: 'Kamilisha silabasi yote kwa wakati.', description: '' },
    { key: 'feedback', icon: '\uD83D\uDCAC', label: 'Toa maoni ya kibinafsi bora zaidi.', description: '' },
  ],
  parent: [
    { key: 'phone_yes', label: 'Ndiyo', description: '' },
    { key: 'phone_no', label: 'Hapana', description: '' },
  ],
  other: [
    { key: 'understand', icon: '\uD83E\uDDE0', label: 'Elewa somo ambalo limekuwa gumu kwangu.', description: '' },
    { key: 'help', icon: '\uD83E\uDD1D', label: 'Msaidie mwanafunzi ninayemjali afanikiwe.', description: '' },
    { key: 'explore', icon: '\uD83D\uDD0D', label: 'Chunguza AI inaweza kusaidiaje kujifunza.', description: '' },
    { key: 'career', icon: '\uD83D\uDCBC', label: 'Saidia kubadili kazi au kuongeza ujuzi.', description: '' },
  ],
};

const INTEREST_OPTIONS: readonly RoleChoiceOption[] = [
  {
    key: 'football',
    icon: '⚽',
    label: 'Football',
    swLabel: 'Mpira',
    description: 'Use sports examples in practice.',
  },
  {
    key: 'music',
    icon: '🎵',
    label: 'Music',
    swLabel: 'Muziki',
    description: 'Make study prompts feel more familiar.',
  },
  {
    key: 'gaming',
    icon: '🎮',
    label: 'Gaming',
    swLabel: 'Gaming',
    description: 'Add challenges and progress moments.',
  },
  {
    key: 'tech',
    icon: '💻',
    label: 'Technology',
    swLabel: 'Teknolojia',
    description: 'Connect lessons to digital skills.',
  },
  {
    key: 'movies',
    icon: '🎬',
    label: 'Movies',
    swLabel: 'Filamu',
    description: 'Use stories and scenes in examples.',
  },
  {
    key: 'art',
    icon: '🎨',
    label: 'Art',
    swLabel: 'Sanaa',
    description: 'Use visual and creative examples.',
  },
  {
    key: 'cooking',
    icon: '🍲',
    label: 'Cooking',
    swLabel: 'Kupika',
    description: 'Connect practice to everyday life.',
  },
  {
    key: 'reading',
    icon: '📖',
    label: 'Reading',
    swLabel: 'Vitabu',
    description: 'Recommend stronger study material.',
  },
];

// "Good news" solution lines shown to teachers, keyed by the challenge (concern) and
// success (achievement) they picked earlier, so the card speaks to their own answers.
const TEACHER_CHALLENGE_SOLUTIONS: Record<string, { en: string; sw: string }> = {
  engagement: {
    en: 'Low engagement? Kitabu AI turns lessons into interactive quizzes and games.',
    sw: 'Ushiriki mdogo? Kitabu AI hubadilisha masomo kuwa maswali na michezo shirikishi.',
  },
  workload: {
    en: 'Marking and admin pile up — Kitabu AI auto-grades homework and writes reports for you.',
    sw: 'Kusahihisha na kazi za ofisi? Kitabu AI husahihisha kazi na kuandika ripoti kwa niaba yako.',
  },
  gaps: {
    en: "Spotting weak areas is hard — Kitabu AI shows each student's gaps instantly.",
    sw: 'Kubaini udhaifu ni vigumu — Kitabu AI hukuonyesha pengo la kila mwanafunzi papo hapo.',
  },
  resources: {
    en: 'Short on resources? Kitabu AI gives you ready CBC lessons and question banks.',
    sw: 'Huna nyenzo za kutosha? Kitabu AI hukupa masomo ya CBC na maswali tayari.',
  },
  coverage: {
    en: 'Syllabus pressure? Kitabu AI paces the full syllabus so you finish on time.',
    sw: 'Shinikizo la mtaala? Kitabu AI hupanga mtaala wote ili umalize kwa wakati.',
  },
  results: {
    en: 'Underperformance in exams? Kitabu AI drills KNEC-style practice that lifts scores.',
    sw: 'Matokeo hafifu? Kitabu AI hutoa mazoezi ya mtindo wa KNEC yanayoinua alama.',
  },
};
const TEACHER_SUCCESS_SOLUTIONS: Record<string, { en: string; sw: string }> = {
  improve: {
    en: 'Raise your class average — guided practice has lifted averages by up to 2 grades.',
    sw: 'Inua wastani wa darasa — mazoezi yamepandisha wastani hadi madaraja 2.',
  },
  save: {
    en: 'Save hours each week — Kitabu AI grades work and plans lessons for you.',
    sw: 'Okoa masaa kila wiki — Kitabu AI husahihisha na kupanga masomo kwa niaba yako.',
  },
  engage: {
    en: 'Make lessons engaging — interactive, game-based content students enjoy.',
    sw: 'Fanya masomo yavutie — maudhui shirikishi ya mchezo wanafunzi wanayopenda.',
  },
  identify: {
    en: 'Catch struggling students early — analytics flag them before exams.',
    sw: 'Tambua wanafunzi wanaohangaika mapema — takwimu huwabaini kabla ya mitihani.',
  },
  complete: {
    en: 'Finish the syllabus on time — a paced plan keeps every topic on track.',
    sw: 'Maliza mtaala kwa wakati — mpango uliopangwa huweka kila mada sawa.',
  },
  feedback: {
    en: 'Give richer feedback — instant, personalised notes on every submission.',
    sw: 'Toa maoni bora — maelezo ya papo hapo kwa kila kazi iliyowasilishwa.',
  },
};

const PARENT_CHALLENGE_SOLUTIONS: Record<string, { en: string; sw: string }> = {
  motivation: {
    en: 'When motivation drops, Kitabu AI turns revision into short wins your child can finish daily.',
    sw: 'Hamasa ikishuka, Kitabu AI hubadilisha marudio kuwa ushindi mdogo wa kila siku.',
  },
  time: {
    en: 'Too much screen time? Kitabu gives your child focused practice and gives you progress visibility.',
    sw: 'Muda mwingi kwa screen? Kitabu humpa mtoto mazoezi yaliyolenga na kukuonyesha maendeleo.',
  },
  grades: {
    en: 'Dropping grades become visible early through weekly progress reports and weak-area alerts.',
    sw: 'Alama zikishuka unaona mapema kupitia ripoti za wiki na tahadhari za maeneo dhaifu.',
  },
  understand: {
    en: 'If classwork is not landing, Rafiki explains again and shows the exact topic causing trouble.',
    sw: 'Akikosa kuelewa, Rafiki hueleza tena na kuonyesha mada inayomtatiza.',
  },
  homework: {
    en: 'Homework battles get clearer because you see what was attempted, missed, and needs support.',
    sw: 'Migogoro ya homework hupungua kwa sababu unaona kilichojaribiwa, kilikosewa, na kinachohitaji msaada.',
  },
  involve: {
    en: 'You do not have to guess how to help; Kitabu tells you what to ask, praise, and follow up.',
    sw: 'Huhitaji kubahatisha jinsi ya kusaidia; Kitabu hukuambia cha kuuliza, kupongeza, na kufuatilia.',
  },
};

const PARENT_SUCCESS_SOLUTIONS: Record<string, { en: string; sw: string }> = {
  grades: {
    en: 'You get a clear path from weak topics to stronger marks, with reports you can act on.',
    sw: 'Unapata njia wazi kutoka mada dhaifu hadi alama bora, na ripoti unazoweza kutumia.',
  },
  habits: {
    en: 'Daily study habits become visible, so you can support consistency without nagging blindly.',
    sw: 'Tabia ya kusoma kila siku inaonekana, hivyo unaweza kusaidia bila kusukuma bila taarifa.',
  },
  gap: {
    en: 'Every report highlights the topics your child understands and the ones that need attention next.',
    sw: 'Kila ripoti huonyesha mada mtoto anaelewa na zinazohitaji kuangaliwa.',
  },
  uni: {
    en: 'Long-term preparation starts with the right grade, subjects, and steady progress tracking.',
    sw: 'Maandalizi ya muda mrefu huanza na darasa sahihi, masomo, na kufuatilia maendeleo.',
  },
  involve: {
    en: 'You stay involved with practical progress reports instead of waiting for end-term surprises.',
    sw: 'Unashirikishwa kupitia ripoti za maendeleo badala ya kusubiri mshangao wa mwisho wa muhula.',
  },
  stress: {
    en: 'Exam stress reduces when you know what is improving and what needs support before tests.',
    sw: 'Msongo wa mitihani hupungua ukiwa unajua kinachoboreka na kinachohitaji msaada kabla ya mtihani.',
  },
};

function normalizeOptionalMpesaPhoneNumber(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) {
    return digits;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return `254${digits.slice(1)}`;
  }
  if (digits.startsWith('7') && digits.length === 9) {
    return `254${digits}`;
  }

  throw new Error(MPESA_PHONE_ERROR);
}

function normalizeSignupPhoneNumber(input: string) {
  const digits = input.trim().replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return `+254${digits.slice(1)}`;
  }
  if (digits.startsWith('7') && digits.length === 9) {
    return `+254${digits}`;
  }

  return input.trim();
}

function formatSchoolGradeMeta(school: SchoolData, grade: string) {
  // A grade isn't always known yet (e.g. teachers pick their school before grades),
  // so fall back to the school's overall roster size.
  if (!grade) {
    const total = school.totalStudents ?? 0;
    return `${total} ${total === 1 ? 'learner' : 'learners'}`;
  }

  const gradeCount = school.gradeCounts[grade] ?? 0;
  if (gradeCount <= 0) {
    return `No ${grade} learners yet`;
  }

  return `${gradeCount} ${grade} ${gradeCount === 1 ? 'learner' : 'learners'}`;
}

function normalizeCountyName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\b(county|kenya)\b/g, '')
    .replace(/\s+city$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function countyMatchesLocation(county: string, location: string) {
  return normalizeCountyName(county) === normalizeCountyName(location);
}

function compareLabels(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

function schoolEnrollmentForSort(school: SchoolData, grade?: string) {
  if (grade) {
    const gradeEnrollment = school.gradeCounts[grade];
    if (typeof gradeEnrollment === 'number') {
      return gradeEnrollment;
    }
  }

  return school.totalStudents;
}

function prioritizeCountiesBySchoolCount(counties: string[], schools: SchoolData[]) {
  const schoolCountsByCounty = new Map<string, number>();

  schools.forEach(school => {
    const countyKey = normalizeCountyName(school.location);
    if (!countyKey) {
      return;
    }

    schoolCountsByCounty.set(countyKey, (schoolCountsByCounty.get(countyKey) ?? 0) + 1);
  });

  const uniqueCounties = Array.from(new Set(counties));
  const topCounties = uniqueCounties
    .map(option => ({
      option,
      count: schoolCountsByCounty.get(normalizeCountyName(option)) ?? 0,
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count || compareLabels(a.option, b.option))
    .slice(0, 5)
    .map(item => item.option);
  const topCountySet = new Set(topCounties);
  const remainingCounties = uniqueCounties
    .filter(option => !topCountySet.has(option))
    .sort(compareLabels);

  return [...topCounties, ...remainingCounties];
}

function prioritizeSchoolsByEnrollment(schoolOptions: SchoolData[], grade?: string) {
  const topSchools = [...schoolOptions]
    .filter(school => schoolEnrollmentForSort(school, grade) > 0)
    .sort(
      (a, b) =>
        schoolEnrollmentForSort(b, grade) - schoolEnrollmentForSort(a, grade) ||
        compareLabels(a.name, b.name),
    )
    .slice(0, 5);
  const topSchoolIds = new Set(topSchools.map(school => school.id));
  const remainingSchools = schoolOptions
    .filter(school => !topSchoolIds.has(school.id))
    .sort((a, b) => compareLabels(a.name, b.name));

  return [...topSchools, ...remainingSchools];
}

interface StudentOnboardingScreenProps {
  role: PublicSignupRole;
  schools: SchoolData[];
  isSubmitting: boolean;
  error?: string | null;
  includeIntroChoices?: boolean;
  collectSignupCredentials?: boolean;
  externalPaymentsEnabled?: boolean;
  onCreateSchool?: (input: { schoolName: string; county: string }) => Promise<SchoolData>;
  onRoleChange?: (role: PublicSignupRole) => void;
  onSubmit: (input: {
    gender: GenderOption;
    grade: string;
    schoolId: string | null;
    mpesaPhoneNumber?: string | null;
    selectedSubjectIds?: string[];
    lang?: OnboardingLanguageCode;
    languageCode?: OnboardingLanguageCode;
    mascot?: OnboardingMascotKey;
    mascotKey?: OnboardingMascotKey;
    role?: PublicSignupRole;
    name?: string;
    voice?: OnboardingVoiceName | '';
    voiceName?: OnboardingVoiceName;
    noVoice?: boolean;
    need?: OnboardingNeedKey;
    needKey?: OnboardingNeedKey;
    displayName?: string;
    age?: string;
    children?: ParentChildOnboardingInput[];
    parentChildren?: ParentChildOnboardingInput[];
    teachGrades?: string[];
    teacherGradeIds?: string[];
    subjects?: string[];
    subjectsByGrade?: Record<string, string[]>;
    county?: string;
    school?: string;
    goal?: OnboardingGoalKey;
    goalKey?: OnboardingGoalKey;
    concern?: OnboardingConcernKey;
    concernKey?: OnboardingConcernKey;
    achieve?: OnboardingAchievementKey;
    achievementKey?: OnboardingAchievementKey;
    interests?: OnboardingInterestKey[];
    interestKeys?: OnboardingInterestKey[];
    reminderEnabled?: boolean;
    countryCode?: string;
    curriculumCode?: string;
    signupMethod?: SignupMethod;
    email?: string;
    signupEmail?: string;
    phone?: string;
    signupPhone?: string;
    signupOtp?: string;
    password?: string;
    signupPassword?: string;
  }) => void;
}

export function StudentOnboardingScreen({
  role,
  schools,
  isSubmitting,
  error,
  includeIntroChoices = false,
  collectSignupCredentials = false,
  externalPaymentsEnabled = true,
  onCreateSchool,
  onRoleChange,
  onSubmit,
}: StudentOnboardingScreenProps) {
  const [introStep, setIntroStep] = useState<IntroStep>(includeIntroChoices ? 'language' : 'setup');
  const [languageCode, setLanguageCode] = useState<OnboardingLanguageCode | null>(null);
  const [selectedMascotKey, setSelectedMascotKey] = useState<OnboardingMascotKey | null>(null);
  // When the role can be changed on the "Who are you?" step (onRoleChange provided), we do not
  // pre-highlight the incoming default role; the user must explicitly pick one before continuing.
  const [roleChosen, setRoleChosen] = useState(false);
  const [selectedVoiceName, setSelectedVoiceName] = useState<OnboardingVoiceName | null>(null);
  const [voicePreviewedName, setVoicePreviewedName] = useState<OnboardingVoiceName | null>(null);
  const [voicePreviewingName, setVoicePreviewingName] = useState<OnboardingVoiceName | null>(null);
  const [noVoice, setNoVoice] = useState(false);
  const [selectedNeedKey, setSelectedNeedKey] = useState<OnboardingNeedKey | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [parentChildName, setParentChildName] = useState('');
  const [parentChildAge, setParentChildAge] = useState('');
  const [parentChildGrade, setParentChildGrade] = useState(includeIntroChoices ? '' : DEFAULT_GRADE);
  const [additionalParentChildren, setAdditionalParentChildren] = useState<Array<{ name: string; age: string; grade: string }>>([]);
  const [parentSubjectChildIndex, setParentSubjectChildIndex] = useState(0);
  const [parentSubjectsByChild, setParentSubjectsByChild] = useState<Record<string, string[]>>({});
  const [teacherGradeIds, setTeacherGradeIds] = useState<string[]>(includeIntroChoices ? [] : [DEFAULT_GRADE]);
  // Subjects a teacher teaches, captured per selected grade (grade value -> subject ids).
  const [teacherSubjectsByGrade, setTeacherSubjectsByGrade] = useState<Record<string, string[]>>({});
  // Which selected grade's subject screen the teacher is currently on (one screen per grade).
  const [teacherSubjectGradeIndex, setTeacherSubjectGradeIndex] = useState(0);
  const [selectedGoalKey, setSelectedGoalKey] = useState<OnboardingGoalKey | null>(null);
  const [selectedConcernKey, setSelectedConcernKey] = useState<OnboardingConcernKey | null>(null);
  const [selectedAchievementKey, setSelectedAchievementKey] = useState<OnboardingAchievementKey | null>(null);
  const [selectedInterestKeys, setSelectedInterestKeys] = useState<OnboardingInterestKey[]>([]);
  const [reminderEnabled, setReminderEnabled] = useState(!includeIntroChoices);
  const [isRequestingReminderPermission, setIsRequestingReminderPermission] = useState(false);
  const [isRequestingMicrophonePermission, setIsRequestingMicrophonePermission] = useState(false);
  const [narrationTrigger, setNarrationTrigger] = useState<string | null>(null);
  const [preparedMpesaPhoneNumber, setPreparedMpesaPhoneNumber] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState<GenderOption | null>(includeIntroChoices ? null : 'not_specified');
  const [grade, setGrade] = useState(includeIntroChoices ? '' : DEFAULT_GRADE);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(
    includeIntroChoices ? [] : SUBJECTS.slice(0, MAX_ONBOARDING_SUBJECTS).map(subject => subject.id),
  );
  const [countryCode, setCountryCode] = useState<string>(() => detectDefaultCountryCode());
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countyPickerOpen, setCountyPickerOpen] = useState(false);
  const [schoolPickerOpen, setSchoolPickerOpen] = useState(false);
  const [county, setCounty] = useState('');
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [manualSchoolName, setManualSchoolName] = useState('');
  const [addSchoolOpen, setAddSchoolOpen] = useState(false);
  const [isAddingSchool, setIsAddingSchool] = useState(false);
  const [addSchoolError, setAddSchoolError] = useState<string | null>(null);
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState('');
  const [signupStep, setSignupStep] = useState<SignupStep>('method');
  const [signupMethod, setSignupMethod] = useState<SignupMethod | null>(null);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupPasswordConfirm, setShowSignupPasswordConfirm] = useState(false);
  const [signupOtp, setSignupOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [signupResendSeconds, setSignupResendSeconds] = useState(30);
  const [signupCodeError, setSignupCodeError] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [activeReadyTestimonialIndex, setActiveReadyTestimonialIndex] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<'school' | 'mpesa' | null>(null);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const { height, width } = useWindowDimensions();
  const insets = useContext(SafeAreaInsetsContext) ?? ZERO_SAFE_AREA_INSETS;
  const compactLayout = height < 860 || width < 370;
  const content = ONBOARDING_CONTENT[role];
  const roleOptions = (collectSignupCredentials && Boolean(onRoleChange))
    ? PUBLIC_ROLE_OPTIONS
    : INTERNAL_ROLE_OPTIONS;
  const fullIntro = includeIntroChoices;
  const swahiliIntro = fullIntro && languageCode === 'sw';
  const usesLearnerFlow = role === 'student' || role === 'other';
  const studentFullIntro = fullIntro && usesLearnerFlow;
  const studentSwahiliIntro = studentFullIntro && languageCode === 'sw';
  const isSchoolSetupStep = introStep === 'setup' && (step === 1 || (studentFullIntro && step === 2)) && !(studentFullIntro && step === 1);
  const schoolStepCompactLayout = compactLayout || (isSchoolSetupStep && height < 880);
  const footerCompactLayout = isSchoolSetupStep ? schoolStepCompactLayout : compactLayout;
  const selectedLanguage = LANGUAGE_OPTIONS.find(option => option.code === languageCode) ?? LANGUAGE_OPTIONS[1];
  const selectedMascotOption = MASCOT_OPTIONS.find(option => option.key === selectedMascotKey);
  const activeMascot = includeIntroChoices ? selectedMascotOption ?? content.mascot : content.mascot;
  const activeMascotColors = MASCOT_PICKER_COLORS[activeMascot.key];
  const optionOrderCache = useRef(new Map<string, readonly unknown[]>());
  const optionOrderKey = `${role}-${languageCode ?? 'en'}`;
  const needOptions = stableShuffledOptions(
    optionOrderCache.current,
    `${optionOrderKey}-need`,
    swahiliIntro ? SWAHILI_NEED_OPTIONS[role] : NEED_OPTIONS[role],
  );
  const needStepCopy = swahiliIntro ? SWAHILI_NEED_STEP_COPY[role] : NEED_STEP_COPY[role];
  const nameStepCopy = swahiliIntro ? SWAHILI_NAME_STEP_COPY[role] : NAME_STEP_COPY[role];
  const ageStepCopy = AGE_STEP_COPY[languageCode];
  const schoolStepCopy = swahiliIntro ? SWAHILI_SCHOOL_STEP_COPY[role] : SCHOOL_STEP_COPY[role];
  const genderOptions = GENDER_OPTIONS[languageCode];
  const goalOptions = stableShuffledOptions(
    optionOrderCache.current,
    `${optionOrderKey}-goal`,
    swahiliIntro ? SWAHILI_GOAL_OPTIONS[role] : GOAL_OPTIONS[role],
  );
  const goalConfirmTime =
    GOAL_CONFIRM_TIME_COPY[selectedGoalKey ?? '']?.[languageCode ?? 'en'] ??
    (studentSwahiliIntro ? 'dakika 15' : '15 min');
  const displayedConcernOptions = stableShuffledOptions(
    optionOrderCache.current,
    `${optionOrderKey}-concern`,
    swahiliIntro ? SWAHILI_CONCERN_OPTIONS[role] : CONCERN_OPTIONS[role],
  );
  const achievementOptions = stableShuffledOptions(
    optionOrderCache.current,
    `${optionOrderKey}-achievement`,
    swahiliIntro ? SWAHILI_ACHIEVEMENT_OPTIONS[role] : ACHIEVEMENT_OPTIONS[role],
  );
  const interestOptions = stableShuffledOptions(
    optionOrderCache.current,
    `${optionOrderKey}-interest`,
    INTEREST_OPTIONS,
  );
  // Dynamic "Good news" lines tying the teacher's chosen challenge and success goal to Kitabu AI.
  const teacherChallengeSolution =
    role === 'teacher' && selectedConcernKey
      ? (swahiliIntro
          ? TEACHER_CHALLENGE_SOLUTIONS[selectedConcernKey]?.sw
          : TEACHER_CHALLENGE_SOLUTIONS[selectedConcernKey]?.en) ?? null
      : null;
  const teacherSuccessSolution =
    role === 'teacher' && selectedAchievementKey
      ? (swahiliIntro
          ? TEACHER_SUCCESS_SOLUTIONS[selectedAchievementKey]?.sw
          : TEACHER_SUCCESS_SOLUTIONS[selectedAchievementKey]?.en) ?? null
      : null;
  const parentChallengeSolution =
    role === 'parent' && selectedConcernKey
      ? (swahiliIntro
          ? PARENT_CHALLENGE_SOLUTIONS[selectedConcernKey]?.sw
          : PARENT_CHALLENGE_SOLUTIONS[selectedConcernKey]?.en) ?? null
      : null;
  const parentSuccessSolution =
    role === 'parent' && selectedAchievementKey
      ? (swahiliIntro
          ? PARENT_SUCCESS_SOLUTIONS[selectedAchievementKey]?.sw
          : PARENT_SUCCESS_SOLUTIONS[selectedAchievementKey]?.en) ?? null
      : null;
  const mascotMotion = useRef(new Animated.Value(0)).current;
  const genderShakeMotion = useRef(new Animated.Value(0)).current;
  const learnerAgeShakeMotion = useRef(new Animated.Value(0)).current;
  const childAgeShakeMotion = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView | null>(null);
  const signupOtpRefs = useRef<Array<React.ElementRef<typeof TextInput> | null>>([]);
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alienErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voicePlayerRef = useRef<AudioPlayer | null>(null);
  const voicePreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voicePreviewSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const voicePreviewRequestIdRef = useRef(0);
  const voicePreviewSourceCacheRef = useRef<Record<string, AudioSource>>({});
  const voicePreviewBlobUrlsRef = useRef<string[]>([]);
  const onboardingSessionIdRef = useRef(`onboarding-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const onboardingCompletedRef = useRef(false);
  const activeProgressRef = useRef<{ key: string; title: string; progressIndex: number }>({
    key: 'setup-grade',
    title: 'Learner profile',
    progressIndex: 0,
  });
  const trackedViewRef = useRef<string | null>(null);
  const progressMetadata = getOnboardingStepMetadata({
    role,
    includeIntroChoices,
    introStep,
    setupStep: step,
    roleStepOneTitle: content.stepOneKicker,
  });
  const totalStepCount = progressMetadata.totalStepCount;
  const progressIndex = progressMetadata.progressIndex;
  const progressStepNumber = progressIndex + 1;
  const progressTitle = progressMetadata.title;
  const progressAnnouncement = `Step ${progressStepNumber} of ${totalStepCount}, ${progressTitle}`;
  activeProgressRef.current = progressMetadata;
  const reminderCoachTip =
    role === 'teacher' ? 'Class nudge' : role === 'parent' ? 'Family nudge' : 'Daily nudge';
  const mascotCoachTip =
    introStep === 'language'
      ? selectedLanguage.label
      : introStep === 'mascot'
        ? activeMascot.name
        : introStep === 'rafiki'
          ? 'Say hello'
          : introStep === 'role'
            ? ONBOARDING_CONTENT[role].eyebrow.replace(' setup', '')
            : introStep === 'voice'
            ? noVoice
              ? 'Text only'
              : selectedVoiceName ?? 'Choose voice'
            : introStep === 'microphone'
              ? 'Spoken answers'
            : introStep === 'need'
              ? 'Pick need'
              : introStep === 'name'
                ? 'Your name'
                : introStep === 'gender'
                  ? gender === 'female'
                    ? languageCode === 'sw'
                      ? 'Msichana'
                      : 'Girl'
                    : gender === 'male'
                      ? languageCode === 'sw'
                        ? 'Mvulana'
                        : 'Boy'
                      : languageCode === 'sw'
                        ? 'Mgeni'
                        : 'Skip'
                  : introStep === 'roleDetails'
                  ? role === 'teacher'
                    ? 'Your classes'
                    : role === 'parent'
                      ? 'Child profile'
                      : 'Your age'
                  : introStep === 'goal'
                    ? 'Your goal'
                    : introStep === 'goalConfirm'
                      ? studentSwahiliIntro
                        ? 'Lengo limewekwa'
                        : 'Goal set'
                    : introStep === 'concerns'
                      ? studentSwahiliIntro
                        ? 'Changamoto'
                        : 'Main concern'
                        : introStep === 'achieve'
                          ? 'What success means'
                          : introStep === 'painBefore'
                            ? studentSwahiliIntro
                              ? 'Bila Kitabu'
                              : 'Before Kitabu'
                            : introStep === 'painAfter'
                              ? studentSwahiliIntro
                                ? 'Na Kitabu'
                                : 'With Kitabu'
                              : introStep === 'socialProof'
                                ? studentSwahiliIntro
                                  ? 'Ni bidii'
                                  : 'Student results'
                                : introStep === 'resultProof'
                                  ? swahiliIntro
                                    ? 'Habari njema'
                                    : 'Social proof'
                              : introStep === 'country'
                                ? 'Kenya CBC'
                                : introStep === 'interests'
                                  ? `${selectedInterestKeys.length} selected`
                                  : introStep === 'reminder'
                                    ? reminderEnabled
                                      ? reminderCoachTip
                                      : 'No reminders'
                                    : introStep === 'loading'
                                      ? 'Building'
                                    : introStep === 'profileReady'
                                      ? 'Profile ready'
                                      : introStep === 'signup'
                                        ? 'Save account'
                  : content.coachTips[step];
  const activeGradeBand = grade ? gradeBandForGrade(grade) : null;
  const isTeacherSubjectFlow = role === 'teacher' && includeIntroChoices;
  const isParentSubjectFlow = role === 'parent' && includeIntroChoices;
  const primaryParentChild = {
    name: parentChildName.trim(),
    age: parentChildAge.trim(),
    grade: parentChildGrade,
  };
  const normalizedAdditionalParentChildren = additionalParentChildren.map(child => ({
    name: child.name.trim(),
    age: child.age.trim(),
    grade: child.grade,
  }));
  const parentChildDrafts = [
    primaryParentChild,
    ...normalizedAdditionalParentChildren,
  ];
  const parentAnswerChildName = parentChildName.trim() || (swahiliIntro ? 'mtoto wako' : 'your child');
  const currentParentSubjectChild =
    parentChildDrafts[parentSubjectChildIndex] ?? parentChildDrafts[0] ?? primaryParentChild;
  const currentParentSubjectChildKey = `child-${parentSubjectChildIndex}`;
  const currentParentSubjectIds = parentSubjectsByChild[currentParentSubjectChildKey] ?? [];
  const parentUnionSubjectIds = isParentSubjectFlow
    ? Array.from(new Set(parentChildDrafts.flatMap((_, childIndex) => parentSubjectsByChild[`child-${childIndex}`] ?? [])))
    : [];
  // The grade whose subjects the teacher is currently choosing (one screen per selected grade).
  const currentTeacherSubjectGrade =
    teacherGradeIds[teacherSubjectGradeIndex] ?? teacherGradeIds[0] ?? '';
  const currentTeacherGradeSubjectIds = teacherSubjectsByGrade[currentTeacherSubjectGrade] ?? [];
  // Union of every grade's chosen subjects, used for the submitted payload and summaries.
  const teacherUnionSubjectIds = isTeacherSubjectFlow
    ? Array.from(new Set(teacherGradeIds.flatMap(gradeValue => teacherSubjectsByGrade[gradeValue] ?? [])))
    : [];
  const subjectOptions = isTeacherSubjectFlow
    ? cbcSubjectOptionsForGrades(currentTeacherSubjectGrade ? [currentTeacherSubjectGrade] : teacherGradeIds)
    : isParentSubjectFlow && currentParentSubjectChild.grade
      ? cbcSubjectOptionsForGrades([currentParentSubjectChild.grade])
    : usesLearnerFlow && includeIntroChoices && grade
      ? cbcSubjectOptionsForGrades([grade])
      : SUBJECTS;
  // For naming/union we need the full set of subjects across all the teacher's grades.
  const teacherAllGradeSubjectOptions = isTeacherSubjectFlow
    ? cbcSubjectOptionsForGrades(teacherGradeIds)
    : subjectOptions;
  const effectiveSelectedSubjectIds = isTeacherSubjectFlow
    ? teacherUnionSubjectIds
    : isParentSubjectFlow
      ? parentUnionSubjectIds
      : selectedSubjectIds;
  const subjectGradeForCore = isParentSubjectFlow ? currentParentSubjectChild.grade : grade;
  const activeSubjectGradeBand = subjectGradeForCore ? gradeBandForGrade(subjectGradeForCore) : null;
  const learnerCoreSubjectNames = new Set(
    (usesLearnerFlow || isParentSubjectFlow) && includeIntroChoices && activeSubjectGradeBand
      ? CBC_CORE_SUBJECTS_BY_GRADE_BAND[activeSubjectGradeBand]
      : [],
  );
  const subjectSections =
    (usesLearnerFlow || isParentSubjectFlow) && includeIntroChoices
      ? [
          {
            key: 'core',
            label: swahiliIntro ? '\u2605 Masomo ya lazima' : '\u2605 Core subjects',
            core: true,
            options: subjectOptions.filter(subject => learnerCoreSubjectNames.has(subject.name)),
          },
          {
            key: 'elective',
            label: swahiliIntro ? 'Masomo ya kuchagua' : 'Elective / pathway subjects',
            core: false,
            options: subjectOptions.filter(subject => !learnerCoreSubjectNames.has(subject.name)),
          },
        ]
      : [
          {
            key: 'all',
            label: '',
            core: false,
            options: subjectOptions,
          },
        ];
  const selectedSubjectCount = isTeacherSubjectFlow
    ? currentTeacherGradeSubjectIds.length
    : isParentSubjectFlow
      ? currentParentSubjectIds.length
    : selectedSubjectIds.length;
  const submittedParentChildren = parentChildDrafts.map((child, childIndex) => ({
    ...child,
    subjects: parentSubjectsByChild[`child-${childIndex}`] ?? [],
  }));
  const allParentChildrenComplete =
    Boolean(
      isValidDisplayName(primaryParentChild.name) &&
      primaryParentChild.grade &&
      isValidLearnerAge(primaryParentChild.age),
    ) &&
    normalizedAdditionalParentChildren.every(
      child => isValidDisplayName(child.name) && child.grade && isValidLearnerAge(child.age),
    );
  const resolvedGender: GenderOption = gender ?? 'not_specified';
  const learnerAvatarKey = selectAvatarKey({
    role: 'student',
    grade,
    gender: resolvedGender,
  });
  const signupEmailTrimmed = signupEmail.trim();
  const signupPhoneTrimmed = signupPhone.trim();
  const signupPhoneDigits = signupPhoneTrimmed.replace(/\D/g, '');
  const normalizedSignupPhone = normalizeSignupPhoneNumber(signupPhone);
  const subjectNameById = new Map(teacherAllGradeSubjectOptions.map(subject => [subject.id, subject.name]));
  const selectedSubjectNames = effectiveSelectedSubjectIds
    .map(subjectId => subjectNameById.get(subjectId))
    .filter((subjectName): subjectName is string => Boolean(subjectName));
  const goodNewsSubjectLabels = (selectedSubjectNames.length > 0 ? selectedSubjectNames : ['Math', 'English', 'Science']).slice(0, 3);
  const learnerAge = Number(age.trim());
  const learnerAgeTier: 'upper' | 'junior' | 'senior' =
    Number.isFinite(learnerAge) && learnerAge > 0
      ? learnerAge <= 13
        ? 'upper'
        : learnerAge <= 16
          ? 'junior'
          : 'senior'
      : grade
        ? gradeBandForGrade(grade) === 'upper'
          ? 'upper'
          : gradeBandForGrade(grade) === 'junior'
            ? 'junior'
            : 'senior'
        : 'upper';
  const learnerAgeBand =
    Number.isFinite(learnerAge) && learnerAge > 0
      ? learnerAge <= 10
        ? 'young learner'
        : learnerAge <= 13
          ? 'upper primary learner'
          : learnerAge <= 16
            ? 'junior secondary learner'
            : 'senior learner'
      : grade || 'learner';
  const teacherGradesSummary =
    teacherGradeIds.length > 0
      ? teacherGradeIds.length === 1
        ? teacherGradeIds[0]
        : `${teacherGradeIds[0]} + ${teacherGradeIds.length - 1} more`
      : grade || 'your class';
  const parentChildrenSummary =
    submittedParentChildren.length > 1
      ? `${submittedParentChildren.length} children`
      : submittedParentChildren[0]?.name || parentChildName.trim() || 'your child';
  const parentChildrenVerb = submittedParentChildren.length > 1 ? 'are' : 'is';
  const goodNewsPlan: GoodNewsPlan = (() => {
    if (role === 'teacher') {
      return {
        badge: swahiliIntro ? 'Mpango wa kuinua darasa' : 'Class lift plan',
        badgeIcon: '\uD83D\uDE80',
        headlineAccent: '+2',
        headlineRest: swahiliIntro ? ' grades\nfor your class' : ' Grades\nAcross Your Class',
        body: swahiliIntro
          ? `Kitabu AI hupanga mazoezi ya ${teacherGradesSummary}, husahihisha kazi, na kukuonyesha mada zinazohitaji kurudiwa.`
          : `Turn ${teacherGradesSummary} practice into short CBC drills, instant marking, and clear next lessons.`,
        photo: teacherStudioStudyPhoto,
        photoLabel: 'Teacher helping a learner in a bright studio study scene',
        beforeLabel: swahiliIntro ? 'Sasa' : 'Before',
        beforeValue: 'C',
        afterLabel: swahiliIntro ? 'Lengo' : 'After',
        afterValue: 'B',
        midpoint: swahiliIntro ? '+2\ngrades' : '+2\ngrades',
        progressCaption: swahiliIntro
          ? 'Ukuaji wa kawaida darasa likifanya mazoezi mara kwa mara'
          : 'Typical class progress with consistent practice',
        supportLine: teacherChallengeSolution ?? teacherSuccessSolution ?? 'Class analytics, marking, and revision plans stay in one place.',
        subjectLabels: goodNewsSubjectLabels,
        benefits: [
          {
            key: 'weak',
            icon: '\u25CE',
            title: swahiliIntro ? 'Ona mapengo' : 'Find weak topics',
            body: swahiliIntro ? 'Jua mada za kurudia' : 'Know what to reteach',
            accent: '#22BFA3',
          },
          {
            key: 'marking',
            icon: '\u270E',
            title: swahiliIntro ? 'Sahihisha haraka' : 'Auto-mark work',
            body: swahiliIntro ? 'Matokeo ya papo hapo' : 'Instant class reports',
            accent: '#1579F6',
          },
          {
            key: 'lesson',
            icon: '\u2606',
            title: swahiliIntro ? 'Panga somo' : 'Plan next lesson',
            body: swahiliIntro ? 'Hatua inayofuata iko wazi' : 'Clear next step',
            accent: '#F5B63D',
          },
        ],
      };
    }

    if (role === 'parent') {
      const firstChildGrade = submittedParentChildren[0]?.grade || parentChildGrade || 'their grade';
      return {
        badge: swahiliIntro ? 'Mpango wa familia' : 'Family progress plan',
        badgeIcon: '\uD83D\uDCCA',
        headlineAccent: '+2',
        headlineRest: swahiliIntro ? ' grades\nwith clear reports' : ' Points\nWith Clear Reports',
        body: swahiliIntro
          ? `Fuata maendeleo ya ${parentChildrenSummary} katika ${firstChildGrade} bila kusubiri report form.`
          : `See how ${parentChildrenSummary} ${parentChildrenVerb} doing in ${firstChildGrade}, before end-term surprises arrive.`,
        photo: parentProgressPhoto,
        photoLabel: 'Parent and learner reviewing a progress report',
        beforeLabel: swahiliIntro ? 'Kabali' : 'Before',
        beforeValue: '?',
        afterLabel: swahiliIntro ? 'Baada' : 'After',
        afterValue: 'B',
        midpoint: swahiliIntro ? 'clear\nreports' : 'clear\nreports',
        progressCaption: swahiliIntro
          ? 'Ripoti za wiki huonyesha nguvu, mapengo, na msaada unaofuata'
          : 'Weekly reports show strengths, gaps, and what to support next',
        supportLine: parentChallengeSolution ?? parentSuccessSolution ?? 'You get progress reports, weak-area alerts, and homework support prompts.',
        subjectLabels: goodNewsSubjectLabels,
        benefits: [
          {
            key: 'reports',
            icon: '\uD83D\uDCCA',
            title: swahiliIntro ? 'Ripoti wazi' : 'Progress reports',
            body: swahiliIntro ? 'Ona kinachoendelea' : 'Know what changed',
            accent: '#22BFA3',
          },
          {
            key: 'gaps',
            icon: '\u25CE',
            title: swahiliIntro ? 'Mapengo' : 'Learning gaps',
            body: swahiliIntro ? 'Msaada wa mapema' : 'Catch issues early',
            accent: '#1579F6',
          },
          {
            key: 'homework',
            icon: '\u270E',
            title: swahiliIntro ? 'Homework' : 'Homework help',
            body: swahiliIntro ? 'Jua cha kusaidia' : 'Support at home',
            accent: '#F5B63D',
          },
        ],
      };
    }

    const studentPhoto =
      resolvedGender === 'male'
        ? learnerAgeTier === 'upper'
          ? studentBoyUpperPhoto
          : studentBoyJuniorPhoto
        : learnerAgeTier === 'upper'
          ? studentGirlUpperPhoto
          : studentGirlJuniorPhoto;
    const studentAgePhotoLabel = learnerAgeTier === 'upper' ? 'upper-primary' : 'junior-secondary';
    return {
      badge: swahiliIntro ? 'Mpango wa kuongeza alama' : 'Grade boost plan',
      badgeIcon: '\uD83D\uDE80',
      headlineAccent: '+2',
      headlineRest: swahiliIntro ? ' points muhula huu' : ' Points in One Term',
      body: swahiliIntro
        ? `Rafiki anaweka mazoezi ya ${learnerAgeBand} katika ${goodNewsSubjectLabels.join(', ')} ili ujue pa kuboresha.`
        : `Find your weak spots in ${goodNewsSubjectLabels.join(', ')}, get simple explanations, and practise 20-30 mins daily.`,
      photo: studentPhoto,
      photoLabel:
        resolvedGender === 'male'
          ? `${studentAgePhotoLabel} boy student studying in a bright studio scene`
          : `${studentAgePhotoLabel} girl student studying in a bright studio scene`,
      beforeLabel: swahiliIntro ? 'Sasa' : 'Before',
      beforeValue: 'C',
      afterLabel: swahiliIntro ? 'Baada' : 'After',
      afterValue: 'B',
      midpoint: swahiliIntro ? '+2\npoints' : '+2\npoints',
      progressCaption: swahiliIntro
        ? 'Maendeleo ya kawaida ukifanya mazoezi kila siku'
        : 'Typical progress with consistent practice',
      supportLine: selectedAchievementKey
        ? (swahiliIntro ? 'Lengo lako limegeuzwa kuwa mpango wa kila siku.' : 'Your goal is now a daily improvement plan.')
        : 'Your study plan adapts to your grade, subjects, and practice rhythm.',
      subjectLabels: goodNewsSubjectLabels,
      benefits: [
        {
          key: 'weak',
          icon: '\u25CE',
          title: swahiliIntro ? 'Rekebisha mada dhaifu' : 'Fix weak topics',
          body: swahiliIntro ? 'Jua cha kurudia' : 'Know exactly what to revise',
          accent: '#22BFA3',
        },
        {
          key: 'exam',
          icon: '\u2606',
          title: swahiliIntro ? 'Mazoezi ya CBC' : 'CBC exam practice',
          body: swahiliIntro ? 'Maswali ya darasani' : 'Questions aligned to classwork',
          accent: '#1579F6',
        },
        {
          key: 'hints',
          icon: '\u2600',
          title: swahiliIntro ? 'Vidokezo smart' : 'Smart hints',
          body: swahiliIntro ? 'Elewa unapokwama' : "Explains why you're stuck",
          accent: '#F5B63D',
        },
      ],
    };
  })();
  const isSignupEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmailTrimmed);
  const isSignupPhoneValid =
    /^(?:\+?254|0)?7\d{8}$/.test(signupPhoneDigits) ||
    /^\+?[\d\s-]{9,14}$/.test(signupPhoneTrimmed);
  const signupPasswordStrength =
    signupPassword.length >= 10 ? 3 : signupPassword.length >= 8 ? 2 : signupPassword.length > 0 ? 1 : 0;
  const signupPasswordsMatch =
    signupPasswordConfirm.length > 0 && signupPassword === signupPasswordConfirm;
  const canSubmitSignupEmail =
    isSignupEmailValid && signupPassword.length >= 8 && signupPasswordsMatch;
  const canSubmitSignupPhone =
    isSignupPhoneValid && signupPassword.length >= 8 && signupPasswordsMatch;
  const signupOtpValue = signupOtp.join('');
  const canVerifySignupOtp = signupOtpValue.length === 6;
  const usesInlineSignupFlow = introStep === 'signup' && collectSignupCredentials;
  const usesBrandLanguageStep = introStep === 'language';
  const usesPreMascotPickerStep = introStep === 'mascot';
  const usesRafikiRevealStep = introStep === 'rafiki';
  const usesFullscreenCommitmentStep = introStep === 'profileReady' || introStep === 'signup';
  const usesCompactIntroNav = usesPreMascotPickerStep || usesRafikiRevealStep;
  const usesMascotNavBar =
    includeIntroChoices && !usesBrandLanguageStep && !usesCompactIntroNav && !usesFullscreenCommitmentStep;
  const usesAutoAdvanceChoice =
    includeIntroChoices &&
    (introStep === 'language' ||
      introStep === 'mascot' ||
      introStep === 'role' ||
      introStep === 'need' ||
      introStep === 'goal' ||
      introStep === 'concerns' ||
      introStep === 'achieve');
  const genderShakeOffset = genderShakeMotion.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [0, -8, 8, -5, 0],
  });
  const subjectPreferenceLabel =
    role === 'teacher'
      ? 'Subjects you teach'
      : role === 'parent'
        ? `Subjects for ${currentParentSubjectChild.name || 'your child'}`
        : usesLearnerFlow
          ? 'Subjects you study'
          : null;
  const subjectPreferenceText =
    role === 'teacher'
      ? 'Select all that apply.'
      : role === 'parent'
        ? 'Pick the subjects you want progress reports and support prompts for.'
      : usesLearnerFlow
        ? 'Pick up to five CBC subjects you want on your dashboard first.'
        : null;
  const profileOwnerName = displayName.trim() || (role === 'teacher' ? 'your class' : role === 'parent' ? 'your family' : 'your');
  const rolePlanLabel =
    role === 'teacher' ? 'first class plan' : role === 'parent' ? 'first family support plan' : 'first learning plan';
  const loadingHeaderTitle =
    swahiliIntro
      ? 'Tunaunda uzoefu wako binafsi...'
      : role === 'teacher'
      ? `Building ${profileOwnerName} class workspace`
      : role === 'parent'
        ? `Building ${profileOwnerName} family dashboard`
        : `Building ${profileOwnerName} Kitabu profile`;
  const readyHeaderTitle =
    swahiliIntro
      ? `${profileOwnerName[0]?.toUpperCase() ?? 'Y'}${profileOwnerName.slice(1)}, Profaili yako ya masomo iko tayari!`
      : role === 'teacher'
      ? `${profileOwnerName[0]?.toUpperCase() ?? 'Y'}${profileOwnerName.slice(1)} class workspace is ready`
      : role === 'parent'
        ? `${profileOwnerName[0]?.toUpperCase() ?? 'Y'}${profileOwnerName.slice(1)} family dashboard is ready`
        : `${profileOwnerName[0]?.toUpperCase() ?? 'Y'}${profileOwnerName.slice(1)} profile is ready`;
  const reminderQuestion =
    swahiliIntro
      ? 'Tutakukumbusha ustudy.'
      : role === 'teacher'
      ? 'Want a class planning reminder?'
      : role === 'parent'
        ? 'Want a family progress reminder?'
        : 'We\'ll remind you to study.';
  const loadingChecklist =
    swahiliIntro
      ? ['Mascot imechaguliwa', 'Malengo yamehifadhiwa', 'Mtaala wa CBC uko tayari', 'Vikumbusho vimeandaliwa']
      : role === 'teacher'
      ? ['Mascot selected', 'Teaching goal saved', 'Class roster ready', 'Subjects prepared']
      : role === 'parent'
        ? ['Mascot selected', 'Family goal saved', 'Child profile ready', 'Progress view prepared']
        : ['Mascot selected', 'Goal saved', 'CBC path ready', 'Subjects prepared'];
  const loadingStatusLabels = swahiliIntro
    ? [
        'Inachambua mada za CBC...',
        'Inachagua mbinu bora za kustudy...',
        'Inaandaa maswali ya KNEC...',
        'Inaweka mpango wako...',
        'Iko tayari! \uD83C\uDF89',
      ]
    : [
        'Analysing CBC topics...',
        'Selecting optimal study methods...',
        'Preparing KNEC questions...',
        'Building your plan...',
        'All done! \uD83C\uDF89',
      ];
  const loadingProgressNow = Math.min(100, Math.max(0, loadingProgress));
  const loadingStatusLabel = loadingStatusLabels[Math.min(Math.floor(loadingProgressNow / 25), loadingStatusLabels.length - 1)];
  const primaryProfileGrade =
    includeIntroChoices && role === 'teacher'
      ? teacherGradeIds[0] ?? grade
      : includeIntroChoices && role === 'parent'
        ? parentChildGrade
        : grade;
  // Compact dashboard summary chip for the Profile Ready hero \u2014 short, dot-separated
  // facts instead of a long sentence so the header stays balanced and avoids overflow.
  const readyCountryName = COUNTRY_OPTIONS.find(option => option.code === countryCode)?.name ?? 'Kenya';
  const parentReadyPlanText = submittedParentChildren.length > 1
    ? swahiliIntro
      ? 'Mipango ya masomo ya watoto wako iko tayari.'
      : `Study plans for your ${submittedParentChildren.length} children are ready to go.`
    : swahiliIntro
      ? `Mpango wa masomo wa ${submittedParentChildren[0]?.name || 'mtoto wako'} uko tayari.`
      : `${submittedParentChildren[0]?.name || 'Your child'}'s study plan is ready to go.`;
  const readySummary = swahiliIntro
    ? role === 'teacher'
      ? `${primaryProfileGrade} \u00B7 ${selectedSubjectCount} masomo \u00B7 ${readyCountryName} CBC`
      : role === 'parent'
        ? submittedParentChildren.length > 1
          ? `${submittedParentChildren.length} watoto \u00B7 ${readyCountryName} CBC`
          : `${primaryProfileGrade} \u00B7 ${readyCountryName} CBC`
        : `${primaryProfileGrade} \u00B7 ${selectedSubjectCount} masomo \u00B7 ${readyCountryName} CBC`
    : role === 'teacher'
      ? `${primaryProfileGrade} \u00B7 ${selectedSubjectCount} subjects \u00B7 ${readyCountryName} CBC`
      : role === 'parent'
        ? submittedParentChildren.length > 1
          ? `${submittedParentChildren.length} children \u00B7 ${readyCountryName} CBC`
          : `${primaryProfileGrade} \u00B7 ${readyCountryName} CBC`
        : `${primaryProfileGrade} \u00B7 ${selectedSubjectCount} subjects \u00B7 ${readyCountryName} CBC`;
  const readyTestimonials = role === 'teacher'
    ? swahiliIntro
      ? [
          { quote: '"Kusahihisha sasa ni dakika, si masaa."', name: 'Mwalimu Achieng', meta: 'Mwalimu, Kisumu' },
          { quote: '"Naona mara moja ni nani anahitaji msaada."', name: 'Mwalimu Otieno', meta: 'Mwalimu, Nairobi' },
          { quote: '"Wastani wa darasa langu ulipanda muhula mmoja."', name: 'Mwalimu Wambui', meta: 'Mwalimu, Nakuru' },
          { quote: '"Kupanga masomo sasa kumekuwa rahisi sana."', name: 'Mwalimu Kiptoo', meta: 'Mwalimu, Eldoret' },
        ]
      : [
          { quote: '"Grading now takes minutes, not hours."', name: 'Ms. Achieng', meta: 'Teacher, Kisumu' },
          { quote: '"I can see at a glance who needs help."', name: 'Mr. Otieno', meta: 'Teacher, Nairobi' },
          { quote: '"My class average went up in a single term."', name: 'Ms. Wambui', meta: 'Teacher, Nakuru' },
          { quote: '"Lesson planning is finally manageable."', name: 'Mr. Kiptoo', meta: 'Teacher, Eldoret' },
        ]
    : swahiliIntro
      ? [
          { quote: '"Kitabu ilinisaidia kupanda daraja moja kwa term."', name: 'Wanjiru', meta: 'Grade 8' },
          { quote: '"Maswali ya KNEC sasa ni rahisi kufuata."', name: 'Brian', meta: 'Grade 10' },
          { quote: '"Ninaelewa vizuri jinsi ya kumsaidia mtoto wangu."', name: 'Grace', meta: 'Parent' },
          { quote: '"Rafiki hunikumbusha kusoma bila pressure."', name: 'Kevin', meta: 'Grade 9' },
        ]
      : [
          { quote: '"Kitabu helped me move up a grade in one term."', name: 'Wanjiru', meta: 'Grade 8' },
          { quote: '"The KNEC-style questions are easier to follow now."', name: 'Brian', meta: 'Grade 10' },
          { quote: '"I finally understand how to support learning at home."', name: 'Grace', meta: 'Parent' },
          { quote: '"Rafiki keeps me consistent without pressure."', name: 'Kevin', meta: 'Grade 9' },
        ];
  const mascotPose: MascotPose = (() => {
    if (!includeIntroChoices) {
      if (introStep === 'setup') {
        // countySchool(step 2)=wave, grade(step 0)=cheer, subjects(step 1)=cool.
        return step === 2 ? 'wave' : step === 0 ? 'cheer' : 'cool';
      }

      return introStep === 'profileReady' ? 'celebrate' : 'wave';
    }

    if (introStep === 'language' || introStep === 'mascot' || introStep === 'rafiki' || introStep === 'role') {
      return 'wave';
    }

    if (introStep === 'voice' || introStep === 'signup') {
      return 'cool';
    }

    if (introStep === 'microphone') {
      return 'cool';
    }

    if (introStep === 'need' || introStep === 'concerns') {
      return 'think';
    }

    if (introStep === 'name' || introStep === 'gender' || introStep === 'interests') {
      return 'happy';
    }

    if (introStep === 'roleDetails') {
      return role === 'teacher' ? 'cheer' : role === 'parent' ? 'happy' : 'think';
    }

    if (introStep === 'setup') {
      if (studentFullIntro && step === 1) {
        return 'cool';
      }

      if (step === 1 || (studentFullIntro && step === 2)) {
        return 'wave';
      }

      if (role === 'teacher') {
        return 'cool';
      }

      return selectedSubjectCount > 0 ? 'cool' : 'cheer';
    }

    if (introStep === 'painBefore') {
      return 'worried';
    }

    if (
      introStep === 'painAfter' ||
      introStep === 'goal' ||
      introStep === 'goalConfirm' ||
      introStep === 'socialProof' ||
      introStep === 'resultProof' ||
      introStep === 'achieve' ||
      introStep === 'loading'
    ) {
      return introStep === 'loading' ? 'cool' : 'cheer';
    }

    if (introStep === 'country') {
      return 'wave';
    }

    if (introStep === 'reminder') {
      return 'sleep';
    }

    if (introStep === 'profileReady') {
      return 'celebrate';
    }

    return 'wave';
  })();
  const mascotPoseAccessibilityLabel = `${activeMascot.label}, ${mascotPose} pose`;
  const announcedStepRef = useRef(progressStepNumber);
  const headerTitle =
    introStep === 'language'
      ? 'Choose your language'
      : introStep === 'mascot'
        ? 'Choose your learning buddy'
        : introStep === 'rafiki'
          ? `Meet ${activeMascot.name}`
          : introStep === 'role'
            ? 'Who are you?'
            : introStep === 'voice'
              ? 'How should your tutor sound?'
            : introStep === 'microphone'
              ? swahiliIntro
                ? 'Ruhusu matumizi ya maikrofoni'
                : 'Allow Microphone Access'
            : introStep === 'need'
              ? needStepCopy.heading
              : introStep === 'name'
                ? 'What is your name?'
                : introStep === 'gender'
                  ? languageCode === 'sw'
                    ? 'Wewe ni wa jinsia gani?'
                    : 'What is your gender?'
                  : introStep === 'roleDetails'
                  ? role === 'teacher'
                    ? 'Which grades do you teach?'
                    : role === 'parent'
                      ? 'Tell me about your student'
                      : ageStepCopy.heading(displayName.trim())
                  : introStep === 'goal'
                    ? role === 'teacher'
                      ? 'What is your teaching goal?'
                      : role === 'parent'
                        ? `How is ${parentAnswerChildName} performing right now?`
                        : 'What is your learning goal?'
                    : introStep === 'goalConfirm'
                      ? studentSwahiliIntro
                        ? 'Hilo ni lengo zuri.'
                        : 'That is a strong goal.'
                    : introStep === 'concerns'
                      ? role === 'teacher'
                        ? 'What is your biggest classroom challenge?'
                        : role === 'parent'
                          ? 'What matters most to you right now?'
                          : studentSwahiliIntro
                            ? 'Changamoto yako kubwa zaidi shuleni ni nini?'
                            : 'What is your biggest study challenge?'
                      : introStep === 'achieve'
                        ? role === 'teacher'
                          ? 'What do you want to achieve?'
                          : role === 'parent'
                            ? `Does ${parentAnswerChildName} have their own phone?`
                            : 'What do you want to achieve?'
                        : introStep === 'painBefore'
                          ? role === 'teacher'
                            ? 'Teaching should not feel like admin all day.'
                            : role === 'parent'
                              ? 'Supporting school work should not feel like guessing.'
                              : studentSwahiliIntro
                                ? 'Usiku kabla ya mtihani wa KNEC...'
                                : 'Studying alone can feel overwhelming.'
                          : introStep === 'painAfter'
                            ? role === 'teacher'
                              ? 'Kitabu helps you see what to teach next.'
                              : role === 'parent'
                                ? 'Kitabu makes progress easier to understand.'
                                : studentSwahiliIntro
                                  ? 'Usiku kabla ya mtihani wako...'
                                  : 'Kitabu turns study time into clear next steps.'
                            : introStep === 'socialProof'
                              ? studentSwahiliIntro
                                ? 'Ni bidii ya kweli!'
                                : 'Learners improve faster with guided practice.'
                              : introStep === 'resultProof'
                                ? swahiliIntro
                                  ? role === 'parent'
                                    ? 'Utaona maendeleo ya mtoto wako.'
                                    : 'Alama zako ziko karibu kupanda.'
                                  : role === 'parent'
                                    ? 'You will see your child\'s progress clearly.'
                                    : 'Your grades are about to go up.'
                              : introStep === 'country'
                                ? swahiliIntro
                                  ? role === 'teacher'
                                    ? 'Unafundisha katika nchi hii?'
                                    : role === 'parent'
                                      ? 'Familia yako iko katika nchi hii?'
                                    : 'Unasomea katika nchi hii?'
                                  : role === 'teacher'
                                    ? 'Are you teaching in this country?'
                                    : role === 'parent'
                                      ? 'Is your family in this country?'
                                    : 'Are you studying in this country?'
                                : introStep === 'interests'
                                  ? swahiliIntro
                                    ? 'Mambo unayopenda?'
                                    : 'What are your interests?'
                                  : introStep === 'reminder'
                                    ? reminderQuestion
                                    : introStep === 'loading'
                                      ? loadingHeaderTitle
                                      : introStep === 'profileReady'
                                        ? readyHeaderTitle
                                        : introStep === 'signup'
                                          ? swahiliIntro
                                            ? 'Hifadhi akaunti yako'
                                            : 'Save your account'
                  : content.title;
  const onboardingVoiceName = noVoice ? undefined : selectedVoiceName ?? 'Samora';
  const landingCueId =
    includeIntroChoices && role === 'student'
      ? getStudentEnglishOnboardingLandingCueId(introStep, step, languageCode)
      : undefined;
  const narrationCue = buildPrimaryInstruction(
    'student-onboarding',
    `${introStep}-${step}`,
    headerTitle,
    onboardingVoiceName,
    landingCueId ? { language: 'en', publicCueId: landingCueId } : undefined,
  );
  useGuidedNarration(
    narrationCue,
    Boolean(headerTitle),
    narrationTrigger,
  );
  const headerBody =
    introStep === 'language'
      ? 'Start with the language that feels most natural. You can still learn across Kiswahili and English content.'
      : introStep === 'mascot'
        ? 'Pick the mascot you want beside you during setup. This matches the reference onboarding flow and keeps the app friendly.'
        : introStep === 'rafiki'
        ? `I am ${activeMascot.name}. I am here to make learning feel lighter and help you keep moving.`
        : introStep === 'role'
          ? 'Your account role is set from signup so Kitabu can keep dashboards, permissions, and setup aligned.'
        : introStep === 'voice'
          ? 'Choose a tutor voice, or switch Kitabu to text-only guidance.'
        : introStep === 'microphone'
          ? swahiliIntro
            ? 'Ruhusa ya maikrofoni inawezesha majibu ya kuzungumza na mafunzo ya moja kwa moja. Unaweza kuendelea hata ukikataa.'
            : 'Microphone access enables spoken answers and live tutoring. You can continue even if you deny access.'
            : introStep === 'need'
              ? 'Choose the priority Kitabu should shape first. This mirrors the reference flow before collecting profile details.'
              : introStep === 'name'
                ? role === 'teacher'
                  ? 'Your students and Rafiki will know you by name.'
                  : role === 'parent'
                    ? 'Rafiki will personalize the experience for your family.'
                    : 'Your Kitabu AI tutor will know you by name.'
                : introStep === 'gender'
                  ? languageCode === 'sw'
                    ? 'Chagua kinachokufaa zaidi. Unaweza kuendelea bila kuweka jinsia.'
                    : 'Choose the option that fits best, or skip this step.'
                  : introStep === 'roleDetails'
                  ? role === 'teacher'
                    ? 'Select the classes you teach most. You can change this later.'
                    : role === 'parent'
                      ? 'Add each child and their grade. Next we will choose subjects for each one.'
                      : 'We tailor content to your age group.'
                  : introStep === 'goal'
                    ? 'Choose the outcome Kitabu should optimise first.'
                  : introStep === 'goalConfirm'
                    ? studentSwahiliIntro
                      ? 'Tutatumia lengo hili kuunda mpango wako wa kwanza.'
                      : 'Rafiki will use this goal to shape your first study plan.'
                  : introStep === 'concerns'
                    ? studentSwahiliIntro
                      ? 'Chagua jambo linalokuzuia zaidi sasa.'
                      : 'This helps Rafiki shape the first plan around the real blocker.'
                      : introStep === 'achieve'
                        ? 'Pick the result that would make Kitabu feel useful from day one.'
                        : introStep === 'painBefore'
                          ? studentSwahiliIntro
                            ? 'BILA KITABU AI'
                            : 'These are the problems Kitabu is designed to remove from the first week.'
                          : introStep === 'painAfter'
                            ? studentSwahiliIntro
                              ? 'NA KITABU AI'
                              : 'Your setup becomes a practical plan instead of another form to fill.'
                            : introStep === 'socialProof'
                              ? studentSwahiliIntro
                                ? 'Dakika 15 kwa siku, uko mbele ya wanafunzi wengi.'
                                : 'The reference flow builds trust here before asking for the final setup details.'
                              : introStep === 'resultProof'
                                ? swahiliIntro
                                  ? role === 'parent'
                                    ? 'Ripoti za maendeleo hukusaidia kuona alama, tabia, na maeneo dhaifu kabla ya mwisho wa muhula.'
                                    : '89% ya wanafunzi wanasema wanafanya zaidi kwa muda mfupi zaidi na Kitabu AI.'
                                  : role === 'parent'
                                    ? 'Progress reports help you see marks, habits, and weak areas before end-term surprises.'
                                    : '89% of students say they get more done in less time with Kitabu AI.'
                              : introStep === 'country'
                                ? 'Kitabu is tuned for Kenyan schools and CBC-aligned subjects.'
                            : introStep === 'interests'
                              ? swahiliIntro
                                ? 'Tutafanya maudhui ya masomo kulingana na unayopenda.'
                                : "We'll create study content you'll actually enjoy."
                                  : introStep === 'reminder'
                                    ? role === 'teacher'
                                      ? 'A short reminder helps you keep class planning and follow-up consistent. You can change this later.'
                                      : role === 'parent'
                                        ? 'A short reminder helps you check progress and support homework at home. You can change this later.'
                                        : 'A short reminder helps build consistency. You can change this later.'
                                    : introStep === 'loading'
                                      ? `Rafiki is turning your choices into a ${rolePlanLabel}.`
                                      : introStep === 'profileReady'
                                        ? swahiliIntro
                                          ? 'Unajiunga na wanafunzi wengi walioridhika.'
                                          : role === 'teacher'
                                          ? 'Your mascot, goals, curriculum, classes, and teaching shortcuts are ready to open.'
                                          : role === 'parent'
                                            ? 'Your mascot, goals, curriculum, child profile, and family progress view are ready to open.'
                                            : 'Your mascot, goals, curriculum, subjects, and study rhythm are ready to open.'
                                        : introStep === 'signup'
                                          ? swahiliIntro
                                            ? 'Jiandikishe kuendelea na mpango wako wa masomo.'
                                            : 'Sign up to continue with your study plan.'
                  : content.body;
  const selectedCountry =
    COUNTRY_OPTIONS.find(option => option.code === countryCode) ?? COUNTRY_OPTIONS[0];
  const selectedSchool = useMemo(
    () => schools.find(school => school.id === schoolId) ?? null,
    [schoolId, schools],
  );
  const selectedSchoolName = selectedSchool?.name ?? manualSchoolName;
  const hasSelectedSchool = Boolean(selectedSchoolName);
  const regionMeta = REGIONS_BY_COUNTRY[countryCode] ?? REGIONS_BY_COUNTRY.KE;
  const regionLabel = swahiliIntro ? regionMeta.labelSw : regionMeta.label;
  const countyOptions = useMemo(
    () => {
      // The registered school directory is Kenya-based, so only Kenya appends
      // school-derived locations that are missing from the official county list.
      if (countryCode !== 'KE') {
        return [...regionMeta.options];
      }

      const extraCountyOptions = Array.from(
        new Set(
          schools
            .map(school => school.location.trim())
            .filter(
              location =>
                location &&
                !KENYAN_COUNTIES.some(countyOption => countyMatchesLocation(countyOption, location)),
            ),
        ),
      ).sort();

      return prioritizeCountiesBySchoolCount([...KENYAN_COUNTIES, ...extraCountyOptions], schools);
    },
    [schools, countryCode, regionMeta],
  );
  const hasMpesaInput = externalPaymentsEnabled && Boolean(mpesaPhoneNumber.trim());
  const hasValidMpesaShortcut = useMemo(() => {
    if (!hasMpesaInput) {
      return false;
    }

    try {
      return Boolean(normalizeOptionalMpesaPhoneNumber(mpesaPhoneNumber));
    } catch {
      return false;
    }
  }, [hasMpesaInput, mpesaPhoneNumber]);
  const paymentSummaryValue = !externalPaymentsEnabled
    ? 'Managed'
    : hasValidMpesaShortcut
    ? 'M-Pesa ready'
    : hasMpesaInput
      ? 'Check number'
      : 'Optional';
  const reviewPaymentStatus = !externalPaymentsEnabled
    ? 'Managed account'
    : hasValidMpesaShortcut
    ? 'M-Pesa ready'
    : hasMpesaInput
      ? 'Check number'
      : 'Skip for now';
  const setupSummaryItems = useMemo(
    () => [
      {
        label: content.gradeStatusPrefix,
        value: grade,
        complete: Boolean(grade),
      },
      {
        label: content.schoolStatusPrefix,
        value: selectedSchoolName || 'Choose school',
        complete: hasSelectedSchool,
      },
      ...(externalPaymentsEnabled
        ? [
            {
              label: content.paymentStatusPrefix,
              value: paymentSummaryValue,
              complete: step === 2 && hasValidMpesaShortcut,
            },
          ]
        : []),
    ],
    [
      content.gradeStatusPrefix,
      content.paymentStatusPrefix,
      content.schoolStatusPrefix,
      externalPaymentsEnabled,
      grade,
      hasValidMpesaShortcut,
      paymentSummaryValue,
      selectedSchoolName,
      hasSelectedSchool,
      step,
    ],
  );
  const setupSummaryAnnouncement = setupSummaryItems
    .map(item => `${item.label}: ${item.value}`)
    .join('. ');
  const reviewSchoolName = selectedSchoolName || 'School selected';
  const finalReviewAnnouncement = `${content.reviewTitle}. ${content.reviewGradeLabel}: ${grade}. School: ${reviewSchoolName}. Payment: ${reviewPaymentStatus}.`;
  const scrollInsetsStyle = useMemo(
    () => ({
      paddingBottom: Math.max(compactLayout ? 12 : 18, insets.bottom + 14),
      paddingTop: Math.max(compactLayout ? 18 : 22, insets.top + 12),
    }),
    [compactLayout, insets.bottom, insets.top],
  );
  const mascotMotionStyle = useMemo(
    () => {
      const poseTransforms: ViewStyle['transform'] =
        mascotPose === 'worried'
          ? [{ rotate: '-4deg' }]
          : mascotPose === 'cool'
            ? [{ rotate: '2deg' }]
            : mascotPose === 'cheer' || mascotPose === 'celebrate'
              ? [{ scale: 1.04 }]
              : mascotPose === 'sleep'
                ? [{ translateY: 2 }, { scale: 0.98 }]
                : mascotPose === 'think'
                  ? [{ rotate: '-1deg' }]
                  : [];

      if (reduceMotionEnabled) {
        return { transform: poseTransforms } as ViewStyle;
      }

      return ({
        transform: [
          {
            translateY: mascotMotion.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -5],
            }),
          },
          {
            scale: mascotMotion.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.025],
            }),
          },
          ...(poseTransforms ?? []),
        ],
      }) as unknown as ViewStyle;
    },
    [mascotMotion, mascotPose, reduceMotionEnabled],
  );

  useEffect(() => {
    let mounted = true;
    let idleAnimation: Animated.CompositeAnimation | null = null;
    const useNativeMascotDriver = Platform.OS !== 'web';

    mascotMotion.setValue(0);
    if (process.env.NODE_ENV === 'test') {
      return undefined;
    }

    AccessibilityInfo.isReduceMotionEnabled()
      .then(isReduceMotionEnabled => {
        if (mounted) {
          setReduceMotionEnabled(isReduceMotionEnabled);
        }
        if (!mounted || isReduceMotionEnabled) {
          return;
        }

        idleAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(mascotMotion, {
              duration: 1200,
              easing: Easing.inOut(Easing.quad),
              toValue: 1,
              useNativeDriver: useNativeMascotDriver,
            }),
            Animated.timing(mascotMotion, {
              duration: 1200,
              easing: Easing.inOut(Easing.quad),
              toValue: 0,
              useNativeDriver: useNativeMascotDriver,
            }),
          ]),
        );
        idleAnimation.start();
      })
      .catch(() => {
        mascotMotion.setValue(0);
      });

    return () => {
      mounted = false;
      idleAnimation?.stop();
    };
  }, [mascotMotion, role]);

  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: !reduceMotionEnabled });

    if (announcedStepRef.current !== progressStepNumber) {
      AccessibilityInfo.announceForAccessibility?.(progressAnnouncement);
      announcedStepRef.current = progressStepNumber;
    }
  }, [introStep, progressAnnouncement, progressStepNumber, reduceMotionEnabled, step]);

  useEffect(() => {
    if (!includeIntroChoices) {
      return;
    }

    const viewKey = `${progressMetadata.key}:${progressMetadata.progressIndex}:${step}`;
    if (trackedViewRef.current === viewKey) {
      return;
    }

    trackedViewRef.current = viewKey;
    trackOnboardingEvent('view', progressMetadata.key, progressMetadata.title);
    // The tracker intentionally reads the current screen context from this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeIntroChoices, progressMetadata.key, progressMetadata.progressIndex, progressMetadata.title, step]);

  useEffect(
    () => () => {
      if (!includeIntroChoices || onboardingCompletedRef.current) {
        return;
      }

      const progress = activeProgressRef.current;
      trackOnboardingEvent('drop_off', progress.key, progress.title);
    },
    // The tracker intentionally reads the current screen context from refs at unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [includeIntroChoices],
  );

  useEffect(() => {
    if (!includeIntroChoices) {
      setIntroStep('setup');
    }
  }, [includeIntroChoices]);

  useEffect(() => {
    if (introStep !== 'loading') {
      return undefined;
    }

    let doneTimer: ReturnType<typeof setTimeout> | null = null;
    setLoadingProgress(0);

    if (reduceMotionEnabled) {
      setLoadingProgress(100);
      doneTimer = setTimeout(() => {
        setIntroStep('profileReady');
      }, 0);
      return () => {
        if (doneTimer) {
          clearTimeout(doneTimer);
        }
      };
    }

    const progressTimer = setInterval(() => {
      setLoadingProgress(current => {
        const nextProgress = Math.min(100, current + LOADING_PROGRESS_INCREMENT);
        if (nextProgress >= 100) {
          clearInterval(progressTimer);
          doneTimer = setTimeout(() => {
            setIntroStep('profileReady');
          }, LOADING_DONE_DELAY_MS);
        }
        return nextProgress;
      });
    }, LOADING_PROGRESS_INTERVAL_MS);

    return () => {
      clearInterval(progressTimer);
      if (doneTimer) {
        clearTimeout(doneTimer);
      }
    };
  }, [introStep, reduceMotionEnabled]);

  useEffect(
    () => () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
      if (alienErrorTimeoutRef.current) {
        clearTimeout(alienErrorTimeoutRef.current);
      }
      if (voicePreviewTimerRef.current) {
        clearTimeout(voicePreviewTimerRef.current);
      }
      voicePreviewSubscriptionRef.current?.remove();
      voicePreviewSubscriptionRef.current = null;
      voicePlayerRef.current?.pause();
      voicePlayerRef.current?.remove();
      voicePlayerRef.current = null;
      voicePreviewBlobUrlsRef.current.forEach(uri => {
        if (globalThis.URL?.revokeObjectURL) {
          globalThis.URL.revokeObjectURL(uri);
        }
      });
      voicePreviewBlobUrlsRef.current = [];
    },
    [],
  );

  useEffect(() => {
    preloadVoicePreviewSources('en').catch(() => undefined);
    preloadVoicePreviewSources('sw').catch(() => undefined);
    // Voice preview sources are preloaded once for the fixed intro languages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (signupStep !== 'verify' || signupResendSeconds <= 0) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setSignupResendSeconds(current => Math.max(0, current - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [signupResendSeconds, signupStep]);

  useEffect(() => {
    setActiveReadyTestimonialIndex(current => Math.min(current, readyTestimonials.length - 1));
  }, [readyTestimonials.length]);

  useEffect(() => {
    if (reduceMotionEnabled || introStep !== 'profileReady' || readyTestimonials.length <= 1) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setActiveReadyTestimonialIndex(current => (current + 1) % readyTestimonials.length);
    }, 3000);

    return () => clearTimeout(timer);
  }, [activeReadyTestimonialIndex, introStep, readyTestimonials.length, reduceMotionEnabled]);


  useEffect(() => {
    if (county && !countyOptions.includes(county)) {
      setCounty('');
      setSchoolId('');
      setSchoolQuery('');
      setManualSchoolName('');
    }
  }, [county, countyOptions]);

  const schoolLookupGrade =
    includeIntroChoices && role === 'teacher'
      ? teacherGradeIds[0] ?? grade
      : includeIntroChoices && role === 'parent'
        ? parentChildGrade
        : grade;
  const filteredSchools = useMemo(
    () =>
      county
        ? prioritizeSchoolsByEnrollment(
            schools.filter(
              school =>
                countyMatchesLocation(county, school.location) &&
                school.name.toLowerCase().includes(schoolQuery.trim().toLowerCase()),
            ),
            schoolLookupGrade || grade,
          )
        : [],
    [county, grade, schoolLookupGrade, schoolQuery, schools],
  );
  const schoolResultStatus =
    !county
      ? `Select a ${regionLabel.toLowerCase()} to see schools`
      : filteredSchools.length === 0
        ? `No schools found in ${county} for ${schoolLookupGrade || 'your grade'}`
        : `Showing ${filteredSchools.length} ${
            filteredSchools.length === 1 ? 'school' : 'schools'
          } in ${county} for ${schoolLookupGrade || 'your grade'}`;

  const canContinue =
    introStep === 'language'
      ? Boolean(languageCode)
      : introStep === 'mascot'
        ? Boolean(selectedMascotKey)
    : introStep === 'role'
      ? roleChosen || !onRoleChange
    : introStep === 'voice'
      ? noVoice || (Boolean(selectedVoiceName) && voicePreviewedName === selectedVoiceName)
    : introStep === 'microphone'
      ? true
    : introStep === 'need'
      ? Boolean(selectedNeedKey)
      : introStep === 'name'
        ? isValidDisplayName(displayName)
        : introStep === 'gender'
          ? Boolean(gender)
        : introStep === 'roleDetails'
          ? role === 'teacher'
            ? teacherGradeIds.length > 0
            : role === 'parent'
              ? allParentChildrenComplete
              : isValidLearnerAge(age)
          : introStep === 'goal'
            ? Boolean(selectedGoalKey)
            : introStep === 'concerns'
              ? Boolean(selectedConcernKey)
              : introStep === 'achieve'
                ? Boolean(selectedAchievementKey)
                : introStep === 'interests'
                  ? selectedInterestKeys.length > 0
      : introStep !== 'setup'
        ? true
        : step === 0
          ? includeIntroChoices
            ? role === 'teacher'
              ? true
              : usesLearnerFlow
                ? Boolean(grade)
                : true
            : Boolean(grade)
        : step === 1
            ? studentFullIntro ? true : hasSelectedSchool
            : step === 2 && studentFullIntro
              ? hasSelectedSchool
              : true;
  const primaryActionText =
    introStep === 'language'
      ? swahiliIntro
        ? 'Endelea'
        : 'Continue'
      : introStep === 'mascot'
        ? swahiliIntro
          ? 'Kutana na Rafiki'
          : 'Meet Rafiki'
        : introStep === 'rafiki'
          ? swahiliIntro
            ? 'Msalimie!'
            : 'Say hello!'
            : introStep === 'role'
              ? swahiliIntro
                ? 'Endelea'
                : 'Continue'
            : introStep === 'voice'
            ? 'Continue'
            : introStep === 'microphone'
            ? swahiliIntro
              ? 'Ruhusu maikrofoni'
              : 'Allow microphone access'
            : introStep === 'need'
              ? 'Continue'
              : introStep === 'name'
                ? 'Continue'
                : introStep === 'gender'
                  ? 'Continue'
                  : introStep === 'roleDetails'
                  ? 'Continue'
                  : introStep === 'goal'
                    ? 'Continue'
                    : introStep === 'goalConfirm'
                      ? 'Continue'
                    : introStep === 'concerns'
                      ? 'Continue'
                      : introStep === 'achieve'
                        ? 'Continue'
                        : introStep === 'painBefore'
                          ? studentSwahiliIntro
                            ? 'Nisaidie! \uD83D\uDE4B\u200D\u2642\uFE0F'
                            : 'Help me! \uD83D\uDE4B\u200D\u2642\uFE0F'
                          : introStep === 'painAfter'
                            ? 'Continue'
                        : introStep === 'socialProof'
                          ? 'Continue'
                          : introStep === 'resultProof'
                            ? swahiliIntro
                              ? role === 'teacher'
                                ? 'Anza kuinua darasa'
                                : role === 'parent'
                                  ? 'Anza kuona maendeleo'
                                  : 'Anza kuongeza alama'
                              : role === 'teacher'
                                ? 'Start Lifting My Class'
                                : role === 'parent'
                                  ? 'Start Tracking Progress'
                                  : 'Start Improving My Points'
                          : introStep === 'country'
                            ? role === 'teacher'
                              ? swahiliIntro
                                ? 'Ndiyo'
                                : 'Yes'
                              : swahiliIntro
                                ? 'Thibitisha nchi'
                                : 'Confirm location'
                                : introStep === 'interests'
                                  ? 'Continue'
                                  : introStep === 'reminder'
                                    ? swahiliIntro
                                      ? 'Nikumbushe 🔔'
                                      : 'Remind me 🔔'
                                    : introStep === 'loading'
                                      ? 'Show profile'
                                      : introStep === 'profileReady'
                                        ? swahiliIntro
                                          ? 'Niko tayari kuanza \uD83D\uDE80'
                                          : 'I\'m ready to start \uD83D\uDE80'
                                        : introStep === 'signup'
                                          ? swahiliIntro
                                            ? 'Hifadhi akaunti'
                                            : 'Save account'
                  : step === 0
                    ? role === 'parent' && includeIntroChoices
                      ? parentSubjectChildIndex < submittedParentChildren.length - 1
                        ? 'Next child'
                        : 'Continue'
                      : studentFullIntro
                        ? 'Continue'
                        : 'Continue to school'
                    : step === 1
                    ? includeIntroChoices
                      ? studentFullIntro
                        ? 'Continue'
                        : hasSelectedSchool
                          ? 'Continue'
                          : 'Continue'
                      : 'Continue to payment'
                    : studentFullIntro && step === 2
                      ? 'Continue'
                      : includeIntroChoices
                        ? 'Build my profile'
                        : hasMpesaInput
                          ? 'Finish setup'
                          : 'Skip and finish';
  const canGoBack =
    introStep === 'mascot' ||
    introStep === 'rafiki' ||
    introStep === 'role' ||
    introStep === 'voice' ||
    introStep === 'microphone' ||
    introStep === 'need' ||
    introStep === 'name' ||
    introStep === 'gender' ||
    introStep === 'roleDetails' ||
    introStep === 'goal' ||
    introStep === 'goalConfirm' ||
    introStep === 'concerns' ||
    introStep === 'achieve' ||
    introStep === 'painBefore' ||
    introStep === 'painAfter' ||
    introStep === 'socialProof' ||
    introStep === 'resultProof' ||
    introStep === 'country' ||
    introStep === 'interests' ||
    introStep === 'reminder' ||
    introStep === 'profileReady' ||
    introStep === 'signup' ||
    (introStep === 'setup' && (step > 0 || includeIntroChoices));
  const secondaryActionText =
    introStep === 'mascot'
      ? 'Back'
      : introStep === 'rafiki'
        ? 'Back to mascot'
        : introStep === 'role'
          ? 'Back to Rafiki'
        : introStep === 'voice'
          ? 'Back to role'
        : introStep === 'microphone'
          ? 'Back to role'
        : introStep === 'need'
          ? 'Back to microphone'
          : introStep === 'name'
            ? 'Back to need'
            : introStep === 'gender'
              ? usesLearnerFlow
                ? 'Back to age'
                : 'Back to name'
            : introStep === 'roleDetails'
              ? usesLearnerFlow
                ? 'Back to name'
                : role === 'parent'
                  ? 'Back to school'
                  : 'Back to gender'
            : introStep === 'goal'
              ? role === 'teacher'
                ? 'Back to subjects'
                : role === 'parent'
                  ? 'Back to subjects'
                  : studentFullIntro
                    ? 'Back'
                    : 'Back to gender'
            : introStep === 'goalConfirm'
              ? 'Back to goal'
            : introStep === 'concerns'
              ? studentFullIntro
                ? 'Back to goal'
                : 'Back to goal'
            : introStep === 'achieve'
              ? 'Back to concern'
            : introStep === 'painBefore'
              ? studentFullIntro
                ? 'Back to school'
                : 'Back to achievement'
            : introStep === 'painAfter'
              ? 'Back'
            : introStep === 'socialProof'
              ? studentFullIntro
                ? 'Back to goal'
                : 'Back'
            : introStep === 'resultProof'
              ? studentFullIntro ? 'Back to interests' : 'Back to achievement'
            : introStep === 'country'
              ? studentFullIntro
                ? 'Back to results'
                : 'Back'
            : introStep === 'interests'
              ? 'Back to achievement'
            : introStep === 'reminder'
              ? 'Back'
            : introStep === 'profileReady'
              ? 'Back to reminder'
            : introStep === 'signup'
              ? 'Back to profile'
          : introStep === 'setup' && step === 0 && includeIntroChoices
            ? role === 'teacher'
              ? 'Back to classes'
              : role === 'parent'
                ? parentSubjectChildIndex > 0
                  ? 'Back'
                  : 'Back to children'
                : 'Back to gender'
            : introStep === 'setup' && step === 1 && studentFullIntro
              ? 'Back to class'
            : introStep === 'setup' && step === 2 && studentFullIntro
              ? 'Back to subjects'
            : step === 2
              ? 'Back to school'
              : content.backToStartLabel;
  const secondaryActionHint =
    introStep === 'mascot'
      ? 'Returns to language selection'
      : introStep === 'rafiki'
        ? 'Returns to mascot selection'
        : introStep === 'role'
          ? 'Returns to Rafiki introduction'
        : introStep === 'voice'
          ? 'Returns to role confirmation'
        : introStep === 'microphone'
          ? 'Returns to role confirmation'
        : introStep === 'need'
          ? 'Returns to microphone access'
          : introStep === 'name'
            ? 'Returns to need selection'
            : introStep === 'gender'
              ? usesLearnerFlow
                ? 'Returns to age entry'
                : 'Returns to name entry'
            : introStep === 'roleDetails'
              ? usesLearnerFlow
                ? 'Returns to name entry'
                : role === 'parent'
                  ? 'Returns to school selection'
                  : 'Returns to gender selection'
            : introStep === 'goal'
              ? usesLearnerFlow
                ? studentFullIntro
                  ? 'Returns to with Kitabu'
                  : 'Returns to gender selection'
                : 'Returns to profile details'
            : introStep === 'goalConfirm'
              ? 'Returns to goal selection'
            : introStep === 'concerns'
              ? studentFullIntro
                ? 'Returns to goal confirmation'
                : 'Returns to goal selection'
            : introStep === 'achieve'
              ? 'Returns to concern selection'
            : introStep === 'painBefore'
              ? studentFullIntro
                ? 'Returns to school selection'
                : 'Returns to achievement selection'
            : introStep === 'painAfter'
              ? 'Returns to before Kitabu'
            : introStep === 'socialProof'
              ? 'Returns to with Kitabu'
            : introStep === 'resultProof'
              ? studentFullIntro ? 'Returns to interest selection' : 'Returns to achievement selection'
            : introStep === 'country'
              ? includeIntroChoices
                ? 'Returns to result proof'
                : 'Returns to social proof'
            : introStep === 'interests'
              ? 'Returns to achievement selection'
            : introStep === 'reminder'
              ? studentFullIntro ? 'Returns to grade boost plan' : 'Returns to interests'
            : introStep === 'profileReady'
              ? 'Returns to reminder selection'
            : introStep === 'signup'
              ? 'Returns to your ready profile'
            : introStep === 'setup' && step === 0 && includeIntroChoices
              ? studentFullIntro
                ? 'Returns to gender selection'
                : role === 'parent'
                  ? parentSubjectChildIndex > 0
                    ? 'Returns to the previous child subject selection'
                    : 'Returns to child details'
                  : 'Returns to grade selection'
            : introStep === 'setup' && step === 1 && studentFullIntro
              ? 'Returns to class selection'
            : introStep === 'setup' && step === 2 && studentFullIntro
              ? 'Returns to subject selection'
            : step === 2
              ? 'Returns to school selection'
              : 'Returns to the first setup step';
  const primaryActionHint =
    introStep === 'language'
      ? 'Moves to mascot selection'
      : introStep === 'mascot'
        ? 'Introduces the selected mascot'
      : introStep === 'rafiki'
        ? 'Moves to role confirmation'
        : introStep === 'role'
          ? 'Moves to microphone access'
        : introStep === 'voice'
            ? 'Moves to priority selection'
          : introStep === 'microphone'
            ? 'Moves to priority selection'
          : introStep === 'need' && !selectedNeedKey
            ? 'Choose what you need most before continuing'
          : introStep === 'need'
            ? 'Moves to name entry'
            : introStep === 'name' && !displayName.trim()
              ? 'Enter your name before continuing'
              : introStep === 'name' && !isValidDisplayName(displayName)
                ? 'Enter a name without numbers before continuing'
              : introStep === 'name'
                ? 'Moves to profile details'
                : introStep === 'gender'
                  ? usesLearnerFlow
                    ? 'Moves to class selection'
                    : role === 'teacher' || role === 'parent'
                      ? 'Moves to curriculum confirmation'
                      : 'Moves to profile details'
                  : introStep === 'roleDetails' && !canContinue
                  ? role === 'teacher'
                    ? 'Select at least one teaching grade before continuing'
                    : role === 'parent'
                      ? 'Enter your child name and grade before continuing'
                      : 'Enter your age before continuing'
                  : introStep === 'roleDetails'
                    ? usesLearnerFlow
                      ? 'Moves to gender selection'
                      : role === 'parent'
                        ? 'Moves to subject selection'
                        : 'Moves to goal selection'
                    : introStep === 'goal' && !selectedGoalKey
                      ? 'Choose your goal before continuing'
                      : introStep === 'goal'
                        ? studentFullIntro
                          ? 'Moves to goal confirmation'
                          : 'Moves to concern selection'
                        : introStep === 'goalConfirm'
                          ? 'Moves to concern selection'
                        : introStep === 'concerns' && !selectedConcernKey
                          ? 'Choose your main concern before continuing'
                          : introStep === 'concerns'
                            ? 'Moves to achievement selection'
                            : introStep === 'achieve' && !selectedAchievementKey
                              ? 'Choose what you want to achieve before continuing'
                               : introStep === 'achieve'
                                ? includeIntroChoices
                                  ? studentFullIntro ? 'Moves to interest selection' : 'Moves to social proof'
                                  : 'Moves to before Kitabu'
                                : introStep === 'painBefore'
                                  ? 'Moves to with Kitabu'
                                  : introStep === 'painAfter'
                                    ? studentFullIntro
                                      ? 'Moves to goal selection'
                                      : 'Moves to social proof'
                                    : introStep === 'socialProof'
                                      ? 'Moves to curriculum confirmation'
                                      : introStep === 'resultProof'
                                        ? role === 'teacher' || role === 'parent'
                                          ? 'Moves to reminder setup'
                                          : studentFullIntro ? 'Moves to reminder setup' : 'Moves to curriculum confirmation'
                                      : introStep === 'country'
                                        ? role === 'teacher' || role === 'parent'
                                          ? 'Moves to school selection'
                                          : 'Moves to interest selection'
                                        : introStep === 'interests'
                                          ? studentFullIntro ? 'Moves to grade boost plan' : 'Moves to reminder setup'
                                          : introStep === 'reminder'
                                            ? 'Moves to account setup'
                                            : introStep === 'loading'
                                              ? 'Shows your ready profile'
                                              : introStep === 'profileReady'
                                                ? 'Moves to account save'
                                                : introStep === 'signup'
                                                  ? 'Completes account setup and opens Kitabu'
                    : includeIntroChoices && step === 1 && studentFullIntro
                      ? 'Moves to school selection'
                    : includeIntroChoices && (step === 1 || (step === 2 && studentFullIntro))
                      ? hasSelectedSchool
                        ? studentFullIntro
                          ? 'Moves to before Kitabu'
                          : role === 'parent'
                            ? 'Moves to child details'
                            : 'Moves to goal selection'
                        : role === 'parent'
                          ? 'Choose a school before continuing to child details'
                          : 'Choose a school before continuing'
                      : !canContinue && step === 1 && !county
                      ? `Choose a ${regionLabel.toLowerCase()} before continuing`
                      : !canContinue && step === 1
                        ? 'Choose a school before continuing'
                        : !canContinue
                          ? 'Choose a grade before continuing'
                            : step === 0 && includeIntroChoices && role === 'parent'
                              ? parentSubjectChildIndex < submittedParentChildren.length - 1
                                ? 'Moves to the next child subject selection'
                                : 'Moves to goal selection'
                            : step === 2 && includeIntroChoices
                              ? 'Builds your Kitabu profile'
                              : step === 2 && hasValidMpesaShortcut
                                ? 'Completes account setup with M-Pesa shortcut'
                                : step === 2 && hasMpesaInput
                                  ? 'Checks the M-Pesa number before finishing setup'
                                  : step === 2
                                    ? 'Completes account setup without adding M-Pesa'
                                : step === 1
                                  ? externalPaymentsEnabled
                                    ? 'Moves to the optional payment step'
                                    : 'Completes account setup'
                                   : 'Moves to school selection';

  function submitPreparedOnboarding(
    normalizedMpesaPhoneNumber: string | null,
    signupMethodOverride: SignupMethod | null = null,
  ) {
    onboardingCompletedRef.current = true;
    trackOnboardingEvent('complete', 'complete', 'Onboarding complete');
    Keyboard.dismiss();
    setFocusedField(null);
    triggerHaptic('success');
    const resolvedSignupMethod = signupMethodOverride ?? signupMethod;
    onSubmit({
      gender: resolvedGender,
      grade: primaryProfileGrade,
      schoolId: schoolId || null,
      mpesaPhoneNumber: normalizedMpesaPhoneNumber,
      selectedSubjectIds: effectiveSelectedSubjectIds,
      ...(includeIntroChoices
        ? {
            role,
            ...(languageCode ? { lang: languageCode } : {}),
            ...(languageCode ? { languageCode } : {}),
            ...(selectedMascotKey ? { mascot: selectedMascotKey } : {}),
            ...(selectedMascotKey ? { mascotKey: selectedMascotKey } : {}),
            ...(displayName.trim() ? { name: displayName.trim() } : {}),
            voice: selectedVoiceName ?? '',
            ...(selectedVoiceName ? { voiceName: selectedVoiceName } : {}),
            noVoice,
            need: selectedNeedKey ?? undefined,
            needKey: selectedNeedKey ?? undefined,
            ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
            ...(usesLearnerFlow && age.trim() ? { age: age.trim() } : {}),
            ...(role !== 'parent' ? { subjects: selectedSubjectNames } : {}),
            county: county || selectedSchool?.location || '',
            school: selectedSchoolName,
            ...(selectedGoalKey ? { goal: selectedGoalKey } : {}),
            ...(selectedGoalKey ? { goalKey: selectedGoalKey } : {}),
            ...(selectedConcernKey ? { concern: selectedConcernKey } : {}),
            ...(selectedConcernKey ? { concernKey: selectedConcernKey } : {}),
            ...(selectedAchievementKey ? { achieve: selectedAchievementKey } : {}),
            ...(selectedAchievementKey ? { achievementKey: selectedAchievementKey } : {}),
            ...(selectedInterestKeys.length ? { interests: selectedInterestKeys } : {}),
            ...(selectedInterestKeys.length ? { interestKeys: selectedInterestKeys } : {}),
            reminderEnabled,
            countryCode,
            curriculumCode: selectedCountry.curriculumCode,
            ...(role === 'parent'
              ? {
                  children: submittedParentChildren,
                }
              : {}),
            ...(role === 'teacher' ? { teachGrades: teacherGradeIds } : {}),
            ...(role === 'teacher' ? { subjectsByGrade: teacherSubjectsByGrade } : {}),
            ...(collectSignupCredentials && resolvedSignupMethod
              ? {
                  signupMethod: resolvedSignupMethod,
                  ...(resolvedSignupMethod === 'email' ? { email: signupEmailTrimmed } : {}),
                  ...(resolvedSignupMethod === 'email' ? { signupEmail: signupEmailTrimmed } : {}),
                  ...(resolvedSignupMethod === 'phone' ? { phone: normalizedSignupPhone } : {}),
                  ...(resolvedSignupMethod === 'phone' ? { signupPhone: normalizedSignupPhone } : {}),
                  ...(resolvedSignupMethod === 'phone' ? { signupOtp: signupOtpValue } : {}),
                  ...(resolvedSignupMethod !== 'google' ? { password: signupPassword } : {}),
                  ...(resolvedSignupMethod !== 'google' ? { signupPassword } : {}),
                }
              : {}),
          }
        : {}),
    });
  }

  function clearAutoAdvance() {
    if (!autoAdvanceTimeoutRef.current) {
      return;
    }

    clearTimeout(autoAdvanceTimeoutRef.current);
    autoAdvanceTimeoutRef.current = null;
  }

  function scheduleAutoAdvance(action: () => void, delayMs = AUTO_ADVANCE_DELAY_MS) {
    clearAutoAdvance();
    autoAdvanceTimeoutRef.current = setTimeout(() => {
      autoAdvanceTimeoutRef.current = null;
      triggerHaptic('impact');
      action();
    }, delayMs);
  }

  function trackOnboardingEvent(
    eventType: OnboardingEventType,
    stepKey: string,
    optionLabel: string,
    metadata?: Record<string, unknown>,
    optionKey: string = eventType,
  ) {
    if (!includeIntroChoices) {
      return;
    }

    postOnboardingSelectionEvent({
      sessionId: onboardingSessionIdRef.current,
      stepKey,
      optionKey,
      optionLabel,
      eventType,
      eventVersion: ONBOARDING_ANALYTICS_VERSION,
      stepIndex: activeProgressRef.current.progressIndex,
      role,
      county: county || null,
      grade: grade || null,
      countryCode,
      curriculumCode: selectedCountry.curriculumCode,
      metadata,
    }).catch(() => undefined);
  }

  function trackOnboardingSelection(
    stepKey: string,
    optionKey: string,
    optionLabel: string,
    metadata?: Record<string, unknown>,
  ) {
    trackOnboardingEvent('selection', stepKey, optionLabel, metadata, optionKey);
  }

  function voicePreviewCacheKey(option: VoiceOption, nextLanguageCode: OnboardingLanguageCode | null) {
    return `${nextLanguageCode ?? 'en'}:${option.name}`;
  }

  function voicePreviewRawSource(option: VoiceOption, nextLanguageCode: OnboardingLanguageCode | null) {
    return nextLanguageCode === 'sw' ? option.sw : option.en;
  }

  async function resolveVoicePreviewSource(
    option: VoiceOption,
    nextLanguageCode: OnboardingLanguageCode | null = languageCode,
  ) {
    const cacheKey = voicePreviewCacheKey(option, nextLanguageCode);
    const cachedSource = voicePreviewSourceCacheRef.current[cacheKey];
    if (cachedSource) {
      return cachedSource;
    }

    const rawSource = voicePreviewRawSource(option, nextLanguageCode);

    try {
      if (typeof rawSource !== 'number' && typeof rawSource !== 'string') {
        voicePreviewSourceCacheRef.current[cacheKey] = rawSource;
        return rawSource;
      }

      const asset = Asset.fromModule(rawSource);
      const assetToDownload =
        Platform.OS === 'web' || asset.type
          ? asset
          : new Asset({
              name: asset.name,
              type: 'mp3',
              uri: asset.uri,
            });
      await assetToDownload.downloadAsync();
      let uri = assetToDownload.localUri ?? assetToDownload.uri;

      if (Platform.OS === 'web' && uri && typeof fetch === 'function' && globalThis.URL?.createObjectURL) {
        const response = await fetch(uri);
        const blob = await response.blob();
        uri = globalThis.URL.createObjectURL(blob);
        voicePreviewBlobUrlsRef.current.push(uri);
      }

      const resolvedSource: AudioSource =
        Platform.OS === 'web'
          ? { uri }
          : typeof rawSource === 'number'
            ? { assetId: rawSource, uri }
            : { uri };
      voicePreviewSourceCacheRef.current[cacheKey] = resolvedSource;
      return resolvedSource;
    } catch {
      voicePreviewSourceCacheRef.current[cacheKey] = rawSource;
      return rawSource;
    }
  }

  async function preloadVoicePreviewSources(nextLanguageCode: OnboardingLanguageCode | null = languageCode) {
    await Promise.all(VOICE_OPTIONS.map(option => resolveVoicePreviewSource(option, nextLanguageCode)));
  }

  function stopVoicePreview() {
    if (voicePreviewTimerRef.current) {
      clearTimeout(voicePreviewTimerRef.current);
      voicePreviewTimerRef.current = null;
    }
    voicePreviewSubscriptionRef.current?.remove();
    voicePreviewSubscriptionRef.current = null;
    voicePlayerRef.current?.pause();
    voicePlayerRef.current?.remove();
    voicePlayerRef.current = null;
    setVoicePreviewingName(null);
  }

  function triggerInvalidAgeFeedback(shakeMotion: Animated.Value) {
    triggerHaptic('error');
    if (reduceMotionEnabled) {
      return;
    }
    shakeMotion.stopAnimation();
    shakeMotion.setValue(0);
    Animated.sequence([
      Animated.timing(shakeMotion, {
        toValue: 1,
        duration: 46,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeMotion, {
        toValue: -1,
        duration: 46,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeMotion, {
        toValue: 1,
        duration: 46,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeMotion, {
        toValue: 0,
        duration: 46,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }

  function ageShakeStyle(shakeMotion: Animated.Value) {
    return {
      transform: [
        {
          translateX: shakeMotion.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [-8, 0, 8],
          }),
        },
      ],
    };
  }

  function invalidAgeText() {
    return 'Uko Sure? Age must be between 4 and 20.';
  }

  function handleInvalidContinueFeedback() {
    if (introStep === 'name' && displayName.trim() && !isValidDisplayName(displayName)) {
      triggerHaptic('error');
      return true;
    }

    if (introStep !== 'roleDetails') {
      return false;
    }

    if (role === 'student' && age.trim() && !isValidLearnerAge(age)) {
      triggerInvalidAgeFeedback(learnerAgeShakeMotion);
      return true;
    }

    if (
      role === 'parent' &&
      ((parentChildAge.trim() && !isValidLearnerAge(parentChildAge)) ||
        additionalParentChildren.some(child => child.age.trim() && !isValidLearnerAge(child.age)))
    ) {
      triggerInvalidAgeFeedback(childAgeShakeMotion);
      return true;
    }

    return false;
  }

  async function playVoicePreview(option: VoiceOption) {
    stopVoicePreview();
    const requestId = voicePreviewRequestIdRef.current + 1;
    voicePreviewRequestIdRef.current = requestId;
    setVoicePreviewedName(null);
    setVoicePreviewingName(option.name);

    try {
      const source = await resolveVoicePreviewSource(option);
      if (voicePreviewRequestIdRef.current !== requestId) {
        return;
      }

      if (Platform.OS !== 'web') {
        await setAudioModeAsync({
          allowsRecording: false,
          interruptionMode: 'duckOthers',
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          shouldRouteThroughEarpiece: false,
        });
      }

      voicePlayerRef.current = createAudioPlayer(source, { downloadFirst: false });
      voicePreviewSubscriptionRef.current = voicePlayerRef.current.addListener(
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
      voicePlayerRef.current.play();
    } catch {
      setVoicePreviewingName(null);
    }
  }

  async function handleContinue() {
    if (isSubmitting) {
      return;
    }

    clearAutoAdvance();
    setLocalError(null);

    if (!canContinue) {
      if (!handleInvalidContinueFeedback()) {
        triggerHaptic('error');
      }
      return;
    }

    if (introStep === 'language') {
      triggerHaptic('impact');
      setIntroStep('mascot');
      return;
    }

    if (introStep === 'mascot') {
      triggerHaptic('impact');
      setIntroStep('rafiki');
      return;
    }

    if (introStep === 'rafiki') {
      triggerHaptic('impact');
      setIntroStep('role');
      return;
    }

    if (introStep === 'role') {
      triggerHaptic('impact');
      setIntroStep('microphone');
      return;
    }

    if (introStep === 'microphone') {
      triggerHaptic('impact');
      setIsRequestingMicrophonePermission(true);
      const permission = await requestRecordingPermissionsAsync().catch(() => ({
        status: 'error' as const,
        granted: false,
      }));
      setIsRequestingMicrophonePermission(false);
      trackOnboardingEvent('permission_result', 'microphone', permission.status ?? (permission.granted ? 'granted' : 'denied'), {
        granted: permission.granted,
      });
      setIntroStep('need');
      return;
    }

    if (introStep === 'voice') {
      triggerHaptic('impact');
      setIntroStep('need');
      return;
    }

    if (introStep === 'need') {
      triggerHaptic('impact');
      setIntroStep('name');
      return;
    }

    if (introStep === 'name') {
      Keyboard.dismiss();
      triggerHaptic('impact');
      setIntroStep(usesLearnerFlow ? 'roleDetails' : 'gender');
      return;
    }

    if (introStep === 'gender') {
      triggerHaptic('impact');
      if (studentFullIntro) {
        setIntroStep('country');
      } else {
        // Teachers confirm country (then county/school) before picking grades/subjects,
        // since location and grade shape the subjects offered.
        setIntroStep(usesLearnerFlow ? 'goal' : role === 'teacher' || role === 'parent' ? 'country' : 'roleDetails');
      }
      return;
    }

    if (introStep === 'roleDetails') {
      Keyboard.dismiss();
      triggerHaptic('impact');
      if (usesLearnerFlow) {
        setIntroStep('gender');
      } else {
        if (role === 'teacher') {
          // Start per-grade subject capture from the first selected grade.
          setTeacherSubjectGradeIndex(0);
        } else if (role === 'parent') {
          setParentSubjectChildIndex(0);
        }
        setStep(role === 'teacher' || role === 'parent' ? 0 : 1);
        setIntroStep('setup');
      }
      return;
    }

    if (introStep === 'goal') {
      triggerHaptic('impact');
      setIntroStep(studentFullIntro ? 'goalConfirm' : 'concerns');
      return;
    }

    if (introStep === 'goalConfirm') {
      triggerHaptic('impact');
      setIntroStep('concerns');
      return;
    }

    if (introStep === 'concerns') {
      triggerHaptic('impact');
      setIntroStep('achieve');
      return;
    }

    if (introStep === 'achieve') {
      triggerHaptic('impact');
      setIntroStep(includeIntroChoices ? (studentFullIntro ? 'interests' : 'resultProof') : 'painBefore');
      return;
    }

    if (introStep === 'resultProof') {
      triggerHaptic('impact');
      // Teachers pick their country earlier (before county/school), so skip straight to reminders.
      setIntroStep(studentFullIntro ? 'reminder' : role === 'teacher' || role === 'parent' ? 'reminder' : 'country');
      return;
    }

    if (introStep === 'painBefore') {
      triggerHaptic('impact');
      setIntroStep('painAfter');
      return;
    }

    if (introStep === 'painAfter') {
      triggerHaptic('impact');
      setIntroStep(studentFullIntro ? 'goal' : 'socialProof');
      return;
    }

    if (introStep === 'socialProof') {
      triggerHaptic('impact');
      setIntroStep('country');
      return;
    }

    if (introStep === 'country') {
      triggerHaptic('impact');
      if (studentFullIntro) {
        setStep(2);
        setIntroStep('setup');
        return;
      }
      if (role === 'teacher') {
        // Teachers confirm country first, then continue into county/school selection.
        setStep(1);
        setIntroStep('setup');
        return;
      }
      if (role === 'parent') {
        setStep(1);
        setIntroStep('setup');
        return;
      }
      setIntroStep(usesLearnerFlow ? 'interests' : 'reminder');
      return;
    }

    if (introStep === 'interests') {
      triggerHaptic('impact');
      setIntroStep(studentFullIntro ? 'resultProof' : 'reminder');
      return;
    }

    if (introStep === 'reminder') {
      triggerHaptic('impact');
      // The primary "Remind me 🔔" action requests OS push permission so we can
      // send daily study reminders. We advance regardless of the user's choice;
      // reminderEnabled records whether the OS actually granted permission.
      setIsRequestingReminderPermission(true);
      const permission = await requestPushPermission().catch(() => ({
        status: 'error' as const,
        granted: false,
        tokenReady: false,
      }));
      setReminderEnabled(permission.granted);
      setIsRequestingReminderPermission(false);
      trackOnboardingEvent('permission_result', 'reminder', permission.status, {
        granted: permission.granted,
        tokenReady: permission.tokenReady,
      });
      if (includeIntroChoices) {
        setIntroStep('loading');
        return;
      }
      setIntroStep('setup');
      return;
    }

    if (introStep === 'loading') {
      triggerHaptic('impact');
      setIntroStep('profileReady');
      return;
    }

    if (introStep === 'profileReady') {
      if (includeIntroChoices) {
        triggerHaptic('impact');
        setIntroStep('signup');
        return;
      }
      submitPreparedOnboarding(preparedMpesaPhoneNumber);
      return;
    }

    if (introStep === 'signup') {
      if (collectSignupCredentials) {
        return;
      }
      submitPreparedOnboarding(preparedMpesaPhoneNumber);
      return;
    }

    if (includeIntroChoices && introStep === 'setup' && step === 1 && studentFullIntro) {
      // Subjects is the last setup screen in the PRD order (country → school → grade → subjects).
      Keyboard.dismiss();
      setFocusedField(null);
      triggerHaptic('impact');
      setIntroStep('painBefore');
      return;
    }

    if (includeIntroChoices && introStep === 'setup' && step === 2 && studentFullIntro) {
      // County/School screen advances to Grade.
      Keyboard.dismiss();
      setFocusedField(null);
      triggerHaptic('impact');
      setStep(0);
      return;
    }

    if (includeIntroChoices && introStep === 'setup' && step === 1) {
      Keyboard.dismiss();
      setFocusedField(null);
      triggerHaptic('impact');
      if (role === 'teacher') {
        // Teachers pick grades (then subjects) after confirming country and school.
        setIntroStep('roleDetails');
        return;
      }
      if (role === 'parent') {
        setIntroStep('roleDetails');
        return;
      }
      setIntroStep('goal');
      return;
    }

    if (includeIntroChoices && introStep === 'setup' && step === 0 && role === 'teacher') {
      Keyboard.dismiss();
      setFocusedField(null);
      triggerHaptic('impact');
      // Capture subjects one grade at a time before moving on.
      if (teacherSubjectGradeIndex < teacherGradeIds.length - 1) {
        setTeacherSubjectGradeIndex(current => current + 1);
        return;
      }
      // Subjects are the last setup screen; teachers continue to their teaching goal.
      setIntroStep('goal');
      return;
    }

    if (includeIntroChoices && introStep === 'setup' && step === 0 && role === 'parent') {
      Keyboard.dismiss();
      setFocusedField(null);
      triggerHaptic('impact');
      if (parentSubjectChildIndex < submittedParentChildren.length - 1) {
        setParentSubjectChildIndex(current => current + 1);
        return;
      }
      setIntroStep('goal');
      return;
    }

    if (step < 2) {
      if (!externalPaymentsEnabled && !includeIntroChoices && step === 1) {
        submitPreparedOnboarding(null);
        return;
      }

      Keyboard.dismiss();
      setFocusedField(null);
      triggerHaptic('impact');
      setStep(current => current + 1);
      return;
    }

    let normalizedMpesaPhoneNumber: string | null = null;
    try {
      normalizedMpesaPhoneNumber = externalPaymentsEnabled
        ? normalizeOptionalMpesaPhoneNumber(mpesaPhoneNumber)
        : null;
    } catch (validationError) {
      triggerHaptic('error');
      setLocalError(validationError instanceof Error ? validationError.message : MPESA_PHONE_ERROR);
      return;
    }

    Keyboard.dismiss();
    setFocusedField(null);
    if (includeIntroChoices) {
      setPreparedMpesaPhoneNumber(normalizedMpesaPhoneNumber);
      triggerHaptic('impact');
      setIntroStep('loading');
      return;
    }

    submitPreparedOnboarding(normalizedMpesaPhoneNumber);
  }

  function handleLanguageSelect(value: OnboardingLanguageCode) {
    triggerHaptic('selection');
    setLanguageCode(value);
    const option = LANGUAGE_OPTIONS.find(item => item.code === value);
    trackOnboardingSelection('language', value, option?.label ?? value);
    if (includeIntroChoices) {
      setNarrationTrigger('primary-instruction:student-onboarding:mascot-0');
      scheduleAutoAdvance(() => setIntroStep('mascot'));
    }
  }

  function handleMascotSelect(value: OnboardingMascotKey) {
    triggerHaptic('selection');
    setSelectedMascotKey(value);
    const option = MASCOT_OPTIONS.find(item => item.key === value);
    trackOnboardingSelection('mascot', value, option?.name ?? value);
    if (includeIntroChoices) {
      scheduleAutoAdvance(() => setIntroStep('rafiki'), MASCOT_AUTO_ADVANCE_DELAY_MS);
    }
  }

  function handleRoleSelect(value: PublicSignupRole) {
    triggerHaptic('selection');
    setRoleChosen(true);
    const option = roleOptions.find(item => item.role === value);
    trackOnboardingSelection('role', value, option?.label ?? value);
    onRoleChange?.(value);
    if (includeIntroChoices) {
      scheduleAutoAdvance(() => setIntroStep('microphone'));
    }
  }

  function handleVoiceSelect(value: OnboardingVoiceName) {
    triggerHaptic('selection');
    const option = VOICE_OPTIONS.find(item => item.name === value);
    setSelectedVoiceName(value);
    setNoVoice(false);
    trackOnboardingSelection('voice', value, value);
    if (option) {
      playVoicePreview(option).catch(() => undefined);
    }
  }

  function handleNoVoiceToggle() {
    triggerHaptic('selection');
    stopVoicePreview();
    setNoVoice(current => {
      const next = !current;
      if (next) {
        setSelectedVoiceName(null);
        setVoicePreviewedName(null);
        trackOnboardingSelection('voice', 'text_only', 'Text only');
      }
      return next;
    });
  }

  function handleNeedSelect(value: OnboardingNeedKey) {
    triggerHaptic('selection');
    setSelectedNeedKey(value);
    const option = needOptions.find(item => item.key === value);
    trackOnboardingSelection('need', value, option?.label ?? value);
    if (includeIntroChoices) {
      scheduleAutoAdvance(() => setIntroStep('name'));
    }
  }

  function handleGoalSelect(value: OnboardingGoalKey) {
    triggerHaptic('selection');
    setSelectedGoalKey(value);
    const option = goalOptions.find(item => item.key === value);
    trackOnboardingSelection('goal', value, option?.label ?? value, {
      recommended: Boolean(option?.recommended),
    });
    if (includeIntroChoices) {
      scheduleAutoAdvance(() => setIntroStep(studentFullIntro ? 'goalConfirm' : 'concerns'));
    }
  }

  function handleConcernSelect(value: OnboardingConcernKey) {
    triggerHaptic('selection');
    setSelectedConcernKey(value);
    const option = displayedConcernOptions.find(item => item.key === value);
    trackOnboardingSelection('concern', value, option?.label ?? value);
    if (includeIntroChoices) {
      scheduleAutoAdvance(() => setIntroStep('achieve'));
    }
  }

  function handleAchievementSelect(value: OnboardingAchievementKey) {
    triggerHaptic('selection');
    setSelectedAchievementKey(value);
    const option = achievementOptions.find(item => item.key === value);
    trackOnboardingSelection('achievement', value, option?.label ?? value);
    if (includeIntroChoices) {
      scheduleAutoAdvance(() => setIntroStep(studentFullIntro ? 'interests' : 'resultProof'));
    }
  }

  function handleInterestToggle(value: OnboardingInterestKey) {
    triggerHaptic('selection');
    const option = INTEREST_OPTIONS.find(item => item.key === value);
    setSelectedInterestKeys(current =>
      current.includes(value) ? current.filter(key => key !== value) : [...current, value],
    );
    trackOnboardingSelection('interest', value, option?.label ?? value);
  }

  function handleDisplayNameChange(value: string) {
    setDisplayName(value.replace(/\d/g, ''));
    if (localError) {
      setLocalError(null);
    }
  }

  function handleAgeChange(value: string) {
    const nextAge = value.replace(/[^\d]/g, '').slice(0, 2);
    setAge(nextAge);
    if (nextAge && !isValidLearnerAge(nextAge)) {
      triggerInvalidAgeFeedback(learnerAgeShakeMotion);
    }
    if (localError) {
      setLocalError(null);
    }
  }

  function handleParentChildNameChange(value: string) {
    setParentChildName(value.replace(/\d/g, ''));
    if (localError) {
      setLocalError(null);
    }
  }

  function handleParentChildAgeChange(value: string) {
    const nextAge = value.replace(/[^\d]/g, '').slice(0, 2);
    setParentChildAge(nextAge);
    if (nextAge && !isValidLearnerAge(nextAge)) {
      triggerInvalidAgeFeedback(childAgeShakeMotion);
    }
    if (localError) {
      setLocalError(null);
    }
  }

  function handleParentChildGradeSelect(value: string) {
    triggerHaptic('selection');
    if (value !== parentChildGrade) {
      setParentSubjectsByChild(current => {
        if (!current['child-0']) {
          return current;
        }
        const next = { ...current };
        delete next['child-0'];
        return next;
      });
    }
    setParentChildGrade(value);
    trackOnboardingSelection('child_grade', value, displayGradeLabel(value));
  }

  function handleAddParentChild() {
    if (additionalParentChildren.length >= 2) {
      return;
    }

    triggerHaptic('selection');
    setAdditionalParentChildren(current => [...current, { name: '', age: '', grade: '' }]);
  }

  function handleRemoveParentChild(index: number) {
    triggerHaptic('selection');
    const removedChildIndex = index + 1;
    setParentSubjectsByChild(current => {
      const next: Record<string, string[]> = {};
      Object.entries(current).forEach(([key, subjectIds]) => {
        const childIndex = Number(key.replace('child-', ''));
        if (Number.isNaN(childIndex) || childIndex === removedChildIndex) {
          return;
        }
        next[`child-${childIndex > removedChildIndex ? childIndex - 1 : childIndex}`] = subjectIds;
      });
      return next;
    });
    setParentSubjectChildIndex(current => Math.min(current, additionalParentChildren.length - 1));
    setAdditionalParentChildren(current => current.filter((_, childIndex) => childIndex !== index));
  }

  function handleAdditionalParentChildChange(
    index: number,
    field: 'name' | 'age' | 'grade',
    value: string,
  ) {
    if (field === 'grade') {
      const childKey = `child-${index + 1}`;
      setParentSubjectsByChild(current => {
        if (!current[childKey] || current[childKey].length === 0) {
          return current;
        }
        const next = { ...current };
        delete next[childKey];
        return next;
      });
    }
    const nextValue =
      field === 'age' ? value.replace(/[^\d]/g, '').slice(0, 2) : field === 'name' ? value.replace(/\d/g, '') : value;
    if (field === 'age' && nextValue && !isValidLearnerAge(nextValue)) {
      triggerInvalidAgeFeedback(childAgeShakeMotion);
    }
    setAdditionalParentChildren(current =>
      current.map((child, childIndex) =>
        childIndex === index
          ? {
              ...child,
              [field]: nextValue,
            }
          : child,
      ),
    );
  }

  function handleTeacherGradeToggle(value: string) {
    triggerHaptic('selection');
    // Restart per-grade subject capture whenever the set of grades changes.
    setTeacherSubjectGradeIndex(0);
    setTeacherGradeIds(current => {
      if (current.includes(value)) {
        // Drop any subjects captured for a grade that is being removed.
        setTeacherSubjectsByGrade(currentSubjects => {
          if (!(value in currentSubjects)) {
            return currentSubjects;
          }
          const rest = { ...currentSubjects };
          delete rest[value];
          return rest;
        });
        return current.filter(id => id !== value);
      }

      trackOnboardingSelection('teacher_grade', value, displayGradeLabel(value));
      return [...current, value];
    });
  }

  function handleMpesaPhoneNumberChange(value: string) {
    setMpesaPhoneNumber(value);
    if (localError) {
      setLocalError(null);
    }
  }

  function handleSchoolQueryChange(value: string) {
    if (!county) {
      return;
    }

    setSchoolQuery(value);
    if (localError) {
      setLocalError(null);
    }

    if (manualSchoolName && manualSchoolName !== value) {
      setManualSchoolName('');
    }

    if (!schoolId) {
      return;
    }

    const selectedSchoolForQuery = schools.find(school => school.id === schoolId);
    if (selectedSchoolForQuery && selectedSchoolForQuery.name === value) {
      return;
    }

    setSchoolId('');
  }

  function handleCountySelect(value: string) {
    triggerHaptic('selection');
    setCounty(value);
    setSchoolQuery('');
    setSchoolId('');
    setManualSchoolName('');
    setLocalError(null);
    setFocusedField(null);
    trackOnboardingSelection('county', value, value, { countryCode });
    // Surface the searchable school picker straight away so the user can find their
    // school right after choosing a county.
    setSchoolPickerOpen(true);
  }

  function handleClearSchoolSearch() {
    setSchoolQuery('');
    setSchoolId('');
    setManualSchoolName('');
    setLocalError(null);
    setFocusedField('school');
    triggerHaptic('selection');
  }

  function handleSelectSchool(school: SchoolData) {
    setSchoolId(school.id);
    setSchoolQuery(school.name);
    setManualSchoolName('');
    trackOnboardingSelection('school', school.id, school.name, {
      county: school.location,
      totalStudents: school.totalStudents,
    });
  }

  function handleGenderSelect(value: GenderOption) {
    triggerHaptic('selection');
    if (alienErrorTimeoutRef.current) {
      clearTimeout(alienErrorTimeoutRef.current);
      alienErrorTimeoutRef.current = null;
    }
    setGender(value);
    setLocalError(null);
    // Like the other single-select intro steps, picking a gender advances automatically
    // (mirrors the gender branch in handleNext).
    if (includeIntroChoices) {
      scheduleAutoAdvance(() =>
        setIntroStep(
          studentFullIntro
            ? 'country'
            : usesLearnerFlow
              ? 'goal'
              : role === 'teacher' || role === 'parent'
                ? 'country'
                : 'roleDetails',
        ),
      );
    }
  }

  function resetSignupVerification(method: SignupMethod) {
    setSignupMethod(method);
    setSignupOtp(['', '', '', '', '', '']);
    setSignupResendSeconds(30);
    setSignupCodeError(false);
    setLocalError(null);
  }

  function handleSignupMethodSelect(method: SignupMethod) {
    triggerHaptic('selection');
    resetSignupVerification(method);
    if (method === 'google') {
      submitPreparedOnboarding(preparedMpesaPhoneNumber, 'google');
      return;
    }
    setSignupStep(method);
  }

  function handleSignupBack() {
    triggerHaptic('selection');
    setLocalError(null);
    setSignupCodeError(false);

    if (signupStep === 'verify') {
      setSignupStep(signupMethod === 'phone' ? 'phone' : 'email');
      return;
    }

    if (signupStep === 'email' || signupStep === 'phone') {
      setSignupStep('method');
      return;
    }

    setIntroStep('profileReady');
  }

  function handleSignupEmailContinue() {
    if (!canSubmitSignupEmail) {
      triggerHaptic('error');
      setLocalError(
        !isSignupEmailValid
          ? 'Enter a valid email address.'
          : signupPassword.length < 8
            ? 'Use at least 8 characters for your password.'
            : 'Passwords do not match.',
      );
      return;
    }

    triggerHaptic('impact');
    resetSignupVerification('email');
    submitPreparedOnboarding(preparedMpesaPhoneNumber, 'email');
  }

  async function handleSignupPhoneContinue() {
    if (!canSubmitSignupPhone) {
      triggerHaptic('error');
      setLocalError(
        !isSignupPhoneValid
          ? 'Enter a valid Kenyan phone number.'
          : signupPassword.length < 8
            ? 'Use at least 8 characters for your password.'
            : 'Passwords do not match.',
      );
      return;
    }

    try {
      setLocalError(null);
      await requestPhoneAuthCode({
        purpose: 'signup',
        phoneNumber: normalizedSignupPhone,
        fullName: displayName.trim() || 'Kitabu learner',
        role,
        acceptedTerms: true,
      });
      triggerHaptic('impact');
      resetSignupVerification('phone');
      setSignupStep('verify');
    } catch (phoneCodeError) {
      triggerHaptic('error');
      setLocalError(phoneCodeError instanceof Error ? phoneCodeError.message : 'Could not send verification code.');
    }
  }

  function handleSignupOtpChange(index: number, value: string) {
    const digits = value.replace(/\D/g, '');
    setSignupCodeError(false);
    if (digits.length > 1) {
      setSignupOtp(current => {
        const next = [...current];
        digits
          .slice(0, 6 - index)
          .split('')
          .forEach((digit, offset) => {
            next[index + offset] = digit;
          });
        return next;
      });
      signupOtpRefs.current[Math.min(5, index + digits.length - 1)]?.focus();
      return;
    }

    const digit = digits.slice(-1);
    setSignupOtp(current => {
      const next = [...current];
      next[index] = digit;
      return next;
    });

    if (digit && index < 5) {
      signupOtpRefs.current[index + 1]?.focus();
    }
  }

  function handleSignupOtpKeyPress(index: number, event: NativeSyntheticEvent<TextInputKeyPressEventData>) {
    if (event.nativeEvent.key === 'Backspace' && !signupOtp[index] && index > 0) {
      signupOtpRefs.current[index - 1]?.focus();
    }
  }

  function handleResendSignupCode() {
    triggerHaptic('selection');
    setSignupOtp(['', '', '', '', '', '']);
    setSignupCodeError(false);
    setSignupResendSeconds(30);
    setLocalError(null);
    signupOtpRefs.current[0]?.focus();
  }

  function handleVerifySignup() {
    if (!canVerifySignupOtp) {
      triggerHaptic('error');
      setSignupCodeError(true);
      return;
    }

    submitPreparedOnboarding(preparedMpesaPhoneNumber, 'phone');
  }

  function handleAlienGenderSelect() {
    triggerHaptic('error');
    setGender(null);
    const alienErrorMessage =
      languageCode === 'sw'
        ? 'Wacha jokes! 😂 Tunahudumia wanadamu tu hapa. Chagua Mvulana au Msichana uendelee.'
        : 'Wacha jokes! 😂 We only serve humans here. Pick Male or Female to continue.';
    setLocalError(alienErrorMessage);
    if (alienErrorTimeoutRef.current) {
      clearTimeout(alienErrorTimeoutRef.current);
    }
    alienErrorTimeoutRef.current = setTimeout(() => {
      alienErrorTimeoutRef.current = null;
      setLocalError(current => (current === alienErrorMessage ? null : current));
    }, 3000);
    genderShakeMotion.setValue(0);
    Animated.sequence([
      Animated.timing(genderShakeMotion, {
        duration: 45,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(genderShakeMotion, {
        duration: 45,
        easing: Easing.linear,
        toValue: 2,
        useNativeDriver: true,
      }),
      Animated.timing(genderShakeMotion, {
        duration: 45,
        easing: Easing.linear,
        toValue: 3,
        useNativeDriver: true,
      }),
      Animated.timing(genderShakeMotion, {
        duration: 45,
        easing: Easing.linear,
        toValue: 4,
        useNativeDriver: true,
      }),
    ]).start(() => genderShakeMotion.setValue(0));
  }

  function handleTeacherSubjectToggle(subjectId: string) {
    triggerHaptic('selection');
    const gradeValue = currentTeacherSubjectGrade;
    const subject = subjectOptions.find(option => option.id === subjectId);
    if (!gradeValue) {
      return;
    }
    setTeacherSubjectsByGrade(current => {
      const existing = current[gradeValue] ?? [];
      if (!existing.includes(subjectId)) {
        trackOnboardingSelection('teacher_subject', subjectId, subject?.name ?? subjectId, {
          grade: gradeValue,
        });
      }
      const next = existing.includes(subjectId)
        ? existing.filter(id => id !== subjectId)
        : [...existing, subjectId];
      return { ...current, [gradeValue]: next };
    });
  }

  function handleParentSubjectToggle(subjectId: string) {
    triggerHaptic('selection');
    const subject = subjectOptions.find(option => option.id === subjectId);
    setParentSubjectsByChild(current => {
      const existing = current[currentParentSubjectChildKey] ?? [];
      if (!existing.includes(subjectId)) {
        trackOnboardingSelection('parent_subject', subjectId, subject?.name ?? subjectId, {
          childIndex: parentSubjectChildIndex,
          grade: currentParentSubjectChild.grade,
        });
      }
      const next = existing.includes(subjectId)
        ? existing.filter(id => id !== subjectId)
        : [...existing, subjectId];
      return { ...current, [currentParentSubjectChildKey]: next };
    });
  }

  function handleSubjectToggle(subjectId: string) {
    triggerHaptic('selection');
    const subject = subjectOptions.find(option => option.id === subjectId);
    setSelectedSubjectIds(current => {
      if (current.includes(subjectId)) {
        return current.length > 1 ? current.filter(id => id !== subjectId) : current;
      }

      if (current.length >= MAX_ONBOARDING_SUBJECTS) {
        return current;
      }

      trackOnboardingSelection('subject', subjectId, subject?.name ?? subjectId);
      return [...current, subjectId];
    });
  }

  function handleGradeSelect(value: string) {
    triggerHaptic('selection');
    if (includeIntroChoices && value !== grade) {
      setSelectedSubjectIds([]);
    }
    setGrade(value);
    trackOnboardingSelection('grade', value, displayGradeLabel(value), {
      curriculum: value === 'Grade 11' || value === 'Grade 12' ? 'KNEC' : 'CBC',
    });
    if (value !== grade && schoolId && !studentFullIntro) {
      setSchoolId('');
      setSchoolQuery('');
      setManualSchoolName('');
      setLocalError(null);
    }
  }

  function handleSchoolOptionPress(school: SchoolData) {
    Keyboard.dismiss();
    setFocusedField(null);
    triggerHaptic('selection');
    handleSelectSchool(school);
    setSchoolPickerOpen(false);
  }

  function handleSchoolSearchSubmit() {
    if (hasSelectedSchool) {
      handleContinue();
      return;
    }

    if (filteredSchools.length === 1) {
      handleSchoolOptionPress(filteredSchools[0]);
    }
  }

  function handleSchoolSearchBlur() {
    setFocusedField(null);
    if (!hasSelectedSchool && filteredSchools.length === 1) {
      handleSelectSchool(filteredSchools[0]);
    }
  }

  function handleSchoolSearchKeyPress(event: NativeSyntheticEvent<TextInputKeyPressEventData>) {
    if (event.nativeEvent.key === 'Enter') {
      handleSchoolSearchSubmit();
    }
  }

  function handleMpesaPhoneKeyPress(event: NativeSyntheticEvent<TextInputKeyPressEventData>) {
    if (event.nativeEvent.key === 'Enter') {
      handleContinue();
    }
  }

  function handleOpenAddSchool() {
    setAddSchoolError(null);
    setManualSchoolName(schoolQuery.trim());
    setSchoolPickerOpen(false);
    setAddSchoolOpen(true);
  }

  async function handleAddSchool() {
    const schoolName = manualSchoolName.trim().replace(/\s+/g, ' ');
    if (schoolName.length < 2) {
      setAddSchoolError('Enter your school name to continue.');
      return;
    }
    if (!county) {
      setAddSchoolError(`Select a ${regionLabel.toLowerCase()} first.`);
      return;
    }

    setIsAddingSchool(true);
    setAddSchoolError(null);
    try {
      const school = onCreateSchool
        ? await onCreateSchool({ schoolName, county })
        : null;
      if (school) {
        handleSelectSchool(school);
      } else {
        setSchoolId('');
        setSchoolQuery(schoolName);
        setManualSchoolName(schoolName);
        trackOnboardingSelection('school', 'manual', schoolName, { county, manual: true });
      }
      setAddSchoolOpen(false);
      triggerHaptic('success');
    } catch (createSchoolError) {
      setAddSchoolError(createSchoolError instanceof Error ? createSchoolError.message : 'Could not add your school. Try again.');
      triggerHaptic('error');
    } finally {
      setIsAddingSchool(false);
    }
  }

  function handleBack() {
    trackOnboardingEvent('back', progressMetadata.key, progressMetadata.title);
    Keyboard.dismiss();
    clearAutoAdvance();
    setFocusedField(null);
    setLocalError(null);
    if (introStep === 'mascot') {
      setIntroStep('language');
      return;
    }

    if (introStep === 'rafiki') {
      setIntroStep('mascot');
      return;
    }

    if (introStep === 'role') {
      setIntroStep('rafiki');
      return;
    }

    if (introStep === 'microphone') {
      setIntroStep('role');
      return;
    }

    if (introStep === 'voice') {
      setIntroStep('role');
      return;
    }

    if (introStep === 'need') {
      setIntroStep('microphone');
      return;
    }

    if (introStep === 'name') {
      setIntroStep('need');
      return;
    }

    if (introStep === 'roleDetails') {
      if (role === 'teacher') {
        // Teachers reach grade selection after the county/school screen (setup step 1).
        setStep(1);
        setIntroStep('setup');
        return;
      }
      if (role === 'parent') {
        setStep(1);
        setIntroStep('setup');
        return;
      }
      setIntroStep(usesLearnerFlow ? 'name' : 'gender');
      return;
    }

    if (introStep === 'gender') {
      setIntroStep(usesLearnerFlow ? 'roleDetails' : 'name');
      return;
    }

    if (introStep === 'goal') {
      if (studentFullIntro) {
        setIntroStep('painAfter');
      } else if (includeIntroChoices) {
        if (role === 'teacher') {
          // Goal follows the per-grade subjects screens (setup step 0) for teachers.
          setTeacherSubjectGradeIndex(Math.max(0, teacherGradeIds.length - 1));
          setStep(0);
          setIntroStep('setup');
        } else if (role === 'parent') {
          setParentSubjectChildIndex(Math.max(0, submittedParentChildren.length - 1));
          setStep(0);
          setIntroStep('setup');
        } else {
          setStep(1);
          setIntroStep('setup');
        }
      } else {
        setIntroStep(usesLearnerFlow ? 'gender' : 'roleDetails');
      }
      return;
    }

    if (introStep === 'goalConfirm') {
      setIntroStep('goal');
      return;
    }

    if (introStep === 'concerns') {
      setIntroStep(studentFullIntro ? 'goalConfirm' : 'goal');
      return;
    }

    if (introStep === 'achieve') {
      setIntroStep('concerns');
      return;
    }

    if (introStep === 'painBefore') {
      if (studentFullIntro) {
        setStep(1);
        setIntroStep('setup');
      } else {
        setIntroStep('achieve');
      }
      return;
    }

    if (introStep === 'painAfter') {
      setIntroStep('painBefore');
      return;
    }

    if (introStep === 'socialProof') {
      setIntroStep('painAfter');
      return;
    }

    if (introStep === 'resultProof') {
      setIntroStep(studentFullIntro ? 'interests' : 'achieve');
      return;
    }

    if (introStep === 'country') {
      if (studentFullIntro || role === 'teacher' || role === 'parent') {
        // Teachers, parents, and full-intro students reach country right after gender.
        setIntroStep('gender');
      } else {
        setIntroStep(includeIntroChoices ? 'resultProof' : 'socialProof');
      }
      return;
    }

    if (introStep === 'interests') {
      setIntroStep(studentFullIntro ? 'achieve' : 'country');
      return;
    }

    if (introStep === 'reminder') {
      // Teachers and parents already confirmed country before county/school.
      setIntroStep(studentFullIntro ? 'resultProof' : usesLearnerFlow ? 'interests' : role === 'teacher' || role === 'parent' ? 'resultProof' : 'country');
      return;
    }

    if (introStep === 'profileReady') {
      setIntroStep('reminder');
      if (includeIntroChoices) {
        return;
      }
      setStep(2);
      return;
    }

    if (introStep === 'signup') {
      setIntroStep('profileReady');
      return;
    }

    if (introStep === 'setup' && step === 2 && studentFullIntro) {
      // County/School is the first setup screen in the PRD order; back goes to Country.
      setIntroStep('country');
      return;
    }

    if (introStep === 'setup' && step === 0 && includeIntroChoices) {
      if (studentFullIntro) {
        // Grade's previous screen is County/School (setup step 2).
        setStep(2);
        return;
      }
      // Teachers page back through each grade's subject screen before returning to grades.
      if (role === 'teacher' && teacherSubjectGradeIndex > 0) {
        setTeacherSubjectGradeIndex(current => current - 1);
        return;
      }
      if (role === 'parent' && parentSubjectChildIndex > 0) {
        setParentSubjectChildIndex(current => current - 1);
        return;
      }
      setIntroStep(role === 'teacher' || role === 'parent' ? 'roleDetails' : 'gender');
      return;
    }

    if (introStep === 'setup' && step === 1 && includeIntroChoices) {
      if (role === 'parent') {
        // Parent setup order is Country -> County/School -> Children.
        setIntroStep('country');
      } else if (role === 'teacher') {
        // County/School's previous screen for teachers is the country step.
        setIntroStep('country');
      } else {
        setStep(0);
      }
      return;
    }

    setStep(current => current - 1);
  }

  function renderMascotPoseEffect(size: 'header' | 'large' | 'signup' | 'signupCompact' = 'header') {
    const scaleStyle = size === 'large' ? styles.mascotPoseEffectLarge : null;
    const sunglassStyle =
      size === 'signupCompact'
        ? styles.mascotSunglassesSignupCompact
        : size === 'signup'
          ? styles.mascotSunglassesSignup
          : styles.mascotSunglasses;
    const sunglassLensStyle =
      size === 'signupCompact'
        ? styles.mascotSunglassLensSignupCompact
        : size === 'signup'
          ? styles.mascotSunglassLensSignup
          : null;
    const sunglassBridgeStyle =
      size === 'signupCompact'
        ? styles.mascotSunglassBridgeSignupCompact
        : size === 'signup'
          ? styles.mascotSunglassBridgeSignup
          : null;

    if (mascotPose === 'think') {
      return (
        <View pointerEvents="none" style={[styles.mascotPoseEffect, scaleStyle]}>
          <Text style={[styles.mascotThoughtBubble, styles.mascotThoughtBubbleOne]}>?</Text>
          <Text style={[styles.mascotThoughtBubble, styles.mascotThoughtBubbleTwo]}>?</Text>
        </View>
      );
    }

    if (mascotPose === 'sleep') {
      return (
        <View pointerEvents="none" style={[styles.mascotPoseEffect, scaleStyle]}>
          <Text style={styles.mascotSleepBubble}>Zzz</Text>
        </View>
      );
    }

    if (mascotPose === 'cool') {
      return (
        <View pointerEvents="none" style={[styles.mascotPoseEffect, scaleStyle]}>
          <View style={[styles.mascotSunglasses, sunglassStyle]}>
            <View style={[styles.mascotSunglassLens, sunglassLensStyle]} />
            <View style={[styles.mascotSunglassBridge, sunglassBridgeStyle]} />
            <View style={[styles.mascotSunglassLens, sunglassLensStyle]} />
          </View>
        </View>
      );
    }

    if (mascotPose === 'cheer' || mascotPose === 'celebrate') {
      return (
        <View pointerEvents="none" style={[styles.mascotPoseEffect, scaleStyle]}>
          <View style={[styles.mascotConfetti, styles.mascotConfettiOne]} />
          <View style={[styles.mascotConfetti, styles.mascotConfettiTwo]} />
          <View style={[styles.mascotConfetti, styles.mascotConfettiThree]} />
        </View>
      );
    }

    if (mascotPose === 'worried') {
      return (
        <View pointerEvents="none" style={[styles.mascotPoseEffect, scaleStyle]}>
          <Text style={styles.mascotWorryMark}>!</Text>
        </View>
      );
    }

    return null;
  }

  function renderReadyTestimonialCarousel() {
    const activeTestimonial = readyTestimonials[activeReadyTestimonialIndex] ?? readyTestimonials[0];

    return (
      <View accessibilityLabel="Profile ready testimonials" style={styles.readyTestimonialCarousel}>
        <Text style={styles.readyTestimonialText}>{activeTestimonial.quote}</Text>
        <Text style={[styles.readyTestimonialAuthor, { color: content.accent }]}>
          {activeTestimonial.name} - {activeTestimonial.meta}
        </Text>
        <View accessibilityLabel="Profile ready testimonial dots" style={styles.readyTestimonialDots}>
          {readyTestimonials.map((item, index) => {
            const selected = index === activeReadyTestimonialIndex;
            return (
              <Pressable
                accessibilityLabel={`Show testimonial ${index + 1}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={`${item.name}-${item.meta}`}
                onPress={() => {
                  triggerHaptic('selection');
                  setActiveReadyTestimonialIndex(index);
                }}
                style={[
                  styles.readyTestimonialDotButton,
                  selected && { backgroundColor: content.accent, borderColor: content.accent },
                ]}>
                <Text style={styles.readyTestimonialDotText}>{index + 1}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={content.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={styles.decorativeShapes}>
        <View style={[styles.decorativeShape, styles.decorativeShapeTop]} />
        <View style={[styles.decorativeShape, styles.decorativeShapeSide]} />
        <View style={[styles.decorativeShape, styles.decorativeShapeBottom]} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', default: undefined })}
        keyboardVerticalOffset={insets.top}
        style={styles.keyboardWrap}>
        <ScrollView
          ref={scrollViewRef}
          accessibilityLabel="Onboarding setup steps"
          contentContainerStyle={[
            styles.scrollContent,
            compactLayout && styles.scrollContentCompact,
            scrollInsetsStyle,
          ]}
          keyboardDismissMode={Platform.select({ ios: 'interactive', default: 'on-drag' })}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          testID="onboarding-scroll-view">
          {usesCompactIntroNav ? (
            <View style={styles.preMascotNav}>
              <Pressable
                accessibilityLabel={usesRafikiRevealStep ? 'Back to mascot' : 'Back to language'}
                accessibilityRole="button"
                onPress={handleBack}
                style={styles.preMascotBackButton}>
                <Text style={styles.preMascotBackText}>{'←'}</Text>
              </Pressable>
              <View
                accessibilityLabel="Onboarding progress"
                accessibilityRole="progressbar"
                accessibilityLiveRegion="polite"
                accessibilityValue={{ min: 1, max: totalStepCount, now: progressStepNumber, text: progressAnnouncement }}
                style={styles.mascotNavProgressTrack}>
                <LinearGradient
                  colors={[ONBOARDING_COLORS.primary, ONBOARDING_COLORS.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.mascotNavProgressFill,
                    {
                      width: `${Math.max(4, Math.round((progressStepNumber / totalStepCount) * 100))}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.preMascotLangBadge}>{selectedLanguage.code.toUpperCase()}</Text>
            </View>
          ) : null}

          {usesMascotNavBar ? (
            <View
              accessibilityHint="Shows progress, selected mascot, and current language"
              accessibilityLabel="Mascot navigation bar"
              style={styles.mascotNavBar}>
              {canGoBack ? (
                <Pressable
                accessibilityLabel="Back in setup"
                accessibilityRole="button"
                onPress={handleBack}
                style={styles.mascotNavBackButton}
                testID="mascot-nav-back">
                  <Text style={styles.mascotNavBackText}>{'←'}</Text>
                </Pressable>
              ) : (
                <View style={styles.mascotNavBackSpacer} />
              )}
              <View
                accessibilityLabel="Onboarding progress"
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 1, max: totalStepCount, now: progressStepNumber, text: progressAnnouncement }}
                style={styles.mascotNavProgressTrack}>
                <LinearGradient
                  colors={[ONBOARDING_COLORS.primary, ONBOARDING_COLORS.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.mascotNavProgressFill,
                    {
                      width: `${Math.max(4, Math.round((progressStepNumber / totalStepCount) * 100))}%`,
                    },
                  ]}
                />
              </View>
              <Animated.View
                accessibilityLabel={mascotPoseAccessibilityLabel}
                accessibilityRole="image"
                testID="onboarding-mascot-motion"
                style={[
                  styles.mascotNavAvatar,
                  { backgroundColor: activeMascotColors.lightColor, borderColor: `${activeMascotColors.color}44` },
                  mascotMotionStyle,
                ]}>
                <Image
                  accessibilityIgnoresInvertColors
                  accessibilityLabel={activeMascot.label}
                  source={activeMascot.source}
                  resizeMode="contain"
                  style={styles.mascotNavAvatarImage}
                />
              </Animated.View>
              <Text style={styles.mascotNavLangBadge}>{selectedLanguage.code.toUpperCase()}</Text>
            </View>
          ) : null}

          {!usesBrandLanguageStep && !usesCompactIntroNav && !usesMascotNavBar && !usesFullscreenCommitmentStep ? (
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={[styles.title, compactLayout && styles.titleCompact]}>
                  {headerTitle}
                </Text>
                <Text style={[styles.body, compactLayout && styles.bodyCompact]}>{headerBody}</Text>
              </View>
              {!usesMascotNavBar ? (
                <View style={[styles.mascotStage, compactLayout && styles.mascotStageCompact]}>
                <Animated.View
                  accessibilityLabel={mascotPoseAccessibilityLabel}
                  accessibilityRole="image"
                  testID="onboarding-mascot-motion"
                  style={mascotMotionStyle}>
                  <Image
                    accessibilityIgnoresInvertColors
                    accessibilityLabel={activeMascot.label}
                    source={activeMascot.source}
                    resizeMode="contain"
                    style={[styles.mascot, compactLayout && styles.mascotCompact]}
                  />
                  {renderMascotPoseEffect()}
                </Animated.View>
                <Text
                  accessibilityHint="Updates as setup steps change"
                  accessibilityLabel="Mascot coach tip"
                  numberOfLines={1}
                  style={[
                    styles.mascotCoach,
                    compactLayout && styles.mascotCoachCompact,
                    { color: content.accent },
                  ]}>
                  {mascotCoachTip}
                </Text>
              </View>
              ) : null}
            </View>
          ) : null}

          {!usesBrandLanguageStep && !usesMascotNavBar && !usesCompactIntroNav && !usesFullscreenCommitmentStep ? (
            <View
              accessibilityHint="Shows your current onboarding step"
              accessibilityLabel="Onboarding progress"
              accessibilityLiveRegion="polite"
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 1, max: totalStepCount, now: progressStepNumber, text: progressAnnouncement }}
              style={[styles.progressWrap, compactLayout && styles.progressWrapCompact]}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: content.accent }]}>
                  Step {progressStepNumber} of {totalStepCount}
                </Text>
                <Text style={styles.progressTitle}>{progressTitle}</Text>
              </View>
              <View style={styles.progressRow}>
                {Array.from({ length: totalStepCount }, (_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.progressDot,
                      index <= progressIndex && { backgroundColor: content.accent },
                    ]}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {introStep === 'setup' && !includeIntroChoices ? (
            <View
              accessibilityLabel={content.statusLabel}
              accessibilityLiveRegion="polite"
              accessibilityValue={{ text: setupSummaryAnnouncement }}
              role="status"
              style={[styles.summaryPanel, compactLayout && styles.summaryPanelCompact]}>
              {setupSummaryItems.map(item => (
                <View
                  key={item.label}
                  style={[
                    styles.summaryItem,
                    compactLayout && styles.summaryItemCompact,
                    item.complete && {
                      backgroundColor: content.accent,
                      borderColor: content.accent,
                    },
                  ]}>
                  <View style={styles.summaryHeader}>
                    <Text style={[styles.summaryLabel, item.complete && styles.summaryLabelActive]}>
                      {item.label}
                    </Text>
                    {item.complete ? (
                      <View style={styles.summaryCheck} testID="setup-summary-complete">
                        <Check color={ONBOARDING_COLORS.white} size={12} strokeWidth={3} />
                      </View>
                    ) : null}
                  </View>
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.summaryValue,
                      compactLayout && styles.summaryValueCompact,
                      item.complete && styles.summaryValueActive,
                    ]}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View
            style={[
              styles.card,
              schoolStepCompactLayout && styles.cardCompact,
              usesBrandLanguageStep && styles.languageBrandCard,
              usesPreMascotPickerStep && styles.mascotPickerCard,
              usesRafikiRevealStep && styles.rafikiRevealCard,
            ]}>
            {includeIntroChoices && ['language', 'role', 'need', 'goal', 'concerns', 'achieve', 'interests'].includes(introStep) ? (
              <AssessmentNarrationControls
                descriptorId={`onboarding:${introStep}`}
                languageCode={languageCode}
              />
            ) : null}
            {introStep === 'language' ? (
              <>
                <View accessibilityLabel="Kitabu AI brand" style={styles.languageBrandHeader}>
                  <View style={styles.languageLogoRow}>
                    <Text style={styles.languageLogoIcon}>{'\uD83D\uDCDA'}</Text>
                    <Text style={styles.languageWordmark}>Kitabu</Text>
                    <Text style={styles.languageAiBadge}>AI</Text>
                  </View>
                  <Text style={styles.languageTagline}>Mwalimu wako wa nyumbani</Text>
                  <View style={styles.languageDecorDots}>
                    <View style={[styles.languageDecorDot, styles.languageDecorDotOrange]} />
                    <View style={[styles.languageDecorDot, styles.languageDecorDotLime]} />
                    <View style={[styles.languageDecorDot, styles.languageDecorDotGreen]} />
                    <View style={[styles.languageDecorDot, styles.languageDecorDotAmber]} />
                  </View>
                </View>
                <Text style={styles.languagePromptLabel}>Chagua lugha yako {'\u00B7'} Choose your language</Text>
                <View style={styles.languageChoiceGrid}>
                  {LANGUAGE_OPTIONS.map(option => {
                    const selected = languageCode === option.code;
                    const optionCode = option.code.toUpperCase();
                    const greeting = option.code === 'sw' ? 'Karibu!' : 'Welcome!';
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityLabel={`Select ${option.label} language`}
                        accessibilityState={{ checked: selected }}
                        key={option.code}
                        onPress={() => handleLanguageSelect(option.code)}
                        style={[
                          styles.languageChoiceCard,
                          selected && {
                            backgroundColor: ONBOARDING_COLORS.primaryLight,
                            borderColor: ONBOARDING_COLORS.primary,
                          },
                        ]}>
                        {selected ? <Text style={styles.languageSelectedCheck}>{'\u2713'}</Text> : null}
                        <View
                          style={[
                            styles.languageCodeCircle,
                            selected && { backgroundColor: ONBOARDING_COLORS.primary, borderColor: ONBOARDING_COLORS.primary },
                          ]}>
                          <Text style={[styles.languageCodeText, selected && styles.languageCodeTextActive]}>
                            {optionCode}
                          </Text>
                        </View>
                        <Text style={styles.languageChoiceTitle}>
                          {option.label}
                        </Text>
                        <Text style={styles.languageChoiceText}>
                          {option.description}
                        </Text>
                        <Text
                          style={[
                            styles.languageGreetingChip,
                            selected && { backgroundColor: ONBOARDING_COLORS.primary, color: ONBOARDING_COLORS.white },
                          ]}>
                          {greeting}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.languageFooterNote}>Unaweza kubadilisha baadaye {'\u00B7'} You can change this later</Text>
              </>
            ) : null}

            {introStep === 'mascot' ? (
              <>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {swahiliIntro ? 'Chagua mwenzako!' : 'Choose your buddy!'}
                </Text>
                <Text style={[styles.stepText, compactLayout && styles.stepTextCompact]}>
                  {swahiliIntro
                    ? 'Atakuwa pamoja nawe wakati wote wa masomo.'
                    : "They'll be with you every step of the way."}
                </Text>
                <View
                  accessibilityLabel="Mascot options"
                  accessibilityRole="radiogroup"
                  style={styles.mascotChoiceGrid}>
                  {MASCOT_OPTIONS.map(option => {
                    const selected = selectedMascotKey === option.key;
                    const mascotColor = MASCOT_PICKER_COLORS[option.key];
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityLabel={`Choose ${option.name} mascot`}
                        accessibilityState={{ checked: selected }}
                        key={option.key}
                        onPress={() => handleMascotSelect(option.key)}
                        style={[
                          styles.mascotChoice,
                          selected && {
                            backgroundColor: mascotColor.lightColor,
                            borderColor: mascotColor.color,
                          },
                        ]}>
                        <Image
                          accessibilityIgnoresInvertColors
                          accessibilityLabel={option.label}
                          source={option.source}
                          resizeMode="contain"
                          style={styles.mascotChoiceImage}
                        />
                        <Text style={[styles.mascotChoiceTitle, selected && { color: mascotColor.color }]}>
                          {swahiliIntro && option.key === 'rabbit'
                            ? 'Sungura'
                            : swahiliIntro && option.key === 'elephant'
                              ? 'Tembo'
                              : mascotColor.animalLabel}
                        </Text>
                        <Text style={styles.mascotChoiceText}>
                          {option.description}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {introStep === 'rafiki' ? (
              <>
                <View
                  accessibilityLabel={`${activeMascot.name} introduction`}
                  style={styles.rafikiIntroWrap}>
                  <View
                    style={[
                      styles.rafikiImageRing,
                      {
                        backgroundColor: activeMascotColors.lightColor,
                        borderColor: activeMascotColors.color,
                      },
                    ]}>
                    <Image
                      accessibilityIgnoresInvertColors
                      accessibilityLabel={activeMascot.label}
                      source={activeMascot.source}
                      resizeMode="contain"
                      style={styles.rafikiIntroImage}
                    />
                  </View>
                  <View style={[styles.rafikiNamePill, { backgroundColor: activeMascotColors.lightColor, borderColor: activeMascotColors.color }]}>
                    <Text style={[styles.rafikiName, { color: activeMascotColors.color }]}>
                      {activeMascot.name}
                    </Text>
                    <Text style={styles.rafikiSubLabel}>
                      {swahiliIntro ? 'Mwenzako wa masomo' : 'Your study buddy'}
                    </Text>
                  </View>
                </View>
                <View style={styles.rafikiSpeechBubble}>
                  <Text style={styles.rafikiSpeechText}>
                    {swahiliIntro
                      ? `Mimi ni ${activeMascot.name}! Nitakusaidia kujifunza na kufurahia masomo. Twende pamoja! 🚀`
                      : `I'm ${activeMascot.name}! I'm here to make learning fun and help you succeed. Let's go! 🚀`}
                  </Text>
                  <View style={styles.rafikiSpeechTailOuter} />
                  <View style={styles.rafikiSpeechTailInner} />
                </View>
              </>
            ) : null}

            {introStep === 'role' ? (
              <>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {swahiliIntro ? 'Ni nani wewe?' : 'Who are you?'}
                </Text>
                <View
                  accessibilityLabel="Account role options"
                  accessibilityRole="radiogroup"
                  style={styles.roleGrid}>
                  {roleOptions.map(option => {
                    const canChangeRole = Boolean(onRoleChange);
                    // Don't pre-select the default role when the user is free to change it —
                    // they must tap a role first. A locked role (no onRoleChange) stays selected.
                    const selected = option.role === role && (roleChosen || !canChangeRole);
                    const roleLabel = swahiliIntro ? option.swLabel : option.label;
                    const roleDescription = swahiliIntro ? option.swDescription : option.description;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityLabel={`${selected ? 'Selected' : canChangeRole ? 'Choose' : 'Locked'} ${roleLabel} role`}
                        accessibilityHint={
                          selected
                            ? 'This account role is selected'
                            : canChangeRole
                              ? 'Selects this account role for onboarding'
                              : 'Change role from signup before creating an account'
                        }
                        accessibilityState={{ checked: selected, disabled: !selected && !canChangeRole }}
                        disabled={!selected && !canChangeRole}
                        key={option.role}
                        onPress={() => handleRoleSelect(option.role)}
                        style={[
                          styles.roleCard,
                          selected && {
                            backgroundColor: ONBOARDING_COLORS.primaryLight,
                            borderColor: ONBOARDING_COLORS.primary,
                          },
                          !selected && !canChangeRole && styles.roleChoiceLocked,
                        ]}>
                        {selected ? (
                          <View style={styles.roleCardCheck}>
                            <Check color={ONBOARDING_COLORS.white} size={11} strokeWidth={3} />
                          </View>
                        ) : null}
                        <Text style={styles.roleCardIcon}>{option.icon}</Text>
                        <Text style={[styles.roleCardLabel, selected && { color: ONBOARDING_COLORS.primary }]}>
                          {roleLabel}
                        </Text>
                        {roleDescription ? (
                          <Text style={styles.roleCardText}>{roleDescription}</Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {introStep === 'microphone' ? (
              <View
                accessibilityLabel="Microphone access explanation"
                style={[
                  styles.microphonePanel,
                  { borderColor: `${content.accent}55` },
                ]}>
                <Text style={[styles.microphonePanelMainTitle, { color: content.accent }]}>
                  {swahiliIntro ? 'Ruhusu matumizi ya maikrofoni' : 'Allow Microphone Access'}
                </Text>
                <Text style={[styles.microphonePanelTitle, { color: content.accent }]}>
                  {swahiliIntro ? 'Jibu kwa sauti na ujifunze moja kwa moja' : 'Speak your answers and learn live'}
                </Text>
                <Text style={styles.microphonePanelText}>
                  {swahiliIntro
                    ? 'Maikrofoni husaidia majibu ya kuzungumza na mafunzo ya moja kwa moja. Unaweza kuendelea bila ruhusa hii.'
                    : 'Microphone access enables spoken answers and live tutoring. You can continue without it.'}
                </Text>
              </View>
            ) : null}

            {introStep === 'voice' ? (
              <>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {swahiliIntro ? 'Sauti ya mwalimu wako isikike vipi?' : 'How should your tutor sound?'}
                </Text>
                <View
                  testID="voice-orb"
                  style={[styles.voiceOrb, { borderColor: content.accent }]}>
                  <Text style={styles.voiceOrbEmoji}>{'\uD83C\uDF99\uFE0F'}</Text>
                </View>
                <Text style={styles.voiceChooseLabel}>
                  {swahiliIntro ? 'Chagua sauti' : 'Choose a voice'}
                </Text>
                <Text
                  accessibilityLabel="Selected voice name"
                  style={[styles.voiceCurrentName, { color: content.accent }]}>
                  {selectedVoiceName ?? (swahiliIntro ? 'Chagua sauti' : 'Choose voice')}
                </Text>
                <Text style={[styles.stepText, compactLayout && styles.stepTextCompact]}>
                  {voicePreviewingName
                    ? `Playing ${voicePreviewingName}...`
                    : selectedVoiceName && voicePreviewedName === selectedVoiceName
                      ? `${selectedVoiceName} preview complete.`
                      : swahiliIntro ? 'Gusa sauti ili kuisikiza kwanza' : 'Tap a voice to hear it before continuing'}
                </Text>
                <View
                  accessibilityLabel="Voice slider positions"
                  style={styles.voiceSliderTrack}>
                  {VOICE_OPTIONS.map(option => {
                    const selected = !noVoice && selectedVoiceName === option.name;
                    return (
                      <View
                        key={option.name}
                        style={[
                          styles.voiceSliderDot,
                          selected && { backgroundColor: content.accent, borderColor: content.accent },
                        ]}
                        testID={`voice-slider-dot-${option.name}`}
                      />
                    );
                  })}
                </View>
                <View
                  accessibilityLabel="Tutor voice options"
                  accessibilityRole="radiogroup"
                  style={styles.voiceChoiceGrid}>
                  {VOICE_OPTIONS.map(option => {
                    const selected = !noVoice && selectedVoiceName === option.name;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityLabel={`Choose ${option.name} voice`}
                        accessibilityState={{ checked: selected }}
                        key={option.name}
                        onPress={() => handleVoiceSelect(option.name)}
                        style={[
                          styles.voiceChoice,
                          selected && {
                            backgroundColor: content.accent,
                            borderColor: content.accent,
                          },
                        ]}>
                        <Text style={[styles.voiceChoiceTitle, selected && styles.choiceChipTextActive]}>
                          {option.name}
                        </Text>
                        <Text style={[styles.voiceChoiceText, selected && styles.introChoiceTextActive]}>
                          {option.description}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityLabel="Use text only"
                  accessibilityHint="Turns off spoken tutor voice for onboarding"
                  accessibilityState={{ checked: noVoice }}
                  onPress={handleNoVoiceToggle}
                  style={[
                    styles.textOnlyRow,
                    noVoice && {
                      borderColor: content.accent,
                    },
                  ]}>
                  <View style={[styles.textOnlyIcon, { backgroundColor: `${content.accent}1A` }]}>
                    <Text style={[styles.textOnlyIconText, { color: content.accent }]}>Aa</Text>
                  </View>
                  <View style={styles.textOnlyCopy}>
                    <Text style={[styles.textOnlyTitle, noVoice && { color: content.accent }]}>
                      {swahiliIntro ? 'Tumia maandishi tu' : 'Text only'}
                    </Text>
                    <Text style={styles.textOnlyText}>
                      {swahiliIntro ? 'Ongea na mwalimu kwa maandishi.' : 'Chat with your tutor by text.'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.textOnlySwitch,
                      noVoice && { backgroundColor: content.accent },
                    ]}>
                    <View
                      style={[
                        styles.textOnlySwitchKnob,
                        noVoice && styles.textOnlySwitchKnobOn,
                      ]}
                    />
                  </View>
                </Pressable>
              </>
            ) : null}

            {introStep === 'need' ? (
              <>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {needStepCopy.heading}
                </Text>
                <View
                  accessibilityLabel="Need options"
                  accessibilityRole="radiogroup"
                  style={styles.roleGrid}>
                  {needOptions.map(option => {
                    const selected = selectedNeedKey === option.key;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityLabel={`Choose ${option.label}`}
                        accessibilityState={{ checked: selected }}
                        key={option.key}
                        onPress={() => handleNeedSelect(option.key)}
                        style={[
                          styles.roleCard,
                          selected && {
                            backgroundColor: ONBOARDING_COLORS.primaryLight,
                            borderColor: ONBOARDING_COLORS.primary,
                          },
                        ]}>
                        {selected ? (
                          <View style={styles.roleCardCheck}>
                            <Check color={ONBOARDING_COLORS.white} size={11} strokeWidth={3} />
                          </View>
                        ) : null}
                        {role !== 'parent' && option.icon ? (
                          <Text style={styles.roleCardIcon}>{option.icon}</Text>
                        ) : null}
                        <Text
                          style={[
                            styles.roleCardLabel,
                            role === 'parent' && styles.parentPillText,
                            selected && { color: ONBOARDING_COLORS.primary },
                          ]}>
                          {option.label}
                        </Text>
                        {role !== 'parent' && option.description ? (
                          <Text style={styles.roleCardText}>{option.description}</Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {introStep === 'name' ? (
              <>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {swahiliIntro ? 'Jina lako ni nani?' : 'What\'s your name?'}
                </Text>
                <TextInput
                  accessibilityLabel="Your name"
                  autoCapitalize="words"
                  autoComplete="name"
                  autoCorrect={false}
                  onChangeText={handleDisplayNameChange}
                  onSubmitEditing={handleContinue}
                  placeholder={nameStepCopy.placeholder}
                  placeholderTextColor={ONBOARDING_COLORS.textMuted}
                  returnKeyType="next"
                  selectionColor={content.accent}
                  style={[styles.input, styles.profileInput, compactLayout && styles.inputCompact]}
                  textContentType="name"
                  value={displayName}
                />
                <Text style={[styles.stepText, compactLayout && styles.stepTextCompact]}>
                  {displayName.trim() && !isValidDisplayName(displayName)
                    ? swahiliIntro
                      ? 'Tumia jina bila nambari.'
                      : 'Names cannot include numbers.'
                    : nameStepCopy.subText}
                </Text>
              </>
            ) : null}

            {introStep === 'gender' ? (
              <>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {languageCode === 'sw' ? 'Wewe ni wa jinsia gani?' : 'What is your gender?'}
                </Text>
                <Animated.View
                  accessibilityLabel="Gender options"
                  accessibilityRole="radiogroup"
                  style={[
                    styles.needChoiceGrid,
                    styles.genderChoiceGrid,
                    compactLayout && styles.genderChoiceGridCompact,
                    { transform: [{ translateX: genderShakeOffset }] },
                  ]}>
                  {genderOptions.map(option => {
                    const selected = option.value !== 'alien' && gender === option.value;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityLabel={`Select ${option.accessibilityLabel ?? option.label}`}
                        accessibilityState={{ checked: selected }}
                        key={option.value}
                        onPress={() => {
                          if (option.value === 'alien') {
                            handleAlienGenderSelect();
                            return;
                          }

                          handleGenderSelect(option.value);
                        }}
                        style={[
                          styles.introChoiceCard,
                          styles.genderChoiceCard,
                          selected && {
                            backgroundColor: option.bgColor,
                            borderColor: option.accent,
                          },
                        ]}>
                        {selected ? (
                          <View style={[styles.roleCardCheck, { backgroundColor: option.accent }]}>
                            <Check color={ONBOARDING_COLORS.white} size={11} strokeWidth={3} />
                          </View>
                        ) : null}
                        <View style={[styles.genderAvatarBubble, { borderColor: option.accent }]}>
                          <Text style={styles.genderAvatarGlyph}>{option.avatar}</Text>
                        </View>
                        <Text style={[styles.introChoiceTitle, styles.genderChoiceTitle, { color: selected ? option.accent : ONBOARDING_COLORS.textPrimary }]}>
                          {option.label}
                        </Text>
                        <Text style={[styles.introChoiceText, styles.genderChoiceText]}>
                          {option.description}
                        </Text>
                      </Pressable>
                    );
                  })}
                </Animated.View>
              </>
            ) : null}

            {introStep === 'roleDetails' ? (
              <>
                {role === 'teacher' ? (
                  <>
                    <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                      {swahiliIntro ? 'Unafundisha madarasa gani?' : 'Which grades do you teach?'}
                    </Text>
                    <Text style={[styles.stepText, compactLayout && styles.stepTextCompact]}>
                      {swahiliIntro ? 'Chagua yote yanayokufaa.' : 'Select all that apply. This shapes your class shortcuts.'}
                    </Text>
                    <View
                      accessibilityLabel="Teaching grade options"
                      accessibilityRole="list"
                      style={styles.gradeBandGrid}>
                      {TEACHER_GRADE_BANDS.map(band => (
                        <View accessibilityRole="list" key={band.label} style={styles.teacherGradeBand}>
                          <Text style={[styles.teacherGradeBandLabel, { color: content.accent }]}>
                            {band.label}
                          </Text>
                          <View style={styles.teacherGradeBandGrid}>
                            {band.grades.map(option => {
                              const selected = teacherGradeIds.includes(option);
                              const optionLabel = displayGradeChipLabel(option);
                              return (
                                <Pressable
                                  accessibilityRole="button"
                                  accessibilityLabel={`${selected ? 'Remove' : 'Add'} teaching ${optionLabel}`}
                                  accessibilityState={{ selected }}
                                  key={option}
                                  onPress={() => handleTeacherGradeToggle(option)}
                                  style={[
                                    styles.teacherGradeChip,
                                    selected && {
                                      backgroundColor: content.accent,
                                      borderColor: content.accent,
                                    },
                                  ]}>
                                  <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                                    {optionLabel}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      ))}
                    </View>
                    <Text
                      accessibilityLiveRegion="polite"
                      role="status"
                      style={[styles.detailStatusText, { color: content.accent }]}>
                      {teacherGradeIds.length} grade{teacherGradeIds.length === 1 ? '' : 's'} selected {'\u2713'}
                    </Text>
                  </>
                ) : role === 'parent' ? (
                  <>
                    <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                      {swahiliIntro
                        ? 'Niambie kuhusu mtoto/watoto wako'
                        : 'Tell me about your children'}
                    </Text>
                    <Text style={[styles.stepText, compactLayout && styles.stepTextCompact]}>
                      {swahiliIntro
                        ? 'Ongeza hadi watoto 3. Tutaunda mpango wa kibinafsi kwa kila mmoja.'
                        : "Add up to 3 children with their grade. We'll choose subjects for each child next."}
                    </Text>
                    <View style={styles.additionalChildPanel}>
                      <View style={styles.additionalChildHeader}>
                        <Text style={styles.childCardTitle}>
                          {swahiliIntro ? 'Mtoto 1' : 'Child 1'}
                        </Text>
                      </View>
                      <Text style={styles.childFieldLabel}>
                        {swahiliIntro ? 'Jina' : 'Name'}
                      </Text>
                      <TextInput
                        accessibilityLabel="Child name"
                        autoCapitalize="words"
                        autoComplete="name"
                        autoCorrect={false}
                        onChangeText={handleParentChildNameChange}
                        placeholder={swahiliIntro ? 'Jina la mtoto...' : "Child's name..."}
                        placeholderTextColor={ONBOARDING_COLORS.textMuted}
                        returnKeyType="next"
                        selectionColor={content.accent}
                        style={[styles.input, compactLayout && styles.inputCompact]}
                        textContentType="name"
                        value={parentChildName}
                      />
                      <Text style={styles.childFieldLabel}>
                        {swahiliIntro ? 'Umri' : 'Age'}
                      </Text>
                      <Animated.View style={ageShakeStyle(childAgeShakeMotion)}>
                        <TextInput
                          accessibilityLabel="Child age"
                          keyboardType="number-pad"
                          maxLength={2}
                          onChangeText={handleParentChildAgeChange}
                          placeholder={swahiliIntro ? 'Umri...' : 'Age...'}
                          placeholderTextColor={ONBOARDING_COLORS.textMuted}
                          returnKeyType="done"
                          selectionColor={content.accent}
                          style={[
                            styles.input,
                            compactLayout && styles.inputCompact,
                            parentChildAge && !isValidLearnerAge(parentChildAge) && styles.signupInputInvalid,
                          ]}
                          value={parentChildAge}
                        />
                      </Animated.View>
                      {parentChildAge && !isValidLearnerAge(parentChildAge) ? (
                        <Text style={styles.signupFieldError}>{invalidAgeText()}</Text>
                      ) : null}
                      <Text style={styles.childFieldLabel}>
                        {swahiliIntro ? 'Darasa la Sasa' : 'Current grade'}
                      </Text>
                      <View accessibilityLabel="Child grade options" style={styles.childGradeGrid}>
                        {SUPPORTED_GRADES.map(option => {
                          const selected = parentChildGrade === option;
                          return (
                            <Pressable
                              accessibilityRole="radio"
                              accessibilityLabel={`Select child ${option}`}
                              accessibilityState={{ checked: selected }}
                              key={option}
                              onPress={() => handleParentChildGradeSelect(option)}
                              style={[
                                styles.childGradeChip,
                                selected && {
                                  backgroundColor: content.accent,
                                  borderColor: content.accent,
                                },
                              ]}>
                              <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                                {displayGradeLabel(option).replace('Grade ', '')}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                    {additionalParentChildren.map((child, index) => (
                      <View key={index} style={styles.additionalChildPanel}>
                        <View style={styles.additionalChildHeader}>
                          <Text style={styles.childCardTitle}>
                            {swahiliIntro ? `Mtoto ${index + 2}` : `Child ${index + 2}`}
                          </Text>
                          <Pressable
                            accessibilityLabel={`Remove child ${index + 2}`}
                            accessibilityRole="button"
                            onPress={() => handleRemoveParentChild(index)}
                            style={styles.additionalChildRemove}>
                            <X color={ONBOARDING_COLORS.danger} size={16} strokeWidth={2.6} />
                          </Pressable>
                        </View>
                        <Text style={styles.childFieldLabel}>
                          {swahiliIntro ? 'Jina' : 'Name'}
                        </Text>
                        <TextInput
                          accessibilityLabel={`Child ${index + 2} name`}
                          autoCapitalize="words"
                          autoComplete="name"
                          autoCorrect={false}
                          onChangeText={value => handleAdditionalParentChildChange(index, 'name', value)}
                          placeholder={swahiliIntro ? 'Jina la mtoto...' : "Child's name..."}
                          placeholderTextColor={ONBOARDING_COLORS.textMuted}
                          returnKeyType="next"
                          selectionColor={content.accent}
                          style={[styles.input, compactLayout && styles.inputCompact]}
                          textContentType="name"
                          value={child.name}
                        />
                        <Text style={styles.childFieldLabel}>
                          {swahiliIntro ? 'Umri' : 'Age'}
                        </Text>
                        <Animated.View style={ageShakeStyle(childAgeShakeMotion)}>
                          <TextInput
                            accessibilityLabel={`Child ${index + 2} age`}
                            keyboardType="number-pad"
                            maxLength={2}
                            onChangeText={value => handleAdditionalParentChildChange(index, 'age', value)}
                            placeholder={swahiliIntro ? 'Umri...' : 'Age...'}
                            placeholderTextColor={ONBOARDING_COLORS.textMuted}
                            returnKeyType="done"
                            selectionColor={content.accent}
                            style={[
                              styles.input,
                              compactLayout && styles.inputCompact,
                              child.age && !isValidLearnerAge(child.age) && styles.signupInputInvalid,
                            ]}
                            value={child.age}
                          />
                        </Animated.View>
                        {child.age && !isValidLearnerAge(child.age) ? (
                          <Text style={styles.signupFieldError}>{invalidAgeText()}</Text>
                        ) : null}
                        <Text style={styles.childFieldLabel}>
                          {swahiliIntro ? 'Darasa la Sasa' : 'Current grade'}
                        </Text>
                        <View
                          accessibilityLabel={`Child ${index + 2} grade options`}
                          style={styles.childGradeGrid}>
                          {SUPPORTED_GRADES.map(option => {
                            const selected = child.grade === option;
                            return (
                              <Pressable
                                accessibilityRole="radio"
                                accessibilityLabel={`Select child ${index + 2} ${option}`}
                                accessibilityState={{ checked: selected }}
                                key={option}
                                onPress={() => handleAdditionalParentChildChange(index, 'grade', option)}
                                style={[
                                  styles.childGradeChip,
                                  selected && {
                                    backgroundColor: content.accent,
                                    borderColor: content.accent,
                                  },
                                ]}>
                                <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                                  {displayGradeLabel(option).replace('Grade ', '')}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                    {additionalParentChildren.length < 2 ? (
                      <Pressable
                        accessibilityLabel="Add another child"
                        accessibilityRole="button"
                        onPress={handleAddParentChild}
                        style={[styles.addChildButton, { borderColor: content.accent }]}>
                        <View style={styles.addChildButtonInner}>
                          <Plus color={content.accent} size={16} strokeWidth={2.8} />
                          <Text style={[styles.addChildButtonText, { color: content.accent }]}>
                            {swahiliIntro ? 'Ongeza mtoto mwingine' : 'Add another child'}
                          </Text>
                        </View>
                      </Pressable>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                      {ageStepCopy.heading(displayName.trim())}
                    </Text>
                    <Animated.View style={ageShakeStyle(learnerAgeShakeMotion)}>
                      <TextInput
                        accessibilityLabel="Your age"
                        keyboardType="number-pad"
                        maxLength={2}
                        onChangeText={handleAgeChange}
                        onSubmitEditing={handleContinue}
                        placeholder={ageStepCopy.placeholder}
                        placeholderTextColor={ONBOARDING_COLORS.textMuted}
                        returnKeyType="next"
                        selectionColor={content.accent}
                        style={[
                          styles.input,
                          styles.profileInput,
                          compactLayout && styles.inputCompact,
                          age && !isValidLearnerAge(age) && styles.signupInputInvalid,
                        ]}
                        value={age}
                      />
                    </Animated.View>
                    <Text style={[styles.stepText, compactLayout && styles.stepTextCompact]}>
                      {age && !isValidLearnerAge(age)
                        ? invalidAgeText()
                        : ageStepCopy.subText}
                    </Text>
                  </>
                )}
              </>
            ) : null}

            {introStep === 'goal' ? (
              <>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {swahiliIntro
                    ? role === 'teacher'
                      ? 'Lengo lako kuu la ufundishaji ni nini?'
                      : role === 'parent'
                        ? `${parentAnswerChildName} anaendeleaje kwa sasa?`
                        : 'Lengo lako la kustudy ni nini?'
                    : role === 'teacher'
                      ? 'What is your main teaching goal?'
                      : role === 'parent'
                        ? `How is ${parentAnswerChildName} performing right now?`
                        : 'What is your study goal?'}
                </Text>
                <View
                  accessibilityLabel="Goal options"
                  accessibilityRole="radiogroup"
                  style={styles.roleGrid}>
                  {goalOptions.map(option => {
                    const selected = selectedGoalKey === option.key;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityLabel={`Choose goal ${option.label}`}
                        accessibilityState={{ checked: selected }}
                        key={option.key}
                        onPress={() => handleGoalSelect(option.key)}
                        style={[
                          styles.roleCard,
                          role === 'parent' && styles.parentPillCard,
                          option.recommended && styles.goalChoiceRecommended,
                          selected && {
                            backgroundColor: ONBOARDING_COLORS.primaryLight,
                            borderColor: ONBOARDING_COLORS.primary,
                          },
                        ]}>
                        {selected ? (
                          <View style={styles.roleCardCheck}>
                            <Check color={ONBOARDING_COLORS.white} size={11} strokeWidth={3} />
                          </View>
                        ) : null}
                        {option.recommended ? (
                          <Text style={styles.recommendedBadge}>
                            {'⭐ Recommended'}
                          </Text>
                        ) : null}
                        {option.icon ? (
                          <Text style={styles.roleCardIcon}>
                            {option.icon}
                          </Text>
                        ) : null}
                        <Text
                          style={[
                            styles.roleCardLabel,
                            role === 'parent' && styles.parentPillText,
                            selected && { color: ONBOARDING_COLORS.primary },
                          ]}>
                          {option.label}
                        </Text>
                        {option.description ? (
                          <Text style={styles.roleCardText}>
                            {option.description}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {introStep === 'goalConfirm' ? (
              <>
                <Text style={styles.storyHeroEmoji}>{'\uD83D\uDCAA'}</Text>
                <Text style={[styles.storyTag, { color: content.accent }]}>
                  {studentSwahiliIntro ? 'Ni bidii ya kweli!' : "That's real dedication!"}
                </Text>
                <Text style={[styles.goalConfirmSentence, compactLayout && styles.goalConfirmSentenceCompact]}>
                  <Text style={[styles.goalConfirmTime, { color: content.accent }]}>{goalConfirmTime}</Text>
                  {studentSwahiliIntro
                    ? ' kwa siku inakuweka mbele ya wanafunzi wengi. Kitabu AI itahakikisha hakuna dakika inayopotea.'
                    : ' a day puts you ahead of most students. Kitabu AI makes sure none of it goes to waste.'}
                </Text>
                <View
                  style={[
                    styles.socialProofPanel,
                    styles.goalConfirmProofCard,
                    { borderColor: `${content.accent}55` },
                  ]}
                >
                  <Text style={styles.goalConfirmProofIcon}>{'\uD83D\uDC65'}</Text>
                  <Text style={styles.socialProofText}>
                    <Text style={[styles.goalConfirmProofNumber, { color: content.accent }]}>89%</Text>
                    {studentSwahiliIntro
                      ? ' ya wanafunzi wanasema wanafanya zaidi kwa muda mfupi zaidi na Kitabu AI.'
                      : ' of students say they get more done in less time with Kitabu AI.'}
                  </Text>
                </View>
              </>
            ) : null}

            {introStep === 'concerns' ? (
              <>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {swahiliIntro
                    ? role === 'teacher'
                      ? 'Changamoto yako kubwa zaidi ya ufundishaji ni nini?'
                      : role === 'parent'
                        ? 'Ni jambo gani muhimu zaidi kwako sasa hivi?'
                        : role === 'other'
                          ? 'Changamoto yako kuu kwa sasa ni nini?'
                          : 'Changamoto yako kubwa zaidi shuleni ni nini?'
                    : role === 'teacher'
                      ? 'What\'s your biggest teaching challenge?'
                      : role === 'parent'
                        ? 'What matters most to you right now?'
                        : role === 'other'
                          ? 'What\'s your main challenge right now?'
                          : 'What\'s your biggest challenge at school?'}
                </Text>
                <View
                  accessibilityLabel="Concern options"
                  accessibilityRole="radiogroup"
                  style={styles.roleGrid}>
                  {displayedConcernOptions.map(option => {
                    const selected = selectedConcernKey === option.key;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityLabel={`Choose concern ${option.label}`}
                        accessibilityState={{ checked: selected }}
                        key={option.key}
                        onPress={() => handleConcernSelect(option.key)}
                        style={[
                          styles.roleCard,
                          role === 'parent' && styles.parentPillCard,
                          selected && {
                            backgroundColor: ONBOARDING_COLORS.primaryLight,
                            borderColor: ONBOARDING_COLORS.primary,
                          },
                        ]}>
                        {selected ? (
                          <View style={styles.roleCardCheck}>
                            <Check color={ONBOARDING_COLORS.white} size={11} strokeWidth={3} />
                          </View>
                        ) : null}
                        {option.icon ? (
                          <Text style={styles.roleCardIcon}>
                            {option.icon}
                          </Text>
                        ) : null}
                        <Text
                          style={[
                            styles.roleCardLabel,
                            styles.roleCardLabelDense,
                            role === 'parent' && styles.parentPillText,
                            selected && { color: ONBOARDING_COLORS.primary },
                          ]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {introStep === 'achieve' ? (
              <>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {swahiliIntro
                    ? role === 'teacher'
                      ? 'Kitabu AI itafaa vipi kwako?'
                      : role === 'parent'
                        ? `Je, ${parentAnswerChildName} ana simu yake mwenyewe?`
                        : role === 'other'
                          ? 'Unatumaini matokeo gani?'
                          : 'Unataka kufanikisha nini na Kitabu AI?'
                    : role === 'teacher'
                      ? 'What would make Kitabu AI worth it for you?'
                      : role === 'parent'
                        ? `Does ${parentAnswerChildName} have their own phone?`
                        : role === 'other'
                          ? 'What\'s the outcome you\'re hoping for?'
                          : 'What do you want to achieve with Kitabu AI?'}
                </Text>
                <View
                  accessibilityLabel="Achievement options"
                  accessibilityRole="radiogroup"
                  style={styles.roleGrid}>
                  {achievementOptions.map(option => {
                    const selected = selectedAchievementKey === option.key;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityLabel={`Choose achievement ${option.label}`}
                        accessibilityState={{ checked: selected }}
                        key={option.key}
                        onPress={() => handleAchievementSelect(option.key)}
                        style={[
                          styles.roleCard,
                          role === 'parent' && styles.parentPillCard,
                          selected && {
                            backgroundColor: ONBOARDING_COLORS.primaryLight,
                            borderColor: ONBOARDING_COLORS.primary,
                          },
                        ]}>
                        {selected ? (
                          <View style={styles.roleCardCheck}>
                            <Check color={ONBOARDING_COLORS.white} size={11} strokeWidth={3} />
                          </View>
                        ) : null}
                        {option.icon ? (
                          <Text style={styles.roleCardIcon}>
                            {option.icon}
                          </Text>
                        ) : null}
                        <Text
                          style={[
                            styles.roleCardLabel,
                            styles.roleCardLabelDense,
                            role === 'parent' && styles.parentPillText,
                            selected && { color: ONBOARDING_COLORS.primary },
                          ]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {introStep === 'painBefore' ? (
              <>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {studentSwahiliIntro ? 'Usiku kabla ya mtihani wa KNEC...' : 'The night before an exam...'}
                </Text>
                <Text style={styles.storyHeroEmoji}>{'\uD83E\uDD2F'}</Text>
                <Text style={styles.storyTag}>
                  {studentSwahiliIntro ? 'BILA KITABU AI' : 'WITHOUT KITABU AI'}
                </Text>
                <View style={styles.needChoiceGrid}>
                  {[
                    {
                      icon: '\uD83D\uDCDA',
                      label: studentSwahiliIntro ? 'Ninapata wasiwasi wakati wa mitihani' : 'I get anxious when we have exams',
                    },
                    {
                      icon: '\uD83D\uDE30',
                      label: studentSwahiliIntro ? 'Natamani ningekuwa na revision partner' : 'I wish I could have a revision partner',
                    },
                    {
                      icon: '❓',
                      label: studentSwahiliIntro ? 'Notes zinaweza kuchosha kusoma' : 'Notes can be overwhelming to read',
                    },
                  ].map(item => (
                    <View key={item.label} style={[styles.needChoice, styles.storyPanelDanger, styles.storyPanelRow]}>
                      <Text style={styles.storyPanelIcon}>{item.icon}</Text>
                      <Text style={[styles.storyPanelText, styles.storyPanelDangerText]}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {introStep === 'painAfter' ? (
              <>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {studentSwahiliIntro ? 'Usiku kabla ya mtihani wako...' : 'The night before your exam...'}
                </Text>
                <Text style={styles.storyHeroEmoji}>{'\uD83D\uDE0C'}</Text>
                <Text style={[styles.storyTag, { color: content.accent }]}>
                  {studentSwahiliIntro ? 'NA KITABU AI' : 'WITH KITABU AI'}
                </Text>
                <View style={styles.needChoiceGrid}>
                  {[
                    studentSwahiliIntro ? 'Kitabu hukupa mpango wazi wa masomo na karatasi za revision' : 'Kitabu Gives You a Clear Study Plan and Revision Papers',
                    studentSwahiliIntro ? 'Rafiki ni revision partner wako anayepatikana kila wakati' : 'Rafiki is Your Always Available Revision Partner',
                    studentSwahiliIntro ? 'Tunakuonyesha maeneo dhaifu na jinsi ya kuyarekebisha' : 'We Give You an Analysis that shows Your Weak Areas and How to Fix them',
                  ].map(item => (
                    <View key={item} style={[styles.needChoice, styles.storyPanelSuccess, styles.storyPanelRow]}>
                      <Text style={styles.storyPanelIcon}>{'\u2705'}</Text>
                      <Text style={[styles.storyPanelText, styles.storyPanelSuccessText]}>{item}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {introStep === 'socialProof' ? (
              <>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {studentSwahiliIntro ? 'Ni bidii ya kweli!' : 'Learners improve faster with guided practice.'}
                </Text>
                <View style={[styles.socialProofPanel, { borderColor: `${content.accent}55` }]}>
                  <Text style={[styles.socialProofNumber, { color: content.accent }]}>
                    {studentSwahiliIntro ? '89%' : 'D to B+'}
                  </Text>
                  <Text style={styles.socialProofText}>
                    {studentSwahiliIntro
                      ? 'Ya wanafunzi wanasema wanafanya zaidi kwa muda mfupi zaidi na Kitabu AI.'
                      : 'A parent in the reference flow describes one learner improving within a term after using guided study support.'}
                  </Text>
                </View>
                {studentSwahiliIntro ? (
                  <Text style={[styles.stepText, compactLayout && styles.stepTextCompact]}>
                    Dakika 15 kwa siku, uko mbele ya wanafunzi wengi. Kitabu AI itahakikisha hakuna dakika inayopotea.
                  </Text>
                ) : (
                <View style={styles.comparisonRows}>
                  <View style={styles.comparisonRow}>
                    <Text style={styles.comparisonLabel}>Before Kitabu</Text>
                    <View style={styles.comparisonTrack}>
                      <View style={[styles.comparisonFill, styles.comparisonFillCurrent, { backgroundColor: ONBOARDING_COLORS.textMuted }]} />
                    </View>
                  </View>
                  <View style={styles.comparisonRow}>
                    <Text style={[styles.comparisonLabel, { color: content.accent }]}>With Kitabu</Text>
                    <View style={styles.comparisonTrack}>
                      <View style={[styles.comparisonFill, styles.comparisonFillKitabu, { backgroundColor: content.accent }]} />
                    </View>
                  </View>
                </View>
                )}
              </>
            ) : null}

            {introStep === 'resultProof' ? (
              <View accessibilityLabel={`${role} Good News plan`} style={styles.goodNewsStudioPage}>
                <View style={styles.goodNewsHeroCluster}>
                  <View style={styles.goodNewsCopyColumn}>
                    <LinearGradient
                      colors={['#DDF7EB', '#BEEED9']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.goodNewsBadge}>
                      <Text style={styles.goodNewsBadgeIcon}>{goodNewsPlan.badgeIcon}</Text>
                      <Text style={styles.goodNewsBadgeText}>{goodNewsPlan.badge}</Text>
                    </LinearGradient>
                    <View style={styles.goodNewsHeadlineWrap}>
                      <Text style={styles.goodNewsHeadlineAccent}>{goodNewsPlan.headlineAccent}</Text>
                      <Text
                        adjustsFontSizeToFit
                        minimumFontScale={0.72}
                        numberOfLines={1}
                        style={styles.goodNewsHeadlineRest}>
                        {goodNewsPlan.headlineRest.trimStart()}
                      </Text>
                    </View>
                    <Text style={styles.goodNewsBody}>{goodNewsPlan.body}</Text>
                  </View>

                  <View
                    accessibilityLabel={goodNewsPlan.photoLabel}
                    accessibilityRole="image"
                    style={styles.goodNewsPhotoFrame}>
                    <View style={styles.goodNewsPhotoHalo} />
                    <Image source={goodNewsPlan.photo} resizeMode="cover" style={styles.goodNewsPhoto} />
                    <View style={[styles.goodNewsMascotBubble, { borderColor: activeMascotColors.color }]}>
                      <Image
                        accessibilityLabel={activeMascot.label}
                        source={activeMascot.source}
                        resizeMode="contain"
                        style={styles.goodNewsMascotImage}
                      />
                    </View>
                    <View style={styles.goodNewsSubjectStack}>
                      {goodNewsPlan.subjectLabels.map((subjectLabel, index) => (
                        <View
                          key={`${subjectLabel}-${index}`}
                          style={[
                            styles.goodNewsSubjectBook,
                            index === 0
                              ? styles.goodNewsSubjectBookGreen
                              : index === 1
                                ? styles.goodNewsSubjectBookBlue
                                : styles.goodNewsSubjectBookGold,
                          ]}>
                          <Text style={styles.goodNewsSubjectBookText} numberOfLines={1}>
                            {subjectLabel}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={styles.goodNewsPathCard}>
                  <Text style={styles.goodNewsPathTitle}>
                    {role === 'teacher'
                      ? swahiliIntro
                        ? 'Njia ya kuinua darasa'
                        : 'Your class improvement path'
                      : role === 'parent'
                        ? swahiliIntro
                          ? 'Njia ya maendeleo ya mtoto'
                          : 'Your child improvement path'
                        : swahiliIntro
                          ? 'Njia yako ya kuboresha'
                          : 'Your improvement path'}
                  </Text>
                  <View style={styles.goodNewsPathBody}>
                    <View style={styles.goodNewsGradeBlock}>
                      <Text style={styles.goodNewsGradeBlockLabel}>{goodNewsPlan.beforeLabel}</Text>
                      <Text style={styles.goodNewsGradeBlockValue}>{goodNewsPlan.beforeValue}</Text>
                    </View>
                    <View style={styles.goodNewsPathArrowArea}>
                      <Svg width="112" height="54" viewBox="0 0 112 54" style={styles.goodNewsPathArrow}>
                        <Path
                          d="M4 44 C34 12 69 6 101 16"
                          fill="none"
                          stroke="#1687F5"
                          strokeLinecap="round"
                          strokeWidth="6"
                        />
                        <Path d="M98 3 L111 18 L92 24 Z" fill="#18C777" />
                      </Svg>
                      <Text style={[styles.goodNewsMidpoint, { color: content.accent }]}>{goodNewsPlan.midpoint}</Text>
                    </View>
                    <LinearGradient
                      colors={['#35D895', '#1EBF79']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.goodNewsGradeBlockAfter}>
                      <Text style={styles.goodNewsGradeBlockAfterLabel}>{goodNewsPlan.afterLabel}</Text>
                      <Text style={styles.goodNewsGradeBlockAfterValue}>{goodNewsPlan.afterValue}</Text>
                    </LinearGradient>
                  </View>
                  <View style={styles.goodNewsProgressRail}>
                    <View style={styles.goodNewsProgressDotMuted} />
                    <View style={styles.goodNewsProgressLine} />
                    <View style={styles.goodNewsProgressDotActive} />
                  </View>
                  <Text style={styles.goodNewsProgressCaption}>{goodNewsPlan.progressCaption}</Text>
                </View>

                <View style={styles.goodNewsBenefitGrid}>
                  {goodNewsPlan.benefits.map(benefit => (
                    <View key={benefit.key} style={[styles.goodNewsBenefitCard, { borderTopColor: benefit.accent }]}>
                      <LinearGradient
                        colors={[benefit.accent, `${benefit.accent}CC`]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.goodNewsBenefitIconBubble}>
                        <Text style={styles.goodNewsBenefitIcon}>{benefit.icon}</Text>
                      </LinearGradient>
                      <Text style={styles.goodNewsBenefitTitle}>{benefit.title}</Text>
                      <Text style={styles.goodNewsBenefitBody}>{benefit.body}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.goodNewsSupportCard, { borderColor: `${content.accent}40` }]}>
                  <Text style={[styles.goodNewsSupportMark, { color: content.accent }]}>{'\u2713'}</Text>
                  <Text style={styles.goodNewsSupportText}>{goodNewsPlan.supportLine}</Text>
                </View>
              </View>
            ) : null}

            {introStep === 'country' ? (
              <>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {swahiliIntro
                    ? role === 'teacher'
                      ? 'Unafundisha katika nchi hii?'
                      : role === 'parent'
                        ? 'Familia yako iko katika nchi hii?'
                      : 'Unasomea katika nchi hii?'
                    : role === 'teacher'
                      ? 'Are you teaching in this country?'
                      : role === 'parent'
                        ? 'Is your family in this country?'
                      : 'Are you studying in this country?'}
                </Text>
                <Text
                  accessibilityLabel={`${selectedCountry.name} flag`}
                  style={styles.countryFlagEmoji}>
                  {selectedCountry.flag}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Country: ${selectedCountry.name}. Tap to change`}
                  onPress={() => setCountryPickerOpen(true)}
                  style={[styles.countryPill, { borderColor: content.accent }]}>
                  <Text style={[styles.countryPillText, { color: content.accent }]}>
                    {selectedCountry.name} {'▾'}
                  </Text>
                </Pressable>
                {role === 'teacher' ? null : (
                  <View style={[styles.socialProofPanel, styles.countryInfoCard, { borderColor: `${content.accent}55` }]}>
                    <Text style={[styles.needChoiceTitle, { color: ONBOARDING_COLORS.textPrimary }]}>
                      {'\uD83D\uDCDA '}
                      {selectedCountry.curriculum}
                    </Text>
                    <Text style={styles.needChoiceText}>
                      {swahiliIntro
                        ? role === 'parent'
                          ? `Tutafuatilia masomo ya mtoto wako kwa mtaala rasmi wa ${selectedCountry.curriculum}.`
                          : `Nitahakikisha masomo yako yanafuata mtaala rasmi wa ${selectedCountry.curriculum} - maswali halisi ya mitihani, mada sahihi.`
                        : role === 'parent'
                          ? `We'll track your child's learning against the official ${selectedCountry.curriculum} so progress reports stay relevant.`
                          : `I'll make sure your studies align with the official ${selectedCountry.curriculum} \u2014 real exam questions, the right topics.`}
                    </Text>
                  </View>
                )}

                <Modal
                  animationType="fade"
                  onRequestClose={() => setCountryPickerOpen(false)}
                  transparent
                  visible={countryPickerOpen}>
                  <Pressable style={styles.pickerBackdrop} onPress={() => setCountryPickerOpen(false)}>
                    <Pressable style={styles.pickerSheet} onPress={() => undefined}>
                      <ScrollView keyboardShouldPersistTaps="handled" style={styles.pickerList}>
                        {COUNTRY_OPTIONS.map(option => (
                          <Pressable
                            accessibilityRole="button"
                            key={option.code}
                            onPress={() => {
                              triggerHaptic('selection');
                              if (option.code !== countryCode) {
                                // Region and school belong to the previous country, so reset them.
                                setCounty('');
                                setSchoolId('');
                                setSchoolQuery('');
                              }
                              setCountryCode(option.code);
                              setCountryPickerOpen(false);
                            }}
                            style={styles.pickerRow}>
                            <Text
                              style={[
                                styles.pickerRowText,
                                countryCode === option.code && styles.pickerRowTextActive,
                                countryCode === option.code && { color: content.accent },
                              ]}>
                              {option.flag}  {option.name}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </Pressable>
                  </Pressable>
                </Modal>
              </>
            ) : null}

            {introStep === 'interests' ? (
              <>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {swahiliIntro ? 'Mambo unayopenda?' : 'What are your interests?'}
                </Text>
                <Text style={[styles.stepText, compactLayout && styles.stepTextCompact]}>
                  {swahiliIntro
                    ? 'Tutafanya maudhui ya masomo kulingana na unayopenda.'
                    : "We'll create study content you'll actually enjoy."}
                </Text>
                <View style={[styles.roleGrid, styles.interestGrid]}>
                  {interestOptions.map(option => {
                    const selected = selectedInterestKeys.includes(option.key);
                    const interestLabel = swahiliIntro ? option.swLabel ?? option.label : option.label;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${selected ? 'Remove' : 'Add'} interest ${option.label}`}
                        accessibilityState={{ selected }}
                        key={option.key}
                        onPress={() => handleInterestToggle(option.key)}
                        style={[
                           styles.roleCard,
                           styles.interestCard,
                          selected && {
                            backgroundColor: ONBOARDING_COLORS.primaryLight,
                            borderColor: ONBOARDING_COLORS.primary,
                          },
                        ]}>
                        {selected ? (
                          <View style={styles.roleCardCheck}>
                            <Check color={ONBOARDING_COLORS.white} size={11} strokeWidth={3} />
                          </View>
                        ) : null}
                        {option.icon ? <Text style={styles.roleCardIcon}>{option.icon}</Text> : null}
                        <Text style={[styles.roleCardLabel, selected && { color: ONBOARDING_COLORS.primary }]}>
                          {interestLabel}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {introStep === 'reminder' ? (
              <>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {reminderQuestion}
                </Text>
                <View
                  accessibilityLabel="Daily study reminder preview"
                  accessibilityRole="image"
                  style={styles.reminderPhoneMockup}
                  testID="reminder-phone-mockup">
                  <View style={styles.reminderPhoneStatus}>
                    <Text style={styles.reminderPhoneStatusText}>13:24</Text>
                    <View style={styles.reminderPhoneNotch} />
                    <Text style={styles.reminderPhoneStatusText}>91%</Text>
                  </View>
                  <View style={styles.reminderNotificationCard}>
                    <View style={[styles.reminderAppIcon, { backgroundColor: content.accent }]}>
                      <Text style={styles.reminderAppIconText}>K</Text>
                    </View>
                    <View style={styles.reminderNotificationCopy}>
                      <View style={styles.reminderNotificationHeader}>
                        <Text style={styles.reminderAppName}>Kitabu AI</Text>
                        <Text style={styles.reminderTimestamp}>{swahiliIntro ? 'sasa hivi' : 'just now'}</Text>
                      </View>
                      <View style={styles.reminderNotificationBody}>
                        <Image
                          accessibilityIgnoresInvertColors
                          accessibilityLabel={`${activeMascot.name} reminder avatar`}
                          resizeMode="contain"
                          source={activeMascot.source}
                          style={styles.reminderMascotAvatar}
                        />
                        <View style={styles.reminderNotificationTextBlock}>
                          <Text style={styles.reminderNotificationTitle}>
                            {swahiliIntro
                              ? role === 'teacher'
                                ? `${displayName.trim() || 'Mwalimu'}, kazi 24 ziko tayari kusahihishwa. \uD83D\uDCDD`
                                : role === 'parent'
                                  ? `${displayName.trim() || 'Mzazi'}, ripoti ya maendeleo ya ${primaryParentChild.name || 'mtoto wako'} iko tayari. \uD83D\uDCCA`
                                : `${displayName.trim() || 'Rafiki'}, mtihani wako wa Hesabu ni kesho. \uD83D\uDE80`
                              : role === 'teacher'
                                ? `${displayName.trim() || 'Teacher'}, 24 assignments are ready to review. \uD83D\uDCDD`
                                : role === 'parent'
                                  ? `${displayName.trim() || 'Parent'}, ${primaryParentChild.name || 'your child'}'s progress report is ready. \uD83D\uDCCA`
                                : `${displayName.trim() || 'Friend'}, your Maths exam is tomorrow. \uD83D\uDE80`}
                          </Text>
                          <Text style={styles.reminderNotificationText}>
                            {swahiliIntro
                              ? role === 'teacher'
                                ? 'Tuangalie maendeleo ya darasa!'
                                : role === 'parent'
                                  ? 'Angalia nguvu, mapengo, na hatua inayofuata.'
                                  : 'Twende tujiandae pamoja!'
                              : role === 'teacher'
                                ? "Let's keep the class on track!"
                                : role === 'parent'
                                  ? 'See strengths, gaps, and what to support next.'
                                  : "Let's get ready together!"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={styles.reminderBenefitStrip}>
                  {(role === 'teacher'
                    ? swahiliIntro
                      ? [
                          { icon: '\uD83D\uDDD3\uFE0F', label: 'Uko ratiba' },
                          { icon: '\uD83D\uDCCA', label: 'Taswira ya darasa' },
                          { icon: '\u23F1\uFE0F', label: 'Kazi pungufu' },
                        ]
                      : [
                          { icon: '\uD83D\uDDD3\uFE0F', label: 'On schedule' },
                          { icon: '\uD83D\uDCCA', label: 'Class insights' },
                          { icon: '\u23F1\uFE0F', label: 'Less admin' },
                        ]
                    : role === 'parent'
                      ? swahiliIntro
                        ? [
                            { icon: '\uD83D\uDCCA', label: 'Ripoti za maendeleo' },
                            { icon: '\uD83D\uDD0D', label: 'Mapengo ya kujifunza' },
                            { icon: '\uD83D\uDCDD', label: 'Msaada wa homework' },
                          ]
                        : [
                            { icon: '\uD83D\uDCCA', label: 'Progress reports' },
                            { icon: '\uD83D\uDD0D', label: 'Learning gaps' },
                            { icon: '\uD83D\uDCDD', label: 'Homework support' },
                          ]
                    : swahiliIntro
                      ? [
                          { icon: '\uD83D\uDD25', label: 'Mfululizo wa siku' },
                          { icon: '\uD83D\uDCC8', label: 'Alama bora' },
                          { icon: '\uD83E\uDDE0', label: 'Kaa makini' },
                        ]
                      : [
                          { icon: '\uD83D\uDD25', label: 'Daily streak' },
                          { icon: '\uD83D\uDCC8', label: 'Better grades' },
                          { icon: '\uD83E\uDDE0', label: 'Stay sharp' },
                        ]
                  ).map(item => (
                    <View key={item.label} style={styles.reminderBenefitCard}>
                      <Text style={styles.reminderBenefitIcon}>{item.icon}</Text>
                      <Text style={styles.reminderBenefitText}>{item.label}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.reminderFooterCaption}>
                  {swahiliIntro
                    ? role === 'teacher'
                      ? 'Vikumbusho hukusaidia kusimamia kila darasa kwa urahisi.'
                      : role === 'parent'
                        ? 'Vikumbusho hukusaidia kufuatilia maendeleo ya mtoto bila kusubiri report form.'
                      : 'Vikumbusho husaidia wanafunzi kutunza tabia ya kujifunza kila siku.'
                    : role === 'teacher'
                      ? 'Reminders help you stay on top of every class.'
                      : role === 'parent'
                        ? 'Reminders help you receive progress reports and support your child before small gaps become big surprises.'
                      : 'Reminders help students stay consistent every day.'}
                </Text>
              </>
            ) : null}

            {introStep === 'setup' && (step === 0 || (studentFullIntro && step === 1)) ? (
              <>
                <Text
                  style={[
                    styles.stepTitle,
                    compactLayout && styles.stepTitleCompact,
                  ]}>
                  {swahiliIntro
                    ? role === 'teacher'
                      ? 'Unafundisha masomo gani?'
                      : role === 'parent'
                        ? `Mtoto huyu anasoma masomo gani?`
                      : step === 1
                        ? 'Unasoma masomo gani?'
                      : 'Uko darasa gani?'
                    : role === 'teacher' && includeIntroChoices
                      ? 'Which subjects do you teach?'
                      : role === 'parent' && includeIntroChoices
                        ? `Which subjects should we track for ${currentParentSubjectChild.name || 'this child'}?`
                      : step === 1
                        ? 'Select the subjects you study'
                      : usesLearnerFlow && includeIntroChoices
                        ? 'Which grade are you in?'
                      : content.stepOneTitle}
                </Text>
                {isTeacherSubjectFlow && currentTeacherSubjectGrade ? (
                  <View
                    accessibilityLabel="Subject grade context"
                    style={[styles.subjectGradeBadge, { borderColor: content.accent, backgroundColor: ONBOARDING_COLORS.accentLight }]}>
                    <Text style={[styles.subjectGradeBadgeText, { color: content.accent }]}>
                      {currentTeacherSubjectGrade}
                    </Text>
                  </View>
                ) : null}
                {isParentSubjectFlow && currentParentSubjectChild.grade ? (
                  <View
                    accessibilityLabel="Subject child context"
                    style={[styles.subjectGradeBadge, { borderColor: content.accent, backgroundColor: ONBOARDING_COLORS.accentLight }]}>
                    <Text style={[styles.subjectGradeBadgeText, { color: content.accent }]}>
                      {(currentParentSubjectChild.name || `Child ${parentSubjectChildIndex + 1}`)} · {currentParentSubjectChild.grade}
                    </Text>
                  </View>
                ) : null}
                {isTeacherSubjectFlow ? null : (
                  <Text style={[styles.stepText, compactLayout && styles.stepTextCompact]}>
                    {swahiliIntro
                      ? role === 'parent'
                        ? 'Chagua masomo ya kufuatilia kwenye ripoti za maendeleo.'
                        : step === 1
                        ? 'Chagua masomo yako ya CBC. Unaweza kuruka na kuongeza baadaye.'
                        : 'Tutaandaa maudhui yanayofaa mtaala wako wa CBC.'
                      : role === 'parent'
                        ? 'Pick the subjects you want progress reports, weak-area alerts, and homework support for.'
                        : step === 1
                        ? 'Pick all that apply. You can add more later.'
                        : usesLearnerFlow && includeIntroChoices
                          ? 'We\'ll prepare content that matches your CBC curriculum.'
                          : content.stepOneText}
                  </Text>
                )}
                {!includeIntroChoices && !(studentFullIntro && step === 1) ? (
                  <View style={[styles.benefitRow, compactLayout && styles.benefitRowCompact]}>
                    {content.stepOneBenefits.map(benefit => (
                      <View
                        key={benefit}
                        style={[
                          styles.benefitChip,
                          compactLayout && styles.benefitChipCompact,
                          { borderColor: content.accent },
                        ]}>
                        <Text
                          style={[
                            styles.benefitText,
                            compactLayout && styles.benefitTextCompact,
                            { color: content.accent },
                          ]}>
                          {benefit}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {usesLearnerFlow && !includeIntroChoices ? (
                  <>
                    <Text style={[styles.fieldLabel, compactLayout && styles.fieldLabelCompact]}>
                      Gender
                    </Text>
                    <View
                      accessibilityLabel="Gender options"
                      accessibilityRole="radiogroup"
                      style={styles.choiceRow}>
                      {[
                        { label: 'Girl', value: 'female' as const },
                        { label: 'Boy', value: 'male' as const },
                        { label: 'Skip', value: 'not_specified' as const },
                      ].map(option => (
                        <Pressable
                          accessibilityRole="radio"
                          accessibilityLabel={`Select ${option.label}`}
                          accessibilityState={{ checked: gender === option.value }}
                          key={option.value}
                          onPress={() => handleGenderSelect(option.value)}
                          style={[
                            styles.choiceChip,
                            compactLayout && styles.choiceChipCompact,
                            gender === option.value && {
                              backgroundColor: content.accent,
                              borderColor: content.accent,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.choiceChipText,
                              gender === option.value && styles.choiceChipTextActive,
                            ]}>
                            {option.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                ) : null}

                {(role !== 'teacher' || !includeIntroChoices) && step === 0 && !isParentSubjectFlow ? (
                  <>
                    {!(usesLearnerFlow && includeIntroChoices) ? (
                      <Text style={[styles.fieldLabel, compactLayout && styles.fieldLabelCompact]}>
                        {swahiliIntro ? (role === 'teacher' ? 'Madarasa' : 'Darasa lako') : content.gradeLabel}
                      </Text>
                    ) : null}
                    <View
                      accessibilityLabel={`${content.gradeLabel} options`}
                      accessibilityRole="radiogroup"
                      style={usesLearnerFlow && includeIntroChoices ? styles.gradeGrid : styles.choiceRow}>
                      {SUPPORTED_GRADES.map(option => {
                        const gradeSelected = grade === option;
                        const usePrdGrade = usesLearnerFlow && includeIntroChoices;
                        const optionLabel = displayGradeChipLabel(option);
                        return (
                        <Pressable
                          accessibilityRole="radio"
                          accessibilityLabel={`Select ${optionLabel}`}
                          accessibilityState={{ checked: gradeSelected }}
                          key={option}
                          onPress={() => handleGradeSelect(option)}
                          style={[
                            usePrdGrade ? styles.gradeCell : styles.choiceChip,
                            !usePrdGrade && compactLayout && styles.choiceChipCompact,
                            gradeSelected && {
                              backgroundColor: content.accent,
                              borderColor: content.accent,
                            },
                          ]}>
                          {usePrdGrade && gradeSelected ? (
                            <Text style={styles.gradeCellCheck}>{'✓'}</Text>
                          ) : null}
                          <Text
                            style={[
                              usePrdGrade ? styles.gradeCellText : styles.choiceChipText,
                              gradeSelected && styles.choiceChipTextActive,
                            ]}>
                            {swahiliIntro
                              ? role === 'teacher'
                                ? optionLabel.replace('Grade ', 'Dar. ')
                                : optionLabel.replace('Grade ', 'Darasa la ')
                              : optionLabel}
                          </Text>
                        </Pressable>
                        );
                      })}
                    </View>
                    {usesLearnerFlow && includeIntroChoices && activeGradeBand ? (
                      <View
                        accessibilityLabel="Selected grade band"
                        style={[
                          styles.gradeBandIndicator,
                          {
                            backgroundColor: ONBOARDING_COLORS.primaryLight,
                            borderColor: ONBOARDING_COLORS.primary,
                          },
                        ]}>
                        <Text style={styles.gradeBandIndicatorIcon}>{'\uD83D\uDCCB'}</Text>
                        <Text style={[styles.gradeBandIndicatorText, { color: ONBOARDING_COLORS.primary }]}>
                          {displayGradeBandLabel(grade, languageCode ?? 'en')}
                        </Text>
                      </View>
                    ) : null}
                  </>
                ) : null}

                {subjectPreferenceLabel &&
                subjectPreferenceText &&
                (!usesLearnerFlow || !includeIntroChoices || step === 1 || isParentSubjectFlow) ? (
                  <>
                    {usesLearnerFlow && includeIntroChoices && !isParentSubjectFlow ? null : role === 'teacher' || role === 'parent' ? (
                      // Teacher subjects screen: the title already says it all, so we
                      // only surface the running selection count to avoid repetition.
                      selectedSubjectCount > 0 ? (
                        <View style={[styles.subjectHeaderRow, styles.subjectHeaderRowEnd]}>
                          <Text
                            accessibilityLiveRegion="polite"
                            role="status"
                            style={[styles.subjectCount, { color: content.accent }]}>
                            {`${selectedSubjectCount} selected \u2713`}
                          </Text>
                        </View>
                      ) : null
                    ) : (
                      <>
                        <View style={styles.subjectHeaderRow}>
                          <Text style={[styles.fieldLabel, compactLayout && styles.fieldLabelCompact]}>
                            {swahiliIntro ? 'Masomo yako' : subjectPreferenceLabel}
                          </Text>
                          <Text
                            accessibilityLiveRegion="polite"
                            role="status"
                            style={[styles.subjectCount, { color: content.accent }]}>
                            {`${selectedSubjectCount}/${MAX_ONBOARDING_SUBJECTS}`}
                          </Text>
                        </View>
                        <Text style={[styles.subjectHelpText, compactLayout && styles.subjectHelpTextCompact]}>
                          {swahiliIntro
                            ? 'Chagua yote yanayokufaa. Unaweza kuongeza zaidi baadaye.'
                            : subjectPreferenceText}
                        </Text>
                      </>
                    )}
                    <View
                      accessibilityLabel={subjectPreferenceLabel}
                      accessibilityRole="list"
                      style={styles.subjectChipRow}>
                      {subjectSections.map(section =>
                        section.options.length > 0 ? (
                          <View key={section.key} style={styles.subjectSection}>
                            {section.label ? (
                              <Text
                                style={[
                                  styles.subjectSectionLabel,
                                  { color: section.core ? ONBOARDING_COLORS.accent : content.accent },
                                ]}>
                                {section.label}
                              </Text>
                            ) : null}
                            <View style={styles.subjectChipRow}>
                              {section.options.map(subject => {
                                const selected = isTeacherSubjectFlow
                                  ? currentTeacherGradeSubjectIds.includes(subject.id)
                                  : isParentSubjectFlow
                                    ? currentParentSubjectIds.includes(subject.id)
                                  : selectedSubjectIds.includes(subject.id);
                                const disabled =
                                  role !== 'teacher' &&
                                  role !== 'parent' &&
                                  !(usesLearnerFlow && includeIntroChoices) &&
                                  !selected &&
                                  selectedSubjectCount >= MAX_ONBOARDING_SUBJECTS;
                                return (
                                  <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={`${selected ? 'Remove' : 'Add'} ${subject.name}`}
                                    accessibilityState={{ disabled, selected }}
                                    disabled={disabled}
                                    key={subject.id}
                                    onPress={() =>
                                      isTeacherSubjectFlow
                                        ? handleTeacherSubjectToggle(subject.id)
                                        : isParentSubjectFlow
                                          ? handleParentSubjectToggle(subject.id)
                                        : handleSubjectToggle(subject.id)
                                    }
                                    style={[
                                      styles.subjectChip,
                                      compactLayout && styles.subjectChipCompact,
                                      section.core && styles.subjectChipCore,
                                      selected && {
                                        backgroundColor: content.accent,
                                        borderColor: content.accent,
                                      },
                                      disabled && styles.subjectChipDisabled,
                                    ]}>
                                    <Text
                                      style={[
                                        styles.subjectChipText,
                                        section.core && styles.subjectChipCoreText,
                                        selected && styles.subjectChipTextActive,
                                      ]}>
                                      {selected ? `\u2713 ${subject.name}` : section.core ? `\u2605 ${subject.name}` : subject.name}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          </View>
                        ) : null,
                      )}
                    </View>
                    {usesLearnerFlow && includeIntroChoices && selectedSubjectCount > 0 ? (
                      <Text style={[styles.subjectCount, styles.subjectCountFooter, { color: content.accent }]}>
                        {selectedSubjectCount} {swahiliIntro ? 'zimechaguliwa' : 'selected'} ✓
                      </Text>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : null}

            {introStep === 'setup' && (step === 1 || (studentFullIntro && step === 2)) && !(studentFullIntro && step === 1) ? (
              <>
                <Text style={[styles.stepTitle, schoolStepCompactLayout && styles.stepTitleCompact]}>
                  {schoolStepCopy.heading}
                </Text>
                {!includeIntroChoices ? (
                  <Text style={[styles.stepText, schoolStepCompactLayout && styles.stepTextCompact]}>
                    {swahiliIntro ? 'Unaweza kuruka hatua hii na kuongeza shule baadaye.' : content.schoolText}
                  </Text>
                ) : null}

                <Text style={[styles.fieldLabel, schoolStepCompactLayout && styles.fieldLabelCompact]}>
                  {regionLabel}
                </Text>
                <Pressable
                  accessibilityLabel={`${regionMeta.label} selector`}
                  accessibilityHint={`Opens the list of ${regionMeta.label.toLowerCase()} options`}
                  accessibilityRole="button"
                  onPress={() => setCountyPickerOpen(true)}
                  style={[
                    styles.dropdownField,
                    schoolStepCompactLayout && styles.inputCompact,
                    countyPickerOpen && { borderColor: content.accent },
                  ]}>
                  <Text
                    numberOfLines={1}
                    style={[styles.dropdownFieldText, !county && styles.dropdownFieldPlaceholder]}>
                    {county
                      ? county
                      : swahiliIntro
                        ? `Chagua ${regionLabel.toLowerCase()}...`
                        : `Select ${regionLabel.toLowerCase()}...`}
                  </Text>
                  <Text style={styles.dropdownChevron}>{'▾'}</Text>
                </Pressable>

                <Modal
                  animationType="fade"
                  onRequestClose={() => setCountyPickerOpen(false)}
                  transparent
                  visible={countyPickerOpen}>
                  <Pressable style={styles.pickerBackdrop} onPress={() => setCountyPickerOpen(false)}>
                    <Pressable style={styles.pickerSheet} onPress={() => undefined}>
                      <ScrollView
                        accessibilityLabel={`${regionMeta.label} options`}
                        accessibilityRole="radiogroup"
                        keyboardShouldPersistTaps="handled"
                        style={styles.pickerList}>
                        {countyOptions.map(option => {
                          const selected = county === option;
                          return (
                            <Pressable
                              accessibilityRole="radio"
                              accessibilityLabel={`Select ${option} ${regionMeta.label.toLowerCase()}`}
                              accessibilityState={{ checked: selected }}
                              key={option}
                              onPress={() => {
                                handleCountySelect(option);
                                setCountyPickerOpen(false);
                              }}
                              style={styles.pickerRow}>
                              <Text
                                style={[
                                  styles.pickerRowText,
                                  selected && styles.pickerRowTextActive,
                                  selected && { color: content.accent },
                                ]}>
                                {option}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </Pressable>
                  </Pressable>
                </Modal>

                <Text style={[styles.fieldLabel, schoolStepCompactLayout && styles.fieldLabelCompact]}>
                  {swahiliIntro ? 'Shule' : 'School'}
                </Text>
                <Pressable
                  accessibilityLabel="School selector"
                  accessibilityHint="Opens the searchable list of schools"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !county }}
                  disabled={!county}
                  onPress={() => setSchoolPickerOpen(true)}
                  style={[
                    styles.dropdownField,
                    schoolStepCompactLayout && styles.inputCompact,
                    !county && styles.inputDisabled,
                    schoolPickerOpen && { borderColor: content.accent },
                  ]}>
                  <Text
                    numberOfLines={1}
                    style={[styles.dropdownFieldText, !hasSelectedSchool && styles.dropdownFieldPlaceholder]}>
                    {hasSelectedSchool
                      ? selectedSchoolName
                      : county
                        ? swahiliIntro
                          ? 'Chagua shule...'
                          : 'Select school...'
                        : swahiliIntro
                          ? `Chagua ${regionLabel.toLowerCase()} kwanza`
                          : `Select ${regionLabel.toLowerCase()} first`}
                  </Text>
                  <Text style={styles.dropdownChevron}>{'▾'}</Text>
                </Pressable>

                <Modal
                  animationType="slide"
                  onRequestClose={() => setSchoolPickerOpen(false)}
                  transparent
                  testID="school-picker-modal"
                  visible={schoolPickerOpen}>
                  <Pressable style={styles.pickerBackdrop} onPress={() => setSchoolPickerOpen(false)}>
                    <Pressable style={styles.schoolPickerSheet} onPress={() => undefined}>
                      <View style={styles.schoolPickerHeader}>
                        <Text style={styles.schoolPickerTitle}>
                          {swahiliIntro ? 'Tafuta shule yako' : 'Find your school'}
                        </Text>
                        <Pressable
                          accessibilityLabel="Close school list"
                          accessibilityRole="button"
                          onPress={() => setSchoolPickerOpen(false)}
                          style={styles.schoolPickerDone}>
                          <Text style={[styles.schoolPickerDoneText, { color: content.accent }]}>
                            {swahiliIntro ? 'Maliza' : 'Done'}
                          </Text>
                        </Pressable>
                      </View>
                      <TextInput
                        accessibilityLabel="Search school by name"
                        autoCapitalize="words"
                        autoComplete="organization"
                        autoCorrect={false}
                        editable={Boolean(county)}
                        textContentType="organizationName"
                        returnKeyType="search"
                        value={schoolQuery}
                        onChangeText={handleSchoolQueryChange}
                        onBlur={handleSchoolSearchBlur}
                        onFocus={() => setFocusedField('school')}
                        onKeyPress={handleSchoolSearchKeyPress}
                        onSubmitEditing={handleSchoolSearchSubmit}
                        placeholder={swahiliIntro ? 'Tafuta shule...' : 'Search your school'}
                        placeholderTextColor={ONBOARDING_COLORS.textMuted}
                        selectionColor={content.accent}
                        style={[
                          styles.input,
                          !county && styles.inputDisabled,
                          focusedField === 'school' && {
                            borderColor: content.accent,
                          },
                        ]}
                      />

                      <View style={styles.schoolResultRow}>
                        <Text
                          accessibilityLabel="School result count"
                          accessibilityLiveRegion="polite"
                          role="status"
                          style={styles.schoolResultStatus}>
                          {schoolResultStatus}
                        </Text>
                        {schoolQuery.trim() ? (
                          <Pressable
                            accessibilityHint="Clears the school search and selected school"
                            accessibilityLabel="Clear school search"
                            accessibilityRole="button"
                            onPress={handleClearSchoolSearch}
                            style={styles.clearSearchButton}>
                            <X color={content.accent} size={14} strokeWidth={2.6} />
                            <Text style={[styles.clearSearchText, { color: content.accent }]}>Clear</Text>
                          </Pressable>
                        ) : null}
                      </View>

                      <ScrollView
                        accessibilityLabel="School search results"
                        accessibilityRole="radiogroup"
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled
                        style={styles.schoolPickerList}
                        showsVerticalScrollIndicator={false}>
                  {filteredSchools.map(school => {
                    const selected = schoolId === school.id;
                    const schoolGradeMeta = formatSchoolGradeMeta(school, schoolLookupGrade || grade);
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityLabel={`Choose ${school.name}, ${school.location}, ${schoolGradeMeta}`}
                        accessibilityState={{ checked: selected }}
                        key={school.id}
                        onPress={() => handleSchoolOptionPress(school)}
                        style={[
                          styles.schoolOption,
                          schoolStepCompactLayout && styles.schoolOptionCompact,
                          selected && styles.schoolOptionSelected,
                          selected && { borderColor: content.accent },
                        ]}>
                        <View style={styles.schoolOptionHeader}>
                          <Text style={styles.schoolName}>{school.name}</Text>
                          {selected ? (
                            <View
                              style={[styles.schoolSelectedCheck, { backgroundColor: content.accent }]}
                              testID="selected-school-check">
                              <Check color={ONBOARDING_COLORS.white} size={12} strokeWidth={3} />
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.schoolMeta}>{school.location}</Text>
                        <Text style={[styles.schoolGradeMeta, { color: content.accent }]}>
                          {schoolGradeMeta}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {filteredSchools.length === 0 ? (
                    <>
                      <Text
                        accessibilityLabel="No matching schools"
                        accessibilityLiveRegion="polite"
                        role="status"
                        style={styles.emptyText}>
                        {county
                          ? 'No match yet. Add your school below.'
                          : `Choose a ${regionLabel.toLowerCase()} first to find your school.`}
                      </Text>
                      {county ? (
                        <Pressable
                          accessibilityLabel="Add your school"
                          accessibilityHint="Opens a form to add your school in the selected county"
                          accessibilityRole="button"
                          onPress={handleOpenAddSchool}
                          style={({ pressed }) => [styles.addSchoolButton, pressed && styles.addSchoolButtonPressed]}
                          testID="add-school-button">
                          <Plus color={content.accent} size={17} strokeWidth={2.8} />
                          <Text style={[styles.addSchoolButtonText, { color: content.accent }]}>Add Your School</Text>
                        </Pressable>
                      ) : null}
                    </>
                  ) : null}
                      </ScrollView>
                    </Pressable>
                  </Pressable>
                </Modal>

                <Modal
                  animationType="fade"
                  onRequestClose={() => {
                    if (!isAddingSchool) {
                      setAddSchoolOpen(false);
                      setAddSchoolError(null);
                    }
                  }}
                  transparent
                  testID="add-school-modal"
                  visible={addSchoolOpen}>
                  <Pressable
                    accessibilityLabel="Close add school form"
                    style={styles.pickerBackdrop}
                    onPress={() => {
                      if (!isAddingSchool) {
                        setAddSchoolOpen(false);
                        setAddSchoolError(null);
                      }
                    }}>
                    <Pressable style={styles.schoolPickerSheet} onPress={() => undefined}>
                      <View style={styles.schoolPickerHeader}>
                        <Text style={styles.schoolPickerTitle}>Add Your School</Text>
                        <Pressable
                          accessibilityLabel="Cancel add school"
                          accessibilityRole="button"
                          disabled={isAddingSchool}
                          onPress={() => {
                            setAddSchoolOpen(false);
                            setAddSchoolError(null);
                          }}
                          style={styles.schoolPickerDone}>
                          <Text style={[styles.schoolPickerDoneText, { color: content.accent }]}>Cancel</Text>
                        </Pressable>
                      </View>
                      <Text style={styles.addSchoolCounty}>Selected county: {county}</Text>
                      <Text style={styles.addSchoolDescription}>
                        Enter your school name and we’ll save it for this county.
                      </Text>
                      <TextInput
                        accessibilityLabel="School name"
                        autoCapitalize="words"
                        autoComplete="organization"
                        autoCorrect={false}
                        editable={!isAddingSchool}
                        onChangeText={value => {
                          setManualSchoolName(value);
                          setAddSchoolError(null);
                        }}
                        onSubmitEditing={handleAddSchool}
                        placeholder="Enter school name"
                        placeholderTextColor={ONBOARDING_COLORS.textMuted}
                        returnKeyType="done"
                        selectionColor={content.accent}
                        style={[styles.input, styles.addSchoolInput, addSchoolError && styles.addSchoolInputError]}
                        value={manualSchoolName}
                      />
                      {addSchoolError ? (
                        <Text accessibilityLiveRegion="polite" role="alert" style={styles.addSchoolError}>
                          {addSchoolError}
                        </Text>
                      ) : null}
                      <Pressable
                        accessibilityLabel="Save school and continue"
                        accessibilityRole="button"
                        accessibilityState={{ busy: isAddingSchool, disabled: isAddingSchool }}
                        disabled={isAddingSchool}
                        onPress={handleAddSchool}
                        style={({ pressed }) => [
                          styles.addSchoolSubmitButton,
                          { backgroundColor: content.accent },
                          pressed && styles.addSchoolSubmitButtonPressed,
                          isAddingSchool && styles.addSchoolSubmitButtonDisabled,
                        ]}
                        testID="save-school-button">
                        {isAddingSchool ? <ActivityIndicator color={ONBOARDING_COLORS.white} size="small" /> : null}
                        <Text style={styles.addSchoolSubmitText}>{isAddingSchool ? 'Saving...' : 'Save and Continue'}</Text>
                      </Pressable>
                    </Pressable>
                  </Pressable>
                </Modal>

                {county && hasSelectedSchool ? (
                  <View
                    accessibilityLabel="Selected school confirmation"
                    style={[
                      styles.selectedSchoolCard,
                      {
                        backgroundColor: ONBOARDING_COLORS.accentLight,
                        borderColor: `${content.accent}70`,
                      },
                    ]}>
                    <Text style={styles.selectedSchoolIcon}>{'\uD83C\uDFEB'}</Text>
                    <View style={styles.selectedSchoolTextBlock}>
                      <Text style={[styles.selectedSchoolName, { color: ONBOARDING_COLORS.textPrimary }]}>
                        {selectedSchoolName}
                      </Text>
                      <Text style={styles.selectedSchoolMeta}>
                        {county} {'\u00B7'} {selectedCountry.name}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {county && !hasSelectedSchool ? (
                  <>
                    <Text style={styles.addSchoolHelpText}>
                      {swahiliIntro
                        ? 'Hujapata shule yako?'
                        : "Can't find your school?"}
                    </Text>
                    <Pressable
                      accessibilityLabel="Add your school"
                      accessibilityHint="Opens a form to add your school in the selected county"
                      accessibilityRole="button"
                      onPress={handleOpenAddSchool}
                      style={({ pressed }) => [styles.addSchoolButton, pressed && styles.addSchoolButtonPressed]}
                      testID="missing-school-link">
                      <Plus color={content.accent} size={18} strokeWidth={2.8} />
                      <Text style={[styles.addSchoolButtonText, { color: content.accent }]}>Add Your School</Text>
                    </Pressable>
                  </>
                ) : null}
              </>
            ) : null}

            {externalPaymentsEnabled && introStep === 'setup' && step === 2 && !includeIntroChoices ? (
              <>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  Optional M-Pesa shortcut
                </Text>
                <Text style={[styles.stepText, compactLayout && styles.stepTextCompact]}>
                  {content.phoneText}
                </Text>

                <View
                  accessibilityLabel="Final setup review"
                  accessibilityValue={{ text: finalReviewAnnouncement }}
                  style={[
                    styles.reviewPanel,
                    compactLayout && styles.reviewPanelCompact,
                    { borderColor: content.accent },
                  ]}>
                  <Text style={[styles.reviewTitle, { color: content.accent }]}>
                    {content.reviewTitle}
                  </Text>
                  <View style={[styles.reviewGrid, compactLayout && styles.reviewGridCompact]}>
                    <View style={[styles.reviewItem, compactLayout && styles.reviewItemCompact]}>
                      <Text style={[styles.reviewLabel, compactLayout && styles.reviewLabelCompact]}>
                        {content.reviewGradeLabel}
                      </Text>
                      <Text
                        numberOfLines={2}
                        style={[styles.reviewValue, compactLayout && styles.reviewValueCompact]}>
                        {grade}
                      </Text>
                    </View>
                    <View style={[styles.reviewItem, compactLayout && styles.reviewItemCompact]}>
                      <Text style={[styles.reviewLabel, compactLayout && styles.reviewLabelCompact]}>
                        School
                      </Text>
                      <Text
                        numberOfLines={2}
                        style={[styles.reviewValue, compactLayout && styles.reviewValueCompact]}>
                        {reviewSchoolName}
                      </Text>
                    </View>
                    <View style={[styles.reviewItem, compactLayout && styles.reviewItemCompact]}>
                      <Text style={[styles.reviewLabel, compactLayout && styles.reviewLabelCompact]}>
                        Payment
                      </Text>
                      <Text
                        numberOfLines={2}
                        style={[styles.reviewValue, compactLayout && styles.reviewValueCompact]}>
                        {reviewPaymentStatus}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={[styles.fieldLabel, compactLayout && styles.fieldLabelCompact]}>
                  M-Pesa number
                </Text>
                <TextInput
                  accessibilityHint="Optional Safaricom number for faster checkout later"
                  accessibilityLabel="M-Pesa number"
                  autoCorrect={false}
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  value={mpesaPhoneNumber}
                  onChangeText={handleMpesaPhoneNumberChange}
                  keyboardType="phone-pad"
                  maxLength={16}
                  onBlur={() => setFocusedField(null)}
                  onFocus={() => setFocusedField('mpesa')}
                  onKeyPress={handleMpesaPhoneKeyPress}
                  onSubmitEditing={handleContinue}
                  returnKeyType="done"
                  placeholder="2547XXXXXXXX"
                  placeholderTextColor={ONBOARDING_COLORS.textMuted}
                  selectionColor={content.accent}
                  style={[
                    styles.input,
                    compactLayout && styles.inputCompact,
                    focusedField === 'mpesa' && {
                      borderColor: content.accent,
                    },
                  ]}
                />
                {!compactLayout ? (
                  <Text style={styles.helperText}>Use 07..., 7..., or 2547...</Text>
                ) : null}
              </>
            ) : null}

            {introStep === 'loading' ? (
              <>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {loadingHeaderTitle}
                </Text>
                <View style={[styles.loadingProfilePanel, { borderColor: `${content.accent}55` }]}>
                  <View
                    style={[
                      styles.loadingProgressRing,
                      {
                        backgroundColor: activeMascotColors.lightColor,
                        borderColor: content.accent,
                      },
                    ]}>
                    <Image
                      accessibilityIgnoresInvertColors
                      accessibilityLabel={`${activeMascot.name} mascot loading avatar`}
                      resizeMode="contain"
                      source={activeMascot.source}
                      style={styles.loadingProgressMascot}
                    />
                    {renderMascotPoseEffect('large')}
                    <View style={styles.loadingProgressBadge}>
                      <Text style={[styles.loadingProgressBadgeText, { color: content.accent }]}>
                        {loadingProgressNow}%
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.loadingProfileTitle, { color: content.accent }]}>
                    {loadingStatusLabel}
                  </Text>
                  <View
                    accessibilityLabel="Profile build progress"
                    accessibilityRole="progressbar"
                    accessibilityValue={{ min: 0, max: 100, now: loadingProgressNow, text: `${loadingProgressNow}% complete` }}
                    style={styles.loadingProgressTrack}>
                    <View style={[styles.loadingProgressFill, { backgroundColor: content.accent, width: `${loadingProgressNow}%` }]} />
                  </View>
                  <Text style={[styles.loadingProgressText, { color: content.accent }]}>{loadingProgressNow}%</Text>
                  <Text style={styles.loadingProfileText}>
                    {swahiliIntro
                      ? 'Tunaandaa masomo, malengo, mtaala, na vikumbusho vyako.'
                      : role === 'teacher'
                        ? 'We are combining your mascot, teaching goal, curriculum, reminders, classes, subjects, and school.'
                        : role === 'parent'
                          ? 'We are combining your mascot, progress snapshot, curriculum, reminders, child profile, and school.'
                          : 'We are combining your mascot, goal, curriculum, interests, reminders, grade, subjects, and school.'}
                  </Text>
                </View>
                <View style={styles.profileReadyChecklist}>
                  {loadingChecklist.map(item => (
                    <View key={item} style={styles.profileReadyRow}>
                      <View style={[styles.profileReadyCheck, { backgroundColor: content.accent }]}>
                        <Check color={ONBOARDING_COLORS.white} size={12} strokeWidth={3} />
                      </View>
                      <Text style={styles.profileReadyRowText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {introStep === 'profileReady' ? (
              <>
                <View style={[styles.readyHeroRow, compactLayout && styles.readyHeroRowCompact]}>
                  <LinearGradient
                    colors={[
                      content.accent,
                      content.accent === ONBOARDING_COLORS.primary
                        ? ONBOARDING_COLORS.primaryDark
                        : content.accent === ONBOARDING_COLORS.pro
                          ? ONBOARDING_COLORS.proDark
                          : content.accent,
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.readyHeroBand,
                      styles.readyHeroBandInline,
                      compactLayout && styles.readyHeroBandCompact,
                      compactLayout && styles.readyHeroBandInlineCompact,
                    ]}>
                    <View
                      accessibilityLabel="Student avatar"
                      accessibilityRole="image"
                      style={[
                        styles.readyHeroBandMascot,
                        styles.readyHeroBandMascotInline,
                        compactLayout && styles.readyHeroBandMascotCompact,
                      ]}>
                      <AvatarArt avatarKey={learnerAvatarKey} size={compactLayout ? 52 : 58} />
                    </View>
                    <View style={styles.readyHeroBandCopy}>
                      <Text style={styles.readyHeroBandEyebrow}>
                        {swahiliIntro ? 'Mwenzako wa masomo' : role === 'teacher' ? 'Workspace ready' : role === 'parent' ? 'Dashboard ready' : 'Profile ready'}
                      </Text>
                      <Text numberOfLines={1} style={[styles.readyHeroBandTitle, compactLayout && styles.readyHeroBandTitleCompact]}>
                        {`${displayName.trim() || (swahiliIntro ? 'Wewe' : 'You')},`}
                      </Text>
                      <Text numberOfLines={2} style={styles.readyHeroBandSub}>
                        {swahiliIntro
                          ? role === 'teacher'
                            ? 'Kila kitu kiko tayari kwa darasa lako.'
                            : role === 'parent'
                              ? parentReadyPlanText
                              : 'Mpango wako wa masomo uko tayari.'
                          : role === 'teacher'
                            ? 'Everything is set for your class.'
                            : role === 'parent'
                              ? parentReadyPlanText
                              : 'Your study plan is ready to go.'}
                      </Text>
                      {readySummary ? (
                        <View style={styles.readyHeroBandPill}>
                          <Text numberOfLines={1} style={styles.readyHeroBandPillText}>{readySummary}</Text>
                        </View>
                      ) : null}
                    </View>
                  </LinearGradient>
                  <Animated.View
                    accessibilityLabel={mascotPoseAccessibilityLabel}
                    accessibilityRole="image"
                    style={[styles.readyMascotStage, compactLayout && styles.readyMascotStageCompact, mascotMotionStyle]}>
                    <Image
                      accessibilityIgnoresInvertColors
                      accessibilityLabel={activeMascot.label}
                      resizeMode="contain"
                      source={activeMascot.source}
                      style={[styles.readyMascotImage, compactLayout && styles.readyMascotImageCompact]}
                    />
                    {renderMascotPoseEffect()}
                  </Animated.View>
                </View>
                <Text style={[styles.readyGoalsHeading, compactLayout && styles.readyGoalsHeadingCompact, { color: content.accent }]}>
                  {swahiliIntro ? 'Malengo ya kufikiwa' : 'Goals to reach'}
                </Text>
                {swahiliIntro ? (
                  <>
                    <View style={[styles.profileReadyChecklist, compactLayout && styles.profileReadyChecklistCompact]}>
                      {(role === 'teacher'
                        ? ['Wastani wa darasa hadi daraja 2', 'Muda mdogo kwa kazi za ofisi', 'Taswira wazi ya kila mwanafunzi']
                        : ['Maboresho ya hadi daraja 2', 'Kuwa mbele ya wanafunzi wengi', '94% zaidi ya ujasiri']
                      ).map(item => (
                        <View key={item} style={[styles.profileReadyRow, compactLayout && styles.profileReadyRowCompact]}>
                          <View style={[styles.profileReadyCheck, { backgroundColor: content.accent }]}>
                            <Check color={ONBOARDING_COLORS.white} size={12} strokeWidth={3} />
                          </View>
                          <Text style={styles.profileReadyRowText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={[styles.socialProofPanel, compactLayout && styles.socialProofPanelCompact, { borderColor: `${content.accent}55` }]}>
                      <Text style={[styles.socialProofNumber, { color: content.accent }]}>4.89</Text>
                      <Text style={styles.socialProofText}>
                        {role === 'teacher'
                          ? 'Unajiunga na maelfu ya walimu wanaoinua matokeo.'
                          : 'Unajiunga na wanafunzi wengi walioridhika.'}
                      </Text>
                      <Text style={[styles.helperText, styles.centeredText]}>
                        {role === 'teacher' ? 'Wanaotumiwa na walimu 50,000+' : 'Wanaotumiwa na wanafunzi 2,400,000+'}
                      </Text>
                      {renderReadyTestimonialCarousel()}
                    </View>
                  </>
                ) : (
                  <>
                    <View style={[styles.profileReadyChecklist, compactLayout && styles.profileReadyChecklistCompact]}>
                      {(role === 'teacher'
                        ? ['Up to 2 grades class improvement', 'Less time on admin work', 'Clear view of every student']
                        : ['Up to 2 grades improvement', 'Get ahead of most students', '94% more confident']
                      ).map(item => (
                        <View key={item} style={[styles.profileReadyRow, compactLayout && styles.profileReadyRowCompact]}>
                          <View style={[styles.profileReadyCheck, { backgroundColor: content.accent }]}>
                            <Check color={ONBOARDING_COLORS.white} size={12} strokeWidth={3} />
                          </View>
                          <Text style={styles.profileReadyRowText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={[styles.socialProofPanel, compactLayout && styles.socialProofPanelCompact, { borderColor: `${content.accent}55` }]}>
                      <Text style={[styles.socialProofNumber, { color: content.accent }]}>4.89</Text>
                      <Text style={styles.readyRatingStars}>{'\u2605\u2605\u2605\u2605\u2605'}</Text>
                      <Text style={styles.socialProofText}>
                        {role === 'teacher'
                          ? "You're joining thousands of teachers raising results."
                          : "You're joining millions of satisfied students."}
                      </Text>
                      <Text style={[styles.helperText, styles.centeredText]}>
                        {role === 'teacher' ? 'Trusted by 50,000+ teachers' : 'Used by 2,400,000+ students'}
                      </Text>
                      {renderReadyTestimonialCarousel()}
                    </View>
                  </>
                )}
              </>
            ) : null}

            {introStep === 'signup' ? (
              <>
                <View
                  style={[
                    styles.signupBrandRow,
                    (signupStep === 'email' || signupStep === 'phone') && styles.signupBrandRowCompact,
                  ]}>
                  <Animated.View
                    accessibilityLabel={mascotPoseAccessibilityLabel}
                    accessibilityRole="image"
                    testID="onboarding-mascot-motion"
                    style={mascotMotionStyle}>
                    <Image
                      accessibilityIgnoresInvertColors
                      accessibilityLabel={activeMascot.label}
                      resizeMode="contain"
                      source={activeMascot.source}
                      style={[
                        styles.signupMascotCentered,
                        (signupStep === 'email' || signupStep === 'phone') && styles.signupMascotCenteredCompact,
                      ]}
                    />
                    {renderMascotPoseEffect(signupStep === 'email' || signupStep === 'phone' ? 'signupCompact' : 'signup')}
                  </Animated.View>
                </View>
                {signupStep === 'method' ? (
                  <>
                    <Text style={[styles.stepTitle, styles.centeredText, compactLayout && styles.stepTitleCompact]}>
                      {swahiliIntro ? 'Hifadhi akaunti yako' : 'Save your account'}
                    </Text>
                    <Text style={[styles.stepText, styles.centeredText, compactLayout && styles.stepTextCompact]}>
                      {swahiliIntro ? 'Jiandikishe kuendelea na mpango wako wa masomo' : 'Sign up to continue with your study plan'}
                    </Text>
                  </>
                ) : null}
                {collectSignupCredentials ? (
                  <>
                    {signupStep !== 'method' ? (
                    <View style={styles.signupStepDots} accessibilityLabel="Signup progress">
                      {[0, 1, 2].map(dot => {
                        const active =
                          signupStep === 'email' || signupStep === 'phone'
                            ? dot === 0
                            : dot <= 1;
                        return (
                          <View
                            key={dot}
                            accessibilityLabel={`Signup progress dot ${dot + 1}`}
                            accessibilityState={{ selected: active }}
                            testID={`signup-progress-dot-${dot + 1}`}
                            style={[
                              styles.signupStepDot,
                              active && { backgroundColor: content.accent, borderColor: content.accent },
                            ]}
                          />
                        );
                      })}
                    </View>
                    ) : null}
                    {signupStep !== 'method' ? (
                      <Pressable
                        accessibilityLabel="Back in signup"
                        accessibilityRole="button"
                        onPress={handleSignupBack}
                        style={styles.signupInlineBack}>
                        <Text style={[styles.signupInlineBackText, { color: content.accent }]}>Back</Text>
                      </Pressable>
                    ) : null}

                    {signupStep === 'method' ? (
                      <View style={styles.signupMethodStack}>
                        <Pressable
                          accessibilityLabel="Continue with Google"
                          accessibilityRole="button"
                          onPress={() => handleSignupMethodSelect('google')}
                          style={styles.signupGoogleButton}>
                          <GoogleLogo size={20} />
                          <Text style={styles.signupGoogleText}>Continue with Google</Text>
                        </Pressable>
                        <Pressable
                          accessibilityLabel="Sign up with email"
                          accessibilityRole="button"
                          onPress={() => handleSignupMethodSelect('email')}
                          style={[styles.signupPrimaryButton, { backgroundColor: content.accent }]}>
                          <Mail color={ONBOARDING_COLORS.white} size={18} strokeWidth={2.5} />
                          <Text style={styles.signupPrimaryText}>Continue with Email</Text>
                        </Pressable>
                        <Pressable
                          accessibilityLabel="Continue with phone number"
                          accessibilityRole="button"
                          accessibilityState={{ disabled: true }}
                          disabled
                          onPress={() => handleSignupMethodSelect('phone')}
                          style={[styles.signupPhoneButton, styles.signupPhoneButtonDisabled]}>
                          <Phone color={ONBOARDING_COLORS.textMuted} size={18} strokeWidth={2.5} />
                          <Text style={[styles.signupPhoneText, { color: ONBOARDING_COLORS.textMuted }]}>Continue with Phone Number — Coming Soon</Text>
                        </Pressable>
                        <Text style={styles.signupTermsText}>
                          By continuing, you agree to the Terms of Use and Privacy Policy.
                        </Text>
                      </View>
                    ) : null}

                    {signupStep === 'email' || signupStep === 'phone' ? (
                      <View style={styles.signupFormPanel}>
                        <Text style={[styles.fieldLabel, compactLayout && styles.fieldLabelCompact]}>
                          {signupStep === 'email' ? 'Email address' : 'Phone number'}
                        </Text>
                        {signupStep === 'email' ? (
                          <TextInput
                            accessibilityLabel="Signup email address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                            onChangeText={value => {
                              setSignupEmail(value);
                              setLocalError(null);
                            }}
                            placeholder="you@example.com"
                            placeholderTextColor={ONBOARDING_COLORS.textMuted}
                            selectionColor={content.accent}
                            style={[
                              styles.input,
                              !isSignupEmailValid && signupEmailTrimmed ? styles.signupInputInvalid : null,
                            ]}
                            textContentType="emailAddress"
                            value={signupEmail}
                          />
                        ) : (
                          <View style={styles.signupPhoneInputRow}>
                            <View style={styles.signupPhonePrefix}>
                              <Text style={styles.signupPhonePrefixText}>{'\uD83C\uDDF0\uD83C\uDDEA +254'}</Text>
                            </View>
                            <TextInput
                              accessibilityLabel="Signup phone number"
                              autoCorrect={false}
                              keyboardType="phone-pad"
                              onChangeText={value => {
                                setSignupPhone(value);
                                setLocalError(null);
                              }}
                              placeholder="716175485"
                              placeholderTextColor={ONBOARDING_COLORS.textMuted}
                              selectionColor={content.accent}
                              style={[
                                styles.input,
                                styles.signupPhoneInput,
                                !isSignupPhoneValid && signupPhoneTrimmed ? styles.signupInputInvalid : null,
                              ]}
                              textContentType="telephoneNumber"
                              value={signupPhone}
                            />
                          </View>
                        )}
                        {signupStep === 'email' && signupEmailTrimmed && !isSignupEmailValid ? (
                          <Text style={styles.signupFieldError}>Enter a valid email address.</Text>
                        ) : null}
                        {signupStep === 'phone' && signupPhoneTrimmed && !isSignupPhoneValid ? (
                          <Text style={styles.signupFieldError}>Enter a valid Kenyan phone number.</Text>
                        ) : null}

                        <Text style={[styles.fieldLabel, compactLayout && styles.fieldLabelCompact]}>Password</Text>
                        <View style={styles.signupPasswordRow}>
                          <TextInput
                            accessibilityLabel="Signup password"
                            autoCapitalize="none"
                            onChangeText={value => {
                              setSignupPassword(value);
                              setLocalError(null);
                            }}
                            placeholder="Create password"
                            placeholderTextColor={ONBOARDING_COLORS.textMuted}
                            secureTextEntry={!showSignupPassword}
                            selectionColor={content.accent}
                            style={styles.signupPasswordInput}
                            textContentType="newPassword"
                            value={signupPassword}
                          />
                          <Pressable
                            accessibilityLabel={showSignupPassword ? 'Hide signup password' : 'Show signup password'}
                            onPress={() => setShowSignupPassword(current => !current)}
                            style={styles.signupEyeButton}>
                            {showSignupPassword ? <EyeOff color={ONBOARDING_COLORS.textSecondary} size={18} /> : <Eye color={ONBOARDING_COLORS.textSecondary} size={18} />}
                          </Pressable>
                        </View>
                        <View style={styles.signupStrengthRow}>
                          {[1, 2, 3].map(level => (
                            <View
                              key={level}
                              style={[
                                styles.signupStrengthSegment,
                                signupPasswordStrength >= level && {
                                  backgroundColor:
                                    signupPasswordStrength === 1 ? ONBOARDING_COLORS.danger : signupPasswordStrength === 2 ? ONBOARDING_COLORS.accentLight : ONBOARDING_COLORS.accent,
                                },
                              ]}
                            />
                          ))}
                        </View>
                        <Text
                          style={[
                            styles.signupStrengthLabel,
                            {
                              color:
                                signupPasswordStrength === 0
                                  ? ONBOARDING_COLORS.textSecondary
                                  : signupPasswordStrength === 1
                                    ? ONBOARDING_COLORS.danger
                                    : signupPasswordStrength === 2
                                      ? ONBOARDING_COLORS.accent
                                      : ONBOARDING_COLORS.accent,
                            },
                          ]}>
                          {signupPasswordStrength === 0
                            ? 'Enter at least 8 characters'
                            : signupPasswordStrength === 1
                              ? 'Too weak'
                              : signupPasswordStrength === 2
                                ? 'Fair'
                                : 'Strong'}
                        </Text>

                        <Text style={[styles.fieldLabel, compactLayout && styles.fieldLabelCompact]}>Confirm password</Text>
                        <View
                          style={[
                            styles.signupPasswordRow,
                            signupPasswordConfirm && !signupPasswordsMatch ? styles.signupInputInvalid : null,
                            signupPasswordsMatch ? styles.signupInputValid : null,
                          ]}>
                          <TextInput
                            accessibilityLabel="Confirm signup password"
                            autoCapitalize="none"
                            onChangeText={value => {
                              setSignupPasswordConfirm(value);
                              setLocalError(null);
                            }}
                            placeholder="Repeat password"
                            placeholderTextColor={ONBOARDING_COLORS.textMuted}
                            secureTextEntry={!showSignupPasswordConfirm}
                            selectionColor={content.accent}
                            style={styles.signupPasswordInput}
                            textContentType="newPassword"
                            value={signupPasswordConfirm}
                          />
                          <Pressable
                            accessibilityLabel={
                              showSignupPasswordConfirm ? 'Hide confirm password' : 'Show confirm password'
                            }
                            onPress={() => setShowSignupPasswordConfirm(current => !current)}
                            style={styles.signupEyeButton}>
                            {showSignupPasswordConfirm ? <EyeOff color={ONBOARDING_COLORS.textSecondary} size={18} /> : <Eye color={ONBOARDING_COLORS.textSecondary} size={18} />}
                          </Pressable>
                        </View>
                        {signupPasswordConfirm ? (
                          <Text style={signupPasswordsMatch ? styles.signupFieldSuccess : styles.signupFieldError}>
                            {signupPasswordsMatch ? '\u2713 Passwords match' : 'Passwords do not match.'}
                          </Text>
                        ) : null}
                        <Pressable
                          accessibilityLabel="Send verification code"
                          accessibilityRole="button"
                          accessibilityState={{
                            disabled: signupStep === 'email' ? !canSubmitSignupEmail : !canSubmitSignupPhone,
                          }}
                          disabled={signupStep === 'email' ? !canSubmitSignupEmail : !canSubmitSignupPhone}
                          onPress={signupStep === 'email' ? handleSignupEmailContinue : handleSignupPhoneContinue}
                          style={[
                            styles.signupPrimaryButton,
                            { backgroundColor: content.accent },
                            (signupStep === 'email' ? !canSubmitSignupEmail : !canSubmitSignupPhone) &&
                              styles.primaryButtonDisabled,
                          ]}>
                          <Text style={styles.signupPrimaryText}>
                            {signupStep === 'email' ? 'Create account' : 'Send verification code'} {'\u2192'}
                          </Text>
                          <ChevronRight color={ONBOARDING_COLORS.white} size={18} strokeWidth={2.7} />
                        </Pressable>
                      </View>
                    ) : null}

                    {signupStep === 'verify' ? (
                      <View style={styles.signupFormPanel}>
                        <Text style={[styles.needChoiceTitle, styles.centeredText]}>
                          {swahiliIntro ? 'Ingiza msimbo wa nambari 6' : 'Enter the 6-digit code'}
                        </Text>
                        <Text style={styles.signupDestinationText}>
                          We sent a code to {normalizedSignupPhone}
                        </Text>
                        <View style={styles.signupOtpRow}>
                          {signupOtp.map((digit, index) => (
                            <TextInput
                              accessibilityLabel={`OTP digit ${index + 1}`}
                              key={index}
                              keyboardType="number-pad"
                              maxLength={1}
                              onChangeText={value => handleSignupOtpChange(index, value)}
                              onKeyPress={event => handleSignupOtpKeyPress(index, event)}
                              ref={node => {
                                signupOtpRefs.current[index] = node;
                              }}
                              selectionColor={content.accent}
                              style={[
                                styles.signupOtpBox,
                                digit ? { backgroundColor: `${content.accent}1A`, borderColor: content.accent } : null,
                                signupCodeError ? styles.signupInputInvalid : null,
                              ]}
                              textAlign="center"
                              value={digit}
                            />
                          ))}
                        </View>
                        {signupCodeError ? (
                          <Text style={styles.signupFieldError}>Incorrect code. Please try again.</Text>
                        ) : null}
                        {signupResendSeconds > 0 ? (
                          <Text style={styles.signupTestHint}>Resend code in {signupResendSeconds}s</Text>
                        ) : (
                          <Pressable
                            accessibilityLabel="Resend verification code"
                            accessibilityRole="button"
                            onPress={handleResendSignupCode}
                            style={styles.signupResendButton}>
                            <Text style={[styles.signupResendText, { color: content.accent }]}>Resend code</Text>
                          </Pressable>
                        )}
                        <Pressable
                          accessibilityLabel="Verify and continue"
                          accessibilityRole="button"
                          accessibilityState={{ disabled: !canVerifySignupOtp }}
                          disabled={!canVerifySignupOtp}
                          onPress={handleVerifySignup}
                          style={[
                            styles.signupPrimaryButton,
                            { backgroundColor: content.accent },
                            !canVerifySignupOtp && styles.primaryButtonDisabled,
                          ]}>
                          <Text style={styles.signupPrimaryText}>Verify & Continue {'\u2192'}</Text>
                          <ChevronRight color={ONBOARDING_COLORS.white} size={18} strokeWidth={2.7} />
                        </Pressable>
                      </View>
                    ) : null}

                  </>
                ) : (
                  <View style={[styles.socialProofPanel, { borderColor: `${content.accent}55` }]}>
                    <Text style={[styles.needChoiceTitle, { color: ONBOARDING_COLORS.textPrimary }]}>
                      {swahiliIntro ? 'Tayari kuhifadhiwa' : 'Ready to save'}
                    </Text>
                    {[
                      swahiliIntro ? 'Profaili yako ya masomo' : 'Your study profile',
                      swahiliIntro ? 'Malengo na changamoto zako' : 'Your goals and blockers',
                      swahiliIntro ? 'Mtaala wa CBC / KNEC' : 'CBC / KNEC curriculum context',
                    ].map(item => (
                      <View key={item} style={styles.profileReadyRow}>
                        <View style={[styles.profileReadyCheck, { backgroundColor: content.accent }]}>
                          <Check color={ONBOARDING_COLORS.white} size={12} strokeWidth={3} />
                        </View>
                        <Text style={styles.profileReadyRowText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : null}

            {localError || error ? (
              <Text accessibilityLiveRegion="polite" role="alert" style={styles.errorText}>
                {localError || error}
              </Text>
            ) : null}

          </View>
        </ScrollView>
        {!usesInlineSignupFlow && !usesAutoAdvanceChoice && introStep !== 'loading' ? (
          <View
            style={[styles.footerDock, { paddingBottom: Math.max(insets.bottom, 12) }]}
            accessibilityElementsHidden={false}>
            <View
              testID="onboarding-footer"
              style={[styles.footerRow, footerCompactLayout && styles.footerRowCompact]}>
              {includeIntroChoices && (introStep === 'interests' || introStep === 'reminder') ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Skip this step"
                  disabled={isSubmitting}
                  onPress={() => {
                    trackOnboardingEvent('skip', progressMetadata.key, progressMetadata.title);
                    if (introStep === 'interests') {
                      setIntroStep('reminder');
                      return;
                    }
                    if (introStep === 'reminder') {
                      setReminderEnabled(false);
                      setIntroStep('loading');
                      return;
                    }
                    handleContinue();
                  }}
                  style={styles.skipGhostButton}>
                  <Text style={styles.skipGhostText}>{swahiliIntro ? 'Ruka' : 'Skip'}</Text>
                </Pressable>
              ) : null}
              {includeIntroChoices && introStep === 'microphone' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Skip microphone permission"
                  disabled={isSubmitting || isRequestingMicrophonePermission}
                  onPress={() => {
                    trackOnboardingEvent('skip', 'microphone', 'permission');
                    setIntroStep('need');
                  }}
                  style={styles.skipGhostButton}>
                  <Text style={styles.skipGhostText}>{swahiliIntro ? 'Ruka' : 'Skip'}</Text>
                </Pressable>
              ) : null}
              {canGoBack && !usesRafikiRevealStep && !usesMascotNavBar ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back in setup"
                  accessibilityHint={secondaryActionHint}
                  accessibilityState={{ disabled: isSubmitting }}
                  disabled={isSubmitting}
                  onPress={handleBack}
                  style={[
                    styles.secondaryButton,
                    footerCompactLayout && styles.secondaryButtonCompact,
                    isSubmitting && styles.secondaryButtonDisabled,
                  ]}>
                  <Text numberOfLines={2} style={styles.secondaryText}>
                    {secondaryActionText}
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  introStep === 'microphone'
                    ? 'Allow microphone access'
                    : introStep === 'reminder'
                    ? 'Allow assignment and study reminders'
                    : (introStep === 'setup' && step === 2 && !studentFullIntro) || introStep === 'signup'
                    ? 'Finish account setup'
                    : 'Continue account setup'
                }
                accessibilityHint={primaryActionHint}
                accessibilityState={{
                  disabled: !canContinue || isSubmitting || isRequestingReminderPermission || isRequestingMicrophonePermission,
                  busy: isSubmitting || isRequestingReminderPermission || isRequestingMicrophonePermission,
                }}
                disabled={!canContinue || isSubmitting || isRequestingReminderPermission || isRequestingMicrophonePermission}
                onPress={handleContinue}
                style={[
                  styles.primaryButton,
                  footerCompactLayout && styles.primaryButtonCompact,
                  { backgroundColor: content.accent },
                  (!canContinue || isSubmitting || isRequestingReminderPermission || isRequestingMicrophonePermission) && styles.primaryButtonDisabled,
                ]}>
                {isSubmitting || isRequestingReminderPermission || isRequestingMicrophonePermission ? (
                  <ActivityIndicator color={ONBOARDING_COLORS.white} />
                ) : (
                  <View style={styles.primaryButtonContent}>
                    <Text numberOfLines={2} style={styles.primaryText}>
                      {primaryActionText}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  decorativeShapes: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  decorativeShape: {
    borderRadius: 999,
    opacity: 0.48,
    position: 'absolute',
  },
  decorativeShapeTop: {
    backgroundColor: '#FFFFFF',
    height: 220,
    right: -84,
    top: -92,
    width: 220,
  },
  decorativeShapeSide: {
    backgroundColor: '#A9E8DE',
    height: 190,
    left: -126,
    top: 280,
    width: 190,
  },
  decorativeShapeBottom: {
    backgroundColor: '#FFFFFF',
    bottom: -118,
    height: 230,
    right: -84,
    width: 230,
  },
  keyboardWrap: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  scrollContentCompact: {
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  headerCopy: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  mascotStage: {
    alignItems: 'center',
    height: 122,
    justifyContent: 'center',
    marginRight: -16,
    overflow: 'visible',
    width: 112,
  },
  mascotStageCompact: {
    height: 98,
    marginRight: -14,
    width: 92,
  },
  mascot: {
    height: 124,
    width: 124,
  },
  mascotCompact: {
    height: 100,
    width: 100,
  },
  mascotPoseEffect: {
    bottom: 10,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  mascotPoseEffectLarge: {
    bottom: 0,
    left: 8,
    right: 8,
    top: 0,
  },
  mascotThoughtBubble: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '900',
    height: 24,
    lineHeight: 22,
    position: 'absolute',
    textAlign: 'center',
    width: 24,
  },
  mascotThoughtBubbleOne: {
    right: 8,
    top: 4,
  },
  mascotThoughtBubbleTwo: {
    right: 32,
    top: 22,
    transform: [{ scale: 0.74 }],
  },
  mascotSleepBubble: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '900',
    position: 'absolute',
    right: 4,
    top: 6,
  },
  mascotSunglasses: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    left: 34,
    position: 'absolute',
    top: 43,
  },
  mascotSunglassesSignup: {
    left: 24,
    top: 28,
  },
  mascotSunglassesSignupCompact: {
    left: 18,
    top: 21,
  },
  mascotSunglassLens: {
    backgroundColor: ONBOARDING_COLORS.textPrimary,
    borderRadius: 5,
    height: 10,
    width: 18,
  },
  mascotSunglassLensSignup: {
    borderRadius: 4,
    height: 8,
    width: 14,
  },
  mascotSunglassLensSignupCompact: {
    borderRadius: 4,
    height: 6,
    width: 11,
  },
  mascotSunglassBridge: {
    backgroundColor: ONBOARDING_COLORS.textPrimary,
    height: 3,
    width: 7,
  },
  mascotSunglassBridgeSignup: {
    height: 2,
    width: 5,
  },
  mascotSunglassBridgeSignupCompact: {
    height: 2,
    width: 4,
  },
  mascotConfetti: {
    borderRadius: 2,
    height: 12,
    position: 'absolute',
    width: 5,
  },
  mascotConfettiOne: {
    backgroundColor: ONBOARDING_COLORS.primary,
    left: 10,
    top: 10,
    transform: [{ rotate: '-18deg' }],
  },
  mascotConfettiTwo: {
    backgroundColor: ONBOARDING_COLORS.accent,
    right: 10,
    top: 8,
    transform: [{ rotate: '20deg' }],
  },
  mascotConfettiThree: {
    backgroundColor: ONBOARDING_COLORS.primaryLight,
    right: 30,
    top: 24,
    transform: [{ rotate: '-10deg' }],
  },
  mascotWorryMark: {
    backgroundColor: ONBOARDING_COLORS.dangerLight,
    borderRadius: 999,
    color: ONBOARDING_COLORS.danger,
    fontSize: 15,
    fontWeight: '900',
    height: 24,
    lineHeight: 23,
    position: 'absolute',
    right: 8,
    textAlign: 'center',
    top: 8,
    width: 24,
  },
  mascotCoach: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    bottom: 2,
    fontSize: 10,
    fontWeight: '900',
    maxWidth: 112,
    paddingHorizontal: 9,
    paddingVertical: 5,
    position: 'absolute',
  },
  mascotCoachCompact: {
    bottom: 0,
    fontSize: 9,
    maxWidth: 96,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  title: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 29,
    fontWeight: '900',
    lineHeight: 34,
    flexShrink: 1,
    textAlign: 'center',
    width: '100%',
  },
  titleCompact: {
    fontSize: 27,
    lineHeight: 32,
  },
  body: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    flexShrink: 1,
    textAlign: 'center',
    width: '100%',
  },
  bodyCompact: {
    fontSize: 14,
    lineHeight: 21,
  },
  progressWrap: {
    marginTop: 18,
  },
  progressWrapCompact: {
    marginTop: 14,
  },
  progressHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  progressTitle: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    backgroundColor: 'rgba(160,140,110,0.35)',
    borderRadius: 999,
    flex: 1,
    height: 8,
  },
  mascotNavBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 52,
  },
  mascotNavBackButton: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.bgSoft,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  mascotNavBackSpacer: {
    width: 34,
  },
  mascotNavBackText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  mascotNavProgressTrack: {
    backgroundColor: ONBOARDING_COLORS.border,
    borderRadius: 999,
    flex: 1,
    height: 5,
    overflow: 'hidden',
  },
  mascotNavProgressFill: {
    borderRadius: 999,
    height: '100%',
  },
  mascotNavAvatar: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 999,
    borderWidth: 1.5,
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 40,
  },
  mascotNavAvatarImage: {
    height: 38,
    width: 38,
  },
  mascotNavLangBadge: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  preMascotNav: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 40,
  },
  preMascotBackButton: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.bgSoft,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 34,
  },
  preMascotBackText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  preMascotLangBadge: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  summaryPanel: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  summaryPanelCompact: {
    gap: 6,
    marginTop: 10,
  },
  summaryItem: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    minHeight: 58,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  summaryItemCompact: {
    minHeight: 74,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  summaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'space-between',
  },
  summaryCheck: {
    alignItems: 'center',
    height: 12,
    justifyContent: 'center',
    width: 12,
  },
  summaryLabel: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  summaryLabelActive: {
    color: 'rgba(255,255,255,0.78)',
  },
  summaryValue: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
    marginTop: 5,
  },
  summaryValueCompact: {
    lineHeight: 16,
  },
  summaryValueActive: {
    color: ONBOARDING_COLORS.white,
  },
  card: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    flex: 1,
    marginTop: 12,
    padding: 0,
  },
  cardCompact: {
    borderRadius: 0,
    padding: 0,
  },
  mascotPickerCard: {
    minHeight: 430,
  },
  rafikiRevealCard: {
    alignItems: 'center',
    minHeight: 500,
  },
  languageBrandCard: {
    alignItems: 'stretch',
    justifyContent: 'center',
    marginTop: 0,
    minHeight: 640,
  },
  languageBrandHeader: {
    alignItems: 'center',
  },
  languageLogoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  languageLogoIcon: {
    fontSize: 34,
    marginRight: 8,
  },
  languageWordmark: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
  },
  languageAiBadge: {
    backgroundColor: ONBOARDING_COLORS.primary,
    borderRadius: 6,
    color: ONBOARDING_COLORS.white,
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 7,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  languageTagline: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '700',
    marginTop: 6,
  },
  languageDecorDots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  languageDecorDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  languageDecorDotOrange: {
    backgroundColor: '#E07B00',
  },
  languageDecorDotLime: {
    backgroundColor: '#AADD00',
  },
  languageDecorDotGreen: {
    backgroundColor: '#22C55E',
  },
  languageDecorDotAmber: {
    backgroundColor: '#F59E0B',
  },
  languagePromptLabel: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 30,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  languageChoiceGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  languageChoiceCard: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.bgSoft,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 18,
    borderWidth: 1.5,
    flex: 1,
    minHeight: 198,
    padding: 14,
    position: 'relative',
  },
  languageSelectedCheck: {
    color: ONBOARDING_COLORS.primary,
    fontSize: 16,
    fontWeight: '900',
    position: 'absolute',
    right: 10,
    top: 8,
  },
  languageCodeCircle: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 999,
    borderWidth: 1.5,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  languageCodeText: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  languageCodeTextActive: {
    color: ONBOARDING_COLORS.white,
  },
  languageChoiceTitle: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 12,
    textAlign: 'center',
  },
  languageChoiceText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 5,
    minHeight: 48,
    textAlign: 'center',
  },
  languageGreetingChip: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderRadius: 999,
    color: ONBOARDING_COLORS.primary,
    fontSize: 11,
    fontWeight: '900',
    marginTop: 10,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  languageFooterNote: {
    color: ONBOARDING_COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 18,
    textAlign: 'center',
  },
  stepTitle: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 30,
    flexShrink: 1,
    marginTop: 0,
    textAlign: 'center',
    width: '100%',
  },
  stepTitleCompact: {
    fontSize: 22,
    lineHeight: 27,
  },
  stepText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    flexShrink: 1,
    textAlign: 'center',
    width: '100%',
  },
  stepTextCompact: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  benefitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  benefitRowCompact: {
    gap: 7,
    marginTop: 12,
  },
  benefitChip: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  benefitChipCompact: {
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  benefitText: {
    fontSize: 12,
    fontWeight: '900',
  },
  benefitTextCompact: {
    fontSize: 11,
  },
  introChoiceList: {
    gap: 12,
    marginTop: 18,
  },
  introChoiceCard: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 22,
    borderWidth: 1.5,
    elevation: 2,
    padding: 16,
    shadowColor: '#5B9E96',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  genderChoiceGrid: {
    flexDirection: 'row',
  },
  genderChoiceCard: {
    alignItems: 'center',
    flex: 1,
    minHeight: 132,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  genderAvatarBubble: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderRadius: 28,
    borderWidth: 2,
    height: 56,
    justifyContent: 'center',
    marginBottom: 8,
    width: 56,
  },
  genderAvatarGlyph: {
    fontSize: 31,
    lineHeight: 35,
  },
  genderChoiceTitle: {
    fontSize: 13,
    lineHeight: 16,
    textAlign: 'center',
  },
  genderChoiceText: {
    fontSize: 10,
    lineHeight: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  introChoiceTitle: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    flexShrink: 1,
    textAlign: 'center',
  },
  introChoiceText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
  },
  introChoiceTextActive: {
    color: 'rgba(255,255,255,0.86)',
  },
  mascotChoiceGrid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  mascotChoice: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 18,
    borderWidth: 1.5,
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 158,
    paddingHorizontal: 8,
    paddingVertical: 12,
    width: '48%',
  },
  mascotChoiceImage: {
    height: 64,
    width: 64,
  },
  mascotChoiceTitle: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 6,
    textAlign: 'center',
  },
  mascotChoiceText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
    marginTop: 3,
    textAlign: 'center',
  },
  rafikiIntroWrap: {
    alignItems: 'center',
    marginTop: 18,
  },
  rafikiImageRing: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderRadius: 999,
    borderWidth: 3,
    height: 156,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 156,
  },
  rafikiIntroImage: {
    height: 138,
    width: 138,
  },
  rafikiSpeechBubble: {
    backgroundColor: ONBOARDING_COLORS.bgSoft,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    borderWidth: 1.5,
    marginTop: 18,
    padding: 16,
    position: 'relative',
    width: '100%',
  },
  rafikiSpeechText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
    textAlign: 'center',
  },
  rafikiSpeechTailOuter: {
    borderLeftColor: 'transparent',
    borderLeftWidth: 12,
    borderTopColor: ONBOARDING_COLORS.border,
    borderTopWidth: 12,
    bottom: -12,
    height: 0,
    left: 28,
    position: 'absolute',
    width: 0,
  },
  rafikiSpeechTailInner: {
    borderLeftColor: 'transparent',
    borderLeftWidth: 10,
    borderTopColor: ONBOARDING_COLORS.bgSoft,
    borderTopWidth: 10,
    bottom: -9,
    height: 0,
    left: 30,
    position: 'absolute',
    width: 0,
  },
  rafikiNamePill: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderRadius: 999,
    borderWidth: 2,
    marginTop: 14,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  rafikiName: {
    fontSize: 20,
    fontWeight: '900',
  },
  rafikiSubLabel: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  voiceOrb: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: ONBOARDING_COLORS.primaryLight,
    borderRadius: 999,
    borderWidth: 2,
    height: 110,
    justifyContent: 'center',
    marginTop: 16,
    width: 110,
  },
  voiceOrbEmoji: {
    fontSize: 42,
    lineHeight: 48,
  },
  voiceChooseLabel: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 12,
    textAlign: 'center',
  },
  voiceCurrentName: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
    textAlign: 'center',
  },
  voiceSliderTrack: {
    alignSelf: 'center',
    backgroundColor: ONBOARDING_COLORS.border,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 18,
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 190,
  },
  voiceSliderDot: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.textMuted,
    borderRadius: 999,
    borderWidth: 1.5,
    height: 12,
    width: 12,
  },
  voiceChoiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  voiceChoice: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 2,
    minHeight: 76,
    padding: 12,
    shadowColor: '#5B9E96',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    width: '47%',
  },
  voiceChoiceTitle: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '900',
    flexShrink: 1,
    textAlign: 'center',
  },
  voiceChoiceText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
    lineHeight: 16,
    marginTop: 5,
    textAlign: 'center',
  },
  textOnlyRow: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 22,
    borderWidth: 1.5,
    elevation: 2,
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    minHeight: 72,
    padding: 12,
    shadowColor: '#5B9E96',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  textOnlyIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  textOnlyIconText: {
    fontSize: 15,
    fontWeight: '900',
  },
  textOnlyCopy: {
    alignItems: 'center',
    flex: 1,
  },
  textOnlyTitle: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  textOnlyText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 2,
    textAlign: 'center',
  },
  textOnlySwitch: {
    backgroundColor: ONBOARDING_COLORS.border,
    borderRadius: 999,
    height: 26,
    justifyContent: 'center',
    paddingHorizontal: 3,
    width: 46,
  },
  textOnlySwitchKnob: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderRadius: 999,
    height: 20,
    width: 20,
  },
  textOnlySwitchKnobOn: {
    alignSelf: 'flex-end',
  },
  reminderPhoneMockup: {
    backgroundColor: ONBOARDING_COLORS.bgSoft,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 22,
    borderWidth: 2,
    marginTop: 16,
    padding: 14,
  },
  reminderPhoneStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reminderPhoneStatusText: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '900',
  },
  reminderPhoneNotch: {
    backgroundColor: ONBOARDING_COLORS.textPrimary,
    borderRadius: 999,
    height: 5,
    width: 40,
  },
  reminderNotificationCard: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  reminderAppIcon: {
    alignItems: 'center',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  reminderAppIconText: {
    color: ONBOARDING_COLORS.white,
    fontSize: 16,
    fontWeight: '900',
  },
  reminderNotificationCopy: {
    flex: 1,
  },
  reminderNotificationHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reminderAppName: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '900',
  },
  reminderTimestamp: {
    color: ONBOARDING_COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  reminderNotificationBody: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  reminderMascotAvatar: {
    height: 28,
    width: 28,
  },
  reminderNotificationTextBlock: {
    flex: 1,
  },
  reminderNotificationTitle: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
  },
  reminderNotificationText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 2,
  },
  reminderBenefitStrip: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  reminderBenefitCard: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.bgSoft,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    padding: 10,
  },
  reminderBenefitIcon: {
    fontSize: 18,
  },
  reminderBenefitText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  reminderFooterCaption: {
    color: ONBOARDING_COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 10,
    textAlign: 'center',
  },
  needChoiceGrid: {
    gap: 12,
    marginTop: 18,
  },
  genderChoiceGridCompact: {
    gap: 10,
    marginTop: 14,
  },
  needChoice: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 22,
    borderWidth: 1.5,
    elevation: 2,
    minHeight: 112,
    padding: 16,
    position: 'relative',
    shadowColor: '#5B9E96',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  microphonePanel: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderRadius: 22,
    borderWidth: 1.5,
    marginTop: 18,
    padding: 18,
  },
  microphonePanelTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 10,
    textAlign: 'center',
  },
  microphonePanelMainTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  microphonePanelText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  roleChoiceLocked: {
    opacity: 0.56,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginTop: 18,
  },
  interestGrid: {
    marginTop: 14,
    rowGap: 8,
  },
  roleCard: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.bgSoft,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 22,
    borderWidth: 1.5,
    elevation: 2,
    justifyContent: 'center',
    minHeight: 124,
    paddingHorizontal: 10,
    paddingVertical: 18,
    position: 'relative',
    shadowColor: '#5B9E96',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    width: '48%',
  },
  parentPillCard: {
    borderRadius: 999,
    elevation: 0,
    minHeight: 54,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowOpacity: 0,
    width: '100%',
  },
  parentPillText: {
    fontSize: 14,
    lineHeight: 18,
  },
  interestCard: {
    minHeight: 118,
    paddingVertical: 15,
  },
  roleCardCheck: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.primary,
    borderRadius: 999,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    top: 8,
    width: 18,
  },
  roleCardIcon: {
    fontSize: 34,
    lineHeight: 40,
    marginBottom: 8,
  },
  roleCardLabel: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  roleCardText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
    textAlign: 'center',
  },
  roleCardLabelDense: {
    fontSize: 12,
    lineHeight: 16,
  },
  gradeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 6,
    rowGap: 9,
  },
  gradeCell: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.bgSoft,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    paddingVertical: 13,
    position: 'relative',
    width: '31.5%',
  },
  gradeCellText: {
    color: ONBOARDING_COLORS.textPrimary,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  gradeCellCheck: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '800',
    position: 'absolute',
    right: 6,
    top: 4,
  },
  subjectCountFooter: {
    fontWeight: '700',
    marginTop: 10,
  },
  signupBrandRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    marginTop: 0,
  },
  signupBrandRowCompact: {
    marginBottom: 4,
  },
  signupMascotCentered: {
    height: 82,
    width: 82,
  },
  signupMascotCenteredCompact: {
    height: 62,
    width: 62,
  },
  signupBrandIcon: {
    fontSize: 26,
    marginRight: 8,
  },
  signupBrandWordmark: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  signupBrandBadge: {
    backgroundColor: ONBOARDING_COLORS.primary,
    borderRadius: 6,
    color: ONBOARDING_COLORS.white,
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 6,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  skipGhostButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 17,
  },
  skipGhostText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  pickerField: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickerFieldText: {
    color: ONBOARDING_COLORS.textPrimary,
    flex: 1,
    fontSize: 16,
  },
  pickerFieldPlaceholder: {
    color: ONBOARDING_COLORS.textMuted,
  },
  pickerChevron: {
    color: ONBOARDING_COLORS.textMuted,
    fontSize: 14,
    marginLeft: 8,
  },
  pickerBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(26,18,7,0.45)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pickerSheet: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    maxHeight: 380,
    overflow: 'hidden',
    width: '100%',
  },
  pickerSearchInput: {
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
  },
  pickerList: {
    maxHeight: 300,
  },
  pickerRow: {
    borderBottomColor: ONBOARDING_COLORS.border,
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  pickerRowText: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  pickerRowTextActive: {
    fontWeight: '700',
  },
  pickerRowMeta: {
    color: ONBOARDING_COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  pickerEmpty: {
    color: ONBOARDING_COLORS.textMuted,
    fontSize: 14,
    padding: 18,
    textAlign: 'center',
  },
  needChoiceCheck: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderRadius: 999,
    height: 22,
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    top: 12,
    width: 22,
  },
  needChoiceTitle: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
    flexShrink: 1,
    lineHeight: 21,
    paddingRight: 26,
    textAlign: 'center',
  },
  needChoiceText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
    lineHeight: 19,
    marginTop: 8,
    textAlign: 'center',
  },
  goalChoice: {
    paddingTop: 18,
  },
  goalChoiceRecommended: {
    paddingTop: 28,
  },
  goalChoiceIcon: {
    fontSize: 24,
    lineHeight: 28,
    marginBottom: 8,
  },
  recommendedBadge: {
    alignSelf: 'center',
    backgroundColor: ONBOARDING_COLORS.accentLight,
    borderRadius: 999,
    color: ONBOARDING_COLORS.accent,
    fontSize: 10,
    fontWeight: '800',
    left: '50%',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
    position: 'absolute',
    top: -8,
    transform: [{ translateX: -46 }],
    textTransform: 'uppercase',
    zIndex: 2,
  },
  recommendedBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    color: ONBOARDING_COLORS.white,
  },
  storyPanelDanger: {
    backgroundColor: ONBOARDING_COLORS.dangerLight,
    borderColor: `${ONBOARDING_COLORS.danger}33`,
  },
  storyPanelSuccess: {
    backgroundColor: ONBOARDING_COLORS.accentLight,
    borderColor: `${ONBOARDING_COLORS.accent}44`,
  },
  storyHeroEmoji: {
    fontSize: 56,
    lineHeight: 62,
    marginTop: 12,
    textAlign: 'center',
  },
  storyTag: {
    color: ONBOARDING_COLORS.textMuted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 8,
    textAlign: 'center',
  },
  storyPanelRow: {
    alignItems: 'center',
    borderRadius: 13,
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  storyPanelIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  storyPanelText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
  },
  storyPanelDangerText: {
    color: '#9F1239',
  },
  storyPanelSuccessText: {
    color: '#166534',
  },
  goalConfirmSentence: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 34,
    marginTop: 18,
    textAlign: 'center',
  },
  goalConfirmSentenceCompact: {
    fontSize: 22,
    lineHeight: 30,
  },
  goalConfirmTime: {
    fontSize: 28,
    fontWeight: '900',
  },
  goalConfirmProofCard: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  goalConfirmProofIcon: {
    fontSize: 30,
    lineHeight: 34,
    textAlign: 'center',
  },
  goalConfirmProofNumber: {
    fontSize: 22,
    fontWeight: '900',
  },
  socialProofPanel: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
  },
  socialProofPanelCompact: {
    marginTop: 10,
    padding: 12,
  },
  socialProofNumber: {
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
  },
  socialProofText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  goodNewsStudioPage: {
    gap: 7,
    marginTop: 0,
  },
  goodNewsHeroCluster: {
    flexDirection: 'row',
    minHeight: 190,
    position: 'relative',
  },
  goodNewsCopyColumn: {
    flexShrink: 0,
    paddingTop: 0,
    width: 206,
    zIndex: 2,
  },
  goodNewsBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    minHeight: 30,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  goodNewsBadgeIcon: {
    fontSize: 17,
    lineHeight: 19,
  },
  goodNewsBadgeText: {
    color: '#11945B',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  goodNewsHeadlineWrap: {
    marginTop: 8,
  },
  goodNewsHeadlineRest: {
    color: '#071A44',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 24,
  },
  goodNewsHeadlineAccent: {
    color: '#095CFF',
    fontSize: 46,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 49,
  },
  goodNewsBody: {
    color: '#071A44',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 205,
  },
  goodNewsPhotoFrame: {
    height: 184,
    position: 'absolute',
    right: -14,
    top: 6,
    width: 150,
    zIndex: 1,
  },
  goodNewsPhotoHalo: {
    backgroundColor: '#DFF5F8',
    borderRadius: 96,
    height: 166,
    opacity: 0.8,
    position: 'absolute',
    right: -18,
    top: -10,
    width: 166,
  },
  goodNewsPhoto: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    borderTopLeftRadius: 82,
    borderTopRightRadius: 82,
    height: 166,
    position: 'absolute',
    right: 4,
    top: 0,
    width: 134,
  },
  goodNewsMascotBubble: {
    backgroundColor: '#E8F8EE',
    borderRadius: 28,
    borderWidth: 2,
    bottom: 6,
    height: 50,
    overflow: 'hidden',
    position: 'absolute',
    right: -2,
    width: 50,
    zIndex: 3,
  },
  goodNewsMascotImage: {
    height: '100%',
    width: '100%',
  },
  goodNewsSubjectStack: {
    bottom: 2,
    left: 2,
    position: 'absolute',
    width: 82,
  },
  goodNewsSubjectBook: {
    borderRadius: 5,
    height: 21,
    justifyContent: 'center',
    marginTop: -2,
    paddingHorizontal: 7,
    shadowColor: '#071A44',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
  },
  goodNewsSubjectBookGreen: {
    backgroundColor: '#27B46B',
  },
  goodNewsSubjectBookBlue: {
    backgroundColor: '#1579F6',
  },
  goodNewsSubjectBookGold: {
    backgroundColor: '#F5B63D',
  },
  goodNewsSubjectBookText: {
    color: ONBOARDING_COLORS.white,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0,
  },
  goodNewsPathCard: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: '#E7EDF8',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#244B84',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  goodNewsPathTitle: {
    color: '#071A44',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 7,
  },
  goodNewsPathBody: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goodNewsGradeBlock: {
    alignItems: 'center',
    backgroundColor: '#EEF2F8',
    borderRadius: 10,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  goodNewsGradeBlockLabel: {
    color: '#071A44',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 16,
  },
  goodNewsGradeBlockValue: {
    color: '#405172',
    fontSize: 31,
    fontWeight: '900',
    lineHeight: 34,
  },
  goodNewsPathArrowArea: {
    alignItems: 'center',
    flex: 1,
    height: 64,
    justifyContent: 'center',
    minWidth: 96,
  },
  goodNewsPathArrow: {
    position: 'absolute',
    top: 0,
  },
  goodNewsMidpoint: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 23,
    marginTop: 18,
    textAlign: 'center',
  },
  goodNewsGradeBlockAfter: {
    alignItems: 'center',
    borderRadius: 10,
    height: 68,
    justifyContent: 'center',
    width: 66,
  },
  goodNewsGradeBlockAfterLabel: {
    color: ONBOARDING_COLORS.white,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 16,
  },
  goodNewsGradeBlockAfterValue: {
    color: ONBOARDING_COLORS.white,
    fontSize: 35,
    fontWeight: '900',
    lineHeight: 38,
  },
  goodNewsProgressRail: {
    alignItems: 'center',
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 2,
  },
  goodNewsProgressDotMuted: {
    backgroundColor: '#B8C4D8',
    borderColor: ONBOARDING_COLORS.white,
    borderRadius: 10,
    borderWidth: 3,
    height: 16,
    width: 16,
  },
  goodNewsProgressLine: {
    backgroundColor: '#D8E0ED',
    flex: 1,
    height: 3,
  },
  goodNewsProgressDotActive: {
    backgroundColor: '#28C983',
    borderColor: ONBOARDING_COLORS.white,
    borderRadius: 10,
    borderWidth: 3,
    height: 16,
    width: 16,
  },
  goodNewsProgressCaption: {
    color: '#405172',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    marginTop: 5,
    textAlign: 'center',
  },
  goodNewsBenefitGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  goodNewsBenefitCard: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: '#E7EDF8',
    borderRadius: 16,
    borderTopWidth: 4,
    borderWidth: 1,
    flex: 1,
    minHeight: 96,
    paddingHorizontal: 6,
    paddingVertical: 7,
    shadowColor: '#244B84',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  goodNewsBenefitIconBubble: {
    alignItems: 'center',
    borderRadius: 23,
    height: 38,
    justifyContent: 'center',
    marginBottom: 5,
    width: 38,
  },
  goodNewsBenefitIcon: {
    color: ONBOARDING_COLORS.white,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
  },
  goodNewsBenefitTitle: {
    color: '#071A44',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 14,
    textAlign: 'center',
  },
  goodNewsBenefitBody: {
    color: '#405172',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  goodNewsSupportCard: {
    alignItems: 'flex-start',
    backgroundColor: '#F8FBFF',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  goodNewsSupportMark: {
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
  },
  goodNewsSupportText: {
    color: '#071A44',
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  gradeImprovementCard: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
  },
  gradeImprovementSmall: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    textAlign: 'center',
  },
  gradeImprovementNumber: {
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 48,
    marginVertical: 4,
    textAlign: 'center',
  },
  proofBarStack: {
    gap: 12,
    marginTop: 18,
  },
  proofBarRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  proofBarLabel: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    width: 96,
  },
  proofBarTrack: {
    backgroundColor: ONBOARDING_COLORS.border,
    borderRadius: 999,
    flex: 1,
    height: 8,
    overflow: 'hidden',
  },
  proofBarFill: {
    borderRadius: 999,
    height: '100%',
  },
  proofBarFillCurrent: {
    width: '38%',
  },
  proofBarFillKitabu: {
    width: '72%',
  },
  researchQuoteCard: {
    backgroundColor: ONBOARDING_COLORS.bgSoft,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  researchQuoteText: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    textAlign: 'center',
  },
  researchQuoteEmphasis: {
    fontWeight: '900',
  },
  researchQuoteSource: {
    color: ONBOARDING_COLORS.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
  },
  solutionCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  solutionRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  solutionBullet: {
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
  },
  solutionText: {
    color: ONBOARDING_COLORS.textPrimary,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
  comparisonRows: {
    gap: 12,
    marginTop: 18,
  },
  comparisonRow: {
    gap: 8,
  },
  comparisonLabel: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '900',
  },
  comparisonTrack: {
    backgroundColor: ONBOARDING_COLORS.border,
    borderRadius: 999,
    height: 9,
    overflow: 'hidden',
  },
  comparisonFill: {
    borderRadius: 999,
    height: '100%',
  },
  comparisonFillCurrent: {
    width: '38%',
  },
  comparisonFillKitabu: {
    width: '72%',
  },
  countryPill: {
    alignSelf: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderRadius: 999,
    borderWidth: 2,
    marginTop: 18,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  countryFlagEmoji: {
    fontSize: 72,
    lineHeight: 78,
    marginTop: 12,
    textAlign: 'center',
  },
  countryInfoCard: {
    backgroundColor: ONBOARDING_COLORS.primaryLight,
  },
  countryPillText: {
    fontSize: 18,
    fontWeight: '900',
  },
  interestsSkipButton: {
    alignSelf: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 16,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  interestsSkipText: {
    fontSize: 14,
    fontWeight: '900',
  },
  loadingProfilePanel: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 18,
    padding: 20,
  },
  loadingProfileTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 14,
    textAlign: 'center',
  },
  loadingProfileText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingProgressRing: {
    alignItems: 'center',
    borderRadius: 80,
    borderWidth: 4,
    height: 160,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 160,
  },
  loadingProgressMascot: {
    height: 108,
    width: 108,
  },
  loadingProgressBadge: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderRadius: 999,
    bottom: 14,
    minWidth: 68,
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: 'absolute',
  },
  loadingProgressBadgeText: {
    fontSize: 20,
    fontWeight: '900',
  },
  loadingProgressTrack: {
    backgroundColor: ONBOARDING_COLORS.border,
    borderRadius: 999,
    height: 10,
    marginTop: 14,
    overflow: 'hidden',
    width: '100%',
  },
  loadingProgressFill: {
    borderRadius: 999,
    height: '100%',
  },
  loadingProgressText: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 6,
  },
  profileReadyChecklist: {
    gap: 10,
    marginTop: 16,
  },
  profileReadyChecklistCompact: {
    gap: 6,
    marginTop: 10,
  },
  profileReadyRowCompact: {
    padding: 9,
  },
  profileReadyRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  profileReadyCheck: {
    alignItems: 'center',
    borderRadius: 999,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  profileReadyRowText: {
    color: ONBOARDING_COLORS.textSecondary,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  readyTestimonialText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  readyTestimonialAuthor: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 6,
    textAlign: 'center',
  },
  readyRatingStars: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 4,
    textAlign: 'center',
  },
  readyTestimonialCarousel: {
    alignItems: 'center',
    marginTop: 4,
  },
  readyTestimonialDots: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 12,
  },
  readyTestimonialDotButton: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.border,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  readyTestimonialDotText: {
    color: 'transparent',
    fontSize: 1,
    height: 1,
    width: 1,
  },
  signupStepDots: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
  },
  signupStepDot: {
    backgroundColor: 'transparent',
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 999,
    borderWidth: 1.5,
    height: 10,
    width: 10,
  },
  signupInlineBack: {
    alignSelf: 'flex-start',
    marginTop: 8,
    minHeight: 34,
    paddingVertical: 8,
  },
  signupInlineBackText: {
    fontSize: 13,
    fontWeight: '900',
  },
  signupMethodStack: {
    gap: 12,
    marginTop: 14,
  },
  signupGoogleButton: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 18,
  },
  signupGoogleMark: {
    color: '#4285F4',
    fontSize: 18,
    fontWeight: '900',
  },
  signupGoogleText: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  signupPrimaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    elevation: 4,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 52,
    paddingHorizontal: 18,
    shadowColor: ONBOARDING_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  signupPrimaryText: {
    color: ONBOARDING_COLORS.white,
    fontSize: 15,
    fontWeight: '900',
  },
  signupPhoneButton: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.bgSoft,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 18,
  },
  signupPhoneButtonDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    opacity: 0.78,
  },
  signupPhoneText: {
    fontSize: 15,
    fontWeight: '900',
  },
  signupTermsText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
    textAlign: 'center',
  },
  signupFormPanel: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  signupInputInvalid: {
    borderColor: ONBOARDING_COLORS.danger,
    borderWidth: 2,
  },
  signupInputValid: {
    borderColor: ONBOARDING_COLORS.accent,
    borderWidth: 2,
  },
  signupFieldError: {
    color: ONBOARDING_COLORS.danger,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
  },
  signupFieldSuccess: {
    color: ONBOARDING_COLORS.accent,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
  },
  signupPhoneInputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  signupPhonePrefix: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.bgSoft,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 14,
    borderWidth: 1.5,
    height: 52,
    justifyContent: 'center',
    width: 76,
  },
  signupPhonePrefixText: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '900',
  },
  signupPhoneInput: {
    flex: 1,
  },
  signupPasswordRow: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: 'row',
  },
  signupPasswordInput: {
    color: ONBOARDING_COLORS.textPrimary,
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  signupEyeButton: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  signupStrengthRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  signupStrengthSegment: {
    backgroundColor: ONBOARDING_COLORS.border,
    borderRadius: 999,
    flex: 1,
    height: 4,
  },
  signupStrengthLabel: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
  },
  signupDestinationText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  signupTestHint: {
    color: ONBOARDING_COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
  },
  signupResendButton: {
    alignSelf: 'center',
    marginTop: 10,
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  signupResendText: {
    fontSize: 13,
    fontWeight: '900',
  },
  signupOtpRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 18,
  },
  signupOtpBox: {
    backgroundColor: ONBOARDING_COLORS.bgSoft,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 12,
    borderWidth: 2,
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    height: 52,
    width: 40,
  },
  readyHeroRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  readyHeroRowCompact: {
    gap: 6,
    marginTop: 0,
  },
  readyHeroBand: {
    alignItems: 'center',
    borderRadius: 24,
    flexDirection: 'row',
    gap: 14,
    marginTop: 16,
    padding: 18,
  },
  readyHeroBandInline: {
    flex: 1,
    gap: 8,
    marginTop: 0,
    minHeight: 112,
    padding: 12,
  },
  readyHeroBandCompact: {
    borderRadius: 20,
    gap: 10,
    marginTop: 8,
    padding: 12,
  },
  readyHeroBandInlineCompact: {
    gap: 7,
    marginTop: 0,
    minHeight: 96,
    padding: 10,
  },
  readyHeroBandMascot: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 80,
  },
  readyHeroBandMascotInline: {
    borderRadius: 30,
    height: 60,
    width: 60,
  },
  readyHeroBandMascotCompact: {
    borderRadius: 28,
    height: 56,
    width: 56,
  },
  readyHeroBandMascotImage: {
    height: 70,
    width: 70,
  },
  readyHeroBandMascotImageCompact: {
    height: 48,
    width: 48,
  },
  readyHeroBandCopy: {
    flex: 1,
  },
  readyHeroBandEyebrow: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  readyHeroBandTitle: {
    color: ONBOARDING_COLORS.white,
    fontSize: 19,
    fontWeight: '900',
    marginTop: 2,
  },
  readyHeroBandTitleCompact: {
    fontSize: 17,
  },
  readyHeroBandSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  readyHeroBandPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 99,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  readyHeroBandPillText: {
    color: ONBOARDING_COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  readyMascotStage: {
    alignItems: 'center',
    height: 100,
    justifyContent: 'center',
    overflow: 'visible',
    width: 82,
  },
  readyMascotStageCompact: {
    height: 82,
    width: 66,
  },
  readyMascotImage: {
    height: 96,
    width: 96,
  },
  readyMascotImageCompact: {
    height: 78,
    width: 78,
  },
  readyGoalsHeading: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
    marginTop: 16,
  },
  readyGoalsHeadingCompact: {
    marginTop: 10,
  },
  profileInput: {
    marginTop: 18,
  },
  gradeBandGrid: {
    gap: 12,
    marginTop: 16,
  },
  teacherGradeBand: {
    gap: 8,
  },
  teacherGradeBandLabel: {
    fontSize: 12,
    fontWeight: '900',
  },
  teacherGradeBandGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  teacherGradeChip: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 8,
    paddingVertical: 9,
  },
  detailStatusText: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 12,
  },
  inlineFieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inlineField: {
    flex: 1,
  },
  childGradeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  childGradeChip: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: '18%',
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 52,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  childCardTitle: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  childFieldLabel: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  additionalChildPanel: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 12,
  },
  additionalChildHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  additionalChildTitle: {
    marginBottom: 0,
    marginTop: 0,
  },
  additionalChildRemove: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.dangerLight,
    borderRadius: 999,
    flexDirection: 'row',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  addChildButton: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    marginTop: 14,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  addChildButtonInner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  addChildButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },
  subjectHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  subjectHeaderRowEnd: {
    justifyContent: 'flex-end',
  },
  gradeBandIndicator: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  gradeBandIndicatorIcon: {
    fontSize: 16,
    lineHeight: 18,
  },
  gradeBandIndicatorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
  },
  subjectGradeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  subjectGradeBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  subjectCount: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 18,
  },
  subjectHelpText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 10,
    marginTop: -2,
  },
  subjectHelpTextCompact: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
  },
  subjectChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subjectSection: {
    gap: 8,
    width: '100%',
  },
  subjectSectionLabel: {
    fontSize: 12,
    fontWeight: '900',
  },
  subjectChip: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    maxWidth: '100%',
    minHeight: 34,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  subjectChipCore: {
    backgroundColor: ONBOARDING_COLORS.accentLight,
    borderColor: ONBOARDING_COLORS.accent,
  },
  subjectChipCompact: {
    minHeight: 30,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  subjectChipDisabled: {
    opacity: 0.45,
  },
  subjectChipText: {
    color: ONBOARDING_COLORS.textSecondary,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    textAlign: 'center',
  },
  subjectChipCoreText: {
    color: ONBOARDING_COLORS.accent,
  },
  subjectChipTextActive: {
    color: ONBOARDING_COLORS.white,
  },
  fieldLabel: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 18,
  },
  fieldLabelCompact: {
    marginBottom: 6,
    marginTop: 14,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  choiceChip: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  choiceChipCompact: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  choiceChipText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  choiceChipTextActive: {
    color: ONBOARDING_COLORS.white,
  },
  input: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 16,
    borderWidth: 2,
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  inputCompact: {
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  inputDisabled: {
    opacity: 0.65,
  },
  dropdownField: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dropdownFieldText: {
    color: ONBOARDING_COLORS.textPrimary,
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  dropdownFieldPlaceholder: {
    color: ONBOARDING_COLORS.textMuted,
    fontWeight: '500',
  },
  dropdownChevron: {
    color: ONBOARDING_COLORS.textMuted,
    fontSize: 16,
    marginLeft: 10,
  },
  schoolList: {
    marginTop: 8,
    maxHeight: 104,
  },
  schoolPickerSheet: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 20,
    borderWidth: 1,
    maxHeight: '82%',
    padding: 16,
    width: '100%',
  },
  schoolPickerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  schoolPickerTitle: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '900',
  },
  schoolPickerDone: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  schoolPickerDoneText: {
    fontSize: 15,
    fontWeight: '800',
  },
  schoolPickerList: {
    marginTop: 8,
    maxHeight: 320,
  },
  schoolResultRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginTop: 8,
  },
  schoolResultStatus: {
    color: ONBOARDING_COLORS.textSecondary,
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
  },
  clearSearchButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minHeight: 30,
    paddingHorizontal: 4,
  },
  clearSearchText: {
    fontSize: 12,
    fontWeight: '900',
  },
  schoolOption: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  schoolOptionCompact: {
    marginBottom: 8,
    padding: 10,
  },
  schoolOptionSelected: {
    borderWidth: 2,
  },
  schoolOptionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  schoolName: {
    color: ONBOARDING_COLORS.textPrimary,
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  schoolSelectedCheck: {
    alignItems: 'center',
    borderRadius: 999,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  schoolMeta: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  schoolGradeMeta: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 6,
  },
  selectedSchoolCard: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedSchoolIcon: {
    fontSize: 22,
    lineHeight: 24,
  },
  selectedSchoolTextBlock: {
    flex: 1,
  },
  selectedSchoolName: {
    fontSize: 14,
    fontWeight: '900',
  },
  selectedSchoolMeta: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },
  emptyText: {
    color: ONBOARDING_COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  helperText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  centeredText: {
    textAlign: 'center',
  },
  reviewPanel: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 12,
  },
  reviewPanelCompact: {
    marginTop: 10,
    padding: 10,
  },
  reviewTitle: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  reviewGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  reviewGridCompact: {
    flexDirection: 'column',
    gap: 8,
  },
  reviewItem: {
    flex: 1,
  },
  reviewItemCompact: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  reviewLabel: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  reviewLabelCompact: {
    minWidth: 96,
  },
  reviewValue: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  reviewValueCompact: {
    flex: 1,
    lineHeight: 18,
    marginTop: 0,
    textAlign: 'right',
  },
  addSchoolHelpText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 14,
    textAlign: 'center',
  },
  addSchoolButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderWidth: 1.5,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 46,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  addSchoolButtonPressed: {
    opacity: 0.78,
  },
  addSchoolButtonText: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  addSchoolCounty: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  addSchoolDescription: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  addSchoolInput: {
    marginTop: 0,
  },
  addSchoolInputError: {
    borderColor: ONBOARDING_COLORS.danger,
  },
  addSchoolError: {
    color: ONBOARDING_COLORS.danger,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  addSchoolSubmitButton: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  addSchoolSubmitButtonPressed: {
    opacity: 0.86,
  },
  addSchoolSubmitButtonDisabled: {
    opacity: 0.6,
  },
  addSchoolSubmitText: {
    color: ONBOARDING_COLORS.white,
    fontSize: 14,
    fontWeight: '900',
  },
  errorText: {
    color: ONBOARDING_COLORS.danger,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
  },
  footerRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 12,
    marginTop: 0,
    paddingTop: 12,
    width: '100%',
  },
  footerRowCompact: {
    marginTop: 12,
    paddingTop: 0,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.border,
    borderRadius: 24,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: 10,
    width: 132,
  },
  secondaryButtonCompact: {
    minHeight: 44,
    width: 126,
  },
  secondaryButtonDisabled: {
    opacity: 0.55,
  },
  secondaryText: {
    color: ONBOARDING_COLORS.textSecondary,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.primary,
    borderRadius: 24,
    elevation: 4,
    flex: 1,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: 12,
    shadowColor: ONBOARDING_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  primaryButtonCompact: {
    minHeight: 48,
    paddingHorizontal: 10,
  },
  primaryButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonDisabled: {
    elevation: 0,
    opacity: 0.55,
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  primaryText: {
    color: ONBOARDING_COLORS.white,
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 20,
    textAlign: 'center',
  },
  footerDock: {
    backgroundColor: 'rgba(242,255,251,0.9)',
    borderTopColor: 'rgba(255,255,255,0.7)',
    borderTopWidth: 1,
    paddingHorizontal: 20,
  },
});
