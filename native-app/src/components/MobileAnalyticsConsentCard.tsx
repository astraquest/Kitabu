import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  getMobileAnalyticsConsent,
  initializeMobileAnalytics,
  isAdultMarketingRole,
  setMobileAnalyticsConsent,
  subscribeMobileAnalyticsConsent,
  type MobileAnalyticsRole,
} from '../services/mobileAnalytics';

type MobileAnalyticsConsentCardProps = {
  role: MobileAnalyticsRole;
};

export function MobileAnalyticsConsentCard({ role }: MobileAnalyticsConsentCardProps) {
  const [consent, setConsent] = useState(getMobileAnalyticsConsent());
  const [saving, setSaving] = useState(false);
  const marketingEligible = isAdultMarketingRole(role);

  useEffect(() => {
    initializeMobileAnalytics({ role }).catch(() => undefined);
    const unsubscribe = subscribeMobileAnalyticsConsent(setConsent);
    return () => {
      unsubscribe();
    };
  }, [role]);

  async function choose(analytics: boolean, marketing: boolean) {
    setSaving(true);
    try {
      await setMobileAnalyticsConsent({ analytics, marketing: marketing && marketingEligible });
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.card} testID="mobile-analytics-consent-card">
      <Text style={styles.title}>Privacy and analytics</Text>
      <Text style={styles.copy}>
        Necessary-only keeps the app usable. Optional analytics uses minimized, pseudonymous product events.
        Advertising collection is disabled for student and unknown roles.
      </Text>
      <View style={styles.options}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: saving, selected: consent?.analytics === false }}
          disabled={saving}
          onPress={() => { choose(false, false).catch(() => undefined); }}
          style={[styles.option, consent?.analytics === false && styles.optionActive]}
        >
          <Text style={styles.optionText}>Necessary only</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: saving, selected: consent?.analytics === true && consent.marketing === false }}
          disabled={saving}
          onPress={() => { choose(true, false).catch(() => undefined); }}
          style={[styles.option, consent?.analytics === true && !consent.marketing && styles.optionActive]}
        >
          <Text style={styles.optionText}>Analytics only</Text>
        </Pressable>
        {marketingEligible ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: saving, selected: consent?.marketing === true }}
            disabled={saving}
            onPress={() => { choose(true, true).catch(() => undefined); }}
            style={[styles.option, consent?.marketing === true && styles.optionActive]}
          >
            <Text style={styles.optionText}>Analytics + marketing</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8E3F0',
    backgroundColor: '#F8FBFF',
  },
  title: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  copy: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
  },
  options: {
    gap: 8,
    marginTop: 12,
  },
  option: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
  },
  optionActive: {
    borderColor: '#2563EB',
    backgroundColor: '#E8F0FF',
  },
  optionText: {
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '700',
  },
});
