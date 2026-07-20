import React, { useEffect, useMemo, useState } from 'react';
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
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Check,
  Eye,
  Frown,
  Mic,
  PartyPopper,
  RotateCcw,
  Sparkles,
  Square,
  Trophy,
  X,
} from 'lucide-react-native';

import { ReportAiContentSheet } from '../components/ReportAiContentSheet';
import { DEFAULT_GRADE } from '../constants/grades';
import { LearningMascotReaction } from '../features/progressiveLearning/components/LearningMascotReaction';
import { askHomeworkHelper } from '../services/aiService';
import { audioRecordingBridge } from '../services/nativeBridges';
import { OnboardingMascotKey, Question } from '../types/app';

interface TakeQuizScreenProps {
  questions: Question[];
  subjectName: string;
  strandName: string;
  mascotKey: OnboardingMascotKey;
  onClose: () => void;
  onFinish?: (result: { score: number; total: number; percentage: number }) => void;
}

type ResultState = 'correct' | 'incorrect';
type ViewMode = 'quiz' | 'score' | 'review';

const AUDIO_TYPES = new Set(['SHORT_ANSWER', 'ESSAY']);

export function TakeQuizScreen({
  questions: sourceQuestions,
  subjectName,
  strandName,
  mascotKey,
  onClose,
  onFinish,
}: TakeQuizScreenProps) {
  const questions = useMemo(() => sourceQuestions, [sourceQuestions]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, ResultState>>({});
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('quiz');
  const [isGrading, setIsGrading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [recordedAudioPath, setRecordedAudioPath] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [explanationModal, setExplanationModal] = useState<{
    isOpen: boolean;
    isLoading: boolean;
    text: string;
  } | null>(null);

  const currentQuestion = questions[currentIndex] ?? null;

  useEffect(() => {
    setCurrentIndex(0);
    setAnswers({});
    setResults({});
    setFeedback(null);
    setViewMode('quiz');
    setExplanationModal(null);
  }, [questions, subjectName]);

  useEffect(() => {
    setIsRecording(false);
    setIsTranscribing(false);
    setTimeLeft(10);
    setRecordedAudioPath(null);
    setVoiceError(null);
  }, [currentIndex, viewMode]);

  useEffect(() => {
    if (!feedback || viewMode !== 'quiz') {
      return undefined;
    }

    const timer = setTimeout(() => {
      setFeedback(null);
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(index => index + 1);
        return;
      }
      setViewMode('score');
    }, 2_000);

    return () => clearTimeout(timer);
  }, [currentIndex, feedback, questions.length, viewMode]);

  useEffect(() => {
    if (!isRecording || timeLeft <= 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isRecording, timeLeft]);

  useEffect(() => {
    if (!isRecording || timeLeft > 0) {
      return;
    }

    audioRecordingBridge
      .stopRecording()
      .then(path => {
        setRecordedAudioPath(path);
        setIsRecording(false);
        setIsTranscribing(true);
      })
      .catch(() => {
        setIsRecording(false);
        setIsTranscribing(true);
      });
  }, [isRecording, timeLeft]);

  useEffect(() => {
    if (!isTranscribing) {
      return undefined;
    }

    let active = true;
    const timer = setTimeout(() => {
      audioRecordingBridge
        .transcribeAnswer(currentIndex, recordedAudioPath)
        .then(transcript => {
          if (!active) {
            return;
          }

          setAnswers(prev => ({
            ...prev,
            [currentIndex]: transcript,
          }));
          setRecordedAudioPath(null);
          setVoiceError(null);
          setIsTranscribing(false);
          setTimeLeft(10);
        })
        .catch(() => {
          if (!active) {
            return;
          }

          setVoiceError('Failed to transcribe audio. Please try again.');
          setIsTranscribing(false);
        });
    }, 1200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [currentIndex, isTranscribing, recordedAudioPath]);

  if (!currentQuestion) {
    return (
      <View style={styles.quizBackdrop}>
        <View style={styles.quizSheet}>
          <View style={styles.quizHeader}>
            <Pressable onPress={onClose} style={styles.quizBackButton}>
              <ArrowLeft color="#9CA3AF" size={24} strokeWidth={2.4} />
            </Pressable>
            <View style={styles.quizHeaderSpacer} />
          </View>
          <View style={styles.emptyState}>
            <BookOpen color="#CBD5E1" size={44} strokeWidth={2} />
            <Text style={styles.emptyTitle}>No quiz available</Text>
            <Text style={styles.emptyBody}>
              Add quiz questions from published lessons or generate them first.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  function setAnswer(value: string) {
    if (!feedback) {
      setAnswers(prev => ({ ...prev, [currentIndex]: value }));

      if (currentQuestion.type === 'MCQ' || currentQuestion.type === 'TRUE_FALSE') {
        const isCorrect =
          value.trim().toLowerCase() ===
          String(currentQuestion.correctAnswer).trim().toLowerCase();
        setFeedback(isCorrect ? 'correct' : 'incorrect');
        setResults(prev => ({
          ...prev,
          [currentIndex]: isCorrect ? 'correct' : 'incorrect',
        }));
      }
    }
  }

  async function startRecording() {
    const path = await audioRecordingBridge.startRecording();
    if (path === null && audioRecordingBridge.state === 'expo_native') {
      setVoiceError('Could not access microphone. Please allow permissions.');
      return;
    }

    setVoiceError(null);
    setRecordedAudioPath(path);
    setIsRecording(true);
    setTimeLeft(10);
  }

  async function stopRecording() {
    const path = await audioRecordingBridge.stopRecording();
    setVoiceError(null);
    setRecordedAudioPath(path || recordedAudioPath);
    setIsRecording(false);
    setIsTranscribing(true);
  }

  function handleRedo() {
    setAnswers(prev => {
      const next = { ...prev };
      delete next[currentIndex];
      return next;
    });
  }

  function checkAnswer() {
    const userAnswer = answers[currentIndex];
    if (!userAnswer) {
      return;
    }

    if (currentQuestion.type === 'MCQ' || currentQuestion.type === 'TRUE_FALSE') {
      const isCorrect =
        String(userAnswer).trim().toLowerCase() ===
        String(currentQuestion.correctAnswer).trim().toLowerCase();
      setFeedback(isCorrect ? 'correct' : 'incorrect');
      setResults(prev => ({
        ...prev,
        [currentIndex]: isCorrect ? 'correct' : 'incorrect',
      }));
      return;
    }

    setIsGrading(true);
    setTimeout(() => {
      const isCorrect =
        currentQuestion.type === 'SHORT_ANSWER'
          ? userAnswer.trim().toLowerCase() ===
            String(currentQuestion.correctAnswer).trim().toLowerCase()
          : userAnswer.trim().length > 10;

      setFeedback(isCorrect ? 'correct' : 'incorrect');
      setResults(prev => ({
        ...prev,
        [currentIndex]: isCorrect ? 'correct' : 'incorrect',
      }));
      setIsGrading(false);
    }, 700);
  }

  function handleNext() {
    setFeedback(null);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return;
    }
    setViewMode('score');
  }

  function handlePrevious() {
    if (feedback) {
      setFeedback(null);
    }

    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }

  async function handleAskAI(text = currentQuestion?.text || '', answer = answers[currentIndex]) {
    setExplanationModal({ isOpen: true, isLoading: true, text: '' });
    const correctAnswer = String(currentQuestion.correctAnswer ?? '');
    let prompt = `I'm a ${DEFAULT_GRADE} student.\nQuestion: "${text}"\nCorrect Answer: "${correctAnswer}"`;
    if (answer) {
      prompt += `\nMy Answer: "${answer}"`;
    } else {
      prompt += '\nI did not answer the question.';
    }
    prompt += '\nCan you explain why the correct answer is right and, if I was wrong, why? Keep it brief and fun without markdown bolding.';

    try {
      const response = await askHomeworkHelper(prompt, [], 'explanation', undefined, {
        grade: DEFAULT_GRADE,
        subjectName,
      });
      setExplanationModal({
        isOpen: true,
        isLoading: false,
        text: response,
      });
    } catch (error) {
      console.error('AI explanation request failed', error);
      setExplanationModal({
        isOpen: true,
        isLoading: false,
        text: 'I could not load the explanation right now. Please try again in a moment.',
      });
    }
  }

  function resetQuiz() {
    setCurrentIndex(0);
    setAnswers({});
    setResults({});
    setFeedback(null);
    setViewMode('quiz');
  }

  if (viewMode === 'score') {
    const score = Object.values(results).filter(item => item === 'correct').length;
    const percentage = Math.round((score / questions.length) * 100);
    const isPass = percentage >= 50;

    return (
      <View style={styles.resultsBackdrop}>
        <View style={styles.resultsCard}>
          {percentage === 100 ? (
            <Trophy size={84} color="#EAB308" />
          ) : isPass ? (
            <PartyPopper size={84} color="#22C55E" />
          ) : (
            <Frown size={84} color="#F97316" />
          )}

          <Text style={styles.resultsTitle}>
            {isPass ? 'Quiz Completed!' : 'Keep Practicing!'}
          </Text>
          <Text style={styles.resultsScore}>
            You scored <Text style={styles.resultsPercent}>{percentage}%</Text>
          </Text>

          <View style={styles.resultsDots}>
            {questions.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.resultDot,
                  results[idx] === 'correct' ? styles.resultDotGood : styles.resultDotBad,
                ]}
              />
            ))}
          </View>

          <Pressable
            onPress={() => {
              if (onFinish) {
                onFinish({ score, total: questions.length, percentage });
                return;
              }
              onClose();
            }}
            style={styles.resultsPrimaryButton}>
            <Text style={styles.resultsPrimaryText}>Done</Text>
          </Pressable>

          <Pressable onPress={resetQuiz} style={styles.resultsSecondaryButton}>
            <RotateCcw size={16} color="#4B5563" />
            <Text style={styles.resultsSecondaryText}>Try Again</Text>
          </Pressable>

          <Pressable onPress={() => setViewMode('review')} style={styles.resultsReviewButton}>
            <Eye size={16} color="#F97316" />
            <Text style={styles.resultsReviewText}>Review Answers</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (viewMode === 'review') {
    return (
      <View style={styles.reviewScreen}>
        <View style={styles.reviewHeader}>
          <Pressable onPress={() => setViewMode('score')} style={styles.simpleIconButton}>
            <ArrowLeft size={22} color="#4B5563" />
          </Pressable>
          <Text style={styles.reviewTitle}>Review Answers</Text>
          <View style={styles.reviewSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.reviewContent}>
          {questions.map((question, idx) => {
            const status = results[idx];
            const answer = answers[idx];

            return (
              <View key={question.id} style={styles.reviewCard}>
                <View style={styles.reviewCardTop}>
                  <View
                    style={[
                      styles.reviewStatusBadge,
                      status === 'correct'
                        ? styles.reviewStatusBadgeGood
                        : styles.reviewStatusBadgeBad,
                    ]}>
                    {status === 'correct' ? (
                      <Check size={16} color="#16A34A" />
                    ) : (
                      <X size={16} color="#DC2626" />
                    )}
                  </View>
                  <View style={styles.reviewQuestionWrap}>
                    <Text style={styles.reviewQuestionIndex}>Question {idx + 1}</Text>
                    <Text style={styles.reviewQuestionText}>{question.text}</Text>
                    <ReportAiContentSheet
                      accessibilityLabel={`Report generated quiz question ${idx + 1}`}
                      buttonLabel="Report question"
                      contentText={[
                        `Question: ${question.text}`,
                        question.options?.length ? `Options: ${question.options.join(' | ')}` : null,
                        `Correct answer: ${String(question.correctAnswer ?? '')}`,
                        question.explanation ? `Explanation: ${question.explanation}` : null,
                      ].filter(Boolean).join('\n')}
                      context={{
                        subjectName,
                        questionId: question.id,
                        questionIndex: idx,
                        screen: 'take_quiz_review',
                      }}
                      source="generated_quiz_question"
                    />
                  </View>
                </View>

                <View style={styles.reviewAnswerBox}>
                  <Text style={styles.reviewLabel}>Your Answer</Text>
                  <Text style={styles.reviewAnswerText}>{answer || '(No Answer)'}</Text>
                </View>

                {status !== 'correct' ? (
                  <View style={styles.reviewCorrectBox}>
                    <Text style={styles.reviewLabel}>Correct Answer</Text>
                    <Text style={styles.reviewAnswerText}>
                      {String(question.correctAnswer)}
                    </Text>
                  </View>
                ) : null}

                {question.explanation ? (
                  <View style={styles.reviewExplanationBox}>
                    <View style={styles.reviewExplanationTop}>
                      <Text style={styles.reviewExplanationTitle}>Explanation</Text>
                      <Pressable
                        onPress={() => handleAskAI(question.text, answer)}
                        style={styles.reviewAiButton}>
                        <Sparkles size={14} color="#F97316" />
                      </Pressable>
                    </View>
                    <Text style={styles.reviewExplanationText}>{question.explanation}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  const options =
    currentQuestion.type === 'TRUE_FALSE' &&
    (!currentQuestion.options || currentQuestion.options.length === 0)
      ? ['True', 'False']
      : currentQuestion.options || [];

  return (
    <View style={styles.screen}>
      <View style={styles.heroBackdrop}>
        <Pressable onPress={onClose} style={styles.heroBackButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text numberOfLines={1} style={styles.heroSubject}>{subjectName}</Text>
        <Text numberOfLines={1} style={styles.heroStrand}>{strandName}</Text>
      </View>

      <View style={styles.quizCard}>
        <View style={styles.quizHeader}>
          <Pressable onPress={onClose} style={styles.simpleIconButton}>
            <X size={22} color="#6B7280" />
          </Pressable>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stepRow}>
            {questions.map((_, idx) => {
              const status = results[idx];
              const isActive = idx === currentIndex;

              return (
                <View
                  key={idx}
                  style={[
                    styles.stepChip,
                    isActive && !status && styles.stepChipActive,
                    status === 'correct' && styles.stepChipCorrect,
                    status === 'incorrect' && styles.stepChipIncorrect,
                  ]}>
                  {status === 'correct' ? (
                    <Check size={18} color="#FFFFFF" />
                  ) : status === 'incorrect' ? (
                    <X size={18} color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.stepChipText, isActive && styles.stepChipTextActive]}>
                      {idx + 1}
                    </Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView
          style={styles.quizBody}
          contentContainerStyle={styles.quizBodyContent}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.questionCount}>
            QUESTION {currentIndex + 1} OF {questions.length}
          </Text>
          <Text style={styles.questionText}>{currentQuestion.text}</Text>
          <ReportAiContentSheet
            accessibilityLabel="Report generated quiz question"
            buttonLabel="Report question"
            contentText={[
              `Question: ${currentQuestion.text}`,
              options.length ? `Options: ${options.join(' | ')}` : null,
              `Correct answer: ${String(currentQuestion.correctAnswer ?? '')}`,
              currentQuestion.explanation ? `Explanation: ${currentQuestion.explanation}` : null,
            ].filter(Boolean).join('\n')}
            context={{
              subjectName,
              questionId: currentQuestion.id,
              questionIndex: currentIndex,
              screen: 'take_quiz',
            }}
            source="generated_quiz_question"
          />

          {(currentQuestion.type === 'MCQ' || currentQuestion.type === 'TRUE_FALSE') &&
            options.map((option, index) => {
              const selected = answers[currentIndex] === option;
              const correct =
                String(option).toLowerCase() ===
                String(currentQuestion.correctAnswer).toLowerCase();

              return (
                <Pressable
                  key={option}
                  disabled={!!feedback}
                  onPress={() => setAnswer(option)}
                  style={[
                    styles.optionCard,
                    selected && !feedback && styles.optionCardSelected,
                    feedback && correct && styles.optionCardCorrect,
                    feedback && selected && !correct && styles.optionCardIncorrect,
                  ]}>
                  <View
                    style={[
                      styles.optionMarker,
                      selected && !feedback && styles.optionMarkerSelected,
                      feedback && correct && styles.optionMarkerCorrect,
                      feedback && selected && !correct && styles.optionMarkerIncorrect,
                    ]}>
                    <Text
                      style={[
                        styles.optionMarkerText,
                        (selected && !feedback) || (feedback && (correct || selected))
                          ? styles.optionMarkerTextSelected
                          : undefined,
                      ]}>
                      {String.fromCharCode(65 + index)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      selected && !feedback && styles.optionTextSelected,
                    ]}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}

          {AUDIO_TYPES.has(currentQuestion.type) ? (
            <View style={styles.audioWrap}>
              {voiceError ? (
                <View style={styles.voiceErrorBanner}>
                  <Text style={styles.voiceErrorText}>{voiceError}</Text>
                </View>
              ) : null}

              {answers[currentIndex] ? (
                <View style={styles.recordedAnswerWrap}>
                  <View style={styles.recordedAnswerCard}>
                    <Text style={styles.recordedAnswerText}>{answers[currentIndex]}</Text>
                  </View>
                  {!feedback ? (
                    <Pressable onPress={handleRedo} style={styles.redoButton}>
                      <RotateCcw size={16} color="#EF4444" />
                    </Pressable>
                  ) : null}
                </View>
              ) : isRecording ? (
                <View style={styles.recordState}>
                  <Text style={styles.recordTimer}>00:{timeLeft.toString().padStart(2, '0')}</Text>
                  <Pressable onPress={stopRecording} style={styles.stopButton}>
                    <Square size={15} color="#DC2626" fill="#DC2626" />
                    <Text style={styles.stopButtonText}>Stop</Text>
                  </Pressable>
                </View>
              ) : isTranscribing ? (
                <View style={styles.recordState}>
                  <ActivityIndicator size="large" color="#16A34A" />
                  <Text style={styles.transcribingText}>Transcribing...</Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => {
                    startRecording().catch(() => undefined);
                  }}
                  style={styles.recordButton}>
                  <Mic size={24} color="#FFFFFF" />
                  <Text style={styles.recordButtonText}>Record Answer</Text>
                </Pressable>
              )}

              {!answers[currentIndex] ? (
                <TextInput
                  multiline
                  placeholder="Or type your answer here..."
                  placeholderTextColor="#9CA3AF"
                  value={answers[currentIndex] || ''}
                  onChangeText={setAnswer}
                  style={styles.answerInput}
                />
              ) : null}
            </View>
          ) : null}

          {feedback ? (
            <View
              style={[
                styles.feedbackCard,
                feedback === 'correct'
                  ? styles.feedbackCardGood
                  : styles.feedbackCardBad,
              ]}>
              <LearningMascotReaction
                mascotKey={mascotKey}
                reaction={feedback === 'correct' ? 'correct' : 'encourage'}
                message={
                  feedback === 'correct'
                    ? 'Great work! Let’s keep going.'
                    : 'Nice try! Review the answer and keep learning.'
                }
                size={58}
              />
              <View style={styles.feedbackTop}>
                {feedback === 'correct' ? (
                  <Check size={18} color="#15803D" />
                ) : (
                  <AlertCircle size={18} color="#B91C1C" />
                )}
                <Text style={styles.feedbackTitle}>
                  {feedback === 'correct' ? 'Correct' : 'Incorrect'}
                </Text>
                <Pressable onPress={() => handleAskAI()} style={styles.feedbackAiButton}>
                  <Sparkles size={14} color="#F97316" />
                </Pressable>
              </View>
              <Text style={styles.feedbackText}>{currentQuestion.explanation}</Text>
              <Text style={styles.autoAdvanceText}>Next question in a moment…</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            disabled={currentIndex === 0}
            onPress={handlePrevious}
            style={[styles.footerSecondaryButton, currentIndex === 0 && styles.footerDisabled]}>
            <Text style={styles.footerSecondaryText}>Previous</Text>
          </Pressable>

          {!feedback ? (
            <Pressable
              disabled={!answers[currentIndex] || isRecording || isTranscribing || isGrading}
              onPress={checkAnswer}
              style={[
                styles.footerPrimaryButton,
                (!answers[currentIndex] || isRecording || isTranscribing || isGrading) &&
                  styles.footerPrimaryDisabled,
              ]}>
              <Text style={styles.footerPrimaryText}>
                {isGrading ? 'Checking...' : 'Check Answer'}
              </Text>
            </Pressable>
          ) : (
            <Pressable onPress={handleNext} style={styles.footerPrimaryButton}>
              <Text style={styles.footerPrimaryText}>
                {currentIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={!!explanationModal?.isOpen}
        onRequestClose={() => setExplanationModal(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setExplanationModal(null)} />
          <View style={styles.modalCard}>
            <Pressable onPress={() => setExplanationModal(null)} style={styles.modalClose}>
              <X size={18} color="#9CA3AF" />
            </Pressable>
            <View style={styles.modalHead}>
              <View style={styles.modalBadge}>
                <Sparkles size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.modalTitle}>AI Tutor</Text>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalText}>
                {explanationModal?.isLoading ? 'Loading explanation...' : explanationModal?.text}
              </Text>
            </View>
            {!explanationModal?.isLoading ? (
              <View style={styles.modalActionRow}>
                <ReportAiContentSheet
                  accessibilityLabel="Report quiz AI explanation"
                  contentText={explanationModal?.text ?? ''}
                  context={{
                    subjectName,
                    question: currentQuestion.text,
                    selectedAnswer: answers[currentIndex] ?? null,
                    correctAnswer: String(currentQuestion.correctAnswer ?? ''),
                    questionIndex: currentIndex,
                  }}
                  source="quiz_ai_explanation"
                />
                <Pressable onPress={() => setExplanationModal(null)}>
                  <Text style={styles.modalDone}>Got it</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F97316',
  },
  heroBackdrop: {
    alignItems: 'center',
    paddingHorizontal: 70,
    paddingTop: 24,
    paddingBottom: 64,
  },
  heroBackButton: {
    position: 'absolute',
    left: 20,
    top: 30,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSubject: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  heroStrand: {
    color: '#FFEDD5',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 5,
    textAlign: 'center',
  },
  quizBackdrop: {
    flex: 1,
    backgroundColor: '#F97316',
    padding: 18,
  },
  quizSheet: {
    flex: 1,
    backgroundColor: '#F6F7F8',
    borderRadius: 28,
    overflow: 'hidden',
  },
  quizBackButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quizHeaderSpacer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 28,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyBody: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  quizCard: {
    flex: 1,
    marginHorizontal: 12,
    marginTop: -18,
    marginBottom: 12,
    backgroundColor: '#F6F7F8',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  quizHeader: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  simpleIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepRow: {
    gap: 8,
    alignItems: 'center',
    paddingRight: 8,
  },
  stepChip: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: '#D4D7DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepChipActive: {
    borderColor: '#F97316',
    borderWidth: 2,
  },
  stepChipCorrect: {
    backgroundColor: '#16A34A',
  },
  stepChipIncorrect: {
    backgroundColor: '#DC2626',
  },
  stepChipText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '700',
  },
  stepChipTextActive: {
    color: '#F97316',
    fontSize: 16,
    fontWeight: '900',
  },
  quizBody: {
    flex: 1,
  },
  quizBodyContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
  },
  questionCount: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  questionText: {
    color: '#111827',
    fontSize: 23,
    lineHeight: 33,
    fontWeight: '900',
    marginBottom: 2,
  },
  optionCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DADADA',
    flexDirection: 'row',
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  optionCardSelected: {
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
  },
  optionCardCorrect: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  optionCardIncorrect: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  optionText: {
    color: '#111827',
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#C2410C',
    fontWeight: '700',
  },
  optionMarker: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  optionMarkerSelected: {
    backgroundColor: '#F97316',
  },
  optionMarkerCorrect: {
    backgroundColor: '#16A34A',
  },
  optionMarkerIncorrect: {
    backgroundColor: '#DC2626',
  },
  optionMarkerText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '900',
  },
  optionMarkerTextSelected: {
    color: '#FFFFFF',
  },
  audioWrap: {
    gap: 14,
  },
  voiceErrorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  voiceErrorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
  },
  recordButton: {
    minHeight: 60,
    borderRadius: 18,
    backgroundColor: '#F97316',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  recordState: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  recordTimer: {
    color: '#DC2626',
    fontSize: 28,
    fontWeight: '900',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  stopButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '800',
  },
  transcribingText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
  },
  recordedAnswerWrap: {
    position: 'relative',
  },
  recordedAnswerCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADADA',
    padding: 16,
  },
  recordedAnswerText: {
    color: '#111827',
    fontSize: 16,
    lineHeight: 26,
  },
  redoButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerInput: {
    minHeight: 118,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DADADA',
    backgroundColor: '#FFFFFF',
    color: '#111827',
    fontSize: 16,
    lineHeight: 24,
    padding: 16,
    textAlignVertical: 'top',
  },
  feedbackCard: {
    borderRadius: 18,
    gap: 10,
    padding: 14,
    borderWidth: 1,
  },
  feedbackCardGood: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  feedbackCardBad: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  feedbackTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  feedbackTitle: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  feedbackAiButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackText: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 22,
  },
  autoAdvanceText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  footerSecondaryButton: {
    minWidth: 108,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADADA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  footerSecondaryText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '500',
  },
  footerPrimaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  footerPrimaryDisabled: {
    backgroundColor: '#D1D5DB',
  },
  footerPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  footerDisabled: {
    opacity: 0.45,
  },
  resultsBackdrop: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 18,
  },
  resultsCard: {
    flex: 1,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  resultsTitle: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 20,
  },
  resultsScore: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 20,
  },
  resultsPercent: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
  },
  resultsDots: {
    width: '100%',
    maxWidth: 280,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 22,
  },
  resultDot: {
    flex: 1,
    height: 8,
    borderRadius: 999,
  },
  resultDotGood: {
    backgroundColor: '#22C55E',
  },
  resultDotBad: {
    backgroundColor: '#EF4444',
  },
  resultsPrimaryButton: {
    width: '100%',
    maxWidth: 280,
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  resultsPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  resultsSecondaryButton: {
    width: '100%',
    maxWidth: 280,
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  resultsSecondaryText: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '800',
  },
  resultsReviewButton: {
    width: '100%',
    maxWidth: 280,
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resultsReviewText: {
    color: '#C2410C',
    fontSize: 16,
    fontWeight: '800',
  },
  reviewScreen: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  reviewTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
  },
  reviewSpacer: {
    width: 38,
  },
  reviewContent: {
    gap: 16,
    paddingBottom: 24,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  reviewCardTop: {
    flexDirection: 'row',
    gap: 12,
  },
  reviewStatusBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewStatusBadgeGood: {
    backgroundColor: '#DCFCE7',
  },
  reviewStatusBadgeBad: {
    backgroundColor: '#FEE2E2',
  },
  reviewQuestionWrap: {
    flex: 1,
  },
  reviewQuestionIndex: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  reviewQuestionText: {
    color: '#111827',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
  },
  reviewAnswerBox: {
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  reviewCorrectBox: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  reviewLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  reviewAnswerText: {
    color: '#1F2937',
    fontSize: 14,
    lineHeight: 22,
  },
  reviewExplanationBox: {
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    padding: 14,
  },
  reviewExplanationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewExplanationTitle: {
    color: '#C2410C',
    fontSize: 12,
    fontWeight: '800',
  },
  reviewAiButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewExplanationText: {
    color: '#7C2D12',
    fontSize: 13,
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  modalBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  modalBody: {
    minHeight: 110,
    borderRadius: 18,
    backgroundColor: '#F9FAFB',
    padding: 16,
    marginBottom: 16,
  },
  modalText: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 22,
  },
  modalActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalReportButton: {
    alignItems: 'center',
    borderColor: '#E5E7EB',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
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
    marginTop: 9,
    textAlign: 'center',
  },
  modalDone: {
    color: '#15803D',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
});
