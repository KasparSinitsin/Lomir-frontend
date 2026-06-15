import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="glass-navbar bottom-0 w-full py-6">
      <div className="content-container flex flex-col items-center">
        {/* Footer Text */}
        <p className="text-sm sm:text-base text-base-content">Lomir - Team Up App © {new Date().getFullYear()}</p>

        {/* Footer Links */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-2">
          <Link to="/about" className="text-base-content hover:text-primary-focus rounded-full px-4 py-1">About</Link>
          <Link to="/terms" className="text-base-content hover:text-primary-focus rounded-full px-4 py-1">Terms</Link>
          <Link to="/privacy" className="text-base-content hover:text-primary-focus rounded-full px-4 py-1">Privacy</Link>
          <Link to="/legal-notice" className="text-base-content hover:text-primary-focus rounded-full px-4 py-1">Legal Notice / Impressum</Link>
          <Link to="/contact" className="text-base-content hover:text-primary-focus rounded-full px-4 py-1">Contact</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
