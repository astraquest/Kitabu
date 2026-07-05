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
  onOpenSubject: (subject: Subject) => void;
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
  onOpenSubject,
  onOpenFeature,
  onBannerAction,
}: DashboardScreenProps) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <PromoBanner banner={banner} onPressCta={onBannerAction} />
      <QuickAccessGrid
        pendingAssignments={homeworkNotificationCount}
        onOpenFeature={view => onOpenFeature(view as DashboardActionTarget)}
      />
      <SubjectGrid
        subjects={subjects}
        onOpenSubject={onOpenSubject}
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
