import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BadgeCheck, Info, Loader2, MailCheck, XCircle } from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { useAuth } from "../contexts/AuthContext";
import userService from "../services/userService";

const VerifyEmailChange = () => {
  const [searchParams] = useSearchParams();
  const { user, updateUser } = useAuth();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");
  const verifiedOnce = useRef(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (verifiedOnce.current) return;

    if (!token) {
      setStatus("error");
      setMessage("No verification token found. Please check your email link.");
      return;
    }

    verifiedOnce.current = true;

    const verifyEmailChange = async () => {
      try {
        const response = await userService.verifyEmailChange(token);
        const verifiedUser = response?.data?.user;

        if (user && verifiedUser?.email) {
          updateUser({
            email: verifiedUser.email,
            pendingEmail: null,
          });
        }

        setStatus("success");
        setMessage("Your email address has been changed successfully.");
      } catch (error) {
        console.error("Email change verification error:", error);

        if (error.response?.status === 409) {
          setStatus("info");
          setMessage(
            error.response?.data?.message ||
              "This email address is already in use.",
          );
          return;
        }

        setStatus("error");
        setMessage(
          error.response?.data?.message ||
            "Verification failed. The link may be invalid or expired.",
        );
      }
    };

    verifyEmailChange();
  }, [searchParams, updateUser, user]);

  const renderIcon = () => {
    const base = "mx-auto mb-4";
    const size = 56;

    if (status === "verifying")
      return (
        <Loader2 size={size} className={`${base} text-primary animate-spin`} />
      );
    if (status === "success")
      return <BadgeCheck size={size} className={`${base} text-success`} />;
    if (status === "info")
      return <Info size={size} className={`${base} text-info`} />;
    return <XCircle size={size} className={`${base} text-error`} />;
  };

  const renderTitle = () => {
    if (status === "verifying") return "Verifying your new email…";
    if (status === "success") return "Email changed";
    if (status === "info") return "Email not changed";
    return "Verification failed";
  };

  const renderBodyText = () => {
    if (status === "verifying") return "Please wait a moment.";
    if (status === "success")
      return "Your Lomir account now uses the confirmed email address.";
    return message;
  };

  const primaryLink = user ? "/settings" : "/login";
  const primaryLabel = user ? "Back to Settings" : "Log in";

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card className="w-full">
        <div className="card-body text-center py-10 px-8">
          {renderIcon()}

          <h2 className="card-title text-2xl font-bold justify-center mb-3">
            {renderTitle()}
          </h2>

          <p className="text-base-content/70 mb-8">{renderBodyText()}</p>

          {status !== "verifying" && (
            <Link to={primaryLink} className="w-full">
              <Button variant="primary" fullWidth>
                {primaryLabel}
              </Button>
            </Link>
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

export default VerifyEmailChange;
