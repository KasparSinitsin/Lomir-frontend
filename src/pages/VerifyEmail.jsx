import { useCallback, useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { Loader2, BadgeCheck, Info, XCircle, MailCheck } from "lucide-react";

const VerifyEmail = () => {
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");
  const hasVerified = useRef(false);

  const verifyEmail = useCallback(async (token) => {
    try {
      const response = await api.get(`/api/auth/verify-email?token=${token}`);

      if (response.data.success) {
        setStatus("success");
        setMessage(t("auth:verifyEmail.successMessage"));
      }
    } catch (error) {
      console.error("Verification error:", error);

      if (error.response?.status === 400) {
        setStatus("info");
        setMessage(t("auth:verifyEmail.alreadyUsed"));
      } else {
        setStatus("error");
        setMessage(
          error.response?.data?.message ||
            t("auth:verifyEmail.fallbackError"),
        );
      }
    }
  }, [t]);

  useEffect(() => {
    const token = searchParams.get("token");
    if (hasVerified.current) return;

    if (token) {
      hasVerified.current = true;
      verifyEmail(token);
    } else {
      setStatus("error");
      setMessage(t("auth:verifyEmail.missingToken"));
    }
  }, [searchParams, t, verifyEmail]);

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
    if (status === "verifying") return t("auth:verifyEmail.title.verifying");
    if (status === "success") return t("auth:verifyEmail.title.success");
    if (status === "info") return t("auth:verifyEmail.title.info");
    return t("auth:verifyEmail.title.error");
  };

  const renderBodyText = () => {
    if (status === "verifying") return t("auth:verifyEmail.body.verifying");
    if (status === "success")
      return t("auth:verifyEmail.body.success");
    if (status === "info")
      return t("auth:verifyEmail.body.info");
    return (
      <>
        {message}
        <br />
        <span className="text-sm mt-2 block">
          {t("auth:verifyEmail.body.expired")}
        </span>
      </>
    );
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
                {t("auth:verifyEmail.loginToAccount")}
              </Button>
            </Link>
          )}

          {status === "info" && (
            <Link to="/login" className="w-full">
              <Button variant="primary" fullWidth>
                {t("auth:common.goToLogin")}
              </Button>
            </Link>
          )}

          {status === "error" && (
            <div className="space-y-3">
              <Link to="/login" className="w-full">
                <Button variant="primary" fullWidth>
                  {t("auth:verifyEmail.tryLogin")}
                </Button>
              </Link>
              <Link to="/register" className="w-full">
                <Button variant="ghost" fullWidth>
                  {t("auth:verifyEmail.createNewAccount")}
                </Button>
              </Link>
            </div>
          )}

          {status === "verifying" && (
            <div className="mt-2 text-sm text-base-content/60 flex items-center justify-center gap-2">
              <MailCheck size={16} className="text-primary" />
              <span>{t("auth:verifyEmail.checking")}</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default VerifyEmail;
