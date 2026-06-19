import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { BillingPlan, BillingPlanCode } from '../types/app';

interface SubscriptionCheckoutModalProps {
  isOpen: boolean;
  plans: BillingPlan[];
  selectedPlanCode: BillingPlanCode | null;
  phoneNumber: string;
  maskedSavedPhoneNumber: string | null;
  isSubmitting: boolean;
  statusLabel: string | null;
  error: string | null;
  onClose: () => void;
  onSelectPlan: (planCode: BillingPlanCode) => void;
  onChangePhoneNumber: (value: string) => void;
  onUseSavedPhone: () => void;
  onContinue: () => void;
}

export function SubscriptionCheckoutModal({
  isOpen,
  plans,
  selectedPlanCode,
  phoneNumber,
  maskedSavedPhoneNumber,
  isSubmitting,
  statusLabel,
  error,
  onClose,
  onSelectPlan,
  onChangePhoneNumber,
  onUseSavedPhone,
  onContinue,
}: SubscriptionCheckoutModalProps) {
  const visiblePlans = useMemo(() => {
    const order: Record<string, number> = { weekly: 1, monthly: 2, annual: 3 };
    return [...plans].sort((left, right) => (order[left.code] ?? 99) - (order[right.code] ?? 99));
  }, [plans]);
  const selectedPlan = visiblePlans.find(plan => plan.code === selectedPlanCode) ?? null;

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.card}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </Pressable>

          <Text style={styles.title}>Become Top of Your Class Faster</Text>
          <Text style={styles.subtitle}>
            Unlock homework, quizzes, BrainTease, and Let's Learn with one quick M-Pesa checkout.
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>MONTHLY 50% OFF - Fast STK Push checkout</Text>
          </View>

          <View style={styles.planRow}>
            {visiblePlans.map(plan => {
              const selected = plan.code === selectedPlanCode;
              return (
                <Pressable
                  key={plan.code}
                  onPress={() => onSelectPlan(plan.code)}
                  style={[
                    styles.planCard,
                    plan.isPopular && styles.planCardPopular,
                    selected && styles.planCardSelected,
                  ]}>
                  {plan.isPopular ? (
                    <View style={styles.popularTag}>
                      <Text style={styles.popularTagText}>POPULAR</Text>
                    </View>
                  ) : null}
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planPrice}>KSh {plan.priceKsh.toLocaleString()}</Text>
                  {plan.originalPriceKsh && plan.originalPriceKsh > plan.priceKsh ? (
                    <Text style={styles.planOriginalPrice}>KSh {plan.originalPriceKsh.toLocaleString()}</Text>
                  ) : null}
                  <Text style={styles.planCycle}>per {plan.billingCycle}</Text>
                  {plan.discountLabel ? (
                    <Text style={styles.discountText}>{plan.discountLabel}</Text>
                  ) : null}
                  <View style={[styles.radioDot, selected && styles.radioDotSelected]} />
                </Pressable>
              );
            })}
          </View>
          {!selectedPlan ? (
            <Text style={styles.selectHint}>Pick a package to continue with the main checkout flow.</Text>
          ) : null}

          <View style={styles.featureList}>
            <Text style={styles.featureItem}>Unlimited revision papers</Text>
            <Text style={styles.featureItem}>Personal AI tutor access</Text>
            <Text style={styles.featureItem}>Track your progress</Text>
          </View>

          <View style={styles.phoneWrap}>
            <Text style={styles.phoneLabel}>M-Pesa Number</Text>
            <TextInput
              value={phoneNumber}
              onChangeText={onChangePhoneNumber}
              keyboardType="phone-pad"
              autoCapitalize="none"
              placeholder="2547XXXXXXXX"
              placeholderTextColor="#94a3b8"
              style={styles.phoneInput}
            />
            {maskedSavedPhoneNumber ? (
              <Pressable style={styles.savedPhoneButton} onPress={onUseSavedPhone}>
                <Text style={styles.savedPhoneButtonText}>Use saved number {maskedSavedPhoneNumber}</Text>
              </Pressable>
            ) : null}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {statusLabel ? <Text style={styles.statusText}>{statusLabel}</Text> : null}

          <Pressable
            onPress={() => onContinue()}
            disabled={!selectedPlan || isSubmitting}
            style={[styles.continueButton, (!selectedPlan || isSubmitting) && styles.continueButtonDisabled]}>
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.continueButtonText}>
                Continue - KSh {selectedPlan?.priceKsh.toLocaleString() ?? '--'}
              </Text>
            )}
          </Pressable>

          <Text style={styles.footerText}>Free to cancel any time</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'center',
    padding: 18,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 18,
    alignSelf: 'stretch',
    shadowColor: '#020617',
    shadowOpacity: 0.24,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 20 },
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    right: 14,
    top: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 26,
    color: '#64748b',
  },
  title: {
    color: '#0f172a',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  subtitle: {
    marginTop: 14,
    color: '#64748b',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  badge: {
    alignSelf: 'center',
    marginTop: 16,
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 24,
  },
  planCard: {
    flex: 1,
    minHeight: 156,
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planCardPopular: {
    transform: [{ scale: 1.04 }],
  },
  planCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eef5ff',
  },
  popularTag: {
    position: 'absolute',
    top: -12,
    backgroundColor: '#f97316',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  popularTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  planName: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  planPrice: {
    color: '#0f172a',
    fontSize: 26,
    fontWeight: '900',
  },
  planCycle: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  planOriginalPrice: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'line-through',
  },
  discountText: {
    color: '#0f766e',
    fontSize: 11,
    fontWeight: '800',
  },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#93c5fd',
    backgroundColor: '#fff',
  },
  radioDotSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  featureList: {
    marginTop: 24,
    gap: 8,
  },
  featureItem: {
    color: '#334155',
    fontSize: 16,
    textAlign: 'center',
  },
  phoneWrap: {
    marginTop: 24,
    backgroundColor: '#f8fbff',
    borderRadius: 18,
    padding: 14,
  },
  phoneLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  phoneInput: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbeafe',
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
  },
  savedPhoneButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  savedPhoneButtonText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  errorText: {
    marginTop: 12,
    color: '#dc2626',
    textAlign: 'center',
    fontWeight: '700',
  },
  statusText: {
    marginTop: 12,
    color: '#0f766e',
    textAlign: 'center',
    fontWeight: '700',
  },
  selectHint: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  continueButton: {
    marginTop: 18,
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  continueButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '900',
  },
  footerText: {
    marginTop: 12,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 13,
  },
});
