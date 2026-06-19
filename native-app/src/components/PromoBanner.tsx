import React from 'react';
import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { DashboardBanner } from '../types/app';

interface PromoBannerProps {
  banner: DashboardBanner | null;
  onPressCta: (target: DashboardBanner['ctaTarget']) => void;
}

const bannerImage = require('../assets/banner.jpeg');
const WHATSAPP_HELP_URL = 'https://wa.me/254716175485?text=I%20need%20help';

export function PromoBanner({ banner, onPressCta }: PromoBannerProps) {
  if (!banner) {
    return null;
  }

  return (
    <View style={styles.bannerWrap}>
      <Pressable onPress={() => onPressCta(banner.ctaTarget)} style={styles.banner}>
        <Image source={bannerImage} style={styles.bannerImage} resizeMode="cover" />
        <Pressable
          accessibilityLabel="Get homework help on WhatsApp"
          onPress={event => {
            event.stopPropagation();
            Linking.openURL(WHATSAPP_HELP_URL).catch(() => undefined);
          }}
          style={({ pressed }) => [
            styles.whatsAppButton,
            pressed && styles.whatsAppButtonPressed,
          ]}>
          <WhatsAppIcon />
        </Pressable>
      </Pressable>
    </View>
  );
}

function WhatsAppIcon() {
  return (
    <Svg width={25} height={25} viewBox="0 0 32 32" fill="none">
      <Path
        d="M16.03 4C9.42 4 4.05 9.32 4.05 15.87c0 2.1.55 4.14 1.6 5.94L4 28l6.37-1.64a12.1 12.1 0 0 0 5.66 1.42C22.64 27.78 28 22.46 28 15.9 28 9.34 22.64 4 16.03 4Z"
        fill="#25D366"
      />
      <Path
        d="m22.84 19.22-.08.67c-.13.98-1.03 1.76-2.05 1.76-3.4 0-8.24-4.04-9.83-7.1-.48-.92-.65-1.75-.51-2.48.13-.7.64-1.3 1.33-1.54l.65-.22c.35-.12.73.02.93.33l1.08 1.72c.18.3.15.69-.08.95l-.58.66c-.17.2-.2.48-.07.7.73 1.27 1.78 2.3 3.05 3 .23.13.52.1.72-.08l.66-.6c.26-.24.66-.28.96-.09l1.76 1.08c.32.2.47.57.4.94Z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  bannerWrap: {
    marginBottom: 6,
    marginTop: 4,
    paddingHorizontal: 16,
  },
  banner: {
    borderRadius: 28,
    height: 142,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerImage: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
  whatsAppButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(15,23,42,0.08)',
    borderRadius: 999,
    borderWidth: 1,
    bottom: 12,
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    width: 44,
  },
  whatsAppButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.97 }],
  },
});
