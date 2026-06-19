import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { AlertCircle, ChevronDown, ChevronRight, SortAsc, TrendingUp } from 'lucide-react-native';

import { SUPPORTED_GRADES, TEACHER_ALL_GRADES_FILTER } from '../../constants/grades';
import { StudentPerformance } from '../../types/app';
import { TeacherAvatarBadge } from './TeacherAvatarBadge';

interface TeacherStudentsSectionProps {
  styles: Record<string, any>;
  gradeFilter: string;
  gradeMenuOpen: boolean;
  sortBy: 'name' | 'score';
  showRemedial: boolean;
  averageScore: number;
  averageHomework: number;
  remedialCount: number;
  filteredStudents: StudentPerformance[];
  onToggleGradeMenu: () => void;
  onSelectGrade: (value: string) => void;
  onToggleSort: () => void;
  onToggleRemedial: () => void;
  onSelectStudent: (student: StudentPerformance) => void;
}

export function TeacherStudentsSection({
  styles,
  gradeFilter,
  gradeMenuOpen,
  sortBy,
  showRemedial,
  averageScore,
  averageHomework,
  remedialCount,
  filteredStudents,
  onToggleGradeMenu,
  onSelectGrade,
  onToggleSort,
  onToggleRemedial,
  onSelectStudent,
}: TeacherStudentsSectionProps) {
  return (
    <>
      <View style={styles.filterRow}>
        <View style={styles.dropdownWrap}>
          <Pressable onPress={onToggleGradeMenu} style={styles.chip}>
            <Text style={styles.chipText}>
              {gradeFilter === 'All' ? 'All Grades' : gradeFilter}
            </Text>
            <ChevronDown size={14} color="#6B7280" />
          </Pressable>
          {gradeMenuOpen ? (
            <View style={styles.menu}>
              {[TEACHER_ALL_GRADES_FILTER, ...SUPPORTED_GRADES].map(option => (
                <Pressable
                  key={option}
                  onPress={() => onSelectGrade(option)}
                  style={[styles.menuItem, gradeFilter === option && styles.menuItemActive]}>
                  <Text style={[styles.menuText, gradeFilter === option && styles.menuTextActive]}>
                    {option === 'All' ? 'All Grades' : option}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <Pressable onPress={onToggleSort} style={styles.chip}>
          {sortBy === 'name' ? (
            <SortAsc size={14} color="#475569" />
          ) : (
            <TrendingUp size={14} color="#475569" />
          )}
          <Text style={styles.chipText}>{sortBy === 'name' ? 'Name' : 'Score'}</Text>
        </Pressable>

        <Pressable
          onPress={onToggleRemedial}
          style={[styles.chip, styles.chipPushEnd, showRemedial && styles.chipAlert]}>
          <AlertCircle size={14} color={showRemedial ? '#B91C1C' : '#475569'} />
          <Text style={[styles.chipText, showRemedial && styles.chipAlertText]}>Remedial</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Mastery Average</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricValue}>{averageScore}%</Text>
            <Text style={styles.metricAccent}>+2%</Text>
          </View>
          <Text style={styles.metricSubline}>Across active learners</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>
            {showRemedial ? 'Students At Risk' : 'Homework Done'}
          </Text>
          <View style={styles.metricRow}>
            <Text style={[styles.metricValue, showRemedial && styles.risk]}>
              {showRemedial ? remedialCount : `${averageHomework}%`}
            </Text>
            <Text style={styles.metricHint}>{showRemedial ? 'Total' : 'Avg'}</Text>
          </View>
          <Text style={styles.metricSubline}>
            {showRemedial ? 'Below 70% mastery' : 'Recent assignment completion'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderText}>
            {showRemedial ? 'Remedial List' : 'Student List'}
          </Text>
          <Text style={styles.cardHeaderMeta}>Sorted by {sortBy}</Text>
        </View>
        {filteredStudents.length > 0 ? (
          filteredStudents.map(item => (
            <Pressable key={item.id} onPress={() => onSelectStudent(item)} style={styles.row}>
              <View style={styles.rowLead}>
                <TeacherAvatarBadge styles={styles} name={item.name} avatar={item.avatar} size={40} />
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{item.name}</Text>
                  <Text style={styles.rowMeta}>
                    {item.grade} | {item.trend} | Last active {item.lastActive}
                  </Text>
                  <View style={styles.studentProgressLine}>
                    <View style={styles.studentProgressTrack}>
                      <View
                        style={[
                          styles.studentProgressFill,
                          { width: `${item.homeworkCompletion}%` as const },
                        ]}
                      />
                    </View>
                    <Text style={styles.studentProgressText}>
                      {item.homeworkCompletion}% homework
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.rowEnd}>
                <View style={styles.scoreWrap}>
                  <Text
                    style={[
                      styles.score,
                      item.assessmentScore >= 80
                        ? styles.goodText
                        : item.assessmentScore >= 60
                          ? styles.warnText
                          : styles.badText,
                    ]}>
                    {item.assessmentScore}%
                  </Text>
                  <Text style={styles.rowTiny}>Avg</Text>
                </View>
                <ChevronRight size={16} color="#9CA3AF" />
              </View>
            </Pressable>
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {showRemedial
                ? 'No students found needing remedial attention.'
                : 'No students found.'}
            </Text>
          </View>
        )}
      </View>
    </>
  );
}
