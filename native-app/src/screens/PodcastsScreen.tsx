import React from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Headphones,
  Play,
  Video,
} from 'lucide-react-native';

import { OnboardingMascotKey } from '../types/app';

const sunguraRabbitMascot = require('../assets/mascot/sungura-rabbit.png');
const simbaLionMascot = require('../assets/mascot/simba-lion.png');
const ndovuElephantMascot = require('../assets/mascot/ndovu-elephant.png');

type MascotTheme = {
  source: ImageSourcePropType;
  label: string;
  accent: string;
  soft: string;
};

const MASCOT_THEMES: Record<OnboardingMascotKey, MascotTheme> = {
  lion: {
    source: simbaLionMascot,
    label: 'Rafiki the Lion',
    accent: '#D97706',
    soft: '#FEF3C7',
  },
  rabbit: {
    source: sunguraRabbitMascot,
    label: 'Rafiki the Rabbit',
    accent: '#0E9F6E',
    soft: '#DCFCE7',
  },
  elephant: {
    source: ndovuElephantMascot,
    label: 'Rafiki the Elephant',
    accent: '#2563EB',
    soft: '#DBEAFE',
  },
};

interface PodcastsScreenProps {
  mascotKey: OnboardingMascotKey;
  onBack: () => void;
}

export function PodcastsScreen({ mascotKey, onBack }: PodcastsScreenProps) {
  const mascot = MASCOT_THEMES[mascotKey] ?? MASCOT_THEMES.rabbit;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.headerButton}>
          <ArrowLeft size={24} color="#111827" strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.headerTitle}>Kitabu Podcasts</Text>
        <View style={[styles.headerButton, { backgroundColor: mascot.soft }]}>
          <Headphones size={21} color={mascot.accent} strokeWidth={2.3} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.tabRow}>
          <PodcastTab accent={mascot.accent} icon={<Headphones size={16} color={mascot.accent} strokeWidth={2.4} />} label="Audio" />
          <PodcastTab accent="#7C3AED" icon={<Video size={16} color="#7C3AED" strokeWidth={2.4} />} label="Video" />
        </View>

        <View style={styles.previewStack}>
          <PodcastSkeleton
            accent={mascot.accent}
            icon={<Headphones size={18} color="#FFFFFF" strokeWidth={2.4} />}
            kind="Audio"
          />
          <PodcastSkeleton
            accent="#7C3AED"
            icon={<Video size={18} color="#FFFFFF" strokeWidth={2.4} />}
            kind="Video"
            video
          />
        </View>

        <View style={[styles.mascotHalo, { backgroundColor: mascot.soft }]}>
          <Image
            accessibilityLabel={mascot.label}
            resizeMode="contain"
            source={mascot.source}
            style={styles.mascot}
          />
        </View>

        <View style={styles.copyBlock}>
          <Text style={styles.title}>Coming soon</Text>
          <Text style={styles.subtitle}>Audio and video episodes are getting ready.</Text>
        </View>
      </View>
    </View>
  );
}

function PodcastTab({
  accent,
  icon,
  label,
}: {
  accent: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <View style={[styles.podcastTab, { backgroundColor: `${accent}12`, borderColor: `${accent}2E` }]}>
      {icon}
      <Text style={[styles.podcastTabText, { color: accent }]}>{label}</Text>
    </View>
  );
}

function PodcastSkeleton({
  accent,
  icon,
  kind,
  video = false,
}: {
  accent: string;
  icon: React.ReactNode;
  kind: string;
  video?: boolean;
}) {
  return (
    <View style={styles.skeletonCard}>
      <View style={[styles.mediaBox, video && styles.videoBox, { backgroundColor: `${accent}14` }]}>
        <View style={[styles.mediaIcon, { backgroundColor: accent }]}>
          {video ? <Play size={16} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2.2} /> : icon}
        </View>
      </View>
      <View style={styles.skeletonBody}>
        <View style={[styles.typePill, { backgroundColor: `${accent}16` }]}>
          <Text style={[styles.typeText, { color: accent }]}>{kind}</Text>
        </View>
        <View style={styles.skeletonLineWide} />
        <View style={styles.skeletonLineShort} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF7ED',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  headerButton: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerTitle: {
    color: '#111827',
    fontSize: 23,
    fontWeight: '900',
  },
  content: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
    width: '100%',
  },
  podcastTab: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 44,
  },
  podcastTabText: {
    fontSize: 13,
    fontWeight: '900',
  },
  mascotHalo: {
    alignItems: 'center',
    borderRadius: 94,
    height: 188,
    justifyContent: 'center',
    marginBottom: 18,
    width: 188,
  },
  mascot: {
    height: 174,
    width: 174,
  },
  copyBlock: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    color: '#111827',
    fontSize: 31,
    fontWeight: '900',
    lineHeight: 37,
    textAlign: 'center',
  },
  subtitle: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
  previewStack: {
    gap: 12,
    marginBottom: 26,
    width: '100%',
  },
  skeletonCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#FED7AA',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    padding: 12,
    shadowColor: '#9A3412',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
  },
  mediaBox: {
    alignItems: 'center',
    borderRadius: 8,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  videoBox: {
    width: 88,
  },
  mediaIcon: {
    alignItems: 'center',
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  skeletonBody: {
    flex: 1,
    gap: 9,
  },
  typePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  skeletonLineWide: {
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    height: 12,
    width: '88%',
  },
  skeletonLineShort: {
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    height: 10,
    width: '52%',
  },
});
