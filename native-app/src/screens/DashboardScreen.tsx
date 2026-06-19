import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { PromoBanner } from '../components/PromoBanner';
import { QuickAccessGrid } from '../components/QuickAccessGrid';
import { SubjectGrid } from '../components/SubjectGrid';
import { DashboardBanner, Subject } from '../types/app';

interface DashboardScreenProps {
  banner: DashboardBanner | null;
  homeworkNotificationCount: number;
  subjects: Subject[];
  allSubjects: Subject[];
  selectedSubjectIds: string[];
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
  subjects,
  allSubjects,
  selectedSubjectIds,
  onOpenSubject,
  onSaveSubjectSelection,
  onOpenFeature,
  onBannerAction,
}: DashboardScreenProps) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      stickyHeaderIndices={[1]}>
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

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F9FAFB',
    flex: 1,
  },
  content: {
    paddingBottom: 28,
  },
});
