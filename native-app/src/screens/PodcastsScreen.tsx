import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Calendar,
  Download,
  Eye,
  Headphones,
  MoreHorizontal,
  Pause,
  Play,
  Search,
  SkipBack,
  SkipForward,
  Volume2,
  X,
} from 'lucide-react-native';

import { Podcast } from '../types/app';

interface PodcastsScreenProps {
  podcasts: Podcast[];
  onBack: () => void;
}

function parseDuration(duration: string) {
  const [minutes, seconds] = duration.split(':').map(value => Number(value) || 0);
  return minutes * 60 + seconds;
}

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function PodcastsScreen({ podcasts, onBack }: PodcastsScreenProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'audio' | 'video'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePodcast, setActivePodcast] = useState<Podcast | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const filteredPodcasts = useMemo(
    () =>
      podcasts.filter(item => {
        const matchesTab = activeTab === 'all' || item.type === activeTab;
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          item.title.toLowerCase().includes(query) ||
          item.subject.toLowerCase().includes(query) ||
          item.author.toLowerCase().includes(query);
        return matchesTab && matchesSearch;
      }),
    [activeTab, podcasts, searchQuery],
  );

  useEffect(() => {
    if (!activePodcast || !isPlaying) {
      return undefined;
    }

    const duration = parseDuration(activePodcast.duration);
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev + 1 >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activePodcast, isPlaying]);

  useEffect(() => {
    if (!activePodcast) {
      return;
    }

    setProgress(0);
    setIsMuted(false);
  }, [activePodcast]);

  function handleOpenPodcast(podcast: Podcast) {
    setActivePodcast(podcast);
    setIsPlaying(true);
    setProgress(0);
  }

  function closePlayer() {
    setActivePodcast(null);
    setIsPlaying(false);
    setProgress(0);
    setIsMuted(false);
  }

  function skip(seconds: number) {
    if (!activePodcast) {
      return;
    }

    const duration = parseDuration(activePodcast.duration);
    setProgress(prev => Math.max(0, Math.min(duration, prev + seconds)));
  }

  async function openPodcastSource() {
    if (!activePodcast?.url) {
      return;
    }

    try {
      await Linking.openURL(activePodcast.url);
    } catch (error) {
      console.error('Could not open podcast source', error);
    }
  }

  const playerDuration = activePodcast ? parseDuration(activePodcast.duration) : 1;
  const playerProgress = playerDuration > 0 ? (progress / playerDuration) * 100 : 0;

  return (
    <>
      <View style={styles.screen}>
        <View style={styles.headerShell}>
          <View style={styles.headerRow}>
            <Pressable onPress={onBack} style={styles.headerIcon}>
              <ArrowLeft size={24} color="#374151" />
            </Pressable>
          <Text style={styles.headerTitle}>Podcasts</Text>
            <View style={styles.headerIcon}>
              <Search size={22} color="#374151" />
            </View>
          </View>

          <View style={styles.searchBar}>
            <Search size={16} color="#94A3B8" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search topics, subjects, or teachers"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
            />
          </View>

          <View style={styles.filtersRow}>
            {(['all', 'audio', 'video'] as const).map(tab => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.filterChip,
                  activeTab === tab && styles.filterChipActive,
                ]}>
                <Text
                  style={[
                    styles.filterChipText,
                    activeTab === tab && styles.filterChipTextActive,
                  ]}>
                  {tab}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}>
          {filteredPodcasts.length > 0 ? (
            filteredPodcasts.map(item => (
              <Pressable
                key={item.id}
                onPress={() => handleOpenPodcast(item)}
                style={styles.card}>
                <View style={styles.thumbWrap}>
                  <Image
                    source={{
                      uri:
                        item.thumbnail ||
                        'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=300&h=300&fit=crop',
                    }}
                    style={styles.thumbnail}
                  />
                  <View style={styles.thumbOverlay}>
                    <View style={styles.playBadge}>
                      {item.type === 'audio' ? (
                        <Headphones size={16} color="#2563EB" />
                      ) : (
                        <Play size={16} color="#DC2626" fill="#DC2626" />
                      )}
                    </View>
                  </View>
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationBadgeText}>{item.duration}</Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardMetaTop}>
                    <Text
                      style={[
                        styles.subjectChip,
                        item.type === 'audio' ? styles.audioChip : styles.videoChip,
                      ]}>
                      {item.subject}
                    </Text>
                    <View style={styles.dateRow}>
                      <Calendar size={12} color="#9CA3AF" />
                      <Text style={styles.dateText}>
                        {new Date(item.date).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.authorText}>{item.author}</Text>
                  <View style={styles.viewsRow}>
                    <Eye size={12} color="#9CA3AF" />
                    <Text style={styles.viewsText}>{item.views}</Text>
                  </View>
                </View>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Headphones color="#CBD5E1" size={42} strokeWidth={1.8} />
              <Text style={styles.emptyTitle}>No podcasts yet</Text>
              <Text style={styles.emptyBody}>
                Publish audio or video learning content to populate this portal.
              </Text>
            </View>
          )}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>

      <Modal
        animationType="slide"
        visible={!!activePodcast}
        onRequestClose={closePlayer}>
        {activePodcast ? (
          activePodcast.type === 'video' ? (
            <View style={styles.videoPlayerScreen}>
              <Pressable onPress={closePlayer} style={styles.videoClose}>
                <X size={24} color="#FFFFFF" />
              </Pressable>

              <View style={styles.videoArtWrap}>
                <Image
                  source={{
                    uri:
                      activePodcast.thumbnail ||
                      'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=300&h=300&fit=crop',
                  }}
                  style={styles.videoArt}
                />
              </View>

              <View style={styles.videoFooter}>
                <Text style={styles.videoTitle}>{activePodcast.title}</Text>
                <Text style={styles.videoAuthor}>{activePodcast.author}</Text>
                <Pressable onPress={() => openPodcastSource().catch(() => undefined)} style={styles.externalButton}>
                  <Text style={styles.externalButtonText}>Open Video Source</Text>
                </Pressable>
                <View style={styles.playerControlRow}>
                  <Pressable onPress={() => skip(-10)} style={styles.videoControl}>
                    <SkipBack size={24} color="#FFFFFF" />
                  </Pressable>
                  <Pressable
                    onPress={() => setIsPlaying(prev => !prev)}
                    style={styles.videoPlayButton}>
                    {isPlaying ? (
                      <Pause size={24} color="#111827" fill="#111827" />
                    ) : (
                      <Play size={24} color="#111827" fill="#111827" />
                    )}
                  </Pressable>
                  <Pressable onPress={() => skip(10)} style={styles.videoControl}>
                    <SkipForward size={24} color="#FFFFFF" />
                  </Pressable>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[styles.videoProgress, { width: `${Math.max(4, playerProgress)}%` }]}
                  />
                </View>
                <Text style={styles.videoClock}>{formatClock(progress)}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.audioPlayerScreen}>
              <View style={styles.audioTopRow}>
                <Pressable onPress={closePlayer} style={styles.audioTopIcon}>
                  <X size={24} color="#FFFFFF" />
                </Pressable>
                <Text style={styles.audioTopLabel}>Now Playing</Text>
                <Pressable style={styles.audioTopIcon}>
                  <MoreHorizontal size={24} color="#FFFFFF" />
                </Pressable>
              </View>

              <View style={styles.audioArtSection}>
                <Image
                  source={{
                    uri:
                      activePodcast.thumbnail ||
                      'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=300&h=300&fit=crop',
                  }}
                  style={styles.audioArt}
                />
              </View>

              <View style={styles.audioBody}>
                <Text style={styles.audioTitle}>{activePodcast.title}</Text>
                <Text style={styles.audioAuthor}>{activePodcast.author}</Text>
                <Pressable onPress={() => openPodcastSource().catch(() => undefined)} style={styles.audioSourceButton}>
                  <Text style={styles.audioSourceButtonText}>
                    {activePodcast.type === 'audio' ? 'Open Audio Source' : 'Open Source'}
                  </Text>
                </Pressable>

                <View style={styles.progressTrackDark}>
                  <View
                    style={[styles.progressFillDark, { width: `${Math.max(4, playerProgress)}%` }]}
                  />
                </View>

                <View style={styles.clockRow}>
                  <Text style={styles.clockText}>{formatClock(progress)}</Text>
                  <Text style={styles.clockText}>{formatClock(playerDuration)}</Text>
                </View>

                <View style={styles.audioControls}>
                  <Pressable
                    onPress={() => setIsMuted(prev => !prev)}
                    style={styles.smallAudioIcon}>
                    <Volume2
                      size={22}
                      color={isMuted ? '#FFFFFF' : 'rgba(255,255,255,0.72)'}
                    />
                  </Pressable>
                  <View style={styles.centerControls}>
                    <Pressable onPress={() => skip(-10)} style={styles.audioControl}>
                      <SkipBack size={28} color="#FFFFFF" />
                    </Pressable>
                    <Pressable
                      onPress={() => setIsPlaying(prev => !prev)}
                      style={styles.audioPlayButton}>
                      {isPlaying ? (
                        <Pause size={32} color="#0F172A" fill="#0F172A" />
                      ) : (
                        <Play size={32} color="#0F172A" fill="#0F172A" />
                      )}
                    </Pressable>
                    <Pressable onPress={() => skip(10)} style={styles.audioControl}>
                      <SkipForward size={28} color="#FFFFFF" />
                    </Pressable>
                  </View>
                  <Pressable onPress={() => openPodcastSource().catch(() => undefined)} style={styles.smallAudioIcon}>
                    <Download size={22} color="rgba(255,255,255,0.72)" />
                  </Pressable>
                </View>
              </View>
            </View>
          )
        ) : null}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F2F2F7' },
  headerShell: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerIcon: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#111827', fontSize: 18, fontWeight: '800' },
  searchBar: {
    minHeight: 48, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1,
    borderColor: '#E5E7EB', paddingHorizontal: 14, flexDirection: 'row',
    alignItems: 'center', gap: 8, marginBottom: 12,
  },
  searchInput: { flex: 1, color: '#111827', fontSize: 14, fontWeight: '600' },
  filtersRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  filterChipText: { color: '#6B7280', fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  filterChipTextActive: { color: '#FFFFFF' },
  listContent: { padding: 16, gap: 16, paddingBottom: 32 },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyBody: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF', padding: 12, borderRadius: 24, borderWidth: 1,
    borderColor: '#F3F4F6', flexDirection: 'row', gap: 14,
  },
  thumbWrap: { width: 96, height: 96, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  thumbnail: { width: '100%', height: '100%', backgroundColor: '#CBD5E1' },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  playBadge: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  durationBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  cardBody: { flex: 1, justifyContent: 'center' },
  cardMetaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  subjectChip: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  audioChip: { backgroundColor: '#3B82F6' },
  videoChip: { backgroundColor: '#EF4444' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { color: '#9CA3AF', fontSize: 10, fontWeight: '600' },
  cardTitle: { color: '#111827', fontSize: 16, lineHeight: 20, fontWeight: '800', marginBottom: 4 },
  authorText: { color: '#6B7280', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  viewsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewsText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  bottomSpacer: { height: 72 },
  videoPlayerScreen: { flex: 1, backgroundColor: '#000000', justifyContent: 'center' },
  videoClose: {
    position: 'absolute', top: 24, left: 20, zIndex: 2, width: 40, height: 40,
    borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.42)', alignItems: 'center', justifyContent: 'center',
  },
  videoArtWrap: { paddingHorizontal: 12 },
  videoArt: { width: '100%', aspectRatio: 16 / 9, borderRadius: 8 },
  videoFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 24, backgroundColor: 'rgba(0,0,0,0.55)' },
  videoTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  videoAuthor: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', marginBottom: 16 },
  externalButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  externalButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  playerControlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 16 },
  videoControl: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  videoPlayButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  videoProgress: { height: 4, borderRadius: 999, backgroundColor: '#FFFFFF' },
  videoClock: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginTop: 8 },
  audioPlayerScreen: { flex: 1, backgroundColor: '#0F172A' },
  audioTopRow: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  audioTopIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  audioTopLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.4 },
  audioArtSection: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  audioArt: { width: '100%', aspectRatio: 1, borderRadius: 32 },
  audioBody: { paddingHorizontal: 32, paddingBottom: 36 },
  audioTitle: { color: '#FFFFFF', fontSize: 28, lineHeight: 34, fontWeight: '800', marginBottom: 6 },
  audioAuthor: { color: 'rgba(255,255,255,0.62)', fontSize: 18, fontWeight: '500', marginBottom: 28 },
  audioSourceButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 18,
  },
  audioSourceButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  progressTrack: { height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden' },
  progressTrackDark: { height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden', marginBottom: 8 },
  progressFillDark: { height: 6, borderRadius: 999, backgroundColor: '#FFFFFF' },
  clockRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  clockText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700' },
  audioControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  smallAudioIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  centerControls: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  audioControl: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  audioPlayButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
});
