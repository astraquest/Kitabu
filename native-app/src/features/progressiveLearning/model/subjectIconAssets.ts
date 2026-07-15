import type { ImageSourcePropType } from 'react-native';

const SUBJECT_ICON_SOURCES = {
  agriculture: require('../../../assets/subject-icons/agriculture-3d.png'),
  agriculture_nutrition: require('../../../assets/subject-icons/agriculture-nutrition-3d.png'),
  ai_education: require('../../../assets/subject-icons/ai-education-3d.png'),
  arabic: require('../../../assets/subject-icons/arabic-3d.png'),
  biology: require('../../../assets/subject-icons/biology-3d.png'),
  business_education: require('../../../assets/subject-icons/business-education-3d.png'),
  business_studies: require('../../../assets/subject-icons/business-studies-3d.png'),
  chemistry: require('../../../assets/subject-icons/chemistry-3d.png'),
  computer_studies: require('../../../assets/subject-icons/computer-studies-3d.png'),
  cre_ire_hre: require('../../../assets/subject-icons/cre-ire-hre-3d.png'),
  creative_arts: require('../../../assets/subject-icons/creative-arts-3d.png'),
  creative_arts_sports: require('../../../assets/subject-icons/creative-arts-sports-3d.png'),
  drawing_design: require('../../../assets/subject-icons/drawing-design-3d.png'),
  english: require('../../../assets/subject-icons/english-3d.png'),
  french: require('../../../assets/subject-icons/french-3d.png'),
  general_science: require('../../../assets/subject-icons/general-science-3d.png'),
  geography: require('../../../assets/subject-icons/geography-3d.png'),
  german: require('../../../assets/subject-icons/german-3d.png'),
  history_citizenship: require('../../../assets/subject-icons/history-citizenship-3d.png'),
  home_science: require('../../../assets/subject-icons/home-science-3d.png'),
  integrated_science: require('../../../assets/subject-icons/integrated-science-3d.png'),
  kiswahili: require('../../../assets/subject-icons/kiswahili-3d.png'),
  life_skills: require('../../../assets/subject-icons/life-skills-3d.png'),
  mandarin: require('../../../assets/subject-icons/mandarin-3d.png'),
  mathematics: require('../../../assets/subject-icons/mathematics-3d.png'),
  music: require('../../../assets/subject-icons/music-3d.png'),
  performing_arts: require('../../../assets/subject-icons/performing-arts-3d.png'),
  physics: require('../../../assets/subject-icons/physics-3d.png'),
  pre_technical_studies: require('../../../assets/subject-icons/pre-technical-studies-3d.png'),
  religious_education: require('../../../assets/subject-icons/religious-education-3d.png'),
  science_technology: require('../../../assets/subject-icons/science-technology-3d.png'),
  social_studies: require('../../../assets/subject-icons/social-studies-3d.png'),
  sports_science: require('../../../assets/subject-icons/sports-science-3d.png'),
  visual_arts: require('../../../assets/subject-icons/visual-arts-3d.png'),
} satisfies Record<string, ImageSourcePropType>;

export type SubjectIconKey = keyof typeof SUBJECT_ICON_SOURCES;

const SUBJECT_ICON_ALIASES: Record<string, SubjectIconKey> = {
  ai: 'ai_education',
  artificial_intelligence: 'ai_education',
  cre_ire_and_hre: 'cre_ire_hre',
  creative_arts_and_sports: 'creative_arts_sports',
  drawing_and_design: 'drawing_design',
  history_and_citizenship: 'history_citizenship',
  math: 'mathematics',
  maths: 'mathematics',
  pre_technical: 'pre_technical_studies',
  science: 'science_technology',
  science_and_technology: 'science_technology',
};

export const CURRICULUM_SUBJECT_ICON_KEYS = Object.freeze(
  Object.keys(SUBJECT_ICON_SOURCES) as SubjectIconKey[],
);

export function normalizeSubjectIconKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getSubjectIconSource(subjectIdOrName: string): ImageSourcePropType | null {
  const normalizedKey = normalizeSubjectIconKey(subjectIdOrName);
  const key = SUBJECT_ICON_ALIASES[normalizedKey] ?? normalizedKey;

  return SUBJECT_ICON_SOURCES[key as SubjectIconKey] ?? null;
}
