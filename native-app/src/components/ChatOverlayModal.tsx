import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Camera,
  FileText,
  Image as ImageIcon,
  Mic,
  Plus,
  Send,
  Sparkles,
  X,
} from 'lucide-react-native';

import {
  Assignment,
  Attachment,
  ChatMessage,
  Subject,
  SubStrand,
  UserProfile,
} from '../types/app';
import { LiveAudioTutorScreen } from '../screens/LiveAudioTutorScreen';
import { ReportAiContentSheet } from './ReportAiContentSheet';
import { chatAttachmentBridge } from '../services/nativeBridges';

const logoAsset = require('../assets/logo.png');

interface ChatOverlayModalProps {
  isOpen: boolean;
  isLoading: boolean;
  messages: ChatMessage[];
  currentGrade?: string;
  selectedSubject?: Subject | null;
  selectedSubStrand?: SubStrand | null;
  selectedAssignment?: Assignment | null;
  userProfile?: UserProfile;
  startLiveAudio?: boolean;
  attachmentPickerSignal?: number;
  onClose: () => void;
  onSendMessage: (message: string, attachment?: Attachment) => void;
  onStartLiveAudio?: () => void;
  onCloseLiveAudio?: () => void;
  onOpenLiveScreen?: () => void;
}

const WELCOME_SUBJECTS = [
  {
    label: 'Social Studies',
    color: '#F97316',
    query: 'I need help with Social Studies',
  },
  {
    label: 'English',
    color: '#22C55E',
    query: 'I need help with English',
  },
  {
    label: 'Mathematics',
    color: '#2563EB',
    query: 'I need help with Mathematics',
  },
  {
    label: 'Science',
    color: '#7C3AED',
    query: 'I need help with Science',
  },
];

function cleanModelMessageText(text: string) {
  const withoutMarkdown = text
    .replace(/\r\n/g, '\n')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .trim();

  const metadataLine = /^(question acknowledged|subject|grade level adaptation|grade level|student level|active subject|active strand|active sub-strand|curriculum scope)\b/i;

  return withoutMarkdown
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !metadataLine.test(line))
    .join('\n');
}

function ChatMessageContent({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return <Text style={styles.messageText}>{message.text}</Text>;
  }

  const lines = cleanModelMessageText(message.text).split('\n').filter(Boolean);

  return (
    <View style={styles.formattedMessage}>
      {lines.map((line, index) => {
        const listMatch = line.match(/^(\d+[.)]|[-\u2022])\s+(.*)$/);
        if (listMatch) {
          return (
            <View key={`${line}-${index}`} style={styles.messageListLine}>
              <Text style={styles.messageListMarker}>{listMatch[1].replace(')', '.')}</Text>
              <Text style={styles.messageParagraph}>{listMatch[2]}</Text>
            </View>
          );
        }

        return (
          <Text key={`${line}-${index}`} style={styles.messageParagraph}>
            {line}
          </Text>
        );
      })}
    </View>
  );
}

