export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export const TERMS_OF_SERVICE_URL = 'https://kitabu.ai/terms';
export const PRIVACY_POLICY_URL = 'https://kitabu.ai/policy';
export const TERMS_VERSION = '2026-06';
export const PRIVACY_VERSION = '2026-06';

export const PRIVACY_POLICY_SECTIONS: LegalSection[] = [
  {
    heading: 'Who We Are',
    paragraphs: [
      'KITABU AI is a learning app (web, Android and iOS) operated by ASTRA QUEST AI, Ouru Towers, 4th Floor, Room 402, Kisii, Kenya (Business Registration No.: BN-KDS9Y72V). This Policy explains what personal data we collect when you use KITABU AI, why we collect it, and your rights.',
      'We handle personal data in line with Kenya\'s Data Protection Act, 2019 and its regulations. By using the Platform you confirm you have read this Policy. For privacy questions or requests, contact hello@kitabu.ai.',
    ],
  },
  {
    heading: 'Data We Collect',
    paragraphs: [
      'Data you give us can include account details such as name, email address and phone number; parent or guardian details for learners under 18; learner details such as grade, level, country and subjects; questions, prompts, notes and materials you enter; generated responses; subscription and transaction records; and enquiries, feedback and support messages.',
      'Payments are handled by third-party payment providers. We do not store full card or mobile-money numbers.',
      'When you use the Platform we collect device and usage data such as IP address, device and app or browser type, settings, app activity, diagnostic data and crash data, including through cookies and similar technologies. We use this to run, secure and improve the Platform. You are responsible for the accuracy of the data you enter.',
    ],
  },
  {
    heading: 'Why We Use Data',
    paragraphs: [
      'We use personal data to provide the service, including creating and managing accounts, delivering learning features, processing subscriptions and payments, and giving support.',
      'With consent, we may send optional updates or marketing, run referral or promotional activity, and process a child\'s data with guardian consent. Consent can be withdrawn at any time.',
      'We also use data for legitimate interests such as keeping the Platform secure, preventing fraud and abuse, fixing problems, improving features, and meeting legal obligations such as tax, accounting and lawful authority requests.',
    ],
  },
  {
    heading: 'Children',
    paragraphs: [
      'KITABU AI is intended for learners aged about 9 to 18, roughly Grade 4 to Grade 12, and is not intended for children under 9. Under the Act, anyone under 18 is a child.',
      'A learner under 18 may use the Platform only with the consent of a parent or guardian, who accepts this Policy and our Terms on the child\'s behalf and is responsible for the child\'s use.',
      'We do not knowingly collect personal data from a child under 18 without guardian consent. If you believe a child has used the Platform without consent, contact hello@kitabu.ai and we will review and, where appropriate, remove the account and data.',
    ],
  },
  {
    heading: 'Sharing, Storage and Transfer',
    paragraphs: [
      'We do not sell your personal data. We share it only as needed with service providers who help us run the Platform, where required or permitted by law, to protect safety and rights, or in a business transfer with appropriate safeguards.',
      'We and our providers may store and process data on servers inside or outside Kenya, including via cloud services. Where data is transferred outside Kenya, we take the steps required by the Act to keep it protected, such as appropriate contract terms, consent, or because the transfer is necessary to provide the service.',
    ],
  },
  {
    heading: 'Security and Retention',
    paragraphs: [
      'We use reasonable technical and organisational measures to protect personal data, and we limit access to people and providers who need it. No system can be completely secure, so keep your login details confidential and report suspicious activity promptly.',
      'We keep personal data only as long as needed for the purposes in this Policy, and for any period required by law, for example financial records. When data is no longer needed, we delete or anonymise it.',
    ],
  },
  {
    heading: 'Your Rights',
    paragraphs: [
      'Subject to the Act, you can ask what data we hold and get a copy; correct inaccurate data; ask us to delete data or restrict its use; object to certain processing or to direct marketing; ask for portability of data you gave us; and withdraw consent at any time.',
      'To exercise a right, contact hello@kitabu.ai. For a child, the guardian should make the request. We may ask you to verify your identity, and we may decline requests that are unfounded, excessive, or that we must refuse to comply with the law.',
    ],
  },
  {
    heading: 'Account and Data Deletion',
    paragraphs: [
      'You can delete your account and personal data at any time in the app, at kitabu.ai/deletion, or by emailing hello@kitabu.ai. For a child, the request should be made via the guardian.',
      'After we verify your request, we delete or anonymise your data within a reasonable time, except data we must keep by law, for example tax or transaction records, which we keep only as long as required and then delete.',
    ],
  },
  {
    heading: 'Cookies and Similar Technologies',
    paragraphs: [
      'We use cookies and similar technologies such as local storage and SDKs to keep you signed in, remember your preferences, keep the Platform secure, and understand and improve how it is used.',
      'Strictly necessary cookies are needed for sign-in, security and core functions and are always on. Functional cookies remember your settings and preferences. Analytics cookies help us see how the Platform is used so we can improve it, where required with your consent.',
      'You can accept, reject or delete cookies through your browser or device settings. Blocking some cookies may affect how the Platform works.',
    ],
  },
  {
    heading: 'AI Features',
    paragraphs: [
      'KITABU AI uses artificial intelligence to generate learning support based on what you submit. This helps with learning and is not a decision that has legal or similarly significant effects on you.',
      'We do not make decisions about you based solely on automated processing without a lawful basis under the Act.',
    ],
  },
  {
    heading: 'Links, International Users and Updates',
    paragraphs: [
      'The Platform may link to third-party websites or services we do not control. This Policy does not cover them, and we are not responsible for their content or privacy practices.',
      'We operate from Kenya. If another data protection law applies to you, you may have additional rights, including the right to complain to your local authority.',
      'We may update this Policy from time to time. We will post the updated version on the Platform, and changes take effect when posted.',
    ],
  },
  {
    heading: 'Complaints and Contact',
    paragraphs: [
      'If you have a concern, contact us first at hello@kitabu.ai. You also have the right to complain to the Office of the Data Protection Commissioner (ODPC), www.odpc.go.ke.',
      'Data controller: ASTRA QUEST AI. Address: Ouru Towers, 4th Floor, Room 402, Kisii, Kenya. Email hello@kitabu.ai. Phone +254 716 175 485. Website www.kitabu.ai. Last updated: 27 June 2026.',
    ],
  },
];

