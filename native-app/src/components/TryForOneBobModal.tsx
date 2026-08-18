import React from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { OnboardingMascotKey } from '../types/app';
import { LEARNING_MASCOT_SOURCES } from '../features/progressiveLearning/components/LearningMascotReaction';

interface TryForOneBobModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  mascotKey?: OnboardingMascotKey;
  error?: string | null;
  onClose: () => void;
  onAccept: () => void;
}

export function TryForOneBobModal({
  isOpen,
  isSubmitting,
  mascotKey,
  error,
  onClose,
  onAccept,
}: TryForOneBobModalProps) {
  const resolvedMascotKey: OnboardingMascotKey =
    mascotKey && LEARNING_MASCOT_SOURCES[mascotKey] ? mascotKey : 'rabbit';

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.card}>
          <Image
            accessibilityLabel={`Selected ${resolvedMascotKey} mascot`}
            resizeMode="contain"
            source={LEARNING_MASCOT_SOURCES[resolvedMascotKey]}
            style={styles.mascot}
          />
          <Text style={styles.title}>Start Your Free 1-Month Trial</Text>
          <Text style={styles.body}>
            Enjoy full Kitabu AI access for one month.
          </Text>
          <Text style={styles.meta}>No payment required.</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            disabled={isSubmitting}
            onPress={onAccept}
            style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}>
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>Start Free Trial</Text>
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
  mascot: {
    alignSelf: 'center',
    height: 72,
    width: 72,
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
  error: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
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
