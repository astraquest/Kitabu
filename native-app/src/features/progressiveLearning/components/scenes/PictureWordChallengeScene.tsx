import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Check, X } from 'lucide-react-native';

import type { OnboardingMascotKey } from '../../../../types/app';
import type { LearningVisualSpec } from '../../types';
import { LearningMascotReaction } from '../LearningMascotReaction';
import { SquishPressable } from '../SquishPressable';
import { ObjectIllustration } from './ObjectIllustration';

type PictureWordSpec = Extract<LearningVisualSpec, { kind: 'picture_word' }>;

export type PictureWordChoice = {
  label: string;
  value: string;
};

type PictureWordChallengeSceneProps = {
  choices: PictureWordChoice[];
  disabled: boolean;
  language?: 'en' | 'sw';
  mascotKey: OnboardingMascotKey;
  onSelect: (value: string) => void;
  reduceMotion: boolean;
  selectedAnswer: string | null;
  spec: PictureWordSpec;
  status: 'idle' | 'checking' | 'correct' | 'incorrect';
};

/**
 * Picture-first spelling challenge for early learners.
 * The lesson data supplies the object, word pattern, and choices so this scene
 * can be reused across subjects and vocabulary sets.
 */
export function PictureWordChallengeScene({
  choices,
  disabled,
  language = 'en',
  mascotKey,
  onSelect,
  reduceMotion,
  selectedAnswer,
  spec,
  status,
}: PictureWordChallengeSceneProps) {
  const [remoteImageFailed, setRemoteImageFailed] = React.useState(false);
  const feedbackText =
    status === 'correct'
      ? language === 'sw'
        ? 'Hongera!'
        : 'Well done!'
      : status === 'incorrect'
        ? language === 'sw'
          ? 'Jaribu herufi nyingine.'
          : 'Try another letter.'
        : status === 'checking'
          ? language === 'sw'
            ? 'Inaangaliwa...'
            : 'Checking...'
          : null;
  const challengeLabel =
    language === 'sw'
      ? `Zoezi la picha na neno: ${spec.caption}. ${spec.wordPattern}`
      : `Picture word challenge: ${spec.caption}. ${spec.wordPattern}`;

  return (
    <View
      accessibilityLabel={challengeLabel}
      style={styles.challenge}
      testID="picture-word-challenge"
    >
      <View style={styles.mascotPerch}>
        <LearningMascotReaction
          mascotKey={mascotKey}
          reaction={
            status === 'correct'
              ? 'correct'
              : status === 'incorrect'
                ? 'encourage'
                : status === 'checking'
                  ? 'thinking'
                  : 'idle'
          }
          size={88}
        />
      </View>

      <View
        accessibilityLabel={language === 'sw' ? `Picha ya ${spec.caption}` : `Picture of ${spec.caption}`}
        accessibilityRole="image"
        style={styles.pictureStage}
      >
        {spec.imageUrl && !remoteImageFailed ? (
          <Image accessibilityLabel={`Picture of ${spec.caption}`} onError={() => setRemoteImageFailed(true)} resizeMethod="resize" source={{ cache: 'default', uri: spec.imageUrl }} style={styles.remoteImage} testID="picture-word-remote-image" />
        ) : (
          <ObjectIllustration kind={spec.object} size={148} />
        )}
      </View>

      <Text accessibilityRole="header" style={styles.wordPattern}>
        {spec.wordPattern}
      </Text>

      <View
        accessibilityLabel={language === 'sw' ? 'Chaguo za herufi' : 'Letter choices'}
        accessibilityRole="radiogroup"
        style={styles.choiceRow}
      >
        {choices.map(choice => {
          const selected = selectedAnswer === choice.value;
          const correct = selected && status === 'correct';
          const incorrect = selected && status === 'incorrect';

          return (
            <SquishPressable
              accessibilityLabel={
                language === 'sw'
                  ? `Chagua herufi ${choice.label}`
                  : `Choose letter ${choice.label}`
              }
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              containerStyle={styles.choiceWrap}
              disabled={disabled}
              key={choice.value}
              onPress={() => onSelect(choice.value)}
              reduceMotion={reduceMotion}
            >
              <View
                style={[
                  styles.choice,
                  selected && styles.choiceSelected,
                  correct && styles.choiceCorrect,
                  incorrect && styles.choiceIncorrect,
                ]}
              >
                <Text style={styles.choiceText}>{choice.label}</Text>
                {correct ? (
                  <View style={[styles.resultBadge, styles.correctBadge]}>
                    <Check color="#FFFFFF" size={13} strokeWidth={3.2} />
                  </View>
                ) : null}
                {incorrect ? (
                  <View style={[styles.resultBadge, styles.incorrectBadge]}>
                    <X color="#FFFFFF" size={13} strokeWidth={3.2} />
                  </View>
                ) : null}
              </View>
            </SquishPressable>
          );
        })}
      </View>

      {feedbackText ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[
            styles.feedback,
            status === 'correct' && styles.feedbackCorrect,
            status === 'incorrect' && styles.feedbackIncorrect,
          ]}
        >
          {feedbackText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  challenge: {
    alignItems: 'center',
    backgroundColor: '#FFFBEC',
    borderColor: '#E5D7B3',
    borderRadius: 28,
    borderWidth: 1.5,
    marginTop: 42,
    paddingBottom: 22,
    paddingHorizontal: 16,
    paddingTop: 54,
  },
  choice: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D8C99D',
    borderRadius: 999,
    borderWidth: 1.5,
    elevation: 2,
    height: 64,
    justifyContent: 'center',
    shadowColor: '#8A6C2E',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 3,
    width: 64,
  },
  choiceCorrect: { backgroundColor: '#E4F8E7', borderColor: '#22A45D', borderWidth: 2.5 },
  choiceIncorrect: { backgroundColor: '#FFF0EB', borderColor: '#F17863', borderWidth: 2.5 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 22 },
  choiceSelected: { backgroundColor: '#EDF3FF', borderColor: '#4F7CE8', borderWidth: 2.5 },
  choiceText: { color: '#082B4A', fontSize: 24, fontWeight: '900' },
  choiceWrap: { height: 64, width: 64 },
  correctBadge: { backgroundColor: '#22A45D' },
  feedback: { color: '#526963', fontSize: 14, fontWeight: '900', marginTop: 16 },
  feedbackCorrect: { color: '#18864A' },
  feedbackIncorrect: { color: '#C34C3B' },
  incorrectBadge: { backgroundColor: '#F17863' },
  mascotPerch: { alignItems: 'center', left: 0, position: 'absolute', right: 0, top: -46, zIndex: 2 },
  pictureStage: {
    alignItems: 'center',
    backgroundColor: '#EAF5FF',
    borderRadius: 24,
    height: 170,
    justifyContent: 'center',
    width: '100%',
  },
  resultBadge: {
    alignItems: 'center',
    borderRadius: 999,
    height: 22,
    justifyContent: 'center',
    position: 'absolute',
    right: -3,
    top: -3,
    width: 22,
  },
  remoteImage: { height: 148, resizeMode: 'contain', width: 148 },
  wordPattern: {
    color: '#082B4A',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 4,
    marginTop: 18,
    textAlign: 'center',
  },
});
