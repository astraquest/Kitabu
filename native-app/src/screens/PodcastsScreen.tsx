import React, { useMemo, useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Clock3,
  Headphones,
  Leaf,
  Play,
  Video,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ScreenCapture from 'expo-screen-capture';

import { PodcastPlayerModal } from '../components/PodcastPlayerModal';
import { OnboardingMascotKey, Podcast } from '../types/app';

const sunguraRabbitMascot = require('../assets/mascot/sungura-rabbit.png');
const simbaLionMascot = require('../assets/mascot/simba-lion.png');
const ndovuElephantMascot = require('../assets/mascot/ndovu-elephant.png');
const pandaMascot = require('../assets/mascot/panda.png');

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
  panda: {
    source: pandaMascot,
    label: 'Rafiki the Panda',
    accent: '#475569',
    soft: '#E2E8F0',
  },
};

interface PodcastsScreenProps {
  mascotKey: OnboardingMascotKey;
  podcasts: Podcast[];
  onBack: () => void;
}

const PODCAST_TAB_STORAGE_KEY = 'kitabu_podcasts_active_tab';

export function PodcastsScreen({ mascotKey, podcasts, onBack }: PodcastsScreenProps) {
  const mascot = MASCOT_THEMES[mascotKey] ?? MASCOT_THEMES.rabbit;
  const [activeType, setActiveType] = useState<Podcast['type']>('video');
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);
  const visiblePodcasts = useMemo(
    () => podcasts.filter(podcast => podcast.type === activeType),
    [activeType, podcasts],
  );

  ScreenCapture.usePreventScreenCapture('kitabu-podcasts');

  React.useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(PODCAST_TAB_STORAGE_KEY)
      .then(value => {
        if (mounted && (value === 'audio' || value === 'video')) {
          setActiveType(value);
        }
      })
      .catch(() => undefined);

    ScreenCapture.enableAppSwitcherProtectionAsync(0.9).catch(() => undefined);
    return () => {
      mounted = false;
      ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => undefined);
    };
  }, []);

  function selectType(type: Podcast['type']) {
    setActiveType(type);
    AsyncStorage.setItem(PODCAST_TAB_STORAGE_KEY, type).catch(() => undefined);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={onBack}
          style={styles.headerButton}>
          <ArrowLeft size={24} color="#111827" strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.headerTitle}>Kitabu Podcasts</Text>
        <View style={[styles.headerButton, { backgroundColor: mascot.soft }]}>
          <Headphones size={21} color={mascot.accent} strokeWidth={2.3} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <View style={styles.introCopy}>
            <Text style={styles.eyebrow}>WATCH · LISTEN · LEARN</Text>
            <Text style={styles.introTitle}>Big ideas, made simple.</Text>
            <Text style={styles.introSubtitle}>Short episodes for curious learners in every grade.</Text>
          </View>
          <Image
            accessibilityLabel={mascot.label}
            resizeMode="contain"
            source={mascot.source}
            style={styles.mascot}
          />
        </View>

        <View accessibilityRole="tablist" style={styles.tabRow}>
          <PodcastTab
            active={activeType === 'audio'}
            activeColor="#F97316"
            icon={<Headphones color={activeType === 'audio' ? '#FFFFFF' : '#64748B'} size={17} strokeWidth={2.4} />}
            label="Audio"
            onPress={() => selectType('audio')}
          />
          <PodcastTab
            active={activeType === 'video'}
            activeColor="#15803D"
            icon={<Video color={activeType === 'video' ? '#FFFFFF' : '#64748B'} size={17} strokeWidth={2.4} />}
            label="Video"
            onPress={() => selectType('video')}
          />
        </View>

        {visiblePodcasts.length > 0 ? (
          <View style={styles.episodeList}>
            {visiblePodcasts.map(podcast => (
              <Pressable
                accessibilityHint="Opens the episode player"
                accessibilityLabel={`Play ${podcast.title}`}
                accessibilityRole="button"
                key={podcast.id}
                onPress={() => setSelectedPodcast(podcast)}
                style={({ pressed }) => [styles.episodeCard, pressed && styles.episodeCardPressed]}>
                <PodcastThumbnail podcast={podcast} />

                <View style={styles.episodeBody}>
                  <Text style={styles.episodeTitle}>{podcast.title}</Text>
                  <Text numberOfLines={1} style={styles.episodeSubject}>
                    {podcast.subject} · {podcast.author}
                  </Text>
                  <View style={styles.durationRow}>
                    <Clock3 color="#64748B" size={14} strokeWidth={2.2} />
                    <Text style={styles.durationText}>{podcast.duration}</Text>
                    <Text style={styles.metaDivider}>·</Text>
                    <Text style={styles.allGradesText}>All grades</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            {activeType === 'video' ? (
              <Video color={mascot.accent} size={30} strokeWidth={2.2} />
            ) : (
              <Headphones color={mascot.accent} size={30} strokeWidth={2.2} />
            )}
            <Text style={styles.emptyTitle}>No {activeType} episodes yet</Text>
            <Text style={styles.emptySubtitle}>Check back soon for something new.</Text>
          </View>
        )}
      </ScrollView>
      <PodcastPlayerModal podcast={selectedPodcast} onClose={() => setSelectedPodcast(null)} />
    </View>
  );
}

function PodcastTab({
  active,
  activeColor,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  activeColor: string;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`Show ${label.toLowerCase()} episodes`}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tab, active && { backgroundColor: activeColor }]}>
      {icon}
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function PodcastThumbnail({ podcast }: { podcast: Podcast }) {
  return (
    <View style={[styles.thumbnail, podcast.type === 'audio' && styles.audioThumbnail]}>
      {podcast.thumbnail ? (
        <Image
          resizeMode="cover"
          source={{ uri: podcast.thumbnail }}
          style={styles.thumbnailImage}
        />
      ) : podcast.type === 'video' ? (
        <Leaf color="#047857" fill="#A7F3D0" size={42} strokeWidth={2.2} />
      ) : (
        <Headphones color="#C2410C" size={38} strokeWidth={2.2} />
      )}
      <View style={styles.thumbnailPlay}>
        <Play color="#FFFFFF" fill="#FFFFFF" size={12} strokeWidth={2.4} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FFFDF8',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 18,
    paddingTop: 16,
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
    fontSize: 21,
    fontWeight: '900',
  },
  content: {
    padding: 18,
    paddingBottom: 38,
  },
  intro: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 18,
    minHeight: 132,
    overflow: 'hidden',
    paddingLeft: 18,
  },
  introCopy: {
    flex: 1,
    paddingVertical: 18,
  },
  eyebrow: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  introTitle: {
    color: '#102A43',
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 28,
    marginTop: 7,
  },
  introSubtitle: {
    color: '#52667A',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 7,
  },
  mascot: {
    alignSelf: 'flex-end',
    height: 106,
    marginRight: -5,
    width: 106,
  },
  tabRow: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 4,
    marginBottom: 16,
    padding: 4,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 11,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 42,
  },
  tabText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '800',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  episodeList: {
    gap: 10,
  },
  episodeCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    padding: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  episodeCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  thumbnail: {
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    height: 86,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 86,
  },
  audioThumbnail: {
    backgroundColor: '#FFEDD5',
  },
  thumbnailImage: {
    height: '100%',
    width: '100%',
  },
  thumbnailPlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderRadius: 14,
    bottom: 6,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 6,
    width: 28,
  },
  episodeBody: {
    flex: 1,
    paddingRight: 4,
  },
  episodeTitle: {
    color: '#102A43',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  episodeSubject: {
    color: '#52667A',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  durationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  durationText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  metaDivider: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '900',
  },
  allGradesText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 18,
    borderWidth: 1,
    padding: 28,
  },
  emptyTitle: {
    color: '#102A43',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 12,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
  },
});
