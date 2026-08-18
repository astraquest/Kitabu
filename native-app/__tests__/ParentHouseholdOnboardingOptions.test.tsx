import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { createAudioPlayer, requestRecordingPermissionsAsync } from 'expo-audio';

import { ParentHouseholdOnboardingScreen } from '../src/screens/ParentHouseholdOnboardingScreen';
import { parentOnboardingSubjectOptions } from '../src/utils/parentOnboardingSubjects';
import { parentHouseholdCopy } from '../src/onboarding/parentHouseholdOnboardingCopy';

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

test('localizes display-only grades, loading, subjects, and school validation while retaining stable values', () => {
  const copy = parentHouseholdCopy('sw', 'Amina');
  expect(copy.grade('Grade 5')).toBe('Darasa la 5');
  expect(copy.title.age).toBe('Amina ana miaka mingapi?');
  expect(copy.studyPlanMessages[0]).toBe('Tunaangalia mtaala');
  expect(copy.subject('CRE / IRE / HRE')).toBe('CRE / IRE / HRE');
  expect(copy.subject('Creative Arts & Sports')).toBe('Sanaa za Ubunifu na Michezo');
  expect(copy.schoolNameValidation).toBe('Andika jina la shule na uchague kaunti kwanza.');
  expect('Grade 5').toBe('Grade 5');
});

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

async function chooseParentAvatar(root: ReactTestRenderer.ReactTestInstance, avatar = 'mum1') {
  await pressLabel(root, `Choose parent avatar ${avatar}`);
  await pressText(root, 'Continue');
}

async function fill(root: ReactTestRenderer.ReactTestInstance, placeholder: string, value: string) {
  const input = root.findByProps({ placeholder });
  await act(async () => {
    input.props.onChangeText(value);
  });
}

async function continueFromWhatsAppNumber(root: ReactTestRenderer.ReactTestInstance, value = '0700123456') {
  await fill(root, '0700123456', value);
  await pressText(root, 'Continue');
}

test('enables Kiswahili with the exact prompt and keeps English available', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(() => {
    renderer = ReactTestRenderer.create(
      <ParentHouseholdOnboardingScreen schools={schools} isSubmitting={false} collectSignupCredentials={false} onRoleChange={jest.fn()} onSubmit={jest.fn()} />,
    );
  });
  const root = renderer!.root;
  expect(root.findAll(node => textContent(node.props.children) === 'Chagua Lugha Yako').length).toBeGreaterThan(0);
  const prompt = root.find(node => textContent(node.props.children) === 'Chagua Lugha Yako');
  expect(prompt.props.style).toEqual(expect.objectContaining({ fontSize: 15 }));
  const languageChoices = root.findAll(node => ['Choose English', 'Choose Kiswahili'].includes(node.props.accessibilityLabel));
  const english = languageChoices.find(node => node.props.accessibilityLabel === 'Choose English');
  const kiswahili = languageChoices.find(node => node.props.accessibilityLabel === 'Choose Kiswahili');

  expect(languageChoices.indexOf(kiswahili!)).toBeLessThan(languageChoices.indexOf(english!));
  expect(english?.props.disabled).not.toBe(true);
  expect(typeof english?.props.onPress).toBe('function');
  expect(kiswahili?.props.disabled).not.toBe(true);
  expect(kiswahili?.props.onPress).toEqual(expect.any(Function));

  await pressText(root, 'English');
  expect(root.findAll(node => textContent(node.props.children) === 'Who are you?').length).toBeGreaterThan(0);
});

