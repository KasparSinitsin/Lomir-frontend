import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Instagram, Mail, Scale } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="glass-navbar bottom-0 w-full py-6">
      <div className="content-container flex flex-col items-center">
        {/* Footer Text */}
        <p className="text-sm sm:text-base text-base-content">Lomir - Team Up App © {new Date().getFullYear()}</p>

        {/* Footer Links */}
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 text-sm leading-none">
          <Link to="/about" className="text-base-content hover:text-primary-focus rounded-full px-4 py-1">About</Link>
          <Link to="/terms" className="text-base-content hover:text-primary-focus rounded-full px-4 py-1">Terms</Link>
          <Link to="/privacy" className="text-base-content hover:text-primary-focus rounded-full px-4 py-1">Privacy</Link>
          <Link to="/legal-notice" className="text-base-content hover:text-primary-focus rounded-full px-4 py-1">Imprint</Link>
          <Link to="/contact" className="inline-flex items-center gap-1.5 text-base-content hover:text-primary-focus rounded-full px-4 py-1">
            <Mail className="h-3.5 w-3.5" />
            Contact
          </Link>
          <a
            href="https://github.com/KasparSinitsin/Lomir-frontend/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-base-content hover:text-primary-focus rounded-full px-4 py-1"
          >
            <Scale className="h-3.5 w-3.5" />
            License
          </a>
          <a
            href="https://github.com/KasparSinitsin/Lomir-frontend"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-base-content hover:text-primary-focus rounded-full px-4 py-1"
          >
            <Github className="h-3.5 w-3.5" />
            Source
          </a>
          <a
            href="https://www.instagram.com/lomirapp/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-base-content hover:text-primary-focus rounded-full px-4 py-1"
          >
            <Instagram className="h-3.5 w-3.5" />
            Instagram
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
