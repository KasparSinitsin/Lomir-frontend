import { Link } from "react-router-dom";
import { mailLink } from "./shared";

/**
 * The English legal texts. Same shape as de.jsx, checked by
 * `npm run legal:check` - see scripts/legal-parity.mjs.
 *
 * ⚠️ Binding text, not UI copy, and a TRANSLATION: the German version in
 * de.jsx is authoritative (terms §14). Change German first, then translate
 * it here, in the same commit, and update LEGAL_UPDATED in ./shared.jsx.
 */

const contactLink = (
  <Link to="/contact" className="link link-primary">
    contact page
  </Link>
);

// The legal notice names the contact form as the second, quick means of contact next to the e-mail address
// (DDG § 5 Abs. 1 Nr. 2). It is open to visitors without an account.
const contactFormLink = (
  <Link to="/contact" className="link link-primary">
    Contact form
  </Link>
);

const privacyLink = (
  <Link to="/privacy" className="link link-primary">
    Privacy Policy
  </Link>
);

const content = {
  about: {
    title: "About Lomir",
    intro:
      "Lomir is a free team-matching app for people who want to find collaborators, form teams, and exchange messages around shared interests, focus areas, badges, roles, and location preferences.",
    sections: [
      {
        title: "Project Status",
        paragraphs: [
          "Lomir is currently operated as a non-commercial portfolio and learning project. The app is designed with privacy-by-default settings: new profiles stay private until users actively make them public.",
          "The app may evolve as the project develops. If material features change, we review and update the legal and privacy information before the changes take effect.",
        ],
      },
      {
        title: "Contact",
        paragraphs: [
          <>Questions about Lomir can be sent through the {contactLink} or by email to {mailLink}.</>,
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    intro:
      "This Privacy Policy explains how Lomir processes personal data. It is written for an app based in Germany and aligned with the GDPR, the German Federal Data Protection Act, and German rules on technically necessary browser storage under the TDDDG.",
    sections: [
      {
        title: "1. Controller",
        paragraphs: [
          "The controller responsible for data processing at Lomir is:",
          <>
            Julia Baur
            <br />
            Walpodenstraße 16
            <br />
            55116 Mainz
            <br />
            Germany
            <br />
            Email: {mailLink}
          </>,
          "No data protection officer has been appointed because this is currently not legally required for the project.",
        ],
      },
      {
        title: "2. What Is Lomir?",
        paragraphs: [
          "Lomir helps users find people, teams, and open roles based on profile information, focus areas, badges, location preferences, and team membership. The app also provides direct and team chat, file sharing, notifications, contact forms, and account management.",
          "Profiles are private by default. Public profile information is only shown in public search results and profile views when a user actively changes their profile status to public.",
        ],
      },
      {
        title: "3. Minimum Age",
        paragraphs: [
          "Lomir is not intended for users under 16. During registration, you must separately confirm that you are at least 16 years old.",
          <>Lomir does not knowingly collect personal data from users under 16. If you believe that a person under 16 has created an account, please contact us at {mailLink} so we can review the account and delete it where appropriate.</>,
        ],
      },
      {
        title: "4. Data We Process",
        items: [
          "Account data: username, email address, password hash, email verification status, timestamps, and account settings.",
          "Legal acknowledgement data: timestamps and document versions for accepted Terms of Service, the acknowledged Privacy Policy, and the separate confirmation that you are at least 16 years old.",
          "Profile data: optional first and last name, bio, avatar, focus areas, badges, optional location details such as postal code, city, district, state, and country, and the public/private visibility status.",
          "Team and role data: team names, descriptions, avatars, members, roles, applications, invitations, and team location preferences.",
          "Messages and notifications: direct messages, team messages, mentions, typing/read indicators, system messages, notification records, and message metadata.",
          "Uploads: profile avatars, team avatars, chat images, chat files, and contact form attachments.",
          "Location data: postal code, city, district, state, country, and coordinates derived from the location data you provide. Lomir does not ask for a street address. Postal code and other location details are used as approximate location information for search, distance-based matching, recommendations, and profile/team/role location display. Depending on visibility settings and context, postal code, city, district, state, or country may be visible to other users. Public search results and map views show rounded approximate coordinates, not exact stored coordinates.",
          "Contact and report data: name, email address, subject, message, optional contact form attachments, report reference IDs, report status, email-forwarding status, and attachment metadata for abuse or illegal-content reports.",
          "Security and technical data: IP-related request data handled by hosting providers, browser and device metadata in server logs, rate-limit data, CAPTCHA verification data, session and authentication data, and browser storage needed for the app to work.",
        ],
      },
      {
        title: "5. Sources of Data",
        paragraphs: [
          "Most personal data processed by Lomir is provided directly by you, for example during registration, profile editing, team creation, sending messages, applications, invitations, uploads, or contact requests.",
          "Some data may be generated by the app or provided by other users in the course of collaboration, for example team membership records, invitations, applications, badge awards, messages, mentions, notifications, ownership transfers, and system messages.",
          "Location details may be derived from the postal code, city, district, state, or country you provide, using OpenStreetMap/Nominatim.",
        ],
      },
      {
        title: "6. Purposes and Legal Bases",
        items: [
          "Account creation, login, profile management, optional location-based matching, team matching, chat, notifications, and app operation: Art. 6(1)(b) GDPR.",
          "Accepting the terms, acknowledging the privacy policy, and documenting both: Art. 6(1)(b) and Art. 6(1)(f) GDPR.",
          "Confirming the minimum age: Art. 6(1)(c) in conjunction with Art. 8 GDPR, and Art. 6(1)(f) GDPR.",
          "Public profile visibility and optional profile content that users publish (including optional approximate location details): Art. 6(1)(a) GDPR and, where relevant, Art. 6(1)(b) GDPR.",
          "Security, abuse prevention, rate limiting, CAPTCHA checks, fraud prevention, debugging, and service reliability: Art. 6(1)(f) GDPR.",
          "Contact requests and support communication: Art. 6(1)(b) GDPR where the request relates to an account or a potential account, otherwise Art. 6(1)(f) GDPR.",
          "Legal compliance and preservation of evidence where required: Art. 6(1)(c) and Art. 6(1)(f) GDPR.",
          "Showing the map view and resolving location information via OpenStreetMap: Art. 6(1)(b) GDPR, as far as you use the feature, and Art. 6(1)(f) GDPR.",
          "Keeping team messages and awarded badges after an account deletion, with the name replaced: Art. 6(1)(f) GDPR.",
        ],
      },
      {
        title: "7. Legitimate Interests",
        blocks: [
          {
            paragraph:
              "Where Lomir relies on Art. 6(1)(f) GDPR, the legitimate interests are:",
          },
          {
            list: [
              "operating a secure and reliable app,",
              "preventing abuse and spam,",
              "protecting users and the service,",
              "debugging errors,",
              "enforcing the rules,",
              "preserving evidence where needed,",
              "responding to support requests,",
              "showing search results on a map,",
              "keeping team conversations and awards understandable for the remaining members,",
              "defending or asserting legal claims.",
            ],
          },
        ],
      },
      {
        title: "8. Required and Optional Data",
        paragraphs: [
          "There is no statutory requirement to create a Lomir account. Account data, legal acknowledgements, age confirmation, and security-related data are, however, necessary to create and manage an account and to enter into or perform the user agreement. Without this data, Lomir cannot provide an account.",
          "Profile details, avatars, focus areas, teams, roles, applications, messages, uploads, and location details are generally provided voluntarily. Some of them are, however, necessary for the respective feature. If optional data is not provided, the related feature may be unavailable or less useful.",
          "Location fields such as postal code, city, and country are optional. You may leave them empty or remove them later in your profile settings. Without location data, nearby search, distance-based matching, and location-based recommendations may be less precise or unavailable.",
        ],
      },
      {
        title: "9. Public Visibility",
        paragraphs: [
          "Lomir is designed so that users do not unintentionally publish profile details. New accounts remain private after email verification unless you change the setting.",
          "If your profile is public, other users may see profile details such as username, name, bio, avatar, focus areas, badges, and approximate location details you have added. Approximate location details may include postal code, city, district, state, or country.",
          "If your profile is private, it is not shown in public search results or profile views. Team members and conversation participants may still see information needed for team collaboration, messaging, applications, invitations, badge context, and safety-related system messages.",
          "You can change your profile visibility in settings. Turning your profile private only affects future public visibility. Information other users have already seen, or data contained in team/chat context, is not removed by it.",
        ],
      },
      {
        title: "10. Recipients and Disclosure",
        items: [
          "Other Lomir users may receive personal data where the app feature requires it, for example public profile views, search results, team pages, applications, invitations, messages, badge context, and notifications.",
          "Team members, team owners, invitees, applicants, and conversation participants may receive information needed for the relevant collaboration context.",
          "The Lomir project operators may access personal data where this is necessary to operate the app, provide support, investigate abuse, fix errors, maintain security, or comply with legal obligations.",
          "Hosting, database, upload, email, CAPTCHA, geocoding, map, and infrastructure providers process personal data where needed to provide the app. Depending on the provider and context, they act either as processors on Lomir's behalf or as independent providers under their own privacy terms.",
          "Email providers may process email addresses, message content, email metadata, verification emails, password reset emails, and contact form messages (including attachments) where email delivery or support communication requires this.",
          "To resolve location information, the Lomir backend queries OpenStreetMap/Nominatim; the location query is sent, not your IP address. When you open the map view, your browser loads map tiles directly from OpenStreetMap; OpenStreetMap then receives your IP address, browser and device data, and request metadata.",
          "Authorities, courts, legal advisers, or other third parties may receive data where disclosure is legally required or necessary to protect rights, security, users, or the service.",
        ],
      },
      {
        title: "11. Matching, Recommendations, and Automated Decisions",
        paragraphs: [
          "Lomir calculates match and overlap scores from tags, badges, and distance information to sort or recommend people, teams, and roles. The logic compares shared focus areas, badge context, role information, and approximate distances (where available). Postal code, city, district, state, country, and derived coordinates may be used to calculate approximate distances.",
          "These scores are assistance features only. Lomir does not use automated decision-making that produces legal effects or similarly significant effects within the meaning of Art. 22 GDPR.",
        ],
      },
      {
        title: "12. Browser Storage, Cookies, and Similar Technologies",
        paragraphs: [
          "Lomir uses a technically necessary, httpOnly session cookie to keep you signed in after login. This cookie contains session authentication data, is not readable by JavaScript, and is sent to the Lomir backend to authenticate your requests and real-time chat connections. Lomir also uses technically necessary browser storage such as sessionStorage, for example for in-app notification state, and short-lived localStorage entries, for example for a notice after registration that is removed when the next page opens.",
          "This cookie and the storage are strictly necessary to provide authentication, API access, real-time chat, and notification features, and therefore do not require consent under Section 25(2) TDDDG. Lomir does not currently use advertising cookies, marketing trackers, or third-party analytics tools.",
          "Lomir uses Cloudflare Turnstile for registration and the contact form. Cloudflare processes technical data to verify that a request comes from a human. This is used for abuse prevention.",
        ],
      },
      {
        title: "13. Third-Party Services",
        items: [
          "Vercel hosts and delivers the frontend and routes the app's API and real-time requests to the backend (so that the frontend and backend share one address). Vercel may therefore process IP addresses, browser and device data, request and API metadata, session authentication data in transit, deployment data, and technical logs needed to deliver, route, and secure the app.",
          "Render hosts the backend API. Render may process IP addresses, browser and device data, API request metadata, server logs, error information, and data sent to or received from the backend.",
          "Neon, now part of Databricks, provides the PostgreSQL database. App data stored in the database may include account data, profile data, team and role data, messages, notifications, legal acknowledgement records, location data, and related metadata.",
          "ImageKit stores, transforms, optimizes, and delivers uploaded media and files, including profile avatars, team avatars, chat images, chat files, and related delivery logs or metadata.",
          "Brevo (operated by Sendinblue SAS, France) is used to send the app's transactional emails — for example account verification, password reset, account-change notifications, and contact form and abuse or illegal-content report messages. Brevo may process email addresses, email content, email metadata, and contact form attachments as part of email delivery. Contact form and report messages are additionally received in the Lomir operators' Google/Gmail mailbox; Google may process that email content and metadata as the mailbox operator.",
          "Cloudflare Turnstile is used for CAPTCHA checks on registration and in the contact form. Cloudflare may process technical data such as IP address, browser and device information, challenge data, and verification tokens to detect abuse and confirm that a request is likely made by a human.",
          "OpenStreetMap/Nominatim is used through the Lomir backend to resolve location information provided by users, such as postal code, city, district, state, or country. When you open the map view, your browser loads map tiles directly from the OpenStreetMap tile servers, which then receive your IP address, browser and device data, and request metadata.",
        ],
      },
      {
        title: "14. International Transfers",
        blocks: [
          {
            paragraph:
              "Some providers are established outside the European Economic Area or may process data in the United States, the United Kingdom, India, or other countries, especially where infrastructure, support, security, email delivery, content delivery, or global network services are provided internationally.",
          },
          {
            paragraph:
              "Where personal data is transferred to a country for which there is no EU adequacy decision, Lomir relies on the available transfer mechanisms and safeguards offered by the relevant provider. These may include:",
          },
          {
            list: [
              "the EU-US Data Privacy Framework,",
              "the UK Extension to the EU-US Data Privacy Framework,",
              "the Swiss-US Data Privacy Framework,",
              "EU Standard Contractual Clauses,",
              "data processing agreements,",
              "supplementary technical and organizational measures.",
            ],
          },
          {
            paragraph:
              "Vercel, Render, Databricks/Neon, Cloudflare, Brevo, and ImageKit publish information about data processing, transfer safeguards, or subprocessors in their legal or trust documentation. Brevo, which handles email delivery, is established in the EU. Google/Gmail and OpenStreetMap-related services process data under their own privacy terms where they act as independent providers or operators of public infrastructure.",
          },
          {
            paragraph: (
              <>Users may contact Lomir at {mailLink} to request more information about the safeguards relevant to a specific provider.</>
            ),
          },
        ],
      },
      {
        title: "15. Storage Periods",
        items: [
          "Account and profile data are stored while the account exists. When you delete your account, your profile, the badges awarded to you, your team memberships, applications and invitations, and all direct messages you are involved in are deleted immediately after confirmation. Your messages in team chats and the badges you awarded to others remain; your name is replaced there by \"Former Lomir User\".",
          "When a team whose only member is its owner is deleted, the team, its chat, invitations, applications, badges, notifications, and team avatar are deleted immediately. When a team with other members is deleted, it is archived first so the remaining members can see the deletion notice and read the team history. It is permanently deleted when the last member leaves the team or after the configured archive period, currently 14 days by default.",
          "Legal acknowledgement records are stored while the account exists and are deleted with it.",
          "Unverified accounts are scheduled for deletion after the verification link expires, with a buffer of one hour. Cleanup runs periodically and once at server start.",
          "Password reset tokens expire after one hour and are deleted by the scheduled cleanup.",
          "Chat file and image uploads expire after 60 days and are removed by the scheduled cleanup where possible. Message records may remain with deleted file references.",
          "Avatars and team avatars are stored until they are replaced, removed, or deleted with the respective account or team, where technically possible.",
          "Contact form messages, abuse or illegal-content reports, report status records, and related emails are kept as long as needed to answer the request, review the report, document the handling process, and, where necessary, comply with legal obligations or defend claims.",
          "Technical logs are kept only as long as needed for security, troubleshooting, and hosting operations, depending on the settings of the respective provider.",
        ],
      },
      {
        title: "16. Account Deletion",
        paragraphs: [
          <>You can delete your account from within the app. After confirmation, your account and all direct messages you are involved in are deleted immediately, also for the other person. Messages you wrote in team chats and badges you awarded to others remain, so that conversations and awards stay understandable for the others. Your name is replaced there by "Former Lomir User", as it is in system messages, for example about ownership transfers or roles. If you want to remove individual team messages, you can delete them in the chat before deleting your account, or ask us later through the {contactLink}.</>,
          <>Mentions with @ then show "Former Lomir User" instead of your name. What other users have written freely in their messages stays unchanged, even if your name appears in it. If you would like such a passage removed, please contact us through the {contactLink}.</>,
          "Uploaded avatars are deleted from ImageKit on a best-effort basis after successful account deletion.",
        ],
      },
      {
        title: "17. Your Rights",
        blocks: [
          {
            paragraph: (
              <>You can contact Lomir at {mailLink} to exercise the following rights:</>
            ),
          },
          {
            list: [
              "access to the data stored about you,",
              "rectification of inaccurate data,",
              "erasure of your data,",
              "restriction of processing,",
              "data portability,",
              "objection to processing based on legitimate interests,",
              "withdrawal of a consent you have given, with effect for the future.",
            ],
          },
          {
            paragraph:
              "Withdrawing consent does not affect the lawfulness of the processing carried out on the basis of that consent before the withdrawal. For example: you can later turn a public profile private, but this does not undo the visibility that already existed before the change.",
          },
          {
            paragraph: (
              <><strong>Right to object:</strong> Where we process data on the basis of legitimate interests (Art. 6(1)(f) GDPR), you can object at any time on grounds relating to your particular situation (Art. 21 GDPR). We will then no longer process the data unless we can demonstrate compelling legitimate grounds that override your interests, or the processing serves the establishment, exercise, or defence of legal claims.</>
            ),
          },
          {
            paragraph:
              "You also have the right to lodge a complaint with a data protection supervisory authority. In Rhineland-Palatinate (Rheinland-Pfalz), this is the Landesbeauftragter für den Datenschutz und die Informationsfreiheit Rheinland-Pfalz. You may also contact another competent supervisory authority.",
          },
        ],
      },
      {
        title: "18. Sensitive Data",
        paragraphs: [
          "Please do not enter special categories of personal data, confidential information, or third-party secrets into your profile, teams, messages, uploads, or the contact form unless it is absolutely necessary and you have the right to share that data.",
        ],
      },
      {
        title: "19. Updates and Further Processing",
        paragraphs: [
          "This Privacy Policy may be updated when Lomir, the providers, or the legal requirements change. We publish material updates before they apply to new processing activities.",
          "If Lomir intends to process personal data for a new purpose that is not compatible with the purpose for which the data was collected, users will be informed before that further processing where legally required.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    intro:
      "These Terms of Service govern the use of Lomir. By creating an account or using the app, you agree to these terms.",
    sections: [
      {
        title: "1. Provider",
        paragraphs: [
          <>Lomir is provided by Julia Baur, Walpodenstraße 16, 55116 Mainz, Germany. Contact: {mailLink}.</>,
        ],
      },
      {
        title: "2. Service",
        paragraphs: [
          "Lomir is a free, non-commercial team-matching and collaboration app. Users can create profiles, find teams and open roles, manage teams, exchange messages, upload avatars or chat files, and contact the Lomir team.",
          "The app is provided as a portfolio and learning project. It may change, be interrupted, or be discontinued, especially during active development.",
        ],
      },
      {
        title: "3. Eligibility",
        paragraphs: [
          "You may create an account and use Lomir only if you are at least 16 years old. You must provide accurate account information and keep your login credentials secure.",
        ],
      },
      {
        title: "4. Account Rules",
        items: [
          "Do not create accounts for someone else without permission.",
          "Do not share any password, login links, verification codes, or other account data.",
          "Do not use Lomir to harass, deceive, spam, threaten, or unlawfully discriminate against others.",
          "Do not upload malware, illegal content, confidential third-party information, or content that infringes intellectual property rights.",
          "Do not attempt to bypass security measures, scrape private data, or access accounts, teams, messages, or API endpoints without authorization.",
        ],
      },
      {
        title: "5. Profiles, Teams, and Visibility",
        paragraphs: [
          "Your profile is private by default. You decide whether to make it public. Public profile content may be visible to other Lomir users and may appear in search results, on profile pages and profile cards, in the map view, in lists, or in overviews.",
          "If you add location data, it may be used for matching and recommendations. Depending on visibility settings and context, approximate location details such as postal code, city, district, state, or country may be visible to other users.",
          "Team and role visibility depends on team settings and membership context. Even when your profile is private, information needed for teams, applications, invitations, messages, and notifications may be shown to the relevant participants.",
        ],
      },
      {
        title: "6. User Content",
        paragraphs: [
          "You retain the rights to the content and files you upload to Lomir or create there. By uploading or creating content, you grant Lomir a limited, non-exclusive right to store, display, transmit, and process that content as necessary to operate the app. This includes storage by service providers we engage, for example for hosting and media. The right ends when you delete the content or your account, except for content that remains in team chats or as awarded badges (see 9. Account Deletion).",
          "You are responsible for the content you provide. Do not enter sensitive personal data, confidential information, or data about other people unless you have a legal basis and, where required, their permission.",
        ],
      },
      {
        title: "7. Reporting Illegal Content and Abuse",
        paragraphs: [
          <>If you believe that content, an account, a team, a message, or an upload on Lomir is unlawful, abusive, harassing, spam, malware, infringing, privacy-invasive, or otherwise violates these terms, please report it through the {contactLink} or by email to {mailLink}.</>,
          "Reports should include enough information to locate and review the issue, such as usernames, team names, message context, links, screenshots, the reason for the report, and a contact email. Please only submit a report if you honestly believe that the information in it is accurate and complete.",
          "Reports submitted through the contact form are recorded with a reference ID so Lomir can receive and track them even if email forwarding is temporarily unavailable.",
          "We confirm receipt of a report and review it in a timely, diligent and objective manner. The review is done personally, without automated decision-making. We then inform you of the outcome and of the possibilities to challenge it.",
          "Lomir may review reported content or accounts and may restrict, remove, or delete content; suspend or delete accounts; contact affected users; preserve information where needed; or report matters to competent authorities where legally required or necessary to protect users, the app, or third parties.",
          <>If your content or account is restricted and you believe this was a mistake, you can contact Lomir through the {contactLink} or by email to {mailLink}.</>,
        ],
      },
      {
        title: "8. Messages and Uploads",
        paragraphs: [
          "Messages are visible to the relevant direct-message participants or team members. Chat file and image uploads are intended for temporary collaboration and currently expire after 60 days.",
          "Contact form attachments are sent by email to the Lomir inbox. Do not send sensitive or confidential material through the contact form unless it is necessary for your request.",
        ],
      },
      {
        title: "9. Account Deletion",
        paragraphs: [
          <>You may delete your account in the app. Account deletion is permanent: your profile and all direct messages you are involved in are deleted immediately after confirmation. Messages you wrote in team chats and badges you awarded to others remain; your name is replaced there by "Former Lomir User". Details are in the {privacyLink}.</>,
        ],
      },
      {
        title: "10. Availability and Changes",
        paragraphs: [
          "Lomir is provided free of charge and without a guarantee of uninterrupted availability. Features may be changed, limited, or removed. Maintenance, hosting limits, provider outages, security incidents, or project changes may affect the app.",
          "We may change these terms when Lomir, the legal requirements or the services we use change. We inform you of material changes in good time beforehand by email or in the app. If you do not agree with a change, you can delete your account at any time. New accounts are subject to the current version.",
        ],
      },
      {
        title: "11. Suspension and Removal",
        paragraphs: [
          "Accounts or content may be restricted, removed, or deleted if they violate these terms, harm other users, pose legal risks, threaten the security of the app, or are required to be removed by law.",
          "If we restrict, remove, or suspend content or an account, we inform the person concerned of the measure and the reasons for it, and of the possibilities to challenge it, for example through the contact page or before the courts. This applies as far as we have their contact details and no legal reason prevents it.",
        ],
      },
      {
        title: "12. Liability",
        paragraphs: [
          "Nothing in these terms limits liability for intent, gross negligence, injury to life, body, or health, or any other liability that cannot be limited under applicable law.",
          "For free use of Lomir, liability for ordinary negligence is limited to breaches of essential contractual duties and to typical, foreseeable damage, unless mandatory law provides otherwise.",
        ],
      },
      {
        title: "13. Privacy",
        paragraphs: [
          <>You can find information about the processing of personal data in the {privacyLink}.</>,
        ],
      },
      {
        title: "14. Governing Law",
        paragraphs: [
          "German law applies, subject to the mandatory consumer protection rules of the country in which you have your habitual residence.",
          "These terms, the privacy policy and the legal notice are available in German and English. The German version is authoritative; the English version is a translation.",
        ],
      },
      {
        title: "15. Contact",
        paragraphs: [
          <>Questions about these terms can be sent through the {contactLink} or by email to {mailLink}.</>,
        ],
      },
    ],
  },
  legalNotice: {
    title: "Legal Notice / Impressum",
    intro:
      "Provider information under Section 18(1) of the German Interstate Media Treaty (Medienstaatsvertrag, MStV) and, where applicable, Section 5 of the German Digital Services Act (Digitale-Dienste-Gesetz, DDG).",
    sections: [
      {
        title: "Provider",
        paragraphs: [
          <>
            Julia Baur
            <br />
            Walpodenstraße 16
            <br />
            55116 Mainz
            <br />
            Germany
          </>,
        ],
      },
      {
        title: "Contact",
        paragraphs: [<>Email: {mailLink}</>, <>Online: {contactFormLink}</>],
      },
      {
        title: "Single Point of Contact (Digital Services Act)",
        paragraphs: [
          "The single point of contact for recipients of the service and for the authorities of the Member States, the European Commission and the European Board for Digital Services under Art. 11 and 12 of Regulation (EU) 2022/2065 (Digital Services Act) is Julia Baur. She can be reached electronically at the email address above and through the contact form. Requests are handled personally and can be made in German or English.",
        ],
      },
      {
        title: "Journalistic-Editorial Content",
        paragraphs: [
          "Lomir does not currently provide journalistic-editorial content within the meaning of Section 18(2) of the German Interstate Media Treaty (MStV). A responsible person under Section 18(2) MStV is therefore not designated. If such content is offered in the future, this notice will be updated accordingly.",
        ],
      },
      {
        title: "Nature of the Project",
        paragraphs: [
          "Lomir is currently operated as a free, non-commercial portfolio and learning project. If the legal or commercial status of the app changes, this notice will be updated accordingly.",
        ],
      },
      {
        title: "Consumer Dispute Resolution",
        paragraphs: [
          "We are neither willing nor obliged to participate in a dispute resolution procedure before a consumer arbitration board.",
        ],
      },
      {
        title: "Liability for Content",
        paragraphs: [
          "We endeavour to keep our own content accurate and up to date. User-generated content is created by the users themselves. If you notice unlawful content or rights violations, please contact us so we can review it.",
        ],
      },
      {
        title: "External Links",
        paragraphs: [
          "Lomir may contain links to external websites or services. We have no control over their content and take no responsibility for third-party content. External links that we add ourselves are reviewed when added. Links in content posted by users, such as chat messages, are not reviewed in advance. If we become aware of unlawful content, we remove the relevant link where possible.",
        ],
      },
      {
        title: "Copyright",
        paragraphs: [
          "Content and assets created for Lomir are subject to applicable copyright law. Content submitted by users remains the responsibility of the respective user. Any use outside the limits of applicable law requires permission from the relevant rights holder.",
        ],
      },
    ],
  },
};

export default content;
