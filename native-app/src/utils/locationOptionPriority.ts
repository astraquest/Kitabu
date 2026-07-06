import { SchoolData } from '../types/app';

export function compareLabels(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

export function normalizeLocationName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\b(county|district|province|region|kenya|uganda|tanzania|rwanda|ethiopia)\b/g, '')
    .replace(/\s+city$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function locationsMatch(left: string, right: string) {
  return normalizeLocationName(left) === normalizeLocationName(right);
}

export function schoolEnrollmentForSort(school: SchoolData, grade?: string) {
  if (grade) {
    const gradeEnrollment = school.gradeCounts[grade];
    if (typeof gradeEnrollment === 'number') {
      return gradeEnrollment;
    }
  }

  return school.totalStudents;
}

export function prioritizeLocationsBySchoolCount(locations: string[], schools: SchoolData[]) {
  const schoolCountsByLocation = new Map<string, number>();

  schools.forEach(school => {
    const locationKey = normalizeLocationName(school.location);
    if (!locationKey) {
      return;
    }

    schoolCountsByLocation.set(locationKey, (schoolCountsByLocation.get(locationKey) ?? 0) + 1);
  });

  const topLocations = [...locations]
    .filter(location => (schoolCountsByLocation.get(normalizeLocationName(location)) ?? 0) > 0)
    .sort(
      (a, b) =>
        (schoolCountsByLocation.get(normalizeLocationName(b)) ?? 0) -
          (schoolCountsByLocation.get(normalizeLocationName(a)) ?? 0) ||
        compareLabels(a, b),
    )
    .slice(0, 5);
  const topLocationKeys = new Set(topLocations.map(normalizeLocationName));
  const remainingLocations = locations
    .filter(location => !topLocationKeys.has(normalizeLocationName(location)))
    .sort(compareLabels);

  return [...topLocations, ...remainingLocations];
}

export function prioritizeSchoolsByEnrollment(schoolOptions: SchoolData[], grade?: string) {
  const topSchools = [...schoolOptions]
    .filter(school => schoolEnrollmentForSort(school, grade) > 0)
    .sort(
      (a, b) =>
        schoolEnrollmentForSort(b, grade) - schoolEnrollmentForSort(a, grade) ||
        compareLabels(a.name, b.name),
    )
    .slice(0, 5);
  const topSchoolIds = new Set(topSchools.map(school => school.id));
  const remainingSchools = schoolOptions
    .filter(school => !topSchoolIds.has(school.id))
    .sort((a, b) => compareLabels(a.name, b.name));

  return [...topSchools, ...remainingSchools];
}
