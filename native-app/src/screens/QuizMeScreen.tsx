import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  ArrowLeft,
  Brain,
  Check,
  ChevronDown,
  ClipboardList,
  Mic,
  Sparkles,
} from 'lucide-react-native';

import { QuizConfig } from '../types/app';

interface QuizMeScreenProps {
  isLoading: boolean;
  strandsBySubject: Record<string, string[]>;
  subStrandsByStrand: Record<string, string[]>;
  onBack: () => void;
  onGenerate: (config: QuizConfig) => void;
}

const fallbackSubjects = ['Science', 'English', 'Math', 'Kiswahili', 'Social Studies'];
const questionCounts = [5, 10, 15, 20];

export function QuizMeScreen({
  isLoading,
  strandsBySubject,
  subStrandsByStrand,
  onBack,
  onGenerate,
}: QuizMeScreenProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [openField, setOpenField] = useState<string | null>(null);
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

    return loadedSubjects.length > 0 ? loadedSubjects : fallbackSubjects;
  }, [strandsBySubject]);
  const strands = useMemo(
    () => strandsBySubject[config.subject] || [],
    [config.subject, strandsBySubject],
  );
  const subStrands = useMemo(
    () => subStrandsByStrand[config.strand] || [],
    [config.strand, subStrandsByStrand],
  );

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <View style={styles.loadingOrbWrap}>
          <View style={styles.loadingOrbPulse} />
          <LinearGradient
            colors={['#A855F7', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.loadingOrb}>
            <Sparkles size={36} color="#FFFFFF" strokeWidth={2.2} />
          </LinearGradient>
        </View>
        <Text style={styles.loadingTitle}>Generating your Quiz...</Text>
        <Text style={styles.loadingBody}>Consulting the AI Tutor</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={step === 1 ? onBack : () => setStep(1)}
          style={styles.backButton}>
          <ArrowLeft size={24} color="#374151" strokeWidth={2.2} />
        </Pressable>

        <View style={styles.brandWrap}>
          <LinearGradient
            colors={['#FB923C', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>QM</Text>
          </LinearGradient>
          <Text style={styles.brandTitle}>QuizMe</Text>
        </View>
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingOrbWrap: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingOrbPulse: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(168,85,247,0.2)',
  },
  loadingOrb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A855F7',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  loadingTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  loadingBody: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
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
