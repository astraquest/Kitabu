import React from 'react';
import { StyleSheet, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import { ProfileModal } from '../src/components/ProfileModal';
import {
  BillingStatus,
  SchoolData,
  Subject,
  UserProfile,
} from '../src/types/app';

jest.setTimeout(15000);

const user: UserProfile = {
  name: 'Amina Student',
  role: 'Student Account',
  grade: 'Grade 6',
  gender: 'female',
  school: 'Kitabu School',
  email: 'amina@example.com',
  phone: '0712345678',
  avatar: 'avatar-afro-girl',
};

const billingStatus: BillingStatus = {
  subscription: null,
  savedMpesaPhoneNumber: null,
  maskedMpesaPhoneNumber: null,
  hasPaidBefore: false,
  school: null,
};

const profileSubjects: Subject[] = [
  { id: 'science', name: 'Science', colorFrom: '#D9E9FF', colorTo: '#BBD6FF' },
  {
    id: 'agriculture',
    name: 'Agriculture',
    colorFrom: '#D8F8E5',
    colorTo: '#B9ECCF',
  },
  { id: 'english', name: 'English', colorFrom: '#FFE0EF', colorTo: '#F9BFD7' },
  {
    id: 'creative_arts',
    name: 'Creative Arts',
    colorFrom: '#F0DFFF',
    colorTo: '#DCC2FB',
  },
  { id: 'math', name: 'Mathematics', colorFrom: '#D9F7E6', colorTo: '#B8E9CE' },
  {
    id: 'kiswahili',
    name: 'Kiswahili',
    colorFrom: '#FFECCF',
    colorTo: '#FFD59C',
  },
  {
    id: 'social',
    name: 'Social Studies',
    colorFrom: '#E1E6FF',
    colorTo: '#C4CCFA',
  },
];

const schools: SchoolData[] = [
  {
    id: 'school-1',
    name: 'Kitabu School',
    location: 'Nairobi City',
    totalStudents: 120,
    gradeCounts: { 'Grade 6': 42 },
  },
];

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onOpenAdmin: jest.fn(),
  onOpenTeacher: jest.fn(),
  onSignOut: jest.fn(),
  onDeleteAccount: jest.fn(() => Promise.resolve()),
  showTeacherPortalButton: false,
  showAdminPortalButton: false,
  billingStatus,
  onManageSubscription: jest.fn(),
  focusModeActive: false,
  focusModeSetupRequired: true,
  focusModeError: 'Turn on App Pinning to keep KITABU on screen.',
  focusModeSecondsRemaining: 7200,
  dailyLimitSeconds: 7200,
  isStartingFocusMode: false,
  onStartFocusMode: jest.fn(),
  onOpenFocusModeSettings: jest.fn(),
  user,
  onSave: jest.fn(),
  schools,
  allSubjects: [],
  selectedSubjectIds: [],
  onToggleSubject: jest.fn(),
};

function renderProfileModal(
  props: Partial<React.ComponentProps<typeof ProfileModal>> = {},
) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <ProfileModal {...defaultProps} {...props} />,
    );
  });
  return renderer!.root;
}

function textContent(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(textContent).join('');
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  return '';
}

function hasText(root: ReactTestRenderer.ReactTestInstance, text: string) {
  return (
    root.findAll(node => textContent(node.props.children) === text).length > 0
  );
}

function hasTextContaining(
  root: ReactTestRenderer.ReactTestInstance,
  text: string,
) {
  return (
    root.findAll(node => textContent(node.props.children).includes(text))
      .length > 0
  );
}

function pressableWithText(
  root: ReactTestRenderer.ReactTestInstance,
  text: string,
) {
  return root.findAll(node => node.props.onPress && hasText(node, text))[0];
}

function pressableContainingText(
  root: ReactTestRenderer.ReactTestInstance,
  text: string,
) {
  return root.findAll(
    node =>
      node.props.onPress &&
      node.findAll(child => textContent(child.props.children) === text).length >
        0,
  )[0];
}

function lastPressableContainingText(
  root: ReactTestRenderer.ReactTestInstance,
  text: string,
) {
  const matches = root.findAll(
    node =>
      node.props.onPress &&
      node.findAll(child => textContent(child.props.children) === text).length >
        0,
  );
  return matches[matches.length - 1];
}

