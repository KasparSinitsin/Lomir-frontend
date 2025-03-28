import React from 'react';

const Footer = () => {
  return (
    <footer className="footer footer-center p-4 bg-base-200 text-base-content">
      <div>
        <p>Lomir - Team Up App © {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
};

export default Footer;