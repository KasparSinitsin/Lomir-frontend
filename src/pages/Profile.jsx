import { useAuth } from '../contexts/AuthContext';
import PageContainer from '../components/layout/PageContainer';
import { Link } from 'react-router-dom';

const Profile = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <PageContainer>
        <div className="alert alert-error">
          <span>User not found. Please login again.</span>
        </div>
        <div className="mt-4">
          <Link to="/login" className="btn btn-primary">Go to Login</Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="card bg-base-100 shadow-xl mx-auto max-w-2xl">
        <div className="card-body">
          <div className="flex justify-between items-center">
            <h2 className="card-title text-2xl">My Profile</h2>
            <button className="btn btn-outline btn-sm" onClick={logout}>
              Logout
            </button>
          </div>
          
          <div className="divider"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <div className="avatar placeholder">
                <div className="bg-neutral-focus text-neutral-content rounded-full w-24">
                  <span className="text-3xl">{user.firstName?.charAt(0) || user.username?.charAt(0) || '?'}</span>
                </div>
              </div>
            </div>
            
            <div className="md:col-span-2">
              <h3 className="text-xl font-bold">{user.firstName} {user.lastName}</h3>
              <p className="text-sm opacity-70">@{user.username}</p>
              
              <div className="mt-4">
                <p className="mb-2"><strong>Email:</strong> {user.email}</p>
                {user.postalCode && (
                  <p className="mb-2"><strong>Location:</strong> {user.postalCode}</p>
                )}
                
                {user.bio && (
                  <div className="mt-4">
                    <h4 className="font-bold mb-2">Bio</h4>
                    <p>{user.bio}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="card-actions justify-end mt-6">
            <Link to="/profile/edit" className="btn btn-primary">
              Edit Profile
            </Link>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Profile;