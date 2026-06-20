import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface TryForOneBobModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  phoneNumber: string;
  onClose: () => void;
  onAccept: () => void;
}

export function TryForOneBobModal({
  isOpen,
  isSubmitting,
  phoneNumber,
  onClose,
  onAccept,
}: TryForOneBobModalProps) {
  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.emoji}>🔥</Text>
          <Text style={styles.title}>Try 1 month for 1 bob</Text>
          <Text style={styles.body}>
            Pay KSh 1 and unlock Kitabu AI for a month.
          </Text>
          <Text style={styles.meta}>Checkout will use {phoneNumber || 'your M-Pesa number'}.</Text>

          <Pressable
            disabled={isSubmitting}
            onPress={onAccept}
            style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}>
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>Pay KSh 1</Text>
            )}
          </Pressable>

          <Pressable onPress={onClose} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Maybe later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(15,23,42,0.64)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    backgroundColor: '#FFF7ED',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  emoji: {
    fontSize: 42,
    textAlign: 'center',
  },
  title: {
    color: '#7c2d12',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 8,
    textAlign: 'center',
  },
  body: {
    color: '#9a3412',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    textAlign: 'center',
  },
  meta: {
    color: '#78716c',
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#ea580c',
    borderRadius: 18,
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 54,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 44,
  },
  secondaryText: {
    color: '#9a3412',
    fontSize: 14,
    fontWeight: '700',
  },
});
