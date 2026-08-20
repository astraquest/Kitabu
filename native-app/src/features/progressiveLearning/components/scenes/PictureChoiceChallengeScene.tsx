import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Check, X } from 'lucide-react-native';

import type { OnboardingMascotKey } from '../../../../types/app';
import type { LearningVisualSpec } from '../../types';
import { LearningMascotReaction } from '../LearningMascotReaction';
import { SquishPressable } from '../SquishPressable';
import { ObjectIllustration } from './ObjectIllustration';

type PictureChoiceSpec = Extract<LearningVisualSpec, { kind: 'picture_choice' | 'picture_group' }>;

type PictureChoiceChallengeSceneProps = {
  choices: Array<{ label: string; value: string }>;
  disabled: boolean;
  mascotKey: OnboardingMascotKey;
  onSelect: (value: string) => void;
  prompt: string;
  reduceMotion: boolean;
  selectedAnswer: string | null;
  spec: PictureChoiceSpec;
  status: 'idle' | 'checking' | 'correct' | 'incorrect';
  feedbackMessage?: string;
  retryHint?: string;
};

/** Reusable picture-led assessment for early learners. */
export function PictureChoiceChallengeScene({
  choices,
  disabled,
  mascotKey,
  onSelect,
  prompt,
  reduceMotion,
  selectedAnswer,
  spec,
  status,
  feedbackMessage,
  retryHint,
}: PictureChoiceChallengeSceneProps) {
  const [remoteImageFailed, setRemoteImageFailed] = React.useState(false);
  const feedbackText =
    status === 'correct'
      ? feedbackMessage ?? 'Well done!'
      : status === 'incorrect'
        ? retryHint ?? 'Look again and try another answer.'
        : status === 'checking'
          ? 'Checking...'
          : null;

  return (
    <View
      accessibilityLabel={`Picture challenge: ${prompt}. Picture of ${spec.caption}`}
      style={styles.challenge}
      testID="picture-choice-challenge"
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

      <Text accessibilityRole="header" style={styles.prompt}>
        {prompt}
      </Text>

      <View
        accessibilityLabel={`Picture of ${spec.caption}`}
        accessibilityRole="image"
        style={styles.pictureStage}
      >
        {spec.kind === 'picture_group' ? (
          <View accessibilityLabel={`${spec.equation}: ${spec.groups.map(group => group.count).join(' plus ')}`} style={styles.groupEquation} testID="picture-choice-picture-group">
            {spec.groups.map((group, groupIndex) => (
              <React.Fragment key={`${groupIndex}-${group.count}`}>
                {groupIndex > 0 ? <Text style={styles.operator}>+</Text> : null}
                <View style={styles.imageGroup}>
                  {Array.from({ length: group.count }, (_, imageIndex) => spec.imageUrl && !remoteImageFailed ? (
                    <Image accessibilityLabel={`Picture ${imageIndex + 1} of group ${groupIndex + 1}`} key={imageIndex} onError={() => setRemoteImageFailed(true)} resizeMethod="resize" source={{ cache: 'default', uri: spec.imageUrl }} style={styles.groupImage} testID={`picture-choice-remote-group-image-${groupIndex}-${imageIndex}`} />
                  ) : <ObjectIllustration key={imageIndex} kind={spec.object} size={42} />)}
                </View>
              </React.Fragment>
            ))}
          </View>
        ) : spec.imageUrl && !remoteImageFailed ? (
          <Image accessibilityLabel={`Picture of ${spec.caption}`} onError={() => setRemoteImageFailed(true)} resizeMethod="resize" source={{ cache: 'default', uri: spec.imageUrl }} style={styles.remoteImage} testID="picture-choice-remote-image" />
        ) : (
          <ObjectIllustration kind={spec.object} size={150} />
        )}
      </View>

      <View
        accessibilityLabel="Answer choices"
        accessibilityRole="radiogroup"
        style={styles.answerGrid}
      >
        {choices.map(choice => {
          const selected = selectedAnswer === choice.value;
          const correct = selected && status === 'correct';
          const incorrect = selected && status === 'incorrect';

          return (
            <SquishPressable
              accessibilityLabel={`Choose answer ${choice.label}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              containerStyle={styles.answerWrap}
              disabled={disabled}
              key={choice.value}
              onPress={() => onSelect(choice.value)}
              reduceMotion={reduceMotion}
            >
              <View
                style={[
                  styles.answer,
                  selected && styles.answerSelected,
                  correct && styles.answerCorrect,
                  incorrect && styles.answerIncorrect,
                ]}
              >
                <Text numberOfLines={2} style={styles.answerText}>
                  {choice.label}
                </Text>
                {correct ? (
                  <View style={[styles.resultBadge, styles.correctBadge]}>
                    <Check color="#FFFFFF" size={14} strokeWidth={3.2} />
                  </View>
                ) : null}
                {incorrect ? (
                  <View style={[styles.resultBadge, styles.incorrectBadge]}>
                    <X color="#FFFFFF" size={14} strokeWidth={3.2} />
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
  answer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D8C99D',
    borderRadius: 18,
    borderWidth: 1.5,
    elevation: 2,
    justifyContent: 'center',
    minHeight: 72,
    paddingHorizontal: 12,
    shadowColor: '#8A6C2E',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  answerCorrect: { backgroundColor: '#E4F8E7', borderColor: '#22A45D', borderWidth: 2.5 },
  answerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  answerIncorrect: { backgroundColor: '#FFF0EB', borderColor: '#F17863', borderWidth: 2.5 },
  answerSelected: { backgroundColor: '#EDF3FF', borderColor: '#4F7CE8', borderWidth: 2.5 },
  answerText: { color: '#082B4A', fontSize: 17, fontWeight: '900', textAlign: 'center' },
  answerWrap: { flexBasis: '47%', flexGrow: 1, maxWidth: '49%' },
  challenge: {
    alignItems: 'center',
    backgroundColor: '#FFFBEC',
    borderColor: '#E5D7B3',
    borderRadius: 28,
    borderWidth: 1.5,
    marginTop: 42,
    paddingBottom: 20,
    paddingHorizontal: 14,
    paddingTop: 54,
  },
  correctBadge: { backgroundColor: '#22A45D' },
  feedback: { color: '#526963', fontSize: 13, fontWeight: '900', marginTop: 14 },
  feedbackCorrect: { color: '#18864A' },
  feedbackIncorrect: { color: '#C34C3B' },
  incorrectBadge: { backgroundColor: '#F17863' },
  mascotPerch: { alignItems: 'center', left: 0, position: 'absolute', right: 0, top: -46, zIndex: 2 },
  pictureStage: {
    alignItems: 'center',
    backgroundColor: '#EAF5FF',
    borderRadius: 24,
    height: 164,
    justifyContent: 'center',
    marginTop: 14,
    width: '100%',
  },
  groupEquation: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '100%', paddingHorizontal: 8 },
  groupImage: { height: 42, resizeMode: 'contain', width: 42 },
  imageGroup: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '42%' },
  operator: { color: '#082B4A', fontSize: 28, fontWeight: '900', marginHorizontal: 6 },
  prompt: { color: '#082B4A', fontSize: 22, fontWeight: '900', lineHeight: 27, textAlign: 'center' },
  remoteImage: { height: 150, resizeMode: 'contain', width: 150 },
  resultBadge: {
    alignItems: 'center',
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: 6,
    top: 6,
    width: 24,
  },
});