export const TERMS_OF_USE_SECTIONS: LegalSection[] = [
  {
    heading: 'Acceptance and Eligibility',
    paragraphs: [
      'By creating an account or using Kitabu AI, you agree to these Terms of Use. You must provide accurate information, use the service only for legitimate educational or administrative purposes, and be authorized to create and use the account.',
      'KITABU AI is operated by ASTRA QUEST AI, Ouru Towers, 4th Floor, Room 402, Kisii, Kenya (Business Registration No.: BN-KDS9Y72V).',
    ],
  },
  {
    heading: 'Accounts and Roles',
    paragraphs: [
      'You are responsible for protecting your login credentials. Students, teachers, school administrators, parents, and platform administrators may use only the features and data allowed by their assigned role and school relationships.',
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
      'Kitabu AI may provide AI-assisted responses, quizzes, or learning support. These outputs may be inaccurate or incomplete. Users, teachers, parents, and schools remain responsible for reviewing outputs where needed.',
    ],
  },
  {
    heading: 'Subscriptions and Payments',
    paragraphs: [
      'Some features require a paid subscription. Pricing, feature access, M-Pesa or other checkout availability, and AI-supported usage limits may change over time. If plan limits are exhausted, some features may be restricted, downgraded, or moved behind another available plan.',
      'Payments are handled by third-party payment providers, and we do not store full card or mobile-money credentials.',
    ],
  },
  {
    heading: 'Schools and Managed Accounts',
    paragraphs: [
      'Schools may manage learner, teacher, and administrator access where a school pilot or subscription is active. School users must use Kitabu AI only for approved educational and administrative work.',
    ],
  },
  {
    heading: 'Suspension, Termination, and Liability',
    paragraphs: [
      'We may suspend or terminate accounts where there is misuse, fraud, non-payment, or security risk. The service is provided on an as-is and as-available basis to the extent permitted by law. We do not guarantee uninterrupted service or perfectly accurate results.',
    ],
  },
  {
    heading: 'Privacy and Account Deletion',
    paragraphs: [
      'Our Privacy & Cookie Policy explains how we handle personal data, cookies, children, AI features, and data subject rights. It is available at kitabu.ai/policy.',
      'Eligible users can request account deletion from the in-app profile or at kitabu.ai/deletion.',
    ],
  },
  {
    heading: 'Contact',
    paragraphs: [
      'Questions, support requests, or legal notices may be sent to hello@kitabu.ai. Address: Ouru Towers, 4th Floor, Room 402, Kisii, Kenya. Phone +254 716 175 485. Website www.kitabu.ai.',
    ],
  },
];
