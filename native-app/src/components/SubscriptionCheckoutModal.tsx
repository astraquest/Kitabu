import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Check, LockKeyhole, Phone, ShieldCheck, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
  onContinue: (planCode?: BillingPlanCode) => void;
}

const PLAN_ORDER: Record<string, number> = { weekly: 1, monthly: 2, annual: 3 };
const FEATURES = ['Unlimited Revision Papers', 'Personal AI Tutor 24/7', 'Track Your Progress'];

function getCycleLabel(plan: BillingPlan) {
  if (plan.billingCycle === 'annual') {
    return 'year';
  }
  if (plan.billingCycle === 'weekly') {
    return 'week';
  }
  return 'month';
}

function getDiscountLabel(plan: BillingPlan) {
  if (plan.discountLabel) {
    return plan.discountLabel.toUpperCase();
  }
  if (plan.originalPriceKsh && plan.originalPriceKsh > plan.priceKsh) {
    const percent = Math.round((1 - plan.priceKsh / plan.originalPriceKsh) * 100);
    return `${percent}% OFF`;
  }
  return null;
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
  const { height, width } = useWindowDimensions();
  const compact = height < 760 || width < 380;
  const visiblePlans = useMemo(
    () => [...plans].sort((left, right) => (PLAN_ORDER[left.code] ?? 99) - (PLAN_ORDER[right.code] ?? 99)),
    [plans],
  );
  const featuredPlan =
    visiblePlans.find(plan => plan.code === selectedPlanCode) ??
    visiblePlans.find(plan => plan.isPopular) ??
    visiblePlans.find(plan => plan.code === 'monthly') ??
    visiblePlans[0] ??
    null;
  const cycleLabel = featuredPlan ? getCycleLabel(featuredPlan) : 'month';
  const discountLabel = featuredPlan ? getDiscountLabel(featuredPlan) : null;

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <LinearGradient
          colors={['#FFF7ED', '#FFFFFF', '#FFEDD5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.card,
            {
              maxHeight: Math.round(height * 0.92),
              borderRadius: compact ? 22 : 28,
            },
          ]}>
          <ScrollView
            contentContainerStyle={[
              styles.content,
              compact && styles.contentCompact,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close payment modal"
              onPress={onClose}
              style={styles.closeButton}>
              <X color="#64748B" size={28} strokeWidth={2.2} />
            </Pressable>

            <Text style={[styles.title, compact && styles.titleCompact]}>
              Become Top of Your Class in Just 3 Months
            </Text>
            <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>
              Join thousands of students already improving their grades.
            </Text>

            <View style={styles.offerBadge}>
              <Text style={styles.offerBadgeText}>LIMITED TIME OFFER</Text>
            </View>

            {visiblePlans.length > 1 ? (
              <View style={styles.planTabs}>
                {visiblePlans.map(plan => {
                  const active = plan.code === featuredPlan?.code;
                  return (
                    <Pressable
                      key={plan.code}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => onSelectPlan(plan.code)}
                      style={[styles.planTab, active && styles.planTabActive]}>
                      <Text style={[styles.planTabText, active && styles.planTabTextActive]}>
                        {plan.name}
                      </Text>
                      <Text style={[styles.planTabPrice, active && styles.planTabTextActive]}>
                        KSH {plan.priceKsh.toLocaleString()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <View style={[styles.featuredPlanWrap, compact && styles.featuredPlanWrapCompact]}>
              {featuredPlan?.isPopular ? (
                <View style={styles.popularPill}>
                  <Text style={styles.popularPillText}>MOST POPULAR</Text>
                </View>
              ) : null}

              <View style={[styles.featuredPlanCard, compact && styles.featuredPlanCardCompact]}>
                <Text style={styles.planName}>{featuredPlan?.name ?? 'Monthly'}</Text>
                {featuredPlan?.originalPriceKsh && featuredPlan.originalPriceKsh > featuredPlan.priceKsh ? (
                  <Text style={styles.originalPrice}>
                    KSH {featuredPlan.originalPriceKsh.toLocaleString()}
                  </Text>
                ) : null}
                <Text style={[styles.currentPrice, compact && styles.currentPriceCompact]}>
                  KSH {featuredPlan?.priceKsh.toLocaleString() ?? '--'}
                </Text>
                <Text style={styles.planCycle}>per {cycleLabel}</Text>
                {discountLabel ? (
                  <View style={styles.discountPill}>
                    <Text style={styles.discountPillText}>{discountLabel}</Text>
                  </View>
                ) : null}

                <View style={styles.featureList}>
                  {FEATURES.map(feature => (
                    <View key={feature} style={styles.featureRow}>
                      <Check color="#16A34A" size={18} strokeWidth={2.7} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.promiseRow}>
              <ShieldCheck color="#16A34A" fill="#16A34A" size={22} strokeWidth={2.3} />
              <Text style={styles.promiseText}>Cancel anytime. No commitments.</Text>
            </View>

            <View style={styles.phoneInputWrap}>
              <Phone color="#64748B" size={23} strokeWidth={2.1} />
              <View style={styles.phoneDivider} />
              <TextInput
                value={phoneNumber}
                onChangeText={onChangePhoneNumber}
                keyboardType="phone-pad"
                autoCapitalize="none"
                placeholder="2547XXXXXXXX"
                placeholderTextColor="#94A3B8"
                style={styles.phoneInput}
              />
            </View>
            {maskedSavedPhoneNumber ? (
              <Pressable style={styles.savedPhoneButton} onPress={onUseSavedPhone}>
                <Text style={styles.savedPhoneButtonText}>Use saved number {maskedSavedPhoneNumber}</Text>
              </Pressable>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {statusLabel ? <Text style={styles.statusText}>{statusLabel}</Text> : null}

            <Pressable
              onPress={() => featuredPlan && onContinue(featuredPlan.code)}
              disabled={!featuredPlan || isSubmitting}
              style={[styles.continueButton, (!featuredPlan || isSubmitting) && styles.continueButtonDisabled]}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <LockKeyhole color="#FFFFFF" size={22} strokeWidth={2.4} />
                  <Text style={styles.continueButtonText}>
                    Continue to Pay - KSH {featuredPlan?.priceKsh.toLocaleString() ?? '--'}
                  </Text>
                </>
              )}
            </Pressable>

            <Text style={styles.footerText}>Secure &amp; encrypted payment</Text>
          </ScrollView>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.88)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 22,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    alignSelf: 'stretch',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 54,
    paddingBottom: 28,
  },
  contentCompact: {
    paddingHorizontal: 18,
    paddingTop: 46,
    paddingBottom: 22,
  },
  closeButton: {
    position: 'absolute',
    right: 18,
    top: 18,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#0B1020',
    fontSize: 31,
    fontWeight: '900',
    lineHeight: 38,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 25,
    lineHeight: 31,
  },
  subtitle: {
    color: '#5B6472',
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
    marginTop: 18,
    textAlign: 'center',
  },
  subtitleCompact: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  offerBadge: {
    backgroundColor: '#EAF8F0',
    borderColor: '#C8EEDB',
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 22,
    paddingHorizontal: 24,
    paddingVertical: 9,
  },
  offerBadgeText: {
    color: '#06934D',
    fontSize: 15,
    fontWeight: '900',
  },
  planTabs: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
    width: '100%',
  },
  planTab: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  planTabActive: {
    backgroundColor: '#EAF8F0',
    borderColor: '#16A34A',
  },
  planTabText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '900',
  },
  planTabPrice: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  planTabTextActive: {
    color: '#058D49',
  },
  featuredPlanWrap: {
    marginTop: 24,
    paddingTop: 24,
    width: '72%',
  },
  featuredPlanWrapCompact: {
    marginTop: 18,
    width: '100%',
  },
  popularPill: {
    alignSelf: 'center',
    backgroundColor: '#07A64F',
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 10,
    position: 'absolute',
    top: 0,
    zIndex: 2,
  },
  popularPillText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  featuredPlanCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderColor: '#B8E8CE',
    borderRadius: 22,
    borderWidth: 2,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 28,
  },
  featuredPlanCardCompact: {
    paddingHorizontal: 18,
    paddingTop: 40,
    paddingBottom: 20,
  },
  planName: {
    color: '#111827',
    fontSize: 23,
    fontWeight: '900',
  },
  originalPrice: {
    color: '#8B94A1',
    fontSize: 22,
    fontWeight: '600',
    marginTop: 20,
    textDecorationLine: 'line-through',
  },
  currentPrice: {
    color: '#0BA34E',
    fontSize: 44,
    fontWeight: '900',
    lineHeight: 52,
    marginTop: 4,
  },
  currentPriceCompact: {
    fontSize: 38,
    lineHeight: 46,
  },
  planCycle: {
    color: '#5B6472',
    fontSize: 16,
    fontWeight: '600',
  },
  discountPill: {
    backgroundColor: '#EAF8F0',
    borderRadius: 999,
    marginTop: 20,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  discountPillText: {
    color: '#0BA34E',
    fontSize: 18,
    fontWeight: '900',
  },
  featureList: {
    gap: 13,
    marginTop: 28,
    width: '100%',
  },
  featureRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  featureText: {
    color: '#1F2937',
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  promiseRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  promiseText: {
    color: '#5B6472',
    fontSize: 15,
    fontWeight: '600',
  },
  phoneInputWrap: {
    alignItems: 'center',
    borderColor: '#D4DAE3',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 28,
    minHeight: 58,
    paddingHorizontal: 16,
    width: '100%',
  },
  phoneDivider: {
    backgroundColor: '#E2E8F0',
    height: 30,
    marginHorizontal: 14,
    width: 1,
  },
  phoneInput: {
    color: '#111827',
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: 12,
  },
  savedPhoneButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  savedPhoneButtonText: {
    color: '#0BA34E',
    fontSize: 13,
    fontWeight: '800',
  },
  errorText: {
    color: '#DC2626',
    fontWeight: '800',
    marginTop: 14,
    textAlign: 'center',
  },
  statusText: {
    color: '#047857',
    fontWeight: '800',
    marginTop: 14,
    textAlign: 'center',
  },
  continueButton: {
    alignItems: 'center',
    backgroundColor: '#06A84F',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 64,
    shadowColor: '#06A84F',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    width: '100%',
  },
  continueButtonDisabled: {
    backgroundColor: '#86D6AB',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  footerText: {
    color: '#5B6472',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
});
