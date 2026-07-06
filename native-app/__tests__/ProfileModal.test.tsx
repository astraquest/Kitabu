import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { ProfileModal } from '../src/components/ProfileModal';
import { BillingStatus, UserProfile } from '../src/types/app';

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
};

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

test('shows Lock Phone controls in the student profile', () => {
  const onStartFocusMode = jest.fn();
  const onOpenFocusModeSettings = jest.fn();
  const root = renderProfileModal({ onStartFocusMode, onOpenFocusModeSettings });

  expect(hasText(root, 'Lock Phone')).toBe(true);

  ReactTestRenderer.act(() => pressableWithText(root, 'Lock Phone').props.onPress());
  expect(hasText(root, 'Set up phone lock')).toBe(true);
  expect(hasTextContaining(root, 'Turn on Android App Pinning')).toBe(true);

  ReactTestRenderer.act(() => pressableWithText(root, 'Open Settings').props.onPress());
  expect(onOpenFocusModeSettings).toHaveBeenCalledTimes(1);
  expect(onStartFocusMode).not.toHaveBeenCalled();
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
