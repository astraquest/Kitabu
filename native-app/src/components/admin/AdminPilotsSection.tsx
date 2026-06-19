import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BarChart3, Check, ChevronRight, Rocket, School, Users } from 'lucide-react-native';

import { SchoolData } from '../../types/app';

type PilotStatus = NonNullable<SchoolData['pilot']>['status'];

interface AdminPilotsSectionProps {
  schools: SchoolData[];
  onUpdatePilot: (
    schoolId: string,
    input: {
      status: PilotStatus;
      startDate?: string | null;
      endDate?: string | null;
      targetStudents: number;
      onboardingStage: number;
      notes?: string | null;
    },
  ) => Promise<unknown>;
}

const STAGES = ['School confirmed', 'Admin trained', 'Students imported', 'Pilot launched'];
const STATUSES: PilotStatus[] = ['not_enrolled', 'onboarding', 'active', 'paused', 'completed'];

export function AdminPilotsSection({ schools, onUpdatePilot }: AdminPilotsSectionProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = schools.find(school => school.id === selectedId) ?? null;
  const [status, setStatus] = useState<PilotStatus>('not_enrolled');
  const [stage, setStage] = useState(0);
  const [target, setTarget] = useState('0');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;
    setStatus(selected.pilot?.status ?? 'not_enrolled');
    setStage(selected.pilot?.onboardingStage ?? 0);
    setTarget(String(selected.pilot?.targetStudents ?? 0));
    setNotes(selected.pilot?.notes ?? '');
    setError(null);
  }, [selected]);

  const summary = useMemo(() => ({
    active: schools.filter(school => school.pilot?.status === 'active').length,
    onboarding: schools.filter(school => school.pilot?.status === 'onboarding').length,
    engaged: schools.reduce((total, school) => total + (school.pilot?.metrics.engagedStudents ?? 0), 0),
  }), [schools]);

  async function save() {
    if (!selected) return;
    const targetStudents = Number(target);
    if (!Number.isInteger(targetStudents) || targetStudents < 0) {
      setError('Target students must be a whole number.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const today = new Date();
      const end = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
      await onUpdatePilot(selected.id, {
        status,
        startDate: selected.pilot?.startDate ?? today.toISOString().slice(0, 10),
        endDate: selected.pilot?.endDate ?? end.toISOString().slice(0, 10),
        targetStudents,
        onboardingStage: stage,
        notes: notes.trim() || null,
      });
      setSelectedId(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save pilot');
    } finally {
      setIsSaving(false);
    }
  }

  if (selected) {
    const metrics = selected.pilot?.metrics ?? { onboardedStudents: 0, engagedStudents: 0, averageMastery: 0 };
    return (
      <View style={styles.page}>
        <Pressable onPress={() => setSelectedId(null)}><Text style={styles.backLink}>Back to pilots</Text></Pressable>
        <View><Text style={styles.title}>{selected.name}</Text><Text style={styles.subtitle}>Pilot setup and launch readiness</Text></View>
        <View style={styles.metricRow}>
          <Metric label="Onboarded" value={String(metrics.onboardedStudents)} />
          <Metric label="Engaged 7d" value={String(metrics.engagedStudents)} />
          <Metric label="Mastery" value={`${metrics.averageMastery}%`} />
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Pilot status</Text>
          <View style={styles.statusGrid}>
            {STATUSES.map(item => (
              <Pressable key={item} onPress={() => setStatus(item)} style={[styles.statusButton, status === item && styles.statusButtonActive]}>
                <Text style={[styles.statusText, status === item && styles.statusTextActive]}>{formatStatus(item)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Onboarding checklist</Text>
          {STAGES.map((label, index) => {
            const completed = stage > index;
            return (
              <Pressable key={label} onPress={() => setStage(completed ? index : index + 1)} style={styles.stageRow}>
                <View style={[styles.checkBox, completed && styles.checkBoxDone]}>{completed ? <Check color="#FFFFFF" size={14} /> : null}</View>
                <Text style={[styles.stageText, completed && styles.stageTextDone]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.panel}>
          <Text style={styles.fieldLabel}>Target students</Text>
          <TextInput keyboardType="number-pad" onChangeText={setTarget} style={styles.input} value={target} />
          <Text style={styles.fieldLabel}>Internal notes</Text>
          <TextInput multiline onChangeText={setNotes} placeholder="Pilot goals, risks, and next action" placeholderTextColor="#94A3B8" style={[styles.input, styles.notes]} value={notes} />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable disabled={isSaving} onPress={save} style={[styles.saveButton, isSaving && styles.disabled]}>
          {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save pilot</Text>}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View><Text style={styles.title}>School pilots</Text><Text style={styles.subtitle}>Launch schools and track early adoption.</Text></View>
      <View style={styles.metricRow}>
        <Metric label="Active" value={String(summary.active)} />
        <Metric label="Onboarding" value={String(summary.onboarding)} />
        <Metric label="Engaged" value={String(summary.engaged)} />
      </View>
      <View style={styles.list}>
        {schools.map(school => {
          const pilot = school.pilot;
          const progress = ((pilot?.onboardingStage ?? 0) / STAGES.length) * 100;
          return (
            <Pressable key={school.id} onPress={() => setSelectedId(school.id)} style={styles.schoolCard}>
              <View style={styles.schoolIcon}><School color="#2563EB" size={21} /></View>
              <View style={styles.schoolBody}>
                <View style={styles.schoolTitleRow}><Text style={styles.schoolName}>{school.name}</Text><Text style={styles.statusPill}>{formatStatus(pilot?.status ?? 'not_enrolled')}</Text></View>
                <Text style={styles.schoolMeta}>{pilot?.metrics.onboardedStudents ?? 0} onboarded · {pilot?.metrics.engagedStudents ?? 0} engaged</Text>
                <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
              </View>
              <ChevronRight color="#94A3B8" size={20} />
            </Pressable>
          );
        })}
        {schools.length === 0 ? <View style={styles.empty}><Rocket color="#94A3B8" size={30} /><Text style={styles.emptyText}>Register a school before starting a pilot.</Text></View> : null}
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const Icon = label === 'Engaged' ? Users : BarChart3;
  return <View style={styles.metric}><Icon color="#2563EB" size={18} /><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function formatStatus(value: PilotStatus) {
  return value.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

const styles = StyleSheet.create({
  page: { gap: 16 },
  title: { color: '#0F172A', fontSize: 28, fontWeight: '900' },
  subtitle: { color: '#64748B', fontSize: 14, marginTop: 4 },
  backLink: { color: '#2563EB', fontSize: 14, fontWeight: '900' },
  metricRow: { flexDirection: 'row', gap: 10 },
  metric: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#DDE7F3', borderRadius: 20, borderWidth: 1, flex: 1, padding: 14, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 1 },
  metricValue: { color: '#0F172A', fontSize: 22, fontWeight: '900', marginTop: 5 },
  metricLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', marginTop: 2, textTransform: 'uppercase' },
  list: { gap: 10 },
  schoolCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#DDE7F3', borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 1 },
  schoolIcon: { alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 14, height: 44, justifyContent: 'center', width: 44 },
  schoolBody: { flex: 1 },
  schoolTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  schoolName: { color: '#0F172A', flex: 1, fontSize: 15, fontWeight: '900' },
  schoolMeta: { color: '#64748B', fontSize: 12, marginTop: 5 },
  statusPill: { backgroundColor: '#EFF6FF', borderRadius: 999, color: '#1D4ED8', fontSize: 10, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 },
  progressTrack: { backgroundColor: '#E2E8F0', borderRadius: 999, height: 6, marginTop: 9, overflow: 'hidden' },
  progressFill: { backgroundColor: '#2563EB', height: '100%' },
  panel: { backgroundColor: '#FFFFFF', borderColor: '#DDE7F3', borderRadius: 22, borderWidth: 1, gap: 12, padding: 16, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 1 },
  panelTitle: { color: '#0F172A', fontSize: 16, fontWeight: '900' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: { backgroundColor: '#F8FAFC', borderColor: '#DDE7F3', borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  statusButtonActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  statusText: { color: '#475569', fontSize: 12, fontWeight: '800' },
  statusTextActive: { color: '#FFFFFF' },
  stageRow: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 38 },
  checkBox: { alignItems: 'center', backgroundColor: '#F8FAFC', borderColor: '#CBD5E1', borderRadius: 8, borderWidth: 1, height: 26, justifyContent: 'center', width: 26 },
  checkBoxDone: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  stageText: { color: '#334155', fontSize: 14, fontWeight: '700' },
  stageTextDone: { color: '#15803D' },
  fieldLabel: { color: '#475569', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  input: { backgroundColor: '#F8FAFC', borderColor: '#DDE7F3', borderRadius: 14, borderWidth: 1, color: '#0F172A', fontSize: 14, padding: 12 },
  notes: { minHeight: 90, textAlignVertical: 'top' },
  saveButton: { alignItems: 'center', backgroundColor: '#2563EB', borderRadius: 16, justifyContent: 'center', minHeight: 52, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 2 },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  error: { color: '#B91C1C', fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#DDE7F3', borderRadius: 20, borderWidth: 1, padding: 28 },
  emptyText: { color: '#64748B', fontSize: 14, marginTop: 8, textAlign: 'center' },
});
