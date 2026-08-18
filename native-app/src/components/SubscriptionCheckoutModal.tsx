import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { LockKeyhole, Phone, ShieldCheck, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { BillingPlan, BillingPlanCode } from '../types/app';

const sunguraRabbitMascot = require('../assets/mascot/sungura-rabbit.png');
const simbaLionMascot = require('../assets/mascot/simba-lion.png');
const ndovuElephantMascot = require('../assets/mascot/ndovu-elephant.png');

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

const PLAN_ORDER: Record<string, number> = {
  weekly: 1,
  monthly: 2,
  annual: 3,
};
const PUBLIC_PLAN_CODES: BillingPlanCode[] = ['weekly', 'monthly', 'annual'];
const PACKAGE_GAP = 5;
const PLAN_PRESENTATION: Record<
  string,
  {
    name: string;
    cycle: string;
    accent: string;
    border: string;
    mascot: ImageSourcePropType;
    soft: string;
  }
> = {
  weekly: {
    name: 'Sungura',
    cycle: 'Per Month',
    accent: '#F97316',
    border: '#FDBA74',
    mascot: sunguraRabbitMascot,
    soft: '#FFF7ED',
  },
  monthly: {
    name: 'Simba',
    cycle: 'Per Term',
    accent: '#16A34A',
    border: '#86EFAC',
    mascot: simbaLionMascot,
    soft: '#F0FDF4',
  },
  annual: {
    name: 'Premium',
    cycle: 'Per Term',
    accent: '#2563EB',
    border: '#93C5FD',
    mascot: ndovuElephantMascot,
    soft: '#EFF6FF',
  },
};
const PUBLIC_PLAN_FALLBACKS: Record<string, BillingPlan> = {
  weekly: {
    code: 'weekly',
    name: 'Weekly',
    billingCycle: 'weekly',
    priceKsh: 150,
    priceKshCents: 15000,
    originalPriceKsh: 250,
    originalPriceKshCents: 25000,
    isPopular: false,
  },
  monthly: {
    code: 'monthly',
    name: 'Monthly',
    billingCycle: 'monthly',
    priceKsh: 300,
    priceKshCents: 30000,
    originalPriceKsh: 500,
    originalPriceKshCents: 50000,
    isPopular: true,
  },
  annual: {
    code: 'annual',
    name: 'Annual',
    billingCycle: 'annual',
    priceKsh: 1000,
    priceKshCents: 100000,
    originalPriceKsh: null,
    originalPriceKshCents: null,
    isPopular: false,
  },
};

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

function getPlanPresentation(plan: BillingPlan) {
  return (
    PLAN_PRESENTATION[plan.code] ?? {
      name: plan.name,
      cycle: `Per ${getCycleLabel(plan)}`,
      accent: '#16A34A',
      border: '#86EFAC',
      mascot: simbaLionMascot,
      soft: '#F0FDF4',
    }
  );
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
  const compact = height < 760 || width < 390;
  const [hasPackageFocus, setHasPackageFocus] = useState(false);
  const [focusedPlanCode, setFocusedPlanCode] = useState<BillingPlanCode | null>(null);
  const focusProgress = useRef(new Animated.Value(0)).current;
  const wiggle = useRef(new Animated.Value(0)).current;
  const cardSizeStyle = useMemo(
    () => ({
      height: Math.round(height * 0.75),
      maxWidth: Math.min(Math.round(width - 24), 366),
    }),
    [height, width],
  );
  const visiblePlans = useMemo(
    () => {
      const plansByCode = new Map(plans.map(plan => [plan.code, plan]));
      return PUBLIC_PLAN_CODES.map(planCode => plansByCode.get(planCode) ?? PUBLIC_PLAN_FALLBACKS[planCode]).sort(
        (left, right) => (PLAN_ORDER[left.code] ?? 99) - (PLAN_ORDER[right.code] ?? 99),
      );
    },
    [plans],
  );
  const effectiveSelectedPlanCode = focusedPlanCode ?? selectedPlanCode;
  const featuredPlan =
    visiblePlans.find(plan => plan.code === effectiveSelectedPlanCode) ??
    visiblePlans.find(plan => plan.code === 'monthly') ??
    visiblePlans[0] ??
    null;
  const packageCardWidth = useMemo(() => {
    const availableWidth = Math.min(Math.round(width - 52), 338);
    if (visiblePlans.length === 1) {
      return Math.min(180, availableWidth);
    }
    return Math.max(92, Math.floor((availableWidth - PACKAGE_GAP * 2) / 3));
  }, [visiblePlans.length, width]);
  const packageStep = packageCardWidth + PACKAGE_GAP;

  useEffect(() => {
    if (!isOpen) {
      setHasPackageFocus(false);
      setFocusedPlanCode(null);
      focusProgress.setValue(0);
      wiggle.setValue(0);
    }
  }, [focusProgress, isOpen, wiggle]);

  useEffect(() => {
    if (!hasPackageFocus) {
      return;
    }

    wiggle.setValue(0);
    Animated.parallel([
      Animated.timing(focusProgress, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(wiggle, {
          toValue: -1,
          duration: 55,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(wiggle, {
          toValue: 1,
          duration: 90,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(wiggle, {
          toValue: -0.55,
          duration: 75,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(wiggle, {
          toValue: 0.35,
          duration: 60,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(wiggle, {
          toValue: 0,
          duration: 50,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [effectiveSelectedPlanCode, focusProgress, hasPackageFocus, wiggle]);

  function handleSelectPlan(planCode: BillingPlanCode) {
    if (hasPackageFocus && focusedPlanCode === planCode) {
      setHasPackageFocus(false);
      setFocusedPlanCode(null);
      Animated.timing(focusProgress, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    setFocusedPlanCode(planCode);
    setHasPackageFocus(true);
    onSelectPlan(planCode);
  }

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
            compact ? styles.cardCompact : styles.cardRegular,
            cardSizeStyle,
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
              <Text style={styles.offerBadgeText}>
                LIMITED TIME OFFER
              </Text>
            </View>

            <View style={styles.packageRail}>
              {visiblePlans.map(plan => {
                const active = plan.code === featuredPlan?.code;
                const packageTheme = getPlanPresentation(plan);
                const discountLabel = getDiscountLabel(plan);
                const hasDiscountedOriginalPrice =
                  typeof plan.originalPriceKsh === 'number' &&
                  Number.isFinite(plan.originalPriceKsh) &&
                  plan.originalPriceKsh > plan.priceKsh;
                const popular = plan.code === 'monthly';
                const rowIndex = PLAN_ORDER[plan.code] ?? 2;
                const rowOffset = (rowIndex - 2) * packageStep;
                const translateX = focusProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [rowOffset, 0],
                });
                const scale = focusProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, active ? 1.08 : 0.72],
                });
                const opacity = focusProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, active ? 1 : 0],
                });
                const rotate = active
                  ? wiggle.interpolate({
                      inputRange: [-1, 0, 1],
                      outputRange: ['-2.4deg', '0deg', '2.4deg'],
                    })
                  : '0deg';
                return (
                  <Animated.View
                    key={plan.code}
                    pointerEvents={hasPackageFocus && !active ? 'none' : 'auto'}
                    style={[
                      styles.packageCardSlot,
                      active && styles.packageCardSlotActive,
                      {
                        width: packageCardWidth,
                        marginLeft: -packageCardWidth / 2,
                        opacity,
                        transform: [{ translateX }, { scale }, { rotate }],
                      },
                    ]}>
                    <Image
                      accessibilityIgnoresInvertColors
                      accessibilityLabel={`${packageTheme.name} mascot`}
                      source={packageTheme.mascot}
                      style={styles.packageMascot}
                      resizeMode="contain"
                    />
                    {popular ? (
                      <View style={[styles.packagePopularPill, { backgroundColor: packageTheme.accent }]}>
                        <Text style={styles.packagePopularText}>MOST POPULAR</Text>
                      </View>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${packageTheme.name} package`}
                      accessibilityState={{ selected: active }}
                      onPress={() => handleSelectPlan(plan.code)}
                      style={[
                        styles.packageCard,
                        {
                          backgroundColor: packageTheme.soft,
                          borderColor: active ? packageTheme.accent : packageTheme.border,
                        },
                        active && styles.packageCardActive,
                        active && { shadowColor: packageTheme.accent },
                      ]}>
                      <Text style={styles.packageName}>{packageTheme.name}</Text>
                      <Text style={[styles.packagePrice, { color: packageTheme.accent }]}>
                        KSH {plan.priceKsh.toLocaleString()}
                      </Text>
                      <Text style={styles.packageCycle}>{packageTheme.cycle}</Text>
                      {hasDiscountedOriginalPrice && discountLabel ? (
                        <View style={styles.packageDiscountRow}>
                          <Text style={styles.packageOriginalPrice}>
                            KSH {plan.originalPriceKsh.toLocaleString()}
                          </Text>
                          <Text style={[styles.packageDiscount, { color: packageTheme.accent }]}>
                            {discountLabel}
                          </Text>
                        </View>
                      ) : null}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>

            {hasPackageFocus && featuredPlan ? (
              <View style={styles.selectionHint}>
                <Text style={styles.selectionHintText}>{getPlanPresentation(featuredPlan).name} selected</Text>
              </View>
            ) : null}

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
              accessibilityRole="button"
              accessibilityLabel="Continue to M-Pesa payment"
              accessibilityState={{ disabled: !featuredPlan || isSubmitting, busy: isSubmitting }}
              onPress={() => featuredPlan && onContinue(featuredPlan.code)}
              disabled={!featuredPlan || isSubmitting}
              style={[styles.continueButton, (!featuredPlan || isSubmitting) && styles.continueButtonDisabled]}>
              {isSubmitting ? (
                <>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.continueButtonText}>Waiting for M-Pesa...</Text>
                </>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 18,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    alignSelf: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
    width: '100%',
  },
  cardRegular: {
    borderRadius: 28,
  },
  cardCompact: {
    borderRadius: 22,
  },
  content: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 36,
    paddingBottom: 10,
  },
  contentCompact: {
    paddingHorizontal: 14,
    paddingTop: 34,
    paddingBottom: 10,
  },
  closeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#0B1020',
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 27,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 21,
    lineHeight: 25,
  },
  subtitle: {
    color: '#5B6472',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 6,
    textAlign: 'center',
  },
  subtitleCompact: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  offerBadge: {
    backgroundColor: '#EAF8F0',
    borderColor: '#C8EEDB',
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 9,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  offerBadgeText: {
    color: '#06934D',
    fontSize: 13,
    fontWeight: '900',
  },
  packageRail: {
    alignItems: 'center',
    height: 154,
    justifyContent: 'center',
    marginTop: 12,
    overflow: 'visible',
    width: '100%',
  },
  packageCardSlot: {
    alignItems: 'center',
    height: 148,
    left: '50%',
    position: 'absolute',
    zIndex: 1,
  },
  packageCardSlotActive: {
    zIndex: 3,
  },
  packageCard: {
    alignItems: 'center',
    borderRadius: 13,
    borderWidth: 2,
    height: 88,
    justifyContent: 'center',
    marginTop: 58,
    paddingHorizontal: 3,
    paddingTop: 13,
    paddingBottom: 7,
    width: '100%',
  },
  packageCardActive: {
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  packagePopularPill: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 3,
    position: 'absolute',
    top: 48,
    zIndex: 8,
    elevation: 8,
  },
  packagePopularText: {
    color: '#FFFFFF',
    fontSize: 6,
    fontWeight: '900',
    textAlign: 'center',
  },
  packageName: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  packagePrice: {
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 15,
    marginTop: 4,
    textAlign: 'center',
  },
  packageCycle: {
    color: '#475569',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 1,
    textAlign: 'center',
  },
  packageDiscountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
  },
  packageOriginalPrice: {
    color: '#64748B',
    fontSize: 7,
    fontWeight: '800',
    lineHeight: 9,
    textDecorationLine: 'line-through',
  },
  packageDiscount: {
    fontSize: 7,
    fontWeight: '900',
    textAlign: 'center',
  },
  packageMascot: {
    height: 64,
    position: 'absolute',
    top: 0,
    width: 64,
    zIndex: 4,
  },
  selectionHint: {
    marginTop: 4,
  },
  selectionHintText: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  promiseRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  promiseText: {
    color: '#5B6472',
    fontSize: 13,
    fontWeight: '600',
  },
  phoneInputWrap: {
    alignItems: 'center',
    borderColor: '#D4DAE3',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    width: '100%',
  },
  phoneDivider: {
    backgroundColor: '#E2E8F0',
    height: 26,
    marginHorizontal: 10,
    width: 1,
  },
  phoneInput: {
    color: '#111827',
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 8,
  },
  savedPhoneButton: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  savedPhoneButtonText: {
    color: '#0BA34E',
    fontSize: 12,
    fontWeight: '800',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
    textAlign: 'center',
  },
  statusText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
    textAlign: 'center',
  },
  continueButton: {
    alignItems: 'center',
    backgroundColor: '#06A84F',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 46,
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
    fontSize: 15,
    fontWeight: '900',
  },
  footerText: {
    color: '#5B6472',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'center',
  },
});
