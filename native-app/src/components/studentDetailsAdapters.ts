import { AdminPortalUser, StudentPerformance, UserProfile } from '../types/app';

function fallbackStudentEmail(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
  return `${slug || 'student'}@student.kitabu.ai`;
}

export function studentPerformanceToModalUser(student: StudentPerformance): UserProfile {
  return {
    id: student.id,
    name: student.name,
    role: 'Student',
    grade: student.grade,
    email: fallbackStudentEmail(student.name),
    gender: 'Not Specified',
    avatar: student.avatar,
    school: 'Greenwood High',
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
  };
}
