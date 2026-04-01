import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { UI_TEXT } from "../../constants/uiText";
import TagInput from "../tags/TagInput";
import Card from "../common/Card";
import Button from "../common/Button";
import FormSectionDivider from "../common/FormSectionDivider";
import { Tag, MailCheck, KeyRound, User, Camera } from "lucide-react";
import ImageUploader from "../common/ImageUploader";
import { uploadToCloudinary } from "../../config/cloudinary";
import api from "../../services/api";
import LocationInput from "../common/LocationInput";
import { useLocationAutoFill } from "../../hooks/useLocationAutoFill";
import VisibilityToggle from "../common/VisibilityToggle";
import TurnstileWidget from "../common/TurnstileWidget";

const RegisterForm = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const hasTurnstile = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);

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
    isPublic: true,
    profile_image: null,
    selectedTags: [],
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const turnstileRef = useRef(null);

  const [resendStatus, setResendStatus] = useState("idle"); // 'idle' | 'sending' | 'sent' | 'error'
  const [resendMessage, setResendMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const { getSuggestedUpdates } = useLocationAutoFill({
    postalCode: formData.postal_code || "",
    city: formData.city || "",
    country: formData.country || "",
    isEditing: true,
    isRemote: false,
  });

  useEffect(() => {
    const updates = getSuggestedUpdates();
    if (Object.keys(updates).length > 0) {
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

    if (!formData.username) newErrors.username = "Username is required";

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (
      !/[A-Za-z]/.test(formData.password) ||
      !/\d/.test(formData.password)
    ) {
      newErrors.password =
        "Password must contain at least one letter and one number";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (hasTurnstile && !turnstileToken) {
      newErrors.turnstile = "Please complete the CAPTCHA verification";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleTagsChange = (tags) => {
    const normalized = (tags || [])
      .map((t) => (typeof t === "object" ? t.id : t))
      .map((id) => Number(id))
      .filter((n) => Number.isFinite(n));

    setFormData((prev) => ({
      ...prev,
      selectedTags: normalized,
    }));
  };

  const getUserInitialsFromForm = () => {
    const first = formData.first_name?.charAt(0) || "";
    const last = formData.last_name?.charAt(0) || "";
    if (first || last) return (first + last).toUpperCase();
    return formData.username?.charAt(0)?.toUpperCase() || "?";
  };

  const resetTurnstile = () => {
    turnstileRef.current?.reset();
    setTurnstileToken(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const userData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        bio: formData.bio,
        postal_code: formData.postal_code,
        city: formData.city,
        country: formData.country,
        tags:
          formData.selectedTags.length > 0
            ? formData.selectedTags
                .map((id) => Number(id))
                .filter((n) => Number.isFinite(n))
                .map((id) => ({ tag_id: id }))
            : [],
        ...(hasTurnstile ? { turnstile_token: turnstileToken } : {}),
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
        }
      }

      const result = await register(userData);

      if (result.success) {
        if (result.requiresVerification) {
          setRegistrationSuccess(true);
        } else {
          localStorage.setItem(
            "registrationMessage",
            "Profile created successfully!",
          );
          navigate("/profile");
        }
      } else {
        resetTurnstile();
        setErrors((prev) => ({
          ...prev,
          form: result.message,
        }));
      }
    } catch (error) {
      resetTurnstile();
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
      await api.post("/api/auth/resend-verification", {
        email: formData.email,
      });

      setResendStatus("sent");
      setResendMessage("Verification email sent! Please check your inbox.");

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

  if (registrationSuccess) {
    return (
      <div className="w-full px-4 sm:px-0">
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
                className={`alert ${
                  resendStatus === "sent" ? "alert-success" : "alert-error"
                } mb-4`}
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
    <div className="w-full">
      <Card className="w-full">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold text-center justify-center mb-2">
            Create Account
          </h2>
          <p className="text-center text-base-content/70 mb-6">
            Join Lomir and start building teams
          </p>

          {errors.form && (
            <div className="alert alert-error mb-4">
              <span>{errors.form}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-12">
            {/* Account Information */}
            <section className="space-y-4">
              <FormSectionDivider text="Account Information" icon={KeyRound} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">
                      Password <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    type="password"
                    placeholder="Min. 8 characters, with letters and numbers"
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
                    placeholder="Confirm your password"
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
              </div>
            </section>

            {/* Profile Details */}
            <section className="space-y-4">
              <FormSectionDivider text="Profile Details" icon={User} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <VisibilityToggle
                  name="isPublic"
                  checked={formData.isPublic}
                  onChange={handleChange}
                  label="Profile Visibility"
                  entityType="profile"
                />
              </div>
            </section>

            {/* Location */}
            <section>
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
            </section>

            {/* Profile Picture */}
            <section className="space-y-4">
              <FormSectionDivider text="Profile Picture" icon={Camera} />

              <div className="flex justify-center">
                <div className="w-full max-w-md">
                  <ImageUploader
                    currentImage={imagePreview}
                    onImageSelect={(file, previewUrl) => {
                      setFormData((prev) => ({ ...prev, profile_image: file }));
                      setImagePreview(previewUrl);
                    }}
                    onImageRemove={() => {
                      setFormData((prev) => ({ ...prev, profile_image: null }));
                      setImagePreview(null);
                    }}
                    size="mdPlus"
                    shape="circle"
                    fallbackText={getUserInitialsFromForm()}
                  />
                </div>
              </div>
            </section>

            {/* Focus Areas */}
            <section className="space-y-4">
              <FormSectionDivider
                text={UI_TEXT.focusAreas.registerTitle}
                icon={Tag}
              />

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">
                    Select focus areas matching your interests and skills
                  </span>
                </label>

                <TagInput
                  selectedTags={formData.selectedTags}
                  onTagsChange={handleTagsChange}
                  placeholder="Click a popular focus area or start typing to search"
                />
              </div>
            </section>

            <div className="divider mt-12 mb-0"></div>

            <section className="space-y-4 !mt-4">
              {hasTurnstile && (
                <div className="form-control w-full">
                  <div className="flex justify-center">
                    <TurnstileWidget
                      ref={turnstileRef}
                      onVerify={(token) => {
                        setTurnstileToken(token);
                        setErrors((prev) => {
                          if (!prev.turnstile) {
                            return prev;
                          }

                          const remainingErrors = { ...prev };
                          delete remainingErrors.turnstile;
                          return remainingErrors;
                        });
                      }}
                      onExpire={() => setTurnstileToken(null)}
                      onError={() => setTurnstileToken(null)}
                    />
                  </div>
                  {errors.turnstile && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {errors.turnstile}
                      </span>
                    </label>
                  )}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
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

              <p className="text-center text-sm">
                Already have an account?{" "}
                <Link to="/login" className="link link-primary">
                  Login
                </Link>
              </p>
            </section>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default RegisterForm;
