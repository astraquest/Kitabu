import React from 'react';
import { StyleSheet, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import { AdminPortalScreen } from '../src/screens/AdminPortalScreen';
import {
  AdminPortalUser,
  BannerAnnouncement,
  BillingPlan,
  SchoolData,
  Subject,
  UserProfile,
} from '../src/types/app';

const subjects: Subject[] = [
  { id: 'math', name: 'Mathematics', colorFrom: '#2563EB', colorTo: '#60A5FA' },
  { id: 'science', name: 'Science', colorFrom: '#10B981', colorTo: '#6EE7B7' },
];

const schools: SchoolData[] = [
  {
    id: 'school-1',
    name: 'Nairobi Academy',
    location: 'Nairobi',
    totalStudents: 120,
    gradeCounts: { 'Grade 4': 60, 'Grade 5': 60 },
    pilot: {
      status: 'active',
      startDate: '2026-06-01',
      endDate: '2026-09-01',
      targetStudents: 150,
      onboardingStage: 3,
      notes: 'Strong early adoption',
      metrics: { onboardedStudents: 110, engagedStudents: 84, averageMastery: 72 },
    },
    pricing: {
      assignedPlanCode: 'monthly',
      assignedPlanName: 'Monthly',
      billingCycle: 'monthly',
      basePriceKsh: 500,
      basePriceKshCents: 50000,
      effectivePriceKsh: 450,
      effectivePriceKshCents: 45000,
      discount: null,
    },
  },
];

const users: AdminPortalUser[] = [
  {
    id: 'user-1',
    name: 'Amina Otieno',
    grade: 'Grade 4',
    school: 'Nairobi Academy',
    email: 'amina@example.com',
    status: 'Online',
    color: 'green',
  },
];

const plans: BillingPlan[] = [
  {
    code: 'weekly',
    name: 'Weekly',
    billingCycle: 'weekly',
    priceKsh: 150,
    priceKshCents: 15000,
    isPopular: false,
  },
  {
    code: 'monthly',
    name: 'Monthly',
    billingCycle: 'monthly',
    priceKsh: 500,
    priceKshCents: 50000,
    isPopular: true,
  },
  {
    code: 'annual',
    name: 'Annual',
    billingCycle: 'annual',
    priceKsh: 5000,
    priceKshCents: 500000,
    isPopular: false,
  },
];

const announcements: BannerAnnouncement[] = [
  {
    id: 'announcement-1',
    title: 'New revision pack',
    message: 'Share the latest CBC revision pack with learners.',
    ctaLabel: 'Open',
    ctaTarget: 'bookshelf_view',
    startsAt: '2026-06-01',
    endsAt: null,
    isActive: true,
  },
];

const userProfile: UserProfile = {
  name: 'Admin User',
  gender: 'Not Specified',
};

function renderAdminPortal() {
  return ReactTestRenderer.create(
    <AdminPortalScreen
      onBack={jest.fn()}
      currentGrade="Grade 4"
      subjects={subjects}
      curriculumData={{}}
      schoolsList={schools}
      users={users}
      schoolPlans={plans}
      discounts={[]}
      announcements={announcements}
      userProfile={userProfile}
      onSelectGrade={jest.fn()}
      onCreateSchool={jest.fn(() => Promise.resolve())}
      onUpdateSchoolRecord={jest.fn(() => Promise.resolve())}
      onDeleteSchoolRecord={jest.fn(() => Promise.resolve())}
      onUpdateSchoolPilot={jest.fn(() => Promise.resolve())}
      onCreateDiscount={jest.fn(() => Promise.resolve())}
      onUpdateDiscountRecord={jest.fn(() => Promise.resolve())}
      onDeleteDiscountRecord={jest.fn(() => Promise.resolve())}
      onCreateAnnouncement={jest.fn(() => Promise.resolve())}
      onUpdateAnnouncementRecord={jest.fn(() => Promise.resolve())}
      onDeleteAnnouncementRecord={jest.fn(() => Promise.resolve())}
      onUpdateCurriculum={jest.fn(() => Promise.resolve())}
      onImportCurriculum={jest.fn(() => Promise.resolve())}
    />,
  );
}

function hasText(root: ReactTestRenderer.ReactTestInstance, text: string) {
  return root.findAllByProps({ children: text }).length > 0;
}

function pressableWithText(root: ReactTestRenderer.ReactTestInstance, text: string) {
  return root.findAll(node => node.props.onPress && node.findAllByProps({ children: text }).length > 0)[0];
}

test('admin dashboard surfaces the important metric cards and tabs', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = renderAdminPortal();
  });

  expect(hasText(renderer.root, 'Total Schools')).toBe(true);
  expect(hasText(renderer.root, 'Total Students')).toBe(true);
  expect(hasText(renderer.root, 'Avg / School')).toBe(true);
  expect(hasText(renderer.root, 'Active Pilots')).toBe(true);
  expect(hasText(renderer.root, 'Revenue Signal')).toBe(true);
  expect(hasText(renderer.root, 'Pilots')).toBe(true);
  expect(hasText(renderer.root, 'Pricing')).toBe(true);
});

test('visible admin form inputs use the light portal theme', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = renderAdminPortal();
  });

  const pricingTab = pressableWithText(renderer.root, 'Pricing');
  await ReactTestRenderer.act(() => {
    pricingTab.props.onPress();
  });

  const inputs = renderer.root.findAllByType(TextInput);
  expect(inputs.length).toBeGreaterThan(0);

  inputs.forEach(input => {
    const flattenedStyle = StyleSheet.flatten(input.props.style);
    expect(flattenedStyle.backgroundColor).toBe('#F8FAFC');
    expect(flattenedStyle.color).toBe('#0F172A');
    expect(input.props.placeholderTextColor).toBe('#94A3B8');
  });
});
