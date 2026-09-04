import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import FormGroup from "../components/common/FormGroup";
import ScreenAlert from "../components/common/ScreenAlert";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

const ForgotPassword = () => {
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle, submitting, success, error
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = t("auth:forgotPassword.errors.emailRequired");
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t("auth:forgotPassword.errors.emailInvalid");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const response = await api.post("/api/auth/forgot-password", { email });

      setStatus("success");
      setMessage(
        response.data.message ||
          t("auth:forgotPassword.successFallback"),
      );
    } catch (error) {
      console.error("Forgot password error:", error);
      setStatus("error");
      setMessage(
        error.response?.data?.message ||
          t("auth:forgotPassword.errors.generic"),
      );
    }
  };

  const clearErrorMessage = () => {
    setStatus("idle");
    setMessage("");
  };

  // Success state
  if (status === "success") {
    return (
      <div className="content-container">
        <div className="max-w-md mx-auto w-full">
        <Card>
          <div className="card-body text-center py-10 px-8">
            <CheckCircle size={56} className="mx-auto mb-4 text-success" />

            <h2 className="card-title text-2xl font-bold justify-center mb-3">
              {t("auth:forgotPassword.successTitle")}
            </h2>

            <p className="text-base-content/70 mb-6">{message}</p>

            <p className="text-sm text-base-content/60 mb-8">
              {t("auth:forgotPassword.successHelp")}
            </p>

            <div className="space-y-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => {
                  setStatus("idle");
                  setEmail("");
                }}
              >
                {t("auth:forgotPassword.tryAnother")}
              </Button>

              <Link to="/login" className="w-full block">
                <Button variant="ghost" fullWidth>
                  <ArrowLeft size={16} className="mr-2" />
                  {t("auth:common.backToLogin")}
                </Button>
              </Link>
            </div>
          </div>
        </Card>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="content-container">
      <ScreenAlert
        type="error"
        message={status === "error" ? message : ""}
        onClose={clearErrorMessage}
      />
      <div className="max-w-md mx-auto w-full">
      <Card>
        <div className="card-body">
          <div className="text-center mb-6">
            <Mail size={48} className="mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold text-primary">
              {t("auth:forgotPassword.title")}
            </h2>
            <p className="text-base-content/70 mt-2">
              {t("auth:forgotPassword.description")}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <FormGroup
              label={t("auth:common.emailAddress")}
              htmlFor="email"
              error={errors.email}
              required
            >
              <input
                id="email"
                type="email"
                name="email"
                placeholder={t("auth:forgotPassword.placeholder")}
                className={`input input-bordered w-full ${
                  errors.email ? "input-error" : ""
                }`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "submitting"}
              />
            </FormGroup>

            <div className="mt-6">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={status === "submitting"}
              >
                {status === "submitting"
                  ? t("auth:forgotPassword.submitting")
                  : t("auth:forgotPassword.submit")}
              </Button>
            </div>
          </form>

          <div className="divider my-6">{t("auth:common.or")}</div>

          <div className="text-center space-y-2">
            <p className="text-base-content/70">
              {t("auth:forgotPassword.remember")}
            </p>
            <Link to="/login" className="link link-primary">
              {t("auth:common.backToLogin")}
            </Link>
          </div>
        </div>
      </Card>
    </div>
    </div>
  );
};

export default ForgotPassword;
