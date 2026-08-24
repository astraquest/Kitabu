import { filterCountyOptions } from '../src/utils/countySearch';

test('county search is local, trimmed, and case-insensitive', () => {
  const counties = ['Kisii', 'Kisumu', 'Nairobi'];
  expect(filterCountyOptions(counties, '  KIS  ')).toEqual(['Kisii', 'Kisumu']);
  expect(filterCountyOptions(counties, '')).toEqual(counties);
  expect(filterCountyOptions(counties, 'mara')).toEqual([]);
});
