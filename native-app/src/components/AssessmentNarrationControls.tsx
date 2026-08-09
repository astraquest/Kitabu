import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Pause, Play, RotateCcw, Volume2 } from 'lucide-react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { loadJson, saveJson } from '../services/storage';
import { ApiRequestError } from '../services/requestHelpers';
import { captureAppException } from '../observability/sentry';
import {
  getNarrationPreference,
  resolveAssessmentNarration,
  type AssessmentNarrationSegment,
  type NarrationResolution
} from '../services/assessmentNarrationService';
import type { OnboardingLanguageCode } from '../types/app';

const SOUND_CONSENT_KEY = 'kitabu_assessment_sound_consent';

export async function setAssessmentSoundConsent(enabled: boolean) {
  await saveJson(SOUND_CONSENT_KEY, enabled);
}

type Props = {
  descriptorId: string;
  nextDescriptorIds?: string[];
  languageCode?: OnboardingLanguageCode;
  segment?: AssessmentNarrationSegment;
  choiceIndex?: number;
};

export function AssessmentNarrationControls({
  descriptorId,
  nextDescriptorIds = [],
  languageCode = 'en',
  segment = 'question',
  choiceIndex
}: Props) {
  const playerRef = useRef<AudioPlayer | null>(null);
  const requestRef = useRef(0);
  const [resolution, setResolution] = useState<NarrationResolution | null>(null);
  const [playing, setPlaying] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    const requestId = ++requestRef.current;
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    setResolution(null);
    setPlaying(false);
    playerRef.current?.pause();
    playerRef.current?.remove();
    playerRef.current = null;

    (async () => {
      const [preference, soundConsent] = await Promise.all([
        getNarrationPreference().catch(() => ({ selectedProfile: 'Samora' as const, enabled: false })),
        loadJson<boolean>(SOUND_CONSENT_KEY, false)
      ]);
      if (!active || requestId !== requestRef.current || !preference.enabled || !soundConsent) return;

      let current: NarrationResolution | null = null;
      try {
        current = await resolveAssessmentNarration({ descriptorId, segment, choiceIndex, languageCode });
      } catch (error) {
        captureAppException(error, {
          source: 'assessment_narration_resolve',
          status: error instanceof ApiRequestError ? error.status : null,
          identitySha256: null
        });
      }
      if (!active || requestId !== requestRef.current || !current) return;
      setResolution(current);
      if (current.status === 'pending') {
        retryTimer = setTimeout(() => {
          if (active) setRetryNonce(value => value + 1);
        }, 5000);
      }

      // Common assessment assets are warmed without delaying the visible question.
      void Promise.all(nextDescriptorIds.slice(0, 2).map(nextDescriptorId =>
        resolveAssessmentNarration({ descriptorId: nextDescriptorId, segment: 'question', languageCode }).catch(error => {
          captureAppException(error, {
            source: 'assessment_narration_prefetch',
            status: error instanceof ApiRequestError ? error.status : null,
            identitySha256: null
          });
          return null;
        })
      ));

      if (current.status === 'ready' && segment === 'question') {
        try {
          const player = createAudioPlayer(current.url, { downloadFirst: true });
          playerRef.current = player;
          player.play();
          setPlaying(true);
        } catch (error) {
          captureAppException(error, {
            source: 'assessment_narration_player_autoplay',
            status: 'ready',
            identitySha256: current.identitySha256
          });
        }
      }
    })().catch(error => {
      captureAppException(error, {
        source: 'assessment_narration_resolve',
        status: error instanceof ApiRequestError ? error.status : null,
        identitySha256: null
      });
    });

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
      playerRef.current?.pause();
      playerRef.current?.remove();
      playerRef.current = null;
    };
  }, [choiceIndex, descriptorId, languageCode, retryNonce, segment, nextDescriptorIds.join('|')]);

  if (!resolution || resolution.status === 'unavailable') return null;

  function replay() {
    if (resolution.status !== 'ready') return;
    try {
      playerRef.current?.remove();
      const player = createAudioPlayer(resolution.url, { downloadFirst: true });
      playerRef.current = player;
      player.play();
      setPlaying(true);
    } catch (error) {
      captureAppException(error, {
        source: 'assessment_narration_player_replay',
        status: 'ready',
        identitySha256: resolution.identitySha256
      });
    }
  }

  function togglePause() {
    if (!playerRef.current) return;
    if (playing) {
      playerRef.current.pause();
      setPlaying(false);
    } else {
      try {
        playerRef.current.play();
        setPlaying(true);
      } catch (error) {
        captureAppException(error, {
          source: 'assessment_narration_player_play',
          status: 'ready',
          identitySha256: resolution.status === 'ready' ? resolution.identitySha256 : null
        });
      }
    }
  }

  return (
    <View accessibilityLabel="Question narration controls" style={styles.wrap}>
      <Volume2 color="#2563EB" size={16} />
      {resolution.status === 'pending' ? <Text style={styles.pending}>Preparing audio…</Text> : null}
      {resolution.status === 'ready' ? (
        <>
          <Pressable accessibilityLabel={playing ? 'Pause question narration' : 'Play question narration'} onPress={togglePause} style={styles.button}>
            {playing ? <Pause color="#1D4ED8" size={15} /> : <Play color="#1D4ED8" size={15} />}
          </Pressable>
          <Pressable accessibilityLabel="Replay question narration" onPress={replay} style={styles.button}>
            <RotateCcw color="#1D4ED8" size={15} />
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 10, minHeight: 28 },
  pending: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  button: { alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 14, height: 28, justifyContent: 'center', width: 30 }
});
