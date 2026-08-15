import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { createAudioPlayer, requestRecordingPermissionsAsync } from 'expo-audio';

import { ParentHouseholdOnboardingScreen } from '../src/screens/ParentHouseholdOnboardingScreen';

jest.mock('../src/services/pushNotifications', () => ({
  requestPushPermission: jest.fn().mockResolvedValue({ granted: true }),
}));

jest.mock('../src/services/haptics', () => ({
  triggerHaptic: jest.fn(),
}));

const schools = [
  {
    id: 'school-1',
    name: 'Kitabu Academy',
    location: 'Baringo',
    totalStudents: 0,
    gradeCounts: {},
  },
];

function textContent(value: unknown): string {
  if (Array.isArray(value)) return value.map(textContent).join('');
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value && typeof value === 'object' && 'props' in value) {
    return textContent((value as { props?: { children?: unknown } }).props?.children);
  }
  return '';
}

async function pressText(root: ReactTestRenderer.ReactTestInstance, text: string) {
  const target = root.findAll(
    node => typeof node.props.onPress === 'function' && textContent(node.props.children) === text,
  )[0];
  expect(target).toBeTruthy();
  await act(async () => {
    await target.props.onPress();
  });
}

async function pressLabel(root: ReactTestRenderer.ReactTestInstance, label: string) {
  const target = root.findAll(
    node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === label,
  )[0];
  expect(target).toBeTruthy();
  await act(async () => {
    await target.props.onPress();
  });
}

async function fill(root: ReactTestRenderer.ReactTestInstance, placeholder: string, value: string) {
  const input = root.findByProps({ placeholder });
  await act(async () => {
    input.props.onChangeText(value);
  });
}

test('centres the account setup flow, rejects digits in parent names, and exposes the detected country in its picker', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <ParentHouseholdOnboardingScreen
        schools={schools}
        isSubmitting={false}
        collectSignupCredentials={false}
        onRoleChange={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );
  });
  const root = renderer!.root;

  await pressText(root, 'English');
  await pressText(root, '👨‍👩‍👧 Parent');
  expect(root.findAll(node => textContent(node.props.children) === 'KITABU · ACCOUNT SETUP').length).toBeGreaterThan(0);
  expect(root.findAll(node => textContent(node.props.children) === 'A few thoughtful choices help Kitabu support every child.').length).toBe(0);
  await fill(root, 'Your name', 'Grace2');
  expect(root.findByProps({ placeholder: 'Your name' }).props.value).toBe('Grace');
  await pressText(root, 'Continue');
  await pressLabel(root, 'Select family country');
  expect(root.findAll(node => textContent(node.props.children).includes('Detected')).length).toBeGreaterThan(0);
  expect(root.findAll(node => textContent(node.props.children) === '🇺🇬 Uganda · Detected').length).toBeLessThanOrEqual(1);
});

