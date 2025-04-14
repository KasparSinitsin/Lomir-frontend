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
            
          </Link>
        </div>

        {/* Navigation & Auth - Right aligned */}
        <div className="flex items-center gap-6"> {/* Increased gap here */}
          
          {/* Navigation Links */}
          <nav className="flex gap-4 text-sm sm:text-base">
            <Link to="/search" className="btn btn-sm neon-pomegranate px-4">Search</Link>
            <Link to="/" className="btn btn-sm neon-pomegranate px-4">Home</Link>
            <Link to="/teams" className="btn btn-sm neon-pomegranate px-4">Teams</Link>
            {isAuthenticated && (
              <>
                <Link to="/garden" className="btn btn-sm neon-pomegranate px-4">Garden</Link>
                <Link to="/badges" className="btn btn-sm neon-pomegranate px-4">Badges</Link>
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
                <li><Link to="/teams/my-teams">My Teams</Link></li>
                <li><Link to="/settings">Settings</Link></li>
                <li><button onClick={logout}>Logout</button></li>
              </ul>
            </div>
          ) : (
            <div className="flex gap-4"> {/* Increased gap here */}
              <Link to="/login" className="btn btn-outline btn-sm neon-pomegranate">Login</Link>
              <Link to="/register" className="btn btn-sm neon-pomegranate">Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;