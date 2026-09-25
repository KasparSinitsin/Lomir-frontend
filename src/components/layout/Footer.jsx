import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Github, Instagram, Mail, Scale } from 'lucide-react';

const LINK_CLASSES =
  'inline-flex items-center gap-1.5 text-base-content hover:text-primary-focus rounded-full px-4 py-1';

/**
 * Trailing slashes reach this from typed URLs and from links elsewhere, and
 * "/privacy/" must hide the same entry as "/privacy".
 */
const normalizePath = (path) =>
  path.length > 1 ? path.replace(/\/+$/, '') : path;

const Footer = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const currentPath = normalizePath(pathname);

  /**
   * The pages the footer links to, in the order they are shown. The page the
   * visitor is currently on is left out rather than linked to itself - a link
   * that goes nowhere reads as a dead control, and on the legal pages this row
   * is the only navigation there is.
   *
   * ⚠️ The keys are spelled out literally, and the list is built here rather
   * than at module level, for two reasons: `npm run i18n:check` only sees
   * literal `t("...")` calls - a `t(labelKey)` made all five keys look unused -
   * and a label resolved at render follows a language change.
   */
  const internalLinks = [
    { to: '/about', label: t('footer.about') },
    { to: '/terms', label: t('footer.terms') },
    { to: '/privacy', label: t('footer.privacy') },
    { to: '/legal-notice', label: t('footer.imprint') },
    { to: '/contact', label: t('footer.contact'), Icon: Mail },
  ];

  return (
    <footer className="glass-navbar bottom-0 w-full py-6">
      <div className="content-container flex flex-col items-center">
        {/* Footer Text */}
        <p className="text-sm sm:text-base text-base-content">
          {t('footer.copyright', { year: String(new Date().getFullYear()) })}
        </p>

        {/* Footer Links */}
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 text-sm leading-none">
          {internalLinks
            .filter(({ to }) => to !== currentPath)
            .map(({ to, label, Icon }) => (
              <Link key={to} to={to} className={LINK_CLASSES}>
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {label}
              </Link>
            ))}
          <a
            href="https://github.com/KasparSinitsin/Lomir-frontend/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASSES}
          >
            <Scale className="h-3.5 w-3.5" />
            {t('footer.license')}
          </a>
          <a
            href="https://github.com/KasparSinitsin/Lomir-frontend"
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASSES}
          >
            <Github className="h-3.5 w-3.5" />
            {t('footer.source')}
          </a>
          <a
            href="https://www.instagram.com/lomirapp/"
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASSES}
          >
            <Instagram className="h-3.5 w-3.5" />
            {t('footer.instagram')}
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
