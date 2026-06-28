import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
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
import { LinearGradient } from 'expo-linear-gradient';
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  Check,
  ChevronRight,
  ClipboardList,
  Eye,
  EyeOff,
  HelpCircle,
  Home,
  Mail,
  MessageCircle,
  Phone,
  UserCircle,
  Users,
  X,
} from 'lucide-react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { DEFAULT_GRADE, SUPPORTED_GRADES } from '../constants/grades';
import { SUBJECTS } from '../data/mockData';
import { requestPhoneAuthCode } from '../services/authService';
import { triggerHaptic } from '../services/haptics';
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

const WHATSAPP_ADMIN_LINK = 'https://wa.me/254716175485?text=I%20need%20help';
const MPESA_PHONE_ERROR = 'Enter a valid Safaricom M-Pesa number, for example 0716175485.';
const MAX_ONBOARDING_SUBJECTS = 5;
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
const ONBOARDING_COLORS = {
  bg: '#FFFFFF',
  bgSoft: '#FBF8F3',
  border: '#E8E0D4',
  primary: '#E07B00',
  primaryLight: '#FEF0D9',
  accent: '#2D8653',
  accentLight: '#D6F0E3',
  textPrimary: '#1A1207',
  textSecondary: '#5C4A2A',
  textMuted: '#A08C6E',
  danger: '#C0392B',
  dangerLight: '#FDECEA',
  white: '#FFFFFF',
} as const;
const sunguraRabbitMascot = require('../assets/mascot/sungura-rabbit.png');
const simbaLionMascot = require('../assets/mascot/simba-lion.png');
const ndovuElephantMascot = require('../assets/mascot/ndovu-elephant.png');

type OnboardingMascot = {
  key: OnboardingMascotKey;
  source: ImageSourcePropType;
  label: string;
  name: string;
  description: string;
};

type IntroStep =
  | 'language'
  | 'mascot'
  | 'rafiki'
  | 'role'
  | 'voice'
  | 'need'
  | 'name'
  | 'gender'
  | 'roleDetails'
  | 'goal'
  | 'goalConfirm'
  | 'concerns'
  | 'achieve'
  | 'painBefore'
  | 'painAfter'
  | 'socialProof'
  | 'resultProof'
  | 'country'
  | 'interests'
  | 'reminder'
  | 'setup'
  | 'loading'
  | 'signup'
  | 'profileReady'
  | 'dashboard';

type SignupStep = 'method' | 'email' | 'phone' | 'verify' | 'google';
type SignupMethod = 'email' | 'phone' | 'google';
type MascotPose = 'wave' | 'cool' | 'think' | 'happy' | 'cheer' | 'worried' | 'sleep' | 'celebrate';

type LanguageOption = {
  code: OnboardingLanguageCode;
  label: string;
  description: string;
};

type NeedOption = {
  key: OnboardingNeedKey;
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

type VoiceOption = {
  name: OnboardingVoiceName;
  description: string;
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
    gradient: [ONBOARDING_COLORS.bg, ONBOARDING_COLORS.bgSoft, ONBOARDING_COLORS.accentLight],
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
    gradient: [ONBOARDING_COLORS.bg, ONBOARDING_COLORS.bgSoft, ONBOARDING_COLORS.accentLight],
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
    accent: ONBOARDING_COLORS.primary,
    mascot: {
      key: 'lion',
      source: simbaLionMascot,
      label: 'Rafiki the Lion teacher mascot',
      name: 'Rafiki the Lion',
      description: 'Confident class planning and reporting.',
    },
    coachTips: ['Choose class', 'Link school', 'Billing ready'],
    gradient: [ONBOARDING_COLORS.bg, ONBOARDING_COLORS.primaryLight, ONBOARDING_COLORS.accentLight],
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
    gradient: [ONBOARDING_COLORS.bg, ONBOARDING_COLORS.accentLight, ONBOARDING_COLORS.bgSoft],
  },
};

const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  {
    code: 'sw',
    label: 'Kiswahili',
    description: 'Tumia Kitabu kwa Kiswahili na Kiingereza rahisi.',
  },
  {
    code: 'en',
    label: 'English',
    description: 'Use Kitabu in clear English with Kenyan school context.',
  },
];

const MASCOT_OPTIONS: readonly OnboardingMascot[] = [
  {
    key: 'lion',
    source: simbaLionMascot,
    label: 'Rafiki the Lion mascot',
    name: 'Rafiki the Lion',
    description: 'Bold coach for exam confidence.',
  },
  {
    key: 'rabbit',
    source: sunguraRabbitMascot,
    label: 'Rafiki the Rabbit mascot',
    name: 'Rafiki the Rabbit',
    description: 'Quick helper for daily practice.',
  },
  {
    key: 'elephant',
    source: ndovuElephantMascot,
    label: 'Rafiki the Elephant mascot',
    name: 'Rafiki the Elephant',
    description: 'Calm guide for steady progress.',
  },
];
const MASCOT_PICKER_COLORS: Record<OnboardingMascotKey, { color: string; lightColor: string; animalLabel: string }> = {
  lion: { color: '#D97706', lightColor: '#FEF3C7', animalLabel: 'The Lion' },
  rabbit: { color: '#0E9F6E', lightColor: '#D6F0E3', animalLabel: 'The Rabbit' },
  elephant: { color: '#2563EB', lightColor: '#DBEAFE', animalLabel: 'The Elephant' },
};

const VOICE_OPTIONS: readonly VoiceOption[] = [
  { name: 'Amina', description: 'Warm and encouraging' },
  { name: 'Kamau', description: 'Calm and clear' },
  { name: 'Zawadi', description: 'Bright and energetic' },
  { name: 'Juma', description: 'Patient and steady' },
];

const ROLE_OPTIONS: readonly OnboardingRoleOption[] = [
  {
    role: 'student',
    label: 'Student',
    swLabel: 'Mwanafunzi',
    description: 'I need help studying.',
    swDescription: 'Natafuta msaada.',
  },
  {
    role: 'teacher',
    label: 'Teacher',
    swLabel: 'Mwalimu',
    description: 'I support students.',
    swDescription: 'Nasaidia wanafunzi.',
  },
  {
    role: 'parent',
    label: 'Parent',
    swLabel: 'Mzazi',
    description: 'For my child.',
    swDescription: 'Mtoto wangu.',
  },
  {
    role: 'other',
    label: 'Other',
    swLabel: 'Nyingine',
    description: '',
    swDescription: '',
  },
];

const NEED_OPTIONS: Record<PublicSignupRole, readonly NeedOption[]> = {
  student: [
    {
      key: 'exam',
      label: 'I have an exam coming up',
      description: 'Quick study plan, no stress.',
    },
    {
      key: 'grades',
      label: 'I want better grades',
      description: 'Smarter studying, better results.',
    },
  ],
  teacher: [
    {
      key: 'resources',
      label: 'Better lesson resources',
      description: 'Engaging, curriculum-aligned content.',
    },
    {
      key: 'results',
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
      label: 'I want to learn',
      description: 'Useful explanations and practice.',
    },
    {
      key: 'help',
      label: 'Help someone else',
      description: 'Support another learner with Kitabu.',
    },
  ],
};

