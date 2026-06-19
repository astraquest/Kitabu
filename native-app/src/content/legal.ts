export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export const TERMS_OF_SERVICE_URL = 'https://kitabu.ai/terms';
export const PRIVACY_POLICY_URL = 'https://kitabu.ai/privacy';
export const TERMS_VERSION = '2026-03';
export const PRIVACY_VERSION = '2026-03';

export const PRIVACY_POLICY_SECTIONS: LegalSection[] = [
  {
    heading: 'Overview',
    paragraphs: [
      'Kitabu AI provides educational software for students, teachers, school administrators, and platform administrators. We collect and use only the information reasonably needed to create accounts, deliver educational features, manage subscriptions, and keep the service secure.',
      'We do not sell personal data. Support and deletion requests can be sent to somakitabu254@gmail.com.',
    ],
  },
  {
    heading: 'Information We Collect',
    paragraphs: [
      'This can include your full name, email address, password hash, account role, school and class relationships, profile preferences, assignments, submissions, progress, quiz and game activity, subscription records, AI usage data, and security logs.',
    ],
  },
  {
    heading: 'How We Use Information',
    paragraphs: [
      'We use data to create and secure accounts, deliver learning content, enforce role-based access, support schools, measure AI usage against subscriptions, investigate misuse, and improve performance and reliability.',
    ],
  },
  {
    heading: 'Role-Based Access',
    paragraphs: [
      'Teachers can access only the classes and students linked to them. School administrators can access only their own school data. Platform administrators can access platform-wide operational data needed to run, support, and secure the service.',
    ],
  },
  {
    heading: 'AI Features',
    paragraphs: [
      'When AI-supported features are used, we may process prompts, relevant context, model metadata, token counts, estimated cost, and timestamps. AI output may be incomplete or inaccurate and should be reviewed where appropriate.',
    ],
  },
  {
    heading: 'Retention and Deletion',
    paragraphs: [
      'We keep data only for as long as reasonably necessary for service delivery, school operations, security, fraud prevention, and legal obligations. You may request account deletion and data deletion by emailing somakitabu254@gmail.com.',
    ],
  },
  {
    heading: 'Security and Contact',
    paragraphs: [
      'We use password hashing, token-based authentication, role-based access controls, and audit logging for sensitive actions. No system is perfectly secure, so users should protect their credentials and report suspicious activity promptly.',
      'Kitabu AI, Twin Towers Plaza 4th Floor Room 402. Phone 0716175485. Email somakitabu254@gmail.com.',
    ],
  },
];

export const TERMS_OF_USE_SECTIONS: LegalSection[] = [
  {
    heading: 'Acceptance and Eligibility',
    paragraphs: [
      'By creating an account or using Kitabu AI, you agree to these Terms of Use. You must provide accurate information, use the service only for legitimate educational or administrative purposes, and be authorized to create and use the account.',
    ],
  },
  {
    heading: 'Accounts and Roles',
    paragraphs: [
      'You are responsible for protecting your login credentials. Students, teachers, school administrators, and platform administrators may use only the features and data allowed by their assigned role and school relationships.',
    ],
  },
  {
    heading: 'Acceptable Use',
    paragraphs: [
      'You must not misuse the platform, bypass permissions, upload unlawful or harmful content, test security without authorization, interfere with service availability, or attempt to evade subscription or AI usage controls.',
    ],
  },
  {
    heading: 'AI and Educational Output',
    paragraphs: [
      'Kitabu AI may provide AI-assisted responses, quizzes, or learning support. These outputs may be inaccurate or incomplete. Users, teachers, and schools remain responsible for reviewing outputs where needed.',
    ],
  },
  {
    heading: 'Subscriptions and Limits',
    paragraphs: [
      'Some features require a paid subscription. Pricing, feature access, and AI-supported usage limits may change over time. If plan limits are exhausted, some features may be restricted, downgraded, or moved behind another available plan.',
    ],
  },
  {
    heading: 'Suspension, Termination, and Liability',
    paragraphs: [
      'We may suspend or terminate accounts where there is misuse, fraud, or security risk. The service is provided on an as-is and as-available basis to the extent permitted by law. We do not guarantee uninterrupted service or perfectly accurate results.',
    ],
  },
  {
    heading: 'Contact',
    paragraphs: [
      'Questions, support requests, and account deletion requests may be sent to somakitabu254@gmail.com. Kitabu AI is located at Twin Towers Plaza 4th Floor Room 402. Phone 0716175485.',
    ],
  },
];
