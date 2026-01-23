import axios from "axios";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import TagInputV2 from "../tags/TagInputV2";
import Card from "../common/Card";
import Button from "../common/Button";
import FormGroup from "../common/FormGroup";
import { Tag, MailCheck } from "lucide-react";
import ImageUploader from "../common/ImageUploader";
import { uploadToCloudinary } from "../../config/cloudinary";
import api from "../../services/api";

const RegisterForm = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
    bio: "",
    postal_code: "",
    profile_image: null,
    selectedTags: [],
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [resendStatus, setResendStatus] = useState("idle"); // 'idle' | 'sending' | 'sent' | 'error'
  const [resendMessage, setResendMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username) {
      newErrors.username = "Username is required";
    }
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Confirm Password is required";
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

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const getUserInitialsFromForm = () => {
    const first = formData.first_name?.charAt(0) || "";
    const last = formData.last_name?.charAt(0) || "";
    if (first || last) {
      return (first + last).toUpperCase();
    }
    return formData.username?.charAt(0)?.toUpperCase() || "?";
  };

  const handleTagsChange = (newTags) => {
    setFormData({
      ...formData,
      selectedTags: newTags,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const userData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name || "",
        last_name: formData.last_name || "",
        bio: formData.bio || "",
        postal_code: formData.postal_code || "",
        // Backend only expects tag_id (experience_level and interest_level are commented out in schema)
        tags:
          formData.selectedTags.length > 0
            ? formData.selectedTags.map((tagId) => ({
                tag_id: Number(tagId),
              }))
            : [],
      };

      if (formData.profile_image) {
        const uploadResult = await uploadToCloudinary(
          formData.profile_image,
          "avatars",
        );

        if (uploadResult.success) {
          userData.avatar_url = uploadResult.url;
        } else {
          console.error("Avatar upload failed:", uploadResult.error);
          // Continue with registration without avatar
        }
      }

      const result = await register(userData);

      if (result.success) {
        if (result.requiresVerification) {
          // Show verification message instead of redirecting
          setRegistrationSuccess(true);
        } else {
          // Fallback for if verification is not required
          localStorage.setItem(
            "registrationMessage",
            "Profile created successfully!",
          );
          navigate("/profile");
        }
      } else {
        setErrors((prev) => ({
          ...prev,
          form: result.message,
        }));
      }
    } catch (error) {
      console.error("Full Registration error:", error);
      setErrors((prev) => ({
        ...prev,
        form: error.response?.data?.message || "Registration failed.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    setResendStatus("sending");
    setResendMessage("");

    try {
      const response = await api.post("/api/auth/resend-verification", {
        email: formData.email,
      });

      setResendStatus("sent");
      setResendMessage("Verification email sent! Please check your inbox.");

      // Start 30 second cooldown
      setResendCooldown(30);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setResendStatus("idle");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      setResendStatus("error");
      setResendMessage(
        error.response?.data?.message ||
          "Failed to resend email. Please try again.",
      );
    }
  };

  // Show success message if registration completed
  if (registrationSuccess) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="w-full">
          <div className="card-body text-center py-10 px-8">
            <MailCheck size={56} className="mx-auto mb-4 text-primary" />
            <h2 className="card-title text-2xl font-bold justify-center mb-3">
              Check your email
            </h2>
            <p className="text-base-content/70 mb-3">
              We've sent a verification link to{" "}
              <strong>{formData.email}</strong>
            </p>
            <p className="text-sm text-base-content/60 mb-6">
              Click the link in the email to verify your account and complete
              registration. Don't forget to check your spam folder!
            </p>

            <div className="divider"></div>

            {/* Resend verification section */}
            <div className="text-sm text-base-content/60">
              <p className="mb-3">Didn't receive the email?</p>

              {resendStatus === "sent" && (
                <div className="alert alert-success mb-3">
                  <span className="text-white">{resendMessage}</span>
                </div>
              )}

              {resendStatus === "error" && (
                <div className="alert alert-error mb-3">
                  <span className="text-white">{resendMessage}</span>
                </div>
              )}

              <button
                className="btn btn-outline btn-primary btn-sm"
                onClick={handleResendVerification}
                disabled={resendStatus === "sending" || resendCooldown > 0}
              >
                {resendStatus === "sending" ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Sending...
                  </>
                ) : resendCooldown > 0 ? (
                  `Resend available in ${resendCooldown}s`
                ) : (
                  "Resend verification email"
                )}
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <Card className="w-full">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold text-center justify-center mb-2">
            Create Account
          </h2>
          <p className="text-center text-base-content/70 mb-4">
            Join Lomir and start building teams
          </p>

          {errors.form && (
            <div className="alert alert-error mb-4">
              <span>{errors.form}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Information Section */}
            <div className="divider text-sm text-base-content/60">
              Account Information
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">
                  Username <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                placeholder="Choose a username"
                className={`input input-bordered w-full ${
                  errors.username ? "input-error" : ""
                }`}
                value={formData.username}
                onChange={handleChange}
                name="username"
              />
              {errors.username && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.username}
                  </span>
                </label>
              )}
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">
                  Email <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                className={`input input-bordered w-full ${
                  errors.email ? "input-error" : ""
                }`}
                value={formData.email}
                onChange={handleChange}
                name="email"
              />
              {errors.email && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.email}
                  </span>
                </label>
              )}
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">
                  Password <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className={`input input-bordered w-full ${
                  errors.password ? "input-error" : ""
                }`}
                value={formData.password}
                onChange={handleChange}
                name="password"
              />
              {errors.password && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.password}
                  </span>
                </label>
              )}
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">
                  Confirm Password <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className={`input input-bordered w-full ${
                  errors.confirmPassword ? "input-error" : ""
                }`}
                value={formData.confirmPassword}
                onChange={handleChange}
                name="confirmPassword"
              />
              {errors.confirmPassword && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.confirmPassword}
                  </span>
                </label>
              )}
            </div>

            {/* Profile Details Section */}
            <div className="divider text-sm text-base-content/60">
              Profile Details
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">First Name</span>
                </label>
                <input
                  type="text"
                  placeholder="First Name"
                  className="input input-bordered w-full"
                  value={formData.first_name}
                  onChange={handleChange}
                  name="first_name"
                />
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Last Name</span>
                </label>
                <input
                  type="text"
                  placeholder="Last Name"
                  className="input input-bordered w-full"
                  value={formData.last_name}
                  onChange={handleChange}
                  name="last_name"
                />
              </div>
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Bio</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full"
                placeholder="Tell us a bit about yourself..."
                value={formData.bio}
                onChange={handleChange}
                name="bio"
                rows="3"
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Postal Code</span>
              </label>
              <input
                type="text"
                placeholder="e.g., 12345"
                className="input input-bordered w-full"
                value={formData.postal_code}
                onChange={handleChange}
                name="postal_code"
              />
            </div>

            {/* Profile Image Upload */}
            <div className="form-control w-full">
              <ImageUploader
                currentImage={imagePreview}
                onImageSelect={(file, previewUrl) => {
                  setFormData({
                    ...formData,
                    profile_image: file,
                  });
                  setImagePreview(previewUrl);
                }}
                onImageRemove={() => {
                  setFormData({
                    ...formData,
                    profile_image: null,
                  });
                  setImagePreview(null);
                }}
                fallbackText={getUserInitialsFromForm()}
                shape="circle"
                size="lg"
                label="Profile Image (Optional)"
                disabled={isSubmitting}
              />
            </div>

            {/* Skills & Interests Section */}
            <div className="divider text-sm text-base-content/60">
              Skills & Interests
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <Tag size={16} className="text-primary" />
                  Add your skills and interests
                </span>
              </label>
              <TagInputV2
                selectedTags={formData.selectedTags}
                onTagsChange={handleTagsChange}
                placeholder="Type to search tags..."
                showPopularTags={true}
                maxSuggestions={8}
              />
              <label className="label">
                <span className="label-text-alt text-base-content/60">
                  You can add or edit tags later in your profile
                </span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isSubmitting}
              className="mt-6"
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="divider my-6">OR</div>

          <div className="text-center">
            <p className="mb-2">Already have an account?</p>
            <Link to="/login" className="link link-primary">
              Login
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RegisterForm;
