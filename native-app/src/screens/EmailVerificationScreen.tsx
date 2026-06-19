import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MailCheck } from 'lucide-react-native';

interface EmailVerificationScreenProps {
  email: string;
  onResend: () => Promise<string>;
  onSignOut: () => void;
}

export function EmailVerificationScreen({
  email,
  onResend,
  onSignOut,
}: EmailVerificationScreenProps) {
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setIsSending(true);
    setMessage(null);
    setError(null);
    try {
      setMessage(await onResend());
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : 'Unable to resend verification email');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.iconWrap}>
        <MailCheck color="#2563EB" size={42} strokeWidth={2} />
      </View>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.copy}>
        We sent a verification link to {email}. Open it on this device to continue.
      </Text>
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        accessibilityLabel="Resend verification email"
        disabled={isSending}
        onPress={resend}
        style={styles.primaryButton}>
        {isSending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Resend email</Text>}
      </Pressable>
      <Pressable accessibilityLabel="Use another account" onPress={onSignOut} style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>Use another account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 28,
  },
  iconWrap: {
    width: 82,
    height: 82,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
    marginBottom: 24,
  },
  title: { color: '#0F172A', fontSize: 28, fontWeight: '800', textAlign: 'center' },
  copy: { color: '#475569', fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 12, marginBottom: 22 },
  success: { color: '#166534', fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 14 },
  error: { color: '#B91C1C', fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 14 },
  primaryButton: {
    width: '100%',
    minHeight: 54,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
  },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  secondaryButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, marginTop: 10 },
  secondaryText: { color: '#334155', fontSize: 15, fontWeight: '700' },
});
