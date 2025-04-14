import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LomirLogo from '../../assets/images/Lomir-logo.png';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="navbar glass-navbar sticky top-0 z-10">
      <div className="content-container flex justify-between items-center w-full">
        
        {/* Logo - Left aligned */}
        <div className="flex-none">
          <Link to="/" className="flex items-center">
            <img src={LomirLogo} alt="Lomir Logo" className="h-6 sm:h-8 mr-2" />
            <span className="text-lg font-semibold text-primary hidden sm:inline">Lomir</span>
          </Link>
        </div>

        {/* Navigation & Auth - Right aligned */}
        <div className="flex items-center space-x-6"> {/* Adjusted to ensure equal spacing */}
          
          {/* Navigation Links */}
          <nav className="flex space-x-4 text-sm sm:text-base"> {/* Use space-x-4 for consistent button spacing */}
            <Link to="/search" className="neon hover:text-violet-600 bg-transparent rounded-full px-4 py-1">Search</Link>
            <Link to="/teams/my-teams" className="neon hover:text-violet-600 bg-transparent rounded-full px-4 py-1">Teams</Link>
            {isAuthenticated && (
              <>
                <Link to="/garden" className="neon hover:text-violet-600 bg-transparent rounded-full px-4 py-1">Garden</Link>
                <Link to="/badges" className="neon hover:text-violet-600 bg-transparent rounded-full px-4 py-1">Badges</Link>
              </>
            )}
          </nav>

          {/* Auth Section */}
          {isAuthenticated ? (
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-circle avatar bg-primary text-white btn-sm sm:btn-md">
                <div className="rounded-full flex items-center justify-center text-sm sm:text-base">
                  <span>{user.firstName?.charAt(0) || user.username?.charAt(0) || '?'}</span>
                </div>
              </label>
              <ul
                tabIndex={0}
                className="mt-3 z-[1] p-2 shadow-lg glass-navbar menu menu-sm dropdown-content rounded-box w-52"
              >
                <li><Link to="/profile">Profile</Link></li>
                <li><Link to="/settings">Settings</Link></li>
                <li><button onClick={logout}>Logout</button></li>
              </ul>
            </div>
          ) : (
            <div className="flex space-x-4"> {/* Use space-x-4 for equal button spacing */}
              <Link to="/login" className="neon btn-outline btn-sm">Login</Link>
              <Link to="/register" className="neon btn-sm">Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;