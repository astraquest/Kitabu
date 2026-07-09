export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export const TERMS_OF_SERVICE_URL = 'https://app.kitabu.ai/terms';
export const PRIVACY_POLICY_URL = 'https://app.kitabu.ai/policy';
export const TERMS_VERSION = '2026-07';
export const PRIVACY_VERSION = '2026-07';

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
      'Data you give us can include account details such as name, email address and phone number; parent or guardian details for learners under 18; learner details such as grade, level, country and subjects; questions, prompts, notes and materials you enter; voice/audio recordings and transcripts when you use voice features; generated responses; in-app safety reports; subscription and transaction records; and enquiries, feedback and support messages.',
      'Payments, including M-Pesa checkout where available, are handled by third-party payment providers and recorded by ASTRA QUEST AI for subscription, support, tax, accounting, fraud-prevention, and refund-review purposes. We do not store full card or mobile-money numbers.',
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
      'You can delete your account and personal data at any time in the app, at https://app.kitabu.ai/deletion, or by emailing hello@kitabu.ai. For a child, the request should be made via the guardian.',
      'After we verify your request, we delete or anonymise account data within 30 days, except data we must keep by law, such as tax, accounting, transaction, fraud-prevention, security, or dispute records, which we keep only as long as required and then delete.',
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
      'If an AI answer or other generated content appears unsafe, inappropriate, harmful, or incorrect, you can report it inside the app. We use report details, the reported content, and relevant context to review and improve safety.',
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
      'Data controller: ASTRA QUEST AI. Address: Ouru Towers, 4th Floor, Room 402, Kisii, Kenya. Email hello@kitabu.ai. Phone +254 716 175 485. Website app.kitabu.ai. Last updated: 8 July 2026.',
    ],
  },
];

