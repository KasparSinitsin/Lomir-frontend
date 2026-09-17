import React from "react";
import { useTranslation } from "react-i18next";
import Card from "../components/common/Card";
import { useLanguage } from "../contexts/LanguageContext";
import { getActiveLocale } from "../utils/languageUtils";
import de from "../content/legal/de";
import en from "../content/legal/en";
import { LEGAL_UPDATED } from "../content/legal/shared";

/**
 * The legal texts are documents, not UI strings: one file per language with
 * the same shape, kept in step by `npm run legal:check`. Only the page chrome
 * ("Last updated:") goes through t().
 */
const CONTENT_BY_LANGUAGE = { de, en };

/**
 * An ISO date formatted in UTC, so a date-only value is never shifted to the
 * previous day west of Greenwich.
 */
const formatLegalDate = (isoDate) =>
  new Intl.DateTimeFormat(getActiveLocale(), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));

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

const LegalPage = ({ type }) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const pages = CONTENT_BY_LANGUAGE[language] ?? en;
  const pageType = pages[type] ? type : "about";
  const content = pages[pageType];
  const updated = LEGAL_UPDATED[pageType];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card hoverable={false} truncateContent={false}>
        <div className="space-y-5">
          <div>
            <h1 className="text-3xl font-medium text-primary">
              {content.title}
            </h1>
            <p className="mt-3 text-base-content/75">{content.intro}</p>
            {updated && (
              <p className="mt-2 text-sm text-base-content/55">
                {t("legalPage.lastUpdated", { date: formatLegalDate(updated) })}
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

export default LegalPage;
