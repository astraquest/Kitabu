import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { BookOpen, Paperclip, Plus, Trash2, Upload } from 'lucide-react-native';

import { SUPPORTED_GRADES } from '../../constants/grades';
import { LearningStrand } from '../../types/app';
import { InteractiveLearningPublisherPanel } from './InteractiveLearningPublisherPanel';
import { AdminLearningAssetsPanel } from './AdminLearningAssetsPanel';

interface AdminCurriculumSectionProps {
  styles: Record<string, any>;
  currentGrade: string;
  currentSubjects: Array<{ id: string; name: string }>;
  curriculumData: Record<string, LearningStrand[]>;
  pdfImportStatus: string;
  processingSubjectId: string | null;
  onSelectGrade: (grade: string) => void;
  onAddSubject: () => void;
  onActivateSubject: (subject: { id: string; name: string }, strands: LearningStrand[]) => void;
  onImportSubject: (subject: { id: string; name: string }) => void;
  onOpenEditor: (subject: { id: string; name: string }) => void;
  onRemoveSubject: (subjectId: string) => void;
}

export function AdminCurriculumSection({
  styles,
  currentGrade,
  currentSubjects,
  curriculumData,
  pdfImportStatus,
  processingSubjectId,
  onSelectGrade,
  onAddSubject,
  onActivateSubject,
  onImportSubject,
  onOpenEditor,
  onRemoveSubject,
}: AdminCurriculumSectionProps) {
  const [showAssets, setShowAssets] = useState(false);

  return (
    <>
      <View style={styles.cardsRow}>
        <View style={[styles.heroCard, styles.blue]}>
          <Text style={styles.heroLabel}>Most Active Subject</Text>
          <Text style={styles.panelTitleLight}>Mathematics</Text>
          <Text style={styles.heroMeta}>450 Daily Users</Text>
        </View>
        <View style={[styles.heroCard, styles.red]}>
          <Text style={styles.heroLabel}>Least Active Subject</Text>
          <Text style={styles.panelTitleLight}>Social Studies</Text>
          <Text style={styles.heroMeta}>Needs Content Update</Text>
        </View>
      </View>

      <View style={styles.pageHeadRow}>
        <View style={styles.pageHead}>
          <Text style={styles.pageTitle}>Curriculum</Text>
          <Text style={styles.pageSub}>{showAssets ? 'View generated 3D learning assets.' : 'Select grade and subject to edit.'}</Text>
        </View>
        {!showAssets ? (
          <Pressable accessibilityLabel="Add subject" onPress={onAddSubject} style={styles.blackFab}>
            <Plus size={18} color="#FFF" />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gradeRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowAssets(true)}
          style={[styles.gradeChip, showAssets && styles.gradeChipActive]}>
          <Text style={[styles.gradeChipText, showAssets && styles.gradeChipTextActive]}>Assets</Text>
        </Pressable>
        {SUPPORTED_GRADES.map(grade => (
          <Pressable
            key={grade}
            onPress={() => {
              setShowAssets(false);
              onSelectGrade(grade);
            }}
            style={[styles.gradeChip, !showAssets && currentGrade === grade && styles.gradeChipActive]}>
            <Text style={[styles.gradeChipText, !showAssets && currentGrade === grade && styles.gradeChipTextActive]}>
              {grade}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {showAssets ? <AdminLearningAssetsPanel /> : <>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>PDF Import</Text>
          <Text style={styles.panelText}>Import bridge status: {pdfImportStatus}</Text>
        </View>

        <InteractiveLearningPublisherPanel styles={styles} />

        <View style={styles.list}>
        {currentSubjects.map(subject => {
          const strands = curriculumData[`${currentGrade}-${subject.id}`] || [];
          const hasCurriculum = strands.length > 0;

          return (
            <View key={subject.id} style={styles.curriculumItem}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.itemTitle}>{subject.name}</Text>
                  <Text style={styles.itemMeta}>
                    {hasCurriculum ? `${strands.length} strand(s) available` : 'No curriculum'}
                  </Text>
                </View>
                <View style={styles.actionRow}>
                  <Pressable
                    onPress={() => onActivateSubject(subject, strands)}
                    style={styles.blueBtn}>
                    <Text style={styles.blueBtnText}>{hasCurriculum ? 'Refresh' : 'Activate'}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onImportSubject(subject)}
                    style={[styles.ghostBtn, hasCurriculum && styles.ghostBtnActive]}>
                    {processingSubjectId === subject.id ? (
                      <ActivityIndicator size="small" color="#2563EB" />
                    ) : hasCurriculum ? (
                      <Paperclip size={16} color="#2563EB" />
                    ) : (
                      <Upload size={16} color="#9CA3AF" />
                    )}
                  </Pressable>
                  <Pressable onPress={() => onOpenEditor(subject)} style={styles.ghostBtn}>
                    <BookOpen size={16} color="#2563EB" />
                  </Pressable>
                  <Pressable onPress={() => onRemoveSubject(subject.id)} style={styles.deleteBtn}>
                    <Trash2 size={16} color="#DC2626" />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
        </View>
      </>}
    </>
  );
}
