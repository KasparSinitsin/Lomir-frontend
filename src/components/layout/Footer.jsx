import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Github, Instagram, Mail, Scale } from 'lucide-react';

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="glass-navbar bottom-0 w-full py-6">
      <div className="content-container flex flex-col items-center">
        {/* Footer Text */}
        <p className="text-sm sm:text-base text-base-content">
          {t('footer.copyright', { year: String(new Date().getFullYear()) })}
        </p>

        {/* Footer Links */}
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 text-sm leading-none">
          <Link to="/about" className="text-base-content hover:text-primary-focus rounded-full px-4 py-1">{t('footer.about')}</Link>
          <Link to="/terms" className="text-base-content hover:text-primary-focus rounded-full px-4 py-1">{t('footer.terms')}</Link>
          <Link to="/privacy" className="text-base-content hover:text-primary-focus rounded-full px-4 py-1">{t('footer.privacy')}</Link>
          <Link to="/legal-notice" className="text-base-content hover:text-primary-focus rounded-full px-4 py-1">{t('footer.imprint')}</Link>
          <Link to="/contact" className="inline-flex items-center gap-1.5 text-base-content hover:text-primary-focus rounded-full px-4 py-1">
            <Mail className="h-3.5 w-3.5" />
            {t('footer.contact')}
          </Link>
          <a
            href="https://github.com/KasparSinitsin/Lomir-frontend/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-base-content hover:text-primary-focus rounded-full px-4 py-1"
          >
            <Scale className="h-3.5 w-3.5" />
            {t('footer.license')}
          </a>
          <a
            href="https://github.com/KasparSinitsin/Lomir-frontend"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-base-content hover:text-primary-focus rounded-full px-4 py-1"
          >
            <Github className="h-3.5 w-3.5" />
            {t('footer.source')}
          </a>
          <a
            href="https://www.instagram.com/lomirapp/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-base-content hover:text-primary-focus rounded-full px-4 py-1"
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