async function finishModalAnimation() {
  await ReactTestRenderer.act(async () => {
    await new Promise(resolve => setTimeout(resolve, 260));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('top card omits unspecified details and aligns contact values', () => {
  const root = renderProfileModal({
    user: {
      ...user,
      country: 'Kenya',
      county: schools[0].location,
    },
  });
  const emailText = root
    .findAllByType(Text)
    .find(node => textContent(node.props.children) === user.email);
  const phoneText = root
    .findAllByType(Text)
    .find(node => textContent(node.props.children) === user.phone);
  const countyText = root
    .findAllByType(Text)
    .find(node => textContent(node.props.children) === schools[0].location);
  const phoneRowStyle = StyleSheet.flatten(phoneText?.parent?.props.style);
  const countyStyle = StyleSheet.flatten(countyText?.props.style);

  expect(StyleSheet.flatten(emailText?.props.style).textAlign).toBe('left');
  expect(StyleSheet.flatten(phoneText?.props.style).textAlign).toBe('right');
  expect(countyStyle.textAlign).toBe('right');
  expect(countyStyle.marginLeft).toBe('auto');
  expect(countyStyle.flexShrink).toBe(0);
  expect(phoneRowStyle.paddingRight).toBe(44);

  const missingRoot = renderProfileModal({
    user: {
      ...user,
      grade: '',
      gender: 'Not Specified',
      school: '',
      country: '',
      county: '',
      email: '',
      phone: '',
    },
  });

  expect(hasText(missingRoot, 'No school selected')).toBe(false);
  expect(hasText(missingRoot, 'Gender not set')).toBe(false);
  expect(hasText(missingRoot, 'Grade not set')).toBe(false);
  expect(hasText(missingRoot, 'Country and region not set')).toBe(false);
  expect(hasText(missingRoot, 'No email saved')).toBe(false);
  expect(hasText(missingRoot, 'No phone saved')).toBe(false);
  expect(hasText(missingRoot, 'Not Specified')).toBe(false);
});

test('quick action labels preserve required line behavior', () => {
  const root = renderProfileModal();
  const subscriptionStatus = root
    .findAllByType(Text)
    .find(node => textContent(node.props.children) === 'Subscription Inactive');
  const lockPhone = root
    .findAllByType(Text)
    .find(node => textContent(node.props.children) === 'Lock Phone');

  expect(
    root.findByProps({ accessibilityLabel: 'Manage subscription' }),
  ).toBeTruthy();
  expect(
    root.findByProps({ accessibilityLabel: 'Subscription status action' }),
  ).toBeTruthy();
  expect(subscriptionStatus).toBeTruthy();
  expect(subscriptionStatus?.props.numberOfLines).toBe(1);
  expect(subscriptionStatus?.props.adjustsFontSizeToFit).toBe(true);
  expect(lockPhone?.props.numberOfLines).toBe(1);
});

test('opens phone lock setup from the compact Lock Phone action', async () => {
  const onOpenFocusModeSettings = jest.fn();
  const root = renderProfileModal({ onOpenFocusModeSettings });

  expect(hasText(root, 'Lock Phone')).toBe(true);
  expect(hasText(root, 'Focus Mode')).toBe(false);

  ReactTestRenderer.act(() =>
    pressableWithText(root, 'Lock Phone').props.onPress(),
  );

  expect(hasText(root, 'Set up phone lock')).toBe(true);
  expect(hasTextContaining(root, 'Android App Pinning')).toBe(true);
  expect(
    hasTextContaining(root, 'cannot use any other app except Kitabu'),
  ).toBe(true);

  ReactTestRenderer.act(() =>
    pressableWithText(root, 'Open Settings').props.onPress(),
  );
  await finishModalAnimation();
  expect(onOpenFocusModeSettings).toHaveBeenCalledTimes(1);
});

test('starts phone lock when setup is complete', async () => {
  const onStartFocusMode = jest.fn();
  const root = renderProfileModal({
    focusModeSetupRequired: false,
    focusModeError: null,
    onStartFocusMode,
  });

  ReactTestRenderer.act(() =>
    pressableWithText(root, 'Lock Phone').props.onPress(),
  );

  expect(hasText(root, 'Enter PIN')).toBe(true);

  ReactTestRenderer.act(() =>
    pressableWithText(root, 'Enter PIN').props.onPress(),
  );
  await finishModalAnimation();

  expect(onStartFocusMode).toHaveBeenCalledTimes(1);
});

test('requires typed confirmation before requesting account deletion', async () => {
  const onDeleteAccount = jest.fn(() => Promise.resolve());
  const root = renderProfileModal({ onDeleteAccount });

  ReactTestRenderer.act(() =>
    pressableWithText(root, 'Advanced account options').props.onPress(),
  );
  ReactTestRenderer.act(() =>
    pressableWithText(root, 'Request').props.onPress(),
  );

  expect(hasTextContaining(root, 'all account data')).toBe(true);
  expect(hasText(root, 'Type DELETE MY ACCOUNT to continue.')).toBe(true);

  const deleteButton = pressableWithText(root, 'Delete');
  expect(deleteButton.props.disabled).toBe(true);

  const confirmationInput = root.findByProps({
    placeholder: 'DELETE MY ACCOUNT',
  });
  ReactTestRenderer.act(() => {
    confirmationInput.props.onChangeText('DELETE MY ACCOUNT');
  });

  await ReactTestRenderer.act(async () => {
    pressableWithText(root, 'Delete').props.onPress();
  });

  expect(onDeleteAccount).toHaveBeenCalledTimes(1);
});

test('asks which selected subject to swap when selecting a sixth subject', () => {
  const onToggleSubject = jest.fn();
  const root = renderProfileModal({
    allSubjects: profileSubjects,
    selectedSubjectIds: ['science', 'english', 'math', 'kiswahili', 'social'],
    onToggleSubject,
  });

  ReactTestRenderer.act(() =>
    pressableContainingText(root, 'Agriculture').props.onPress(),
  );

  expect(hasText(root, 'Swap Agriculture with which subject?')).toBe(true);

  ReactTestRenderer.act(() =>
    lastPressableContainingText(root, 'English').props.onPress(),
  );

  expect(onToggleSubject).toHaveBeenNthCalledWith(1, 'english');
  expect(onToggleSubject).toHaveBeenNthCalledWith(2, 'agriculture');
});

test('uses country-aware region labels and DB-backed school dropdowns', async () => {
  const root = renderProfileModal({
    user: {
      ...user,
      country: 'Kenya',
      county: '',
      school: '',
    },
  });

  ReactTestRenderer.act(() =>
    root.findByProps({ accessibilityLabel: 'Edit profile' }).props.onPress(),
  );
  await finishModalAnimation();

  expect(hasText(root, 'Country')).toBe(true);
  expect(hasText(root, 'County')).toBe(true);
  expect(hasText(root, 'Update the details shown on your card.')).toBe(false);

  ReactTestRenderer.act(() =>
    root
      .findByProps({ accessibilityLabel: 'Country selector' })
      .props.onPress(),
  );
  expect(
    root.findAllByProps({ accessibilityLabel: 'Kenya flag' }).length,
  ).toBeGreaterThan(0);
  expect(
    root.findAllByProps({ accessibilityLabel: 'Uganda flag' }).length,
  ).toBeGreaterThan(0);
  expect(hasText(root, 'KE Kenya')).toBe(false);
  expect(hasText(root, 'UG Uganda')).toBe(false);
  ReactTestRenderer.act(() =>
    root.findByProps({ accessibilityLabel: 'Select Uganda' }).props.onPress(),
  );

  expect(hasText(root, 'District')).toBe(true);

  ReactTestRenderer.act(() =>
    root
      .findByProps({ accessibilityLabel: 'Country selector' })
      .props.onPress(),
  );
  ReactTestRenderer.act(() =>
    root.findByProps({ accessibilityLabel: 'Select Kenya' }).props.onPress(),
  );
  ReactTestRenderer.act(() =>
    root.findByProps({ accessibilityLabel: 'County selector' }).props.onPress(),
  );
  ReactTestRenderer.act(() =>
    root
      .findByProps({ accessibilityLabel: 'Select Nairobi City' })
      .props.onPress(),
  );

  expect(hasText(root, 'Kitabu School')).toBe(true);
});
