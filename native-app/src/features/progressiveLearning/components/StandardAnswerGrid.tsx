import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check, X } from 'lucide-react-native';

import { SquishPressable } from './SquishPressable';

export type StandardAnswerChoice = {
  label: string;
  value: string;
};

type StandardAnswerGridProps = {
  choices: StandardAnswerChoice[];
  disabled: boolean;
  isCorrect?: boolean;
  onSelect: (value: string) => void;
  reduceMotion: boolean;
  selectedValue: string | null;
};

export function StandardAnswerGrid({
  choices,
  disabled,
  isCorrect,
  onSelect,
  reduceMotion,
  selectedValue,
}: StandardAnswerGridProps) {
  return (
    <View
      accessibilityLabel="Answer choices"
      accessibilityRole="radiogroup"
      style={styles.grid}
      testID="standard-answer-grid"
    >
      {choices.map((choice, index) => {
        const selected = selectedValue === choice.value;
        const correct = selected && isCorrect === true;
        const incorrect = selected && isCorrect === false;
        const green = index % 2 === 1;
        return (
          <SquishPressable
            accessibilityLabel={choice.label}
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
                green ? styles.greenChoice : styles.orangeChoice,
                selected && styles.selectedChoice,
                correct && styles.correctChoice,
                incorrect && styles.incorrectChoice,
              ]}
            >
              <View
                style={[
                  styles.number,
                  green ? styles.greenNumber : styles.orangeNumber,
                  correct && styles.correctNumber,
                  incorrect && styles.incorrectNumber,
                ]}
              >
                {correct ? (
                  <Check color="#FFFFFF" size={15} strokeWidth={3} />
                ) : incorrect ? (
                  <X color="#FFFFFF" size={15} strokeWidth={3} />
                ) : (
                  <Text style={styles.numberText}>{index + 1}</Text>
                )}
              </View>
              <Text style={styles.label}>{choice.label}</Text>
            </View>
          </SquishPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  choice: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 10,
    minHeight: 70,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  choiceWrap: { width: '48.5%' },
  correctChoice: { backgroundColor: '#F0FDF4', borderColor: '#16A34A' },
  correctNumber: { backgroundColor: '#16A34A' },
  greenChoice: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  greenNumber: { backgroundColor: '#DCFCE7' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  incorrectChoice: { backgroundColor: '#FEF2F2', borderColor: '#EF4444' },
  incorrectNumber: { backgroundColor: '#EF4444' },
  label: {
    color: '#0F172A',
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
    textAlign: 'center',
  },
  number: {
    alignItems: 'center',
    borderRadius: 999,
    height: 27,
    justifyContent: 'center',
    width: 27,
  },
  numberText: { color: '#475569', fontSize: 12, fontWeight: '900' },
  orangeChoice: { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' },
  orangeNumber: { backgroundColor: '#FFEDD5' },
  selectedChoice: { borderColor: '#F97316', borderWidth: 2.5 },
});
