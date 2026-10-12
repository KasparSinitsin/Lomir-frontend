import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

/**
 * A link to one of the binding pages (terms, privacy policy, legal notice).
 * It opens in a new tab so that a half-filled form - registration, contact -
 * is not lost on the way to the text (Julia, 2026-10-12). Screen readers are
 * told that a new tab opens (WCAG technique G201); sighted users see no extra
 * text. Use it for links TO those pages, not for links on them to other pages.
 */
const LegalLink = ({ to, children, ...rest }) => {
  const { t } = useTranslation();

  return (
    <Link to={to} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
      <span className="sr-only"> {t("common:legalLink.opensInNewTab")}</span>
    </Link>
  );
};

export default LegalLink;