test('selecting Kiswahili advances into translated parent setup and preserves sw on submit', async () => {
  const onSubmit = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(() => {
    renderer = ReactTestRenderer.create(
      <ParentHouseholdOnboardingScreen schools={schools} isSubmitting={false} collectSignupCredentials={false} onRoleChange={jest.fn()} onSubmit={onSubmit} />,
    );
  });
  const root = renderer!.root;
  await pressLabel(root, 'Choose Kiswahili');
  expect(root.findAll(node => textContent(node.props.children) === 'Wewe ni nani?').length).toBeGreaterThan(0);
  await pressText(root, '👨‍👩‍👧 Mzazi');
  await pressLabel(root, 'Chagua picha ya mzazi mum1');
  await pressText(root, 'Endelea');
  await fill(root, 'Jina lako', 'Grace');
  await pressText(root, 'Endelea');
  await fill(root, '0700123456', '+254 701 234 567');
  await pressText(root, 'Endelea');
  await pressText(root, 'Thibitisha nchi');
  await fill(root, 'Jina la mtoto', 'Amina');
  await pressText(root, 'Endelea');
  await fill(root, 'Umri', '10');
  await pressText(root, 'Endelea');
  await pressText(root, 'Msichana');
  await pressText(root, 'Chagua kaunti');
  await pressText(root, 'Baringo');
  await pressText(root, 'Chagua shule');
  await pressText(root, 'Kitabu Academy');
  await pressText(root, 'Endelea');
  await pressText(root, 'Darasa la 5');
  await pressText(root, 'Endelea');
  await pressText(root, 'Yuko kwenye kiwango cha darasa');
  expect(root.findAll(node => textContent(node.props.children) === 'Ni masomo gani yanahitaji msaada?').length).toBeGreaterThan(0);
  await pressText(root, 'Hisabati');
  await pressText(root, 'Endelea');
  await pressText(root, 'Hapana, endelea');
  expect(root.findAll(node => textContent(node.props.children) === 'Tunahitaji ruhusa ya maikrofoni kwa mafunzo ya kuzungumza').length).toBeGreaterThan(0);
  await pressText(root, 'Si sasa');
  await pressText(root, 'Si sasa');
  await pressText(root, 'WhatsApp');
  await pressText(root, 'Endelea');
  await pressText(root, 'Endelea');
  await pressText(root, 'Rafiki Panda');
  await pressText(root, 'Endelea');
  expect(root.findAll(node => textContent(node.props.children) === 'Chagua sauti ya Rafiki').length).toBeGreaterThan(0);
  await pressLabel(root, 'Sikiliza sauti ya Samora');
  await pressText(root, 'Endelea');
  await pressText(root, 'Endelea');
  await pressText(root, 'Endelea');
  await pressText(root, 'Ndiyo');
  const signatureCanvas = root.findByProps({ accessibilityLabel: 'Eneo la saini' });
  await act(async () => {
    signatureCanvas.props.onResponderGrant({ nativeEvent: { locationX: 10, locationY: 10 } });
    signatureCanvas.props.onResponderMove({ nativeEvent: { locationX: 40, locationY: 24 } });
    signatureCanvas.props.onResponderRelease({ nativeEvent: { locationX: 52, locationY: 28 } });
  });
  await pressText(root, 'Endelea');
  expect(root.findAll(node => textContent(node.props.children) === 'Amina yuko tayari kujifunza!').length).toBeGreaterThan(0);
  jest.useFakeTimers();
  await pressText(root, 'Endelea');
  await act(async () => { jest.advanceTimersByTime(8_500); });
  jest.useRealTimers();
  expect(root.findAll(node => textContent(node.props.children) === 'Mpango wako wa masomo uko tayari!').length).toBeGreaterThan(0);
  await pressText(root, 'Endelea');
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ languageCode: 'sw' }));
});

