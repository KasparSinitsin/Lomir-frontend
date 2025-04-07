import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LomirLogo from '../../assets/images/Lomir.svg';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="navbar bg-base-100 shadow-sm border-b border-base-200 sticky top-0 z-10">
      <div className="container mx-auto flex justify-between">
        {/* Logo - Left aligned */}
        <div className="flex-none">
          <Link to="/" className="flex items-center">
            <img src={LomirLogo} alt="Lomir Logo" className="h-8 mr-2" />
            <span className="text-primary font-medium text-xl tracking-wide">Lomir</span>
          </Link>
        </div>
        
        {/* All other elements - Right aligned */}
        <div className="flex items-center gap-4">
          {/* Desktop Navigation Links */}
          <ul className="menu menu-horizontal px-1 hidden lg:flex">
            <li><Link to="/" className="hover:bg-secondary hover:text-primary transition-colors">Home</Link></li>
            {isAuthenticated ? (
              <>
                <li><Link to="/teams" className="hover:bg-secondary hover:text-primary transition-colors">Teams</Link></li>
                <li><Link to="/garden" className="hover:bg-secondary hover:text-primary transition-colors">Project Garden</Link></li>
                <li><Link to="/badges" className="hover:bg-secondary hover:text-primary transition-colors">Badges</Link></li>
              </>
            ) : (
              <li><Link to="/garden" className="hover:bg-secondary hover:text-primary transition-colors">Project Garden</Link></li>
            )}
          </ul>
          
          {/* Authentication Buttons */}
          {isAuthenticated ? (
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-circle avatar bg-primary text-white">
                <div className="rounded-full flex items-center justify-center">
                  <span>{user.firstName?.charAt(0) || user.username?.charAt(0) || '?'}</span>
                </div>
              </label>
              <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow-soft menu menu-sm dropdown-content bg-base-100 rounded-lg w-52">
                <li>
                  <Link to="/profile" className="justify-between hover:bg-secondary hover:text-primary transition-colors">
                    Profile
                  </Link>
                </li>
                <li><Link to="/settings" className="hover:bg-secondary hover:text-primary transition-colors">Settings</Link></li>
                <li>
                  <button 
                    className="w-full text-left hover:bg-secondary hover:text-primary transition-colors" 
                    onClick={logout}
                  >
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link to="/login" className="btn btn-outline btn-primary">Login</Link>
              <Link to="/register" className="btn btn-primary">Sign Up</Link>
            </div>
          )}
          
          {/* Mobile menu button */}
          <div className="lg:hidden">
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </label>
              <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow-soft bg-base-100 rounded-lg w-52 right-0">
                <li><Link to="/">Home</Link></li>
                {isAuthenticated ? (
                  <>
                    <li><Link to="/teams">Teams</Link></li>
                    <li><Link to="/garden">Project Garden</Link></li>
                    <li><Link to="/badges">Badges</Link></li>
                    <li><Link to="/profile">Profile</Link></li>
                    <li><Link to="/settings">Settings</Link></li>
                    <li><button onClick={logout}>Logout</button></li>
                  </>
                ) : (
                  <>
                    <li><Link to="/garden">Project Garden</Link></li>
                    <li><Link to="/login">Login</Link></li>
                    <li><Link to="/register">Sign Up</Link></li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;