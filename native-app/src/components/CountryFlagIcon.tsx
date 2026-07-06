import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

const COUNTRY_CODE_BY_NAME: Record<string, string> = {
  et: 'ET',
  ethiopia: 'ET',
  ke: 'KE',
  kenya: 'KE',
  rw: 'RW',
  rwanda: 'RW',
  tz: 'TZ',
  tanzania: 'TZ',
  ug: 'UG',
  uganda: 'UG',
};

export function resolveCountryCode(country?: string | null) {
  const normalized = country?.trim().toLowerCase();
  return normalized ? COUNTRY_CODE_BY_NAME[normalized] ?? 'KE' : 'KE';
}

export function CountryFlagIcon({
  country,
  countryCode,
  width = 18,
  height = 12,
  style,
  accessibilityLabel = 'Selected country flag',
}: {
  country?: string | null;
  countryCode?: string | null;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const resolvedCode = (
    countryCode || resolveCountryCode(country)
  ).toUpperCase();
  const flagUri = `https://flagcdn.com/w40/${resolvedCode.toLowerCase()}.png`;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.frame,
        {
          borderRadius: Math.max(2, Math.round(height * 0.18)),
          height,
          width,
        },
        style,
      ]}
    >
      <Image
        resizeMode="cover"
        source={{ uri: flagUri }}
        style={{ height, width }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(30,58,138,0.22)',
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
