import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Placeholder from './components/common/Placeholder';

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Placeholder pageName="Login" />} />
            <Route path="/register" element={<Placeholder pageName="Register" />} />
            <Route path="/profile" element={<Placeholder pageName="Profile" />} />
            <Route path="/teams" element={<Placeholder pageName="Teams" />} />
            <Route path="/garden" element={<Placeholder pageName="Project Garden" />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;