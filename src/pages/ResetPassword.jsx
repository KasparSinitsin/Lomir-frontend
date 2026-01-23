import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
      setMessage(
        "No reset token found. Please request a new password reset link.",
      );
    }
  }, [token]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
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
          response.data.message || "Your password has been reset successfully!",
        );
      }
    } catch (error) {
      console.error("Reset password error:", error);
      setStatus("error");
      setMessage(
        error.response?.data?.message ||
          "Failed to reset password. The link may be invalid or expired.",
      );
    }
  };

  // No token state
  if (!token && status !== "error") {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card className="w-full">
          <div className="card-body text-center py-10 px-8">
            <XCircle size={56} className="mx-auto mb-4 text-error" />
            <h2 className="card-title text-2xl font-bold justify-center mb-3">
              Invalid Link
            </h2>
            <p className="text-base-content/70 mb-8">
              No reset token found. Please request a new password reset link.
            </p>
            <Link to="/forgot-password" className="w-full">
              <Button variant="primary" fullWidth>
                Request New Link
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card className="w-full">
          <div className="card-body text-center py-10 px-8">
            <CheckCircle size={56} className="mx-auto mb-4 text-success" />

            <h2 className="card-title text-2xl font-bold justify-center mb-3">
              Password Reset!
            </h2>

            <p className="text-base-content/70 mb-8">{message}</p>

            <Link to="/login" className="w-full">
              <Button variant="primary" fullWidth>
                Log in with new password
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Error state (invalid/expired token)
  if (status === "error") {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card className="w-full">
          <div className="card-body text-center py-10 px-8">
            <XCircle size={56} className="mx-auto mb-4 text-error" />

            <h2 className="card-title text-2xl font-bold justify-center mb-3">
              Reset Failed
            </h2>

            <p className="text-base-content/70 mb-8">{message}</p>

            <div className="space-y-3">
              <Link to="/forgot-password" className="w-full block">
                <Button variant="primary" fullWidth>
                  Request New Reset Link
                </Button>
              </Link>
              <Link to="/login" className="w-full block">
                <Button variant="ghost" fullWidth>
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Form state
  return (
    <div className="max-w-md mx-auto w-full">
      <Card>
        <div className="card-body">
          <div className="text-center mb-6">
            <KeyRound size={48} className="mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold text-primary">
              Create New Password
            </h2>
            <p className="text-base-content/70 mt-2">
              Enter your new password below.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <FormGroup
              label="New Password"
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
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </FormGroup>

            <FormGroup
              label="Confirm New Password"
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
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </div>
          </form>

          <div className="text-center mt-6">
            <Link to="/login" className="link link-primary text-sm">
              Back to Login
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ResetPassword;
