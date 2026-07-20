import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AlertTriangle, BarChart3, BookOpen, Building2, Check, Info, Loader2, Mail, MapPin, Phone, Plus, Rocket, Save, School, Trash2, Users, X } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { AdminCurriculumSection } from '../components/admin/AdminCurriculumSection';
import { AdminDashboardSection } from '../components/admin/AdminDashboardSection';
import { AdminPricingSection } from '../components/admin/AdminPricingSection';
import { AdminPilotsSection } from '../components/admin/AdminPilotsSection';
import { AdminSchoolsSection } from '../components/admin/AdminSchoolsSection';
import { AdminUsersSection } from '../components/admin/AdminUsersSection';
import { StudentDetailsModal } from '../components/StudentDetailsModal';
import { adminPortalUserToModalUser } from '../components/studentDetailsAdapters';
import { ALL_GRADES_FILTER, SUPPORTED_GRADES } from '../constants/grades';
import { curriculumImportBridge, getNativeCapabilityStatus } from '../services/nativeBridges';
import { AdminPortalUser, BannerAnnouncement, BillingPlan, LearningStrand, SchoolData, SchoolDiscount, Subject, UserProfile } from '../types/app';

interface AdminPortalScreenProps {
  onBack: () => void;
  currentGrade: string;
  subjects: Subject[];
  curriculumData: Record<string, LearningStrand[]>;
  schoolsList: SchoolData[];
  users: AdminPortalUser[];
  schoolPlans: BillingPlan[];
  discounts: SchoolDiscount[];
  announcements: BannerAnnouncement[];
  userProfile: UserProfile;
  onSelectGrade: (grade: string) => void;
  onCreateSchool: (input: {
    name: string;
    location: string;
    principal?: string | null;
    phone?: string | null;
    email?: string | null;
    assignedPlanCode: 'weekly' | 'monthly' | 'annual';
    discountId?: string | null;
  }) => Promise<unknown>;
  onUpdateSchoolRecord: (schoolId: string, input: {
    name: string;
    location: string;
    principal?: string | null;
    phone?: string | null;
    email?: string | null;
    assignedPlanCode: 'weekly' | 'monthly' | 'annual';
    discountId?: string | null;
  }) => Promise<unknown>;
  onDeleteSchoolRecord: (schoolId: string) => Promise<unknown>;
  onUpdateSchoolPilot: (schoolId: string, input: {
    status: 'not_enrolled' | 'onboarding' | 'active' | 'paused' | 'completed';
    startDate?: string | null;
    endDate?: string | null;
    targetStudents: number;
    onboardingStage: number;
    notes?: string | null;
  }) => Promise<unknown>;
  onCreateDiscount: (input: {
    name: string;
    type: 'percentage' | 'fixed_ksh';
    amount: number;
    isActive: boolean;
  }) => Promise<unknown>;
  onUpdateDiscountRecord: (discountId: string, input: {
    name: string;
    type: 'percentage' | 'fixed_ksh';
    amount: number;
    isActive: boolean;
  }) => Promise<unknown>;
  onDeleteDiscountRecord: (discountId: string) => Promise<unknown>;
  onCreateAnnouncement: (input: {
    title: string;
    message: string;
    ctaLabel?: string | null;
    ctaTarget: BannerAnnouncement['ctaTarget'];
    startsAt?: string;
    endsAt?: string | null;
    isActive: boolean;
  }) => Promise<unknown>;
  onUpdateAnnouncementRecord: (announcementId: string, input: {
    title: string;
    message: string;
    ctaLabel?: string | null;
    ctaTarget: BannerAnnouncement['ctaTarget'];
    startsAt?: string;
    endsAt?: string | null;
    isActive: boolean;
  }) => Promise<unknown>;
  onDeleteAnnouncementRecord: (announcementId: string) => Promise<unknown>;
  onUpdateCurriculum: (grade: string, subjectId: string, data: LearningStrand[]) => Promise<void>;
  onImportCurriculum: (
    grade: string,
    subjectId: string,
    subjectName: string,
    fileMeta?: { uri: string; name: string; base64Data?: string; mimeType?: string } | null,
  ) => Promise<void>;
}

type Tab = 'stats' | 'curriculum' | 'users' | 'schools' | 'pilots' | 'pricing';
const AVAILABLE_GRADES = [...SUPPORTED_GRADES];

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

