import {
  PROFILE_INDEX_STORAGE_KEY,
  loadProfileIndex,
  normalizeProfileIndex,
  saveProfileIndex,
} from '../src/services/profileIndexService';
import { loadSecureJson, saveSecureJson } from '../src/services/storage';

jest.mock('../src/services/storage', () => ({
  loadSecureJson: jest.fn(),
  saveSecureJson: jest.fn(),
}));

const loadSecure = loadSecureJson as jest.Mock;
const saveSecure = saveSecureJson as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

test('normalizes and deduplicates profile metadata while dropping secrets', () => {
  const normalized = normalizeProfileIndex([
    {
      id: ' parent-1 ',
      displayName: ' Njeri Wambui ',
      role: 'parent',
      avatarKey: 'avatar-afro-girl',
      email: 'Njeri@Example.com',
      password: 'never-store-me',
      accessToken: 'secret-token',
    },
    {
      id: 'PARENT-1',
      displayName: 'Njeri Wambui Updated',
      role: 'parent',
      avatarKey: 'not-a-local-avatar',
    },
    {
      id: 'teacher-1',
      displayName: 'Teacher One',
      role: 'teacher',
      avatarKey: 'avatar-afro-boy',
    },
    { id: 'missing-name', role: 'student' },
  ]);

  expect(normalized).toEqual([
    {
      id: 'PARENT-1',
      displayName: 'Njeri Wambui Updated',
      role: 'parent',
      avatarKey: 'mum1',
    },
    {
      id: 'teacher-1',
      displayName: 'Teacher One',
      role: 'teacher',
      avatarKey: 'boy1',
    },
  ]);
  expect(JSON.stringify(normalized)).not.toContain('password');
  expect(JSON.stringify(normalized)).not.toContain('accessToken');
  expect(JSON.stringify(normalized)).not.toContain('secret-token');
});

test('loads and saves only the normalized secure profile index', async () => {
  loadSecure.mockResolvedValue([
    { id: 'student-1', displayName: ' Amani ', role: 'student', email: 'A@EXAMPLE.COM' },
  ]);
  saveSecure.mockResolvedValue(undefined);

  await expect(loadProfileIndex()).resolves.toEqual([
    {
      id: 'student-1',
      displayName: 'Amani',
      role: 'student',
      avatarKey: 'boy1',
      email: 'a@example.com',
    },
  ]);

  await expect(
    saveProfileIndex([
      {
        id: 'student-1',
        displayName: 'Amani',
        role: 'student',
        avatarKey: 'boy1',
        refreshToken: 'secret-token',
      },
    ]),
  ).resolves.toEqual([
    {
      id: 'student-1',
      displayName: 'Amani',
      role: 'student',
      avatarKey: 'boy1',
    },
  ]);
  expect(saveSecure).toHaveBeenCalledWith(PROFILE_INDEX_STORAGE_KEY, [
    {
      id: 'student-1',
      displayName: 'Amani',
      role: 'student',
      avatarKey: 'boy1',
    },
  ]);
});

test('storage failures are non-fatal', async () => {
  loadSecure.mockRejectedValue(new Error('storage unavailable'));
  saveSecure.mockRejectedValue(new Error('storage unavailable'));

  await expect(loadProfileIndex()).resolves.toEqual([]);
  await expect(saveProfileIndex([])).resolves.toEqual([]);
});
