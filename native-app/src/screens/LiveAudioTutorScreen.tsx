import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Mic, MicOff, RotateCcw, Square, Volume2, X } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';

import { askVoiceTutor } from '../services/aiService';
import { audioRecordingBridge, speechPlaybackBridge } from '../services/nativeBridges';
import { Assignment, ChatMessage, SubStrand, Subject, UserProfile } from '../types/app';

interface LiveAudioTutorScreenProps {
  onClose: () => void;
  initialMessages?: ChatMessage[];
  currentGrade?: string;
  selectedSubject?: Subject | null;
  selectedSubStrand?: SubStrand | null;
  selectedAssignment?: Assignment | null;
  userProfile?: UserProfile;
}

type SessionStatus =
  | 'ready'
  | 'recording'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'error';

const starterPrompts = [
  'Explain what you are stuck on, then tap again to send.',
  'Say the question out loud and I will talk you through it.',
  'Tell me what you have already tried first.',
];

function buildContextSummary(args: {
  currentGrade?: string;
  selectedSubject?: Subject | null;
  selectedSubStrand?: SubStrand | null;
  selectedAssignment?: Assignment | null;
  userProfile?: UserProfile;
}) {
  const baseLines = [
    args.currentGrade ? `Grade: ${args.currentGrade}` : null,
    args.selectedSubject ? `Subject: ${args.selectedSubject.name}` : null,
    args.selectedSubStrand ? `Lesson focus: ${args.selectedSubStrand.title}` : null,
    args.selectedAssignment ? `Homework: ${args.selectedAssignment.title}` : null,
    args.userProfile?.name ? `Student: ${args.userProfile.name}` : null,
  ].filter(Boolean);

  if (!args.selectedAssignment) {
    return baseLines.join('\n');
  }

  const questionPreview = args.selectedAssignment.questions
    .slice(0, 3)
    .map((question, index) => `${index + 1}. ${question.text}`)
    .join('\n');

  return [...baseLines, questionPreview ? `Homework questions:\n${questionPreview}` : null]
    .filter(Boolean)
    .join('\n');
}

