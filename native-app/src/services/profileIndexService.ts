import type { AuthRole } from '../types/app';
import { LocalAvatarKey, normalizeLocalAvatarKey, selectAvatarKey } from '../components/AvatarArt';
import { loadSecureJson, saveSecureJson } from './storage';

export const PROFILE_INDEX_STORAGE_KEY = 'kitabu_profile_index';

export type ProfileIndexRole = Extract<AuthRole, 'student' | 'teacher' | 'parent' | 'other'>;

export interface LocalProfileIndexEntry {
  id: string;
  displayName: string;
  role: ProfileIndexRole;
  avatarKey: LocalAvatarKey;
  email?: string;
}

const PROFILE_INDEX_ROLES = new Set<ProfileIndexRole>([
  'student',
  'teacher',
  'parent',
  'other',
]);

function defaultAvatarForRole(role: ProfileIndexRole): LocalAvatarKey {
  return selectAvatarKey({
    role,
    // Profile-index metadata intentionally does not persist personal attributes.
    gender: 'not_specified',
  });
}

export function normalizeProfileIndex(value: unknown): LocalProfileIndexEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const entries = new Map<string, LocalProfileIndexEntry>();
  value.forEach(item => {
    if (!item || typeof item !== 'object') {
      return;
    }

    const candidate = item as Record<string, unknown>;
    const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
    const displayName =
      typeof candidate.displayName === 'string' ? candidate.displayName.trim() : '';
    const role = candidate.role;
    if (!id || !displayName || typeof role !== 'string' || !PROFILE_INDEX_ROLES.has(role as ProfileIndexRole)) {
      return;
    }

    const email = typeof candidate.email === 'string' ? candidate.email.trim().toLowerCase() : '';
    const entry: LocalProfileIndexEntry = {
      id,
      displayName,
      role: role as ProfileIndexRole,
      avatarKey:
        normalizeLocalAvatarKey(candidate.avatarKey as string) ??
        defaultAvatarForRole(role as ProfileIndexRole),
      ...(email ? { email } : {}),
    };
    entries.set(id.toLowerCase(), entry);
  });

  return Array.from(entries.values());
}

export async function loadProfileIndex(): Promise<LocalProfileIndexEntry[]> {
  try {
    const stored = await loadSecureJson<unknown>(PROFILE_INDEX_STORAGE_KEY, []);
    return normalizeProfileIndex(stored);
  } catch {
    return [];
  }
}

export async function saveProfileIndex(entries: unknown): Promise<LocalProfileIndexEntry[]> {
  const normalized = normalizeProfileIndex(entries);
  try {
    await saveSecureJson(PROFILE_INDEX_STORAGE_KEY, normalized);
  } catch {
    // Profile persistence is an enhancement and must not block auth or routing.
  }
  return normalized;
}

export async function upsertProfileIndexEntries(
  entries: LocalProfileIndexEntry[],
): Promise<LocalProfileIndexEntry[]> {
  const current = await loadProfileIndex();
  return saveProfileIndex([...current, ...entries]);
}
