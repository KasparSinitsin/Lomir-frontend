import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Placeholder from './components/common/Placeholder';
import BadgeOverview from './pages/BadgeOverview';

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Placeholder pageName="Profile" />} />
            <Route path="/teams" element={<Placeholder pageName="Teams" />} />
            <Route path="/garden" element={<Placeholder pageName="Project Garden" />} />
            <Route path="/badges" element={<BadgeOverview />} /> {/* delete this if not needed */}
            <Route path="*" element={<Placeholder pageName="Page Not Found" />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;