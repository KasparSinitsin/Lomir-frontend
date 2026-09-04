import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import FormGroup from "../components/common/FormGroup";
import {
  Loader2,
  CheckCircle,
  XCircle,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";

const ResetPassword = () => {
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("idle"); // idle, submitting, success, error
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const token = searchParams.get("token");

  useEffect(() => {
    // Check if token exists in URL
    if (!token) {
      setStatus("error");
      setMessage(t("auth:resetPassword.invalidToken"));
    }
  }, [token, t]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.password) {
      newErrors.password = t("auth:resetPassword.errors.passwordRequired");
    } else if (formData.password.length < 8) {
      newErrors.password = t("auth:resetPassword.errors.passwordLength");
    } else if (
      !/[A-Za-z]/.test(formData.password) ||
      !/\d/.test(formData.password)
    ) {
      newErrors.password =
        t("auth:resetPassword.errors.passwordLetterNumber");
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t("auth:resetPassword.errors.confirmRequired");
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t("auth:resetPassword.errors.passwordsMismatch");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const response = await api.post("/api/auth/reset-password", {
        token,
        password: formData.password,
      });

      if (response.data.success) {
        setStatus("success");
        setMessage(
          response.data.message || t("auth:resetPassword.successFallback"),
        );
      }
    } catch (error) {
      console.error("Reset password error:", error);
      setStatus("error");
      setMessage(
        error.response?.data?.message ||
          t("auth:resetPassword.fallbackError"),
      );
    }
  };

  // No token state
  if (!token && status !== "error") {
    return (
      <div className="content-container">
        <div className="max-w-md mx-auto w-full">
          <Card>
            <div className="card-body text-center py-10 px-8">
              <XCircle size={56} className="mx-auto mb-4 text-error" />
              <h2 className="card-title text-2xl font-bold justify-center mb-3">
                {t("auth:resetPassword.invalidTitle")}
              </h2>
              <p className="text-base-content/70 mb-8">
                {t("auth:resetPassword.invalidToken")}
              </p>
              <Link to="/forgot-password" className="w-full">
                <Button variant="primary" fullWidth>
                  {t("auth:resetPassword.requestNew")}
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div className="content-container">
        <div className="max-w-md mx-auto w-full">
          <Card>
            <div className="card-body text-center py-10 px-8">
              <CheckCircle size={56} className="mx-auto mb-4 text-success" />

              <h2 className="card-title text-2xl font-bold justify-center mb-3">
                {t("auth:resetPassword.successTitle")}
              </h2>

              <p className="text-base-content/70 mb-8">{message}</p>

              <Link to="/login" className="w-full">
                <Button variant="primary" fullWidth>
                  {t("auth:resetPassword.loginWithNewPassword")}
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Error state (invalid/expired token)
  if (status === "error") {
    return (
      <div className="content-container">
        <div className="max-w-md mx-auto w-full">
          <Card>
            <div className="card-body text-center py-10 px-8">
              <XCircle size={56} className="mx-auto mb-4 text-error" />

              <h2 className="card-title text-2xl font-bold justify-center mb-3">
                {t("auth:resetPassword.errorTitle")}
              </h2>

              <p className="text-base-content/70 mb-8">{message}</p>

              <div className="space-y-3">
                <Link to="/forgot-password" className="w-full block">
                  <Button variant="primary" fullWidth>
                    {t("auth:resetPassword.requestNewReset")}
                  </Button>
                </Link>
                <Link to="/login" className="w-full block">
                  <Button variant="ghost" fullWidth>
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
      <div className="max-w-md mx-auto w-full">
        <Card>
          <div className="card-body">
            <div className="text-center mb-6">
              <KeyRound size={48} className="mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold text-primary">
                {t("auth:resetPassword.title")}
              </h2>
              <p className="text-base-content/70 mt-2">
                {t("auth:resetPassword.description")}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <FormGroup
                label={t("auth:common.newPassword")}
                htmlFor="password"
                error={errors.password}
                required
              >
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="••••••••"
                    className={`input input-bordered w-full pr-10 ${
                      errors.password ? "input-error" : ""
                    }`}
                    value={formData.password}
                    onChange={handleChange}
                    disabled={status === "submitting"}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword
                        ? t("auth:common.hidePassword")
                        : t("auth:common.showPassword")
                    }
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </FormGroup>

              <FormGroup
                label={t("auth:common.confirmNewPassword")}
                htmlFor="confirmPassword"
                error={errors.confirmPassword}
                required
              >
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="••••••••"
                    className={`input input-bordered w-full pr-10 ${
                      errors.confirmPassword ? "input-error" : ""
                    }`}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={status === "submitting"}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={
                      showConfirmPassword
                        ? t("auth:common.hidePassword")
                        : t("auth:common.showPassword")
                    }
                    aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>
              </FormGroup>

              <div className="mt-6">
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={status === "submitting"}
                >
                  {status === "submitting" ? (
                    <>
                      <Loader2 size={20} className="animate-spin mr-2" />
                      {t("auth:resetPassword.submitting")}
                    </>
                  ) : (
                    t("auth:resetPassword.submit")
                  )}
                </Button>
              </div>
            </form>

            <div className="text-center mt-6">
              <Link to="/login" className="link link-primary text-sm">
                {t("auth:common.backToLogin")}
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
