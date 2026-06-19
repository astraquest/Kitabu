import {
  AdminPortalUser,
  BannerAnnouncement,
  BillingPlan,
  DashboardBanner,
  SchoolData,
  SchoolDiscount,
} from '../types/app';
import { apiRequest } from './apiClient';

interface SchoolApiResponse {
  id: string;
  name: string;
  status?: string;
  location: string;
  principal?: string | null;
  phone?: string | null;
  email?: string | null;
  totalStudents: number;
  gradeCounts: Record<string, number>;
  pricing?: SchoolData['pricing'];
  pilot?: SchoolData['pilot'];
}

function mapSchool(school: SchoolApiResponse): SchoolData {
  return {
    id: school.id,
    name: school.name,
    status: school.status,
    location: school.location,
    principal: school.principal ?? undefined,
    phone: school.phone ?? undefined,
    email: school.email ?? undefined,
    totalStudents: school.totalStudents,
    gradeCounts: school.gradeCounts,
    pricing: school.pricing ?? undefined,
    pilot: school.pilot ?? undefined,
  };
}

function mapDiscount(discount: {
  id: string;
  name: string;
  type: 'percentage' | 'fixed_ksh';
  amount: number;
  is_active: boolean;
}): SchoolDiscount {
  return {
    id: discount.id,
    name: discount.name,
    type: discount.type,
    amount: discount.amount,
    isActive: discount.is_active,
  };
}

function mapAnnouncement(announcement: {
  id: string;
  title: string;
  message: string;
  cta_label?: string | null;
  cta_target: BannerAnnouncement['ctaTarget'];
  starts_at: string;
  ends_at?: string | null;
  is_active: boolean;
}): BannerAnnouncement {
  return {
    id: announcement.id,
    title: announcement.title,
    message: announcement.message,
    ctaLabel: announcement.cta_label ?? null,
    ctaTarget: announcement.cta_target,
    startsAt: announcement.starts_at,
    endsAt: announcement.ends_at ?? null,
    isActive: announcement.is_active,
  };
}

export async function getSchools() {
  const payload = await apiRequest<{ schools: SchoolApiResponse[] }>('/schools', {
    method: 'GET',
  });
  return payload.schools.map(mapSchool);
}

export async function getDashboardBanner() {
  return apiRequest<DashboardBanner>('/app/banner', {
    method: 'GET',
  });
}

export async function getAdminSchools() {
  const payload = await apiRequest<{ schools: SchoolApiResponse[] }>('/admin/schools', {
    method: 'GET',
  });
  return payload.schools.map(mapSchool);
}

export async function getAdminSubscriptionPlans() {
  const payload = await apiRequest<{ plans: BillingPlan[] }>('/admin/subscription-plans', {
    method: 'GET',
  });
  return payload.plans;
}

export async function getAdminUsers() {
  const payload = await apiRequest<{ users: AdminPortalUser[] }>('/admin/users', {
    method: 'GET',
  });
  return payload.users;
}

export async function createAdminSchool(input: {
  name: string;
  location: string;
  principal?: string | null;
  phone?: string | null;
  email?: string | null;
  assignedPlanCode: 'weekly' | 'monthly' | 'annual';
  discountId?: string | null;
}) {
  const payload = await apiRequest<{ school: SchoolApiResponse | null }>('/admin/schools', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.school ? mapSchool(payload.school) : null;
}

export async function updateAdminSchool(
  schoolId: string,
  input: {
    name: string;
    location: string;
    principal?: string | null;
    phone?: string | null;
    email?: string | null;
    assignedPlanCode: 'weekly' | 'monthly' | 'annual';
    discountId?: string | null;
  },
) {
  const payload = await apiRequest<{ school: SchoolApiResponse | null }>(`/admin/schools/${schoolId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return payload.school ? mapSchool(payload.school) : null;
}

export async function deleteAdminSchool(schoolId: string) {
  return apiRequest<{ deleted: boolean }>(`/admin/schools/${schoolId}`, {
    method: 'DELETE',
  });
}

export async function updateAdminSchoolPilot(
  schoolId: string,
  input: {
    status: 'not_enrolled' | 'onboarding' | 'active' | 'paused' | 'completed';
    startDate?: string | null;
    endDate?: string | null;
    targetStudents: number;
    onboardingStage: number;
    notes?: string | null;
  },
) {
  const payload = await apiRequest<{ school: SchoolApiResponse | null }>(
    `/admin/schools/${schoolId}/pilot`,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
  return payload.school ? mapSchool(payload.school) : null;
}

export async function getAdminDiscounts() {
  const payload = await apiRequest<{
    discounts: Array<{
      id: string;
      name: string;
      type: 'percentage' | 'fixed_ksh';
      amount: number;
      is_active: boolean;
    }>;
  }>('/admin/discounts', { method: 'GET' });

  return payload.discounts.map(mapDiscount);
}

export async function createAdminDiscount(input: {
  name: string;
  type: 'percentage' | 'fixed_ksh';
  amount: number;
  isActive: boolean;
}) {
  return apiRequest<{ discountId: string }>('/admin/discounts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateAdminDiscount(
  discountId: string,
  input: {
    name: string;
    type: 'percentage' | 'fixed_ksh';
    amount: number;
    isActive: boolean;
  },
) {
  return apiRequest<{ updated: boolean }>(`/admin/discounts/${discountId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteAdminDiscount(discountId: string) {
  return apiRequest<{ deleted: boolean }>(`/admin/discounts/${discountId}`, {
    method: 'DELETE',
  });
}

export async function getAdminAnnouncements() {
  const payload = await apiRequest<{
    announcements: Array<{
      id: string;
      title: string;
      message: string;
      cta_label?: string | null;
      cta_target: BannerAnnouncement['ctaTarget'];
      starts_at: string;
      ends_at?: string | null;
      is_active: boolean;
    }>;
  }>('/admin/announcements', { method: 'GET' });

  return payload.announcements.map(mapAnnouncement);
}

export async function createAdminAnnouncement(input: {
  title: string;
  message: string;
  ctaLabel?: string | null;
  ctaTarget: BannerAnnouncement['ctaTarget'];
  startsAt?: string;
  endsAt?: string | null;
  isActive: boolean;
}) {
  return apiRequest<{ announcementId: string }>('/admin/announcements', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateAdminAnnouncement(
  announcementId: string,
  input: {
    title: string;
    message: string;
    ctaLabel?: string | null;
    ctaTarget: BannerAnnouncement['ctaTarget'];
    startsAt?: string;
    endsAt?: string | null;
    isActive: boolean;
  },
) {
  return apiRequest<{ updated: boolean }>(`/admin/announcements/${announcementId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteAdminAnnouncement(announcementId: string) {
  return apiRequest<{ deleted: boolean }>(`/admin/announcements/${announcementId}`, {
    method: 'DELETE',
  });
}
