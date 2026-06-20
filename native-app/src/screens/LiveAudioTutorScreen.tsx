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
import { LinearGradient } from 'expo-linear-gradient';

import { askVoiceTutor } from '../services/aiService';
import {
  createLiveVoiceStreamSession,
  isLiveVoiceStreamingSupported,
  type LiveVoiceStreamSession,
} from '../services/liveVoiceStreamService';
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

const MAX_RECORDING_MS = 12_000;

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
  const [visibleResponseText, setVisibleResponseText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>(initialMessages);
  const [turnCount, setTurnCount] = useState(0);
  const transcriptScrollRef = useRef<ScrollView | null>(null);
  const liveStreamSessionRef = useRef<LiveVoiceStreamSession | null>(null);
  const streamedTranscriptRef = useRef('');
  const streamedResponseRef = useRef('');
  const queuedSpeechRef = useRef('');
  const scale = useRef(new Animated.Value(1)).current;
  const outerGlow = useRef(new Animated.Value(1)).current;
  const innerGlow = useRef(new Animated.Value(1)).current;
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responseStreamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const responseStreamResolveRef = useRef<(() => void) | null>(null);

  function clearRecordingTimeout() {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
  }

  function clearResponseStream() {
    if (responseStreamIntervalRef.current) {
      clearInterval(responseStreamIntervalRef.current);
      responseStreamIntervalRef.current = null;
    }
    responseStreamResolveRef.current?.();
    responseStreamResolveRef.current = null;
  }

  function scrollTranscriptToEnd() {
    requestAnimationFrame(() => {
      transcriptScrollRef.current?.scrollToEnd({ animated: true });
    });
  }

  function streamResponseText(text: string) {
    clearResponseStream();
    setVisibleResponseText('');

    const words = text.split(/(\s+)/).filter(Boolean);
    let index = 0;

    return new Promise<void>(resolve => {
      responseStreamResolveRef.current = resolve;
      responseStreamIntervalRef.current = setInterval(() => {
        index += 1;
        setVisibleResponseText(words.slice(0, index).join(''));
        scrollTranscriptToEnd();

        if (index >= words.length) {
          if (responseStreamIntervalRef.current) {
            clearInterval(responseStreamIntervalRef.current);
            responseStreamIntervalRef.current = null;
          }
          responseStreamResolveRef.current = null;
          resolve();
        }
      }, 55);
    });
  }

  function appendStreamedResponse(delta: string) {
    if (!delta) {
      return;
    }

    streamedResponseRef.current += delta;
    queuedSpeechRef.current += delta;
    setResponseText(streamedResponseRef.current);
    setVisibleResponseText(streamedResponseRef.current);
    setStatus('speaking');
    scrollTranscriptToEnd();

    const sentenceMatch = queuedSpeechRef.current.match(/^([\s\S]*?[.!?])(\s+|$)/);
    if (sentenceMatch?.[1]?.trim()) {
      const sentence = sentenceMatch[1].trim();
      queuedSpeechRef.current = queuedSpeechRef.current.slice(sentenceMatch[0].length);
      speechPlaybackBridge.speakQueued(sentence).catch(() => undefined);
    }
  }

  function finishStreamedResponse() {
    const remainingSpeech = queuedSpeechRef.current.trim();
    if (remainingSpeech) {
      speechPlaybackBridge.speakQueued(remainingSpeech).catch(() => undefined);
      queuedSpeechRef.current = '';
    }

    const nextTranscript = streamedTranscriptRef.current.trim();
    const reply = streamedResponseRef.current.trim();
    if (nextTranscript && reply) {
      setHistory(current => [
        ...current,
        { role: 'user', text: nextTranscript },
        { role: 'model', text: reply },
      ]);
      setTurnCount(current => current + 1);
    }
    setStatus('ready');
  }

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
      clearRecordingTimeout();
      clearResponseStream();
      liveStreamSessionRef.current?.close();
      liveStreamSessionRef.current = null;
      speechPlaybackBridge.stop().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    scrollTranscriptToEnd();
  }, [transcript, visibleResponseText, status]);

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
    clearResponseStream();
    streamedTranscriptRef.current = '';
    streamedResponseRef.current = '';
    queuedSpeechRef.current = '';
    setTranscript('');
    setResponseText('');
    setVisibleResponseText('');

    if (isLiveVoiceStreamingSupported()) {
      const session = createLiveVoiceStreamSession({
        context: contextSummary,
        history,
        callbacks: {
          onTranscriptDelta(text) {
            streamedTranscriptRef.current += text;
            setTranscript(streamedTranscriptRef.current);
            scrollTranscriptToEnd();
          },
          onTranscriptDone(text) {
            streamedTranscriptRef.current = text || streamedTranscriptRef.current;
            setTranscript(streamedTranscriptRef.current);
            setStatus('thinking');
            scrollTranscriptToEnd();
          },
          onResponseDelta(text) {
            appendStreamedResponse(text);
          },
          onResponseDone() {
            finishStreamedResponse();
          },
          onError(message) {
            setStatus('error');
            setError(message);
            setIsMicOn(false);
          },
          onClose() {
            liveStreamSessionRef.current = null;
          },
        },
      });
      liveStreamSessionRef.current = session;
      await session.start();
      setRecordedAudioPath(null);
      setStatus('recording');
      setIsMicOn(true);
      clearRecordingTimeout();
      recordingTimeoutRef.current = setTimeout(() => {
        stopRecording().catch(() => {
          setStatus('error');
          setError('Voice mode failed. Please try again.');
        });
      }, 30_000);
      return;
    }

    const startedRecordingPath = await audioRecordingBridge.startRecording();
    if (startedRecordingPath === null && audioRecordingBridge.state === 'expo_native') {
      setStatus('error');
      setError('Could not access the microphone. Please allow permissions.');
      setIsMicOn(false);
      return;
    }

    setRecordedAudioPath(startedRecordingPath);
    setStatus('recording');
    setIsMicOn(true);
    clearRecordingTimeout();
    recordingTimeoutRef.current = setTimeout(() => {
      stopRecording().catch(() => {
        setStatus('error');
        setError('Voice mode failed. Please try again.');
      });
    }, MAX_RECORDING_MS);
  }

  async function stopRecording() {
    clearRecordingTimeout();
    setError(null);
    setIsMicOn(false);

    if (liveStreamSessionRef.current) {
      setStatus('thinking');
      await liveStreamSessionRef.current.stopAndCommit();
      return;
    }

    setStatus('transcribing');

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

      if (speechPlaybackBridge.state === 'expo_native') {
        setStatus('speaking');
        const streamPromise = streamResponseText(reply);
        await speechPlaybackBridge.speak(reply, { lowLatency: true });
        await streamPromise;
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
    if (!responseText.trim() || speechPlaybackBridge.state !== 'expo_native') {
      return;
    }

    setStatus('speaking');
    await speechPlaybackBridge.stop().catch(() => undefined);
    const streamPromise = streamResponseText(responseText);
    await speechPlaybackBridge.speak(responseText, { lowLatency: true });
    await streamPromise;
    setStatus('ready');
  }

  function closeScreen() {
    clearRecordingTimeout();
    clearResponseStream();
    liveStreamSessionRef.current?.close();
    liveStreamSessionRef.current = null;
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

  const displayedResponseText = visibleResponseText || responseText;

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
            disabled={!responseText || speechPlaybackBridge.state !== 'expo_native'}
            style={[
              styles.secondaryButton,
              (!responseText || speechPlaybackBridge.state !== 'expo_native') &&
                styles.secondaryButtonDisabled,
            ]}>
            <RotateCcw size={16} color="#dbeafe" />
            <Text style={styles.secondaryButtonText}>Replay answer</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={transcriptScrollRef}
          style={styles.transcriptPanel}
          contentContainerStyle={styles.transcriptContent}
          onContentSizeChange={scrollTranscriptToEnd}>
          <View style={styles.contextCard}>
            <Text style={styles.contextEyebrow}>Voice transcript</Text>

            {transcript ? (
              <View style={styles.transcriptTurn}>
                <Text style={styles.messageEyebrow}>You said</Text>
                <Text style={styles.transcriptText}>{transcript}</Text>
              </View>
            ) : null}

            {displayedResponseText ? (
              <View style={styles.transcriptTurn}>
                <Text style={styles.messageEyebrow}>Tutor voice</Text>
                <Text style={styles.transcriptText}>{displayedResponseText}</Text>
              </View>
            ) : null}

            {status === 'transcribing' || status === 'thinking' ? (
              <View style={styles.processingRow}>
                <ActivityIndicator size="small" color="#67e8f9" />
                <Text style={styles.processingText}>
                  {status === 'transcribing' ? 'Preparing your words...' : 'Preparing voice reply...'}
                </Text>
              </View>
            ) : null}
          </View>
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
    paddingBottom: 12,
  },
  contextCard: {
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.12)',
    padding: 14,
    minHeight: 150,
  },
  contextEyebrow: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  transcriptTurn: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.14)',
    paddingTop: 12,
    marginTop: 12,
  },
  transcriptText: {
    color: '#eff6ff',
    fontSize: 16,
    lineHeight: 24,
  },
  processingRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.14)',
    paddingTop: 12,
    marginTop: 12,
  },
  processingText: {
    color: '#bae6fd',
    fontSize: 13,
    fontWeight: '700',
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
});
