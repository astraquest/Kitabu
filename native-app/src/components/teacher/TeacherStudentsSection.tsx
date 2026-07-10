import React from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  SortAsc,
  TrendingUp,
  Users,
} from 'lucide-react-native';

import { SUPPORTED_GRADES, TEACHER_ALL_GRADES_FILTER } from '../../constants/grades';
import { StudentPerformance } from '../../types/app';
import { TeacherAvatarBadge } from './TeacherAvatarBadge';

interface TeacherStudentsSectionProps {
  styles: Record<string, any>;
  gradeFilter: string;
  gradeMenuOpen: boolean;
  subjectFilter: string;
  subjectMenuOpen: boolean;
  sortBy: 'name' | 'score';
  showRemedial: boolean;
  showMetrics?: boolean;
  homeMode?: boolean;
  needHelpStudents?: StudentPerformance[];
  improvedStudents?: StudentPerformance[];
  averageScore: number;
  remedialCount: number;
  classSize: number;
  filteredStudents: StudentPerformance[];
  onToggleGradeMenu: () => void;
  onSelectGrade: (value: string) => void;
  onToggleSubjectMenu: () => void;
  onSelectSubject: (value: string) => void;
  onToggleSort: () => void;
  onToggleSupportFilter: () => void;
  onSelectStudent: (student: StudentPerformance) => void;
}