test('centres the account setup flow, asks for WhatsApp before country, and exposes the detected country in its picker', async () => {
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
  await chooseParentAvatar(root);
  expect(root.findAll(node => textContent(node.props.children) === 'KITABU · ACCOUNT SETUP').length).toBeGreaterThan(0);
  expect(root.findAll(node => textContent(node.props.children) === 'A few thoughtful choices help Kitabu support every child.').length).toBe(0);
  await fill(root, 'Your name', 'Grace2');
  expect(root.findByProps({ placeholder: 'Your name' }).props.value).toBe('Grace');
  await pressText(root, 'Continue');
  expect(root.findAll(node => textContent(node.props.children) === 'What is your WhatsApp number?').length).toBeGreaterThan(0);
  expect(root.findAll(node => textContent(node.props.children) === "We will use this to send you reports about your child's progress").length).toBeGreaterThan(0);
  expect(root.findByProps({ placeholder: '0700123456' })).toBeTruthy();
  expect(textContent(root.findAll(node => node.props.accessibilityLabel === 'Select WhatsApp country calling code')[0].props.children)).toContain('+254');
  await pressText(root, 'Continue');
  expect(root.findAll(node => textContent(node.props.children).includes('Enter a valid WhatsApp number')).length).toBeGreaterThan(0);
  await pressLabel(root, 'Select WhatsApp country calling code');
  const callingCountryRows = root.findAll(node => node.props.accessibilityRole === 'radio');
  const callingCountryNames = callingCountryRows.map(node => textContent(node.props.children).replace(/^[^A-Za-z]+/, '').replace(/ · \+\d+(?: · Detected)?$/, ''));
  expect(callingCountryRows.length).toBeGreaterThan(200);
  expect(callingCountryNames).toEqual([...callingCountryNames].sort((left, right) => left.localeCompare(right, 'en')));
  await fill(root, 'Search countries', 'United States');
  expect(root.findAll(node => textContent(node.props.children).includes('United States')).length).toBeGreaterThan(0);
  await pressText(root, '🇺🇸 United States · +1');
  expect(textContent(root.findAll(node => node.props.accessibilityLabel === 'Select WhatsApp country calling code')[0].props.children)).toContain('+1');
  await continueFromWhatsAppNumber(root);
  await pressLabel(root, 'Back in parent setup');
  expect(root.findByProps({ placeholder: '0700123456' }).props.value).toBe('0700123456');
  expect(textContent(root.findAll(node => node.props.accessibilityLabel === 'Select WhatsApp country calling code')[0].props.children)).toContain('+1');
  await continueFromWhatsAppNumber(root);
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
  expect(root.findAll(node => textContent(node.props.children) === 'Choose your avatar').length).toBeGreaterThan(0);
  await pressText(root, 'Continue');
  expect(root.findAll(node => textContent(node.props.children) === 'Choose an avatar to continue.').length).toBeGreaterThan(0);
  await chooseParentAvatar(root, 'dad2');
  await fill(root, 'Your name', 'Grace');
  await pressText(root, 'Continue');
  await pressLabel(root, 'Back in parent setup');
  expect(root.findByProps({ placeholder: 'Your name' }).props.value).toBe('Grace');
  await pressText(root, 'Continue');
  await pressLabel(root, 'Select WhatsApp country calling code');
  await fill(root, 'Search countries', 'United States');
  await pressText(root, '🇺🇸 United States · +1');
  await continueFromWhatsAppNumber(root);
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
  expect(root.findAll(node => textContent(node.props.children) === "Choose Rafiki's voice").length).toBeGreaterThan(0);
  expect(root.findAll(node => node.props.accessibilityLabel === 'Selected mascot on voice screen').length).toBeGreaterThan(0);
  await pressText(root, 'Preview voice');
  await pressText(root, 'Continue');
  expect(root.findAll(node => textContent(node.props.children) === 'Meet Rafiki').length).toBeGreaterThan(0);
  expect(root.findAll(node => node.props.accessibilityLabel === 'Selected Rafiki artwork').length).toBeGreaterThan(0);
  await pressLabel(root, 'Back in parent setup');
  expect(root.findAll(node => textContent(node.props.children) === "Choose Rafiki's voice").length).toBeGreaterThan(0);
  expect(root.findAll(node => node.props.accessibilityLabel === 'Selected mascot on voice screen').length).toBeGreaterThan(0);
  expect(root.findAll(node => node.props.accessibilityLabel === 'Preview Samora voice' && typeof node.props.onPress === 'function').length).toBe(1);
  expect(createAudioPlayer).toHaveBeenCalledWith(expect.anything(), { downloadFirst: true });
  const previewPlayer = (createAudioPlayer as jest.Mock).mock.results.at(-1)?.value;
  expect(previewPlayer.play).toHaveBeenCalledTimes(1);
  await pressText(root, 'Continue');
  expect(root.findAll(node => textContent(node.props.children) === 'Meet Rafiki').length).toBeGreaterThan(0);
  await pressText(root, 'Continue');
  expect(root.findAll(node => textContent(node.props.children) === 'Practise makes Perfect').length).toBeGreaterThan(0);
  await pressText(root, 'Continue');
  expect(root.findAll(node => textContent(node.props.children) === 'Amina, are you ready to make that commitment?').length).toBeGreaterThan(0);
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
  expect(root.findAll(node => textContent(node.props.children) === 'Signature saved').length).toBe(0);
  expect(root.findAll(node => textContent(node.props.children) === '✓ Signed by Amina').length).toBeGreaterThan(0);
  await pressText(root, 'Continue');
  expect(root.findAll(node => textContent(node.props.children) === 'Amina is ready to learn!').length).toBeGreaterThan(0);
  jest.useFakeTimers();
  await pressText(root, 'Continue');
  await act(async () => {
    jest.advanceTimersByTime(8_500);
  });
  jest.useRealTimers();
  expect(root.findAll(node => textContent(node.props.children) === 'Your Study Plan is Ready!').length).toBeGreaterThan(0);
  expect(root.findAll(node => node.props.accessibilityLabel === 'Ready mascot artwork').length).toBeGreaterThan(0);
  await pressText(root, 'Continue');
  expect(root.findAll(node => String(node.type) === 'Text' && textContent(node.props.children) === 'Save your family account').length).toBe(1);
  await pressLabel(root, 'Continue with Google');
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
    gender: 'male',
    signupMethod: 'google',
    whatsappNumber: '+1700123456',
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
  await chooseParentAvatar(root);
  await fill(root, 'Your name', 'Grace');
  await pressText(root, 'Continue');
  await continueFromWhatsAppNumber(root);
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
  await pressText(root, 'Preview voice');
  await pressText(root, 'Continue');
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
  expect(root.findAll(node => textContent(node.props.children) === "Now it’s Brian’s turn to select their Tutor").length).toBeGreaterThan(0);
});

