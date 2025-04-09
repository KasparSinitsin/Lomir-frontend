
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LomirLogo from '../../assets/images/Lomir.svg';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();

  // Define navigation links accessible to all users
  const publicLinks = [
    { to: "/", label: "Home" },
    { to: "/teams", label: "Teams" },
    { to: "/garden", label: "Garden", hideOnMobile: true },
    { to: "/badges", label: "Badges", hideOnTablet: true }
  ];

  // Define navigation links only for authenticated users
  const privateLinks = [
    { to: "/teams/my-teams", label: "My Teams" }
  ];

  // Links for the dropdown menu for authenticated users
  const dropdownLinks = [
    { to: "/profile", label: "Profile" },
    { to: "/teams/my-teams", label: "My Teams" },
    { to: "/settings", label: "Settings" }
  ];

  return (
    <div className="navbar glass-navbar sticky top-0 z-10">
      <div className="content-container flex justify-between">
        {/* Logo - Left aligned */}
        <div className="flex-none">
          <Link to="/" className="flex items-center">
            <img src={LomirLogo} alt="Lomir Logo" className="h-6 sm:h-8 mr-2" />
            <span className="text-primary font-medium text-lg sm:text-xl tracking-wide">Lomir</span>
          </Link>
        </div>
        
        {/* All other elements - Right aligned */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Navigation Links - Responsive sizes */}
          <ul className="menu menu-horizontal px-0 sm:px-1">
            {/* Display public links for all users */}
            {publicLinks.map((link) => (
              <li key={link.to} className={`${link.hideOnMobile ? 'hidden sm:block' : ''} ${link.hideOnTablet ? 'hidden md:block' : ''}`}>
                <Link 
                  to={link.to} 
                  className="px-2 sm:px-3 py-1 sm:py-2 text-sm sm:text-base hover:bg-white/30 hover:text-primary transition-colors rounded-md"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            
            {/* Display private links only for authenticated users */}
            {isAuthenticated && privateLinks.map((link) => (
              <li key={link.to} className={`${link.hideOnMobile ? 'hidden sm:block' : ''} ${link.hideOnTablet ? 'hidden md:block' : ''}`}>
                <Link 
                  to={link.to} 
                  className="px-2 sm:px-3 py-1 sm:py-2 text-sm sm:text-base hover:bg-white/30 hover:text-primary transition-colors rounded-md"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          
          {/* Authentication Buttons */}
          {isAuthenticated ? (
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-circle avatar bg-primary text-white btn-sm sm:btn-md">
                <div className="rounded-full flex items-center justify-center">
                  <span>{user.firstName?.charAt(0) || user.username?.charAt(0) || '?'}</span>
                </div>
              </label>
              <ul tabIndex={0} className="mt-3 z-[1] p-2 glass-navbar shadow-lg menu menu-sm dropdown-content rounded-lg w-52">
                {/* Display dropdown links for authenticated users */}
                {dropdownLinks.map((link) => (
                  <li key={`dropdown-${link.to}`}>
                    <Link to={link.to}>{link.label}</Link>
                  </li>
                ))}
                
                {/* Show Garden and Badges on small screens */}
                {publicLinks.map((link) => (
                  (link.hideOnMobile || link.hideOnTablet) && (
                    <li key={`dropdown-${link.to}`} className={`${link.hideOnMobile ? 'sm:hidden' : ''} ${link.hideOnTablet ? 'md:hidden' : ''}`}>
                      <Link to={link.to}>{link.label}</Link>
                    </li>
                  )
                ))}
                
                <li><button onClick={logout}>Logout</button></li>
              </ul>
            </div>
          ) : (
            <div className="flex gap-1 sm:gap-2">
              <Link to="/login" className="btn btn-outline btn-primary btn-xs sm:btn-sm">Login</Link>
              <Link to="/register" className="btn btn-primary btn-xs sm:btn-sm">Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;