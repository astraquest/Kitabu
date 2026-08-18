import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Info, Mic, RotateCcw, Square, X } from 'lucide-react-native';

import { ReportAiContentSheet } from '../components/ReportAiContentSheet';
import { AssessmentNarrationControls } from '../components/AssessmentNarrationControls';
import { DEFAULT_GRADE } from '../constants/grades';
import { askHomeworkHelper } from '../services/aiService';
import { audioRecordingBridge } from '../services/nativeBridges';
import { buildQuestionCue, useGuidedNarration } from '../services/narrationService';
import { Assignment, OnboardingVoiceName } from '../types/app';

interface HomeworkQuizScreenProps {
  assignment: Assignment;
  voiceName?: OnboardingVoiceName;
  onClose: () => void;
  onSubmit: (score: number, answers: Record<number, string>) => void;
}

type QuizStatus = 'active' | 'scored' | 'review';

export function HomeworkQuizScreen({
  assignment,
  voiceName,
  onClose,
  onSubmit,
}: HomeworkQuizScreenProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    assignment.questions.forEach((question, index) => {
      if (question.userAnswer) {
        initial[index] = question.userAnswer;
      }
    });
    return initial;
  });
  const [status, setStatus] = useState<QuizStatus>(
    assignment.status === 'completed' ? 'review' : 'active',
  );
  const [score, setScore] = useState(assignment.score || 0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [rushWarning, setRushWarning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isStartingRecording, setIsStartingRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [recordedAudioPath, setRecordedAudioPath] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const startRecordingPendingRef = useRef(false);
  const screenMountedRef = useRef(true);
  const [explanationModal, setExplanationModal] = useState<{
    isOpen: boolean;
    isLoading: boolean;
    text: string;
  } | null>(null);

  const currentQuestion = assignment.questions[currentQuestionIndex];
  const totalQuestions = assignment.questions.length;
  const narrationCue = currentQuestion
    ? buildQuestionCue({
        screen: 'homework-quiz',
        questionId: currentQuestion.id,
        questionText: currentQuestion.text,
        voiceName,
      })
    : null;
  useGuidedNarration(narrationCue, status === 'active');

  useEffect(() => {
    if (assignment.status === 'completed') {
      setStatus('review');
      setScore(assignment.score || 0);
    }
  }, [assignment]);

  useEffect(() => {
    setQuestionStartTime(Date.now());
    setRushWarning(false);
    setIsRecording(false);
    setIsTranscribing(false);
    setTimeLeft(10);
    setRecordedAudioPath(null);
    setVoiceError(null);
  }, [currentQuestionIndex]);

  useEffect(() => {
    return () => {
      screenMountedRef.current = false;
      Promise.resolve(audioRecordingBridge.stopRecording()).catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (!rushWarning) {
      return undefined;
    }

    const timer = setTimeout(() => setRushWarning(false), 2500);
    return () => clearTimeout(timer);
  }, [rushWarning]);

  useEffect(() => {
    if (!isRecording) {
      return undefined;
    }

    const timer = setInterval(() => {
      setTimeLeft(current => {
        if (current <= 1) {
          audioRecordingBridge
            .stopRecording()
            .then(path => {
              if (!path) {
                throw new Error('Recorder did not return an audio file');
              }
              setRecordedAudioPath(path);
              setIsRecording(false);
              setIsTranscribing(true);
            })
            .catch(() => {
              setIsRecording(false);
              setIsTranscribing(false);
              setVoiceError('No audio was captured. Tap the microphone and try again.');
            });
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    if (!isTranscribing) {
      return undefined;
    }

    let active = true;
    const timer = setTimeout(() => {
        audioRecordingBridge
        .transcribeClip(recordedAudioPath)
        .then(fallback => {
        if (!active) {
          return;
        }

        if (!fallback?.trim()) {
          throw new Error('Audio transcription returned no answer');
        }

        setAnswers(previous => ({ ...previous, [currentQuestionIndex]: fallback }));
        setIsTranscribing(false);
        setTimeLeft(10);
        setRecordedAudioPath(null);
        setVoiceError(null);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setIsTranscribing(false);
        setVoiceError('Failed to transcribe audio. Please try again.');
      });
    }, 1600);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [currentQuestionIndex, isTranscribing, recordedAudioPath]);

  const options = useMemo(() => {
    if (currentQuestion.type === 'TRUE_FALSE') {
      return ['True', 'False'];
    }

    return currentQuestion.options || [];
  }, [currentQuestion]);

  function calculateScore() {
    let correctCount = 0;

    assignment.questions.forEach((question, index) => {
      const answer = answers[index];

      if (!answer) {
        return;
      }

      if (question.type === 'MCQ' || question.type === 'TRUE_FALSE') {
        if (answer === question.correctAnswer) {
          correctCount += 1;
        }
        return;
      }

      if (answer.trim().length > 5) {
        correctCount += 1;
      }
    });

    return correctCount;
  }

  function handleNext() {
    if (status === 'active' && Date.now() - questionStartTime < 5000) {
      setRushWarning(true);
      return;
    }

    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(value => value + 1);
      return;
    }

    const finalScore = calculateScore();
    setScore(finalScore);
    setStatus('scored');
    onSubmit(finalScore, answers);
  }

  function handleSkipQuestion() {
    setIsRecording(false);
    setIsTranscribing(false);
    setRecordedAudioPath(null);
    setVoiceError(null);

    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(value => value + 1);
      return;
    }

    const finalScore = calculateScore();
    setScore(finalScore);
    setStatus('scored');
    onSubmit(finalScore, answers);
  }

  async function beginVoiceRecording() {
    if (startRecordingPendingRef.current || isStartingRecording || isRecording || isTranscribing) {
      return;
    }

    startRecordingPendingRef.current = true;
    setIsStartingRecording(true);
    try {
      const started = await audioRecordingBridge.startRecording();
      if (!screenMountedRef.current) {
        if (started) {
          await audioRecordingBridge.stopRecording();
        }
        return;
      }

      if (!started) {
        setVoiceError('Microphone access is required to record an answer.');
        return;
      }

      setVoiceError(null);
      setRecordedAudioPath(null);
      setIsRecording(true);
      setTimeLeft(10);
    } catch (error) {
      console.error('Unable to start voice recording', error);
      if (!screenMountedRef.current) {
        return;
      }
      setIsRecording(false);
      setVoiceError('Recording could not start. Please try again.');
    } finally {
      startRecordingPendingRef.current = false;
      if (screenMountedRef.current) {
        setIsStartingRecording(false);
      }
    }
  }

  async function endVoiceRecording() {
    try {
      const path = await audioRecordingBridge.stopRecording();
      if (!path) {
        throw new Error('Recorder did not return an audio file');
      }
      setVoiceError(null);
      setRecordedAudioPath(path);
      setIsRecording(false);
      setIsTranscribing(true);
    } catch (error) {
      console.error('Unable to stop voice recording', error);
      setIsRecording(false);
      setIsTranscribing(false);
      setVoiceError('No audio was captured. Tap the microphone and try again.');
    }
  }

  async function explainAnswer() {
    const userAnswer = answers[currentQuestionIndex] || 'No answer selected';
    const correctAnswer = String(currentQuestion.correctAnswer ?? '');
    const learnerGrade = assignment.gradeLevel || DEFAULT_GRADE;

    setExplanationModal({ isOpen: true, isLoading: true, text: '' });

    try {
      let prompt = `I was answering a homework question: "${currentQuestion.text}".\nThe correct answer is "${correctAnswer}".`;
      if (userAnswer === correctAnswer) {
        prompt += `\nI got it right with "${userAnswer}". Give me a deeper but concise explanation of why this answer is correct.`;
      } else if (userAnswer === 'No answer selected') {
        prompt += '\nI did not answer it. Please explain the answer simply.';
      } else {
        prompt += `\nI answered "${userAnswer}". Explain simply why my answer is incorrect and why the correct answer is right.`;
      }
      prompt += `\nKeep it friendly and concise for a ${learnerGrade} student.`;

      const text = await askHomeworkHelper(prompt, [], 'explanation', undefined, {
        grade: learnerGrade,
        subjectName: assignment.subject,
      });
      setExplanationModal({ isOpen: true, isLoading: false, text });
    } catch (error) {
      console.error('Explanation request failed', error);
      setExplanationModal({
        isOpen: true,
        isLoading: false,
        text: 'I could not load the explanation right now. Please try again in a moment.',
      });
    }
  }

  if (status === 'scored') {
    const percentage = Math.round((score / totalQuestions) * 100);

    return (
      <View style={styles.scoreWrap}>
        <Text style={styles.scoreEmoji}>{percentage >= 80 ? '🎉' : '📘'}</Text>
        <Text style={styles.scoreTitle}>Quiz submitted</Text>
        <Text style={styles.scoreText}>
          You scored {score} out of {totalQuestions} ({percentage}%).
        </Text>
        <Pressable
          onPress={() => {
            setStatus('review');
            setCurrentQuestionIndex(0);
          }}
          style={styles.primaryButton}>
          <Text style={styles.primaryText}>Review answers</Text>
        </Pressable>
      </View>
    );
  }

  const isReview = status === 'review';
  const selectedAnswer = answers[currentQuestionIndex] || '';
  const isOpenResponse =
    currentQuestion.type === 'SHORT_ANSWER' || currentQuestion.type === 'ESSAY';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={20} color="#6B7280" />
          </Pressable>
          <Text style={styles.progressText}>
            {currentQuestionIndex + 1}/{totalQuestions}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              { width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` },
            ]}
          />
        </View>
      </View>

      {rushWarning ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>Slow down. Think for 5 seconds first.</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.questionPanel}>
          <Text style={styles.questionType}>{currentQuestion.type}</Text>
          <Text style={styles.questionText}>{currentQuestion.text}</Text>
          <AssessmentNarrationControls
            descriptorId={`homework:${assignment.id}:${currentQuestion.id}`}
            nextDescriptorIds={assignment.questions.slice(currentQuestionIndex + 1, currentQuestionIndex + 3).map(question =>
              `homework:${assignment.id}:${question.id}`
            )}
          />

          {(currentQuestion.type === 'MCQ' || currentQuestion.type === 'TRUE_FALSE') &&
            options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === currentQuestion.correctAnswer;

              return (
                <Pressable
                  key={option}
                  disabled={isReview}
                  onPress={() =>
                    setAnswers(prev => ({ ...prev, [currentQuestionIndex]: option }))
                  }
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionSelected,
                    isReview && isCorrect && styles.optionCorrect,
                    isReview && isSelected && !isCorrect && styles.optionIncorrect,
                  ]}>
                  <View style={[styles.optionMarker, isSelected && styles.optionMarkerSelected]}>
                    <Text style={[styles.optionMarkerText, isSelected && styles.optionMarkerTextSelected]}>
                      {String.fromCharCode(65 + index)}
                    </Text>
                  </View>
                  <Text style={styles.optionText}>{option}</Text>
                </Pressable>
              );
            })}
        </View>

        {isOpenResponse ? (
          <View style={styles.voiceSection}>
            {selectedAnswer && !isRecording && !isTranscribing ? (
              <View style={styles.answerCardWrap}>
                <View style={styles.answerCard}>
                  <Text style={styles.answerQuote}>"{selectedAnswer}"</Text>
                </View>
                {!isReview ? (
                  <Pressable
                    onPress={() =>
                      setAnswers(previous => {
                        const next = { ...previous };
                        delete next[currentQuestionIndex];
                        return next;
                      })
                    }
                    style={styles.voiceRedoBadge}>
                    <RotateCcw size={16} color="#EF4444" />
                  </Pressable>
                ) : null}
              </View>
            ) : !isReview ? (
              <View style={styles.voiceCard}>
                {voiceError ? (
                  <>
                    <View style={styles.voiceErrorBanner}>
                      <Text style={styles.voiceErrorText}>{voiceError}</Text>
                    </View>
                    <Pressable
                      accessibilityLabel="Skip question"
                      accessibilityRole="button"
                      onPress={handleSkipQuestion}
                      style={styles.skipButton}>
                      <Text style={styles.skipButtonText}>Skip question</Text>
                    </Pressable>
                  </>
                ) : null}

                {isRecording ? (
                  <View style={styles.voiceStateWrap}>
                    <View style={styles.recordingHalo}>
                      <View style={styles.recordingPulse} />
                      <View style={styles.recordingCore}>
                        <Text style={styles.voiceTimer}>00:{String(timeLeft).padStart(2, '0')}</Text>
                      </View>
                    </View>
                    <View style={styles.listeningRow}>
                      <View style={styles.listeningDot} />
                      <Text style={styles.listeningText}>Listening...</Text>
                    </View>
                    <Pressable
                      accessibilityLabel="Stop recording answer"
                      accessibilityRole="button"
                      onPress={() => {
                        endVoiceRecording().catch(() => undefined);
                      }}
                      style={styles.stopButton}>
                      <Square size={14} color="#DC2626" fill="#DC2626" />
                      <Text style={styles.stopButtonText}>Stop</Text>
                    </Pressable>
                  </View>
                ) : isTranscribing ? (
                  <View style={styles.voiceStateWrap}>
                    <View style={styles.transcribingBubble}>
                      <ActivityIndicator size="large" color="#2563EB" />
                    </View>
                    <Text style={styles.voiceProcessing}>Transcribing...</Text>
                  </View>
                ) : (
                  <Pressable
                    disabled={isStartingRecording}
                    accessibilityLabel="Start recording answer"
                    accessibilityRole="button"
                    onPress={() => {
                      beginVoiceRecording().catch(() => undefined);
                    }}
                    style={styles.recordButton}>
                    <View style={styles.recordIconBubble}>
                      <Mic size={40} color="#FFFFFF" />
                    </View>
                    <Text style={styles.recordHeading}>Tap to Record Answer</Text>
                    <Text style={styles.recordLimit}>10 Second Limit</Text>
                  </Pressable>
                )}
              </View>
            ) : null}
          </View>
        ) : null}

        {isReview && currentQuestion.explanation ? (
          <View style={styles.explanationCard}>
            <View style={styles.explanationHead}>
              <Text style={styles.explanationTitle}>Explanation</Text>
              <Pressable
                onPress={() => explainAnswer().catch(() => undefined)}
                style={styles.explainButton}>
                <Info size={16} color="#1D4ED8" />
                <Text style={styles.explainButtonText}>Ask AI</Text>
              </Pressable>
            </View>
            <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
            <AssessmentNarrationControls
              descriptorId={`homework:${assignment.id}:${currentQuestion.id}`}
              segment="explanation"
            />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {isReview && currentQuestionIndex > 0 ? (
          <Pressable
            onPress={() => setCurrentQuestionIndex(value => value - 1)}
            style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Previous</Text>
          </Pressable>
        ) : null}
        <Pressable
          disabled={!selectedAnswer || isRecording || isTranscribing}
          onPress={() => {
            if (isReview && currentQuestionIndex === totalQuestions - 1) {
              return;
            }

            if (isReview) {
              setCurrentQuestionIndex(value => value + 1);
              return;
            }

            handleNext();
          }}
          style={[
            styles.primaryButton,
            (!selectedAnswer || isRecording || isTranscribing) && styles.disabledButton,
          ]}>
          <Text style={styles.primaryText}>
            {isReview
              ? currentQuestionIndex === totalQuestions - 1
                ? 'Review complete'
                : 'Next question'
              : currentQuestionIndex === totalQuestions - 1
                ? 'Submit'
                : 'Next'}
          </Text>
        </Pressable>
      </View>

      <ActivityExplanationModal
        modal={explanationModal}
        reportContext={{
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          subject: assignment.subject,
          gradeLevel: assignment.gradeLevel,
          question: currentQuestion.text,
          selectedAnswer: answers[currentQuestionIndex] ?? null,
          correctAnswer: String(currentQuestion.correctAnswer ?? ''),
          questionIndex: currentQuestionIndex,
        }}
        onClose={() => setExplanationModal(null)}
      />
    </View>
  );
}

function ActivityExplanationModal({
  modal,
  onClose,
  reportContext,
}: {
  modal: { isOpen: boolean; isLoading: boolean; text: string } | null;
  onClose: () => void;
  reportContext: Record<string, unknown>;
}) {
  if (!modal?.isOpen) {
    return null;
  }

  return (
    <View style={styles.modalOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.modalCard}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>AI Explanation</Text>
          <Pressable onPress={onClose} style={styles.modalCloseButton}>
            <X size={18} color="#64748B" />
          </Pressable>
        </View>

        {modal.isLoading ? (
          <View style={styles.modalLoading}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.modalLoadingText}>Thinking...</Text>
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.modalText}>{modal.text}</Text>
              <ReportAiContentSheet
                accessibilityLabel="Report homework AI explanation"
                buttonLabel="Report explanation"
                contentText={modal.text}
                context={reportContext}
                source="homework_ai_explanation"
              />
            </ScrollView>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#F8FAFC', flex: 1 },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: { color: '#64748B', fontWeight: '700' },
  progressTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', backgroundColor: '#2563EB' },
  warning: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFEDD5',
    borderRadius: 14,
  },
  warningText: { color: '#9A3412', fontWeight: '700' },
  content: { padding: 18, gap: 14, paddingBottom: 28 },
  questionPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  questionType: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '800',
  },
  questionText: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
  },
  optionCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    gap: 12,
    minHeight: 62,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  optionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  optionCorrect: {
    borderColor: '#16A34A',
    backgroundColor: '#DCFCE7',
  },
  optionIncorrect: {
    borderColor: '#DC2626',
    backgroundColor: '#FEE2E2',
  },
  optionMarker: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  optionMarkerSelected: {
    backgroundColor: '#2563EB',
  },
  optionMarkerText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '900',
  },
  optionMarkerTextSelected: {
    color: '#FFFFFF',
  },
  optionText: { color: '#0F172A', flex: 1, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  voiceSection: { gap: 12 },
  answerCardWrap: {
    position: 'relative',
  },
  answerCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderWidth: 2,
    borderColor: '#BFDBFE',
  },
  answerQuote: {
    color: '#1E3A8A',
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '600',
  },
  voiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    minHeight: 248,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  voiceRedoBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  voiceErrorBanner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 60,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  voiceErrorText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  skipButton: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
    borderRadius: 14,
    borderWidth: 1,
    bottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: 'absolute',
    right: 14,
  },
  skipButtonText: { color: '#C2410C', fontWeight: '800', fontSize: 12 },
  voiceStateWrap: {
    alignItems: 'center',
    gap: 14,
  },
  recordingHalo: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingPulse: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(239,68,68,0.2)',
  },
  recordingCore: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FEE2E2',
  },
  listeningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  listeningText: {
    color: '#DC2626',
    fontWeight: '800',
  },
  transcribingBubble: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceTimer: { color: '#DC2626', fontSize: 24, fontWeight: '900' },
  voiceProcessing: { color: '#6B7280', fontWeight: '800', fontSize: 14 },
  recordButton: {
    width: '100%',
    minHeight: 220,
    borderRadius: 32,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  recordIconBubble: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordHeading: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  recordLimit: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11,
    fontWeight: '800',
    backgroundColor: 'rgba(15,23,42,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  stopButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stopButtonText: { color: '#B91C1C', fontWeight: '800' },
  explanationCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  explanationHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  explanationTitle: { color: '#92400E', fontWeight: '800' },
  explanationText: { color: '#78350F', lineHeight: 21 },
  explainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  explainButtonText: { color: '#1D4ED8', fontWeight: '800', fontSize: 12 },
  footer: { flexDirection: 'row', gap: 12, padding: 20 },
  secondaryButton: {
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  secondaryText: { color: '#334155', fontWeight: '800' },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledButton: { opacity: 0.45 },
  primaryText: { color: '#FFFFFF', fontWeight: '800' },
  scoreWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  scoreEmoji: { fontSize: 72 },
  scoreTitle: { color: '#0F172A', fontSize: 28, fontWeight: '800' },
  scoreText: {
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '72%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalTitle: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoading: {
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  modalLoadingText: { color: '#64748B', fontWeight: '700' },
  modalBody: { padding: 18 },
  modalText: { color: '#334155', lineHeight: 22 },
  modalReportButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    marginTop: 14,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  modalReportButtonSubmitted: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  modalReportText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },
  modalReportTextSubmitted: {
    color: '#16A34A',
  },
  modalReportError: {
    color: '#B91C1C',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
});
