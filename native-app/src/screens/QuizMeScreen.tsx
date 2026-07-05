import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Brain,
  Check,
  ChevronDown,
  ClipboardList,
  Mic,
  Sparkles,
} from 'lucide-react-native';

import { OnboardingMascotKey, QuizConfig } from '../types/app';

const sunguraRabbitMascot = require('../assets/mascot/sungura-rabbit.png');
const simbaLionMascot = require('../assets/mascot/simba-lion.png');
const ndovuElephantMascot = require('../assets/mascot/ndovu-elephant.png');

type QuizMascotTheme = {
  source: ImageSourcePropType;
  label: string;
  accent: string;
  soft: string;
};

const QUIZ_MASCOTS: Record<OnboardingMascotKey, QuizMascotTheme> = {
  lion: {
    source: simbaLionMascot,
    label: 'Rafiki the Lion',
    accent: '#D97706',
    soft: '#FEF3C7',
  },
  rabbit: {
    source: sunguraRabbitMascot,
    label: 'Rafiki the Rabbit',
    accent: '#0E9F6E',
    soft: '#DCFCE7',
  },
  elephant: {
    source: ndovuElephantMascot,
    label: 'Rafiki the Elephant',
    accent: '#2563EB',
    soft: '#DBEAFE',
  },
};

const quizBuildSteps = [
  'Reading your topic',
  'Picking questions',
  'Balancing difficulty',
  'Polishing QuizMe',
];
const quizBuildProgress = [22, 48, 74, 92];

interface QuizMeScreenProps {
  isLoading: boolean;
  error?: string | null;
  strandsBySubject: Record<string, string[]>;
  subStrandsByStrand: Record<string, string[]>;
  mascotKey?: OnboardingMascotKey;
  onBack: () => void;
  onGenerate: (config: QuizConfig) => void;
}

const defaultSubjects = ['Science', 'English', 'Math', 'Kiswahili', 'Social Studies'];
const questionCounts = [5, 10, 15, 20];

