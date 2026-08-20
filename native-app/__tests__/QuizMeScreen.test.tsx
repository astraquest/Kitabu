import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { QuizMeScreen } from '../src/screens/QuizMeScreen';

test('shows real generation progress and the selected quiz-writing mascot', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <QuizMeScreen
        isLoading
        mascotKey="lion"
        progress={{ percentage: 75, stage: 'Checking the generated questions' }}
        strandsBySubject={{}}
        subStrandsByStrand={{}}
        onBack={jest.fn()}
        onGenerate={jest.fn()}
      />,
    );
  });

  expect(renderer!.root.findAllByProps({ children: 'Building your practice set' })).toHaveLength(0);
  expect(renderer!.root.findByProps({ accessibilityLabel: 'lion mascot writing a quiz' })).toBeTruthy();
  expect(renderer!.root.findByProps({ children: 'Checking the generated questions' })).toBeTruthy();
  const progressText = renderer!.root.findAllByProps({ accessibilityLiveRegion: 'polite' })[0];
  expect(progressText.props.children.join('')).toBe('75%');

  await ReactTestRenderer.act(() => renderer!.unmount());
});

test('orders quiz formats and keeps live audio unavailable', async () => {
  const onGenerate = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <QuizMeScreen
        isLoading={false}
        mascotKey="lion"
        progress={{ percentage: 0, stage: '' }}
        subjectOptions={[{ id: 'science', title: 'Science' }]}
        strandsBySubject={{ science: [{ id: 'biology', title: 'Biology' }] }}
        subStrandsByStrand={{ biology: [{ id: 'cells', title: 'Cells' }] }}
        onBack={jest.fn()}
        onGenerate={onGenerate}
      />,
    );
  });

  const root = renderer!.root;
  const subjectField = root.findAll(node =>
    node.props.onPress && node.findAllByProps({ children: 'Select a subject' }).length > 0,
  )[0];
  await ReactTestRenderer.act(() => subjectField.props.onPress());
  const subjectOption = root.findAll(node =>
    node.props.onPress && node.findAllByProps({ children: 'Science' }).length > 0,
  )[0];
  await ReactTestRenderer.act(() => subjectOption.props.onPress());

  const strandField = root.findAll(node =>
    node.props.onPress && node.findAllByProps({ children: 'Select a strand' }).length > 0,
  )[0];
  await ReactTestRenderer.act(() => strandField.props.onPress());
  const strandOption = root.findAll(node =>
    node.props.onPress && node.findAllByProps({ children: 'Biology' }).length > 0,
  )[0];
  await ReactTestRenderer.act(() => strandOption.props.onPress());

  const subStrandField = root.findAll(node =>
    node.props.onPress && node.findAllByProps({ children: 'Select a sub-strand' }).length > 0,
  )[0];
  await ReactTestRenderer.act(() => subStrandField.props.onPress());
  const subStrandOption = root.findAll(node =>
    node.props.onPress && node.findAllByProps({ children: 'Cells' }).length > 0,
  )[0];
  await ReactTestRenderer.act(() => subStrandOption.props.onPress());

  const nextButton = root.findAll(node =>
    node.props.onPress && node.findAllByProps({ children: 'Next' }).length > 0,
  )[0];
  await ReactTestRenderer.act(() => nextButton.props.onPress());

  const formatOrder = root
    .findAll(node =>
      node.props.accessibilityRole === 'button' &&
      (node.props.accessibilityLabel === 'Quiz Format' || node.props.accessibilityLabel === 'Flashcards'),
    )
    .map(option => option.props.accessibilityLabel);
  expect(formatOrder.indexOf('Quiz Format')).toBeLessThan(formatOrder.indexOf('Flashcards'));
  expect(root.findAllByProps({ children: 'Coming soon' }).length).toBeGreaterThan(0);

  const liveAudioCard = root.findByProps({ accessibilityLabel: 'Live Audio Quiz, Coming soon' });
  expect(liveAudioCard.props.disabled).toBe(true);
  expect(liveAudioCard.props.accessibilityState).toEqual({ disabled: true, selected: false });
  expect(liveAudioCard.props.onPress).toBeUndefined();

  const generateButton = root.findAll(node =>
    node.props.onPress && node.findAllByProps({ children: 'Generate' }).length > 0,
  )[0];
  await ReactTestRenderer.act(() => generateButton.props.onPress());
  expect(onGenerate).toHaveBeenCalledWith(expect.objectContaining({ format: 'flashcards' }));

  await ReactTestRenderer.act(() => renderer!.unmount());
});
