import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Placeholder from './components/common/Placeholder';
import MessageNotifications from './components/chat/MessageNotifications';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import BadgeOverview from './pages/BadgeOverview';
import CreateTeam from './pages/CreateTeam';
import MyTeams from './pages/MyTeams';
import SearchPage from './pages/SearchPage';
import DesignSystem from './pages/DesignSystem';
import './index.css';

import backgroundImage from './assets/images/Gradient-peach-yellow-violet-inverted-light.svg'; 

function App() {
  return (
    <AuthProvider>
      <Router>
      <div data-theme="lomirlite" 
 style={{ 
  backgroundImage: `url(${backgroundImage})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundAttachment: 'fixed',
  backgroundRepeat: 'no-repeat'
}} 
 className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-grow py-6">
            <div className="content-container">
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/badges" element={<BadgeOverview />} />
                <Route path="/garden" element={<Placeholder pageName="Project Garden" />} />
                <Route path="/teams" element={<Placeholder pageName="Teams" />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/design-system" element={<DesignSystem />} />

                {/* Protected routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/edit" element={<Placeholder pageName="Edit Profile" />} />
                  <Route path="/teams/create" element={<CreateTeam />} />
                  <Route path="/teams/my-teams" element={<MyTeams />} />
                  <Route path="/settings" element={<Placeholder pageName="Settings" />} />
                </Route>

                {/* Catch-all route */}
                <Route path="*" element={<Placeholder pageName="Page Not Found" />} />
              </Routes>

<MessageNotifications />

            </div>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;