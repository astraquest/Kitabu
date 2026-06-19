import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronDown, Clock, Filter, GraduationCap, Plus } from 'lucide-react-native';

import { SubmittedAssignment } from '../../types/app';

interface TeacherAssignmentsSectionProps {
  styles: Record<string, any>;
  subjectFilter: string;
  subjectMenuOpen: boolean;
  assignmentSortBy: 'date' | 'subject';
  submissionRate: number;
  openAssignmentCount: number;
  filteredAssignments: SubmittedAssignment[];
  onToggleSubjectMenu: () => void;
  onSelectSubject: (value: string) => void;
  onToggleSort: () => void;
  onCreateAssignment: () => void;
  onSelectAssignment: (assignment: SubmittedAssignment) => void;
}

export function TeacherAssignmentsSection({
  styles,
  subjectFilter,
  subjectMenuOpen,
  assignmentSortBy,
  submissionRate,
  openAssignmentCount,
  filteredAssignments,
  onToggleSubjectMenu,
  onSelectSubject,
  onToggleSort,
  onCreateAssignment,
  onSelectAssignment,
}: TeacherAssignmentsSectionProps) {
  return (
    <>
      <View style={styles.filterRow}>
        <View style={styles.dropdownWrap}>
          <Pressable onPress={onToggleSubjectMenu} style={styles.chip}>
            <Text style={styles.chipText}>
              {subjectFilter === 'All' ? 'All Subjects' : subjectFilter}
            </Text>
            <ChevronDown size={14} color="#6B7280" />
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
          {assignmentSortBy === 'date' ? (
            <Clock size={14} color="#475569" />
          ) : (
            <Filter size={14} color="#475569" />
          )}
          <Text style={styles.chipText}>
            {assignmentSortBy === 'date' ? 'Recent' : 'Subject'}
          </Text>
        </Pressable>

        <Pressable onPress={onCreateAssignment} style={styles.primary}>
          <Plus size={14} color="#FFF" />
          <Text style={styles.primaryText}>New</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Submission Rate</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricValue}>{submissionRate}%</Text>
            <Text style={styles.metricHint}>Avg</Text>
          </View>
          <Text style={styles.metricSubline}>Across published assignments</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Open Assignments</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricValue}>{openAssignmentCount}</Text>
            <Text style={styles.metricHint}>Need review</Text>
          </View>
          <Text style={styles.metricSubline}>Track pending learner work</Text>
        </View>
      </View>

      <View style={styles.assignmentList}>
        {filteredAssignments.length > 0 ? (
          filteredAssignments.map(item => {
            const completionRate = Math.round(
              (item.submittedCount / Math.max(item.totalStudents, 1)) * 100,
            );

            return (
              <Pressable
                key={item.id}
                onPress={() => onSelectAssignment(item)}
                style={styles.assignmentCard}>
                <View style={styles.assignmentHead}>
                  <Text
                    style={[
                      styles.subjectPill,
                      item.subject === 'Mathematics'
                        ? styles.subjectBlue
                        : item.subject === 'Science'
                          ? styles.subjectGreen
                          : styles.subjectOrange,
                    ]}>
                    {item.subject}
                  </Text>
                  <Text style={styles.date}>{item.dateSent}</Text>
                </View>

                <Text style={styles.assignmentTitle}>{item.title}</Text>

                <View style={styles.assignmentInfoRow}>
                  <View style={styles.assignmentInfo}>
                    <GraduationCap size={14} color="#6B7280" />
                    <Text style={styles.assignmentMeta}>{item.gradeLevel}</Text>
                  </View>
                  <View style={styles.assignmentInfo}>
                    <Clock size={14} color="#6B7280" />
                    <Text style={styles.assignmentMeta}>Due: {item.dueDate}</Text>
                  </View>
                </View>

                <View style={styles.progressMeta}>
                  <Text style={styles.progressLabel}>Submissions</Text>
                  <Text
                    style={[
                      styles.progressCount,
                      completionRate < 60 && styles.warnText,
                      completionRate === 100 && styles.goodText,
                    ]}>
                    {item.submittedCount}/{item.totalStudents} ({completionRate}%)
                  </Text>
                </View>

                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${completionRate}%` as const },
                      completionRate === 100 && styles.fillComplete,
                    ]}
                  />
                </View>
              </Pressable>
            );
          })
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No assignments found.</Text>
          </View>
        )}
      </View>
    </>
  );
}
