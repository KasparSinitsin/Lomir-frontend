import React from "react";
import Chat from "./pages/Chat";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { UserModalProvider } from "./contexts/UserModalContext";
import { TeamModalProvider } from "./contexts/TeamModalContext";
import { ToastProvider } from "./contexts/ToastContext";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import Placeholder from "./components/common/Placeholder";
import MessageNotifications from "./components/chat/MessageNotifications";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import VerifyEmail from "./pages/VerifyEmail";
import VerifyEmailChange from "./pages/VerifyEmailChange";
import BadgeOverview from "./pages/BadgeOverview";
import MyTeams from "./pages/MyTeams";
import SearchPage from "./pages/SearchPage";
import DesignSystem from "./pages/DesignSystem";
import "./index.css";
import backgroundImage from "./assets/images/Gradient-peach-yellow-violet-inverted-light.svg";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";
import Contact from "./pages/Contact";
import LegalPage from "./pages/LegalPage";

function AppLayout() {
  const location = useLocation();

  const isAuthPage = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/verify-email-change",
  ].includes(location.pathname);

  return (
    <ToastProvider>
    <TeamModalProvider>
      <UserModalProvider>
        <div
          data-theme="light"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
            backgroundRepeat: "no-repeat",
          }}
          className="min-h-screen flex flex-col"
        >
          <Navbar />
          <main className="flex-grow py-6">
            <div className={isAuthPage ? "w-full bg-transparent" : "content-container"}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route
                  path="/verify-email-change"
                  element={<VerifyEmailChange />}
                />
                <Route path="/badges" element={<BadgeOverview />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/about" element={<LegalPage type="about" />} />
                <Route path="/terms" element={<LegalPage type="terms" />} />
                <Route path="/privacy" element={<LegalPage type="privacy" />} />
                <Route
                  path="/legal-notice"
                  element={<LegalPage type="legalNotice" />}
                />
                <Route
                  path="/garden"
                  element={<Placeholder pageName="Project Garden" />}
                />
                <Route path="/teams" element={<Placeholder pageName="Teams" />} />
                <Route path="/search" element={<SearchPage />} />
                {import.meta.env.DEV && (
                  <Route path="/design-system" element={<DesignSystem />} />
                )}
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/profile/:id" element={<PublicProfile />} />

                {/* Protected routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/profile" element={<Profile />} />
                  <Route
                    path="/profile/edit"
                    element={<Placeholder pageName="Edit Profile" />}
                  />
                  <Route path="/teams/my-teams" element={<MyTeams />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/chat/:conversationId" element={<Chat />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>

                {/* Catch-all route */}
                <Route
                  path="*"
                  element={<Placeholder pageName="Page Not Found" />}
                />
              </Routes>

              <MessageNotifications />
            </div>
          </main>
          <Footer />
        </div>
      </UserModalProvider>
    </TeamModalProvider>
    </ToastProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout />
      </Router>
    </AuthProvider>
  );
}

export default App;
