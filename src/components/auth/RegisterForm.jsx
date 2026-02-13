import axios from "axios";
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { UI_TEXT } from "../../constants/uiText";
import TagInput from "../tags/TagInput";
import Card from "../common/Card";
import Button from "../common/Button";
import FormGroup from "../common/FormGroup";
import { Tag, MailCheck } from "lucide-react";
import ImageUploader from "../common/ImageUploader";
import { uploadToCloudinary } from "../../config/cloudinary";
import api from "../../services/api";
import LocationInput from "../common/LocationInput";
import { useLocationAutoFill } from "../../hooks/useLocationAutoFill";

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
    city: "",
    country: "",
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

  // Location auto-fill hook
  const { getSuggestedUpdates } = useLocationAutoFill({
    postalCode: formData.postal_code || "",
    city: formData.city || "",
    country: formData.country || "",
    isEditing: true,
    isRemote: false,
  });

  // Auto-fill city and country from postal code lookup
  useEffect(() => {
    const updates = getSuggestedUpdates();
    if (Object.keys(updates).length > 0) {
      // Map camelCase updates to snake_case for this form
      const mappedUpdates = {};
      if (updates.city) mappedUpdates.city = updates.city;
      if (updates.country) mappedUpdates.country = updates.country;

      if (Object.keys(mappedUpdates).length > 0) {
        setFormData((prev) => ({ ...prev, ...mappedUpdates }));
      }
    }
  }, [getSuggestedUpdates]);

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
        city: formData.city || "",
        country: formData.country || "",
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

  // Show success message after registration
  if (registrationSuccess) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="w-full">
          <div className="card-body items-center text-center">
            <MailCheck className="w-16 h-16 text-success mb-4" />
            <h2 className="card-title text-2xl font-bold mb-2">
              Check your email
            </h2>
            <p className="text-base-content/70 mb-4">
              We've sent a verification link to{" "}
              <span className="font-medium">{formData.email}</span>
            </p>
            <p className="text-sm text-base-content/60 mb-6">
              Please click the link in the email to verify your account. The
              link will expire in 24 hours.
            </p>

            {resendMessage && (
              <div
                className={`alert ${resendStatus === "sent" ? "alert-success" : "alert-error"} mb-4`}
              >
                <span>{resendMessage}</span>
              </div>
            )}

            <div className="flex flex-col gap-2 w-full">
              <Link to="/login" className="btn btn-primary w-full">
                Go to Login
              </Link>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
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

            {/* Location Section */}
            <LocationInput
              formData={{
                postal_code: formData.postal_code,
                city: formData.city,
                country: formData.country,
              }}
              onChange={handleChange}
              errors={{
                postal_code: errors.postal_code,
                city: errors.city,
                country: errors.country,
              }}
              disabled={isSubmitting}
              showRemoteToggle={false}
              showDivider={true}
              dividerText="Location"
            />

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
                previewSize="md"
                previewShape="circle"
                fallbackInitials={getUserInitialsFromForm()}
                label="Profile Picture"
              />
            </div>

            {/* Focus Areas Section */}
            <div className="divider text-sm text-base-content/60">
              <Tag size={14} className="mr-1" />
              {UI_TEXT.focusAreas.registerTitle}
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">
                  {UI_TEXT.focusAreas.registerDescription}
                </span>
              </label>

              <TagInput
                selectedTags={formData.selectedTags}
                onTagsChange={handleTagsChange}
                placeholder={UI_TEXT.focusAreas.searchPlaceholder}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-6"
              disabled={isSubmitting}
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

            <p className="text-center text-sm mt-4">
              Already have an account?{" "}
              <Link to="/login" className="link link-primary">
                Login
              </Link>
            </p>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default RegisterForm;
