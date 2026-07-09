import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Flag, X } from 'lucide-react-native';

import { ContentReportReason, reportContent } from '../services/moderationService';

type ReportTone = 'light' | 'dark';

type ReasonOption = {
  label: string;
  value: ContentReportReason;
};

const REASON_OPTIONS: ReasonOption[] = [
  { label: 'Unsafe learning advice', value: 'unsafe_ai_content' },
  { label: 'Sexual or profane', value: 'abuse' },
  { label: 'Hate or harassment', value: 'abuse' },
  { label: 'Violence or self-harm', value: 'unsafe_ai_content' },
  { label: 'Child safety concern', value: 'unsafe_ai_content' },
  { label: 'Deceptive or dishonest', value: 'inaccurate' },
  { label: 'Other', value: 'other' },
];

interface ReportAiContentSheetProps {
  source: string;
  contentText: string;
  context?: Record<string, unknown>;
  buttonLabel?: string;
  reportedLabel?: string;
  title?: string;
  accessibilityLabel?: string;
  tone?: ReportTone;
}

export function ReportAiContentSheet({
  source,
  contentText,
  context,
  buttonLabel = 'Report',
  reportedLabel = 'Reported',
  title = 'Report AI content',
  accessibilityLabel = 'Report AI content',
  tone = 'light',
}: ReportAiContentSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReasonOption>(REASON_OPTIONS[0]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmedContent = contentText.trim();

  const buttonStyles = useMemo(
    () => [
      styles.reportButton,
      tone === 'dark' ? styles.reportButtonDark : styles.reportButtonLight,
      isSubmitted && styles.reportButtonSubmitted,
      (!trimmedContent || isSubmitting) && styles.reportButtonDisabled,
    ],
    [isSubmitted, isSubmitting, tone, trimmedContent],
  );

  async function submitReport() {
    if (!trimmedContent || isSubmitting || isSubmitted) {
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await reportContent({
        source,
        reason: selectedReason.value,
        contentText: trimmedContent,
        context: {
          ...context,
          reportReasonLabel: selectedReason.label,
          reportNote: note.trim() || null,
        },
      });
      setIsSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit this report.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Pressable
        accessibilityLabel={isSubmitted ? `${accessibilityLabel} submitted` : accessibilityLabel}
        disabled={!trimmedContent || isSubmitting || isSubmitted}
        onPress={() => setIsOpen(true)}
        style={buttonStyles}>
        <Flag color={isSubmitted ? '#16A34A' : tone === 'dark' ? '#DBEAFE' : '#64748B'} size={13} strokeWidth={2.4} />
        <Text
          style={[
            styles.reportButtonText,
            tone === 'dark' && styles.reportButtonTextDark,
            isSubmitted && styles.reportButtonTextSubmitted,
          ]}>
          {isSubmitted ? reportedLabel : buttonLabel}
        </Text>
      </Pressable>

      <Modal
        animationType="fade"
        transparent
        visible={isOpen}
        onRequestClose={() => setIsOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{isSubmitted ? 'Report submitted' : title}</Text>
                <Text style={styles.sheetSubtitle}>
                  {isSubmitted
                    ? 'Thanks. Our team will review this report.'
                    : 'Choose what looks wrong. A short note is optional.'}
                </Text>
              </View>
              <Pressable accessibilityLabel="Close report sheet" onPress={() => setIsOpen(false)} style={styles.closeButton}>
                <X color="#64748B" size={18} strokeWidth={2.4} />
              </Pressable>
            </View>

            {isSubmitted ? (
              <View style={styles.confirmationBox}>
                <Flag color="#16A34A" size={20} strokeWidth={2.4} />
                <Text style={styles.confirmationText}>Thanks. Our team will review this report.</Text>
              </View>
            ) : (
              <>
                <View style={styles.reasonGrid}>
                  {REASON_OPTIONS.map(option => {
                    const selected = selectedReason.label === option.label;
                    return (
                      <Pressable
                        key={option.label}
                        onPress={() => setSelectedReason(option)}
                        style={[styles.reasonChip, selected && styles.reasonChipSelected]}>
                        <Text style={[styles.reasonText, selected && styles.reasonTextSelected]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <TextInput
                  multiline
                  maxLength={1000}
                  onChangeText={setNote}
                  placeholder="Optional note"
                  placeholderTextColor="#94A3B8"
                  style={styles.noteInput}
                  value={note}
                />

                <ScrollView style={styles.preview} contentContainerStyle={styles.previewContent}>
                  <Text style={styles.previewText} numberOfLines={6}>{trimmedContent}</Text>
                </ScrollView>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Pressable disabled={isSubmitting} onPress={submitReport} style={styles.submitButton}>
                  {isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
                  <Text style={styles.submitText}>{isSubmitting ? 'Submitting...' : 'Submit report'}</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  reportButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reportButtonLight: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderColor: 'rgba(148,163,184,0.34)',
  },
  reportButtonDark: {
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderColor: 'rgba(219,234,254,0.28)',
  },
  reportButtonSubmitted: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  reportButtonDisabled: {
    opacity: 0.72,
  },
  reportButtonText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '900',
  },
  reportButtonTextDark: {
    color: '#DBEAFE',
  },
  reportButtonTextSubmitted: {
    color: '#15803D',
  },
  overlay: {
    backgroundColor: 'rgba(15,23,42,0.42)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: 14,
  },
  sheet: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderColor: 'rgba(255,255,255,0.72)',
    borderRadius: 22,
    borderWidth: 1,
    maxHeight: '82%',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.24,
    shadowRadius: 40,
  },
  sheetHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  sheetTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
  },
  sheetSubtitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 4,
    maxWidth: 270,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(241,245,249,0.92)',
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  reasonChip: {
    backgroundColor: 'rgba(248,250,252,0.96)',
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  reasonChipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  reasonText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '800',
  },
  reasonTextSelected: {
    color: '#1D4ED8',
  },
  noteInput: {
    backgroundColor: 'rgba(248,250,252,0.96)',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 14,
    minHeight: 82,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  preview: {
    backgroundColor: 'rgba(241,245,249,0.8)',
    borderRadius: 14,
    marginTop: 12,
    maxHeight: 112,
  },
  previewContent: {
    padding: 12,
  },
  previewText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 10,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 15,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 48,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  confirmationBox: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    padding: 14,
  },
  confirmationText: {
    color: '#15803D',
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
});
