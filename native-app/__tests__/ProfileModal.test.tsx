import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { ProfileModal } from '../src/components/ProfileModal';
import { BillingStatus, Subject, UserProfile } from '../src/types/app';

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

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onOpenAdmin: jest.fn(),
  onOpenTeacher: jest.fn(),
  onSignOut: jest.fn(),
  onDeleteAccount: jest.fn(() => Promise.resolve()),
  showTeacherPortalButton: false,
  showAdminPortalButton: false,
  canResendVerification: false,
  onResendVerification: jest.fn(() => Promise.resolve('Sent')),
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
  schools: [],
  allSubjects: [],
  selectedSubjectIds: [],
  onToggleSubject: jest.fn(),
  onSwapSubject: jest.fn(),
};

const subjects: Subject[] = [
  { id: 'mathematics', name: 'Mathematics', colorFrom: '#2563EB', colorTo: '#1D4ED8' },
  { id: 'english', name: 'English', colorFrom: '#16A34A', colorTo: '#15803D' },
  { id: 'kiswahili', name: 'Kiswahili', colorFrom: '#DB2777', colorTo: '#BE185D' },
  { id: 'cre', name: 'CRE', colorFrom: '#7C3AED', colorTo: '#6D28D9' },
  { id: 'ire', name: 'IRE', colorFrom: '#059669', colorTo: '#047857' },
  {
    id: 'science_and_technology',
    name: 'Science & Technology',
    colorFrom: '#F59E0B',
    colorTo: '#D97706',
  },
];

const mountedRenderers: ReactTestRenderer.ReactTestRenderer[] = [];

function renderProfileModal(
  props: Partial<React.ComponentProps<typeof ProfileModal>> = {},
) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<ProfileModal {...defaultProps} {...props} />);
  });
  mountedRenderers.push(renderer!);
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
  return root.findAll(node => textContent(node.props.children) === text).length > 0;
}

function hasTextContaining(root: ReactTestRenderer.ReactTestInstance, text: string) {
  return root.findAll(node => textContent(node.props.children).includes(text)).length > 0;
}

function pressableWithText(root: ReactTestRenderer.ReactTestInstance, text: string) {
  return root.findAll(node => node.props.onPress && hasText(node, text))[0];
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  ReactTestRenderer.act(() => {
    while (mountedRenderers.length > 0) {
      mountedRenderers.pop()?.unmount();
    }
  });
});

test('hides Lock Phone and Teachers Portal while keeping subscription available', () => {
  const onStartFocusMode = jest.fn();
  const onOpenFocusModeSettings = jest.fn();
  const onManageSubscription = jest.fn();
  const root = renderProfileModal({
    onStartFocusMode,
    onOpenFocusModeSettings,
    onManageSubscription,
    showTeacherPortalButton: true,
  });

  expect(hasText(root, 'Lock Phone')).toBe(false);
  expect(hasText(root, 'Teachers Portal')).toBe(false);
  expect(hasText(root, 'Subscription Inactive')).toBe(true);

  ReactTestRenderer.act(() =>
    root.findByProps({ accessibilityLabel: 'Manage subscription' }).props.onPress(),
  );
  expect(onManageSubscription).toHaveBeenCalledTimes(1);
  expect(onOpenFocusModeSettings).not.toHaveBeenCalled();
  expect(onStartFocusMode).not.toHaveBeenCalled();
});

test('keeps the Admin portal available without rendering Teachers Portal', () => {
  const onOpenAdmin = jest.fn();
  const root = renderProfileModal({
    onOpenAdmin,
    showAdminPortalButton: true,
    showTeacherPortalButton: true,
  });

  expect(hasText(root, 'Teachers Portal')).toBe(false);
  expect(hasText(root, 'Admin')).toBe(true);

  ReactTestRenderer.act(() => pressableWithText(root, 'Admin').props.onPress());
  expect(onOpenAdmin).toHaveBeenCalledTimes(1);
});

test('requires typed confirmation before requesting account deletion', async () => {
  const onDeleteAccount = jest.fn(() => Promise.resolve());
  const root = renderProfileModal({ onDeleteAccount });

  ReactTestRenderer.act(() => pressableWithText(root, 'Advanced account options').props.onPress());
  expect(hasText(root, 'Delete account')).toBe(true);
  expect(hasText(root, 'Requires typed confirmation.')).toBe(true);

  ReactTestRenderer.act(() => pressableWithText(root, 'Request').props.onPress());

  expect(hasText(root, 'Delete account?')).toBe(true);
  expect(hasTextContaining(root, 'deleted from our servers in 30')).toBe(true);
  expect(hasText(root, 'Type DELETE MY ACCOUNT to continue.')).toBe(true);

  const deleteButton = pressableWithText(root, 'Delete');
  expect(deleteButton.props.disabled).toBe(true);

  const confirmationInput = root.findByProps({ placeholder: 'DELETE MY ACCOUNT' });
  ReactTestRenderer.act(() => {
    confirmationInput.props.onChangeText('DELETE MY ACCOUNT');
  });

  await ReactTestRenderer.act(async () => {
    pressableWithText(root, 'Delete').props.onPress();
  });

  expect(onDeleteAccount).toHaveBeenCalledTimes(1);
});

test('shows a checkmark for every selected dashboard subject', () => {
  const selectedSubjects = subjects.slice(0, 5);
  const root = renderProfileModal({
    allSubjects: subjects,
    selectedSubjectIds: selectedSubjects.map(subject => subject.id),
  });

  selectedSubjects.forEach(subject => {
    expect(
      root.findByProps({ accessibilityLabel: `${subject.name} selected` }),
    ).toBeTruthy();
  });
});

test('pins the atomic subject swap action above Sign Out', () => {
  const onSwapSubject = jest.fn();
  const root = renderProfileModal({
    allSubjects: subjects,
    selectedSubjectIds: subjects.slice(0, 5).map(subject => subject.id),
    onSwapSubject,
  });

  ReactTestRenderer.act(() =>
    pressableWithText(root, 'Science & Technology').props.onPress(),
  );

  expect(hasText(root, 'Swap Science & Technology with which subject?')).toBe(true);
  const footer = root.findByProps({ testID: 'profile-footer' });
  const footerChildren = React.Children.toArray(footer.props.children) as Array<
    React.ReactElement<{ testID?: string }>
  >;
  const swapIndex = footerChildren.findIndex(
    child => child.props.testID === 'profile-subject-swap-slot',
  );
  const signOutIndex = footerChildren.findIndex(
    child => child.props.testID === 'profile-sign-out-button',
  );
  expect(swapIndex).toBeGreaterThanOrEqual(0);
  expect(signOutIndex).toBeGreaterThanOrEqual(0);
  expect(swapIndex).toBeLessThan(signOutIndex);

  ReactTestRenderer.act(() =>
    root
      .findByProps({
        accessibilityLabel: 'Replace Mathematics with Science & Technology',
      })
      .props.onPress(),
  );
  expect(onSwapSubject).toHaveBeenCalledTimes(1);
  expect(onSwapSubject).toHaveBeenCalledWith(
    'mathematics',
    'science_and_technology',
  );
});
