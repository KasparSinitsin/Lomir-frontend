import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="navbar bg-base-100 shadow-sm border-b border-base-200 sticky top-0 z-10">
      <div className="navbar-start">
        <div className="dropdown">
          <label tabIndex={0} className="btn btn-ghost lg:hidden">
          <img src="public/assets/images/Lomir.svg" alt="Lomir Logo" height="30"></img>
          </label>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow-soft bg-base-100 rounded-lg w-52">
            <li><Link to="/">Home</Link></li>
            {isAuthenticated ? (
              <>
                <li><Link to="/teams">Teams</Link></li>
                <li><Link to="/garden">Project Garden</Link></li>
                <li><Link to="/badges">Badges</Link></li>
              </>
            ) : (
              <li><Link to="/garden">Project Garden</Link></li>
            )}
          </ul>
        </div>
        <Link to="/" className="btn btn-ghost normal-case text-xl text-primary font-medium">
          <span className="text-primary tracking-wide">Lomir</span>
        </Link> 
      </div>
      
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
          {isAuthenticated ? (
            <>
              <li><Link to="/teams" className="hover:text-primary transition-colors">Teams</Link></li>
              <li><Link to="/garden" className="hover:text-primary transition-colors">Project Garden</Link></li>
              <li><Link to="/badges" className="hover:text-primary transition-colors">Badges</Link></li>
            </>
          ) : (
            <li><Link to="/garden" className="hover:text-primary transition-colors">Project Garden</Link></li>
          )}
        </ul>
      </div>
      
      <div className="navbar-end">
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
                  onClick={(e) => {
                    e.preventDefault();
                    logout();
                  }}
                >
                  Logout
                </button>
              </li>
            </ul>
          </div>
        ) : (
          <Link to="/login" className="btn btn-primary">Login</Link>
        )}
      </div>
    </div>
  );
};

export default Navbar;