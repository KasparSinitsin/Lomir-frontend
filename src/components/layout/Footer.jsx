import React from 'react';

const Footer = () => {
  return (
    <footer className="content-container footer footer-center p-4 bg-base-200 text-base-content border-t border-base-300 mt-12">
      <div>
      <p>Lomir - Team Up App © {new Date().getFullYear()}</p>
      <div className="flex gap-4 mt-2">
          <a href="#" className="text-primary hover:text-primary-focus">Terms</a>
          <a href="#" className="text-primary hover:text-primary-focus">Privacy</a>
          <a href="#" className="text-primary hover:text-primary-focus">Contact</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;