test('scopes parent subjects to the selected grade band and clears subjects outside a changed grade', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(() => {
    renderer = ReactTestRenderer.create(
      <ParentHouseholdOnboardingScreen schools={schools} isSubmitting={false} collectSignupCredentials={false} onRoleChange={jest.fn()} onSubmit={jest.fn()} />,
    );
  });
  const root = renderer!.root;

  await pressText(root, 'English');
  await pressText(root, '👨‍👩‍👧 Parent');
  await chooseParentAvatar(root);
  await fill(root, 'Your name', 'Grace');
  await pressText(root, 'Continue');
  await continueFromWhatsAppNumber(root);
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

  await pressText(root, 'Grade 1');
  await pressText(root, 'Continue');
  await pressText(root, 'At Grade Level');
  expect(root.findAll(node => textContent(node.props.children) === 'Environmental').length).toBeGreaterThan(0);
  expect(root.findAll(node => textContent(node.props.children) === 'Biology').length).toBe(0);
  await pressText(root, 'Environmental');
  await pressText(root, 'Mathematics');
  await pressLabel(root, 'Back in parent setup');
  await pressLabel(root, 'Back in parent setup');

  await pressText(root, 'Grade 10');
  await pressText(root, 'Continue');
  await pressText(root, 'At Grade Level');
  expect(root.findAll(node => textContent(node.props.children) === 'Biology').length).toBeGreaterThan(0);
  expect(root.findAll(node => textContent(node.props.children) === 'Environmental').length).toBe(0);
  await pressText(root, 'Continue');
  expect(root.findAll(node => textContent(node.props.children) === 'Select at least one subject.').length).toBeGreaterThan(0);
});

test('uses stable subject ids for each parent grade band', () => {
  expect(parentOnboardingSubjectOptions('Grade 1')).toEqual(expect.arrayContaining([
    { id: 'environmental', name: 'Environmental' },
    { id: 'math', name: 'Mathematics' },
  ]));
  expect(parentOnboardingSubjectOptions('Grade 4')).toEqual(expect.arrayContaining([
    { id: 'cbc-science-technology', name: 'Science & Technology' },
    { id: 'math', name: 'Mathematics' },
  ]));
  expect(parentOnboardingSubjectOptions('Grade 7')).toEqual(expect.arrayContaining([
    { id: 'cbc-integrated-science', name: 'Integrated Science' },
    { id: 'math', name: 'Mathematics' },
  ]));
  expect(parentOnboardingSubjectOptions('Grade 10')).toEqual(expect.arrayContaining([
    { id: 'cbc-biology', name: 'Biology' },
    { id: 'math', name: 'Mathematics' },
  ]));
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
  await chooseParentAvatar(root);
  await fill(root, 'Your name', 'Grace');
  await pressText(root, 'Continue');
  await continueFromWhatsAppNumber(root);
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
