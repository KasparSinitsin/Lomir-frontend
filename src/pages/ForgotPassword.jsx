import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import FormGroup from "../components/common/FormGroup";
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle, submitting, success, error
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
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
          "If an account exists with this email, a password reset link has been sent.",
      );
    } catch (error) {
      console.error("Forgot password error:", error);
      setStatus("error");
      setMessage(
        error.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    }
  };

  // Success state
  if (status === "success") {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card className="w-full">
          <div className="card-body text-center py-10 px-8">
            <CheckCircle size={56} className="mx-auto mb-4 text-success" />

            <h2 className="card-title text-2xl font-bold justify-center mb-3">
              Check your email
            </h2>

            <p className="text-base-content/70 mb-6">{message}</p>

            <p className="text-sm text-base-content/60 mb-8">
              Didn't receive the email? Check your spam folder or try again with
              a different email address.
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
                Try another email
              </Button>

              <Link to="/login" className="w-full block">
                <Button variant="ghost" fullWidth>
                  <ArrowLeft size={16} className="mr-2" />
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
            <Mail size={48} className="mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold text-primary">
              Forgot Password?
            </h2>
            <p className="text-base-content/70 mt-2">
              No worries! Enter your email and we'll send you a reset link.
            </p>
          </div>

          {status === "error" && (
            <div className="alert alert-error mb-6">
              <AlertCircle size={20} />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <FormGroup
              label="Email Address"
              htmlFor="email"
              error={errors.email}
              required
            >
              <input
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email"
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
                {status === "submitting" ? "Sending..." : "Send Reset Link"}
              </Button>
            </div>
          </form>

          <div className="divider my-6">OR</div>

          <div className="text-center space-y-2">
            <p className="text-base-content/70">Remember your password?</p>
            <Link to="/login" className="link link-primary">
              Back to Login
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ForgotPassword;
