import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Mic, Plus } from 'lucide-react-native';

interface BottomChatBarProps {
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onOpen?: () => void;
  onAddAttachment?: () => void;
  onOpenLive?: () => void;
}

export function BottomChatBar({
  onOpen,
  onAddAttachment,
  onOpenLive,
}: BottomChatBarProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.inner}>
        <Text style={styles.label}>Ask AI Tutor</Text>

        <View style={styles.row}>
          <View style={styles.inputShell}>
            <Pressable
              accessibilityLabel="bottom-chat-add-attachment"
              onPress={onAddAttachment || onOpen}
              style={styles.plusButton}>
              <View style={styles.plusBadge}>
                <Plus color="#2563EB" size={15} strokeWidth={2.8} />
              </View>
            </Pressable>

            <Pressable
              accessibilityLabel="bottom-chat-input"
              accessibilityRole="button"
              onPress={onOpen}
              style={({ pressed }) => [
                styles.input,
                pressed && styles.inputPressed,
              ]}>
              <Text style={styles.inputPlaceholder}>Ask AI Anything</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={onOpenLive}
            accessibilityLabel="bottom-chat-live"
            style={({ pressed }) => [
              styles.micButton,
              pressed && styles.buttonPressed,
            ]}>
            <Mic color="#4B5563" size={20} strokeWidth={2.4} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E5E7EB',
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingBottom: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
    position: 'absolute',
    right: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
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
    borderRadius: 14,
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
    alignSelf: 'stretch',
    flex: 1,
    justifyContent: 'center',
    paddingRight: 16,
    paddingVertical: 12,
  },
  inputPlaceholder: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  inputPressed: { opacity: 0.72 },
  micButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 14,
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