export const TERMS_OF_USE_SECTIONS: LegalSection[] = [
  {
    heading: 'General Provisions',
    paragraphs: [
      'The operator of the online platform and mobile application KITABU AI is ASTRA QUEST AI, of Ouru Towers, 4th Floor, Room 402, Kisii, Kenya, Business Registration No.: BN-KDS9Y72V.',
      'These General Terms and Conditions define the rights and obligations of the Platform Operator and users of services offered and provided by the Platform Operator, including the manner, price, content, and terms and conditions of business.',
      'ASTRA QUEST AI organises access to KITABU AI through web, Android, and iOS, allowing users to access learning and tutoring services across school and academic subjects using artificial intelligence.',
      'Use of the website, mobile applications, and online tools is considered consent to these General Terms and Conditions. Do not use the services if you do not agree to them.',
    ],
  },
  {
    heading: 'Definitions',
    paragraphs: [
      'User, Customer, You, and Your refer to natural and legal persons who access app.kitabu.ai or the KITABU AI applications, communicate with us through Platform contacts, and/or use our services, including persons who access or use the services on your behalf.',
      'Platform Operator or Operator means ASTRA QUEST AI, which is responsible for setting up and maintaining the Platform and billing for the services provided.',
      'Subscriber means a legal or natural person who enters into a subscription agreement or other agreement with the Operator. Subscription means the monthly or annual subscription value paid for use of KITABU AI Platform services.',
      'Registered User means someone who self-registers on the Platform and has access to the closed part of the portal. Unregistered User means a person who accesses the open part of the Platform anonymously and without a username and password.',
      'Price List means the detailed list by which the Operator determines the value of each subscription package and additional payable content. The Operator may supplement or amend the Price List at any time.',
      'Services means any activity performed by ASTRA QUEST AI for the subscriber. KITABU AI refers to the online tool where subscribers can ask questions and receive learning support and instruction based on artificial intelligence.',
      'Content or Digital Content means information, text, applications, videos, audio clips, data, design, and other materials made available on the Platform or otherwise provided by KITABU AI.',
    ],
  },
  {
    heading: 'Platform Operation',
    paragraphs: [
      'The Platform Operator maintains the Platform so that it is generally accessible 24 hours a day, every day of the year, but does not guarantee uninterrupted or error-free access.',
      'The Operator may interrupt access for maintenance, malfunctions, technical failures, internet service provider issues, or user equipment issues, and assumes no responsibility for those interruptions to the extent permitted by law.',
      'By using the Platform, you agree not to copy, reproduce, modify, distribute, or publicly display any Platform content without prior written permission.',
      'By using KITABU AI, users acknowledge that the tool is intended to support learning, and liability for errors or misunderstood content is excluded to the extent permitted by applicable law.',
    ],
  },
  {
    heading: 'Platform Content',
    paragraphs: [
      'The Platform Operator offers tutoring and learning assistance for learners from Grade 4 to Grade 12, approximately ages 9 to 18 or equivalent levels, in different countries.',
      'The Operator assumes no liability for the accuracy, completeness, or timeliness of information and data obtained through the conversational interface, the Platform, links, or other related websites.',
      'Users use Platform content at their own risk, and liability for inconvenience or damage caused by incorrect, incomplete, or otherwise inadequate information or services is excluded to the extent permitted by applicable law.',
    ],
  },
  {
    heading: 'KITABU AI Program',
    paragraphs: [
      'Registered users can access KITABU AI, which provides online learning and tutoring services using artificial intelligence.',
      'The Operator shall not be liable for the accuracy of answers provided by KITABU AI and, to the extent permitted by applicable law, shall be indemnified for inconvenience or damage caused by incorrect, incomplete, or otherwise inadequate information.',
      'Users understand that KITABU AI supports learning and that the quality of an answer depends to a large extent on the quality of the question asked.',
      'Monthly or annual subscribers may post questions and create study materials and exam preparations within the usage limits defined for their subscription plan. Usage limits are calculated based on associated costs and displayed in the user account.',
      'The Platform Operator may grant access within 24 hours after registration and may limit access to additional questions at any time if abuse is suspected.',
      'The user accepts full responsibility for notes and materials uploaded to the Platform, including responsibility for copyright infringement by uploaded material.',
    ],
  },
  {
    heading: 'Communication Network and Equipment',
    paragraphs: [
      'The user is responsible for providing appropriate equipment, including a computer or mobile device with a suitable internet connection and an appropriately installed web browser or application.',
      'The Operator advises users to install the latest software and updates and to use communication equipment that complies with safety regulations.',
      'The Operator is not liable for inconvenience or damage caused by problems accessing or using KITABU AI arising from inadequate equipment or improper equipment use.',
    ],
  },
  {
    heading: 'Protection of Personal Data',
    paragraphs: [
      'The Platform Operator commits to protecting personal data in accordance with Kenya\'s Data Protection Act, 2019 and its regulations. Collected data will not be transferred to third or unauthorised persons except as described in the Privacy Policy.',
      'The user is responsible for protecting their own data by ensuring the security of their username and password.',
      'For more information on personal data protection, refer to the Privacy Policy available at app.kitabu.ai/policy.',
    ],
  },
  {
    heading: 'Use of the Platform',
    paragraphs: [
      'A free registered user has access to limited usage per day, calculated based on associated costs and displayed in the user account.',
      'The scope of the free tier, features, subscription packages, contents, prices, credit packs, usage limits, and benefits are determined solely by the Platform Operator and may be introduced, changed, reduced, suspended, or withdrawn at any time without prior notice.',
      'A registered user must enter correct and true information during registration. After confirming and entering required data, the user becomes a registered user and is considered to have accepted these General Terms and Conditions.',
      'The unique password and email address must be kept confidential, may not be passed to third parties, and may not be used on multiple devices at the same time. If abuse is detected, the Operator may disable the email address and password without prior notification.',
      'If a registered user no longer wishes to receive notifications or be registered, the registered user must unsubscribe. An unregistered user accesses the open part of the portal anonymously and without registration.',
    ],
  },
  {
    heading: 'Subscription',
    paragraphs: [
      'The subscription relationship for use of KITABU AI is concluded with the Platform Operator.',
      'KITABU AI offers monthly or annual subscriptions and additional credit packs. Detailed information on services is available on the Platform, where services are continuously updated and upgraded.',
      'The subscription is concluded for one month or one year and automatically renews for successive equivalent periods unless the subscriber unsubscribes before the next scheduled payment date through the account or billing management options available for that platform.',
      'After unsubscribing, KITABU AI remains available for the remaining time already paid for until the end of the then-current subscription period. Unsubscribing does not entitle the subscriber to a refund for fees already paid or unused portions of a subscription period.',
      'The Platform Operator may cease maintenance of the Platform for business reasons and cease providing services to users. In such cases, it may unilaterally terminate the subscription contract and notify the subscriber.',
    ],
  },
  {
    heading: 'Subscription and Referral Programme',
    paragraphs: [
      'Some KITABU AI services are chargeable and billed in accordance with the price list. Subscription prices are determined by the valid price list and are usually paid monthly or annually.',
      'Existing free users and registered users may participate in the KITABU AI Referral Programme on the terms advertised by the Platform Operator until cancelled.',
      'Participants receive a unique referral link. Referrals are subject to verification, and the Platform Operator may disqualify fraudulent, duplicate, self-generated, or otherwise invalid referrals.',
      'The Platform Operator may modify, suspend, or terminate the Programme at any time without prior notice if required by changed technical, legal, or commercial circumstances.',
      'By participating, users consent to processing of personal data for Programme administration, eligibility verification, and prize delivery, in accordance with the Privacy Policy.',
    ],
  },
  {
    heading: 'No Refunds and No Guaranteed Results',
    paragraphs: [
      'All payments for subscriptions, credit packs, and other paid content are final. Once payment has been made it is non-refundable, and the subscriber is not entitled to any refund, credit, or set-off, including for unused subscription periods or credits, account suspension or termination due to breach, non-use, or dissatisfaction.',
      'The only exception is a payment charged in error, such as a duplicate charge or charge taken after valid cancellation. If the Operator verifies an erroneous charge, it will refund the erroneous amount within 30 days after verification. For M-Pesa payment support, cancellation, or refund review, contact hello@kitabu.ai.',
      'KITABU AI is a learning-support tool only. The Platform Operator does not guarantee any particular learning result, grade, mark, examination performance, KCSE performance, or academic outcome. Progress depends on factors outside the Operator\'s control, including learner effort, engagement, consistency, and circumstances.',
    ],
  },
  {
    heading: 'Limitation of Liability',
    paragraphs: [
      'KITABU AI services are provided as is. To the extent permitted by applicable law, the Platform Operator makes no warranties, conditions, or representations, express or implied, including as to performance, results, security, non-infringement, integration, uninterrupted use, features, expectations, satisfactory quality, or fitness for a particular purpose.',
      'The Platform Operator does not warrant that KITABU AI will operate smoothly or without errors, that defects will be rectified as soon as possible, or that KITABU AI will meet user needs or operate with hardware or software other than that specified by the Platform Operator.',
      'To the extent permitted by law, the Platform Operator disclaims liability for direct, incidental, special, consequential, business, profit, interruption, information, or economic losses arising out of use or operation of KITABU AI.',
      'The Platform Operator is not responsible for answers provided by KITABU AI, which only provides support for learning.',
    ],
  },
  {
    heading: 'Digital Content and Immediate Supply',
    paragraphs: [
      'The services consist of digital content and digital services supplied on an as is and as available basis. To the maximum extent permitted by applicable law, the Platform Operator does not warrant that digital content is free of errors or interruptions or that it will meet subscriber expectations or requirements.',
      'Subject only to rights and guarantees that cannot lawfully be excluded under Kenya\'s Consumer Protection Act, 2012 and other mandatory Kenyan law, all payments are non-refundable as set out in these Terms.',
      'Where digital content has a material defect reported within a reasonable time, the subscriber\'s sole and exclusive remedy is, at the Platform Operator\'s election, repair or re-supply of the affected digital content or restoration of access within a reasonable time.',
      'Access to digital content begins immediately upon successful registration and/or payment. By purchasing and accessing digital content, the subscriber requests immediate supply and acknowledges that, to the maximum extent permitted by law, any cooling-off or withdrawal right is lost once supply has begun.',
      'The Operator is not liable for failure, suspension, or interruption caused by electronic communications network failure, power failure, technical interruptions, maintenance, upgrades, software replacement, or force majeure.',
    ],
  },
  {
    heading: 'Copyright and Intellectual Property',
    paragraphs: [
      'The source code of KITABU AI and all Platform content, including logos, images, text, graphics, sound, and other intellectual property, is the exclusive property of the Platform Operator and is protected by intellectual property rights under Kenyan law.',
      'By installing, downloading, or using KITABU AI, the user acquires only a non-exclusive, non-transferable, time-limited right to use the Platform on their device and for non-commercial purposes.',
      'The user does not acquire intellectual property or other rights in the Platform beyond those provided by these General Terms and Conditions and may not copy, reverse engineer, modify, interfere with, lease, or sublicense the Platform.',
    ],
  },
  {
    heading: 'Minors, Guardian Consent and Indemnity',
    paragraphs: [
      'KITABU AI is intended for school learners aged approximately 9 to 18 years, broadly Grade 4 to Grade 12. The Platform is not intended for children under 9.',
      'Under Kenyan law, a person under 18 is a child. A child may only register for and use the Platform where a parent or legal guardian has reviewed and accepted these General Terms and Conditions and the Privacy Policy and consented to the child\'s use of the Platform and processing of the child\'s personal data.',
      'Where a child uses the Platform, the Guardian confirms authority to act on the child\'s behalf, accepts these Terms on their own behalf and on behalf of the child, is responsible for the child\'s use, and agrees to supervise and monitor the child\'s use.',
      'If the Platform Operator becomes aware that a child registered without verified Guardian consent, it may suspend or delete the account. A Guardian who believes their child used the Platform without consent should contact hello@kitabu.ai.',
      'To the maximum extent permitted by law, the user, and where the user is a child the responsible Guardian, agrees to indemnify, defend, and hold harmless the Platform Operator, ASTRA QUEST AI, and its directors, employees, contractors, and agents from claims connected with Platform use, breach of these Terms, submitted content, unauthorised or unsupervised account use, or violation of applicable law.',
    ],
  },
  {
    heading: 'Acceptable Use, AI Content and Moderation',
    paragraphs: [
      'The Platform uses generative artificial intelligence to produce learning support. AI-generated output may be inaccurate, incomplete, outdated, biased, or unexpected and must not be relied on as professional, medical, legal, financial, or other expert advice.',
      'The user must not use the Platform or submit, generate, upload, share, or attempt to obtain content that is unlawful, harmful, threatening, abusive, harassing, defamatory, obscene, hateful, discriminatory, sexually explicit, exploitative of children, violent, self-harm promoting, terrorist, weapons-related, illegal drug-related, infringing, unauthorised personal data, malware-related, disruptive, unauthorised access-related, or intended to bypass safety, content, or usage controls.',
      'The user is solely responsible for prompts, questions, instructions, materials, and use of any output. To the maximum extent permitted by law, the Platform Operator is not liable for user-submitted content or AI-generated output.',
      'The Platform Operator may use automated systems and human review to monitor and moderate content, and may filter, block, remove, or restrict content, investigate suspected violations, suspend or terminate access, and report unlawful content or activity to relevant authorities.',
      'Users may report inappropriate, harmful, unsafe, or objectionable content through the in-app reporting feature without leaving the app, or by contacting hello@kitabu.ai.',
    ],
  },
  {
    heading: 'Final Provisions',
    paragraphs: [
      'The Platform Operator may discontinue offering services or restrict access at any time, including where it considers that the user is in breach of these General Terms and Conditions.',
      'These General Terms and Conditions may be amended by the Platform Operator at any time to reflect changes to the services or Platform operation. Amendments are published on the Platform and enter into force on the date of publication.',
      'Whenever you wish to use the Platform, you should check these General Terms and Conditions. If you do not agree to changes, you may stop using the services. Continued use after changes are posted constitutes acceptance.',
      'The laws of Kenya apply to assessment and interpretation of these General Terms and Conditions and the rights and obligations of the parties, excluding conflict of laws rules.',
      'Any dispute relating to these General Terms and Conditions that cannot be resolved by negotiation shall be subject to the exclusive jurisdiction of the courts of Kenya.',
    ],
  },
  {
    heading: 'Contact',
    paragraphs: [
      'Operator: ASTRA QUEST AI. Address: Ouru Towers, 4th Floor, Room 402, Kisii, Kenya. Email hello@kitabu.ai. Phone +254 716 175 485. Website app.kitabu.ai. Last modified: 8 July 2026.',
    ],
  },
];
