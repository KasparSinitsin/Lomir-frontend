import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Card from "../common/Card";
import Button from "../common/Button";
import FormGroup from "../common/FormGroup";
import Alert from "../common/Alert";
import { Eye, EyeOff } from "lucide-react";

const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password incomplete or wrong";
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
    if (errors[name] || errors.form) {
      setErrors((prev) => ({ ...prev, [name]: undefined, form: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(formData);

      if (result.success) {
        navigate("/profile");
      } else if (result.message === "Invalid email") {
        setErrors({ email: result.message });
      } else {
        setErrors({ password: result.message });
      }
    } catch (error) {
      setErrors({ form: "An unexpected error occurred. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full">
      <Card>
        <h2 className="card-title text-2xl font-bold text-center justify-center mt-6 mb-4 text-success">
          Login
        </h2>
        <p className="text-center text-base-content/70 mb-6">
          Welcome back to Lomir
        </p>

        {errors.form && (
          <Alert type="error" message={errors.form} className="mb-6 w-full shadow-sm" />
        )}

        <form onSubmit={handleSubmit} noValidate>
          <FormGroup
            label="Email"
            htmlFor="email"
            error={errors.email}
            required
          >
            <input
              id="email"
              type="email"
              name="email"
              placeholder="email@example.com"
              className={`input input-bordered w-full ${errors.email ? "input-error" : ""}`}
              value={formData.email}
              onChange={handleChange}
            />
          </FormGroup>

          <FormGroup
            label="Password"
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
                className={`input input-bordered w-full pr-12 ${errors.password ? "input-error" : ""}`}
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center px-3 text-base-content/60 transition-colors hover:text-base-content"
                onClick={() => setShowPassword((prev) => !prev)}
                onMouseDown={(e) => e.preventDefault()}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </FormGroup>

          <div className="text-right mt-1">
            <Link to="/forgot-password" className="link link-primary text-sm">
              Forgot password?
            </Link>
          </div>

          <div className="mt-6">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isSubmitting}
            >
              {isSubmitting ? "Logging in..." : "Login"}
            </Button>
          </div>
        </form>

        <div className="divider my-6">OR</div>

        <div className="text-center">
          <p className="mb-2">Don't have an account?</p>
          <Link to="/register" className="link link-primary">
            Register
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default LoginForm;