test('uses the revised family reveal order with all subjects, permission copy, and a per-child commitment', async () => {
  const onSubmit = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(() => {
    renderer = ReactTestRenderer.create(
      <ParentHouseholdOnboardingScreen
        schools={schools}
        isSubmitting={false}
        collectSignupCredentials
        onRoleChange={jest.fn()}
        onSubmit={onSubmit}
      />,
    );
  });
  const root = renderer!.root;
  await pressText(root, 'English');
  await pressText(root, '👨‍👩‍👧 Parent');
  await fill(root, 'Your name', 'Grace');
  await pressText(root, 'Continue');
  await pressLabel(root, 'Back in parent setup');
  expect(root.findByProps({ placeholder: 'Your name' }).props.value).toBe('Grace');
  await pressText(root, 'Continue');
  await pressText(root, 'Confirm country');
  await fill(root, "Child's name", 'Amina');
  await pressText(root, 'Continue');
  await fill(root, 'Age', '10');
  await pressText(root, 'Continue');
  await pressText(root, 'Girl');
  await pressText(root, 'Select county');
  await pressText(root, 'Baringo');
  await pressText(root, 'Select school');
  await pressText(root, 'Kitabu Academy');
  await pressText(root, 'Continue');
  await pressText(root, 'Grade 5');
  await pressText(root, 'Continue');
  expect(root.findAll(node => textContent(node.props.children) === 'Prefer not to say').length).toBe(0);
  await pressText(root, 'At Grade Level');
  expect(root.findAll(node => textContent(node.props.children) === 'Kiswahili').length).toBeGreaterThan(0);
  expect(root.findAll(node => textContent(node.props.children) === 'Social Studies').length).toBeGreaterThan(0);
  await pressText(root, 'Mathematics');
  await pressText(root, 'Continue');
  await pressText(root, 'No, continue');
  expect(root.findAll(node => textContent(node.props.children) === 'We need microphone access for spoken tutoring').length).toBeGreaterThan(0);
  await pressText(root, 'Not now');
  expect(root.findAll(node => textContent(node.props.children) === 'Click Allow so as not to miss assignments and progress reports').length).toBeGreaterThan(0);
  await pressText(root, 'Not now');
  const referralOrderBeforeSelection = root.findAll(
    node => typeof node.props.onPress === 'function' && ['Friend or family', 'WhatsApp', 'Church'].includes(textContent(node.props.children)),
  ).map(node => textContent(node.props.children));
  await pressText(root, 'WhatsApp');
  const referralOrderAfterSelection = root.findAll(
    node => typeof node.props.onPress === 'function' && ['Friend or family', 'WhatsApp', 'Church'].includes(textContent(node.props.children)),
  ).map(node => textContent(node.props.children));
  expect(referralOrderAfterSelection).toEqual(referralOrderBeforeSelection);
  await pressText(root, 'Continue');
  expect(root.findAll(node => textContent(node.props.children) === "Parent, please let the learner choose their tutor. Don't choose for them").length).toBeGreaterThan(0);
  await pressText(root, 'Continue');
  expect(root.findAll(node => textContent(node.props.children) === 'Choose Rafiki').length).toBeGreaterThan(0);
  await pressText(root, 'Rafiki the Panda');
  await pressText(root, 'Continue');
  expect(root.findAll(node => textContent(node.props.children) === 'Meet Rafiki').length).toBeGreaterThan(0);
  await pressText(root, 'Continue');
  expect(root.findAll(node => textContent(node.props.children) === "Choose Rafiki's voice").length).toBeGreaterThan(0);
  expect(root.findAll(node => node.props.accessibilityLabel === 'Selected mascot on voice screen').length).toBeGreaterThan(0);
  expect(root.findAll(node => node.props.accessibilityLabel === 'Preview Samora voice' && typeof node.props.onPress === 'function').length).toBe(1);
  expect(root.findAll(node => textContent(node.props.children).includes('Samora ·')).length).toBe(0);
  await pressText(root, 'Preview voice');
  expect(createAudioPlayer).toHaveBeenCalledWith(expect.anything(), { downloadFirst: true });
  const previewPlayer = (createAudioPlayer as jest.Mock).mock.results.at(-1)?.value;
  expect(previewPlayer.play).toHaveBeenCalledTimes(1);
  await pressText(root, 'Continue');
  expect(root.findAll(node => textContent(node.props.children) === 'Practise makes Perfect').length).toBeGreaterThan(0);
  await pressText(root, 'Continue');
  expect(root.findAll(node => textContent(node.props.children) === 'Are you ready to make that commitment?').length).toBeGreaterThan(0);
  await pressText(root, 'Yes');
  const signatureCanvas = root.findByProps({ accessibilityLabel: 'Signature canvas' });
  await act(async () => {
    signatureCanvas.props.onResponderGrant({ nativeEvent: { locationX: 10, locationY: 10 } });
    signatureCanvas.props.onResponderRelease({ nativeEvent: { locationX: 10, locationY: 10 } });
  });
  expect(root.findAll(node => textContent(node.props.children) === 'Draw your signature').length).toBeGreaterThan(0);
  await act(async () => {
    signatureCanvas.props.onResponderGrant({ nativeEvent: { locationX: 10, locationY: 10 } });
    signatureCanvas.props.onResponderMove({ nativeEvent: { locationX: 40, locationY: 24 } });
    signatureCanvas.props.onResponderRelease({ nativeEvent: { locationX: 52, locationY: 28 } });
  });
  expect(root.findAll(node => textContent(node.props.children) === 'Signature saved').length).toBeGreaterThan(0);
  await pressText(root, 'Continue');
  expect(root.findAll(node => textContent(node.props.children) === 'Amina is ready to learn!').length).toBeGreaterThan(0);
  jest.useFakeTimers();
  await pressText(root, 'Continue');
  await act(async () => {
    jest.advanceTimersByTime(8_500);
  });
  jest.useRealTimers();
  expect(root.findAll(node => textContent(node.props.children) === 'Your Study Plan is Ready!').length).toBeGreaterThan(0);
  await pressText(root, 'Continue');
  await pressLabel(root, 'Continue with Google');
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
    signupMethod: 'google',
    children: [expect.objectContaining({ name: 'Amina', mascotKey: 'panda', voiceName: 'Samora', commitmentAccepted: true })],
  }));
});

