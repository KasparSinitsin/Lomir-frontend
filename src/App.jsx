// src/App.jsx - Updated route configuration

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import BadgeOverview from './pages/BadgeOverview';
import Placeholder from './components/common/Placeholder';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import CreateTeam from './pages/CreateTeam';
import DesignSystem from './pages/DesignSystem'; 
import MyTeams from './pages/MyTeams';  

function App() {
  return (
    <AuthProvider>
      <Router>
        <div data-theme="lomirlite" className="min-h-screen flex flex-col bg-base-200">
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
            </div>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;