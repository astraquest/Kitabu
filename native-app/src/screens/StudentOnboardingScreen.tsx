import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { DEFAULT_GRADE, SUPPORTED_GRADES } from '../constants/grades';
import { triggerHaptic } from '../services/haptics';
import { GenderOption, SchoolData } from '../types/app';

const WHATSAPP_ADMIN_LINK = 'https://wa.me/254716175485?text=I%20need%20help';

interface StudentOnboardingScreenProps {
  schools: SchoolData[];
  isSubmitting: boolean;
  error?: string | null;
  onSubmit: (input: {
    gender: GenderOption;
    grade: string;
    schoolId: string;
    mpesaPhoneNumber?: string | null;
  }) => void;
}

export function StudentOnboardingScreen({
  schools,
  isSubmitting,
  error,
  onSubmit,
}: StudentOnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState<GenderOption>('not_specified');
  const [grade, setGrade] = useState(DEFAULT_GRADE);
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState('');

  const filteredSchools = useMemo(
    () =>
      schools.filter(school =>
        school.name.toLowerCase().includes(schoolQuery.trim().toLowerCase()),
      ),
    [schoolQuery, schools],
  );

  const canContinue =
    step === 0 ? Boolean(grade) : step === 1 ? Boolean(schoolId) : true;

  function handleContinue() {
    if (!canContinue) {
      triggerHaptic('error');
      return;
    }

    if (step < 2) {
      triggerHaptic('impact');
      setStep(current => current + 1);
      return;
    }

    triggerHaptic('success');
    onSubmit({
      gender,
      grade,
      schoolId,
      mpesaPhoneNumber: mpesaPhoneNumber.trim() || null,
    });
  }

  return (
    <LinearGradient
      colors={['#fff7ed', '#fef3c7', '#dcfce7']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Student setup</Text>
        <Text style={styles.title}>Let&apos;s make Kitabu feel like your space 🎉</Text>
        <Text style={styles.body}>
          Just a few quick steps so checkout and learning feel smoother.
        </Text>
      </View>

      <View style={styles.progressRow}>
        {[0, 1, 2].map(index => (
          <View
            key={index}
            style={[styles.progressDot, index <= step && styles.progressDotActive]}
          />
        ))}
      </View>

      <View style={styles.card}>
        {step === 0 ? (
          <>
            <Text style={styles.stepEmoji}>🪄</Text>
            <Text style={styles.stepTitle}>A tiny bit about you</Text>
            <Text style={styles.stepText}>Pick your vibe and class so your learning path feels right.</Text>

            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.choiceRow}>
              {[
                { label: 'Girl 🌸', value: 'female' as const },
                { label: 'Boy ⚡', value: 'male' as const },
                { label: 'Skip 🙂', value: 'not_specified' as const },
              ].map(option => (
                <Pressable
                  key={option.value}
                  onPress={() => setGender(option.value)}
                  style={[
                    styles.choiceChip,
                    gender === option.value && styles.choiceChipActive,
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

            <Text style={styles.fieldLabel}>Grade</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.choiceRow}>
                {SUPPORTED_GRADES.map(option => (
                  <Pressable
                    key={option}
                    onPress={() => setGrade(option)}
                    style={[
                      styles.choiceChip,
                      grade === option && styles.choiceChipActive,
                    ]}>
                    <Text
                      style={[
                        styles.choiceChipText,
                        grade === option && styles.choiceChipTextActive,
                      ]}>
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Text style={styles.stepEmoji}>🏫</Text>
            <Text style={styles.stepTitle}>Choose your school</Text>
            <Text style={styles.stepText}>This helps us match the right package and learning setup.</Text>

            <TextInput
              value={schoolQuery}
              onChangeText={setSchoolQuery}
              placeholder="Search your school"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />

            <ScrollView style={styles.schoolList} showsVerticalScrollIndicator={false}>
              {filteredSchools.map(school => {
                const selected = schoolId === school.id;
                return (
                  <Pressable
                    key={school.id}
                    onPress={() => setSchoolId(school.id)}
                    style={[styles.schoolOption, selected && styles.schoolOptionActive]}>
                    <Text style={styles.schoolName}>{school.name}</Text>
                    <Text style={styles.schoolMeta}>{school.location}</Text>
                  </Pressable>
                );
              })}
              {filteredSchools.length === 0 ? (
                <Text style={styles.emptyText}>No match yet. You can ask admin to add your school.</Text>
              ) : null}
            </ScrollView>

            <Pressable onPress={() => Linking.openURL(WHATSAPP_ADMIN_LINK)}>
              <Text style={styles.whatsAppLink}>
                School missing? Request it on WhatsApp: 0716175485
              </Text>
            </Pressable>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={styles.stepEmoji}>📱</Text>
            <Text style={styles.stepTitle}>Optional M-Pesa shortcut</Text>
            <Text style={styles.stepText}>Add your number now for faster checkout later. Totally optional 😄</Text>

            <Text style={styles.fieldLabel}>M-Pesa number</Text>
            <TextInput
              value={mpesaPhoneNumber}
              onChangeText={setMpesaPhoneNumber}
              keyboardType="phone-pad"
              placeholder="2547XXXXXXXX"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
          </>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.footerRow}>
          {step > 0 ? (
            <Pressable onPress={() => setStep(current => current - 1)} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Back</Text>
            </Pressable>
          ) : (
            <View style={styles.secondarySpacer} />
          )}

          <Pressable
            disabled={!canContinue || isSubmitting}
            onPress={handleContinue}
            style={[styles.primaryButton, (!canContinue || isSubmitting) && styles.primaryButtonDisabled]}>
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>{step === 2 ? 'Finish setup' : 'Continue'}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
  },
  header: {
    gap: 8,
  },
  eyebrow: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: '#0f172a',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  body: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  progressDot: {
    backgroundColor: 'rgba(148,163,184,0.35)',
    borderRadius: 999,
    flex: 1,
    height: 8,
  },
  progressDotActive: {
    backgroundColor: '#16a34a',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 30,
    flex: 1,
    marginTop: 16,
    padding: 20,
  },
  stepEmoji: {
    fontSize: 40,
  },
  stepTitle: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 10,
  },
  stepText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  fieldLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 8,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  choiceChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#e2e8f0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  choiceChipActive: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  choiceChipText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  choiceChipTextActive: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#dbeafe',
    borderRadius: 16,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  schoolList: {
    marginTop: 12,
    maxHeight: 280,
  },
  schoolOption: {
    backgroundColor: '#FFFFFF',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  schoolOptionActive: {
    borderColor: '#0f766e',
    borderWidth: 2,
  },
  schoolName: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  schoolMeta: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },
  emptyText: {
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
  },
  whatsAppLink: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 14,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
    paddingTop: 16,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 54,
    width: 110,
  },
  secondarySpacer: {
    width: 110,
  },
  secondaryText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '800',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#f97316',
    borderRadius: 18,
    flex: 1,
    justifyContent: 'center',
    minHeight: 54,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});