export function AdminPortalScreen({ onBack, currentGrade, subjects, curriculumData, schoolsList, users, schoolPlans, discounts, announcements, userProfile, onSelectGrade, onCreateSchool, onUpdateSchoolRecord, onDeleteSchoolRecord, onUpdateSchoolPilot, onCreateDiscount, onUpdateDiscountRecord, onDeleteDiscountRecord, onCreateAnnouncement, onUpdateAnnouncementRecord, onDeleteAnnouncementRecord, onUpdateCurriculum, onImportCurriculum }: AdminPortalScreenProps) {
  const cap = getNativeCapabilityStatus();
  const [tab, setTab] = useState<Tab>('stats');
  const [dashboardGrade, setDashboardGrade] = useState(ALL_GRADES_FILTER);
  const [timeRange, setTimeRange] = useState('This Year');
  const [gradeMenuOpen, setGradeMenuOpen] = useState(false);
  const [timeMenuOpen, setTimeMenuOpen] = useState(false);
  const [userGradeFilter, setUserGradeFilter] = useState(ALL_GRADES_FILTER);
  const [userSchoolFilter, setUserSchoolFilter] = useState('All Schools');
  const [userGradeMenuOpen, setUserGradeMenuOpen] = useState(false);
  const [userSchoolMenuOpen, setUserSchoolMenuOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminPortalUser | null>(null);
  const [selectedUserScore, setSelectedUserScore] = useState(0);
  const [selectedSchool, setSelectedSchool] = useState<SchoolData | null>(null);
  const [schoolModalTab, setSchoolModalTab] = useState<'details' | 'students'>('details');
  const [deleteSchoolId, setDeleteSchoolId] = useState<string | null>(null);
  const [schoolSort, setSchoolSort] = useState(`${ALL_GRADES_FILTER} (Sort)`);
  const [schoolSortOpen, setSchoolSortOpen] = useState(false);
  const [addingSchool, setAddingSchool] = useState(false);
  const [schoolDraft, setSchoolDraft] = useState({ name: '', location: '', principal: '', phone: '', email: '' });
  const [selectedNewGrades, setSelectedNewGrades] = useState<Set<string>>(new Set(AVAILABLE_GRADES));
  const [subjectsByGrade, setSubjectsByGrade] = useState<Record<string, { id: string; name: string }[]>>(() => Object.fromEntries(AVAILABLE_GRADES.map(g => [g, subjects.map(s => ({ id: s.id, name: s.name }))])) as Record<string, { id: string; name: string }[]>);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [addingSubject, setAddingSubject] = useState(false);
  const [editingSubject, setEditingSubject] = useState<{ id: string; name: string } | null>(null);
  const [draftStrands, setDraftStrands] = useState<LearningStrand[]>([]);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorSaved, setEditorSaved] = useState(false);
  const [editorDeleteConfirm, setEditorDeleteConfirm] = useState<{ type: 'strand' | 'subStrand'; sIdx?: number; subIdx?: number } | null>(null);
  const [processingSubjectId, setProcessingSubjectId] = useState<string | null>(null);

  const totalStudents = useMemo(() => schoolsList.reduce((n, s) => n + s.totalStudents, 0), [schoolsList]);
  const currentSubjects = subjectsByGrade[currentGrade] || [];
  const portalUsers = users;
  const filteredUsers = portalUsers
    .filter(user =>
      userSearch
        ? `${user.name} ${user.email}`.toLowerCase().includes(userSearch.trim().toLowerCase())
        : true,
    )
    .filter(u => {
    const matchesGrade = userGradeFilter === ALL_GRADES_FILTER || u.grade === userGradeFilter;
    const matchesSchool = userSchoolFilter === 'All Schools' || u.school === userSchoolFilter;
    return matchesGrade && matchesSchool;
  });

  async function addSchool() {
    if (!schoolDraft.name.trim() || !schoolDraft.location.trim()) return;

    await onCreateSchool({
      name: schoolDraft.name.trim(),
      location: schoolDraft.location.trim(),
      principal: schoolDraft.principal.trim() || null,
      phone: schoolDraft.phone.trim() || null,
      email: schoolDraft.email.trim() || null,
      assignedPlanCode: 'monthly',
      discountId: null,
    });

    setSchoolDraft({ name: '', location: '', principal: '', phone: '', email: '' });
    setSelectedNewGrades(new Set(AVAILABLE_GRADES));
    setAddingSchool(false);
  }

  async function saveSchool(updated: SchoolData) {
    await onUpdateSchoolRecord(updated.id, {
      name: updated.name,
      location: updated.location,
      principal: updated.principal || null,
      phone: updated.phone || null,
      email: updated.email || null,
      assignedPlanCode: updated.pricing?.assignedPlanCode === 'weekly' || updated.pricing?.assignedPlanCode === 'annual'
        ? updated.pricing.assignedPlanCode
        : 'monthly',
      discountId: updated.pricing?.discount?.id || null,
    });
    setSelectedSchool(null);
    setSchoolModalTab('details');
  }

  async function deleteSchool() {
    if (!deleteSchoolId) return;
    await onDeleteSchoolRecord(deleteSchoolId);
    setDeleteSchoolId(null);
    setSelectedSchool(null);
  }
  function addSubject() {
    const name = newSubjectName.trim(); if (!name) return;
    const id = name.toLowerCase().replace(/\s+/g, '-');
    setSubjectsByGrade(prev => ({ ...prev, [currentGrade]: [...(prev[currentGrade] || []), { id, name }] }));
    setNewSubjectName('');
    setAddingSubject(false);
  }
  function removeSubject(subjectId: string) { setSubjectsByGrade(prev => ({ ...prev, [currentGrade]: (prev[currentGrade] || []).filter(s => s.id !== subjectId) })); }
  function openEditor(subject: { id: string; name: string }) { setEditingSubject(subject); setDraftStrands(clone(curriculumData[`${currentGrade}-${subject.id}`] || [])); setEditorDeleteConfirm(null); setEditorSaved(false); setEditorSaving(false); }
  async function importCurriculum(subject: { id: string; name: string }) { setProcessingSubjectId(subject.id); try { const file = await curriculumImportBridge.pickPdf(); await onImportCurriculum(currentGrade, subject.id, subject.name, file); } finally { setProcessingSubjectId(null); } }
  function saveCurriculum() {
    if (!editingSubject) return;
    setEditorSaving(true);
    setTimeout(() => {
      onUpdateCurriculum(currentGrade, editingSubject.id, clone(draftStrands))
        .then(() => {
          setEditorSaved(true);
          setTimeout(() => setEditorSaved(false), 2000);
        })
        .finally(() => {
          setEditorSaving(false);
        });
    }, 800);
  }
  function toggleNewSchoolGrade(gradeKey: string) {
    setSelectedNewGrades(prev => {
      const next = new Set(prev);
      if (next.has(gradeKey)) next.delete(gradeKey);
      else next.add(gradeKey);
      return next;
    });
  }
  function addEditorStrand() {
    setDraftStrands(prev => [...prev, { id: `strand-${Date.now()}`, number: `${prev.length + 1}.0`, title: 'NEW STRAND', subTitle: 'Strand Description', subStrands: [] }]);
  }
  function updateEditorStrandTitle(index: number, title: string) {
    setDraftStrands(prev => prev.map((strand, strandIndex) => strandIndex === index ? { ...strand, title } : strand));
  }
  function addEditorSubStrand(strandIndex: number) {
    setDraftStrands(prev => prev.map((strand, idx) => idx === strandIndex ? {
      ...strand,
      subStrands: [...strand.subStrands, {
        id: `sub-${Date.now()}`,
        number: `${strandIndex + 1}.${strand.subStrands.length + 1}`,
        title: 'New Topic',
        type: 'knowledge',
        isLocked: false,
        isCompleted: false,
        pages: [],
        outcomes: [{ id: `lo-${Date.now()}`, text: 'Identify key concepts...' }],
        inquiryQuestions: [],
      }],
    } : strand));
  }
  function updateEditorSubStrand(strandIndex: number, subIndex: number, field: 'title' | 'outcomes', value: string) {
    setDraftStrands(prev => prev.map((strand, idx) => idx === strandIndex ? {
      ...strand,
      subStrands: strand.subStrands.map((sub, subIdx) => {
        if (subIdx !== subIndex) return sub;
        if (field === 'outcomes') {
          return {
            ...sub,
            outcomes: value.split('\n').map((text, outcomeIndex) => ({
              id: sub.outcomes?.[outcomeIndex]?.id || `lo-${Date.now()}-${outcomeIndex}`,
              text: text.replace(/^[•\-*]\s*/, ''),
            })).filter(outcome => outcome.text.trim().length > 0),
          };
        }
        return { ...sub, title: value };
      }),
    } : strand));
  }
  function confirmDeleteEditorItem() {
    if (!editorDeleteConfirm) return;
    if (editorDeleteConfirm.type === 'strand' && editorDeleteConfirm.sIdx !== undefined) {
      setDraftStrands(prev => prev.filter((_, idx) => idx !== editorDeleteConfirm.sIdx).map((strand, idx) => ({ ...strand, number: `${idx + 1}.0` })));
    }
    if (editorDeleteConfirm.type === 'subStrand' && editorDeleteConfirm.sIdx !== undefined && editorDeleteConfirm.subIdx !== undefined) {
      setDraftStrands(prev => prev.map((strand, idx) => idx === editorDeleteConfirm.sIdx ? {
        ...strand,
        subStrands: strand.subStrands.filter((_, subIdx) => subIdx !== editorDeleteConfirm.subIdx).map((sub, subIdx) => ({ ...sub, number: `${idx + 1}.${subIdx + 1}` })),
      } : strand));
    }
    setEditorDeleteConfirm(null);
  }
  useEffect(() => {
    if (!editingSubject) return;
    setDraftStrands(clone(curriculumData[`${currentGrade}-${editingSubject.id}`] || []));
  }, [editingSubject, curriculumData, currentGrade]);

  return (
    <View style={a.root}>
      <View style={a.header}><View style={a.headerLeft}><View style={a.logoWrap}><Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" fill="#F97316" /></Svg></View><Text style={a.headerTitle}>Admin Portal</Text></View><Pressable onPress={onBack}><Text style={a.exit}>Exit</Text></Pressable></View>
      <ScrollView contentContainerStyle={a.content}>
        {tab === 'stats' ? (
          <AdminDashboardSection
            styles={a}
            dashboardGrade={dashboardGrade}
            timeRange={timeRange}
            gradeMenuOpen={gradeMenuOpen}
            timeMenuOpen={timeMenuOpen}
            userProfile={userProfile}
            schoolsList={schoolsList}
            totalStudents={totalStudents}
            onToggleGradeMenu={() => {
              setGradeMenuOpen(value => !value);
              setTimeMenuOpen(false);
            }}
            onToggleTimeMenu={() => {
              setTimeMenuOpen(value => !value);
              setGradeMenuOpen(false);
            }}
            onSelectGrade={grade => {
              setDashboardGrade(grade);
              setGradeMenuOpen(false);
            }}
            onSelectTimeRange={range => {
              setTimeRange(range);
              setTimeMenuOpen(false);
            }}
          />
        ) : null}
        {tab === 'users' ? (
          <AdminUsersSection
            styles={a}
            userGradeFilter={userGradeFilter}
            userSchoolFilter={userSchoolFilter}
            userGradeMenuOpen={userGradeMenuOpen}
            userSchoolMenuOpen={userSchoolMenuOpen}
            userSearch={userSearch}
            users={portalUsers}
            filteredUsers={filteredUsers}
            onToggleGradeMenu={() => {
              setUserGradeMenuOpen(value => !value);
              setUserSchoolMenuOpen(false);
            }}
            onToggleSchoolMenu={() => {
              setUserSchoolMenuOpen(value => !value);
              setUserGradeMenuOpen(false);
            }}
            onSelectGrade={grade => {
              setUserGradeFilter(grade);
              setUserGradeMenuOpen(false);
            }}
            onSelectSchool={school => {
              setUserSchoolFilter(school);
              setUserSchoolMenuOpen(false);
            }}
            onSearchChange={setUserSearch}
            onSelectUser={user => {
              setSelectedUser(user);
              setSelectedUserScore(0);
            }}
          />
        ) : null}
        {tab === 'schools' ? (
          <AdminSchoolsSection
            styles={a}
            schoolSort={schoolSort}
            schoolSortOpen={schoolSortOpen}
            schoolsList={schoolsList}
            onToggleSortMenu={() => setSchoolSortOpen(value => !value)}
            onSelectSort={value => {
              setSchoolSort(value);
              setSchoolSortOpen(false);
            }}
            onAddSchool={() => setTab('pricing')}
            onSelectSchool={() => setTab('pricing')}
          />
        ) : null}
        {tab === 'pricing' ? (
          <AdminPricingSection
            schools={schoolsList}
            plans={schoolPlans}
            discounts={discounts}
            announcements={announcements}
            onCreateSchool={onCreateSchool}
            onUpdateSchool={onUpdateSchoolRecord}
            onDeleteSchool={onDeleteSchoolRecord}
            onCreateDiscount={onCreateDiscount}
            onUpdateDiscount={onUpdateDiscountRecord}
            onDeleteDiscount={onDeleteDiscountRecord}
            onCreateAnnouncement={onCreateAnnouncement}
            onUpdateAnnouncement={onUpdateAnnouncementRecord}
            onDeleteAnnouncement={onDeleteAnnouncementRecord}
          />
        ) : null}
        {tab === 'pilots' ? (
          <AdminPilotsSection schools={schoolsList} onUpdatePilot={onUpdateSchoolPilot} />
        ) : null}
        {tab === 'curriculum' ? (
          <AdminCurriculumSection
            styles={a}
            currentGrade={currentGrade}
            currentSubjects={currentSubjects}
            curriculumData={curriculumData}
            pdfImportStatus={cap.pdfImport}
            processingSubjectId={processingSubjectId}
            onSelectGrade={onSelectGrade}
            onAddSubject={() => setAddingSubject(true)}
            onActivateSubject={(subject, strands) =>
              onUpdateCurriculum(currentGrade, subject.id, strands)
            }
            onImportSubject={importCurriculum}
            onOpenEditor={openEditor}
            onRemoveSubject={removeSubject}
          />
        ) : null}
      </ScrollView>

      <View style={a.bottomBar}>{([{ key: 'stats', label: 'Stats', icon: BarChart3 }, { key: 'curriculum', label: 'Content', icon: BookOpen }, { key: 'users', label: 'Users', icon: Users }, { key: 'schools', label: 'Schools', icon: School }, { key: 'pilots', label: 'Pilots', icon: Rocket }, { key: 'pricing', label: 'Pricing', icon: Info }] as const).map(item => { const Icon = item.icon; const active = tab === item.key; return <Pressable key={item.key} onPress={() => setTab(item.key)} style={a.bottomTab}><Icon size={22} color={active ? '#2563EB' : '#9CA3AF'} /><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[a.bottomText, active && a.bottomTextActive]}>{item.label}</Text></Pressable>; })}</View>

      {selectedUser ? <StudentDetailsModal user={adminPortalUserToModalUser(selectedUser)} assessmentScore={selectedUserScore} onClose={() => setSelectedUser(null)} /> : null}
      <Modal visible={selectedSchool !== null} animationType="slide" onRequestClose={() => setSelectedSchool(null)}>{selectedSchool ? <View style={a.schoolRoot}><View style={a.schoolHeader}><Pressable onPress={() => setSelectedSchool(null)} style={a.iconBtn}><X size={18} color="#FFF" /></Pressable><View style={a.schoolMark}><Building2 size={28} color="#2563EB" /></View><Text style={a.schoolTitle}>{selectedSchool.name}</Text><View style={a.rowTinyWrap}><MapPin size={13} color="#DBEAFE" /><Text style={a.schoolSub}>{selectedSchool.location}</Text></View></View><View style={a.modalBody}><View style={a.schoolTabs}><Pressable onPress={() => setSchoolModalTab('details')} style={[a.schoolTab, schoolModalTab === 'details' && a.schoolTabActive]}><Text style={[a.schoolTabText, schoolModalTab === 'details' && a.schoolTabTextActive]}>School Details</Text></Pressable><Pressable onPress={() => setSchoolModalTab('students')} style={[a.schoolTab, schoolModalTab === 'students' && a.schoolTabActive]}><Text style={[a.schoolTabText, schoolModalTab === 'students' && a.schoolTabTextActive]}>Student Count</Text></Pressable></View><ScrollView contentContainerStyle={a.content}>{schoolModalTab === 'details' ? <View style={a.panel}><Text style={a.itemMeta}>School Name</Text><View style={a.inputIconWrap}><Building2 size={18} color="#9CA3AF" style={a.inputIcon} /><TextInput value={selectedSchool.name} onChangeText={v => setSelectedSchool({ ...selectedSchool, name: v })} style={[a.input, a.inputWithIcon]} /></View><Text style={a.itemMeta}>Location</Text><View style={a.inputIconWrap}><MapPin size={18} color="#9CA3AF" style={a.inputIcon} /><TextInput value={selectedSchool.location} onChangeText={v => setSelectedSchool({ ...selectedSchool, location: v })} style={[a.input, a.inputWithIcon]} /></View><Text style={a.itemMeta}>Principal</Text><View style={a.inputIconWrap}><Users size={18} color="#9CA3AF" style={a.inputIcon} /><TextInput value={selectedSchool.principal || ''} onChangeText={v => setSelectedSchool({ ...selectedSchool, principal: v })} style={[a.input, a.inputWithIcon]} /></View><Text style={a.itemMeta}>Phone</Text><View style={a.inputIconWrap}><Phone size={18} color="#9CA3AF" style={a.inputIcon} /><TextInput value={selectedSchool.phone || ''} onChangeText={v => setSelectedSchool({ ...selectedSchool, phone: v })} placeholder="+254..." placeholderTextColor="#9CA3AF" style={[a.input, a.inputWithIcon]} /></View><Text style={a.itemMeta}>Email</Text><View style={a.inputIconWrap}><Mail size={18} color="#9CA3AF" style={a.inputIcon} /><TextInput value={selectedSchool.email || ''} onChangeText={v => setSelectedSchool({ ...selectedSchool, email: v })} placeholder="school@email.com" placeholderTextColor="#9CA3AF" style={[a.input, a.inputWithIcon]} /></View></View> : <><View style={a.studentCountCard}><Text style={a.studentCountLabel}>Total Students</Text><Text style={a.studentCountValue}>{selectedSchool.totalStudents}</Text></View><View style={a.gradeCountGrid}>{Object.entries(selectedSchool.gradeCounts).map(([gradeKey, count]) => <View key={gradeKey} style={[a.heroCard, a.dark]}><Text style={a.heroLabel}>{gradeKey}</Text><Text style={a.heroValue}>{count}</Text></View>)}<Pressable style={a.addGradeCard}><Plus size={22} color="#9CA3AF" /><Text style={a.addGradeText}>Add Grade</Text></Pressable></View></>}</ScrollView><View style={a.sheetFooter}><Pressable onPress={() => setDeleteSchoolId(selectedSchool.id)} style={a.deleteWide}><Trash2 size={20} color="#EF4444" /></Pressable><Pressable onPress={() => saveSchool(selectedSchool)} style={a.saveWide}><Text style={a.saveText}>Save Changes</Text></Pressable></View></View></View> : null}</Modal>
      <Modal visible={addingSchool} animationType="slide" onRequestClose={() => setAddingSchool(false)}><View style={a.addRoot}><View style={a.addHeader}><Pressable onPress={() => setAddingSchool(false)} style={a.iconBtn}><X size={18} color="#FFF" /></Pressable><Text style={a.schoolTitle}>Register New School</Text><Text style={a.schoolSub}>Enter school details and grades offered.</Text></View><ScrollView contentContainerStyle={a.content}><View style={a.panel}><Text style={a.itemMeta}>School Name</Text><TextInput value={schoolDraft.name} onChangeText={v => setSchoolDraft({ ...schoolDraft, name: v })} style={a.input} /><Text style={a.itemMeta}>Location</Text><View style={a.inputIconWrap}><MapPin size={18} color="#9CA3AF" style={a.inputIcon} /><TextInput value={schoolDraft.location} onChangeText={v => setSchoolDraft({ ...schoolDraft, location: v })} style={[a.input, a.inputWithIcon]} /></View><Text style={a.itemMeta}>Principal</Text><TextInput value={schoolDraft.principal} onChangeText={v => setSchoolDraft({ ...schoolDraft, principal: v })} style={a.input} /><View style={a.cardsRow}><View style={a.flex}><Text style={a.itemMeta}>Phone</Text><TextInput value={schoolDraft.phone} onChangeText={v => setSchoolDraft({ ...schoolDraft, phone: v })} placeholder="+254..." placeholderTextColor="#9CA3AF" style={a.input} /></View><View style={a.flex}><Text style={a.itemMeta}>Email</Text><TextInput value={schoolDraft.email} onChangeText={v => setSchoolDraft({ ...schoolDraft, email: v })} placeholder="school@email.com" placeholderTextColor="#9CA3AF" style={a.input} /></View></View></View><View style={a.panel}><Text style={a.itemMeta}>Offered Grades</Text><View style={a.gradeGrid}>{AVAILABLE_GRADES.map(gradeKey => { const selected = selectedNewGrades.has(gradeKey); return <Pressable key={gradeKey} onPress={() => toggleNewSchoolGrade(gradeKey)} style={[a.gradeSelect, selected && a.gradeSelectActive]}><Text style={[a.gradeSelectText, selected && a.gradeSelectTextActive]}>{gradeKey}</Text>{selected ? <Check size={14} color="#2563EB" /> : null}</Pressable>; })}</View></View></ScrollView><View style={a.sheetFooter}><Pressable onPress={() => setAddingSchool(false)} style={a.cancelWide}><Text style={a.cancelText}>Cancel</Text></Pressable><Pressable onPress={addSchool} style={a.saveWide}><Text style={a.saveText}>Register School</Text></Pressable></View></View></Modal>
      <Modal visible={deleteSchoolId !== null} transparent animationType="fade" onRequestClose={() => setDeleteSchoolId(null)}><View style={a.scrim}><View style={a.confirm}><View style={a.alertBadge}><AlertTriangle size={24} color="#DC2626" /></View><Text style={a.panelTitle}>Delete School?</Text><Text style={a.panelText}>Are you sure you want to delete this school? This action cannot be undone.</Text><View style={a.row}><Pressable onPress={() => setDeleteSchoolId(null)} style={a.cancelWide}><Text style={a.cancelText}>Cancel</Text></Pressable><Pressable onPress={deleteSchool} style={a.deleteConfirm}><Text style={a.saveText}>Delete</Text></Pressable></View></View></View></Modal>
      <Modal visible={addingSubject} transparent animationType="fade" onRequestClose={() => setAddingSubject(false)}><View style={a.scrim}><View style={a.confirm}><Text style={a.panelTitle}>Add New Subject</Text><TextInput value={newSubjectName} onChangeText={setNewSubjectName} placeholder="Enter Subject Name (e.g. History)" placeholderTextColor="#94A3B8" style={a.input} autoFocus /><View style={a.row}><Pressable onPress={() => setAddingSubject(false)} style={a.cancelWide}><Text style={a.cancelText}>Cancel</Text></Pressable><Pressable onPress={addSubject} style={a.saveWide}><Text style={a.saveText}>Add Subject</Text></Pressable></View></View></View></Modal>
      <Modal visible={editingSubject !== null} animationType="slide" onRequestClose={() => setEditingSubject(null)}>{editingSubject ? <View style={a.editorRoot}><View style={a.editorHead}><View style={a.row}><Pressable onPress={() => setEditingSubject(null)} style={a.editorClose}><X size={20} color="#6B7280" /></Pressable><View><Text style={a.editorTitle}>Curriculum Editor</Text><View style={a.editorMetaRow}><View style={a.editorDot} /><Text style={a.editorMeta}>{editingSubject.name}</Text></View></View></View><Pressable onPress={saveCurriculum} disabled={editorSaving} style={[a.editorSave, editorSaved && a.editorSaveSuccess]}>{editorSaving ? <Loader2 size={16} color="#FFF" /> : editorSaved ? <Check size={16} color="#FFF" /> : <Save size={16} color="#FFF" />}<Text style={a.editorSaveText}>{editorSaving ? 'Saving...' : editorSaved ? 'Saved!' : 'Save Changes'}</Text></Pressable></View><ScrollView contentContainerStyle={a.editorContent}>{draftStrands.length > 0 ? draftStrands.map((strand, sIdx) => <View key={strand.id} style={a.editorCard}><View style={a.editorCardHead}><View style={a.flex}><View style={a.rowTinyWrap}><Text style={a.number}>{strand.number || `${sIdx + 1}.0`}</Text><TextInput value={strand.title} onChangeText={v => updateEditorStrandTitle(sIdx, v)} style={a.editorStrandInput} /></View><Text style={a.editorSubTitle}>{strand.subTitle || 'Strand Description'}</Text></View><Pressable onPress={() => setEditorDeleteConfirm({ type: 'strand', sIdx })} style={a.editorIconButton}><Trash2 size={18} color="#9CA3AF" /></Pressable></View><View style={a.editorSubList}>{strand.subStrands.map((sub, subIdx) => <View key={sub.id} style={a.subCard}><View style={a.editorSubHead}><View style={a.rowTinyWrap}><Text style={a.editorSubNumber}>{sub.number || `${sIdx + 1}.${subIdx + 1}`}</Text><TextInput value={sub.title} onChangeText={v => updateEditorSubStrand(sIdx, subIdx, 'title', v)} style={a.editorTopicInput} /></View><View style={a.row}><Pressable style={a.editorIconButton}><Info size={16} color="#9CA3AF" /></Pressable><Pressable onPress={() => setEditorDeleteConfirm({ type: 'subStrand', sIdx, subIdx })} style={a.editorIconButton}><X size={16} color="#9CA3AF" /></Pressable></View></View><Text style={a.editorFieldLabel}>Learning Outcomes (One per line)</Text><TextInput multiline value={(sub.outcomes || []).map(o => o.text).join('\n')} onChangeText={v => updateEditorSubStrand(sIdx, subIdx, 'outcomes', v)} placeholder="- Define key concepts..." placeholderTextColor="#9CA3AF" style={a.editorOutcomesInput} /></View>)}<Pressable onPress={() => addEditorSubStrand(sIdx)} style={a.addTopicButton}><Plus size={16} color="#2563EB" /><Text style={a.addTopicText}>Add Topic</Text></Pressable></View></View>) : <View style={a.editorEmpty}><Text style={a.emptyText}>No curriculum data for {currentGrade} {editingSubject.name}.</Text></View>}<Pressable onPress={addEditorStrand} style={a.addStrandButton}><Plus size={22} color="#9CA3AF" /><Text style={a.addSchoolText}>Add New Strand</Text></Pressable></ScrollView></View> : null}</Modal>
      <Modal visible={editorDeleteConfirm !== null} transparent animationType="fade" onRequestClose={() => setEditorDeleteConfirm(null)}><View style={a.scrim}><View style={a.confirm}><View style={a.alertBadge}><AlertTriangle size={24} color="#DC2626" /></View><Text style={a.panelTitle}>Delete {editorDeleteConfirm?.type === 'strand' ? 'Strand' : 'Topic'}?</Text><Text style={a.panelText}>Are you sure? This action cannot be undone.</Text><View style={a.row}><Pressable onPress={() => setEditorDeleteConfirm(null)} style={a.cancelWide}><Text style={a.cancelText}>Cancel</Text></Pressable><Pressable onPress={confirmDeleteEditorItem} style={a.deleteConfirm}><Text style={a.saveText}>Delete</Text></Pressable></View></View></View></Modal>
    </View>
  );
}

