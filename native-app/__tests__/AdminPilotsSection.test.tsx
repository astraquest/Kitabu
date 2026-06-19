import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { AdminPilotsSection } from '../src/components/admin/AdminPilotsSection';
import { SchoolData } from '../src/types/app';

const school: SchoolData = {
  id: 'school-1', name: 'Nairobi Academy', location: 'Nairobi', totalStudents: 30,
  gradeCounts: { 'Grade 8': 30 },
  pilot: {
    status: 'onboarding', startDate: '2026-06-01', endDate: '2026-09-01',
    targetStudents: 40, onboardingStage: 2, notes: null,
    metrics: { onboardedStudents: 30, engagedStudents: 18, averageMastery: 72 },
  },
};

test('opens a school pilot and shows onboarding metrics', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <AdminPilotsSection schools={[school]} onUpdatePilot={jest.fn()} />,
    );
  });
  const schoolButton = renderer!.root.findAll(node => node.props.onPress && node.findAllByProps({ children: 'Nairobi Academy' }).length > 0)[0];
  await ReactTestRenderer.act(() => schoolButton.props.onPress());
  expect(renderer!.root.findAllByProps({ children: 'Pilot setup and launch readiness' }).length).toBeGreaterThan(0);
  expect(renderer!.root.findAllByProps({ children: '18' }).length).toBeGreaterThan(0);
});
