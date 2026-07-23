export type SupportedCountryCode = 'KEN' | 'UGA' | 'TZA' | 'RWA' | 'ETH';

export interface CurriculumScope {
  countryCode: SupportedCountryCode;
  countryName: string;
  curriculumCode: string;
}

const COUNTRY_SCOPE: Record<SupportedCountryCode, Omit<CurriculumScope, 'countryCode'>> = {
  KEN: { countryName: 'Kenya', curriculumCode: 'CBC' },
  UGA: { countryName: 'Uganda', curriculumCode: 'NCDC' },
  TZA: { countryName: 'Tanzania', curriculumCode: 'TIE-BASIC' },
  RWA: { countryName: 'Rwanda', curriculumCode: 'REB-CBC' },
  ETH: { countryName: 'Ethiopia', curriculumCode: 'ENC' }
};

const COUNTRY_ALIASES: Record<string, SupportedCountryCode> = {
  KE: 'KEN',
  KEN: 'KEN',
  KENYA: 'KEN',
  UG: 'UGA',
  UGA: 'UGA',
  UGANDA: 'UGA',
  TZ: 'TZA',
  TZA: 'TZA',
  TANZANIA: 'TZA',
  RW: 'RWA',
  RWA: 'RWA',
  RWANDA: 'RWA',
  ET: 'ETH',
  ETH: 'ETH',
  ETHIOPIA: 'ETH'
};

export function normalizeCountryCode(value?: string | null): SupportedCountryCode {
  const normalized = value?.trim().toUpperCase() ?? '';
  return COUNTRY_ALIASES[normalized] ?? 'KEN';
}

export function resolveCurriculumScope(input?: {
  countryCode?: string | null;
  curriculumCode?: string | null;
}): CurriculumScope {
  const countryCode = normalizeCountryCode(input?.countryCode);
  const country = COUNTRY_SCOPE[countryCode];

  return {
    countryCode,
    countryName: country.countryName,
    // Each currently supported country has one canonical curriculum. Do not accept a
    // mismatched client label as an authorization boundary or database partition key.
    curriculumCode: country.curriculumCode
  };
}

export function isKenyaCbcScope(scope: CurriculumScope) {
  return scope.countryCode === 'KEN' && scope.curriculumCode === 'CBC';
}
