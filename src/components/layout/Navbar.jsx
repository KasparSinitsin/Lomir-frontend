import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LomirLogo from '../src/assets/images/Lomir-logo.png'; 

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="navbar glass-navbar sticky top-0 z-10">
      <div className="content-container flex justify-between items-end w-full">
        {/* Logo - Left aligned */}
        <div className="flex-none">
          <Link to="/" className="flex items-end">
            <img src={LomirLogo} alt="Lomir Logo" className="h-6 sm:h-8 mr-2" />
          </Link>
        </div>
        
        {/* Navigation and Auth - Right aligned */}
        <div className="flex items-end gap-2">
          {/* Navigation Links */}
          <nav className="flex items-end">
            <Link to="/" className="px-3 text-sm sm:text-base hover:text-primary transition-colors">Home</Link>
            <Link to="/teams" className="px-3 text-sm sm:text-base hover:text-primary transition-colors">Teams</Link>
            <Link to="/garden" className="px-3 text-sm sm:text-base hover:text-primary transition-colors">Garden</Link>
            <Link to="/badges" className="px-3 text-sm sm:text-base hover:text-primary transition-colors">Badges</Link>
          </nav>
          
          {/* Authentication - consistently spaced from nav */}
          <div className="ml-6 flex items-end">
            {isAuthenticated ? (
              <div className="dropdown dropdown-end flex items-end">
                <label tabIndex={0} className="btn btn-ghost btn-circle avatar bg-primary text-white btn-sm sm:btn-md">
                  <div className="rounded-full flex items-center justify-center">
                    <span>{user.firstName?.charAt(0) || user.username?.charAt(0) || '?'}</span>
                  </div>
                </label>
                <div tabIndex={0} className="mt-3 z-[1] p-4 glass-navbar shadow-lg dropdown-content rounded-lg min-w-64">
                  <div className="flex items-center justify-center gap-4">
                    <Link to="/profile" className="px-2 py-1 hover:text-primary transition-colors">Profile</Link>
                    <Link to="/teams/my-teams" className="px-2 py-1 hover:text-primary transition-colors">My Teams</Link>
                    <Link to="/settings" className="px-2 py-1 hover:text-primary transition-colors">Settings</Link>
                    <button onClick={logout} className="px-2 py-1 hover:text-primary transition-colors">Logout</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 items-end">
                <Link to="/login" className="btn btn-outline btn-primary btn-xs sm:btn-sm">Login</Link>
                <Link to="/register" className="btn btn-primary btn-xs sm:btn-sm">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;