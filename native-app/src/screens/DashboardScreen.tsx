import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PromoBanner } from '../components/PromoBanner';
import { QuickAccessGrid } from '../components/QuickAccessGrid';
import { SubjectGrid } from '../components/SubjectGrid';
import { SUPPORTED_GRADES } from '../constants/grades';
import { DashboardBanner, Subject } from '../types/app';

interface DashboardScreenProps {
  banner: DashboardBanner | null;
  homeworkNotificationCount: number;
  currentGrade: string;
  subjects: Subject[];
  allSubjects: Subject[];
  selectedSubjectIds: string[];
  onSelectGrade: (grade: string) => void;
  onOpenSubject: (subject: Subject) => void;
  onSaveSubjectSelection: (subjectIds: string[]) => void;
  onOpenFeature: (
    view:
      | 'homework_list'
      | 'bookshelf_view'
      | 'quiz_me_config'
      | 'live_audio'
      | 'game_zone'
      | 'podcasts_view'
      | 'teachers_portal'
      | 'admin_portal',
  ) => void;
  onBannerAction: (target: DashboardBanner['ctaTarget']) => void;
}

type DashboardActionTarget =
  | 'bookshelf_view'
  | 'podcasts_view'
  | 'quiz_me_config'
  | 'homework_list';

export function DashboardScreen({
  banner,
  homeworkNotificationCount,
  currentGrade,
  subjects,
  allSubjects,
  selectedSubjectIds,
  onSelectGrade,
  onOpenSubject,
  onSaveSubjectSelection,
  onOpenFeature,
  onBannerAction,
}: DashboardScreenProps) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <GradeSelector currentGrade={currentGrade} onSelectGrade={onSelectGrade} />
      <PromoBanner banner={banner} onPressCta={onBannerAction} />
      <QuickAccessGrid
        pendingAssignments={homeworkNotificationCount}
        onOpenFeature={view => onOpenFeature(view as DashboardActionTarget)}
      />
      <SubjectGrid
        subjects={subjects}
        allSubjects={allSubjects}
        selectedSubjectIds={selectedSubjectIds}
        onOpenSubject={onOpenSubject}
        onSaveSubjectSelection={onSaveSubjectSelection}
        onOpenGameZone={() => onOpenFeature('game_zone')}
      />
    </ScrollView>
  );
}

function GradeSelector({
  currentGrade,
  onSelectGrade,
}: {
  currentGrade: string;
  onSelectGrade: (grade: string) => void;
}) {
  return (
    <View style={styles.gradeSection}>
      <View style={styles.gradeHeader}>
        <Text style={styles.gradeEyebrow}>Learning level</Text>
        <Text style={styles.gradeCurrent}>{currentGrade}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.gradeRail}>
        {SUPPORTED_GRADES.map(grade => {
          const active = grade === currentGrade;

          return (
            <Pressable
              key={grade}
              accessibilityLabel={`Select ${grade}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onSelectGrade(grade)}
              style={({ pressed }) => [
                styles.gradeChip,
                active && styles.gradeChipActive,
                pressed && styles.gradeChipPressed,
              ]}>
              <Text style={[styles.gradeChipText, active && styles.gradeChipTextActive]}>
                {grade}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F9FAFB',
    flex: 1,
  },
  content: {
    paddingBottom: 28,
  },
  gradeSection: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E5EAF2',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  gradeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gradeEyebrow: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  gradeCurrent: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
  },
  gradeRail: {
    gap: 8,
    paddingRight: 8,
  },
  gradeChip: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#D7E2F0',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 78,
    paddingHorizontal: 14,
  },
  gradeChipActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  gradeChipPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  gradeChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '900',
  },
  gradeChipTextActive: {
    color: '#FFFFFF',
  },
});
