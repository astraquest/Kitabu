import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CalendarClock, Plus, Sparkles } from 'lucide-react-native';

const DUE_DATE_CHOICES: Array<{ days: number; label: string }> = [
  { days: 1, label: 'Tomorrow' },
  { days: 3, label: 'In 3 days' },
  { days: 7, label: 'In 1 week' },
  { days: 14, label: 'In 2 weeks' },
];

function dueDatePreview(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toLocaleDateString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

import { Assignment } from '../../types/app';
import { TeacherInlineSelect } from './TeacherInlineSelect';
import { TeacherSpinner } from './TeacherSpinner';

interface TeacherAssignmentWizardSectionProps {
  styles: Record<string, any>;
  step: 1 | 2;
  closeWizard: () => void;
  isGenerating: boolean;
  isSending: boolean;
  gradeOptions: readonly string[];
  grade: string;
  subject: string;
  strand: string;
  subStrand: string;
  topic: string;
  wizardGradeOpen: boolean;
  wizardSubjectOpen: boolean;
  wizardStrandOpen: boolean;
  wizardSubStrandOpen: boolean;
  draft: {
    title: string;
    description: string;
    questions: Assignment['questions'];
  } | null;
  dueInDays: number;
  subjectStrands: Record<string, string[]>;
  strandSubStrands: Record<string, Record<string, string[]>>;
  onSetDueInDays: (days: number) => void;
  onSetStep: (step: 1 | 2) => void;
  onSetGrade: (value: string) => void;
  onSetSubject: (value: string) => void;
  onSetStrand: (value: string) => void;
  onSetSubStrand: (value: string) => void;
  onSetTopic: (value: string) => void;
  onToggleGradeOpen: () => void;
  onToggleSubjectOpen: () => void;
  onToggleStrandOpen: () => void;
  onToggleSubStrandOpen: () => void;
  onGenerate: () => void;
  onUpdateDraftTitle: (value: string) => void;
  onUpdateDraftDescription: (value: string) => void;
  onUpdateQuestionText: (index: number, value: string) => void;
  onUpdateOption: (questionIndex: number, optionIndex: number, value: string) => void;
  onAddOption: (questionIndex: number) => void;
  onUpdateCorrectAnswer: (questionIndex: number, value: string) => void;
  onPublish: () => void;
}

export function TeacherAssignmentWizardSection({
  styles,
  step,
  closeWizard,
  isGenerating,
  isSending,
  gradeOptions,
  grade,
  subject,
  strand,
  subStrand,
  topic,
  wizardGradeOpen,
  wizardSubjectOpen,
  wizardStrandOpen,
  wizardSubStrandOpen,
  draft,
  dueInDays,
  subjectStrands,
  strandSubStrands,
  onSetDueInDays,
  onSetStep,
  onSetGrade,
  onSetSubject,
  onSetStrand,
  onSetSubStrand,
  onSetTopic,
  onToggleGradeOpen,
  onToggleSubjectOpen,
  onToggleStrandOpen,
  onToggleSubStrandOpen,
  onGenerate,
  onUpdateDraftTitle,
  onUpdateDraftDescription,
  onUpdateQuestionText,
  onUpdateOption,
  onAddOption,
  onUpdateCorrectAnswer,
  onPublish,
}: TeacherAssignmentWizardSectionProps) {
  return (
    <View style={styles.wizardRoot}>
      <View style={styles.modalGrabber} />
      <View style={styles.wizardHead}>
        <Pressable
          onPress={closeWizard}
          disabled={isGenerating || isSending}
          style={styles.modalCloseButton}>
          <Text style={styles.cancelText}>Close</Text>
        </Pressable>

        <View style={styles.wizardHeaderCenter}>
          <Text style={styles.wizardHeaderTitle}>Set Assignment</Text>
        </View>

        {step === 2 ? (
          <Pressable
            onPress={() => onSetStep(1)}
            disabled={isGenerating || isSending}
            style={styles.regenerateButton}>
            <Text style={styles.actionText}>Regenerate</Text>
          </Pressable>
        ) : (
          <View style={styles.modalCloseButtonGhost} />
        )}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.wizardScroll}
        contentContainerStyle={styles.wizardContent}>
        {step === 1 ? (
          <View style={styles.wizardInner}>
            <View style={styles.wizardCard}>
              <View style={styles.twoCol}>
                <View style={styles.flexField}>
                  <TeacherInlineSelect
                    styles={styles}
                    label="Grade"
                    value={grade}
                    open={wizardGradeOpen}
                    options={[...gradeOptions]}
                    onToggle={onToggleGradeOpen}
                    onSelect={onSetGrade}
                  />
                </View>
                <View style={styles.flexField}>
                  <TeacherInlineSelect
                    styles={styles}
                    label="Subject"
                    value={subject}
                    open={wizardSubjectOpen}
                    options={Object.keys(subjectStrands)}
                    onToggle={onToggleSubjectOpen}
                    onSelect={onSetSubject}
                  />
                </View>
              </View>

              <TeacherInlineSelect
                styles={styles}
                label="Strand (Optional)"
                value={strand || 'All Strands'}
                open={wizardStrandOpen}
                options={['All Strands', ...(subjectStrands[subject] || [])]}
                onToggle={onToggleStrandOpen}
                onSelect={onSetStrand}
              />

              {strand && strandSubStrands[subject]?.[strand] ? (
                <TeacherInlineSelect
                  styles={styles}
                  label="Sub-strand (Optional)"
                  value={subStrand || 'All Sub-strands'}
                  open={wizardSubStrandOpen}
                  options={['All Sub-strands', ...strandSubStrands[subject][strand]]}
                  onToggle={onToggleSubStrandOpen}
                  onSelect={onSetSubStrand}
                />
              ) : null}

              <View style={styles.field}>
                <Text style={styles.metricLabel}>Topic Details</Text>
                <TextInput
                  value={topic}
                  onChangeText={onSetTopic}
                  placeholder="e.g. Focus on understanding metaphors and similes in poetry..."
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, styles.textArea]}
                  multiline
                />
              </View>
            </View>

            <Pressable
              onPress={onGenerate}
              disabled={isGenerating || !subject || !topic}
              style={[
                styles.generate,
                (!subject || !topic || isGenerating) && styles.generateDisabled,
              ]}>
              {isGenerating ? (
                <>
                  <TeacherSpinner />
                  <Text style={styles.primaryText}>Generating...</Text>
                </>
              ) : (
                <>
                  <Sparkles size={18} color="#FFF" />
                  <Text style={styles.primaryText}>Generate Assignment</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.editorStack}>
            {draft ? (
              <View style={styles.wizardCard}>
                <Text style={styles.metricLabel}>Title & Description</Text>
                <TextInput
                  value={draft.title}
                  onChangeText={onUpdateDraftTitle}
                  placeholder="Assignment Title"
                  placeholderTextColor="#9CA3AF"
                  style={styles.titleInput}
                />
                <TextInput
                  value={draft.description}
                  onChangeText={onUpdateDraftDescription}
                  placeholder="Assignment Description"
                  placeholderTextColor="#9CA3AF"
                  style={styles.descInput}
                  multiline
                />
              </View>
            ) : null}

            <View style={styles.wizardCard}>
              <View style={styles.dueDateHeader}>
                <CalendarClock size={16} color="#F97316" strokeWidth={2.4} />
                <Text style={styles.metricLabel}>Due Date</Text>
              </View>
              <View style={styles.dueDateRow}>
                {DUE_DATE_CHOICES.map(choice => {
                  const active = dueInDays === choice.days;
                  return (
                    <Pressable
                      key={choice.days}
                      accessibilityLabel={`Set due date ${choice.label}`}
                      onPress={() => onSetDueInDays(choice.days)}
                      style={[styles.dueDateChip, active && styles.dueDateChipActive]}>
                      <Text style={[styles.dueDateChipText, active && styles.dueDateChipTextActive]}>
                        {choice.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.dueDatePreview}>
                Learners must submit by {dueDatePreview(dueInDays)}.
              </Text>
            </View>

            {draft?.questions.map((question, index) => (
              <View key={question.id} style={styles.questionCard}>
                <Text style={styles.typeBadge}>{question.type}</Text>

                <View style={styles.questionHeaderBlock}>
                  <Text style={styles.questionHeaderLabel}>{`Question ${index + 1}`}</Text>
                  <TextInput
                    value={question.text}
                    onChangeText={value => onUpdateQuestionText(index, value)}
                    style={styles.questionInput}
                    multiline
                  />
                </View>

                {question.type === 'MCQ' ? (
                  <View style={styles.optionStack}>
                    <Text style={styles.optionLabel}>Options</Text>
                    {(question.options || []).map((option, optionIndex) => (
                      <View key={`${question.id}-${optionIndex}`} style={styles.optionRow}>
                        <View style={styles.optionDot} />
                        <TextInput
                          value={option}
                          onChangeText={value => onUpdateOption(index, optionIndex, value)}
                          style={styles.optionInput}
                        />
                      </View>
                    ))}
                    <Pressable onPress={() => onAddOption(index)} style={styles.addOptionButton}>
                      <Plus size={14} color="#F97316" />
                      <Text style={styles.addOptionText}>Add Option</Text>
                    </Pressable>
                  </View>
                ) : null}

                <View style={styles.answerKeyCard}>
                  <Text style={styles.answerKeyLabel}>Answer Key</Text>
                  <TextInput
                    value={String(question.correctAnswer ?? '')}
                    onChangeText={value => onUpdateCorrectAnswer(index, value)}
                    style={styles.answerKeyInput}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {step === 2 ? (
        <View style={styles.publishBar}>
          <Pressable
            onPress={onPublish}
            disabled={isSending}
            style={[styles.generate, styles.publishButton, isSending && styles.generateDisabled]}>
            {isSending ? (
              <>
                <TeacherSpinner />
                <Text style={styles.primaryText}>Publishing...</Text>
              </>
            ) : (
              <Text style={styles.primaryText}>Publish to Students</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
