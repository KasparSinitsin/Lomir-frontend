import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../services/api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import {
  Loader2,
  BadgeCheck,
  Info,
  XCircle,
  MailCheck,
} from "lucide-react";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");
  const hasVerified = useRef(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (hasVerified.current) return;

    if (token) {
      hasVerified.current = true;
      verifyEmail(token);
    } else {
      setStatus("error");
      setMessage("No verification token found. Please check your email link.");
    }
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      const response = await api.get(`/api/auth/verify-email?token=${token}`);

      if (response.data.success) {
        setStatus("success");
        setMessage("Your email has been verified successfully!");

        const { token: authToken } = response.data.data;
        if (authToken) localStorage.setItem("token", authToken);
      }
    } catch (error) {
      console.error("Verification error:", error);

      if (error.response?.status === 400) {
        setStatus("info");
        setMessage(
          "This link has already been used. Your account may already be verified.",
        );
      } else {
        setStatus("error");
        setMessage(
          error.response?.data?.message ||
            "Verification failed. The link may be invalid or expired.",
        );
      }
    }
  };

  const renderIcon = () => {
    const base = "mx-auto mb-4";
    const size = 56;

    if (status === "verifying")
      return <Loader2 size={size} className={`${base} text-primary animate-spin`} />;
    if (status === "success")
      return <BadgeCheck size={size} className={`${base} text-success`} />;
    if (status === "info")
      return <Info size={size} className={`${base} text-info`} />;
    return <XCircle size={size} className={`${base} text-error`} />;
  };

  const renderTitle = () => {
    if (status === "verifying") return "Verifying your email…";
    if (status === "success") return "Email verified";
    if (status === "info") return "Already verified";
    return "Verification failed";
  };

  const renderBodyText = () => {
    if (status === "verifying") return "Please wait a moment.";
    if (status === "success")
      return "Your account is now active. You can log in with your credentials.";
    return message;
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card className="w-full">
        <div className="card-body text-center py-10 px-8">
          {renderIcon()}

          <h2 className="card-title text-2xl font-bold justify-center mb-3">
            {renderTitle()}
          </h2>

          <p className="text-base-content/70 mb-8">{renderBodyText()}</p>

          {status === "success" && (
            <Link to="/login" className="w-full">
              <Button variant="primary" fullWidth>
                Log in to my account
              </Button>
            </Link>
          )}

          {status === "info" && (
            <Link to="/login" className="w-full">
              <Button variant="primary" fullWidth>
                Go to Login
              </Button>
            </Link>
          )}

          {status === "error" && (
            <div className="space-y-3">
              <Link to="/login" className="w-full">
                <Button variant="primary" fullWidth>
                  Try Logging In
                </Button>
              </Link>
              <Link to="/register" className="w-full">
                <Button variant="ghost" fullWidth>
                  Create New Account
                </Button>
              </Link>
            </div>
          )}

          {status === "verifying" && (
            <div className="mt-2 text-sm text-base-content/60 flex items-center justify-center gap-2">
              <MailCheck size={16} className="text-primary" />
              <span>Checking your verification link…</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default VerifyEmail;