const a = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F7FF' }, header: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#E6EEF8', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 }, headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 }, logoWrap: { width: 32, height: 32, borderRadius: 12, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' }, headerTitle: { color: '#0F172A', fontSize: 18, fontWeight: '900' }, exit: { color: '#2563EB', fontSize: 14, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 112, gap: 16 }, pageHead: { marginBottom: 4 }, pageHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 4, flexWrap: 'wrap' }, pageTitle: { color: '#0F172A', fontSize: 30, fontWeight: '900' }, pageSub: { color: '#64748B', fontSize: 14, fontWeight: '600' }, filterCluster: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }, menuWrap: { position: 'relative' }, menu: { position: 'absolute', top: 46, right: 0, minWidth: 140, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#DDE7F3', overflow: 'hidden', zIndex: 10, shadowColor: '#0F172A', shadowOpacity: 0.09, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 5 }, userMenu: { width: 160 }, schoolMenu: { width: 180 }, menuItem: { paddingHorizontal: 14, paddingVertical: 12 }, menuItemActive: { backgroundColor: '#EFF6FF' }, menuText: { color: '#4B5563', fontSize: 12, fontWeight: '700' }, menuTextActive: { color: '#2563EB' }, cardsRow: { flexDirection: 'row', gap: 12 }, heroCard: { flex: 1, borderRadius: 22, padding: 16, overflow: 'hidden' }, dashboardRail: { gap: 12, paddingHorizontal: 4, paddingBottom: 4 }, railCard: { width: 176, minHeight: 150, borderRadius: 24, padding: 20, overflow: 'hidden', shadowColor: '#0F172A', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 4 }, railGlow: { position: 'absolute', top: -30, right: -30, width: 108, height: 108, borderRadius: 54, backgroundColor: 'rgba(255,255,255,0.16)' }, railIcon: { position: 'absolute', top: 18, right: 18 }, blue: { backgroundColor: '#2563EB' }, green: { backgroundColor: '#10B981' }, purple: { backgroundColor: '#15803D' }, red: { backgroundColor: '#EF4444' }, amber: { backgroundColor: '#F59E0B' }, coral: { backgroundColor: '#F97316' }, dark: { backgroundColor: '#15803D' }, heroLabel: { color: 'rgba(255,255,255,0.82)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }, heroValue: { color: '#FFF', fontSize: 30, fontWeight: '900', marginTop: 8 }, heroMeta: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '700', marginTop: 10 }, heroPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6, marginTop: 12 }, heroPillText: { color: '#FFF', fontSize: 11, fontWeight: '700' }, panelTitleLight: { color: '#FFF', fontSize: 18, fontWeight: '900', marginTop: 8 },
  panel: { backgroundColor: '#FFF', borderRadius: 24, padding: 16, gap: 8, borderWidth: 1, borderColor: '#E6EEF8', shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 1 }, panelTitle: { color: '#0F172A', fontSize: 18, fontWeight: '900' }, panelText: { color: '#475569', lineHeight: 21 }, panelTextSmall: { color: '#64748B', fontSize: 12, fontWeight: '600' }, activeGradeText: { color: '#16A34A', fontSize: 12, fontWeight: '900' }, miniLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }, activeAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6' }, linkText: { color: '#2563EB', fontSize: 12, fontWeight: '800' }, metricCaption: { color: '#64748B', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }, chartPanel: { backgroundColor: '#FFF', borderRadius: 26, borderWidth: 1, borderColor: '#E6EEF8', padding: 20, gap: 16, shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 }, chartBadge: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }, chartSvgWrap: { height: 160, width: '100%', marginBottom: 2 }, chartLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }, chartLabel: { color: '#64748B', fontSize: 11, fontWeight: '900' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' }, rowBetween: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'space-between' }, rowTinyWrap: { flexDirection: 'row', gap: 4, alignItems: 'center' }, flex: { flex: 1 }, chip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDE7F3', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, shadowColor: '#0F172A', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 }, chipText: { color: '#334155', fontSize: 12, fontWeight: '900' }, searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDE7F3', borderRadius: 18, paddingHorizontal: 14 }, searchInput: { flex: 1, minHeight: 52, color: '#0F172A', fontSize: 14, fontWeight: '600' },
  list: { gap: 10 }, listContainer: { backgroundColor: '#FFF', borderRadius: 24, borderWidth: 1, borderColor: '#F3F4F6', overflow: 'hidden' }, userRow: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF' }, userRowDivider: { borderBottomWidth: 1, borderColor: '#F9FAFB' }, listItem: { backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#F3F4F6', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, itemTitle: { color: '#0F172A', fontSize: 15, fontWeight: '800' }, itemMeta: { color: '#6B7280', fontSize: 12, fontWeight: '500' }, avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }, avatarImage: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6' }, avatarText: { color: '#334155', fontSize: 13, fontWeight: '900' }, userStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', overflow: 'hidden' }, userStatusGreen: { backgroundColor: '#DCFCE7', color: '#15803D' }, userStatusGray: { backgroundColor: '#F3F4F6', color: '#6B7280' }, chevronRight: { transform: [{ rotate: '-90deg' }] }, emptyState: { paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' }, emptyText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500', textAlign: 'center' }, schoolIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  addSchool: { minHeight: 58, borderWidth: 2, borderStyle: 'dashed', borderColor: '#D1D5DB', borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, addSchoolText: { color: '#9CA3AF', fontSize: 15, fontWeight: '800' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#DDE7F3', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: '#0F172A', fontSize: 14, fontWeight: '600' }, inputIconWrap: { position: 'relative', justifyContent: 'center' }, inputIcon: { position: 'absolute', left: 14, zIndex: 1 }, inputWithIcon: { paddingLeft: 40 }, blackFab: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', shadowColor: '#2563EB', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 }, gradeRow: { gap: 8, paddingVertical: 4 }, gradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, gradeSelect: { width: '48%', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDE7F3', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, gradeSelectActive: { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' }, gradeSelectText: { color: '#64748B', fontWeight: '800', fontSize: 12 }, gradeSelectTextActive: { color: '#2563EB' }, gradeChip: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDE7F3', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 }, gradeChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' }, gradeChipText: { color: '#64748B', fontWeight: '800', fontSize: 12 }, gradeChipTextActive: { color: '#FFF' },
  curriculumItem: { backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#F3F4F6', padding: 16 }, actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, blueBtn: { backgroundColor: '#2563EB', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }, blueBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12 }, ghostBtn: { backgroundColor: '#F9FAFB', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' }, ghostBtnActive: { backgroundColor: '#EFF6FF' }, ghostText: { color: '#2563EB', fontWeight: '800', fontSize: 12 }, deleteBtn: { backgroundColor: '#FEF2F2', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#F3F4F6', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 24, flexDirection: 'row', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 2 }, bottomTab: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 2 }, bottomText: { color: '#9CA3AF', fontSize: 10, fontWeight: '800', textAlign: 'center', width: '100%' }, bottomTextActive: { color: '#2563EB' },
  scrim: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 16 }, userScrim: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 16 }, sheet: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, gap: 8 }, userSheet: { backgroundColor: '#F8F9FA', borderRadius: 36, overflow: 'hidden', maxHeight: '90%' }, sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderColor: '#F3F4F6' }, sheetTitle: { color: '#0F172A', fontWeight: '800', fontSize: 18 }, sheetSub: { color: '#6B7280', fontSize: 12, fontWeight: '600' }, sheetClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' }, iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }, userContent: { padding: 20, gap: 14 }, performanceCard: { backgroundColor: '#FFF', borderRadius: 24, borderWidth: 1, borderColor: '#F3F4F6', padding: 24, alignItems: 'center', gap: 8 }, performanceScore: { color: '#111827', fontSize: 42, fontWeight: '900' }, performanceLabel: { color: '#2563EB', fontSize: 14, fontWeight: '800' }, activityList: { gap: 14, marginTop: 4 }, activityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, activityScore: { fontSize: 14, fontWeight: '800' }, activityScoreGood: { color: '#16A34A' }, activityScoreWarn: { color: '#C2410C' }, trendBars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, height: 100, marginTop: 8 }, trendCol: { flex: 1, alignItems: 'center', gap: 8 }, trendTrack: { width: '100%', flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, justifyContent: 'flex-end', overflow: 'hidden' }, trendFill: { width: '100%', backgroundColor: '#22C55E', borderRadius: 12 }, trendLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '800' }, profileCard: { backgroundColor: '#FFF', borderRadius: 24, borderWidth: 1, borderColor: '#F3F4F6', padding: 24, alignItems: 'center', gap: 8 }, profileAvatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }, profileAvatarText: { color: '#334155', fontSize: 28, fontWeight: '900' }, profileName: { color: '#111827', fontSize: 22, fontWeight: '900' }, profileSchool: { color: '#2563EB', fontSize: 12, fontWeight: '800', backgroundColor: '#EFF6FF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, overflow: 'hidden' }, infoList: { gap: 12, marginTop: 8 }, infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#F3F4F6', paddingBottom: 10 }, infoValue: { color: '#111827', fontSize: 14, fontWeight: '700' }, userBottomBar: { backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#F3F4F6', paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row' }, userBottomItem: { flex: 1, alignItems: 'center', gap: 6 },
  schoolRoot: { flex: 1, backgroundColor: '#F3F7FF' }, schoolHeader: { backgroundColor: '#2563EB', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 }, schoolMark: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', marginTop: 14, marginBottom: 10 }, schoolTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: 8 }, schoolSub: { color: '#DBEAFE', fontSize: 13, fontWeight: '700', marginTop: 4 }, modalBody: { flex: 1, backgroundColor: '#F3F7FF', marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }, schoolTabs: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderColor: '#E6EEF8', gap: 8 }, schoolTab: { flex: 1, minHeight: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }, schoolTabActive: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#93C5FD' }, schoolTabText: { color: '#64748B', fontSize: 14, fontWeight: '800' }, schoolTabTextActive: { color: '#1D4ED8' }, studentCountCard: { backgroundColor: '#EFF6FF', borderRadius: 24, borderWidth: 1, borderColor: '#BFDBFE', padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, studentCountLabel: { color: '#1D4ED8', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }, studentCountValue: { color: '#1E3A8A', fontSize: 34, fontWeight: '900' }, gradeCountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, addGradeCard: { width: '48%', minHeight: 110, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFF' }, addGradeText: { color: '#64748B', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }, sheetFooter: { backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#E6EEF8', padding: 16, flexDirection: 'row', gap: 12 }, deleteWide: { width: 56, borderRadius: 18, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }, saveWide: { flex: 1, minHeight: 56, borderRadius: 18, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' }, saveText: { color: '#FFF', fontSize: 16, fontWeight: '900' }, cancelWide: { flex: 1, minHeight: 56, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }, cancelText: { color: '#475569', fontSize: 16, fontWeight: '900' }, deleteConfirm: { flex: 1, minHeight: 56, borderRadius: 18, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' }, confirm: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, gap: 16 }, alertBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  addRoot: { flex: 1, backgroundColor: '#F3F7FF' }, addHeader: { backgroundColor: '#2563EB', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 }, editorRoot: { flex: 1, backgroundColor: '#F3F7FF' }, editorHead: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#E6EEF8', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, editorClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 8 }, editorTitle: { color: '#0F172A', fontSize: 20, fontWeight: '900' }, editorMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }, editorDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' }, editorMeta: { color: '#64748B', fontSize: 14, fontWeight: '600' }, editorSave: { minHeight: 42, borderRadius: 14, backgroundColor: '#2563EB', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#2563EB', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 }, editorSaveSuccess: { backgroundColor: '#16A34A' }, editorSaveText: { color: '#FFF', fontSize: 13, fontWeight: '800' }, editorContent: { padding: 16, paddingBottom: 120, gap: 16 }, editorCard: { backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#DDE7F3', overflow: 'hidden', shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 }, editorCardHead: { padding: 20, borderBottomWidth: 1, borderColor: '#E6EEF8', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, editorStrandInput: { flex: 1, color: '#0F172A', fontSize: 20, fontWeight: '900', textTransform: 'uppercase', paddingVertical: 0 }, editorSubTitle: { color: '#64748B', fontSize: 14, fontWeight: '600', marginTop: 8, marginLeft: 4 }, editorIconButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }, number: { color: '#1D4ED8', fontWeight: '900', fontSize: 12, backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999 }, editorSubList: { padding: 20, backgroundColor: '#F8FAFC', gap: 14 }, subCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 18, gap: 12, borderWidth: 1, borderColor: '#DDE7F3', shadowColor: '#0F172A', shadowOpacity: 0.02, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 }, editorSubHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, editorSubNumber: { color: '#1D4ED8', fontWeight: '900', fontSize: 12, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }, editorTopicInput: { color: '#0F172A', fontSize: 16, fontWeight: '800', flex: 1, paddingVertical: 0 }, editorFieldLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }, editorOutcomesInput: { minHeight: 110, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#DDE7F3', borderRadius: 14, padding: 14, color: '#0F172A', fontSize: 14, fontWeight: '500', textAlignVertical: 'top' }, addTopicButton: { minHeight: 46, borderWidth: 1, borderStyle: 'dashed', borderColor: '#93C5FD', borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#EFF6FF' }, addTopicText: { color: '#2563EB', fontSize: 13, fontWeight: '800' }, editorEmpty: { paddingVertical: 32, alignItems: 'center', justifyContent: 'center' }, addStrandButton: { minHeight: 64, borderWidth: 2, borderStyle: 'dashed', borderColor: '#CBD5E1', borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 8, flexDirection: 'row', backgroundColor: '#FFF' },
});