export function LiveAudioTutorScreen({
  onClose,
  initialMessages = [],
  currentGrade,
  selectedSubject,
  selectedSubStrand,
  selectedAssignment,
  userProfile,
}: LiveAudioTutorScreenProps) {
  const [status, setStatus] = useState<SessionStatus>('ready');
  const [isMicOn, setIsMicOn] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0.08);
  const [recordedAudioPath, setRecordedAudioPath] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [responseText, setResponseText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>(initialMessages);
  const [turnCount, setTurnCount] = useState(0);
  const scale = useRef(new Animated.Value(1)).current;
  const outerGlow = useRef(new Animated.Value(1)).current;
  const innerGlow = useRef(new Animated.Value(1)).current;

  const contextSummary = useMemo(
    () =>
      buildContextSummary({
        currentGrade,
        selectedSubject,
        selectedSubStrand,
        selectedAssignment,
        userProfile,
      }),
    [currentGrade, selectedAssignment, selectedSubStrand, selectedSubject, userProfile],
  );

  const prompt = useMemo(() => {
    if (error) {
      return error;
    }
    if (status === 'recording') {
      return 'Listening now. Tap stop when you finish speaking.';
    }
    if (status === 'transcribing') {
      return 'Transcribing your question with Whisper.';
    }
    if (status === 'thinking') {
      return 'Thinking through the answer.';
    }
    if (status === 'speaking') {
      return 'Speaking the tutor response.';
    }

    return starterPrompts[turnCount % starterPrompts.length];
  }, [error, status, turnCount]);

  useEffect(() => {
    return () => {
      speechPlaybackBridge.stop().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    const targetVolume =
      status === 'recording'
        ? 0.72
        : status === 'speaking'
          ? 0.46
          : status === 'thinking' || status === 'transcribing'
            ? 0.2
            : 0.08;

    setVolumeLevel(targetVolume);
  }, [status]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1 + volumeLevel * 0.18,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(outerGlow, {
        toValue: 1 + volumeLevel * 1.2,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(innerGlow, {
        toValue: 1 + volumeLevel * 0.7,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [innerGlow, outerGlow, scale, volumeLevel]);

  async function beginRecording() {
    setError(null);
    await speechPlaybackBridge.stop().catch(() => undefined);
    const startedRecordingPath = await audioRecordingBridge.startRecording();
    if (startedRecordingPath === null && audioRecordingBridge.state === 'android_native') {
      setStatus('error');
      setError('Could not access the microphone. Please allow permissions.');
      setIsMicOn(false);
      return;
    }

    setRecordedAudioPath(startedRecordingPath);
    setTranscript('');
    setStatus('recording');
    setIsMicOn(true);
  }

  async function stopRecording() {
    setError(null);
    setStatus('transcribing');
    setIsMicOn(false);

    const stoppedRecordingPath = await audioRecordingBridge.stopRecording();
    const finalPath = stoppedRecordingPath || recordedAudioPath;
    setRecordedAudioPath(finalPath);

    const nextTranscript = await audioRecordingBridge.transcribeClip(finalPath);
    if (!nextTranscript?.trim()) {
      setStatus('error');
      setError('I could not transcribe that audio. Please try again.');
      return;
    }

    setTranscript(nextTranscript);
    setStatus('thinking');

    const nextHistory = [
      ...history,
      {
        role: 'user' as const,
        text: nextTranscript,
      },
    ];

    try {
      const voicePrompt = contextSummary
        ? `${contextSummary}\n\nStudent just said: ${nextTranscript}`
        : nextTranscript;
      const reply = await askVoiceTutor(voicePrompt, history);
      const updatedHistory = [
        ...nextHistory,
        {
          role: 'model' as const,
          text: reply,
        },
      ];

      setHistory(updatedHistory);
      setResponseText(reply);
      setTurnCount(current => current + 1);

      if (speechPlaybackBridge.state === 'android_native') {
        setStatus('speaking');
        await speechPlaybackBridge.speak(reply);
      }

      setStatus('ready');
    } catch (responseError) {
      console.error(responseError);
      setStatus('error');
      setError('I could not reach the tutor right now. Please try again.');
    }
  }

  async function handleMicToggle() {
    if (status === 'transcribing' || status === 'thinking') {
      return;
    }

    if (isMicOn) {
      await stopRecording();
      return;
    }

    await beginRecording();
  }

  async function replayLastResponse() {
    if (!responseText.trim() || speechPlaybackBridge.state !== 'android_native') {
      return;
    }

    setStatus('speaking');
    await speechPlaybackBridge.stop().catch(() => undefined);
    await speechPlaybackBridge.speak(responseText);
    setStatus('ready');
  }

  function closeScreen() {
    speechPlaybackBridge.stop().catch(() => undefined);
    if (isMicOn) {
      audioRecordingBridge.stopRecording().catch(() => undefined);
    }
    onClose();
  }

  const statusLabel =
    status === 'error'
      ? 'Error'
      : status === 'ready'
        ? 'Ready'
        : status === 'recording'
          ? 'Listening'
          : status === 'transcribing'
            ? 'Transcribing'
            : status === 'thinking'
              ? 'Thinking'
              : 'Speaking';

  const transcriptBlocks: React.ReactNode[] = [];

  if (contextSummary) {
    transcriptBlocks.push(
      <View key="context" style={styles.contextCard}>
        <Text style={styles.contextEyebrow}>Session context</Text>
        <Text style={styles.contextText}>{contextSummary}</Text>
      </View>,
    );
  }

  if (transcript) {
    transcriptBlocks.push(
      <View key="transcript" style={styles.messageBubbleUser}>
        <Text style={styles.messageEyebrow}>You said</Text>
        <Text style={styles.messageTextUser}>{transcript}</Text>
      </View>,
    );
  }

  if (responseText) {
    transcriptBlocks.push(
      <View key="response" style={styles.messageBubbleTutor}>
        <Text style={styles.messageEyebrow}>Tutor</Text>
        <Text style={styles.messageTextTutor}>{responseText}</Text>
      </View>,
    );
  }

  if (!transcript && !responseText) {
    transcriptBlocks.push(
      <Text key="empty" style={styles.emptyHint}>
        Voice mode is ready for a full tutoring session with follow-up turns.
      </Text>,
    );
  }

  return (
    <View style={styles.backdrop}>
      <View style={styles.shell}>
        <Pressable onPress={closeScreen} style={styles.closeButton}>
          <X size={20} color="rgba(255,255,255,0.9)" />
        </Pressable>

        <Text
          style={[styles.statusText, status === 'error' ? styles.statusError : styles.statusOk]}>
          {statusLabel}
        </Text>
        <Text style={styles.promptText}>{prompt}</Text>

        <View style={styles.orbWrap}>
          <Animated.View style={[styles.outerGlowWrap, { transform: [{ scale: outerGlow }] }]}>
            <LinearGradient
              colors={['rgba(37,99,235,0.5)', 'rgba(14,165,233,0.45)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.outerGlow}
            />
          </Animated.View>
          <Animated.View style={[styles.innerGlowWrap, { transform: [{ scale: innerGlow }] }]}>
            <LinearGradient
              colors={['rgba(45,212,191,0.34)', 'rgba(59,130,246,0.2)']}
              start={{ x: 0.2, y: 0.2 }}
              end={{ x: 0.8, y: 0.8 }}
              style={styles.innerGlow}
            />
          </Animated.View>
          <Animated.View style={[styles.coreOrbWrap, { transform: [{ scale }] }]}>
            <LinearGradient
              colors={
                status === 'error'
                  ? ['#dc2626', '#f97316']
                  : ['#2563eb', '#0ea5e9', '#14b8a6']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coreOrb}
            />
            {status === 'transcribing' || status === 'thinking' ? (
              <ActivityIndicator size="large" color="#FFFFFF" />
            ) : isMicOn ? (
              <Mic size={34} color="#FFFFFF" />
            ) : status === 'speaking' ? (
              <Volume2 size={34} color="#FFFFFF" />
            ) : (
              <MicOff size={34} color="rgba(255,255,255,0.85)" />
            )}
          </Animated.View>
        </View>

        <Pressable
          onPress={() => {
            handleMicToggle().catch(toggleError => {
              console.error(toggleError);
              setStatus('error');
              setError('Voice mode failed. Please try again.');
            });
          }}
          disabled={status === 'transcribing' || status === 'thinking'}
          style={[
            styles.actionButton,
            isMicOn ? styles.actionButtonStop : styles.actionButtonStart,
            (status === 'transcribing' || status === 'thinking') &&
              styles.actionButtonDisabled,
          ]}>
          {isMicOn ? (
            <Square size={18} color="#FFFFFF" fill="#FFFFFF" />
          ) : (
            <Mic size={18} color="#FFFFFF" />
          )}
          <Text style={styles.actionButtonText}>
            {isMicOn ? 'Stop and send' : 'Start talking'}
          </Text>
        </Pressable>

        <View style={styles.secondaryActions}>
          <Pressable
            onPress={() => {
              replayLastResponse().catch(() => undefined);
            }}
            disabled={!responseText || speechPlaybackBridge.state !== 'android_native'}
            style={[
              styles.secondaryButton,
              (!responseText || speechPlaybackBridge.state !== 'android_native') &&
                styles.secondaryButtonDisabled,
            ]}>
            <RotateCcw size={16} color="#dbeafe" />
            <Text style={styles.secondaryButtonText}>Replay answer</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.transcriptPanel}
          contentContainerStyle={styles.transcriptContent}>
          {transcriptBlocks}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#06111f',
    justifyContent: 'center',
    padding: 20,
  },
  shell: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: '#0b1728',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  statusOk: {
    color: '#67e8f9',
  },
  statusError: {
    color: '#fca5a5',
  },
  promptText: {
    marginTop: 10,
    color: '#dbeafe',
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 24,
    paddingHorizontal: 12,
  },
  orbWrap: {
    marginTop: 28,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerGlowWrap: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  outerGlow: {
    flex: 1,
    borderRadius: 110,
    opacity: 0.34,
  },
  innerGlowWrap: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderRadius: 84,
  },
  innerGlow: {
    flex: 1,
    borderRadius: 84,
    opacity: 0.28,
  },
  coreOrbWrap: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  coreOrb: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 56,
  },
  actionButton: {
    marginTop: 12,
    minHeight: 56,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonStart: {
    backgroundColor: '#2563eb',
  },
  actionButtonStop: {
    backgroundColor: '#dc2626',
  },
  actionButtonDisabled: {
    opacity: 0.65,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryActions: {
    marginTop: 10,
    alignItems: 'center',
  },
  secondaryButton: {
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(148,163,184,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonDisabled: {
    opacity: 0.45,
  },
  secondaryButtonText: {
    color: '#dbeafe',
    fontSize: 13,
    fontWeight: '700',
  },
  transcriptPanel: {
    marginTop: 18,
    flex: 1,
  },
  transcriptContent: {
    gap: 12,
    paddingBottom: 12,
  },
  contextCard: {
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.12)',
    padding: 14,
  },
  contextEyebrow: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  contextText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 19,
  },
  messageBubbleUser: {
    alignSelf: 'flex-end',
    maxWidth: '88%',
    backgroundColor: '#1d4ed8',
    borderRadius: 22,
    padding: 14,
  },
  messageBubbleTutor: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    backgroundColor: '#12243a',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.16)',
  },
  messageEyebrow: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  messageTextUser: {
    color: '#eff6ff',
    fontSize: 15,
    lineHeight: 21,
  },
  messageTextTutor: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 22,
  },
  emptyHint: {
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 28,
  },
});
