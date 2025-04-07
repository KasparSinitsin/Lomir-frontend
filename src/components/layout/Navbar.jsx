import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LomirLogo from '../../assets/images/Lomir.svg';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="navbar bg-base-100 shadow-sm border-b border-base-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 max-w-7xl flex justify-between">
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
            <li><Link to="/" className="px-2 sm:px-3 py-1 sm:py-2 text-sm sm:text-base hover:bg-secondary hover:text-primary transition-colors">Home</Link></li>
            {isAuthenticated ? (
              <>
                <li><Link to="/teams" className="px-2 sm:px-3 py-1 sm:py-2 text-sm sm:text-base hover:bg-secondary hover:text-primary transition-colors">Teams</Link></li>
                <li className="hidden sm:block"><Link to="/garden" className="px-2 sm:px-3 py-1 sm:py-2 text-sm sm:text-base hover:bg-secondary hover:text-primary transition-colors">Garden</Link></li>
                <li className="hidden md:block"><Link to="/badges" className="px-2 sm:px-3 py-1 sm:py-2 text-sm sm:text-base hover:bg-secondary hover:text-primary transition-colors">Badges</Link></li>
              </>
            ) : (
              <li className="hidden sm:block"><Link to="/garden" className="px-2 sm:px-3 py-1 sm:py-2 text-sm sm:text-base hover:bg-secondary hover:text-primary transition-colors">Garden</Link></li>
            )}
          </ul>
          
          {/* Authentication Buttons */}
          {isAuthenticated ? (
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-circle avatar bg-primary text-white btn-sm sm:btn-md">
                <div className="rounded-full flex items-center justify-center">
                  <span>{user.firstName?.charAt(0) || user.username?.charAt(0) || '?'}</span>
                </div>
              </label>
              <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow-soft menu menu-sm dropdown-content bg-base-100 rounded-lg w-52">
                <li><Link to="/profile">Profile</Link></li>
                <li><Link to="/settings">Settings</Link></li>
                <li className="sm:hidden"><Link to="/garden">Garden</Link></li>
                <li className="md:hidden"><Link to="/badges">Badges</Link></li>
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