test('starts the tutor loop with the first child and advances independently to the next child', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(() => {
    renderer = ReactTestRenderer.create(
      <ParentHouseholdOnboardingScreen schools={schools} isSubmitting={false} collectSignupCredentials={false} onRoleChange={jest.fn()} onSubmit={jest.fn()} />,
    );
  });
  const root = renderer!.root;
  const completeChildProfile = async (name: string) => {
    await fill(root, "Child's name", name);
    await pressText(root, 'Continue');
    await fill(root, 'Age', '10');
    await pressText(root, 'Continue');
    await pressText(root, 'Girl');
    await pressText(root, 'Select county');
    await pressText(root, 'Baringo');
    await pressText(root, 'Select school');
    await pressText(root, 'Kitabu Academy');
    await pressText(root, 'Continue');
    await pressText(root, 'Grade 5');
    await pressText(root, 'Continue');
    await pressText(root, 'At Grade Level');
    await pressText(root, 'Mathematics');
    await pressText(root, 'Continue');
  };

  await pressText(root, 'English');
  await pressText(root, '👨‍👩‍👧 Parent');
  await fill(root, 'Your name', 'Grace');
  await pressText(root, 'Continue');
  await pressText(root, 'Confirm country');
  await completeChildProfile('Amina');
  await pressText(root, 'Yes, add another child');
  await completeChildProfile('Brian');
  await pressText(root, 'No, continue');
  await pressText(root, 'Allow');
  expect(requestRecordingPermissionsAsync).toHaveBeenCalled();
  await pressText(root, 'Not now');
  await pressText(root, 'WhatsApp');
  await pressText(root, 'Continue');
  await pressText(root, 'Continue');
  await pressText(root, 'Rafiki the Panda');
  await pressText(root, 'Continue');
  await pressText(root, 'Continue');
  await pressText(root, 'Preview voice');
  await pressText(root, 'Continue');
  await pressText(root, 'Continue');
  await pressText(root, 'Yes');
  const signatureCanvas = root.findByProps({ accessibilityLabel: 'Signature canvas' });
  await act(async () => {
    signatureCanvas.props.onResponderGrant({ nativeEvent: { locationX: 10, locationY: 10 } });
    signatureCanvas.props.onResponderMove({ nativeEvent: { locationX: 40, locationY: 24 } });
    signatureCanvas.props.onResponderRelease({ nativeEvent: { locationX: 52, locationY: 28 } });
  });
  await pressText(root, 'Continue');
  expect(root.findAll(node => textContent(node.props.children) === 'Amina is ready to learn!').length).toBeGreaterThan(0);
  await pressText(root, 'Continue');
  expect(root.findAll(node => textContent(node.props.children) === "Parent, please let the learner choose their tutor. Don't choose for them").length).toBeGreaterThan(0);
});

test('keeps a manually entered school when the create-school request fails', async () => {
  const onCreateSchool = jest.fn().mockRejectedValue(new Error('offline'));
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(() => {
    renderer = ReactTestRenderer.create(
      <ParentHouseholdOnboardingScreen schools={schools} isSubmitting={false} onRoleChange={jest.fn()} onSubmit={jest.fn()} onCreateSchool={onCreateSchool} />,
    );
  });
  const root = renderer!.root;
  await pressText(root, 'English');
  await pressText(root, '👨‍👩‍👧 Parent');
  await fill(root, 'Your name', 'Grace');
  await pressText(root, 'Continue');
  await pressText(root, 'Confirm country');
  await fill(root, "Child's name", 'Amina');
  await pressText(root, 'Continue');
  await fill(root, 'Age', '10');
  await pressText(root, 'Continue');
  await pressText(root, 'Girl');
  await pressText(root, 'Select county');
  await pressText(root, 'Baringo');
  await pressText(root, 'Select school');
  await fill(root, 'Search schools', 'New Family School');
  await pressText(root, 'Add Your School');
  await fill(root, 'Enter school name', 'New Family School');
  await pressText(root, 'Save and Continue');
  expect(onCreateSchool).toHaveBeenCalledWith({ schoolName: 'New Family School', county: 'Baringo' });
  expect(root.findAll(node => textContent(node.props.children) === 'New Family School').length).toBeGreaterThan(0);
});
