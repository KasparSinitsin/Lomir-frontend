import React from "react";
import { Link } from "react-router-dom";
import Card from "../components/common/Card";

const CONTACT_EMAIL = "lomirapp@gmail.com";
const LAST_UPDATED = "June 15, 2026";

const mailLink = (
  <a href={`mailto:${CONTACT_EMAIL}`} className="link link-primary">
    {CONTACT_EMAIL}
  </a>
);

const contactLink = (
  <Link to="/contact" className="link link-primary">
    contact page
  </Link>
);

const privacyLink = (
  <Link to="/privacy" className="link link-primary">
    Privacy Policy
  </Link>
);

const pageContent = {
  about: {
    title: "About Lomir",
    updated: LAST_UPDATED,
    intro:
      "Lomir is a free team-matching app for people who want to find collaborators, form teams, and exchange messages around shared interests, focus areas, badges, roles, and location preferences.",
    sections: [
      {
        title: "Project Status",
        paragraphs: [
          "Lomir is currently operated as a non-commercial portfolio and learning project. The app is designed with privacy-by-default settings: new profiles stay private until users actively make them public.",
          "The app may evolve as the project develops. If material features change, the legal and privacy information should be reviewed and updated before public rollout.",
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
    updated: LAST_UPDATED,
    intro:
      "This Privacy Policy explains how Lomir processes personal data. It is written for an app operated from Germany and aligned with the GDPR, the German Federal Data Protection Act, and German rules on technically necessary browser storage under the TDDDG.",
    sections: [
      {
        title: "1. Controller",
        paragraphs: [
          "The controller responsible for Lomir is:",
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
        title: "2. What Lomir Is",
        paragraphs: [
          "Lomir helps users find people, teams, and open roles based on profile information, focus areas, badges, location preferences, and team membership. It also provides direct and team chat, file sharing, notifications, contact forms, and account management.",
          "Profiles are private by default. Public profile information is only shown in public search and profile views when a user actively changes their profile status to public.",
        ],
      },
      {
        title: "3. Minimum Age",
        paragraphs: [
          "Lomir is not intended for users under 16. During registration, users must separately confirm that they are at least 16 years old.",
          <>Lomir does not knowingly collect personal data from users under 16. If you believe that a person under 16 has created an account, please contact us at {mailLink} so we can review and delete the account where appropriate.</>,
        ],
      },
      {
        title: "4. Data We Process",
        items: [
          "Account data: username, email address, password hash, email verification status, timestamps, and account settings.",
          "Legal acknowledgement data: timestamps and document versions for accepted Terms of Service, acknowledged Privacy Policy, and the separate confirmation that the user is at least 16 years old.",
          "Profile data: optional first and last name, bio, avatar, focus areas, badges, optional location details such as postal code, city, district, state, and country, and public/private visibility status.",
          "Team and role data: team names, descriptions, avatars, members, roles, applications, invitations, and team location preferences.",
          "Messages and notifications: direct messages, team messages, mentions, typing/read indicators, system messages, notification records, and message metadata.",
          "Uploads: profile avatars, team avatars, chat images, chat files, and contact form attachments.",
          "Location data: postal code, city, district, state, country, and coordinates resolved from the location data a user provides. Lomir does not ask for a street address. Postal code and other location details are used as approximate location information for search, distance-based matching, recommendations, and profile/team/role location display. Depending on visibility settings and feature context, postal code, city, district, state, or country may be visible to other users. Public search and map results expose rounded approximate coordinates, not exact stored coordinates.",
          "Contact and report data: name, email address, topic, message, optional contact form attachments, report reference IDs, report status, email-forwarding status, and attachment metadata for abuse or illegal-content reports.",
          "Security and technical data: IP-related request data handled by hosting providers, browser and device metadata in server logs, rate-limit data, CAPTCHA verification data where enabled, JWT authentication tokens, and browser storage needed for the app to work.",
        ],
      },
      {
        title: "5. Sources of Data",
        paragraphs: [
          "Most personal data processed by Lomir is provided directly by the user, for example during registration, profile editing, team creation, messaging, applications, invitations, uploads, and contact requests.",
          "Some data may be generated by the app or provided by other users in the course of collaboration, for example team membership records, invitations, applications, badge awards, messages, mentions, notifications, ownership transfers, and system messages.",
          "Location details may be derived from postal code, city, district, state, or country information that a user provides, using OpenStreetMap/Nominatim.",
        ],
      },
      {
        title: "6. Purposes and Legal Bases",
        items: [
          "Account creation, login, profile management, optional location-based matching, team matching, chat, notifications, and app operation: Art. 6(1)(b) GDPR.",
          "Legal acknowledgements, age confirmation, and documentation of accepted legal documents: Art. 6(1)(c) and Art. 6(1)(f) GDPR.",
          "Public profile visibility and optional profile content that users choose to publish, including optional approximate location details: Art. 6(1)(a) GDPR and, where relevant, Art. 6(1)(b) GDPR.",
          "Security, abuse prevention, rate limiting, CAPTCHA checks, fraud prevention, debugging, and service reliability: Art. 6(1)(f) GDPR.",
          "Contact requests and support communication: Art. 6(1)(b) GDPR where the request relates to an account or potential account, otherwise Art. 6(1)(f) GDPR.",
          "Legal compliance and preservation of claims where required: Art. 6(1)(c) and Art. 6(1)(f) GDPR.",
        ],
      },
      {
        title: "7. Legitimate Interests",
        paragraphs: [
          "Where Lomir relies on Art. 6(1)(f) GDPR, the legitimate interests are operating a secure and reliable app, preventing abuse and spam, protecting users and the service, debugging errors, enforcing rules, preserving evidence where needed, responding to support requests, and defending or asserting legal claims.",
        ],
      },
      {
        title: "8. Required and Optional Data",
        paragraphs: [
          "There is no statutory requirement to create a Lomir account. Account credentials, legal acknowledgements, age confirmation, and security-related data are necessary to create and maintain an account and to enter into or perform the user agreement. Without this data, Lomir cannot provide an account.",
          "Profile details, avatars, focus areas, teams, roles, applications, messages, uploads, and location details are generally provided voluntarily, but some of them are necessary for the respective feature. If optional data is not provided, the related feature may be unavailable or less useful.",
          "Location fields such as postal code, city, and country are optional. Users may leave them empty or remove them later in their profile settings. Without location data, nearby search, distance-based matching, and location-based recommendations may be less precise or unavailable.",
        ],
      },
      {
        title: "9. Public Visibility",
        paragraphs: [
          "Lomir is designed so that users do not unintentionally publish profile details. New accounts remain private after email verification unless the user changes the setting.",
          "If a profile is public, other users may see profile details such as username, name, bio, avatar, focus areas, badges, and approximate location details added by the user. Approximate location details may include postal code, city, district, state, or country. If a profile is private, it is not shown in public search or public profile views. Team members and conversation participants may still see information needed for team collaboration, messaging, applications, invitations, badge context, and safety-related system messages.",
          "Users can change profile visibility in settings. Turning a profile private affects future public visibility, but it may not remove information already seen by other users or contained in team/chat context.",
        ],
      },
      {
        title: "10. Recipients and Disclosure",
        items: [
          "Other Lomir users may receive personal data where the app feature requires it, for example public profile views, search results, team pages, applications, invitations, messages, badge context, and notifications.",
          "Team members, team owners, invitees, applicants, and conversation participants may receive information needed for the relevant collaboration context.",
          "The Lomir project operators may access personal data where this is necessary to operate the app, provide support, investigate abuse, debug errors, maintain security, or comply with legal obligations.",
          "Hosting, database, upload, email, CAPTCHA, geocoding, map, and infrastructure providers process personal data where needed to provide the app. Depending on the provider and context, they may act as processors on Lomir's behalf or as independent providers under their own privacy terms.",
          "Email providers may process email addresses, message content, email metadata, verification emails, password reset emails, and contact form messages including attachments where email delivery or support communication requires this.",
          "Geocoding and map providers may receive location queries, map requests, IP addresses, browser or device data, and request metadata when location lookup or map views are used.",
          "Authorities, courts, legal advisers, or other third parties may receive data where disclosure is legally required or necessary to protect rights, security, users, or the service.",
        ],
      },
      {
        title: "11. Matching, Recommendations, and Automated Decisions",
        paragraphs: [
          "Lomir calculates match and overlap scores from tags, badges, and distance information to sort or recommend people, teams, and roles. The logic compares shared focus areas, badge context, role information, and approximate distance where available. Postal code, city, district, state, country, and derived coordinates may be used to calculate approximate distances.",
          "These scores are assistance features only. Lomir does not use automated decision-making that produces legal effects or similarly significant effects within the meaning of Art. 22 GDPR.",
        ],
      },
      {
        title: "12. Browser Storage, Cookies, and Similar Technologies",
        paragraphs: [
          "Lomir currently uses technically necessary browser storage such as localStorage and sessionStorage. For example, the app stores the login token in localStorage and uses sessionStorage for in-app notification state.",
          "This storage is necessary to provide authentication, API access, real-time chat, and notification features. Lomir does not currently use advertising cookies, marketing trackers, or third-party analytics tools.",
          "Where Cloudflare Turnstile is enabled for registration or the contact form, Cloudflare may process technical data to verify that a request is made by a human. This is used for abuse prevention.",
        ],
      },
      {
        title: "13. Third-Party Services",
        items: [
          "Vercel hosts and delivers the frontend. Vercel may process IP addresses, browser and device data, request metadata, deployment data, and technical logs needed to deliver and secure the frontend.",
          "Render hosts the backend API. Render may process IP addresses, browser and device data, API request metadata, server logs, error information, and data transmitted to or from the backend.",
          "Neon, now part of Databricks, provides the PostgreSQL database. App data stored in the database may include account data, profile data, team and role data, messages, notifications, legal acknowledgement records, location data, and related metadata.",
          "ImageKit stores, transforms, optimizes, and delivers uploaded media and files, including profile avatars, team avatars, chat images, chat files, and related delivery logs or metadata.",
          "Gmail/Google SMTP is used through Nodemailer to send account verification emails, password reset emails, and contact form messages. Google may process email addresses, email content, email metadata, and contact form attachments as part of email delivery and mailbox operation.",
          "Cloudflare Turnstile may be used for CAPTCHA checks on registration and contact forms. Cloudflare may process technical data such as IP address, browser and device information, challenge data, and verification tokens to detect abuse and confirm that a request is likely made by a human.",
          "OpenStreetMap/Nominatim is used to resolve user-provided location information such as postal code, city, district, state, or country. OpenStreetMap map tiles may be loaded when the map view is opened. OpenStreetMap-related services may receive location queries, IP addresses, browser and device data, and request metadata.",
        ],
      },
      {
        title: "14. International Transfers",
        paragraphs: [
          "Some providers are established outside the European Economic Area or may process data in the United States, the United Kingdom, India, or other countries, especially where infrastructure, support, security, email delivery, content delivery, or global network services are provided internationally.",
          "Where personal data is transferred to a country without an EU adequacy decision, Lomir relies on the available transfer mechanisms and safeguards offered by the relevant provider where required. These may include the EU-U.S. Data Privacy Framework, the UK Extension to the EU-U.S. Data Privacy Framework, the Swiss-U.S. Data Privacy Framework, EU Standard Contractual Clauses, data processing agreements, and supplementary technical and organizational measures.",
          "Vercel, Render, Databricks/Neon, Cloudflare, and ImageKit publish information about data processing, transfer safeguards, or subprocessors in their legal or trust documentation. Google/Gmail and OpenStreetMap-related services process data under their own privacy terms where they act as independent providers or public infrastructure operators.",
          <>Users may contact Lomir at {mailLink} to ask for more information about the safeguards relevant to a specific provider.</>,
        ],
      },
      {
        title: "15. Storage Periods",
        items: [
          "Account and profile data are stored while the account exists and are deleted or anonymized according to the account deletion workflow.",
          "Legal acknowledgement records are stored while the account exists and may be retained where necessary to document compliance or defend legal claims.",
          "Unverified accounts are scheduled for deletion after the verification link expires, with cleanup running periodically.",
          "Password reset tokens expire after one hour and are cleared by scheduled cleanup.",
          "Chat file and image uploads expire after 60 days and are removed by scheduled cleanup where possible. Message records may remain with deleted file references removed.",
          "Avatars and team avatars are stored until replaced, removed, or deleted with the relevant account or team where technically possible.",
          "Contact form messages, abuse or illegal-content reports, report status records, and related emails are kept as long as needed to answer the request, review the report, document the handling process, and, where necessary, comply with legal obligations or defend claims.",
          "Technical logs are kept only as long as necessary for security, troubleshooting, and hosting operations, subject to the relevant provider settings.",
        ],
      },
      {
        title: "16. Account Deletion",
        paragraphs: [
          "Users can delete their account from the app. Deletion is designed to remove the user row and direct messages involving the user. Some team context may be preserved in anonymized form, for example as 'Former Lomir User', so that remaining teams, badge histories, ownership transfers, and role status remain understandable.",
          "Uploaded avatars are deleted from ImageKit on a best-effort basis after successful account deletion.",
        ],
      },
      {
        title: "17. Your Rights",
        paragraphs: [
          <>You may contact Lomir at {mailLink} to request access, rectification, erasure, restriction of processing, data portability, objection to processing based on legitimate interests, and withdrawal of consent for the future.</>,
          "Withdrawal of consent does not affect the lawfulness of processing based on consent before withdrawal. For example, users can turn a public profile private for the future, but this does not undo visibility that already occurred before the change.",
          "You also have the right to lodge a complaint with a data protection supervisory authority. In Rheinland-Pfalz, this is the Landesbeauftragte für den Datenschutz und die Informationsfreiheit Rheinland-Pfalz. You may also contact another competent supervisory authority.",
        ],
      },
      {
        title: "18. Sensitive Data",
        paragraphs: [
          "Please do not enter special categories of personal data, confidential information, or third-party secrets into your profile, teams, messages, uploads, or contact form unless it is strictly necessary and you have the right to share it.",
        ],
      },
      {
        title: "19. Updates and Further Processing",
        paragraphs: [
          "This Privacy Policy may be updated when Lomir changes, when providers change, or when legal requirements change. Material updates should be published before they apply to new processing activities.",
          "If Lomir intends to process personal data for a new purpose that is not compatible with the purpose for which the data was collected, users will be informed before that further processing where required by law.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    updated: LAST_UPDATED,
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
          "The app is provided as a portfolio and learning project. It may change, be interrupted, or be discontinued, especially while it is still under active development.",
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
          "Do not share your password or authentication token.",
          "Do not use Lomir to harass, deceive, spam, threaten, or unlawfully discriminate against others.",
          "Do not upload malware, illegal content, confidential third-party information, or content that infringes intellectual property rights.",
          "Do not attempt to bypass security, scrape private data, or access accounts, teams, messages, or API endpoints without authorization.",
        ],
      },
      {
        title: "5. Profiles, Teams, and Visibility",
        paragraphs: [
          "Your profile is private by default. You decide whether to make it public. Public profile content may be visible to other Lomir users and may appear in search, profile, card, list, and map views.",
          "If you add location details, they may be used for matching and recommendations. Depending on your visibility settings and feature context, approximate location details such as postal code, city, district, state, or country may be visible to other users.",
          "Team and role visibility depends on team settings and membership context. Even when your profile is private, information needed for teams, applications, invitations, messages, and notifications may be shown to the relevant participants.",
        ],
      },
      {
        title: "6. User Content",
        paragraphs: [
          "You keep ownership of content you submit to Lomir. By submitting content, you grant Lomir a limited, non-exclusive right to store, display, transmit, and process that content as necessary to operate the app.",
          "You are responsible for the content you provide. Please do not include sensitive personal data, confidential information, or data about other people unless you have a lawful basis and their permission where required.",
        ],
      },
      {
        title: "7. Reporting Illegal Content and Abuse",
        paragraphs: [
          <>If you believe that content, an account, a team, a message, or an upload on Lomir is unlawful, abusive, harassing, spam, malware, infringing, privacy-invasive, or otherwise violates these terms, please report it through the {contactLink} or by email to {mailLink}.</>,
          "Reports should include enough information to locate and review the issue, such as usernames, team names, message context, links, screenshots, the reason for the report, and a contact email. Please submit reports in good faith.",
          "Reports submitted through the contact form are recorded with a reference ID so Lomir can receive and track them even if email forwarding is temporarily unavailable.",
          "Lomir may review reported content or accounts and may restrict, remove, or delete content; suspend or delete accounts; contact affected users; preserve information where needed; or report matters to competent authorities where legally required or necessary to protect users, the app, or third parties.",
          <>If your content or account is restricted and you believe this was a mistake, you can contact Lomir through the {contactLink} or by email to {mailLink}.</>,
        ],
      },
      {
        title: "8. Messages and Uploads",
        paragraphs: [
          "Messages are visible to the relevant direct-message participant or team members. Chat file and image uploads are intended for temporary collaboration and currently expire after 60 days.",
          "Contact form attachments are sent by email to the Lomir contact inbox. Do not send sensitive or confidential material through the contact form unless it is necessary for your request.",
        ],
      },
      {
        title: "9. Account Deletion",
        paragraphs: [
          "You may delete your account in the app. Account deletion is intended to be permanent. Some team and badge context may remain in anonymized or system-message form so that other users' team history and collaboration context stay understandable.",
        ],
      },
      {
        title: "10. Availability and Changes",
        paragraphs: [
          "Lomir is provided free of charge and without a promise of uninterrupted availability. Features may be changed, limited, or removed. Maintenance, hosting limits, provider outages, security incidents, or project changes may affect the app.",
        ],
      },
      {
        title: "11. Suspension and Removal",
        paragraphs: [
          "Accounts or content may be restricted, removed, or deleted if they violate these terms, harm other users, create legal risk, threaten the security of the app, or are required to be removed by law.",
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
          <>Information about how personal data is processed is available in the {privacyLink}.</>,
        ],
      },
      {
        title: "14. Governing Law",
        paragraphs: [
          "German law applies, subject to any mandatory consumer protection rules that apply in the country where a user has their habitual residence.",
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
    updated: LAST_UPDATED,
    intro:
      "Information according to Section 5 of the German Digital Services Act (Digitale-Dienste-Gesetz, DDG).",
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
        paragraphs: [<>Email: {mailLink}</>],
      },
      {
        title: "Responsible for Content",
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
        title: "Nature of the Project",
        paragraphs: [
          "Lomir is currently operated as a free, non-commercial portfolio and learning project. If the legal or commercial status of the app changes, this notice should be reviewed and updated.",
        ],
      },
      {
        title: "Consumer Dispute Resolution",
        paragraphs: [
          "We are not willing or obliged to participate in dispute resolution proceedings before a consumer arbitration board.",
        ],
      },
      {
        title: "Liability for Content",
        paragraphs: [
          "We make reasonable efforts to keep our own content accurate and up to date. User-generated content is created by users. If you notice unlawful content or rights violations, please contact us so we can review it.",
        ],
      },
      {
        title: "External Links",
        paragraphs: [
          "Lomir may contain links to external websites or services. We have no control over their content and are not responsible for third-party websites. External links are reviewed when added; if we become aware of unlawful content, we will remove the relevant link where possible.",
        ],
      },
      {
        title: "Copyright",
        paragraphs: [
          "Content and assets created for Lomir are protected by applicable copyright law. Content submitted by users remains the responsibility of the respective user. Any use outside the limits of applicable law requires permission from the relevant rights holder.",
        ],
      },
    ],
  },
};

const LegalSection = ({ section }) => (
  <section className="space-y-3 border-t border-base-300/70 pt-5 first:border-t-0 first:pt-0">
    <h2 className="text-xl font-medium text-base-content">{section.title}</h2>

    {section.paragraphs?.map((paragraph, index) => (
      <p key={index} className="text-sm leading-relaxed text-base-content/75">
        {paragraph}
      </p>
    ))}

    {section.items && (
      <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-base-content/75">
        {section.items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    )}
  </section>
);

const LegalPlaceholderPage = ({ type }) => {
  const content = pageContent[type] ?? pageContent.about;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card hoverable={false} truncateContent={false}>
        <div className="space-y-5">
          <div>
            <h1 className="text-3xl font-medium text-primary">
              {content.title}
            </h1>
            <p className="mt-3 text-base-content/75">{content.intro}</p>
            {content.updated && (
              <p className="mt-2 text-sm text-base-content/55">
                Last updated: {content.updated}
              </p>
            )}
          </div>

          <div className="space-y-6">
            {content.sections?.map((section) => (
              <LegalSection key={section.title} section={section} />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LegalPlaceholderPage;