export function QuizMeScreen({
  isLoading,
  error,
  strandsBySubject,
  subStrandsByStrand,
  mascotKey = 'rabbit',
  onBack,
  onGenerate,
}: QuizMeScreenProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [openField, setOpenField] = useState<string | null>(null);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const mascotMotion = useRef(new Animated.Value(0)).current;
  const [config, setConfig] = useState<QuizConfig>({
    subject: '',
    strand: '',
    subStrand: '',
    questionCount: 10,
    format: 'flashcards',
  });

  const isValidStep1 = !!(config.subject && config.strand && config.subStrand);
  const subjectOptions = useMemo(() => {
    const loadedSubjects = Object.entries(strandsBySubject)
      .filter(([, strands]) => strands.length > 0)
      .map(([subject]) => subject);

    return loadedSubjects.length > 0 ? loadedSubjects : defaultSubjects;
  }, [strandsBySubject]);
  const strands = useMemo(
    () => strandsBySubject[config.subject] || [],
    [config.subject, strandsBySubject],
  );
  const subStrands = useMemo(
    () => subStrandsByStrand[config.strand] || [],
    [config.strand, subStrandsByStrand],
  );
  const mascot = QUIZ_MASCOTS[mascotKey] ?? QUIZ_MASCOTS.rabbit;
  const loadingProgress = quizBuildProgress[loadingStepIndex] ?? 92;
  const mascotMotionStyle = useMemo<Animated.WithAnimatedObject<ViewStyle>>(
    () => ({
      transform: [
        {
          translateY: mascotMotion.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, -8, 0],
          }),
        },
      ],
    }),
    [mascotMotion],
  );

  useEffect(() => {
    if (!isLoading) {
      setLoadingStepIndex(0);
      mascotMotion.stopAnimation();
      mascotMotion.setValue(0);
      return;
    }

    const stepTimer = setInterval(() => {
      setLoadingStepIndex(current => Math.min(current + 1, quizBuildSteps.length - 1));
    }, 1100);
    const mascotLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(mascotMotion, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(mascotMotion, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    mascotLoop.start();

    return () => {
      clearInterval(stepTimer);
      mascotLoop.stop();
    };
  }, [isLoading, mascotMotion]);

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <LinearGradient
          colors={['#FFF7ED', '#EEF2FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.loadingCard}>
          <View style={styles.loadingBrandRow}>
            <View style={styles.loadingBrandMark}>
              <Text style={styles.loadingBrandMarkText}>K</Text>
            </View>
            <Text style={styles.loadingBrandText}>
              KITABU<Text style={styles.loadingBrandAi}>.AI</Text>
            </Text>
          </View>

          <View style={styles.loadingHeroRow}>
            <View style={styles.loadingCopy}>
              <View style={[styles.loadingPill, { borderColor: mascot.accent }]}>
                <Sparkles size={14} color={mascot.accent} strokeWidth={2.4} />
                <Text style={[styles.loadingPillText, { color: mascot.accent }]}>
                  QuizMe
                </Text>
              </View>
              <Text style={styles.loadingTitle}>Building your quiz</Text>
              <Text style={styles.loadingBody}>{quizBuildSteps[loadingStepIndex]}</Text>
            </View>

            <Animated.View
              accessibilityLabel={`${mascot.label} preparing quiz`}
              style={[
                styles.loadingMascotWrap,
                { backgroundColor: mascot.soft, borderColor: `${mascot.accent}44` },
                mascotMotionStyle,
              ]}>
              <Image source={mascot.source} style={styles.loadingMascot} />
            </Animated.View>
          </View>

          <View
            accessibilityLabel="Quiz generation progress"
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: 100,
              now: loadingProgress,
              text: `${loadingProgress}% complete`,
            }}
            style={styles.loadingProgressTrack}>
            <View
              style={[
                styles.loadingProgressFill,
                {
                  width: `${loadingProgress}%`,
                  backgroundColor: mascot.accent,
                },
              ]}
            />
          </View>

          <View style={styles.loadingSteps}>
            {quizBuildSteps.map((item, index) => {
              const active = index <= loadingStepIndex;
              return (
                <View key={item} style={styles.loadingStep}>
                  <View
                    style={[
                      styles.loadingStepDot,
                      active && { backgroundColor: mascot.accent },
                    ]}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.loadingStepText,
                      active && { color: '#111827' },
                    ]}>
                    {item}
                  </Text>
                </View>
              );
            })}
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.backOverlay}>
        <Pressable
          onPress={step === 1 ? onBack : () => setStep(1)}
          style={styles.backButton}>
          <ArrowLeft size={24} color="#374151" strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {step === 1 ? (
          <View style={styles.maxWrap}>
            <View style={styles.intro}>
              <Text style={styles.sectionTitle}>Choose Your Topic</Text>
              <Text style={styles.sectionBody}>
                Select subject, strand, and sub-strand for personalized learning
              </Text>
            </View>

            <View style={styles.formCard}>
              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Field
                fieldKey="subject"
                label="Subject"
                value={config.subject || 'Select a subject'}
                options={subjectOptions}
                onSelect={subject =>
                  setConfig(current => ({
                    ...current,
                    subject,
                    strand: '',
                    subStrand: '',
                  }))
                }
                activeValue={config.subject}
                isOpen={openField === 'subject'}
                onToggle={fieldKey =>
                  setOpenField(current => (current === fieldKey ? null : fieldKey))
                }
              />

              <Field
                fieldKey="strand"
                label="Strand"
                value={config.strand || 'Select a strand'}
                options={strands}
                onSelect={strand =>
                  setConfig(current => ({
                    ...current,
                    strand,
                    subStrand: '',
                  }))
                }
                activeValue={config.strand}
                disabled={!config.subject}
                isOpen={openField === 'strand'}
                onToggle={fieldKey =>
                  setOpenField(current => (current === fieldKey ? null : fieldKey))
                }
              />

              <Field
                fieldKey="sub-strand"
                label="Sub-strand"
                value={config.subStrand || 'Select a sub-strand'}
                options={subStrands}
                onSelect={subStrand =>
                  setConfig(current => ({
                    ...current,
                    subStrand,
                  }))
                }
                activeValue={config.subStrand}
                disabled={!config.strand}
                isOpen={openField === 'sub-strand'}
                onToggle={fieldKey =>
                  setOpenField(current => (current === fieldKey ? null : fieldKey))
                }
              />

              <Field
                fieldKey="question-count"
                label="Number of Questions"
                value={`${config.questionCount} Questions`}
                options={questionCounts.map(count => `${count}`)}
                onSelect={count =>
                  setConfig(current => ({
                    ...current,
                    questionCount: Number(count),
                  }))
                }
                activeValue={`${config.questionCount}`}
                isOpen={openField === 'question-count'}
                onToggle={fieldKey =>
                  setOpenField(current => (current === fieldKey ? null : fieldKey))
                }
              />

              <Pressable
                disabled={!isValidStep1}
                onPress={() => setStep(2)}
                style={[
                  styles.nextButton,
                  !isValidStep1 && styles.nextButtonDisabled,
                ]}>
                <Text
                  style={[
                    styles.nextButtonText,
                    !isValidStep1 && styles.nextButtonTextDisabled,
                  ]}>
                  Next
                </Text>
              </Pressable>
              {config.subject && strands.length === 0 ? (
                <Text style={styles.emptyHelper}>
                  No curriculum strands are available for this subject yet.
                </Text>
              ) : null}
              {config.strand && subStrands.length === 0 ? (
                <Text style={styles.emptyHelper}>
                  No sub-strands are available for this strand yet.
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.maxWrap}>
            <View style={styles.intro}>
              <Text style={styles.sectionTitle}>Choose Format</Text>
              <Text style={styles.sectionBody}>
                How would you like to practice today?
              </Text>
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.formatGrid}>
              <FormatOption
                title="Flashcards"
                body="Learn concepts by flipping cards"
                icon={<Brain size={24} color={config.format === 'flashcards' ? '#FFFFFF' : '#6B7280'} />}
                color="#7C3AED"
                mutedColor="#F3F4F6"
                active={config.format === 'flashcards'}
                onPress={() =>
                  setConfig(current => ({ ...current, format: 'flashcards' }))
                }
              />

              <FormatOption
                title="Quiz Format"
                body="Standard multiple choice quiz"
                icon={<ClipboardList size={24} color={config.format === 'quiz' ? '#FFFFFF' : '#6B7280'} />}
                color="#2563EB"
                mutedColor="#F3F4F6"
                active={config.format === 'quiz'}
                onPress={() =>
                  setConfig(current => ({ ...current, format: 'quiz' }))
                }
              />

              <FormatOption
                title="Live Audio Quiz"
                body="Interactive voice-based quiz"
                icon={<Mic size={24} color={config.format === 'audio' ? '#FFFFFF' : '#6B7280'} />}
                color="#F59E0B"
                mutedColor="#F3F4F6"
                active={config.format === 'audio'}
                onPress={() =>
                  setConfig(current => ({ ...current, format: 'audio' }))
                }
              />
            </View>

            <Pressable onPress={() => onGenerate(config)} style={styles.generateButton}>
              <Sparkles size={18} color="#FFFFFF" />
              <Text style={styles.generateButtonText}>Generate</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Field({
  fieldKey,
  label,
  value,
  options,
  activeValue,
  disabled = false,
  isOpen = false,
  onSelect,
  onToggle,
}: {
  fieldKey: string;
  label: string;
  value: string;
  options: string[];
  activeValue?: string;
  disabled?: boolean;
  isOpen?: boolean;
  onSelect: (value: string) => void;
  onToggle: (fieldKey: string) => void;
}) {
  const hasOptions = options.length > 0;

  return (
    <View style={[styles.fieldWrap, isOpen && styles.fieldWrapOpen]}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <Pressable
        disabled={disabled || !hasOptions}
        onPress={() => onToggle(fieldKey)}
        style={[
          styles.selectBox,
          disabled && styles.selectBoxDisabled,
          !disabled && hasOptions && isOpen && styles.selectBoxOpen,
        ]}>
        <Text style={[styles.selectValue, disabled && styles.selectValueDisabled]}>
          {value}
        </Text>
        <ChevronDown
          size={18}
          color="#6B7280"
          strokeWidth={2.2}
          style={isOpen ? styles.chevronOpen : undefined}
        />
      </Pressable>

      {isOpen && !disabled && hasOptions ? (
        <View style={styles.dropdownMenu}>
          {options.map(option => {
            const active = activeValue === option;
            return (
              <Pressable
                key={option}
                onPress={() => {
                  onSelect(option);
                  onToggle(fieldKey);
                }}
                style={[
                  styles.dropdownOption,
                  active && styles.dropdownOptionActive,
                ]}>
                <Text
                  style={[
                    styles.dropdownOptionText,
                    active && styles.dropdownOptionTextActive,
                  ]}>
                  {label === 'Number of Questions' ? `${option} Questions` : option}
                </Text>
                {active ? <Check size={16} color="#7C3AED" strokeWidth={2.4} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function FormatOption({
  title,
  body,
  icon,
  color,
  mutedColor,
  active,
  onPress,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
  color: string;
  mutedColor: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.formatCard,
        active && {
          borderColor: color,
          backgroundColor: `${color}10`,
          shadowColor: color,
        },
      ]}>
      <View
        style={[
          styles.formatIconWrap,
          { backgroundColor: active ? color : mutedColor },
        ]}>
        {icon}
      </View>

      <View style={styles.formatTextWrap}>
        <Text style={[styles.formatTitle, active && { color }]}>{title}</Text>
        <Text style={styles.formatBody}>{body}</Text>
      </View>

      {active ? <Check size={22} color={color} strokeWidth={2.4} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 356,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.26)',
    padding: 18,
    shadowColor: '#1F2937',
    shadowOpacity: 0.11,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  loadingBrandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    marginBottom: 18,
  },
  loadingBrandMark: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(37,99,235,0.16)',
    borderRadius: 12,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  loadingBrandMarkText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '900',
  },
  loadingBrandText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  loadingBrandAi: {
    color: '#DC2626',
  },
  loadingHeroRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    marginBottom: 18,
  },
  loadingCopy: {
    flex: 1,
    minWidth: 0,
  },
  loadingPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  loadingTitle: {
    color: '#111827',
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 30,
    marginBottom: 6,
  },
  loadingBody: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '800',
  },
  loadingPillText: {
    fontSize: 12,
    fontWeight: '900',
  },
  loadingMascotWrap: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    height: 104,
    justifyContent: 'center',
    width: 104,
  },
  loadingMascot: {
    height: 88,
    resizeMode: 'contain',
    width: 88,
  },
  loadingProgressTrack: {
    backgroundColor: 'rgba(15,23,42,0.1)',
    borderRadius: 999,
    height: 10,
    overflow: 'hidden',
  },
  loadingProgressFill: {
    borderRadius: 999,
    height: '100%',
  },
  loadingSteps: {
    gap: 9,
    marginTop: 16,
  },
  loadingStep: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  loadingStepDot: {
    backgroundColor: '#CBD5E1',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  loadingStepText: {
    color: '#64748B',
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
  },
  backOverlay: {
    position: 'absolute',
    top: 14,
    left: 16,
    zIndex: 3,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#7C3AED',
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  maxWrap: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
  },
  intro: {
    alignItems: 'center',
    marginBottom: 28,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionBody: {
    color: '#6B7280',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    paddingHorizontal: 12,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 24,
    gap: 18,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  fieldWrap: {
    gap: 8,
  },
  fieldWrapOpen: {
    elevation: 20,
    zIndex: 20,
  },
  fieldLabel: {
    marginLeft: 4,
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  selectBox: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    minHeight: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectBoxDisabled: {
    opacity: 0.5,
  },
  selectBoxOpen: {
    borderColor: '#7C3AED',
  },
  selectValue: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  selectValueDisabled: {
    color: '#94A3B8',
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    overflow: 'hidden',
  },
  dropdownOption: {
    minHeight: 50,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dropdownOptionActive: {
    backgroundColor: '#F5F3FF',
  },
  dropdownOptionText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownOptionTextActive: {
    color: '#7C3AED',
  },
  nextButton: {
    marginTop: 8,
    backgroundColor: '#FB923C',
    borderRadius: 14,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FB923C',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  nextButtonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  nextButtonTextDisabled: {
    color: '#9CA3AF',
  },
  emptyHelper: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
  },
  formatGrid: {
    gap: 16,
    marginBottom: 28,
  },
  formatCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowOpacity: 0,
  },
  formatIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatTextWrap: {
    flex: 1,
  },
  formatTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  formatBody: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  generateButton: {
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});
