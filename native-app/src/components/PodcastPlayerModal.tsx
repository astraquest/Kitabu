import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Pause, Play, ShieldCheck, X } from 'lucide-react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useVideoPlayer, VideoSource, VideoView } from 'expo-video';

import { buildKitabuRequestHeaders } from '../services/requestHelpers';
import { getKitabuApiBaseUrl } from '../services/runtimeConfig';
import { Podcast } from '../types/app';

type ProtectedMediaSource = {
  headers: Record<string, string>;
  uri: string;
};

interface PodcastPlayerModalProps {
  podcast: Podcast | null;
  onClose: () => void;
}

function resolvePodcastUrl(url: string) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  const baseUrl = getKitabuApiBaseUrl();
  if (!baseUrl) {
    return url;
  }
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function PodcastPlayerModal({ podcast, onClose }: PodcastPlayerModalProps) {
  const [source, setSource] = useState<ProtectedMediaSource | null>(null);

  useEffect(() => {
    let mounted = true;
    let webObjectUrl: string | null = null;
    setSource(null);
    if (!podcast) {
      return () => {
        mounted = false;
      };
    }

    buildKitabuRequestHeaders(undefined, true, false)
      .then(async headers => {
        const uri = resolvePodcastUrl(podcast.url);
        if (Platform.OS === 'web') {
          const response = await fetch(uri, { headers });
          if (!response.ok) {
            throw new Error(`Podcast playback failed with status ${response.status}`);
          }
          webObjectUrl = URL.createObjectURL(await response.blob());
        }
        if (mounted) {
          setSource({ headers: webObjectUrl ? {} : headers, uri: webObjectUrl ?? uri });
        }
      })
      .catch(() => {
        if (mounted) {
          setSource({ headers: {}, uri: resolvePodcastUrl(podcast.url) });
        }
      });

    return () => {
      mounted = false;
      if (webObjectUrl) {
        URL.revokeObjectURL(webObjectUrl);
      }
    };
  }, [podcast]);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      visible={podcast !== null}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>{podcast?.type === 'audio' ? 'AUDIO PODCAST' : 'VIDEO PODCAST'}</Text>
            <Text numberOfLines={1} style={styles.title}>{podcast?.title}</Text>
          </View>
          <Pressable accessibilityLabel="Close player" accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
            <X color="#102A43" size={23} strokeWidth={2.4} />
          </Pressable>
        </View>

        <View style={styles.playerArea}>
          {!podcast || !source ? (
            <ActivityIndicator color="#F97316" size="large" />
          ) : podcast.type === 'video' ? (
            <ProtectedVideoPlayer source={source} />
          ) : (
            <ProtectedAudioPlayer podcast={podcast} source={source} />
          )}
        </View>

        <View style={styles.protectionNote}>
          <ShieldCheck color="#15803D" size={18} strokeWidth={2.4} />
          <Text style={styles.protectionText}>Protected playback · available inside Kitabu</Text>
        </View>
      </View>
    </Modal>
  );
}

function ProtectedVideoPlayer({ source }: { source: ProtectedMediaSource }) {
  const videoSource: VideoSource = {
    headers: source.headers,
    metadata: { artist: 'Kitabu Learning', title: 'Kitabu Podcast' },
    uri: source.uri,
    useCaching: false,
  };
  const player = useVideoPlayer(videoSource, instance => {
    instance.allowsExternalPlayback = false;
    instance.loop = false;
    instance.showNowPlayingNotification = false;
    instance.staysActiveInBackground = false;
    instance.play();
  });

  return (
    <VideoView
      allowsFullscreen
      allowsPictureInPicture={false}
      allowsVideoFrameAnalysis={false}
      contentFit="contain"
      fullscreenOptions={{ enable: true, orientation: 'portrait' }}
      nativeControls
      player={player}
      playsInline
      style={styles.video}
    />
  );
}

function ProtectedAudioPlayer({
  podcast,
  source,
}: {
  podcast: Podcast;
  source: ProtectedMediaSource;
}) {
  const player = useAudioPlayer(source, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const progress = status.duration > 0 ? Math.min(100, (status.currentTime / status.duration) * 100) : 0;

  useEffect(() => {
    player.play();
    return () => player.pause();
  }, [player]);

  return (
    <View style={styles.audioCard}>
      <View style={styles.audioArtwork}>
        <Text style={styles.audioArtworkInitials}>TM</Text>
      </View>
      <Text style={styles.audioTitle}>{podcast.title}</Text>
      <Text style={styles.audioSubtitle}>{podcast.subject} · {podcast.author}</Text>

      <View style={styles.audioProgressTrack}>
        <View style={[styles.audioProgressFill, { width: `${progress}%` }]} />
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(status.currentTime)}</Text>
        <Text style={styles.timeText}>{formatTime(status.duration)}</Text>
      </View>

      <Pressable
        accessibilityLabel={status.playing ? 'Pause episode' : 'Play episode'}
        accessibilityRole="button"
        onPress={() => status.playing ? player.pause() : player.play()}
        style={styles.audioPlayButton}>
        {status.playing ? (
          <Pause color="#FFFFFF" fill="#FFFFFF" size={25} />
        ) : (
          <Play color="#FFFFFF" fill="#FFFFFF" size={25} />
        )}
      </Pressable>
    </View>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0:00';
  }
  const seconds = Math.floor(value);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#FFFDF8', flex: 1 },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: '#15803D', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  title: { color: '#102A43', fontSize: 18, fontWeight: '900', marginTop: 3 },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#FFEDD5',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  playerArea: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 18,
  },
  video: {
    aspectRatio: 9 / 16,
    backgroundColor: '#071A13',
    borderRadius: 18,
    maxHeight: '100%',
    overflow: 'hidden',
    width: '100%',
  },
  audioCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#FED7AA',
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 410,
    padding: 24,
    width: '100%',
  },
  audioArtwork: {
    alignItems: 'center',
    backgroundColor: '#FFEDD5',
    borderRadius: 24,
    height: 154,
    justifyContent: 'center',
    width: 154,
  },
  audioArtworkInitials: { color: '#C2410C', fontSize: 48, fontWeight: '900' },
  audioTitle: { color: '#102A43', fontSize: 22, fontWeight: '900', marginTop: 20, textAlign: 'center' },
  audioSubtitle: { color: '#64748B', fontSize: 13, fontWeight: '700', marginTop: 7 },
  audioProgressTrack: {
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    height: 7,
    marginTop: 25,
    overflow: 'hidden',
    width: '100%',
  },
  audioProgressFill: { backgroundColor: '#15803D', borderRadius: 999, height: '100%' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7, width: '100%' },
  timeText: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  audioPlayButton: {
    alignItems: 'center',
    backgroundColor: '#F97316',
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    marginTop: 22,
    paddingLeft: 2,
    width: 60,
  },
  protectionNote: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    paddingBottom: 18,
    paddingHorizontal: 18,
  },
  protectionText: { color: '#52667A', fontSize: 12, fontWeight: '700' },
});
