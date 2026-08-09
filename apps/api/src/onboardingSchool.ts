const ONBOARDING_COUNTY_KEYS = new Set([
  'baringo', 'bomet', 'bungoma', 'busia', 'elgeyo-marakwet', 'embu', 'garissa',
  'homa bay', 'isiolo', 'kajiado', 'kakamega', 'kericho', 'kiambu', 'kilifi',
  'kirinyaga', 'kisii', 'kisumu', 'kitui', 'kwale', 'laikipia', 'lamu',
  'machakos', 'makueni', 'mandera', 'marsabit', 'meru', 'migori', 'mombasa',
  "murang'a", 'nairobi', 'nakuru', 'nandi', 'narok', 'nyandarua', 'nyamira', 'nyeri',
  'samburu', 'siaya', 'taita-taveta', 'tana river', 'tharaka-nithi', 'trans-nzoia',
  'turkana', 'uasin gishu', 'vihiga', 'wajir', 'west pokot'
]);

function collapseWhitespace(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function countyKey(value: string) {
  return collapseWhitespace(value)
    .toLowerCase()
    .replace(/\s+county$/i, '')
    .replace(/\s+city$/i, '')
    .trim();
}

export function isSupportedOnboardingCounty(value: string) {
  return ONBOARDING_COUNTY_KEYS.has(countyKey(value));
}

export function normalizeOnboardingSchoolInput(input: { name: string; county: string }) {
  const name = collapseWhitespace(input.name);
  const county = collapseWhitespace(input.county);
  return {
    name,
    county,
    identity: `${name.toLowerCase()}\u0000${county.toLowerCase()}`
  };
}
