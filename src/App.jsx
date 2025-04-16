import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Placeholder from './components/common/Placeholder';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import BadgeOverview from './pages/BadgeOverview';
import CreateTeam from './pages/CreateTeam';
import MyTeams from './pages/MyTeams';
import SearchPage from './pages/SearchPage';
import DesignSystem from './pages/DesignSystem';
import './index.css';

import backgroundImage from './assets/images/Gradient_4.jpg'; // Import the image

function App() {
  return (
    <AuthProvider>
      <Router>
        <div data-theme="lomirlite" style={{ backgroundImage: `url(${backgroundImage})` }} className="min-h-screen flex flex-col">
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
                  {/* <Route path="/profile/edit" element={<Placeholder pageName="Edit Profile" />} /> */}
                  <Route path="/profile/edit" element={<EditProfile />} />
                  <Route path="/teams/create" element={<CreateTeam />} />
                  <Route path="/teams/my-teams" element={<MyTeams />} />
                  <Route path="/settings" element={<Placeholder pageName="Settings" />} />
                </Route>

                {/* Catch-all route */}
                <Route path="*" element={<Placeholder pageName="Page Not Found" />} />
              </Routes>
            </div>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;