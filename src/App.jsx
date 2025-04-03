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

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/badges" element={<BadgeOverview />} />
              <Route path="/garden" element={<Placeholder pageName="Project Garden" />} />
              
              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/edit" element={<Placeholder pageName="Edit Profile" />} />
                <Route path="/teams" element={<Placeholder pageName="Teams" />} />
                <Route path="/teams/create" element={<CreateTeam />} />
                <Route path="/settings" element={<Placeholder pageName="Settings" />} />
              </Route>
              
              {/* Catch-all route */}
              <Route path="*" element={<Placeholder pageName="Page Not Found" />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;