export function TeacherStudentsSection({
  styles,
  gradeFilter,
  gradeMenuOpen,
  subjectFilter,
  subjectMenuOpen,
  sortBy,
  showRemedial,
  showMetrics = true,
  homeMode = false,
  needHelpStudents = [],
  improvedStudents = [],
  averageScore,
  remedialCount,
  classSize,
  filteredStudents,
  onToggleGradeMenu,
  onSelectGrade,
  onToggleSubjectMenu,
  onSelectSubject,
  onToggleSort,
  onToggleSupportFilter,
  onSelectStudent,
}: TeacherStudentsSectionProps) {
  const mutedIconColor = styles.mutedIconColor || '#6B7280';
  const sortIconColor = styles.sortIconColor || '#475569';
  const chevronColor = styles.chevronColor || '#9CA3AF';

  const renderCompactRow = (item: StudentPerformance) => (
    <Pressable
      key={item.id}
      onPress={() => onSelectStudent(item)}
      style={styles.compactRow}>
      <TeacherAvatarBadge
        styles={styles}
        name={item.name}
        avatar={item.avatar}
        size={styles.avatarCompactSize || 30}
      />
      <View style={styles.compactMain}>
        <Text numberOfLines={1} style={styles.compactName}>
          {item.name}
        </Text>
        <Text numberOfLines={1} style={styles.compactMeta}>
          {item.grade} · {item.homeworkCompletion}% homework
        </Text>
      </View>
      <View
        style={[
          styles.compactPill,
          item.assessmentScore >= 80
            ? styles.scorePillGood
            : item.assessmentScore >= 60
              ? styles.scorePillWarn
              : styles.scorePillBad,
        ]}>
        <Text
          style={[
            styles.compactPillText,
            item.assessmentScore >= 80
              ? styles.goodText
              : item.assessmentScore >= 60
                ? styles.warnText
                : styles.badText,
          ]}>
          {item.assessmentScore}%
        </Text>
      </View>
      <ChevronRight size={14} color={chevronColor} />
    </Pressable>
  );

  return (
    <>
      <View style={styles.filterRow}>
        <View style={styles.dropdownWrap}>
          <Pressable onPress={onToggleGradeMenu} style={styles.chip}>
            <GraduationCap size={styles.filterIconSize || 18} color={sortIconColor} />
            <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={1} style={styles.chipText}>
              {gradeFilter === 'All' ? 'All Grades' : gradeFilter}
            </Text>
            <ChevronDown size={14} color={mutedIconColor} />
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

        <View style={styles.dropdownWrap}>
          <Pressable onPress={onToggleSubjectMenu} style={styles.chip}>
            <BookOpen size={styles.filterIconSize || 18} color={sortIconColor} />
            <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={1} style={styles.chipText}>
              {subjectFilter === 'All' ? 'Subjects' : subjectFilter}
            </Text>
            <ChevronDown size={14} color={mutedIconColor} />
          </Pressable>
          {subjectMenuOpen ? (
            <View style={styles.menu}>
              {['All', 'Mathematics', 'English', 'Science'].map(option => (
                <Pressable
                  key={option}
                  onPress={() => onSelectSubject(option)}
                  style={[styles.menuItem, subjectFilter === option && styles.menuItemActive]}>
                  <Text style={[styles.menuText, subjectFilter === option && styles.menuTextActive]}>
                    {option === 'All' ? 'All Subjects' : option}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <Pressable onPress={onToggleSort} style={styles.chip}>
          {sortBy === 'name' ? (
            <SortAsc size={14} color={sortIconColor} />
          ) : (
            <TrendingUp size={14} color={sortIconColor} />
          )}
          <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={1} style={styles.chipText}>
            {sortBy === 'name' ? 'Name' : 'Score'}
          </Text>
        </Pressable>
      </View>

      {showMetrics ? (
      <View style={styles.grid}>
        <View style={styles.metric}>
          {styles.metricTopStrip ? (
            <View style={[styles.metricTopStrip, styles.metricTopStripGreen]} />
          ) : null}
          {styles.metricDoodle ? (
            <View style={styles.metricDoodle}>
              <TrendingUp size={30} color={styles.metricDoodleColor || sortIconColor} strokeWidth={2.2} />
            </View>
          ) : null}
          <Text style={styles.metricLabel}>Class Average</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricValue}>{averageScore}%</Text>
          </View>
          <Text style={styles.metricSubline}>
            across {classSize} student{classSize === 1 ? '' : 's'}
          </Text>
          {styles.metricRules ? (
            <View pointerEvents="none" style={styles.metricRules}>
              <View style={styles.metricRule} />
              <View style={styles.metricRule} />
            </View>
          ) : null}
        </View>
        <View style={styles.metric}>
          {styles.metricTopStrip ? (
            <View style={[styles.metricTopStrip, styles.metricTopStripBlue]} />
          ) : null}
          {styles.metricDoodle ? (
            <View style={styles.metricDoodle}>
              <Users size={31} color={styles.metricDoodleColor || sortIconColor} strokeWidth={2.1} />
            </View>
          ) : null}
          <Text style={styles.metricLabel}>
            {showRemedial ? 'Students At Risk' : 'Active Students'}
          </Text>
          <View style={styles.metricRow}>
            <Text style={[styles.metricValue, showRemedial && styles.risk]}>
              {showRemedial ? remedialCount : filteredStudents.length}
            </Text>
            <Text style={styles.metricHint}>Total</Text>
          </View>
          <Text style={styles.metricSubline}>
            {showRemedial ? 'scoring below 70%' : 'in your classes'}
          </Text>
          {styles.metricRules ? (
            <View pointerEvents="none" style={styles.metricRules}>
              <View style={styles.metricRule} />
              <View style={styles.metricRule} />
            </View>
          ) : null}
        </View>
      </View>
      ) : null}

      {homeMode ? (
        <>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderText}>Needs urgent help</Text>
              <Text style={styles.cardHeaderMeta}>Top {needHelpStudents.length}</Text>
            </View>
            {needHelpStudents.length > 0 ? (
              needHelpStudents.map(renderCompactRow)
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No students in this class yet.</Text>
              </View>
            )}
          </View>

          {improvedStudents.length > 0 ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardHeaderText}>Most improved</Text>
                <Text style={styles.cardHeaderMeta}>Top {improvedStudents.length}</Text>
              </View>
              {improvedStudents.map(renderCompactRow)}
            </View>
          ) : null}
        </>
      ) : (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderText}>
            {showRemedial ? 'Students who need attention' : 'Student List'}
          </Text>
          <Pressable onPress={onToggleSupportFilter} style={styles.supportToggle}>
            <Text style={styles.cardHeaderMeta}>
              {showRemedial ? `${remedialCount} learners` : 'Needs support'}
            </Text>
          </Pressable>
        </View>
        {filteredStudents.length > 0 ? (
          filteredStudents.map(item => (
            <Pressable key={item.id} onPress={() => onSelectStudent(item)} style={styles.row}>
              <View style={styles.rowLead}>
                <TeacherAvatarBadge
                  styles={styles}
                  name={item.name}
                  avatar={item.avatar}
                  size={styles.avatarLargeSize || 40}
                />
                <View style={styles.rowMain}>
                  <Text numberOfLines={1} style={styles.rowTitle}>
                    {item.name}
                  </Text>
                  <View style={styles.rowTitleLine}>
                    <Text style={styles.rowMeta}>{item.grade}</Text>
                    <View
                      style={[
                        styles.trendChip,
                        item.trend === 'Excellent'
                          ? styles.trendChipExcellent
                          : item.trend === 'Improving'
                            ? styles.trendChipImproving
                            : styles.trendChipStable,
                      ]}>
                      <Text
                        style={[
                          styles.trendChipText,
                          item.trend === 'Excellent'
                            ? styles.trendChipTextExcellent
                            : item.trend === 'Improving'
                              ? styles.trendChipTextImproving
                              : styles.trendChipTextStable,
                        ]}>
                        {item.trend === 'Excellent' ? '★ Excellent' : item.trend === 'Improving' ? '↑ Improving' : '→ Stable'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.hwLine}>
                    <View style={styles.hwTrack}>
                      <View
                        style={[
                          styles.hwFill,
                          { width: `${Math.max(0, Math.min(100, item.homeworkCompletion))}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.hwLabel}>{item.homeworkCompletion}% homework</Text>
                  </View>
                </View>
              </View>
              <View style={styles.rowEnd}>
                <View style={styles.scoreWrap}>
                  <View
                    style={[
                      styles.scorePill,
                      item.assessmentScore >= 80
                        ? styles.scorePillGood
                        : item.assessmentScore >= 60
                          ? styles.scorePillWarn
                          : styles.scorePillBad,
                    ]}>
                    <Text
                      style={[
                        styles.scorePillText,
                        item.assessmentScore >= 80
                          ? styles.goodText
                          : item.assessmentScore >= 60
                            ? styles.warnText
                            : styles.badText,
                      ]}>
                      {item.assessmentScore}%
                    </Text>
                  </View>
                  <Text style={styles.rowTiny}>Avg</Text>
                </View>
                <ChevronRight size={16} color={chevronColor} />
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
      )}
    </>
  );
}
