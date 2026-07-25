import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Atom,
  BookOpen,
  Bot,
  Calculator,
  Gamepad2,
  Globe,
  Languages,
  Palette,
  Sprout,
} from 'lucide-react-native';

import { Subject } from '../types/app';
import { getSubjectIconSource } from '../features/progressiveLearning/model/subjectIconAssets';

const SUBJECT_ORDER = [
  'science',
  'english',
  'math',
  'kiswahili',
  'social',
  'agriculture',
  'creative_arts',
  'ai_education',
];
const MAX_SELECTED_SUBJECTS = 5;

const SUBJECT_ICONS: Record<
  string,
  React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>
> = {
  science: Atom,
  english: BookOpen,
  math: Calculator,
  kiswahili: Languages,
  social: Globe,
  agriculture: Sprout,
  creative_arts: Palette,
  creative_activities: Palette,
  environmental: Sprout,
  mathematics: Calculator,
  cre: BookOpen,
  ire: BookOpen,
  hre: BookOpen,
  indigenous_languages: Languages,
  hygiene_nutrition: Sprout,
  ai_education: Bot,
};

interface SubjectGridProps {
  subjects: Subject[];
  allSubjects?: Subject[];
  selectedSubjectIds?: string[];
  onOpenSubject: (subject: Subject) => void;
  onSaveSubjectSelection?: (subjectIds: string[]) => void;
  onOpenGameZone: () => void;
}

