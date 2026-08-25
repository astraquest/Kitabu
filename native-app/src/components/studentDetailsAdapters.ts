import { AdminPortalUser, StudentPerformance, UserProfile } from '../types/app';

export function studentPerformanceToModalUser(student: StudentPerformance): UserProfile {
  return {
    id: student.id,
    name: student.name,
    role: 'Student',
    grade: student.grade,
    email: undefined,
    gender: 'Not Specified',
    avatar: student.avatar,
    school: undefined,
    phone: '',
    dateJoined: '',
    lastSeen: student.lastActive,
    status: student.trend,
  };
}

export function adminPortalUserToModalUser(user: AdminPortalUser): UserProfile {
  return {
    id: user.id,
    name: user.name,
    role: 'Student',
    grade: user.grade,
    email: user.email,
    gender: 'Not Specified',
    school: user.school,
    phone: user.phone || '',
    dateJoined: user.createdAt || '',
    lastSeen: user.status === 'Online' ? 'Just now' : user.lastActive || '',
    status: user.status,
    adminAnalyticsEnabled: true,
  };
}
