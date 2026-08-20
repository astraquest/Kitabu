/*
 * Google libphonenumber PhoneNumberMetadata.xml mobile possibleLengths
 * (national significant number, excluding country and trunk prefixes).
 * Territories without a mobile block use their general possible lengths.
 */
const L4 = [4] as const;
const L5 = [5] as const;
const L6 = [6] as const;
const L7 = [7] as const;
const L8 = [8] as const;
const L9 = [9] as const;
const L10 = [10] as const;
const L11 = [11] as const;
const L6_9 = [6, 9] as const;
const L7_8 = [7, 8] as const;
const L8_9 = [8, 9] as const;
const L8_10 = [8, 10] as const;
const L9_10 = [9, 10] as const;
const L10_11 = [10, 11] as const;

export const WHATSAPP_MOBILE_NSN_LENGTHS: Readonly<Record<string, readonly number[]>> = {
  AF: L9, AL: L9, DZ: L9, AS: L10, AD: L6_9, AO: L9, AI: L10, AQ: L6, AG: L10, AR: L10,
  AM: L8, AW: L7, AC: L5, AU: L9, AT: L10, AZ: L9, BS: L10, BH: L8, BD: L10, BB: L10,
  BY: L9, BE: L9, BZ: L7, BJ: L8, BM: L10, BT: L8, BO: L8, BQ: L7, BA: L8, BW: L8,
  BR: L11, IO: L7, VG: L10, BN: L7_8, BG: L9, BF: L8, BI: L8, CV: L7, KH: L8_9, CM: L9,
  CA: L10, KY: L10, CF: L8, TD: L8, CL: L9, CN: L11, CX: L9, CC: L6, CO: L10, KM: L7,
  CG: L9, CK: L5, CR: L8, CI: L10, HR: L9, CU: L8, CW: L7, CY: L8, CZ: L9, CD: L9,
  DK: L8, DJ: L8, DM: L10, DO: L10, EC: L9, EG: L10, SV: L8, GQ: L9, ER: L7, EE: L8,
  SZ: L8, ET: L9, FK: L5, FO: L6, FJ: L7, FI: L9, FR: L9, GF: L9, PF: L6, TF: L6,
  GA: L8_9, GM: L7, GE: L9, DE: L10_11, GH: L9, GI: L8, GR: L10, GL: L6, GD: L10, GP: L9,
  GU: L10, GT: L8, GG: L10, GN: L9, GW: L9, GY: L7, HT: L8, HN: L8, HK: L8, HU: L9,
  IS: L7, IN: L10, ID: L10_11, IR: L10, IQ: L10, IE: L9, IM: L10, IL: L9, IT: L9_10, JM: L10,
  JP: L10, JE: L10, JO: L9, KZ: L10, KE: L9, KI: L5, XK: L8, KW: L8, KG: L9, LA: L10,
  LV: L8, LB: L8, LS: L8, LR: L7, LY: L9, LI: L9, LT: L8, LU: L9, MO: L8, MG: L9,
  MW: L9, MY: L9_10, MV: L7, ML: L8, MT: L8, MH: L7, MQ: L9, MR: L8, MU: L8, YT: L9,
  MX: L10, FM: L7, MD: L8, MC: L8_9, MN: L8, ME: L8, MS: L10, MA: L9, MZ: L9, MM: L8_10,
  NA: L9, NR: L7, NP: L10, NL: L9, NC: L6, NZ: L9, NI: L8, NE: L8, NG: L10_11, NU: L4,
  KP: L10_11, MK: L8, MP: L10, NO: L8, OM: L8, PK: L10, PW: L7, PS: L9, PA: L8, PG: L8,
  PY: L9, PE: L9, PH: L10, PN: L4, PL: L9, PT: L9, PR: L10, QA: L8, RE: L9, RO: L9,
  RU: L10, RW: L9, BL: L10, SH: L5, KN: L10, LC: L10, MF: L10, PM: L6, VC: L10, WS: L7,
  SM: L10, ST: L7, SA: L9, SN: L9, RS: L8_9, SC: L7, SL: L8, SG: L8, SX: L10, SK: L9,
  SI: L8, SB: L7, SO: L8, ZA: L9, GS: L5, KR: L10_11, SS: L9, ES: L9, LK: L9, SD: L9,
  SR: L7, SJ: L8, SE: L9, CH: L9, SY: L9, TW: L9_10, TJ: L9, TZ: L9, TH: L9_10, TL: L8,
  TG: L8, TK: L4, TO: L5, TT: L10, TN: L8, TR: L10, TM: L8, TC: L10, TV: L5, UG: L9,
  UA: L9, AE: L9, GB: L10, US: L10, VI: L10, UY: L8, UZ: L9, VU: L7, VA: L6, VE: L10,
  VN: L9_10, WF: L6, YE: L9, ZM: L9, ZW: L9,
};
