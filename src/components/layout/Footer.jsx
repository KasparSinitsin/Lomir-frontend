import React from 'react';

const Footer = () => {
  return (
    <footer className="glass-navbar bottom-0 w-full py-6">
      <div className="content-container flex flex-col items-center">
        {/* Footer Text */}
        <p className="text-sm sm:text-base text-base-content">Lomir - Team Up App © {new Date().getFullYear()}</p>

        {/* Footer Links */}
        <div className="flex space-x-6 mt-2">
          <a href="#" className="text-base-content hover:text-primary-focus rounded-full px-4 py-1">Terms</a>
          <a href="#" className="text-base-content hover:text-primary-focus rounded-full px-4 py-1">Privacy</a>
          <a href="#" className="text-base-content hover:text-primary-focus rounded-full px-4 py-1">Contact</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;