const SWAHILI_NEED_OPTIONS: Record<PublicSignupRole, readonly NeedOption[]> = {
  student: [
    {
      key: 'exam',
      label: 'Nina mtihani karibu',
      description: 'Mpango wa haraka, bila wasiwasi.',
    },
    {
      key: 'grades',
      label: 'Nataka alama bora',
      description: 'Masomo ya akili, matokeo mazuri.',
    },
  ],
  teacher: [
    {
      key: 'resources',
      label: 'Nyenzo bora za mafunzo',
      description: 'Maudhui yanayofuata mtaala.',
    },
    {
      key: 'results',
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
      label: 'Nataka kujifunza',
      description: 'Maelezo na mazoezi yanayosaidia.',
    },
    {
      key: 'help',
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
    eyebrow: 'A few more details',
    heading: name => (name ? `How old are you, ${name}?` : 'How old are you?'),
    placeholder: 'Your age...',
    subText: 'We tailor content to your age group.',
  },
  sw: {
    eyebrow: 'Maelezo machache zaidi',
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
    label: 'Upper Primary (CBC)',
    grades: ['Grade 4', 'Grade 5', 'Grade 6'],
  },
  {
    label: 'Junior Secondary (CBC)',
    grades: ['Grade 7', 'Grade 8', 'Grade 9'],
  },
  {
    label: 'Senior Secondary (CBC)',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
  },
];

const CBC_SUBJECTS_BY_GRADE_BAND: Record<'upper' | 'junior' | 'senior', readonly string[]> = {
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
    'Kiswahili',
    'Community Service Learning',
    'Physical Education',
    'Mathematics / Adv. Mathematics',
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
    'Literature in English',
    'Fasihi ya Kiswahili',
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

const CBC_CORE_SUBJECTS_BY_GRADE_BAND: Record<'upper' | 'junior' | 'senior', readonly string[]> = {
  upper: ['English', 'Mathematics', 'Kiswahili'],
  junior: ['English', 'Mathematics', 'Kiswahili'],
  senior: ['English', 'Kiswahili', 'Community Service Learning', 'Physical Education'],
};

const GRADE_BAND_LABELS: Record<'upper' | 'junior' | 'senior', Record<OnboardingLanguageCode, string>> = {
  upper: {
    en: 'Upper Primary (CBC)',
    sw: 'Shule ya Msingi - Juu (CBC)',
  },
  junior: {
    en: 'Junior Secondary (CBC)',
    sw: 'Shule ya Sekondari ya Chini (CBC)',
  },
  senior: {
    en: 'Senior Secondary (CBC)',
    sw: 'Shule ya Sekondari ya Juu (CBC)',
  },
};

const ONBOARDING_SUBJECT_ID_ALIASES: Record<string, string> = {
  English: 'english',
  Mathematics: 'math',
  Kiswahili: 'kiswahili',
  'Social Studies': 'social',
  Agriculture: 'agriculture',
  'Creative Arts': 'creative_arts',
};

function gradeBandForGrade(gradeValue: string): 'upper' | 'junior' | 'senior' {
  const gradeNumber = Number(gradeValue.replace(/\D/g, ''));

  if (gradeNumber >= 10) {
    return 'senior';
  }

  if (gradeNumber >= 7) {
    return 'junior';
  }

  return 'upper';
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
      label: 'Build a daily habit',
      description: '10 min / day',
    },
    {
      key: 'consistent',
      icon: '\u2B50',
      label: 'Stay consistent',
      description: '15 min / day',
      recommended: true,
    },
    {
      key: 'top',
      icon: '\uD83D\uDCAA',
      label: 'Become a top student',
      description: '45 min / day',
    },
    {
      key: 'full',
      icon: '\uD83D\uDD25',
      label: 'Reach full potential',
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
      key: 'monitor',
      icon: '\uD83D\uDC41\uFE0F',
      label: 'Monitor my child\'s progress',
      description: 'Get weekly summaries',
    },
    {
      key: 'support',
      icon: '\uD83E\uDD1D',
      label: 'Support homework at home',
      description: 'Know what they\'re studying',
      recommended: true,
    },
    {
      key: 'improve',
      icon: '\uD83D\uDCC8',
      label: 'Help them improve grades',
      description: 'Structured practice',
    },
    {
      key: 'uni',
      icon: '\uD83C\uDF93',
      label: 'Prepare for university',
      description: 'Long-term success',
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
      key: 'monitor',
      icon: '\uD83D\uDC41\uFE0F',
      label: 'Fuatilia maendeleo ya mtoto wangu',
      description: 'Pata muhtasari wa wiki',
    },
    {
      key: 'support',
      icon: '\uD83E\uDD1D',
      label: 'Saidia kazi za nyumbani',
      description: 'Jua wanachosoma',
      recommended: true,
    },
    {
      key: 'improve',
      icon: '\uD83D\uDCC8',
      label: 'Wasaidie kuboresha alama',
      description: 'Mazoezi yaliyopangwa',
    },
    {
      key: 'uni',
      icon: '\uD83C\uDF93',
      label: 'Jiandae kwa chuo kikuu',
      description: 'Mafanikio ya muda mrefu',
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
      icon: '\uD83D\uDE34',
      label: 'My child is not motivated to study.',
      description: '',
    },
    {
      key: 'time',
      icon: '\u23F3',
      label: 'Too much time on phone/TV instead of studying.',
      description: '',
    },
    {
      key: 'grades',
      icon: '\uD83D\uDCC9',
      label: 'Their grades have been dropping.',
      description: '',
    },
    {
      key: 'understand',
      icon: '\uD83E\uDD14',
      label: 'They don\'t understand what they\'re taught.',
      description: '',
    },
    {
      key: 'homework',
      icon: '\uD83D\uDCDD',
      label: 'Homework is a constant battle at home.',
      description: '',
    },
    {
      key: 'involve',
      icon: '\uD83D\uDC4B',
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
    { key: 'motivation', icon: '\uD83D\uDE34', label: 'Mtoto wangu hana hamasa ya kustudy.', description: '' },
    { key: 'time', icon: '\u23F3', label: 'Anatumia muda mwingi kwenye simu/TV badala ya kusoma.', description: '' },
    { key: 'grades', icon: '\uD83D\uDCC9', label: 'Alama zake zimekuwa zikishuka.', description: '' },
    { key: 'understand', icon: '\uD83E\uDD14', label: 'Haelewi kinachofundishwa shuleni.', description: '' },
    { key: 'homework', icon: '\uD83D\uDCDD', label: 'Kazi za nyumbani ni ugomvi wa kila siku nyumbani.', description: '' },
    { key: 'involve', icon: '\uD83D\uDC4B', label: 'Sijui jinsi ya kumsaidia nyumbani.', description: '' },
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
      key: 'grades',
      icon: '\uD83D\uDCC8',
      label: 'See their grades improve this term.',
      description: '',
    },
    {
      key: 'habits',
      icon: '\uD83C\uDF31',
      label: 'Build a daily study habit for them.',
      description: '',
    },
    {
      key: 'gap',
      icon: '\uD83D\uDD0D',
      label: 'Understand exactly where they\'re struggling.',
      description: '',
    },
    {
      key: 'uni',
      icon: '\uD83C\uDF93',
      label: 'Set them up for university success.',
      description: '',
    },
    {
      key: 'involve',
      icon: '\uD83E\uDD1D',
      label: 'Be more involved in their education.',
      description: '',
    },
    {
      key: 'stress',
      icon: '\uD83D\uDE0C',
      label: 'Reduce exam stress and anxiety for them.',
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
    { key: 'grades', icon: '\uD83D\uDCC8', label: 'Ona alama zake zikiboresha muhula huu.', description: '' },
    { key: 'habits', icon: '\uD83C\uDF31', label: 'Imarisha tabia ya kustudy ya kila siku kwao.', description: '' },
    { key: 'gap', icon: '\uD83D\uDD0D', label: 'Jua hasa wanakoshindwa.', description: '' },
    { key: 'uni', icon: '\uD83C\uDF93', label: 'Waandae kwa mafanikio ya chuo kikuu.', description: '' },
    { key: 'involve', icon: '\uD83E\uDD1D', label: 'Kushirikishwa zaidi katika elimu yao.', description: '' },
    { key: 'stress', icon: '\uD83D\uDE0C', label: 'Punguza msongo wa mitihani kwao.', description: '' },
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
  const gradeCount = school.gradeCounts[grade] ?? 0;
  if (gradeCount <= 0) {
    return `No ${grade} learners yet`;
  }

  return `${gradeCount} ${grade} ${gradeCount === 1 ? 'learner' : 'learners'}`;
}

function normalizeCountyName(value: string) {
  return value.trim().toLowerCase().replace(/\s+city$/, '');
}

function countyMatchesLocation(county: string, location: string) {
  return normalizeCountyName(county) === normalizeCountyName(location);
}

interface StudentOnboardingScreenProps {
  role: PublicSignupRole;
  schools: SchoolData[];
  isSubmitting: boolean;
  error?: string | null;
  includeIntroChoices?: boolean;
  collectSignupCredentials?: boolean;
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
    children?: Array<{ name: string; age: string; grade: string }>;
    parentChildren?: Array<{ name: string; age: string; grade: string }>;
    teachGrades?: string[];
    teacherGradeIds?: string[];
    subjects?: string[];
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
  onRoleChange,
  onSubmit,
}: StudentOnboardingScreenProps) {
  const [introStep, setIntroStep] = useState<IntroStep>(includeIntroChoices ? 'language' : 'setup');
  const [languageCode, setLanguageCode] = useState<OnboardingLanguageCode | null>(null);
  const [selectedMascotKey, setSelectedMascotKey] = useState<OnboardingMascotKey | null>(null);
  const [selectedVoiceName, setSelectedVoiceName] = useState<OnboardingVoiceName | null>(null);
  const [noVoice, setNoVoice] = useState(false);
  const [selectedNeedKey, setSelectedNeedKey] = useState<OnboardingNeedKey | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [parentChildName, setParentChildName] = useState('');
  const [parentChildAge, setParentChildAge] = useState('');
  const [parentChildGrade, setParentChildGrade] = useState(includeIntroChoices ? '' : DEFAULT_GRADE);
  const [additionalParentChildren, setAdditionalParentChildren] = useState<Array<{ name: string; age: string; grade: string }>>([]);
  const [teacherGradeIds, setTeacherGradeIds] = useState<string[]>(includeIntroChoices ? [] : [DEFAULT_GRADE]);
  const [selectedGoalKey, setSelectedGoalKey] = useState<OnboardingGoalKey | null>(null);
  const [selectedConcernKey, setSelectedConcernKey] = useState<OnboardingConcernKey | null>(null);
  const [selectedAchievementKey, setSelectedAchievementKey] = useState<OnboardingAchievementKey | null>(null);
  const [selectedInterestKeys, setSelectedInterestKeys] = useState<OnboardingInterestKey[]>([]);
  const [reminderEnabled, setReminderEnabled] = useState(!includeIntroChoices);
  const [preparedMpesaPhoneNumber, setPreparedMpesaPhoneNumber] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState<GenderOption | null>(includeIntroChoices ? null : 'not_specified');
  const [grade, setGrade] = useState(includeIntroChoices ? '' : DEFAULT_GRADE);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(
    includeIntroChoices ? [] : SUBJECTS.slice(0, MAX_ONBOARDING_SUBJECTS).map(subject => subject.id),
  );
  const [county, setCounty] = useState('');
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [customSchoolName, setCustomSchoolName] = useState('');
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
  const { height, width } = useWindowDimensions();
  const insets = useContext(SafeAreaInsetsContext) ?? ZERO_SAFE_AREA_INSETS;
  const compactLayout = height < 760 || width < 370;
  const content = ONBOARDING_CONTENT[role];
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
  const needOptions = swahiliIntro ? SWAHILI_NEED_OPTIONS[role] : NEED_OPTIONS[role];
  const needStepCopy = swahiliIntro ? SWAHILI_NEED_STEP_COPY[role] : NEED_STEP_COPY[role];
  const nameStepCopy = swahiliIntro ? SWAHILI_NAME_STEP_COPY[role] : NAME_STEP_COPY[role];
  const ageStepCopy = AGE_STEP_COPY[languageCode];
  const schoolStepCopy = swahiliIntro ? SWAHILI_SCHOOL_STEP_COPY[role] : SCHOOL_STEP_COPY[role];
  const genderOptions = GENDER_OPTIONS[languageCode];
  const goalOptions = swahiliIntro ? SWAHILI_GOAL_OPTIONS[role] : GOAL_OPTIONS[role];
  const goalConfirmTime =
    GOAL_CONFIRM_TIME_COPY[selectedGoalKey ?? '']?.[languageCode ?? 'en'] ??
    (studentSwahiliIntro ? 'dakika 15' : '15 min');
  const displayedConcernOptions = swahiliIntro ? SWAHILI_CONCERN_OPTIONS[role] : CONCERN_OPTIONS[role];
  const achievementOptions = swahiliIntro ? SWAHILI_ACHIEVEMENT_OPTIONS[role] : ACHIEVEMENT_OPTIONS[role];
  const mascotMotion = useRef(new Animated.Value(0)).current;
  const genderShakeMotion = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView | null>(null);
  const signupOtpRefs = useRef<Array<React.ElementRef<typeof TextInput> | null>>([]);
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alienErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introStepCount = includeIntroChoices ? 19 : 0;
  const postSetupStepCount = includeIntroChoices ? 2 : 0;
  const totalStepCount = includeIntroChoices
    ? usesLearnerFlow
      ? 25
      : role === 'teacher'
        ? 20
        : 19
    : introStepCount + 3 + postSetupStepCount;
  const progressIndex = (() => {
    if (!includeIntroChoices) {
      return introStep === 'setup' ? step : introStepCount + step;
    }

    const sharedIntroIndex: Partial<Record<IntroStep, number>> = {
      language: 0,
      mascot: 1,
      rafiki: 2,
      role: 3,
      voice: 4,
      need: 5,
      name: 6,
    };
    const sharedIndex = sharedIntroIndex[introStep];
    if (sharedIndex !== undefined) {
      return sharedIndex;
    }

    if (usesLearnerFlow) {
      const studentIndex: Partial<Record<IntroStep, number>> = {
        roleDetails: 7,
        gender: 8,
        painBefore: 12,
        painAfter: 13,
        goal: 14,
        goalConfirm: 15,
        concerns: 16,
        achieve: 17,
        resultProof: 18,
        country: 19,
        interests: 20,
        reminder: 21,
        loading: 22,
        profileReady: 23,
        signup: 24,
      };
      if (introStep === 'setup') {
        return step === 0 ? 9 : step === 1 ? 10 : step === 2 ? 11 : 20;
      }

      return studentIndex[introStep] ?? 0;
    }

    const roleIndex: Partial<Record<IntroStep, number>> =
      role === 'teacher'
        ? {
            gender: 7,
            roleDetails: 8,
            goal: 11,
            concerns: 12,
            achieve: 13,
            resultProof: 14,
            country: 15,
            reminder: 16,
            loading: 17,
            profileReady: 18,
            signup: 19,
          }
        : {
            gender: 7,
            roleDetails: 8,
            goal: 10,
            concerns: 11,
            achieve: 12,
            resultProof: 13,
            country: 14,
            reminder: 15,
            loading: 16,
            profileReady: 17,
            signup: 18,
          };

    if (introStep === 'setup') {
      return role === 'teacher' ? (step === 0 ? 9 : 10) : 9;
    }

    return roleIndex[introStep] ?? 0;
  })();
  const progressStepNumber = progressIndex + 1;
  const progressTitle =
    introStep === 'language'
      ? 'Language'
      : introStep === 'mascot'
        ? 'Mascot'
        : introStep === 'rafiki'
          ? 'Rafiki'
          : introStep === 'role'
            ? 'Role'
            : introStep === 'voice'
            ? 'Voice'
            : introStep === 'need'
              ? 'Need'
              : introStep === 'name'
                ? 'Name'
                : introStep === 'gender'
                  ? 'Gender'
                  : introStep === 'roleDetails'
                  ? role === 'teacher'
                    ? 'Classes'
                    : role === 'parent'
                      ? 'Child'
                      : 'Age'
                  : introStep === 'goal'
                    ? 'Goal'
                    : introStep === 'goalConfirm'
                      ? 'Confirm'
                      : introStep === 'concerns'
                        ? 'Concern'
                        : introStep === 'achieve'
                          ? 'Achievement'
                          : introStep === 'painBefore'
                            ? 'Before'
                            : introStep === 'painAfter'
                              ? 'After'
                              : introStep === 'socialProof'
                                ? 'Proof'
                                : introStep === 'resultProof'
                                  ? 'Social proof'
                              : introStep === 'country'
                                ? 'Curriculum'
                                : introStep === 'interests'
                                  ? 'Interests'
                                  : introStep === 'reminder'
                                    ? 'Reminder'
                                    : introStep === 'loading'
                                      ? 'Building'
                                      : introStep === 'profileReady'
                                        ? 'Ready'
                                        : introStep === 'signup'
                                          ? 'Signup'
                  : step === 0
                    ? content.stepOneKicker
                    : step === 1 && studentFullIntro
                      ? 'Subjects'
                    : step === 1 || (step === 2 && studentFullIntro)
                      ? 'School'
                      : 'Payments';
  const progressAnnouncement = `Step ${progressStepNumber} of ${totalStepCount}, ${progressTitle}`;
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
  const subjectOptions = role === 'teacher' && includeIntroChoices
    ? cbcSubjectOptionsForGrades(teacherGradeIds)
    : usesLearnerFlow && includeIntroChoices && grade
      ? cbcSubjectOptionsForGrades([grade])
      : SUBJECTS;
  const learnerCoreSubjectNames = new Set(
    usesLearnerFlow && includeIntroChoices && activeGradeBand
      ? CBC_CORE_SUBJECTS_BY_GRADE_BAND[activeGradeBand]
      : [],
  );
  const subjectSections =
    usesLearnerFlow && includeIntroChoices
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
  const selectedSubjectCount = selectedSubjectIds.length;
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
  const submittedParentChildren = [
    primaryParentChild,
    ...normalizedAdditionalParentChildren,
  ];
  const allParentChildrenComplete =
    Boolean(primaryParentChild.name && primaryParentChild.grade) &&
    normalizedAdditionalParentChildren.every(child => child.name && child.grade);
  const resolvedGender: GenderOption = gender ?? 'not_specified';
  const signupEmailTrimmed = signupEmail.trim();
  const signupPhoneTrimmed = signupPhone.trim();
  const signupPhoneDigits = signupPhoneTrimmed.replace(/\D/g, '');
  const normalizedSignupPhone = normalizeSignupPhoneNumber(signupPhone);
  const subjectNameById = new Map(subjectOptions.map(subject => [subject.id, subject.name]));
  const selectedSubjectNames = selectedSubjectIds
    .map(subjectId => subjectNameById.get(subjectId))
    .filter((subjectName): subjectName is string => Boolean(subjectName));
  const isSignupEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmailTrimmed);
  const isSignupPhoneValid =
    /^(?:\+?254|0)?7\d{8}$/.test(signupPhoneDigits) ||
    /^\+?[\d\s-]{9,14}$/.test(signupPhoneTrimmed);
  const signupPasswordStrength =
    signupPassword.length >= 10 ? 3 : signupPassword.length >= 6 ? 2 : signupPassword.length > 0 ? 1 : 0;
  const signupPasswordsMatch =
    signupPasswordConfirm.length > 0 && signupPassword === signupPasswordConfirm;
  const canSubmitSignupEmail =
    isSignupEmailValid && signupPassword.length >= 6 && signupPasswordsMatch;
  const canSubmitSignupPhone =
    isSignupPhoneValid && signupPassword.length >= 6 && signupPasswordsMatch;
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
      introStep === 'need' ||
      introStep === 'goal' ||
      introStep === 'concerns' ||
      introStep === 'achieve');
  const genderShakeOffset = genderShakeMotion.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [0, -8, 8, -5, 0],
  });
  const subjectPreferenceLabel =
    role === 'teacher' ? 'Subjects you teach' : usesLearnerFlow ? 'Subjects you study' : null;
  const subjectPreferenceText =
    role === 'teacher'
      ? 'Select all that apply.'
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
  const reminderTitle =
    swahiliIntro ? 'Kitabu AI' : role === 'teacher' ? 'Class planning reminder' : role === 'parent' ? 'Family progress reminder' : 'Daily Kitabu nudge';
  const reminderKicker =
    swahiliIntro
      ? 'Vikumbusho \uD83D\uDD14'
      : role === 'teacher'
        ? 'Class reminders'
        : role === 'parent'
          ? 'Family reminders'
          : 'Friendly reminders \uD83D\uDD14';
  const reminderQuestion =
    swahiliIntro
      ? 'Tutakukumbusha ustudy.'
      : role === 'teacher'
      ? 'Want a class planning reminder?'
      : role === 'parent'
        ? 'Want a family progress reminder?'
        : 'We\'ll remind you to study.';
  const reminderDescription =
    swahiliIntro
      ? `${displayName.trim() || 'Rafiki'}, mtihani wako wa Hesabu ni kesho. Twende tujiandae pamoja!`
      : role === 'teacher'
      ? 'Plan lessons, review gaps, and keep class follow-up moving.'
      : role === 'parent'
        ? 'Check homework, progress, and simple next steps for home.'
        : 'Plan, practice, and keep your streak alive.';
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
  const readySummary =
    swahiliIntro
      ? `\uD83C\uDDF0\uD83C\uDDEA Kenya${usesLearnerFlow && primaryProfileGrade ? ` \u00B7 ${primaryProfileGrade}` : ''}`
      : role === 'teacher'
      ? `Your first dashboard will open with ${primaryProfileGrade}, ${selectedSubjectCount} subjects, Kenya CBC, and class planning reminders.`
      : role === 'parent'
        ? `Your family dashboard will open with ${primaryProfileGrade}, Kenya CBC, school context, and progress reminders.`
        : `Your first dashboard will open with ${primaryProfileGrade}, ${selectedSubjectCount} subjects, Kenya CBC, and your study reminders.`;
  const readyReminderLabel =
    swahiliIntro
      ? 'Vikumbusho viko tayari'
      : role === 'teacher'
      ? 'Class planning nudge'
      : role === 'parent'
        ? 'Family progress nudge'
        : 'Daily Kitabu nudge';
  const readyTestimonials = swahiliIntro
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
  const dashboardGreeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return swahiliIntro ? 'Habari za asubuhi' : 'Good morning';
    }

    if (hour < 17) {
      return swahiliIntro ? 'Habari za mchana' : 'Good afternoon';
    }

    return swahiliIntro ? 'Habari za jioni' : 'Good evening';
  })();
  const dashboardName =
    displayName.trim() ||
    (role === 'teacher' ? 'Teacher' : role === 'parent' ? 'Parent' : swahiliIntro ? 'Mwanafunzi' : 'Learner');
  const dashboardRoleLabel =
    role === 'teacher' ? 'Teacher dashboard' : role === 'parent' ? 'Family dashboard' : role === 'other' ? 'Learning dashboard' : 'Student dashboard';
  const dashboardGradeLabel =
    role === 'teacher'
      ? `${teacherGradeIds.length || 1} grade${teacherGradeIds.length === 1 ? '' : 's'} taught`
      : role === 'parent'
        ? parentChildName.trim()
          ? `${parentChildName.trim()} - ${primaryProfileGrade}`
          : primaryProfileGrade
        : primaryProfileGrade;
  const dashboardSubjectLabel =
    role === 'parent'
      ? `${submittedParentChildren.length} child${submittedParentChildren.length === 1 ? '' : 'ren'} linked`
      : `${selectedSubjectCount} subject${selectedSubjectCount === 1 ? '' : 's'} ready`;
  const dashboardSelectedSubjects = SUBJECTS.filter(subject => selectedSubjectIds.includes(subject.id));
  const dashboardSubjectPreview = dashboardSelectedSubjects.slice(0, 3);
  const dashboardMascotName =
    selectedMascotKey === 'rabbit'
      ? 'Rafiki the Rabbit'
      : selectedMascotKey === 'elephant'
        ? 'Rafiki the Elephant'
        : selectedMascotKey === 'lion'
          ? 'Rafiki the Lion'
          : activeMascot.name;
  const dashboardSpeech =
    swahiliIntro
      ? `Karibu ${dashboardName}! Mimi ni ${dashboardMascotName}, rafiki yako wa masomo. Tusome nini leo? \uD83D\uDCDA`
      : `Welcome ${dashboardName}! I'm ${dashboardMascotName}, your study buddy. What shall we learn today? \uD83D\uDCDA`;
  const dashboardActions =
    role === 'teacher'
      ? [
          { label: 'Plan Lesson', detail: 'CBC outline', Icon: ClipboardList },
          { label: 'Class Gaps', detail: 'Review weak areas', Icon: BarChart3 },
          { label: 'Assign Practice', detail: 'Send exercises', Icon: CalendarCheck },
          { label: 'Ask Rafiki', detail: 'Get teaching help', Icon: HelpCircle },
        ]
      : role === 'parent'
        ? [
            { label: 'Check Progress', detail: 'See what changed', Icon: BarChart3 },
            { label: 'Homework', detail: 'Review tasks', Icon: ClipboardList },
            { label: 'Review Plan', detail: 'Next home step', Icon: Bell },
            { label: 'Ask Rafiki', detail: 'Support ideas', Icon: HelpCircle },
          ]
        : [
            { label: swahiliIntro ? 'Soma sasa' : 'Study now', detail: swahiliIntro ? 'Anza somo' : 'Tap to start', Icon: BookOpen },
            { label: swahiliIntro ? 'Mtihani wa mazoezi' : 'Practice test', detail: swahiliIntro ? 'Maswali ya KNEC' : 'KNEC-style quiz', Icon: ClipboardList },
            { label: swahiliIntro ? 'Maendeleo yangu' : 'My progress', detail: swahiliIntro ? 'Angalia alama' : 'Track growth', Icon: BarChart3 },
            { label: swahiliIntro ? 'Ratiba' : 'Schedule', detail: swahiliIntro ? 'Mpango wa leo' : 'Plan study time', Icon: CalendarCheck },
          ];
  const dashboardPlanItems = swahiliIntro
    ? [
        { title: 'Quiz ya kuanza siku', time: '5 min' },
        { title: 'Somo jipya', time: '20 min' },
        { title: 'Maswali ya mazoezi', time: '15 min' },
      ]
    : [
        { title: 'Daily warm-up quiz', time: '5 min' },
        { title: 'New topic session', time: '20 min' },
        { title: 'Practice questions', time: '15 min' },
      ];
  const dashboardTabs = swahiliIntro
    ? [
        { label: 'Nyumbani', Icon: Home, active: true },
        { label: 'Soma', Icon: BookOpen, active: false },
        { label: 'Zungumza', Icon: MessageCircle, active: false },
        { label: 'Profaili', Icon: UserCircle, active: false },
      ]
    : [
        { label: 'Home', Icon: Home, active: true },
        { label: 'Study', Icon: BookOpen, active: false },
        { label: 'Chat', Icon: MessageCircle, active: false },
        { label: 'Profile', Icon: UserCircle, active: false },
      ];
  const mascotPose: MascotPose = (() => {
    if (!includeIntroChoices) {
      if (introStep === 'setup') {
        return step === 0 ? 'cheer' : step === 1 ? 'wave' : 'cool';
      }

      return introStep === 'profileReady' ? 'celebrate' : 'wave';
    }

    if (introStep === 'dashboard') {
      return 'wave';
    }

    if (introStep === 'language' || introStep === 'mascot' || introStep === 'rafiki' || introStep === 'role') {
      return 'wave';
    }

    if (introStep === 'voice' || introStep === 'signup') {
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
  const headerEyebrow =
    introStep === 'language'
      ? 'Karibu Kitabu'
      : introStep === 'mascot'
        ? 'Pick your rafiki'
        : introStep === 'rafiki'
          ? 'Introducing...'
          : introStep === 'role'
            ? 'Karibu'
          : introStep === 'voice'
            ? 'Voice'
            : introStep === 'need'
              ? needStepCopy.eyebrow
              : introStep === 'name'
                ? nameStepCopy.eyebrow
                : introStep === 'gender'
                  ? languageCode === 'sw'
                    ? 'Kuhusu wewe'
                    : 'About you'
                  : introStep === 'roleDetails'
                  ? role === 'teacher'
                    ? 'Your classes'
                    : role === 'parent'
                      ? 'Your child'
                      : ageStepCopy.eyebrow
                  : introStep === 'goal'
                    ? 'Your goal'
                  : introStep === 'goalConfirm'
                    ? studentSwahiliIntro
                      ? 'Lengo limewekwa'
                      : 'Goal confirmed'
                    : introStep === 'concerns'
                      ? studentSwahiliIntro
                        ? 'Niambie'
                        : 'What feels hard'
                      : introStep === 'achieve'
                        ? 'Success target'
                    : introStep === 'painBefore'
                          ? studentSwahiliIntro
                            ? 'Inakujua?'
                            : 'Before Kitabu'
                          : introStep === 'painAfter'
                            ? studentSwahiliIntro
                              ? 'Sasa na Kitabu AI'
                              : 'With Kitabu'
                              : introStep === 'socialProof'
                                ? studentSwahiliIntro
                                  ? 'Ni bidii'
                                  : 'Real progress'
                                : introStep === 'resultProof'
                                  ? swahiliIntro
                                    ? 'Habari njema!'
                                    : 'Good news'
                              : introStep === 'country'
                                ? 'Your curriculum'
                                : introStep === 'interests'
                                  ? swahiliIntro
                                    ? 'Jambo moja zaidi'
                                    : 'Just one more thing'
                                    : introStep === 'reminder'
                                      ? reminderKicker
                                      : introStep === 'loading'
                                      ? role === 'teacher'
                                        ? 'Building workspace'
                                        : role === 'parent'
                                          ? 'Building dashboard'
                                          : 'Building profile'
                                      : introStep === 'profileReady'
                                        ? swahiliIntro
                                          ? 'Mwenzako wa masomo'
                                          : 'Profile ready'
                                        : introStep === 'signup'
                                          ? swahiliIntro
                                            ? 'Hifadhi akaunti yako'
                                            : 'Save your account'
                  : content.eyebrow;
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
                        ? 'What is your family goal?'
                        : 'What is your learning goal?'
                    : introStep === 'goalConfirm'
                      ? studentSwahiliIntro
                        ? 'Hilo ni lengo zuri.'
                        : 'That is a strong goal.'
                    : introStep === 'concerns'
                      ? role === 'teacher'
                        ? 'What is your biggest classroom challenge?'
                        : role === 'parent'
                          ? 'What worries you most?'
                          : studentSwahiliIntro
                            ? 'Changamoto yako kubwa zaidi shuleni ni nini?'
                            : 'What is your biggest study challenge?'
                      : introStep === 'achieve'
                        ? role === 'teacher'
                          ? 'What do you want to achieve?'
                          : role === 'parent'
                            ? 'What should Kitabu help your child achieve?'
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
                                  ? 'Si wewe peke yako anayetaka kuboresha alama.'
                                  : 'You are not the only one trying to improve.'
                              : introStep === 'country'
                                ? swahiliIntro
                                  ? 'Unasomea katika nchi hii?'
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
                      ? 'Start with one learner. You can link more children from the dashboard.'
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
                                  ? '89% ya wanafunzi wanasema wanafanya zaidi kwa muda mfupi zaidi na Kitabu AI.'
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
  const selectedSchool = useMemo(
    () => schools.find(school => school.id === schoolId) ?? null,
    [schoolId, schools],
  );
  const selectedSchoolName = selectedSchool?.name ?? customSchoolName;
  const hasSelectedSchool = Boolean(selectedSchoolName);
  const countyOptions = useMemo(
    () => {
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

      return [...KENYAN_COUNTIES, ...extraCountyOptions];
    },
    [schools],
  );
  const hasMpesaInput = Boolean(mpesaPhoneNumber.trim());
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
  const paymentSummaryValue = hasValidMpesaShortcut
    ? 'M-Pesa ready'
    : hasMpesaInput
      ? 'Check number'
      : 'Optional';
  const reviewPaymentStatus = hasValidMpesaShortcut
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
      {
        label: content.paymentStatusPrefix,
        value: paymentSummaryValue,
        complete: step === 2 && hasValidMpesaShortcut,
      },
    ],
    [
      content.gradeStatusPrefix,
      content.paymentStatusPrefix,
      content.schoolStatusPrefix,
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
    [mascotMotion, mascotPose],
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
      .then(reduceMotionEnabled => {
        if (!mounted || reduceMotionEnabled) {
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
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });

    if (announcedStepRef.current !== progressStepNumber) {
      AccessibilityInfo.announceForAccessibility?.(progressAnnouncement);
      announcedStepRef.current = progressStepNumber;
    }
  }, [introStep, progressAnnouncement, progressStepNumber, step]);

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
  }, [introStep]);

  useEffect(
    () => () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
      if (alienErrorTimeoutRef.current) {
        clearTimeout(alienErrorTimeoutRef.current);
      }
    },
    [],
  );

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
    if (introStep !== 'profileReady' || readyTestimonials.length <= 1) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setActiveReadyTestimonialIndex(current => (current + 1) % readyTestimonials.length);
    }, 3000);

    return () => clearTimeout(timer);
  }, [activeReadyTestimonialIndex, introStep, readyTestimonials.length]);


  useEffect(() => {
    if (county && !countyOptions.includes(county)) {
      setCounty('');
      setSchoolId('');
      setSchoolQuery('');
    }
  }, [county, countyOptions]);

  const filteredSchools = useMemo(
    () =>
      county
        ? schools.filter(
            school =>
              countyMatchesLocation(county, school.location) &&
              school.name.toLowerCase().includes(schoolQuery.trim().toLowerCase()),
          )
        : [],
    [county, schoolQuery, schools],
  );
  const schoolLookupGrade =
    includeIntroChoices && role === 'teacher'
      ? teacherGradeIds[0] ?? grade
      : includeIntroChoices && role === 'parent'
        ? parentChildGrade
        : grade;
  const schoolResultStatus =
    !county
      ? 'Select a county to see schools'
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
    : introStep === 'need'
      ? Boolean(selectedNeedKey)
      : introStep === 'name'
        ? Boolean(displayName.trim())
        : introStep === 'gender'
          ? Boolean(gender)
        : introStep === 'roleDetails'
          ? role === 'teacher'
            ? teacherGradeIds.length > 0
            : role === 'parent'
              ? allParentChildrenComplete
              : Boolean(age.trim())
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
            ? includeIntroChoices || hasSelectedSchool
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
            : 'Say hello'
          : introStep === 'role'
            ? swahiliIntro
              ? 'Endelea'
              : 'Continue'
            : introStep === 'voice'
            ? 'Continue'
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
                              ? 'Tufanikishe hili \uD83D\uDCAA'
                              : 'Let\'s achieve this \uD83D\uDCAA'
                          : introStep === 'country'
                            ? swahiliIntro
                              ? 'Thibitisha nchi'
                              : 'Confirm location'
                                : introStep === 'interests'
                                  ? 'Continue'
                                  : introStep === 'reminder'
                                    ? reminderEnabled
                                      ? swahiliIntro
                                        ? 'Nikumbushe'
                                        : 'Remind me'
                                      : 'Skip'
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
                    ? studentFullIntro
                      ? 'Continue'
                      : 'Continue to school'
                  : step === 1
                    ? includeIntroChoices
                      ? studentFullIntro
                        ? selectedSubjectCount > 0
                          ? 'Continue'
                          : 'Skip'
                        : hasSelectedSchool
                          ? 'Continue'
                          : 'Skip'
                      : 'Continue to payment'
                    : studentFullIntro && step === 2
                      ? hasSelectedSchool
                        ? 'Continue'
                        : 'Skip'
                      : includeIntroChoices
                        ? 'Build my profile'
                        : hasMpesaInput
                          ? 'Finish setup'
                          : 'Skip and finish';
  const PrimaryActionIcon =
    (introStep === 'setup' && step === 2 && !includeIntroChoices) || introStep === 'signup'
      ? Check
      : ChevronRight;
  const canGoBack =
    introStep === 'mascot' ||
    introStep === 'rafiki' ||
    introStep === 'role' ||
    introStep === 'voice' ||
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
        : introStep === 'need'
          ? 'Back to voice'
          : introStep === 'name'
            ? 'Back to need'
            : introStep === 'gender'
              ? usesLearnerFlow
                ? 'Back to age'
                : 'Back to name'
            : introStep === 'roleDetails'
              ? usesLearnerFlow
                ? 'Back to name'
                : 'Back to gender'
            : introStep === 'goal'
              ? role === 'teacher'
                ? 'Back to classes'
                : role === 'parent'
                  ? 'Back to child'
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
              ? 'Back to achievement'
            : introStep === 'country'
              ? studentFullIntro
                ? 'Back to results'
                : 'Back'
            : introStep === 'interests'
              ? 'Back'
            : introStep === 'reminder'
              ? 'Back'
            : introStep === 'profileReady'
              ? 'Back to reminder'
            : introStep === 'signup'
              ? 'Back to profile'
          : introStep === 'setup' && step === 0 && includeIntroChoices
            ? role === 'teacher'
              ? 'Back to reminder'
              : role === 'parent'
                ? 'Back to reminder'
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
        : introStep === 'need'
          ? 'Returns to voice selection'
          : introStep === 'name'
            ? 'Returns to need selection'
            : introStep === 'gender'
              ? usesLearnerFlow
                ? 'Returns to age entry'
                : 'Returns to name entry'
            : introStep === 'roleDetails'
              ? usesLearnerFlow
                ? 'Returns to name entry'
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
              ? 'Returns to achievement selection'
            : introStep === 'country'
              ? includeIntroChoices
                ? 'Returns to result proof'
                : 'Returns to social proof'
            : introStep === 'interests'
              ? 'Returns to curriculum confirmation'
            : introStep === 'reminder'
              ? 'Returns to interests'
            : introStep === 'profileReady'
              ? 'Returns to reminder selection'
            : introStep === 'signup'
              ? 'Returns to your ready profile'
          : introStep === 'setup' && step === 0 && includeIntroChoices
            ? studentFullIntro
              ? 'Returns to gender selection'
              : 'Returns to reminder selection'
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
          ? 'Moves to voice selection'
        : introStep === 'voice'
            ? 'Moves to priority selection'
          : introStep === 'need' && !selectedNeedKey
            ? 'Choose what you need most before continuing'
          : introStep === 'need'
            ? 'Moves to name entry'
            : introStep === 'name' && !displayName.trim()
              ? 'Enter your name before continuing'
              : introStep === 'name'
                ? 'Moves to profile details'
                : introStep === 'gender'
                  ? usesLearnerFlow
                    ? 'Moves to class selection'
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
                                  ? 'Moves to social proof'
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
                                        ? 'Moves to curriculum confirmation'
                                      : introStep === 'country'
                                        ? 'Moves to interest selection'
                                        : introStep === 'interests'
                                          ? 'Moves to reminder setup'
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
                          : 'Moves to goal selection'
                        : 'Skips school selection for now'
                      : !canContinue && step === 1 && !county
                      ? 'Choose a county before continuing'
                      : !canContinue && step === 1
                        ? 'Choose a school before continuing'
                        : !canContinue
                          ? 'Choose a grade before continuing'
                            : step === 2 && includeIntroChoices
                              ? 'Builds your Kitabu profile'
                              : step === 2 && hasValidMpesaShortcut
                                ? 'Completes account setup with M-Pesa shortcut'
                                : step === 2 && hasMpesaInput
                                  ? 'Checks the M-Pesa number before finishing setup'
                                  : step === 2
                                    ? 'Completes account setup without adding M-Pesa'
                                : step === 1
                                  ? 'Moves to the optional payment step'
                                   : 'Moves to school selection';

  function submitPreparedOnboarding(normalizedMpesaPhoneNumber: string | null) {
    Keyboard.dismiss();
    setFocusedField(null);
    triggerHaptic('success');
    onSubmit({
      gender: resolvedGender,
      grade: primaryProfileGrade,
      schoolId: schoolId || null,
      mpesaPhoneNumber: normalizedMpesaPhoneNumber,
      selectedSubjectIds,
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
            countryCode: 'KE',
            curriculumCode: 'CBC',
            ...(role === 'parent'
              ? {
                  children: submittedParentChildren,
                }
              : {}),
            ...(role === 'teacher' ? { teachGrades: teacherGradeIds } : {}),
            ...(collectSignupCredentials && signupMethod
              ? {
                  signupMethod,
                  ...(signupMethod === 'email' ? { email: signupEmailTrimmed } : {}),
                  ...(signupMethod === 'email' ? { signupEmail: signupEmailTrimmed } : {}),
                  ...(signupMethod === 'phone' ? { phone: normalizedSignupPhone } : {}),
                  ...(signupMethod === 'phone' ? { signupPhone: normalizedSignupPhone } : {}),
                  ...(signupMethod === 'phone' ? { signupOtp: signupOtpValue } : {}),
                  ...(signupMethod !== 'google' ? { password: signupPassword } : {}),
                  ...(signupMethod !== 'google' ? { signupPassword } : {}),
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

  function handleContinue() {
    if (isSubmitting) {
      return;
    }

    clearAutoAdvance();
    setLocalError(null);

    if (!canContinue) {
      triggerHaptic('error');
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
      setIntroStep('voice');
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
        setStep(0);
        setIntroStep('setup');
      } else {
        setIntroStep(usesLearnerFlow ? 'goal' : 'roleDetails');
      }
      return;
    }

    if (introStep === 'roleDetails') {
      Keyboard.dismiss();
      triggerHaptic('impact');
      if (usesLearnerFlow) {
        setIntroStep('gender');
      } else {
        setStep(role === 'teacher' ? 0 : 1);
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
      setIntroStep(includeIntroChoices ? 'resultProof' : 'painBefore');
      return;
    }

    if (introStep === 'resultProof') {
      triggerHaptic('impact');
      setIntroStep('country');
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
      setIntroStep(usesLearnerFlow ? 'interests' : 'reminder');
      return;
    }

    if (introStep === 'interests') {
      triggerHaptic('impact');
      setIntroStep('reminder');
      return;
    }

    if (introStep === 'reminder') {
      triggerHaptic('impact');
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
      Keyboard.dismiss();
      setFocusedField(null);
      triggerHaptic('impact');
      setStep(2);
      return;
    }

    if (includeIntroChoices && introStep === 'setup' && step === 2 && studentFullIntro) {
      Keyboard.dismiss();
      setFocusedField(null);
      triggerHaptic('impact');
      setIntroStep('painBefore');
      return;
    }

    if (includeIntroChoices && introStep === 'setup' && step === 1) {
      Keyboard.dismiss();
      setFocusedField(null);
      triggerHaptic('impact');
      setIntroStep('goal');
      return;
    }

    if (includeIntroChoices && introStep === 'setup' && step === 0 && role === 'teacher') {
      Keyboard.dismiss();
      setFocusedField(null);
      triggerHaptic('impact');
      setStep(1);
      return;
    }

    if (step < 2) {
      Keyboard.dismiss();
      setFocusedField(null);
      triggerHaptic('impact');
      setStep(current => current + 1);
      return;
    }

    let normalizedMpesaPhoneNumber: string | null = null;
    try {
      normalizedMpesaPhoneNumber = normalizeOptionalMpesaPhoneNumber(mpesaPhoneNumber);
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
    if (includeIntroChoices) {
      scheduleAutoAdvance(() => setIntroStep('mascot'));
    }
  }

  function handleMascotSelect(value: OnboardingMascotKey) {
    triggerHaptic('selection');
    setSelectedMascotKey(value);
    if (includeIntroChoices) {
      scheduleAutoAdvance(() => setIntroStep('rafiki'), MASCOT_AUTO_ADVANCE_DELAY_MS);
    }
  }

  function handleVoiceSelect(value: OnboardingVoiceName) {
    triggerHaptic('selection');
    setSelectedVoiceName(value);
    setNoVoice(false);
  }

  function handleNoVoiceToggle() {
    triggerHaptic('selection');
    setNoVoice(current => !current);
  }

  function handleNeedSelect(value: OnboardingNeedKey) {
    triggerHaptic('selection');
    setSelectedNeedKey(value);
    if (includeIntroChoices) {
      scheduleAutoAdvance(() => setIntroStep('name'));
    }
  }

  function handleGoalSelect(value: OnboardingGoalKey) {
    triggerHaptic('selection');
    setSelectedGoalKey(value);
    if (includeIntroChoices) {
      scheduleAutoAdvance(() => setIntroStep(studentFullIntro ? 'goalConfirm' : 'concerns'));
    }
  }

  function handleConcernSelect(value: OnboardingConcernKey) {
    triggerHaptic('selection');
    setSelectedConcernKey(value);
    if (includeIntroChoices) {
      scheduleAutoAdvance(() => setIntroStep('achieve'));
    }
  }

  function handleAchievementSelect(value: OnboardingAchievementKey) {
    triggerHaptic('selection');
    setSelectedAchievementKey(value);
    if (includeIntroChoices) {
      scheduleAutoAdvance(() => setIntroStep('resultProof'));
    }
  }

  function handleInterestToggle(value: OnboardingInterestKey) {
    triggerHaptic('selection');
    setSelectedInterestKeys(current =>
      current.includes(value) ? current.filter(key => key !== value) : [...current, value],
    );
  }

  function handleReminderToggle() {
    triggerHaptic('selection');
    setReminderEnabled(current => !current);
  }

  function handleDisplayNameChange(value: string) {
    setDisplayName(value);
    if (localError) {
      setLocalError(null);
    }
  }

  function handleAgeChange(value: string) {
    setAge(value.replace(/[^\d]/g, '').slice(0, 2));
    if (localError) {
      setLocalError(null);
    }
  }

  function handleParentChildNameChange(value: string) {
    setParentChildName(value);
    if (localError) {
      setLocalError(null);
    }
  }

  function handleParentChildAgeChange(value: string) {
    setParentChildAge(value.replace(/[^\d]/g, '').slice(0, 2));
    if (localError) {
      setLocalError(null);
    }
  }

  function handleParentChildGradeSelect(value: string) {
    triggerHaptic('selection');
    setParentChildGrade(value);
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
    setAdditionalParentChildren(current => current.filter((_, childIndex) => childIndex !== index));
  }

  function handleAdditionalParentChildChange(
    index: number,
    field: 'name' | 'age' | 'grade',
    value: string,
  ) {
    setAdditionalParentChildren(current =>
      current.map((child, childIndex) =>
        childIndex === index
          ? {
              ...child,
              [field]: field === 'age' ? value.replace(/[^\d]/g, '').slice(0, 2) : value,
            }
          : child,
      ),
    );
  }

  function handleTeacherGradeToggle(value: string) {
    triggerHaptic('selection');
    setSelectedSubjectIds([]);
    setTeacherGradeIds(current => {
      if (current.includes(value)) {
        return current.filter(id => id !== value);
      }

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
    setCustomSchoolName('');
    if (localError) {
      setLocalError(null);
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
    setCustomSchoolName('');
    setLocalError(null);
    setFocusedField(null);
  }

  function handleClearSchoolSearch() {
    setSchoolQuery('');
    setSchoolId('');
    setCustomSchoolName('');
    setLocalError(null);
    setFocusedField('school');
    triggerHaptic('selection');
  }

  function handleSelectSchool(school: SchoolData) {
    setSchoolId(school.id);
    setCustomSchoolName('');
    setSchoolQuery(school.name);
  }

  function handleAddCustomSchool() {
    const nextSchoolName = schoolQuery.trim();
    if (!county || !nextSchoolName) {
      return;
    }

    Keyboard.dismiss();
    setFocusedField(null);
    setSchoolId('');
    setCustomSchoolName(nextSchoolName);
    setSchoolQuery(nextSchoolName);
    setLocalError(null);
    triggerHaptic('selection');
  }

  function handleGenderSelect(value: GenderOption) {
    triggerHaptic('selection');
    if (alienErrorTimeoutRef.current) {
      clearTimeout(alienErrorTimeoutRef.current);
      alienErrorTimeoutRef.current = null;
    }
    setGender(value);
    setLocalError(null);
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
    setSignupStep(method === 'google' ? 'google' : method);
  }

  function handleSignupBack() {
    triggerHaptic('selection');
    setLocalError(null);
    setSignupCodeError(false);

    if (signupStep === 'verify') {
      setSignupStep(signupMethod === 'phone' ? 'phone' : 'email');
      return;
    }

    if (signupStep === 'email' || signupStep === 'phone' || signupStep === 'google') {
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
          : signupPassword.length < 6
            ? 'Use at least 6 characters for your password.'
            : 'Passwords do not match.',
      );
      return;
    }

    triggerHaptic('impact');
    resetSignupVerification('email');
    setSignupStep('verify');
  }

  async function handleSignupPhoneContinue() {
    if (!canSubmitSignupPhone) {
      triggerHaptic('error');
      setLocalError(
        !isSignupPhoneValid
          ? 'Enter a valid Kenyan phone number.'
          : signupPassword.length < 6
            ? 'Use at least 6 characters for your password.'
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

    submitPreparedOnboarding(preparedMpesaPhoneNumber);
    setIntroStep('dashboard');
  }

  function handleGoogleSignupSuccess() {
    resetSignupVerification('google');
    submitPreparedOnboarding(preparedMpesaPhoneNumber);
    setIntroStep('dashboard');
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

  function handleSubjectToggle(subjectId: string) {
    triggerHaptic('selection');
    setSelectedSubjectIds(current => {
      if (current.includes(subjectId)) {
        return current.length > 1 ? current.filter(id => id !== subjectId) : current;
      }

      if (current.length >= MAX_ONBOARDING_SUBJECTS) {
        return current;
      }

      return [...current, subjectId];
    });
  }

  function handleGradeSelect(value: string) {
    triggerHaptic('selection');
    if (includeIntroChoices && value !== grade) {
      setSelectedSubjectIds([]);
    }
    setGrade(value);
    if (value !== grade && hasSelectedSchool) {
      setSchoolId('');
      setCustomSchoolName('');
      setSchoolQuery('');
      setLocalError(null);
    }
  }

  function handleSchoolOptionPress(school: SchoolData) {
    Keyboard.dismiss();
    setFocusedField(null);
    triggerHaptic('selection');
    handleSelectSchool(school);
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

  async function handleRequestMissingSchool() {
    setLocalError(null);

    try {
      await Linking.openURL(WHATSAPP_ADMIN_LINK);
    } catch {
      triggerHaptic('warning');
      setLocalError('Could not open WhatsApp. Message admin at 0716175485.');
    }
  }

  function handleBack() {
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

    if (introStep === 'voice') {
      setIntroStep('role');
      return;
    }

    if (introStep === 'need') {
      setIntroStep('voice');
      return;
    }

    if (introStep === 'name') {
      setIntroStep('need');
      return;
    }

    if (introStep === 'roleDetails') {
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
        setStep(1);
        setIntroStep('setup');
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
        setStep(2);
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
      setIntroStep('achieve');
      return;
    }

    if (introStep === 'country') {
      setIntroStep(includeIntroChoices ? 'resultProof' : 'socialProof');
      return;
    }

    if (introStep === 'interests') {
      setIntroStep('country');
      return;
    }

    if (introStep === 'reminder') {
      setIntroStep(usesLearnerFlow ? 'interests' : 'country');
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

    if (introStep === 'setup' && step === 0 && includeIntroChoices) {
      setIntroStep(role === 'teacher' ? 'roleDetails' : 'gender');
      return;
    }

    if (introStep === 'setup' && step === 1 && includeIntroChoices) {
      if (role === 'parent') {
        setIntroStep('roleDetails');
      } else {
        setStep(0);
      }
      return;
    }

    setStep(current => current - 1);
  }

  function renderMascotPoseEffect(size: 'header' | 'large' = 'header') {
    const scaleStyle = size === 'large' ? styles.mascotPoseEffectLarge : null;

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
          <View style={styles.mascotSunglasses}>
            <View style={styles.mascotSunglassLens} />
            <View style={styles.mascotSunglassBridge} />
            <View style={styles.mascotSunglassLens} />
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

  if (introStep === 'dashboard') {
    return (
      <LinearGradient
        colors={content.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.screen}>
        <ScrollView
          accessibilityLabel="Onboarding dashboard"
          contentContainerStyle={[styles.dashboardScrollContent, scrollInsetsStyle]}
          showsVerticalScrollIndicator={false}
          testID="onboarding-dashboard">
          <View style={styles.dashboardTopRow}>
            <View style={styles.dashboardGreetingBlock}>
              <Text style={[styles.dashboardEyebrow, { color: content.accent }]}>{dashboardRoleLabel}</Text>
              <Text style={styles.dashboardGreeting}>{dashboardGreeting},</Text>
              <Text numberOfLines={1} style={styles.dashboardName}>{dashboardName} {'\uD83D\uDC4B'}</Text>
            </View>
            <View
              accessibilityLabel={mascotPoseAccessibilityLabel}
              accessibilityRole="image"
              style={styles.dashboardMascotFrame}>
              <Image
                accessibilityIgnoresInvertColors
                accessibilityLabel={activeMascot.label}
                source={activeMascot.source}
                resizeMode="contain"
                style={styles.dashboardMascot}
              />
              {renderMascotPoseEffect('large')}
            </View>
          </View>

          <View style={styles.dashboardStatsRow}>
            <View style={styles.dashboardStatCard}>
              <Text style={styles.dashboardStatLabel}>Profile</Text>
              <Text numberOfLines={2} style={styles.dashboardStatValue}>{dashboardGradeLabel}</Text>
            </View>
            <View style={styles.dashboardStatCard}>
              <Text style={styles.dashboardStatLabel}>{role === 'parent' ? 'Family' : 'Subjects'}</Text>
              <Text numberOfLines={2} style={styles.dashboardStatValue}>{dashboardSubjectLabel}</Text>
            </View>
          </View>

          <View style={styles.dashboardStreakCard}>
            <View style={styles.dashboardStreakHeader}>
              <Text style={styles.dashboardStreakTitle}>{'\uD83D\uDD25'} 1-day streak {'\u2014'} keep it up!</Text>
              <Text style={[styles.dashboardStreakCount, { color: content.accent }]}>1/7</Text>
            </View>
            <View style={styles.dashboardStreakTrack}>
              <View style={[styles.dashboardStreakFill, { backgroundColor: content.accent }]} />
            </View>
          </View>

          <View style={styles.dashboardSpeechRow}>
            <View style={[styles.dashboardSpeechMascot, { borderColor: `${content.accent}55` }]}>
              <Image
                accessibilityIgnoresInvertColors
                accessibilityLabel={activeMascot.label}
                resizeMode="contain"
                source={activeMascot.source}
                style={styles.dashboardSpeechMascotImage}
              />
            </View>
            <View style={styles.dashboardSpeechBubble}>
              <Text style={styles.dashboardSpeechText}>{dashboardSpeech}</Text>
            </View>
          </View>

          <View style={styles.dashboardSectionHeader}>
            <Text style={styles.dashboardSectionTitle}>Quick actions</Text>
            <View style={styles.dashboardSectionPill}>
              <Users color={content.accent} size={14} strokeWidth={2.5} />
              <Text style={[styles.dashboardSectionPillText, { color: content.accent }]}>
                {role === 'teacher' ? 'Class' : role === 'parent' ? 'Family' : 'Study'}
              </Text>
            </View>
          </View>
          <View style={styles.dashboardActionGrid}>
            {dashboardActions.map(action => {
              const ActionIcon = action.Icon;
              return (
                <Pressable
                  accessibilityLabel={`Open ${action.label}`}
                  accessibilityRole="button"
                  key={action.label}
                  style={styles.dashboardActionCard}>
                  <View style={[styles.dashboardActionIcon, { backgroundColor: `${content.accent}1A` }]}>
                    <ActionIcon color={content.accent} size={20} strokeWidth={2.6} />
                  </View>
                  <Text numberOfLines={1} style={styles.dashboardActionTitle}>{action.label}</Text>
                  <Text numberOfLines={2} style={styles.dashboardActionText}>{action.detail}</Text>
                </Pressable>
              );
            })}
          </View>

          {role !== 'parent' && dashboardSubjectPreview.length > 0 ? (
            <>
              <View style={styles.dashboardSectionHeader}>
                <Text style={styles.dashboardSectionTitle}>{swahiliIntro ? 'Masomo yangu' : 'My subjects'}</Text>
                <Text style={[styles.dashboardSeeAllText, { color: content.accent }]}>
                  {swahiliIntro ? `Ona yote ${dashboardSelectedSubjects.length} \u2192` : `See all ${dashboardSelectedSubjects.length} \u2192`}
                </Text>
              </View>
              <View style={styles.dashboardSubjectList}>
                {dashboardSubjectPreview.map(subject => (
                  <Pressable
                    accessibilityLabel={`Open subject ${subject.name}`}
                    accessibilityRole="button"
                    key={subject.id}
                    style={styles.dashboardSubjectRow}>
                    <View style={[styles.dashboardSubjectIcon, { backgroundColor: `${content.accent}1A` }]}>
                      <BookOpen color={content.accent} size={18} strokeWidth={2.5} />
                    </View>
                    <View style={styles.dashboardSubjectCopy}>
                      <Text style={styles.dashboardSubjectName}>{subject.name}</Text>
                      <Text style={styles.dashboardSubjectHint}>{swahiliIntro ? 'Gusa kuanza' : 'Tap to start'}</Text>
                    </View>
                    <ChevronRight color={ONBOARDING_COLORS.textMuted} size={18} strokeWidth={2.5} />
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <View style={styles.dashboardSectionHeader}>
            <Text style={styles.dashboardSectionTitle}>{swahiliIntro ? 'Mpango wa leo' : "Today's plan"}</Text>
          </View>
          <View style={styles.dashboardPlanList}>
            {dashboardPlanItems.map((item, index) => (
              <View key={item.title} style={styles.dashboardPlanRow}>
                <View style={[styles.dashboardPlanNumber, { backgroundColor: `${content.accent}1A` }]}>
                  <Text style={[styles.dashboardPlanNumberText, { color: content.accent }]}>{index + 1}</Text>
                </View>
                <View style={styles.dashboardPlanCopy}>
                  <Text style={styles.dashboardPlanTitle}>{item.title}</Text>
                  <Text style={styles.dashboardPlanTime}>{item.time}</Text>
                </View>
                <View style={styles.dashboardPlanStartPill}>
                  <Text style={[styles.dashboardPlanStartText, { color: content.accent }]}>
                    {swahiliIntro ? 'Anza' : 'Start'}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View accessibilityLabel="Dashboard tabs" style={styles.dashboardTabBar}>
            {dashboardTabs.map(tab => {
              const TabIcon = tab.Icon;
              return (
                <Pressable
                  accessibilityLabel={`Dashboard tab ${tab.label}`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab.active }}
                  key={tab.label}
                  style={styles.dashboardTab}>
                  <TabIcon
                    color={tab.active ? content.accent : ONBOARDING_COLORS.textMuted}
                    size={20}
                    strokeWidth={2.5}
                  />
                  <Text
                    style={[
                      styles.dashboardTabText,
                      { color: tab.active ? content.accent : ONBOARDING_COLORS.textMuted },
                    ]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={content.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}>
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
          showsVerticalScrollIndicator={false}
          testID="onboarding-scroll-view">
          {usesCompactIntroNav ? (
            <View style={styles.preMascotNav}>
              <Pressable
                accessibilityLabel={usesRafikiRevealStep ? 'Back to mascot' : 'Back to language'}
                accessibilityRole="button"
                onPress={handleBack}
                style={styles.preMascotBackButton}>
                <Text style={[styles.preMascotBackText, { color: content.accent }]}>Back</Text>
              </Pressable>
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
                  <Text style={[styles.mascotNavBackText, { color: content.accent }]}>Back</Text>
                </Pressable>
              ) : (
                <View style={styles.mascotNavBackSpacer} />
              )}
              <View
                accessibilityLabel="Onboarding progress"
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 1, max: totalStepCount, now: progressStepNumber, text: progressAnnouncement }}
                style={styles.mascotNavProgressTrack}>
                <View
                  style={[
                    styles.mascotNavProgressFill,
                    {
                      backgroundColor: content.accent,
                      width: `${Math.max(4, Math.round((progressStepNumber / totalStepCount) * 100))}%`,
                    },
                  ]}
                />
              </View>
              <Animated.View
                accessibilityLabel={mascotPoseAccessibilityLabel}
                accessibilityRole="image"
                testID="onboarding-mascot-motion"
                style={[styles.mascotNavAvatar, mascotMotionStyle]}>
                <Image
                  accessibilityIgnoresInvertColors
                  accessibilityLabel={activeMascot.label}
                  source={activeMascot.source}
                  resizeMode="contain"
                  style={styles.mascotNavAvatarImage}
                />
                {renderMascotPoseEffect()}
              </Animated.View>
              <Text style={styles.mascotNavLangBadge}>{selectedLanguage.code.toUpperCase()}</Text>
            </View>
          ) : null}

          {!usesBrandLanguageStep && !usesCompactIntroNav ? (
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={[styles.eyebrow, { color: content.accent }]}>{headerEyebrow}</Text>
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

          {!usesBrandLanguageStep && !usesMascotNavBar && !usesFullscreenCommitmentStep ? (
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

          {introStep === 'setup' ? (
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
                    <View style={[styles.languageDecorDot, { backgroundColor: ONBOARDING_COLORS.primary }]} />
                    <View style={[styles.languageDecorDot, { backgroundColor: ONBOARDING_COLORS.accentLight }]} />
                    <View style={[styles.languageDecorDot, { backgroundColor: ONBOARDING_COLORS.accent }]} />
                    <View style={[styles.languageDecorDot, { backgroundColor: ONBOARDING_COLORS.primaryLight }]} />
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
                <Text style={[styles.stepKicker, { color: content.accent }]}>
                  {swahiliIntro ? 'Rafiki wako wa masomo ✨' : 'Your study buddy ✨'}
                </Text>
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
                <Text style={[styles.stepKicker, { color: content.accent }]}>
                  {swahiliIntro ? 'Nakuwasilisha...' : 'Introducing...'}
                </Text>
                <View
                  accessibilityLabel={`${activeMascot.name} introduction`}
                  style={styles.rafikiIntroWrap}>
                  <View
                    style={[
                      styles.rafikiImageRing,
                      {
                        borderColor: content.accent,
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
                  <View style={[styles.rafikiNamePill, { borderColor: content.accent }]}>
                    <Text style={[styles.rafikiName, { color: content.accent }]}>
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
                      ? `Mimi ni ${activeMascot.name}! Nitakusaidia kujifunza na kufurahia masomo. Twende pamoja!`
                      : `I'm ${activeMascot.name}! I'm here to make learning fun and help you succeed. Let's go!`}
                  </Text>
                  <View style={styles.rafikiSpeechTailOuter} />
                  <View style={styles.rafikiSpeechTailInner} />
                </View>
              </>
            ) : null}

            {introStep === 'role' ? (
              <>
                <Text style={[styles.stepKicker, { color: content.accent }]}>
                  {swahiliIntro ? 'Karibu! 🚀' : 'Welcome! 🚀'}
                </Text>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {swahiliIntro ? 'Ni nani wewe?' : 'Who are you?'}
                </Text>
                <Text style={[styles.stepText, compactLayout && styles.stepTextCompact]}>
                  {swahiliIntro
                    ? 'Chagua nafasi yako ili Kitabu ikupe njia inayokufaa.'
                    : 'Choose your role so Kitabu can shape the right path for you.'}
                </Text>
                <View
                  accessibilityLabel="Account role options"
                  accessibilityRole="radiogroup"
                  style={styles.needChoiceGrid}>
                  {ROLE_OPTIONS.map(option => {
                    const canChangeRole = Boolean(onRoleChange);
                    const selected = option.role === role;
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
                        onPress={() => {
                          triggerHaptic('selection');
                          onRoleChange?.(option.role);
                        }}
                        style={[
                          styles.needChoice,
                          selected && {
                            backgroundColor: content.accent,
                            borderColor: content.accent,
                          },
                          !selected && !canChangeRole && styles.roleChoiceLocked,
                        ]}>
                        {selected ? (
                          <View style={styles.needChoiceCheck}>
                            <Check color={ONBOARDING_COLORS.white} size={12} strokeWidth={3} />
                          </View>
                        ) : null}
                        <Text style={[styles.needChoiceTitle, selected && styles.choiceChipTextActive]}>
                          {roleLabel}
                        </Text>
                        {roleDescription ? (
                          <Text style={[styles.needChoiceText, selected && styles.introChoiceTextActive]}>
                            {roleDescription}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {introStep === 'voice' ? (
              <>
                <Text style={[styles.stepKicker, { color: content.accent }]}>
                  {swahiliIntro ? 'Sauti 🔊' : 'Voice 🔊'}
                </Text>
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
                  {swahiliIntro ? 'Telezesha kusikia kila sauti' : 'Slide to hear each voice'}
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
                <Text style={[styles.stepKicker, { color: content.accent }]}>
                  {needStepCopy.eyebrow}
                </Text>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {needStepCopy.heading}
                </Text>
                <Text style={[styles.stepText, compactLayout && styles.stepTextCompact]}>
                  {swahiliIntro
                    ? 'Chagua jambo moja ili Kitabu iandae mwanzo wako vizuri.'
                    : 'Pick one priority so Kitabu can shape your first dashboard and guidance.'}
                </Text>
                <View
                  accessibilityLabel="Need options"
                  accessibilityRole="radiogroup"
                  style={styles.needChoiceGrid}>
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
                          styles.needChoice,
                          selected && {
                            backgroundColor: content.accent,
                            borderColor: content.accent,
                          },
                        ]}>
                        {selected ? (
                          <View style={styles.needChoiceCheck}>
                            <Check color={ONBOARDING_COLORS.white} size={12} strokeWidth={3} />
                          </View>
                        ) : null}
                        <Text style={[styles.needChoiceTitle, selected && styles.choiceChipTextActive]}>
                          {option.label}
                        </Text>
                        <Text style={[styles.needChoiceText, selected && styles.introChoiceTextActive]}>
                          {option.description}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {introStep === 'name' ? (
              <>
                <Text style={[styles.stepKicker, { color: content.accent }]}>
                  {nameStepCopy.eyebrow}
                </Text>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {swahiliIntro ? 'Jina lako ni nani?' : 'What is your name?'}
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
                  {nameStepCopy.subText}
                </Text>
              </>
            ) : null}

            {introStep === 'gender' ? (
              <>
                <Text style={[styles.stepKicker, { color: content.accent }]}>
                  {languageCode === 'sw' ? 'Kuhusu wewe \uD83E\uDDCD' : 'About you \uD83E\uDDCD'}
                </Text>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {languageCode === 'sw' ? 'Wewe ni wa jinsia gani?' : 'What is your gender?'}
                </Text>
                <Text style={[styles.stepText, compactLayout && styles.stepTextCompact]}>
                  {languageCode === 'sw'
                    ? 'Chagua Mvulana au Msichana ili Rafiki aandae uzoefu unaokufaa.'
                    : 'Choose Male or Female so Rafiki can personalize your experience.'}
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
                          {
                            backgroundColor: option.bgColor,
                            borderColor: option.accent,
                          },
                          selected && {
                            backgroundColor: content.accent,
                            borderColor: content.accent,
                          },
                        ]}>
                        <View style={[styles.genderAvatarBubble, { borderColor: option.accent }]}>
                          <Text style={styles.genderAvatarGlyph}>{option.avatar}</Text>
                        </View>
                        <Text style={[styles.introChoiceTitle, styles.genderChoiceTitle, { color: option.accent }, selected && styles.choiceChipTextActive]}>
                          {option.label}
                        </Text>
                        <Text style={[styles.introChoiceText, styles.genderChoiceText, selected && styles.introChoiceTextActive]}>
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
                    <Text style={[styles.stepKicker, { color: content.accent }]}>
                      {swahiliIntro ? 'Madarasa yako' : 'Your classes'}
                    </Text>
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
                              return (
                                <Pressable
                                  accessibilityRole="button"
                                  accessibilityLabel={`${selected ? 'Remove' : 'Add'} teaching ${option}`}
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
                                    {option}
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
                    <Text style={[styles.stepKicker, { color: content.accent }]}>
                      {swahiliIntro ? 'Watoto wako' : 'Your child'}
                    </Text>
                    <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                      {swahiliIntro ? 'Niambie kuhusu mtoto/watoto wako' : 'Tell me about your student'}
                    </Text>
                    <Text style={[styles.stepText, compactLayout && styles.stepTextCompact]}>
                      {swahiliIntro
                        ? 'Ongeza hadi watoto 3. Tutaunda mpango wa kibinafsi kwa kila mmoja.'
                        : "Add up to 3 children. We'll create a personalised plan for each."}
                    </Text>
                    <Text style={[styles.fieldLabel, compactLayout && styles.fieldLabelCompact]}>
                      {swahiliIntro ? 'Jina' : 'Child name'}
                    </Text>
                    <TextInput
                      accessibilityLabel="Child name"
                      autoCapitalize="words"
                      autoComplete="name"
                      autoCorrect={false}
                      onChangeText={handleParentChildNameChange}
                      placeholder={swahiliIntro ? 'Jina la mtoto...' : 'Child name'}
                      placeholderTextColor={ONBOARDING_COLORS.textMuted}
                      returnKeyType="next"
                      selectionColor={content.accent}
                      style={[styles.input, compactLayout && styles.inputCompact]}
                      textContentType="name"
                      value={parentChildName}
                    />
                    <View style={styles.inlineFieldRow}>
                      <View style={styles.inlineField}>
                        <Text style={[styles.fieldLabel, compactLayout && styles.fieldLabelCompact]}>
                          {swahiliIntro ? 'Umri' : 'Age'}
                        </Text>
                        <TextInput
                          accessibilityLabel="Child age"
                          keyboardType="number-pad"
                          maxLength={2}
                          onChangeText={handleParentChildAgeChange}
                          placeholder={swahiliIntro ? 'Umri...' : 'Age'}
                          placeholderTextColor={ONBOARDING_COLORS.textMuted}
                          returnKeyType="done"
                          selectionColor={content.accent}
                          style={[styles.input, compactLayout && styles.inputCompact]}
                          value={parentChildAge}
                        />
                      </View>
                      <View style={styles.inlineField}>
                        <Text style={[styles.fieldLabel, compactLayout && styles.fieldLabelCompact]}>
                          {swahiliIntro ? 'Darasa la Sasa' : 'Grade'}
                        </Text>
                        <ScrollView
                          accessibilityLabel="Child grade options"
                          horizontal
                          keyboardShouldPersistTaps="handled"
                          showsHorizontalScrollIndicator={false}>
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
                                  {option}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </ScrollView>
                      </View>
                    </View>
                    {additionalParentChildren.map((child, index) => (
                      <View key={index} style={styles.additionalChildPanel}>
                        <View style={styles.additionalChildHeader}>
                          <Text style={[styles.fieldLabel, styles.additionalChildTitle]}>
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
                        <Text style={[styles.fieldLabel, compactLayout && styles.fieldLabelCompact]}>
                          {swahiliIntro ? 'Jina' : 'Child name'}
                        </Text>
                        <TextInput
                          accessibilityLabel={`Child ${index + 2} name`}
                          autoCapitalize="words"
                          autoComplete="name"
                          autoCorrect={false}
                          onChangeText={value => handleAdditionalParentChildChange(index, 'name', value)}
                          placeholder={swahiliIntro ? 'Jina la mtoto...' : 'Child name'}
                          placeholderTextColor={ONBOARDING_COLORS.textMuted}
                          returnKeyType="next"
                          selectionColor={content.accent}
                          style={[styles.input, compactLayout && styles.inputCompact]}
                          textContentType="name"
                          value={child.name}
                        />
                        <View style={styles.inlineFieldRow}>
                          <View style={styles.inlineField}>
                            <Text style={[styles.fieldLabel, compactLayout && styles.fieldLabelCompact]}>
                              {swahiliIntro ? 'Umri' : 'Age'}
                            </Text>
                            <TextInput
                              accessibilityLabel={`Child ${index + 2} age`}
                              keyboardType="number-pad"
                              maxLength={2}
                              onChangeText={value => handleAdditionalParentChildChange(index, 'age', value)}
                              placeholder={swahiliIntro ? 'Umri...' : 'Age'}
                              placeholderTextColor={ONBOARDING_COLORS.textMuted}
                              returnKeyType="done"
                              selectionColor={content.accent}
                              style={[styles.input, compactLayout && styles.inputCompact]}
                              value={child.age}
                            />
                          </View>
                          <View style={styles.inlineField}>
                            <Text style={[styles.fieldLabel, compactLayout && styles.fieldLabelCompact]}>
                              {swahiliIntro ? 'Darasa la Sasa' : 'Grade'}
                            </Text>
                            <ScrollView
                              accessibilityLabel={`Child ${index + 2} grade options`}
                              horizontal
                              keyboardShouldPersistTaps="handled"
                              showsHorizontalScrollIndicator={false}>
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
                                      {option}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </ScrollView>
                          </View>
                        </View>
                      </View>
                    ))}
                    {additionalParentChildren.length < 2 ? (
                      <Pressable
                        accessibilityLabel="Add another child"
                        accessibilityRole="button"
                        onPress={handleAddParentChild}
                        style={[styles.addChildButton, { borderColor: content.accent }]}>
                        <Text style={[styles.addChildButtonText, { color: content.accent }]}>
                          {swahiliIntro ? 'Ongeza mtoto mwingine' : 'Add another child'}
                        </Text>
                      </Pressable>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Text style={[styles.stepKicker, { color: content.accent }]}>{ageStepCopy.eyebrow}</Text>
                    <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                      {ageStepCopy.heading(displayName.trim())}
                    </Text>
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
                      style={[styles.input, styles.profileInput, compactLayout && styles.inputCompact]}
                      value={age}
                    />
                    <Text style={[styles.stepText, compactLayout && styles.stepTextCompact]}>
                      {ageStepCopy.subText}
                    </Text>
                  </>
                )}
              </>
            ) : null}

            {introStep === 'goal' ? (
              <>
                <Text style={[styles.stepKicker, { color: content.accent }]}>
                  {swahiliIntro
                    ? role === 'teacher'
                      ? 'Malengo yako ya ufundishaji'
                      : role === 'parent'
                        ? 'Malengo yako kwao'
                        : 'Niambie'
                    : 'Your goal'}
                </Text>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {swahiliIntro
                    ? role === 'teacher'
                      ? 'Lengo lako kuu la ufundishaji ni nini?'
                      : role === 'parent'
                        ? 'Lengo lako kwa mtoto wako ni nini?'
                        : 'Lengo lako la kustudy ni nini?'
                    : role === 'teacher'
                      ? 'What is your teaching goal?'
                      : role === 'parent'
                        ? 'What is your family goal?'
                        : 'What is your learning goal?'}
                </Text>
                <Text style={[styles.stepText, compactLayout && styles.stepTextCompact]}>
                  {swahiliIntro ? 'Chagua lengo la kwanza Kitabu ilishughulikie.' : 'Choose the outcome Kitabu should optimise first.'}
                </Text>
                <View
                  accessibilityLabel="Goal options"
                  accessibilityRole="radiogroup"
                  style={styles.needChoiceGrid}>
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
                          styles.needChoice,
                          styles.goalChoice,
                          option.recommended && styles.goalChoiceRecommended,
                          selected && {
                            backgroundColor: content.accent,
                            borderColor: content.accent,
                          },
                        ]}>
                        {selected ? (
                          <View style={styles.needChoiceCheck}>
                            <Check color={ONBOARDING_COLORS.white} size={12} strokeWidth={3} />
                          </View>
                        ) : null}
                        {option.recommended ? (
                          <Text style={[styles.recommendedBadge, selected && styles.recommendedBadgeActive]}>
                            Recommended
                          </Text>
                        ) : null}
                        {option.icon ? (
                          <Text style={[styles.goalChoiceIcon, selected && styles.choiceChipTextActive]}>
                            {option.icon}
                          </Text>
                        ) : null}
                        <Text style={[styles.needChoiceTitle, selected && styles.choiceChipTextActive]}>
                          {option.label}
                        </Text>
                        {option.description ? (
                          <Text style={[styles.needChoiceText, selected && styles.introChoiceTextActive]}>
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
                <Text style={[styles.stepKicker, { color: content.accent }]}>
                  {swahiliIntro
                    ? role === 'teacher'
                      ? 'Changamoto zako \uD83D\uDCBC'
                      : role === 'parent'
                        ? 'Kinachokusumbua zaidi? \uD83D\uDC9B'
                        : 'Niambie \uD83E\uDDE0'
                    : role === 'teacher'
                      ? 'Your challenges \uD83D\uDCBC'
                      : role === 'parent'
                        ? 'What worries you most? \uD83D\uDC9B'
                        : 'Tell me \uD83E\uDDE0'}
                </Text>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {swahiliIntro
                    ? role === 'teacher'
                      ? 'Changamoto yako kubwa zaidi ya ufundishaji ni nini?'
                      : role === 'parent'
                        ? 'Kinachokusumbua zaidi kuhusu masomo ya mtoto wako?'
                        : role === 'other'
                          ? 'Changamoto yako kuu kwa sasa ni nini?'
                          : 'Changamoto yako kubwa zaidi shuleni ni nini?'
                    : role === 'teacher'
                      ? 'What\'s your biggest teaching challenge?'
                      : role === 'parent'
                        ? 'What concerns you most about your child\'s learning?'
                        : role === 'other'
                          ? 'What\'s your main challenge right now?'
                          : 'What\'s your biggest challenge at school?'}
                </Text>
                <Text style={[styles.stepText, compactLayout && styles.stepTextCompact]}>
                  {swahiliIntro
                    ? 'Chagua jambo linalokuzuia zaidi sasa.'
                    : 'This helps Rafiki shape the first plan around the real blocker.'}
                </Text>
                <View
                  accessibilityLabel="Concern options"
                  accessibilityRole="radiogroup"
                  style={styles.needChoiceGrid}>
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
                          styles.needChoice,
                          selected && {
                            backgroundColor: content.accent,
                            borderColor: content.accent,
                          },
                        ]}>
                        {selected ? (
                          <View style={styles.needChoiceCheck}>
                            <Check color={ONBOARDING_COLORS.white} size={12} strokeWidth={3} />
                          </View>
                        ) : null}
                        {option.icon ? (
                          <Text style={[styles.goalChoiceIcon, selected && styles.choiceChipTextActive]}>
                            {option.icon}
                          </Text>
                        ) : null}
                        <Text style={[styles.needChoiceTitle, selected && styles.choiceChipTextActive]}>
                          {option.label}
                        </Text>
                        {option.description ? (
                          <Text style={[styles.needChoiceText, selected && styles.introChoiceTextActive]}>
                            {option.description}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {introStep === 'achieve' ? (
              <>
                <Text style={[styles.stepKicker, { color: content.accent }]}>
                  {swahiliIntro
                    ? role === 'teacher'
                      ? 'Mafanikio yataonekanaje? \uD83C\uDFC6'
                      : role === 'parent'
                        ? 'Ungependa kuona nini? \uD83D\uDC9B'
                        : role === 'other'
                          ? 'Unatumaini nini? \uD83E\uDD1D'
                          : 'Malengo yako \uD83E\uDD1D'
                    : role === 'teacher'
                      ? 'What will success look like? \uD83C\uDFC6'
                      : role === 'parent'
                        ? 'What would you love to see? \uD83D\uDC9B'
                        : role === 'other'
                          ? 'What are you hoping for? \uD83E\uDD1D'
                          : 'Your goals \uD83E\uDD1D'}
                </Text>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {swahiliIntro
                    ? role === 'teacher'
                      ? 'Kitabu AI itafaa vipi kwako?'
                      : role === 'parent'
                        ? 'Unataka nini kifanyike kwa mtoto wako?'
                        : role === 'other'
                          ? 'Unatumaini matokeo gani?'
                          : 'Unataka kufanikisha nini na Kitabu AI?'
                    : role === 'teacher'
                      ? 'What would make Kitabu AI worth it for you?'
                      : role === 'parent'
                        ? 'What do you want to see happen for your child?'
                        : role === 'other'
                          ? 'What\'s the outcome you\'re hoping for?'
                          : 'What do you want to achieve with Kitabu AI?'}
                </Text>
                <Text style={[styles.stepText, compactLayout && styles.stepTextCompact]}>
                  {swahiliIntro ? 'Chagua matokeo muhimu zaidi kwako.' : 'Pick the result that would make Kitabu feel useful from day one.'}
                </Text>
                <View
                  accessibilityLabel="Achievement options"
                  accessibilityRole="radiogroup"
                  style={styles.needChoiceGrid}>
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
                          styles.needChoice,
                          selected && {
                            backgroundColor: content.accent,
                            borderColor: content.accent,
                          },
                        ]}>
                        {selected ? (
                          <View style={styles.needChoiceCheck}>
                            <Check color={ONBOARDING_COLORS.white} size={12} strokeWidth={3} />
                          </View>
                        ) : null}
                        {option.icon ? (
                          <Text style={[styles.goalChoiceIcon, selected && styles.choiceChipTextActive]}>
                            {option.icon}
                          </Text>
                        ) : null}
                        <Text style={[styles.needChoiceTitle, selected && styles.choiceChipTextActive]}>
                          {option.label}
                        </Text>
                        {option.description ? (
                          <Text style={[styles.needChoiceText, selected && styles.introChoiceTextActive]}>
                            {option.description}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {introStep === 'painBefore' ? (
              <>
                <Text style={[styles.stepKicker, { color: content.accent }]}>
                  {studentSwahiliIntro ? 'Inakujua? \uD83D\uDE2C' : 'Sound familiar? \uD83D\uDE2C'}
                </Text>
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
                      label: studentSwahiliIntro ? 'Kurasa 200 za notes kusomwa' : '200 pages of notes to read',
                    },
                    {
                      icon: '\uD83D\uDE30',
                      label: studentSwahiliIntro ? 'Hofu na wasiwasi mkubwa' : 'Panic and anxiety',
                    },
                    {
                      icon: '?',
                      label: studentSwahiliIntro ? 'Nianze wapi? Sina mpango' : 'Where do I even start?',
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
                <Text style={[styles.stepKicker, { color: content.accent }]}>
                  {studentSwahiliIntro ? 'Sasa na Kitabu AI' : 'With Kitabu'}
                </Text>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {studentSwahiliIntro ? 'Usiku kabla ya mtihani wako...' : 'The night before an exam...'}
                </Text>
                <Text style={styles.storyHeroEmoji}>{'\uD83D\uDE0C'}</Text>
                <Text style={[styles.storyTag, { color: content.accent }]}>
                  {studentSwahiliIntro ? 'NA KITABU AI' : 'WITH KITABU AI'}
                </Text>
                <View style={styles.needChoiceGrid}>
                  {[
                    studentSwahiliIntro ? 'Mpango wazi wa kustudy' : 'A clear study plan',
                    studentSwahiliIntro ? 'Uko tayari - unajua yaliyoulizwa KNEC' : 'Feel prepared - you know the KNEC topics',
                    studentSwahiliIntro ? 'Unalala amani kabla ya mtihani' : 'Sleep soundly before your exam',
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
                <Text style={[styles.stepKicker, { color: content.accent }]}>
                  {studentSwahiliIntro ? 'Ni bidii' : 'Real progress'}
                </Text>
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
              <>
                <Text style={[styles.stepKicker, { color: content.accent }]}>
                  {swahiliIntro ? 'Habari njema! \uD83D\uDC47' : 'Good news! \uD83D\uDC47'}
                </Text>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {swahiliIntro
                    ? 'Si wewe peke yako anayetaka kuboresha alama.'
                    : 'You\'re not the only one who wants to improve.'}
                </Text>
                <View style={[styles.gradeImprovementCard, { borderColor: `${content.accent}55` }]}>
                  <Text style={styles.gradeImprovementSmall}>
                    {swahiliIntro ? 'Maboresho ya hadi' : 'Improvement of up to'}
                  </Text>
                  <Text style={[styles.gradeImprovementNumber, { color: content.accent }]}>
                    {swahiliIntro ? 'Daraja 2' : '2 grades'}
                  </Text>
                  <Text style={styles.gradeImprovementSmall}>
                    {swahiliIntro ? 'baada ya miezi 3 na Kitabu AI' : 'after 3 months with Kitabu AI'}
                  </Text>
                  <View style={styles.proofBarStack}>
                    <View style={styles.proofBarRow}>
                      <Text style={styles.proofBarLabel}>
                        {swahiliIntro ? 'Daraja lako sasa' : 'Your grade now'}
                      </Text>
                      <View
                        accessibilityLabel="Current grade progress"
                        style={styles.proofBarTrack}
                        testID="current-grade-proof-bar">
                        <View
                          testID="current-grade-proof-fill"
                          style={[
                            styles.proofBarFill,
                            styles.proofBarFillCurrent,
                            { backgroundColor: ONBOARDING_COLORS.textMuted },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={styles.proofBarRow}>
                      <Text style={[styles.proofBarLabel, { color: content.accent }]}>
                        {swahiliIntro ? 'Daraja na Kitabu AI' : 'Grade with Kitabu AI'}
                      </Text>
                      <View
                        accessibilityLabel="Kitabu grade progress"
                        style={styles.proofBarTrack}
                        testID="kitabu-grade-proof-bar">
                        <View
                          testID="kitabu-grade-proof-fill"
                          style={[
                            styles.proofBarFill,
                            styles.proofBarFillKitabu,
                            { backgroundColor: content.accent },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                </View>
                <View style={[styles.researchQuoteCard, { borderColor: `${content.accent}55` }]}>
                  <Text style={styles.researchQuoteText}>
                    {swahiliIntro ? (
                      <>
                        Research inaonyesha wanafunzi wenye AI tutor huboreka{' '}
                        <Text style={[styles.researchQuoteEmphasis, { color: content.accent }]}>
                          mara mbili zaidi
                        </Text>{' '}
                        kuliko darasa la kawaida.
                      </>
                    ) : (
                      <>
                        Research shows students with an AI tutor improve{' '}
                        <Text style={[styles.researchQuoteEmphasis, { color: content.accent }]}>
                          twice as fast
                        </Text>{' '}
                        compared to a traditional classroom.
                      </>
                    )}
                  </Text>
                  <Text style={styles.researchQuoteSource}>- EdTech Africa Research, 2024</Text>
                </View>
              </>
            ) : null}

            {introStep === 'country' ? (
              <>
                <Text style={[styles.stepKicker, { color: content.accent }]}>
                  {swahiliIntro
                    ? `Karibu, ${displayName.trim() || 'rafiki'} \uD83D\uDE4C`
                    : `Nice to meet you, ${displayName.trim() || 'friend'} \uD83D\uDE4C`}
                </Text>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {swahiliIntro ? 'Unasomea katika nchi hii?' : 'Are you studying in this country?'}
                </Text>
                <Text
                  accessibilityLabel="Kenya flag"
                  style={styles.countryFlagEmoji}>
                  🇰🇪
                </Text>
                <View style={[styles.countryPill, { borderColor: content.accent }]}>
                  <Text style={[styles.countryPillText, { color: content.accent }]}>Kenya ▾</Text>
                </View>
                <View style={[styles.socialProofPanel, styles.countryInfoCard, { borderColor: `${content.accent}55` }]}>
                  <Text style={[styles.needChoiceTitle, { color: ONBOARDING_COLORS.textPrimary }]}>
                    {'\uD83D\uDCDA '}
                    {swahiliIntro ? 'CBC / KNEC wa Kenya' : 'CBC / KNEC Kenya curriculum'}
                  </Text>
                  <Text style={styles.needChoiceText}>
                    {swahiliIntro
                      ? 'Nitahakikisha masomo yako yanafuata mtaala rasmi wa CBC / KNEC wa Kenya - maswali halisi ya mitihani, mada sahihi.'
                      : 'I will make sure your lessons follow the official CBC / KNEC Kenya curriculum - real exam questions, correct topics.'}
                  </Text>
                </View>
              </>
            ) : null}

            {introStep === 'interests' ? (
              <>
                <Text style={[styles.stepKicker, { color: content.accent }]}>
                  {swahiliIntro ? 'Jambo moja zaidi \uD83D\uDC4D' : 'Just one more thing \uD83D\uDC4D'}
                </Text>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {swahiliIntro ? 'Mambo unayopenda?' : 'What are your interests?'}
                </Text>
                <Text style={[styles.stepText, compactLayout && styles.stepTextCompact]}>
                  {swahiliIntro
                    ? 'Tutafanya maudhui ya masomo kulingana na unayopenda.'
                    : "We'll create study content you'll actually enjoy."}
                </Text>
                <View style={styles.voiceChoiceGrid}>
                  {INTEREST_OPTIONS.map(option => {
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
                          styles.voiceChoice,
                          selected && {
                            backgroundColor: content.accent,
                            borderColor: content.accent,
                          },
                        ]}>
                        <Text style={[styles.voiceChoiceTitle, selected && styles.choiceChipTextActive]}>
                          {option.icon ? `${option.icon} ${interestLabel}` : interestLabel}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Skip interests"
                  onPress={handleContinue}
                  style={[styles.interestsSkipButton, { borderColor: `${content.accent}55` }]}>
                  <Text style={[styles.interestsSkipText, { color: content.accent }]}>
                    {swahiliIntro ? 'Ruka' : 'Skip'}
                  </Text>
                </Pressable>
              </>
            ) : null}

            {introStep === 'reminder' ? (
              <>
                <Text style={[styles.stepKicker, { color: content.accent }]}>
                  {reminderKicker}
                </Text>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {reminderQuestion}
                </Text>
                <Text style={[styles.stepText, compactLayout && styles.stepTextCompact]}>
                  {reminderDescription} You can change this later.
                </Text>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityLabel="Daily study reminder"
                  accessibilityHint="Turns daily Kitabu reminders on or off"
                  accessibilityState={{ checked: reminderEnabled }}
                  onPress={handleReminderToggle}
                  style={[
                    styles.reminderPhoneMockup,
                    reminderEnabled && {
                      borderColor: content.accent,
                    },
                  ]}
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
                              ? `${displayName.trim() || 'Rafiki'}, mtihani wako wa Hesabu ni kesho. \uD83D\uDE80`
                              : `${displayName.trim() || 'Friend'}, your Math exam is tomorrow. \uD83D\uDE80`}
                          </Text>
                          <Text style={styles.reminderNotificationText}>
                            {swahiliIntro ? 'Twende tujiandae pamoja!' : "Let's get ready together!"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={styles.reminderSwitchRow}>
                    <Text style={[styles.textOnlyTitle, reminderEnabled && { color: content.accent }]}>
                      {reminderTitle}
                    </Text>
                    <View
                      style={[
                        styles.textOnlySwitch,
                        reminderEnabled && { backgroundColor: content.accent },
                      ]}>
                      <View
                        style={[
                          styles.textOnlySwitchKnob,
                          reminderEnabled && styles.textOnlySwitchKnobOn,
                        ]}
                      />
                    </View>
                  </View>
                </Pressable>
                <View style={styles.reminderBenefitStrip}>
                  {[
                    swahiliIntro ? { icon: '\uD83D\uDD25', label: 'Mfululizo wa siku' } : { icon: '\uD83D\uDD25', label: 'Daily streak' },
                    swahiliIntro ? { icon: '\uD83D\uDCC8', label: 'Alama bora' } : { icon: '\uD83D\uDCC8', label: 'Better grades' },
                    swahiliIntro ? { icon: '\uD83E\uDDE0', label: 'Kaa makini' } : { icon: '\uD83E\uDDE0', label: 'Stay sharp' },
                  ].map(item => (
                    <View key={item.label} style={styles.reminderBenefitCard}>
                      <Text style={styles.reminderBenefitIcon}>{item.icon}</Text>
                      <Text style={styles.reminderBenefitText}>{item.label}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.reminderFooterCaption}>
                  {swahiliIntro
                    ? 'Unaweza kuruka sasa au kuwasha ukumbusho wa Kitabu AI.'
                    : 'Skip now or turn on a Kitabu AI reminder.'}
                </Text>
              </>
            ) : null}

            {introStep === 'setup' && (step === 0 || (studentFullIntro && step === 1)) ? (
              <>
                {includeIntroChoices ? (
                  <Text style={[styles.stepKicker, { color: content.accent }]}>
                    {swahiliIntro
                      ? role === 'teacher'
                        ? 'Masomo unayofundisha \uD83D\uDCD6'
                        : step === 1
                          ? 'Masomo yako \uD83D\uDCD6'
                        : 'Darasa lako \uD83D\uDCDA'
                      : role === 'teacher'
                        ? 'Your subjects \uD83D\uDCD6'
                        : step === 1
                          ? 'Your subjects \uD83D\uDCD6'
                        : 'Your grade \uD83D\uDCDA'}
                  </Text>
                ) : null}
                <Text
                  style={[
                    styles.stepTitle,
                    !includeIntroChoices && styles.stepTitleNoKicker,
                    compactLayout && styles.stepTitleCompact,
                  ]}>
                  {swahiliIntro
                    ? role === 'teacher'
                      ? 'Unafundisha masomo gani?'
                      : step === 1
                        ? 'Unasoma masomo gani?'
                      : 'Uko darasa gani?'
                    : role === 'teacher' && includeIntroChoices
                      ? 'Which subjects do you teach?'
                      : step === 1
                        ? 'Which subjects do you study?'
                      : usesLearnerFlow && includeIntroChoices
                        ? 'Which grade are you in?'
                      : content.stepOneTitle}
                </Text>
                <Text style={[styles.stepText, compactLayout && styles.stepTextCompact]}>
                  {swahiliIntro
                    ? role === 'teacher'
                      ? 'Chagua masomo yote unayofundisha.'
                      : step === 1
                        ? 'Chagua masomo yako ya CBC. Unaweza kuruka na kuongeza baadaye.'
                      : 'Tutaandaa maudhui yanayofaa mtaala wako wa CBC.'
                    : role === 'teacher' && includeIntroChoices
                      ? 'Select all that apply.'
                      : step === 1
                        ? 'Choose your CBC subjects. You can skip and add more later.'
                      : content.stepOneText}
                </Text>
                {!(studentFullIntro && step === 1) ? (
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

                {(role !== 'teacher' || !includeIntroChoices) && step === 0 ? (
                  <>
                    <Text style={[styles.fieldLabel, compactLayout && styles.fieldLabelCompact]}>
                      {swahiliIntro ? (role === 'teacher' ? 'Madarasa' : 'Darasa lako') : content.gradeLabel}
                    </Text>
                    <View
                      accessibilityLabel={`${content.gradeLabel} options`}
                      accessibilityRole="radiogroup"
                      style={styles.choiceRow}>
                      {SUPPORTED_GRADES.map(option => (
                        <Pressable
                          accessibilityRole="radio"
                          accessibilityLabel={`Select ${option}`}
                          accessibilityState={{ checked: grade === option }}
                          key={option}
                          onPress={() => handleGradeSelect(option)}
                          style={[
                            styles.choiceChip,
                            compactLayout && styles.choiceChipCompact,
                            grade === option && {
                              backgroundColor: content.accent,
                              borderColor: content.accent,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.choiceChipText,
                              grade === option && styles.choiceChipTextActive,
                            ]}>
                            {swahiliIntro
                              ? role === 'teacher'
                                ? option.replace('Grade ', 'Dar. ')
                                : option.replace('Grade ', 'Darasa la ')
                              : option}
                          </Text>
                        </Pressable>
                      ))}
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
                          {GRADE_BAND_LABELS[activeGradeBand][languageCode]}
                        </Text>
                      </View>
                    ) : null}
                  </>
                ) : null}

                {subjectPreferenceLabel &&
                subjectPreferenceText &&
                (!usesLearnerFlow || !includeIntroChoices || step === 1) ? (
                  <>
                    <View style={styles.subjectHeaderRow}>
                      <Text style={[styles.fieldLabel, compactLayout && styles.fieldLabelCompact]}>
                        {swahiliIntro
                          ? role === 'teacher'
                            ? 'Masomo unayofundisha'
                            : 'Masomo yako'
                          : subjectPreferenceLabel}
                      </Text>
                      <Text
                        accessibilityLiveRegion="polite"
                        role="status"
                        style={[styles.subjectCount, { color: content.accent }]}>
                        {role === 'teacher'
                          ? selectedSubjectCount > 0
                            ? `${selectedSubjectCount} selected \u2713`
                            : ''
                          : usesLearnerFlow && includeIntroChoices
                            ? swahiliIntro
                              ? `${selectedSubjectCount} zimechaguliwa \u2713`
                              : `${selectedSubjectCount} selected \u2713`
                          : `${selectedSubjectCount}/${MAX_ONBOARDING_SUBJECTS}`}
                      </Text>
                    </View>
                    <Text style={[styles.subjectHelpText, compactLayout && styles.subjectHelpTextCompact]}>
                      {swahiliIntro
                        ? role === 'teacher'
                          ? 'Chagua masomo yote unayofundisha.'
                          : 'Chagua yote yanayokufaa. Unaweza kuongeza zaidi baadaye.'
                        : subjectPreferenceText}
                    </Text>
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
                                const selected = selectedSubjectIds.includes(subject.id);
                                const disabled =
                                  role !== 'teacher' &&
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
                                    onPress={() => handleSubjectToggle(subject.id)}
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
                                      numberOfLines={1}
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
                  </>
                ) : null}
              </>
            ) : null}

            {introStep === 'setup' && (step === 1 || (studentFullIntro && step === 2)) && !(studentFullIntro && step === 1) ? (
              <>
                <Text style={[styles.stepKicker, { color: content.accent }]}>
                  {schoolStepCopy.eyebrow}
                </Text>
                <Text style={[styles.stepTitle, schoolStepCompactLayout && styles.stepTitleCompact]}>
                  {schoolStepCopy.heading}
                </Text>
                <Text style={[styles.stepText, schoolStepCompactLayout && styles.stepTextCompact]}>
                  {swahiliIntro ? 'Unaweza kuruka hatua hii na kuongeza shule baadaye.' : content.schoolText}
                </Text>

                <Text style={[styles.fieldLabel, schoolStepCompactLayout && styles.fieldLabelCompact]}>
                  {swahiliIntro ? 'Kaunti' : 'County'}
                </Text>
                <ScrollView
                  accessibilityLabel="County options"
                  accessibilityRole="radiogroup"
                  horizontal
                  keyboardShouldPersistTaps="handled"
                  showsHorizontalScrollIndicator={false}
                  style={styles.countyList}>
                  {countyOptions.map(option => {
                    const selected = county === option;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityLabel={`Select ${option} county`}
                        accessibilityState={{ checked: selected }}
                        key={option}
                        onPress={() => handleCountySelect(option)}
                        style={[
                          styles.countyChip,
                          schoolStepCompactLayout && styles.countyChipCompact,
                          selected && {
                            backgroundColor: content.accent,
                            borderColor: content.accent,
                          },
                        ]}>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.choiceChipText,
                            selected && styles.choiceChipTextActive,
                          ]}>
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Text style={[styles.fieldLabel, schoolStepCompactLayout && styles.fieldLabelCompact]}>
                  {swahiliIntro ? 'Shule' : 'School'}
                </Text>
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
                  placeholder={swahiliIntro ? (county ? 'Tafuta shule...' : 'Chagua kaunti kwanza') : county ? 'Search your school' : 'Select county first'}
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
                  style={styles.schoolList}
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
                  {county && schoolQuery.trim() ? (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityLabel={`Add ${schoolQuery.trim()} school`}
                      accessibilityState={{ checked: customSchoolName === schoolQuery.trim() && !schoolId }}
                      onPress={handleAddCustomSchool}
                      style={[
                        styles.schoolOption,
                        schoolStepCompactLayout && styles.schoolOptionCompact,
                        customSchoolName === schoolQuery.trim() && !schoolId
                          ? [styles.schoolOptionSelected, { borderColor: content.accent }]
                          : {},
                      ]}>
                      <View style={styles.schoolOptionHeader}>
                        <Text style={[styles.schoolName, { color: content.accent }]}>
                          + Add "{schoolQuery.trim()}"
                        </Text>
                        {customSchoolName === schoolQuery.trim() && !schoolId ? (
                          <View
                            style={[styles.schoolSelectedCheck, { backgroundColor: content.accent }]}
                            testID="selected-school-check">
                            <Check color={ONBOARDING_COLORS.white} size={12} strokeWidth={3} />
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.schoolMeta}>{county}</Text>
                      <Text style={[styles.schoolGradeMeta, { color: content.accent }]}>
                        Custom school
                      </Text>
                    </Pressable>
                  ) : null}
                  {filteredSchools.length === 0 ? (
                    <Text
                      accessibilityLabel="No matching schools"
                      accessibilityLiveRegion="polite"
                      role="status"
                      style={styles.emptyText}>
                      {county
                        ? 'No match yet. You can ask admin to add your school.'
                        : 'Choose a county first to find your school.'}
                    </Text>
                  ) : null}
                </ScrollView>

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
                        {county} County {'\u00B7'} Kenya
                      </Text>
                    </View>
                  </View>
                ) : null}

                {county && !hasSelectedSchool ? (
                  <Pressable
                    accessibilityLabel="Request school on WhatsApp"
                    accessibilityHint="Opens WhatsApp to message Kitabu admin"
                    accessibilityRole="link"
                    onPress={handleRequestMissingSchool}
                    testID="missing-school-link">
                    <Text style={[styles.whatsAppLink, { color: content.accent }]}>
                      {compactLayout
                        ? 'School missing? WhatsApp admin'
                        : 'School missing? Request it on WhatsApp: 0716175485'}
                    </Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}

            {introStep === 'setup' && step === 2 ? (
              <>
                <Text style={[styles.stepKicker, { color: content.accent }]}>Payments</Text>
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
                <Text style={[styles.stepKicker, { color: content.accent }]}>
                  {swahiliIntro ? 'Kitabu AI' : role === 'teacher' ? 'Building workspace' : role === 'parent' ? 'Building dashboard' : 'Building profile'}
                </Text>
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
                          ? 'We are combining your mascot, family goal, curriculum, reminders, child profile, and school.'
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
                <Text style={[styles.stepKicker, { color: content.accent }]}>
                  {swahiliIntro ? 'Mwenzako wa masomo' : role === 'teacher' ? 'Workspace ready' : role === 'parent' ? 'Dashboard ready' : 'Profile ready'}
                </Text>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {readyHeaderTitle}
                </Text>
                <View style={[styles.readyHeroPanel, { borderColor: `${content.accent}55` }]}>
                  <View
                    accessibilityLabel={mascotPoseAccessibilityLabel}
                    accessibilityRole="image"
                    style={styles.readyHeroMascotWrap}>
                    <Image
                      accessibilityIgnoresInvertColors
                      accessibilityLabel={activeMascot.label}
                      source={activeMascot.source}
                      resizeMode="contain"
                      style={styles.readyHeroMascot}
                    />
                    {renderMascotPoseEffect('large')}
                  </View>
                  <Text style={[styles.readyHeroTitle, { color: content.accent }]}>
                    {swahiliIntro ? 'Malengo ya kufikiwa' : 'Goals to reach'}
                  </Text>
                  <Text style={styles.loadingProfileText}>
                    {readySummary}
                  </Text>
                </View>
                {swahiliIntro ? (
                  <>
                    <View style={styles.profileReadyChecklist}>
                      {['Maboresho ya hadi daraja 2', 'Kuwa mbele ya wanafunzi wengi', '94% zaidi ya ujasiri'].map(item => (
                        <View key={item} style={styles.profileReadyRow}>
                          <View style={[styles.profileReadyCheck, { backgroundColor: content.accent }]}>
                            <Check color={ONBOARDING_COLORS.white} size={12} strokeWidth={3} />
                          </View>
                          <Text style={styles.profileReadyRowText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={[styles.socialProofPanel, { borderColor: `${content.accent}55` }]}>
                      <Text style={[styles.socialProofNumber, { color: content.accent }]}>4.89</Text>
                      <Text style={styles.socialProofText}>Unajiunga na wanafunzi wengi walioridhika.</Text>
                      <Text style={[styles.helperText, styles.centeredText]}>
                        Wanaotumiwa na wanafunzi 2,400,000+
                      </Text>
                      {renderReadyTestimonialCarousel()}
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.profileReadyChecklist}>
                      <View style={styles.profileReadyRow}>
                        <View style={[styles.profileReadyCheck, { backgroundColor: content.accent }]}>
                          <Check color={ONBOARDING_COLORS.white} size={12} strokeWidth={3} />
                        </View>
                        <Text style={styles.profileReadyRowText}>
                          Goal: {goalOptions.find(option => option.key === selectedGoalKey)?.label ?? 'Ready'}
                        </Text>
                      </View>
                      <View style={styles.profileReadyRow}>
                        <View style={[styles.profileReadyCheck, { backgroundColor: content.accent }]}>
                          <Check color={ONBOARDING_COLORS.white} size={12} strokeWidth={3} />
                        </View>
                        <Text style={styles.profileReadyRowText}>
                          Reminder: {reminderEnabled ? readyReminderLabel : 'Off for now'}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.socialProofPanel, { borderColor: `${content.accent}55` }]}>
                      <Text style={[styles.socialProofNumber, { color: content.accent }]}>4.89</Text>
                      <Text style={styles.readyRatingStars}>{'\u2605\u2605\u2605\u2605\u2605'}</Text>
                      <Text style={styles.socialProofText}>Trusted by local learners and families.</Text>
                      {renderReadyTestimonialCarousel()}
                    </View>
                  </>
                )}
              </>
            ) : null}

            {introStep === 'signup' ? (
              <>
                <Text style={[styles.stepKicker, { color: content.accent }]}>
                  {swahiliIntro ? 'Hifadhi akaunti yako' : 'Save your account'}
                </Text>
                <Text style={[styles.stepTitle, compactLayout && styles.stepTitleCompact]}>
                  {swahiliIntro ? 'Jiandikishe kuendelea na mpango wako wa masomo' : 'Sign up to continue with your study plan'}
                </Text>
                <Text style={[styles.stepText, compactLayout && styles.stepTextCompact]}>
                  {swahiliIntro
                    ? 'Tutahifadhi lugha, Rafiki, malengo, mtaala, shule, na vikumbusho ulivyochagua.'
                    : 'We will save the language, Rafiki, goals, curriculum, school, and reminders you selected.'}
                </Text>
                {collectSignupCredentials ? (
                  <>
                    {signupStep !== 'method' && signupStep !== 'google' ? (
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
                          <Text style={styles.signupGoogleMark}>G</Text>
                          <Text style={styles.signupGoogleText}>Continue with Google</Text>
                        </Pressable>
                        <Pressable
                          accessibilityLabel="Sign up with email"
                          accessibilityRole="button"
                          onPress={() => handleSignupMethodSelect('email')}
                          style={[styles.signupPrimaryButton, { backgroundColor: content.accent }]}>
                          <Mail color={ONBOARDING_COLORS.white} size={18} strokeWidth={2.5} />
                          <Text style={styles.signupPrimaryText}>Sign up with email</Text>
                        </Pressable>
                        <Pressable
                          accessibilityLabel="Sign up with phone"
                          accessibilityRole="button"
                          onPress={() => handleSignupMethodSelect('phone')}
                          style={styles.signupPhoneButton}>
                          <Phone color={content.accent} size={18} strokeWidth={2.5} />
                          <Text style={[styles.signupPhoneText, { color: content.accent }]}>Sign up with phone</Text>
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
                            ? 'Enter at least 6 characters'
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
                          <Text style={styles.signupPrimaryText}>Send verification code {'\u2192'}</Text>
                          <ChevronRight color={ONBOARDING_COLORS.white} size={18} strokeWidth={2.7} />
                        </Pressable>
                      </View>
                    ) : null}

                    {signupStep === 'verify' ? (
                      <View style={styles.signupFormPanel}>
                        <Image
                          accessibilityIgnoresInvertColors
                          accessibilityLabel={mascotPoseAccessibilityLabel}
                          resizeMode="contain"
                          source={activeMascot.source}
                          style={styles.signupVerifyMascot}
                        />
                        {renderMascotPoseEffect('large')}
                        <Text style={[styles.needChoiceTitle, styles.centeredText]}>
                          {swahiliIntro ? 'Ingiza msimbo wa nambari 6' : 'Enter the 6-digit code'}
                        </Text>
                        <Text style={styles.signupDestinationText}>
                          We sent a code to {signupMethod === 'phone' ? normalizedSignupPhone : signupEmailTrimmed}
                        </Text>
                        <Text style={styles.signupTestHint}>(Use 123456 to test)</Text>
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

                    {signupStep === 'google' ? (
                      <View style={styles.signupFormPanel}>
                        <Text style={styles.signupGoogleMarkLarge}>G</Text>
                        <Text style={[styles.needChoiceTitle, styles.centeredText]}>Connecting to Google</Text>
                        <Text style={styles.signupDestinationText}>
                          We will save this Kitabu profile to your Google account.
                        </Text>
                        <Pressable
                          accessibilityLabel="Simulate Google success"
                          accessibilityRole="button"
                          onPress={handleGoogleSignupSuccess}
                          style={[styles.signupPrimaryButton, { backgroundColor: content.accent }]}>
                          <Text style={styles.signupPrimaryText}>Simulate success {'\u2192'}</Text>
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

            {!usesInlineSignupFlow && !usesAutoAdvanceChoice && introStep !== 'loading' ? (
            <View
              testID="onboarding-footer"
              style={[styles.footerRow, footerCompactLayout && styles.footerRowCompact]}>
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
                  (introStep === 'setup' && step === 2 && !studentFullIntro) || introStep === 'signup'
                    ? 'Finish account setup'
                    : 'Continue account setup'
                }
                accessibilityHint={primaryActionHint}
                accessibilityState={{ disabled: !canContinue || isSubmitting, busy: isSubmitting }}
                disabled={!canContinue || isSubmitting}
                onPress={handleContinue}
                style={[
                  styles.primaryButton,
                  footerCompactLayout && styles.primaryButtonCompact,
                  { backgroundColor: content.accent },
                  (!canContinue || isSubmitting) && styles.primaryButtonDisabled,
                ]}>
                {isSubmitting ? (
                  <ActivityIndicator color={ONBOARDING_COLORS.white} />
                ) : (
                  <View style={styles.primaryButtonContent}>
                    <Text numberOfLines={2} style={styles.primaryText}>
                      {primaryActionText}
                    </Text>
                    <PrimaryActionIcon color={ONBOARDING_COLORS.white} size={18} strokeWidth={2.8} />
                  </View>
                )}
              </Pressable>
            </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  keyboardWrap: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 18,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  scrollContentCompact: {
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  dashboardScrollContent: {
    flexGrow: 1,
    gap: 16,
    paddingBottom: 24,
    paddingHorizontal: 18,
    paddingTop: 22,
  },
  dashboardTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  dashboardGreetingBlock: {
    flex: 1,
    minWidth: 0,
  },
  dashboardEyebrow: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  dashboardGreeting: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 6,
  },
  dashboardName: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
  },
  dashboardMascotFrame: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    borderWidth: 1,
    height: 112,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 112,
  },
  dashboardMascot: {
    height: 100,
    width: 100,
  },
  dashboardStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dashboardStatCard: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    minHeight: 84,
    padding: 14,
  },
  dashboardStatLabel: {
    color: ONBOARDING_COLORS.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  dashboardStatValue: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
    marginTop: 8,
  },
  dashboardStreakCard: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  dashboardStreakHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dashboardStreakTitle: {
    color: ONBOARDING_COLORS.textPrimary,
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  dashboardStreakCount: {
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 12,
  },
  dashboardStreakTrack: {
    backgroundColor: ONBOARDING_COLORS.bgSoft,
    borderRadius: 999,
    height: 10,
    marginTop: 12,
    overflow: 'hidden',
  },
  dashboardStreakFill: {
    borderRadius: 999,
    height: '100%',
    width: '14%',
  },
  dashboardSpeechRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  dashboardSpeechMascot: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderRadius: 999,
    borderWidth: 2,
    height: 64,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 64,
  },
  dashboardSpeechMascotImage: {
    height: 58,
    width: 58,
  },
  dashboardSpeechBubble: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  dashboardSpeechText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  dashboardSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dashboardSectionTitle: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  dashboardSectionPill: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  dashboardSectionPillText: {
    fontSize: 12,
    fontWeight: '900',
  },
  dashboardActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dashboardActionCard: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 124,
    padding: 14,
    width: '48%',
  },
  dashboardActionIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  dashboardActionTitle: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 12,
  },
  dashboardActionText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 4,
  },
  dashboardSeeAllText: {
    fontSize: 12,
    fontWeight: '900',
  },
  dashboardSubjectList: {
    gap: 10,
  },
  dashboardSubjectRow: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 62,
    padding: 12,
  },
  dashboardSubjectIcon: {
    alignItems: 'center',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  dashboardSubjectCopy: {
    flex: 1,
  },
  dashboardSubjectName: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },
  dashboardSubjectHint: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  dashboardPlanList: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  dashboardPlanRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 52,
  },
  dashboardPlanNumber: {
    alignItems: 'center',
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  dashboardPlanNumberText: {
    fontSize: 13,
    fontWeight: '900',
  },
  dashboardPlanCopy: {
    flex: 1,
  },
  dashboardPlanTitle: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },
  dashboardPlanTime: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  dashboardPlanStartPill: {
    backgroundColor: ONBOARDING_COLORS.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  dashboardPlanStartText: {
    fontSize: 12,
    fontWeight: '900',
  },
  dashboardTabBar: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  dashboardTab: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  dashboardTabText: {
    fontSize: 11,
    fontWeight: '900',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  headerCopy: {
    flex: 1,
    gap: 8,
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
  mascotSunglassLens: {
    backgroundColor: ONBOARDING_COLORS.textPrimary,
    borderRadius: 5,
    height: 10,
    width: 18,
  },
  mascotSunglassBridge: {
    backgroundColor: ONBOARDING_COLORS.textPrimary,
    height: 3,
    width: 7,
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
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 29,
    fontWeight: '900',
    lineHeight: 34,
  },
  titleCompact: {
    fontSize: 27,
    lineHeight: 32,
  },
  body: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
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
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '900',
  },
  progressTitle: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
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
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 58,
  },
  mascotNavBackSpacer: {
    width: 34,
  },
  mascotNavBackText: {
    fontSize: 12,
    fontWeight: '900',
  },
  mascotNavProgressTrack: {
    backgroundColor: 'rgba(160,140,110,0.28)',
    borderRadius: 999,
    flex: 1,
    height: 9,
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
    justifyContent: 'space-between',
    minHeight: 40,
  },
  preMascotBackButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
    minWidth: 72,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  preMascotBackText: {
    fontSize: 13,
    fontWeight: '900',
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
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderColor: 'rgba(255,255,255,0.72)',
    borderRadius: 30,
    borderWidth: 1,
    flex: 1,
    marginTop: 16,
    minHeight: 560,
    padding: 20,
  },
  cardCompact: {
    borderRadius: 28,
    minHeight: 456,
    padding: 18,
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
    fontSize: 24,
    fontWeight: '900',
    marginTop: 10,
  },
  stepTitleNoKicker: {
    marginTop: 0,
  },
  stepTitleCompact: {
    fontSize: 22,
    lineHeight: 27,
  },
  stepText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  stepTextCompact: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  stepKicker: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
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
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
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
  },
  introChoiceText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
  },
  introChoiceTextActive: {
    color: 'rgba(255,255,255,0.86)',
  },
  mascotChoiceGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  mascotChoice: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 18,
    borderWidth: 1.5,
    flex: 1,
    minHeight: 158,
    paddingHorizontal: 8,
    paddingVertical: 12,
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
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 76,
    padding: 12,
    width: '47%',
  },
  voiceChoiceTitle: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  voiceChoiceText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 5,
  },
  textOnlyRow: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    minHeight: 72,
    padding: 12,
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
    flex: 1,
  },
  textOnlyTitle: {
    color: ONBOARDING_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },
  textOnlyText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 2,
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
  reminderSwitchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
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
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 112,
    padding: 16,
    position: 'relative',
  },
  roleChoiceLocked: {
    opacity: 0.56,
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
    lineHeight: 21,
    paddingRight: 26,
  },
  needChoiceText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 8,
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
    marginTop: 16,
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
    marginTop: 14,
    minHeight: 34,
    paddingVertical: 8,
  },
  signupInlineBackText: {
    fontSize: 13,
    fontWeight: '900',
  },
  signupMethodStack: {
    gap: 12,
    marginTop: 18,
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
  signupGoogleMarkLarge: {
    color: '#4285F4',
    fontSize: 42,
    fontWeight: '900',
    textAlign: 'center',
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
    marginTop: 12,
    minHeight: 56,
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
    marginTop: 16,
    padding: 16,
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
    paddingVertical: 14,
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
    marginTop: 10,
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
    marginTop: 6,
  },
  signupVerifyMascot: {
    alignSelf: 'center',
    height: 90,
    marginBottom: 12,
    width: 90,
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
  readyHeroPanel: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
  },
  readyHeroMascotWrap: {
    height: 118,
    position: 'relative',
    width: 118,
  },
  readyHeroMascot: {
    height: 112,
    width: 112,
  },
  readyHeroTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 6,
    textAlign: 'center',
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
  childGradeChip: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    marginRight: 8,
    minHeight: 48,
    minWidth: 86,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 148,
    minHeight: 34,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  subjectChipCore: {
    backgroundColor: ONBOARDING_COLORS.accentLight,
    borderColor: ONBOARDING_COLORS.accent,
  },
  subjectChipCompact: {
    maxWidth: 132,
    minHeight: 30,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  subjectChipDisabled: {
    opacity: 0.45,
  },
  subjectChipText: {
    color: ONBOARDING_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
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
  countyList: {
    marginBottom: 2,
    maxHeight: 42,
  },
  countyChip: {
    backgroundColor: ONBOARDING_COLORS.white,
    borderColor: ONBOARDING_COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    maxWidth: 150,
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  countyChipCompact: {
    maxWidth: 132,
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  schoolList: {
    marginTop: 8,
    maxHeight: 104,
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
  whatsAppLink: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 14,
  },
  errorText: {
    color: ONBOARDING_COLORS.danger,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
  },
  footerRowCompact: {
    marginTop: 0,
    paddingTop: 0,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: ONBOARDING_COLORS.border,
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 54,
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
    borderRadius: 18,
    elevation: 4,
    flex: 1,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 12,
    shadowColor: ONBOARDING_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  primaryButtonCompact: {
    minHeight: 44,
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
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 20,
    textAlign: 'center',
  },
});
