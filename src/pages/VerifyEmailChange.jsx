import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BadgeCheck, Info, Loader2, MailCheck, XCircle } from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { useAuth } from "../contexts/AuthContext";
import userService from "../services/userService";

const VerifyEmailChange = () => {
  const { t } = useTranslation("auth");
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
      setMessage(t("auth:verifyEmailChange.missingToken"));
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
        setMessage(t("auth:verifyEmailChange.successMessage"));
      } catch (error) {
        console.error("Email change verification error:", error);

        if (error.response?.status === 409) {
          setStatus("info");
          setMessage(
            error.response?.data?.message ||
              t("auth:verifyEmailChange.conflictFallback"),
          );
          return;
        }

        setStatus("error");
        setMessage(
          error.response?.data?.message ||
            t("auth:verifyEmailChange.fallbackError"),
        );
      }
    };

    verifyEmailChange();
  }, [searchParams, t, updateUser, user]);

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
    if (status === "verifying") {
      return t("auth:verifyEmailChange.title.verifying");
    }
    if (status === "success") return t("auth:verifyEmailChange.title.success");
    if (status === "info") return t("auth:verifyEmailChange.title.info");
    return t("auth:verifyEmailChange.title.error");
  };

  const renderBodyText = () => {
    if (status === "verifying") {
      return t("auth:verifyEmailChange.body.verifying");
    }
    if (status === "success")
      return t("auth:verifyEmailChange.body.success");
    return message;
  };

  const primaryLink = user ? "/settings" : "/login";
  const primaryLabel = user
    ? t("auth:verifyEmailChange.backToSettings")
    : t("auth:common.login");

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
              <span>{t("auth:verifyEmailChange.checking")}</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default VerifyEmailChange;