export function ChatOverlayModal({
  isOpen,
  isLoading,
  messages,
  currentGrade,
  selectedSubject,
  selectedSubStrand,
  selectedAssignment,
  userProfile,
  startLiveAudio,
  attachmentPickerSignal = 0,
  onClose,
  onSendMessage,
  onStartLiveAudio,
  onCloseLiveAudio,
  onOpenLiveScreen,
}: ChatOverlayModalProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const isWelcomeView = messages.length === 0;

  useEffect(() => {
    if (isOpen) {
      const timeout = setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 200);

      return () => clearTimeout(timeout);
    }

    return undefined;
  }, [isLoading, isOpen, messages]);

  useEffect(() => {
    if (isOpen && attachmentPickerSignal > 0) {
      setAttachmentMenuOpen(true);
    }
  }, [attachmentPickerSignal, isOpen]);

  function handleSubmit() {
    if ((!input.trim() && !pendingAttachment) || isLoading) {
      return;
    }

    onSendMessage(input.trim() || 'Please help me understand this attachment.', pendingAttachment ?? undefined);
    setInput('');
    setPendingAttachment(null);
    setAttachmentMenuOpen(false);
    setAttachmentError(null);
  }

  async function pickAttachment(kind: 'photo' | 'image' | 'file') {
    setAttachmentError(null);

    try {
      const attachment =
        kind === 'photo'
          ? await chatAttachmentBridge.takePhoto()
          : kind === 'image'
            ? await chatAttachmentBridge.pickImage()
            : await chatAttachmentBridge.pickFile();

      if (!attachment) {
        setAttachmentError('Attachment is not available on this device.');
        return;
      }

      setPendingAttachment(attachment);
      setAttachmentMenuOpen(false);
    } catch (error) {
      setAttachmentError(
        error instanceof Error ? error.message : 'Could not attach that item.',
      );
    }
  }

  return (
    <Modal
      animationType="fade"
      transparent
      visible={isOpen}
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View accessibilityLabel="chat-overlay-sheet" style={styles.sheet}>
          {startLiveAudio ? (
            <View style={styles.liveAudioLayer}>
              <LiveAudioTutorScreen
                onClose={onCloseLiveAudio || onClose}
                initialMessages={messages}
                currentGrade={currentGrade}
                selectedSubject={selectedSubject}
                selectedSubStrand={selectedSubStrand}
                selectedAssignment={selectedAssignment}
                userProfile={userProfile}
              />
            </View>
          ) : null}

          <View style={styles.header}>
            <View style={styles.headerBrand}>
              <View style={styles.headerIconWrap}>
                <Image source={logoAsset} style={styles.headerLogo} resizeMode="contain" />
              </View>
              <View>
                <Text style={styles.headerTitle}>KITABU AI TUTOR</Text>
                <View style={styles.onlineRow}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>Online</Text>
                </View>
              </View>
            </View>

            <Pressable accessibilityLabel="chat-overlay-close" onPress={onClose} style={styles.closeButton}>
              <X color="rgba(255,255,255,0.8)" size={22} strokeWidth={2.3} />
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.content}
            contentContainerStyle={styles.contentInner}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {isWelcomeView ? (
              <View style={styles.welcomeWrap}>
                <View style={styles.welcomeCopy}>
                  <Text style={styles.welcomeTitle}>Hi Student! 👋</Text>
                  <Text style={styles.welcomeBody}>
                    I&apos;m Kitabu, your AI learning companion.
                  </Text>
                  <Text style={styles.welcomeBody}>
                    What subject would you like to explore today?
                  </Text>
                </View>

                <View style={styles.subjectPromptGrid}>
                  {WELCOME_SUBJECTS.map(item => (
                    <Pressable
                      key={item.label}
                      accessibilityLabel={`chat-prompt-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      onPress={() => onSendMessage(item.query)}
                      style={[styles.subjectPromptButton, { backgroundColor: item.color }]}>
                      <Text style={styles.subjectPromptText}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.poweredWrap}>
                  <Sparkles color="rgba(255,255,255,0.4)" size={14} strokeWidth={2.4} />
                  <Text style={styles.poweredText}>AI-Powered Learning</Text>
                </View>
              </View>
            ) : (
              <View style={styles.messageList}>
                {messages.map((message, index) => {
                  return (
                    <View
                      key={`${message.role}-${index}-${message.text}`}
                      accessibilityLabel={`chat-message-${message.role}-${index}`}
                      style={[
                        styles.messageRow,
                        message.role === 'user'
                          ? styles.messageRowUser
                          : styles.messageRowModel,
                      ]}>
                      {message.attachment ? (
                        <View
                          style={[
                            styles.attachmentCard,
                            message.role === 'user'
                              ? styles.attachmentCardUser
                              : styles.attachmentCardModel,
                          ]}>
                          <FileText color="#FFFFFF" size={18} strokeWidth={2.2} />
                          <Text style={styles.attachmentLabel}>
                            {message.attachment.name || 'File'}
                          </Text>
                        </View>
                      ) : null}

                      <View
                        style={[
                          styles.messageBubble,
                          message.role === 'user'
                            ? styles.messageBubbleUser
                            : styles.messageBubbleModel,
                        ]}>
                        <ChatMessageContent message={message} />
                      </View>

                      {message.role === 'model' ? (
                        <ReportAiContentSheet
                          accessibilityLabel="Report AI response"
                          contentText={message.text}
                          context={{
                            currentGrade: currentGrade ?? null,
                            selectedSubject: selectedSubject?.name ?? null,
                            selectedSubStrand: selectedSubStrand?.title ?? null,
                            selectedAssignment: selectedAssignment?.title ?? null,
                            messageIndex: index,
                          }}
                          source="chat_tutor"
                          tone="dark"
                        />
                      ) : null}
                    </View>
                  );
                })}

                {isLoading ? (
                  <View style={styles.messageRowModel}>
                    <View style={styles.loadingBubble}>
                      <View style={[styles.loadingDot, styles.loadingDotOne]} />
                      <View style={[styles.loadingDot, styles.loadingDotTwo]} />
                      <View style={[styles.loadingDot, styles.loadingDotThree]} />
                    </View>
                  </View>
                ) : null}
              </View>
            )}
          </ScrollView>

          <View style={styles.inputBar}>
            <View style={styles.inputShell}>
              <Pressable
                accessibilityLabel="chat-overlay-add-attachment"
                onPress={() => setAttachmentMenuOpen(open => !open)}
                style={styles.inputPlusButton}>
                <Plus color="rgba(255,255,255,0.9)" size={18} strokeWidth={2.4} />
              </Pressable>

              <View style={styles.composerStack}>
                {pendingAttachment ? (
                  <View style={styles.pendingAttachment}>
                    <FileText color="#93C5FD" size={16} strokeWidth={2.3} />
                    <Text style={styles.pendingAttachmentText} numberOfLines={1}>
                      {pendingAttachment.name || (pendingAttachment.type === 'image' ? 'Image' : 'File')}
                    </Text>
                    <Pressable
                      accessibilityLabel="chat-overlay-remove-attachment"
                      onPress={() => setPendingAttachment(null)}
                      style={styles.removeAttachmentButton}>
                      <X color="rgba(255,255,255,0.74)" size={14} strokeWidth={2.4} />
                    </Pressable>
                  </View>
                ) : null}

                <TextInput
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={handleSubmit}
                  placeholder={
                    pendingAttachment
                      ? 'Ask a question about this...'
                      : isWelcomeView
                        ? 'Ask me anything...'
                        : 'Type your question...'
                  }
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  returnKeyType="send"
                  accessibilityLabel="chat-overlay-input"
                  style={styles.input}
                />
              </View>
            </View>

            {input.trim() || pendingAttachment ? (
              <Pressable accessibilityLabel="chat-overlay-send" onPress={handleSubmit} style={styles.primaryActionButton}>
                <Send color="#FFFFFF" size={20} strokeWidth={2.4} />
              </Pressable>
            ) : (
              <Pressable
                onPress={onStartLiveAudio || onOpenLiveScreen}
                accessibilityLabel="chat-overlay-live"
                style={styles.liveActionButton}>
                <Mic color="#FFFFFF" size={20} strokeWidth={2.4} />
              </Pressable>
            )}

            {attachmentMenuOpen ? (
              <View style={styles.attachmentMenu}>
                <AttachmentAction
                  icon={Camera}
                  label="Take photo"
                  onPress={() => pickAttachment('photo')}
                />
                <AttachmentAction
                  icon={ImageIcon}
                  label="Attach image"
                  onPress={() => pickAttachment('image')}
                />
                <AttachmentAction
                  icon={FileText}
                  label="Attach file"
                  onPress={() => pickAttachment('file')}
                />
                {attachmentError ? (
                  <Text style={styles.attachmentError}>{attachmentError}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AttachmentAction({
  icon: Icon,
  label,
  onPress,
}: {
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`chat-overlay-${label.toLowerCase().replace(/\s+/g, '-')}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.attachmentAction,
        pressed && styles.attachmentActionPressed,
      ]}>
      <Icon color="#DBEAFE" size={18} strokeWidth={2.4} />
      <Text style={styles.attachmentActionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 28,
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheet: {
    backgroundColor: 'rgba(17,24,39,0.96)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 30,
    borderWidth: 1,
    height: '88%',
    overflow: 'hidden',
  },
  liveAudioLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerBrand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  headerIconWrap: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerLogo: {
    height: 24,
    width: 24,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  onlineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  onlineDot: {
    backgroundColor: '#22C55E',
    borderRadius: 4,
    height: 6,
    width: 6,
  },
  onlineText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
  },
  closeButton: {
    borderRadius: 999,
    padding: 8,
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
  contentInner: {
    flexGrow: 1,
    paddingBottom: 112,
  },
  welcomeWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  welcomeCopy: {
    marginBottom: 24,
  },
  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 8,
  },
  welcomeBody: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 22,
  },
  subjectPromptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  subjectPromptButton: {
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '48%',
  },
  subjectPromptText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  poweredWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 'auto',
    paddingBottom: 16,
  },
  poweredText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  messageList: {
    gap: 12,
    padding: 16,
  },
  messageRow: {
    maxWidth: '85%',
  },
  messageRowUser: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
  },
  messageRowModel: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
  },
  reportButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    marginTop: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  reportButtonSubmitted: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderColor: 'rgba(134,239,172,0.32)',
  },
  reportButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '700',
  },
  reportButtonTextSubmitted: {
    color: '#86EFAC',
  },
  reportError: {
    alignSelf: 'flex-start',
    color: '#FCA5A5',
    fontSize: 12,
    lineHeight: 17,
    marginHorizontal: 4,
  },
  attachmentCard: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  attachmentCardUser: {
    backgroundColor: 'rgba(37,99,235,0.52)',
  },
  attachmentCardModel: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  attachmentLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  messageBubbleUser: {
    backgroundColor: '#2563EB',
    borderTopRightRadius: 6,
  },
  messageBubbleModel: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderTopLeftRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 21,
  },
  formattedMessage: {
    gap: 8,
  },
  messageParagraph: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 21,
  },
  messageListLine: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  messageListMarker: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 21,
    minWidth: 18,
  },
  loadingBubble: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 15,
    borderTopLeftRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  loadingDot: {
    backgroundColor: '#60A5FA',
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  loadingDotOne: {
    opacity: 0.5,
  },
  loadingDotTwo: {
    opacity: 0.7,
  },
  loadingDotThree: {
    opacity: 1,
  },
  inputBar: {
    backgroundColor: 'rgba(0,0,0,0.18)',
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    position: 'relative',
    zIndex: 2,
  },
  inputShell: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
  },
  inputPlusButton: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  composerStack: {
    flex: 1,
    paddingRight: 10,
  },
  pendingAttachment: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(37,99,235,0.34)',
    borderColor: 'rgba(147,197,253,0.32)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    maxWidth: '100%',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  pendingAttachmentText: {
    color: '#FFFFFF',
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '800',
  },
  removeAttachmentButton: {
    padding: 2,
  },
  input: {
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 14,
  },
  primaryActionButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 11,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  liveActionButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.9)',
    borderRadius: 11,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  attachmentMenu: {
    backgroundColor: 'rgba(15,23,42,0.98)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    borderWidth: 1,
    bottom: 78,
    gap: 4,
    left: 16,
    padding: 8,
    position: 'absolute',
    width: 190,
    zIndex: 4,
  },
  attachmentAction: {
    alignItems: 'center',
    borderRadius: 9,
    flexDirection: 'row',
    gap: 10,
    minHeight: 42,
    paddingHorizontal: 10,
  },
  attachmentActionPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  attachmentActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  attachmentError: {
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
