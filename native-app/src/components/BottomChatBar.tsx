import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Mic, Plus, Send } from 'lucide-react-native';

interface BottomChatBarProps {
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onOpen?: () => void;
  onAddAttachment?: () => void;
  onOpenLive?: () => void;
}

export function BottomChatBar({
  isLoading,
  onSendMessage,
  onOpen,
  onAddAttachment,
  onOpenLive,
}: BottomChatBarProps) {
  const [input, setInput] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', event => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  function handleSubmit() {
    if (!input.trim() || isLoading) {
      return;
    }

    onSendMessage(input.trim());
    setInput('');
    Keyboard.dismiss();
  }

  return (
    <View
      style={[styles.wrap, keyboardHeight > 0 && { bottom: keyboardHeight }]}
    >
      <View style={styles.inner}>
        <Text style={styles.label}>Ask AI Tutor</Text>

        <View style={styles.row}>
          <View style={styles.inputShell}>
            <Pressable
              accessibilityLabel="bottom-chat-add-attachment"
              onPress={onAddAttachment || onOpen}
              style={styles.plusButton}
            >
              <View style={styles.plusBadge}>
                <Plus color="#2563EB" size={15} strokeWidth={2.8} />
              </View>
            </Pressable>

            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSubmit}
              placeholder="Ask AI Anything"
              placeholderTextColor="#6B7280"
              returnKeyType="send"
              accessibilityLabel="bottom-chat-input"
              style={styles.input}
            />
          </View>

          {input.trim() ? (
            <Pressable
              onPress={handleSubmit}
              disabled={isLoading}
              accessibilityLabel="bottom-chat-send"
              style={({ pressed }) => [
                styles.sendButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Send color="#FFFFFF" size={20} strokeWidth={2.4} />
            </Pressable>
          ) : (
            <Pressable
              onPress={onOpenLive}
              accessibilityLabel="bottom-chat-live"
              style={({ pressed }) => [
                styles.micButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Mic color="#4B5563" size={20} strokeWidth={2.4} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: 'rgba(203,213,225,0.9)',
    borderRadius: 10,
    borderWidth: 1,
    bottom: 12,
    left: 12,
    paddingBottom: 10,
    paddingHorizontal: 10,
    paddingTop: 9,
    position: 'absolute',
    right: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  inner: {
    alignSelf: 'center',
    maxWidth: 560,
    width: '100%',
  },
  label: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
    borderRadius: 7,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    minHeight: 50,
  },
  plusButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  plusBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 999,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  input: {
    color: '#111827',
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    paddingRight: 16,
    paddingVertical: 12,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 7,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  micButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 7,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  buttonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.97 }],
  },
});