export function SubjectGrid({
  subjects,
  onOpenSubject,
  onOpenGameZone,
}: SubjectGridProps) {
  const orderedSubjects = subjects;
  const { cardHeight, cardWidth, iconSize } = useSubjectGridSizing(orderedSubjects.length);

  return (
    <View style={styles.subjectSection}>
      <View style={styles.subjectGrid}>
        {orderedSubjects.map(subject => {
          const Icon = SUBJECT_ICONS[subject.id] || BookOpen;
          const iconSource = getSubjectIconSource(subject.id) ?? getSubjectIconSource(subject.name);

          return (
            <Pressable
              key={subject.id}
              onPress={() => onOpenSubject(subject)}
              style={({ pressed }) => [
                { height: cardHeight, width: cardWidth },
                pressed && styles.subjectCardPressed,
              ]}>
              <LinearGradient
                colors={[subject.colorFrom, subject.colorTo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.subjectCard}>
                <View style={styles.subjectTexture} />
                <View style={styles.subjectGlow} />

                <View style={styles.subjectInner}>
                  {iconSource ? (
                    <Image
                      accessibilityLabel={`${subject.name} subject icon`}
                      resizeMode="contain"
                      source={iconSource}
                      style={{ height: iconSize + 10, width: iconSize + 10 }}
                    />
                  ) : (
                    <Icon color="#FFFFFF" size={iconSize} strokeWidth={2.15} />
                  )}
                  <Text style={styles.subjectName}>{subject.name}</Text>
                </View>
              </LinearGradient>
            </Pressable>
          );
        })}

        <Pressable
          onPress={onOpenGameZone}
          style={({ pressed }) => [
            { height: cardHeight, width: cardWidth },
            pressed && styles.subjectCardPressed,
          ]}>
          <LinearGradient
            colors={['#1F2937', '#111827']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.subjectCard}>
            <View style={styles.gameZoneTexture} />
            <View style={styles.gameZoneGlow} />

            <View style={styles.subjectInner}>
              <Gamepad2 color="#60A5FA" size={iconSize} strokeWidth={2.2} />
              <Text style={styles.subjectName}>Game Zone</Text>
              <View style={styles.gameZoneChip}>
                <View style={styles.subjectChipDot} />
                <Text style={styles.gameZoneChipText}>Live</Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

interface SubjectSelectorProps {
  allSubjects: Subject[];
  selectedSubjectIds: string[];
  onToggleSubject: (subjectId: string) => void;
}

export function SubjectSelector({
  allSubjects,
  selectedSubjectIds,
  onToggleSubject,
}: SubjectSelectorProps) {
  const orderedAllSubjects = useMemo(() => orderSubjects(allSubjects), [allSubjects]);
  const selectedCount = selectedSubjectIds.length;
  const hasReachedLimit = selectedCount >= MAX_SELECTED_SUBJECTS;

  function isSelected(subjectId: string) {
    return selectedSubjectIds.includes(subjectId);
  }

  return (
    <View style={styles.selectorPanel}>
      <View style={styles.selectorHeader}>
        <View>
          <Text style={styles.selectorTitle}>All Subjects</Text>
          <Text style={styles.selectorMeta}>{selectedCount}/{MAX_SELECTED_SUBJECTS} selected</Text>
        </View>
        <Text style={styles.limitText}>
          {hasReachedLimit ? 'Limit reached' : `Choose up to ${MAX_SELECTED_SUBJECTS}`}
        </Text>
      </View>
      <View style={styles.selectorGrid}>
        {orderedAllSubjects.map(subject => {
          const selected = isSelected(subject.id);
          const disabled = !selected && hasReachedLimit;
          const Icon = SUBJECT_ICONS[subject.id] || BookOpen;
          const iconSource = getSubjectIconSource(subject.id) ?? getSubjectIconSource(subject.name);

          return (
            <Pressable
              key={subject.id}
              disabled={disabled}
              onPress={() => onToggleSubject(subject.id)}
              style={({ pressed }) => [
                styles.selectorChip,
                selected && styles.selectorChipSelected,
                disabled && styles.selectorChipDisabled,
                pressed && styles.selectorChipPressed,
              ]}>
              {iconSource ? (
                <Image
                  accessibilityLabel={`${subject.name} subject icon`}
                  resizeMode="contain"
                  source={iconSource}
                  style={styles.selectorSubjectIcon}
                />
              ) : (
                <Icon color={selected ? '#FFFFFF' : '#334155'} size={16} strokeWidth={2.2} />
              )}
              <Text
                style={[
                  styles.selectorChipText,
                  selected && styles.selectorChipTextSelected,
                ]}>
                {subject.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function orderSubjects(items: Subject[]) {
  const orderMap = new Map(SUBJECT_ORDER.map((id, index) => [id, index]));

  return [...items].sort((left, right) => {
    const leftOrder = orderMap.get(left.id) ?? 99;
    const rightOrder = orderMap.get(right.id) ?? 99;
    return leftOrder - rightOrder;
  });
}

function getRows(count: number, columns: number) {
  return Math.ceil((count + 1) / columns);
}

export function useSubjectGridSizing(subjectCount: number) {
  const { height, width } = useWindowDimensions();
  const columns = 2;
  const gap = 8;
  const horizontalPadding = 32;
  const rows = getRows(subjectCount, columns);
  const cardWidth = Math.floor((width - horizontalPadding - gap * (columns - 1)) / columns);
  const cardHeight = Math.max(62, Math.min(82, Math.floor((height * 0.24) / rows)));
  const iconSize = cardHeight < 72 ? 20 : 23;
  return { cardHeight, cardWidth, iconSize };
}

const styles = StyleSheet.create({
  subjectSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  limitText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '900',
  },
  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorSubjectIcon: {
    height: 20,
    width: 20,
  },
  subjectCard: {
    borderRadius: 14,
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  subjectCardPressed: {
    transform: [{ scale: 0.985 }],
  },
  subjectTexture: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  subjectGlow: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 40,
    height: 64,
    position: 'absolute',
    right: -18,
    top: -10,
    width: 64,
  },
  subjectInner: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  subjectName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  gameZoneTexture: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  gameZoneGlow: {
    backgroundColor: 'rgba(59,130,246,0.2)',
    borderRadius: 40,
    bottom: -18,
    height: 72,
    position: 'absolute',
    right: -14,
    width: 72,
  },
  gameZoneChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  subjectChipDot: {
    backgroundColor: '#4ADE80',
    borderRadius: 4,
    height: 6,
    width: 6,
  },
  gameZoneChipText: {
    color: '#86EFAC',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  selectorPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  selectorTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },
  selectorHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  selectorMeta: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  selectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorChip: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  selectorChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  selectorChipDisabled: {
    opacity: 0.45,
  },
  selectorChipPressed: {
    opacity: 0.86,
  },
  selectorChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
  },
  selectorChipTextSelected: {
    color: '#FFFFFF',
  },
});
