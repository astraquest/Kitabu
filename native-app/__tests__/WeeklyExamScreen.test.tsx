import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { WeeklyExamScreen } from '../src/screens/WeeklyExamScreen';
import { WeeklyExamPayload } from '../src/types/app';

const data: WeeklyExamPayload = {
  exam: {
    id: 'exam-1',
    title: 'Grade 8 Weekly Challenge',
    gradeLevel: 'Grade 8',
    weekStart: '2026-06-15',
    durationMinutes: 20,
    opensAt: '2026-06-15T00:00:00.000Z',
    closesAt: '2026-06-22T00:00:00.000Z',
    questions: [{
      id: 'q1', subjectId: 'mathematics', subjectName: 'Mathematics',
      subStrandKey: 'number-operations', prompt: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
    }],
  },
  attempt: null,
  history: [],
};

test('starts an available weekly exam', async () => {
  const onStart = jest.fn().mockResolvedValue(undefined);
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <WeeklyExamScreen
        data={data}
        error={null}
        isLoading={false}
        isSubmitting={false}
        onBack={jest.fn()}
        onRetry={jest.fn()}
        onStart={onStart}
        onSubmit={jest.fn()}
      />,
    );
  });

  const button = renderer!.root.findAll(node => node.props.onPress === onStart)[0];
  await ReactTestRenderer.act(() => button.props.onPress());
  expect(onStart).toHaveBeenCalledTimes(1);
expect(renderer!.root.findAllByProps({ children: 'Grade 8 Weekly Challenge' }).length).toBeGreaterThan(0);
});
