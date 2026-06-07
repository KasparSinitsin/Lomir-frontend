import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { UI_TEXT } from "../../constants/uiText";
import TagInput from "../tags/TagInput";
import Card from "../common/Card";
import Button from "../common/Button";
import Alert from "../common/Alert";
import FormSectionDivider from "../common/FormSectionDivider";
import {
  Tag,
  MailCheck,
  KeyRound,
  User,
  Camera,
  Eye,
  EyeOff,
} from "lucide-react";
import ImageUploader from "../common/ImageUploader";
import { uploadToImageKit } from "../../config/imagekit";
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
  const emailInputValueRef = useRef("");
  const lastEmailAvailabilityRef = useRef({
    email: "",
    available: null,
    message: "",
  });
  const emailAvailabilityRequestIdRef = useRef(0);
  const usernameInputValueRef = useRef("");
  const lastUsernameAvailabilityRef = useRef({
    username: "",
    available: null,
    message: "",
  });
  const usernameAvailabilityRequestIdRef = useRef(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [resendStatus, setResendStatus] = useState("idle"); // 'idle' | 'sending' | 'sent' | 'error'
  const [resendMessage, setResendMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const formAlertClassName =
    "field-error-animate shadow-[0_4px_10px_rgba(0,0,0,0.12),0_12px_30px_rgba(0,0,0,0.18),0_28px_56px_rgba(0,0,0,0.14)]";

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

  const getFormValidationErrors = () => {
    const newErrors = {};

    if (!formData.username) {
      newErrors.username = ["Please enter a username."];
    } else {
      const usernameErrors = getUsernameValidationErrors(formData.username);
      if (usernameErrors.length > 0) newErrors.username = usernameErrors;
    }

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address (e.g. your@email.com).";
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

    return newErrors;
  };

  const clearFieldError = (fieldName) => {
    setErrors((prev) => {
      if (!prev[fieldName] && !prev.form) {
        return prev;
      }

      const remainingErrors = { ...prev };
      delete remainingErrors[fieldName];
      delete remainingErrors.form;
      delete remainingErrors.formMessages;
      return remainingErrors;
    });
  };

  const clearFormError = () => {
    setErrors((prev) => {
      if (!prev.form) {
        return prev;
      }

      const remainingErrors = { ...prev };
      delete remainingErrors.form;
      delete remainingErrors.formMessages;
      return remainingErrors;
    });
  };

  const getUsernameValidationErrors = (username) => {
    const usernameErrors = [];

    if (username.length < 3) {
      usernameErrors.push("Username must be at least 3 characters.");
    }

    if (username.length > 30) {
      usernameErrors.push("Username must be no longer than 30 characters.");
    }

    if (!/^[a-zA-Z0-9]*$/.test(username)) {
      usernameErrors.push(
        "Username can only contain letters and numbers — no spaces or special characters.",
      );
    }

    return usernameErrors;
  };

  const checkEmailAvailability = async (emailValue = formData.email) => {
    const email = emailValue.trim();
    const emailErrorMessage =
      "Please enter a valid email address (e.g. your@email.com).";

    if (!email) return false;

    emailInputValueRef.current = emailValue;

    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrors((prev) => ({
        ...prev,
        email: emailErrorMessage,
      }));
      return false;
    }

    if (lastEmailAvailabilityRef.current.email === email) {
      const { available, message } = lastEmailAvailabilityRef.current;

      if (available === false) {
        setErrors((prev) => ({
          ...prev,
          email: message || "This email address is already registered.",
        }));
        return false;
      }

      if (available === true) {
        setErrors((prev) => {
          const nextErrors = { ...prev };
          delete nextErrors.email;
          return nextErrors;
        });
        return true;
      }
    }

    const requestId = emailAvailabilityRequestIdRef.current + 1;
    emailAvailabilityRequestIdRef.current = requestId;

    try {
      const response = await api.post("/api/auth/check-email", { email });

      if (
        requestId !== emailAvailabilityRequestIdRef.current ||
        emailInputValueRef.current.trim() !== email
      ) {
        return false;
      }

      const available = Boolean(response.data.available);
      const message =
        response.data.message || "This email address is already registered.";

      lastEmailAvailabilityRef.current = {
        email,
        available,
        message: available ? "" : message,
      };

      setErrors((prev) => {
        const nextErrors = { ...prev };

        if (available) {
          delete nextErrors.email;
        } else {
          nextErrors.email = message;
        }

        return nextErrors;
      });

      return available;
    } catch (error) {
      console.warn("Email availability check failed:", error);
      return true;
    }
  };

  const handleEmailBlur = (e) => {
    void checkEmailAvailability(e.currentTarget.value);
  };

  const handleEmailKeyDown = (e) => {
    if (e.key !== "Enter") return;

    e.preventDefault();
    void checkEmailAvailability(e.currentTarget.value);
  };

  const handleEmailFocus = () => {
    if (getAvailabilityErrorClass(errors.email)) return;

    clearFieldError("email");
  };

  const checkUsernameAvailability = async (
    usernameValue = formData.username,
  ) => {
    const username = usernameValue.trim();

    if (!username) return false;

    usernameInputValueRef.current = usernameValue;

    const usernameErrors = getUsernameValidationErrors(username);
    if (usernameErrors.length > 0) {
      setErrors((prev) => ({
        ...prev,
        username: usernameErrors,
      }));
      return false;
    }

    if (lastUsernameAvailabilityRef.current.username === username) {
      const { available, message } = lastUsernameAvailabilityRef.current;

      if (available === false) {
        setErrors((prev) => ({
          ...prev,
          username: [message || "This username is already taken."],
        }));
        return false;
      }

      if (available === true) {
        setErrors((prev) => {
          const nextErrors = { ...prev };
          delete nextErrors.username;
          return nextErrors;
        });
        return true;
      }
    }

    const requestId = usernameAvailabilityRequestIdRef.current + 1;
    usernameAvailabilityRequestIdRef.current = requestId;

    try {
      const response = await api.post("/api/auth/check-username", {
        username,
      });

      if (
        requestId !== usernameAvailabilityRequestIdRef.current ||
        usernameInputValueRef.current.trim() !== username
      ) {
        return false;
      }

      const available = Boolean(response.data.available);
      const message = response.data.message || "This username is already taken.";

      lastUsernameAvailabilityRef.current = {
        username,
        available,
        message: available ? "" : message,
      };

      setErrors((prev) => {
        const nextErrors = { ...prev };

        if (available) {
          delete nextErrors.username;
        } else {
          nextErrors.username = [message];
        }

        return nextErrors;
      });

      return available;
    } catch (error) {
      console.warn("Username availability check failed:", error);
      return true;
    }
  };

  const handleUsernameBlur = (e) => {
    void checkUsernameAvailability(e.currentTarget.value);
  };

  const handleUsernameKeyDown = (e) => {
    if (e.key !== "Enter") return;

    e.preventDefault();
    void checkUsernameAvailability(e.currentTarget.value);
  };

  const getPasswordValidationErrors = (password) => {
    const passwordValidationErrors = [];

    if (password.length < 8) {
      passwordValidationErrors.push("Password must be at least 8 characters");
    }

    if (!/[A-Za-z]/.test(password)) {
      passwordValidationErrors.push("Must contain at least one letter");
    }

    if (!/\d/.test(password)) {
      passwordValidationErrors.push("Must contain at least one number");
    }

    return passwordValidationErrors;
  };

  const handlePasswordBlur = () => {
    const passwordValidationErrors = getPasswordValidationErrors(
      formData.password,
    );

    setErrors((prev) => {
      const nextErrors = { ...prev };

      if (passwordValidationErrors.length > 0) {
        nextErrors.password = passwordValidationErrors;
      } else {
        delete nextErrors.password;
      }

      return nextErrors;
    });
  };

  const handleConfirmPasswordBlur = () => {
    setErrors((prev) => {
      const nextErrors = { ...prev };

      if (formData.password !== formData.confirmPassword) {
        nextErrors.confirmPassword = "Passwords do not match";
      } else {
        delete nextErrors.confirmPassword;
      }

      return nextErrors;
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "email") {
      emailInputValueRef.current = value;

      if (
        getAvailabilityErrorClass(errors.email) &&
        value.trim() !== lastEmailAvailabilityRef.current.email
      ) {
        clearFieldError("email");
      }
    }

    if (name === "username") {
      usernameInputValueRef.current = value;
    }

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

  const isEmailConflictMessage = (message = "") =>
    message.toLowerCase().includes("email already exists");

  const isUsernameConflictMessage = (message = "") =>
    message.toLowerCase().includes("username already exists");

  const getAvailabilityErrorClass = (message = "") => {
    const normalizedMessage = message.toLowerCase();

    return normalizedMessage.includes("already registered") ||
      normalizedMessage.includes("already taken")
      ? " field-error-animate"
      : "";
  };

  const getAccountCreationErrorMessages = (fieldMessages) => [
    ...new Set(Object.values(fieldMessages).flat().filter(Boolean)),
  ];

  const getAccountCreationErrorMessage = (fieldMessages) => {
    const messages = getAccountCreationErrorMessages(fieldMessages);

    if (messages.length === 0) {
      return "Account could not be created. Please check the highlighted fields.";
    }

    return `Account could not be created. Please fix: ${messages.join("; ")}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      const trimmedEmail = formData.email.trim();
      const trimmedUsername = formData.username.trim();
      const validationErrors = getFormValidationErrors();
      const availabilityErrors = {};

      try {
        const availabilityChecks = [];

        if (!validationErrors.email && trimmedEmail) {
          availabilityChecks.push(
            api
              .post("/api/auth/check-email", {
                email: trimmedEmail,
              })
              .then((emailCheck) => {
                if (!emailCheck.data.available) {
                  availabilityErrors.email =
                    emailCheck.data.message ||
                    "This email address is already registered.";
                }
              }),
          );
        }

        if (!validationErrors.username && trimmedUsername) {
          availabilityChecks.push(
            api
              .post("/api/auth/check-username", {
                username: trimmedUsername,
              })
              .then((usernameCheck) => {
                if (!usernameCheck.data.available) {
                  availabilityErrors.username = [
                    usernameCheck.data.message ||
                      "This username is already taken.",
                  ];
                }
              }),
          );
        }

        await Promise.all(availabilityChecks);
      } catch (availabilityError) {
        console.warn("Availability check failed:", availabilityError);
      }

      const blockingErrors = {
        ...validationErrors,
        ...availabilityErrors,
      };

      if (Object.keys(blockingErrors).length > 0) {
        const formMessages = getAccountCreationErrorMessages(blockingErrors);

        setErrors({
          ...blockingErrors,
          form: getAccountCreationErrorMessage(blockingErrors),
          formMessages,
        });
        resetTurnstile();
        setIsSubmitting(false);
        return;
      }

      const userData = {
        username: trimmedUsername,
        email: trimmedEmail,
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
        const uploadResult = await uploadToImageKit(
          formData.profile_image,
          "avatars",
        );

        if (uploadResult.success) {
          userData.avatar_url = uploadResult.url;
          userData.avatar_file_id = uploadResult.fileId;
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
        const msg = result.message || "";

        if (isEmailConflictMessage(msg)) {
          const formMessages = ["This email address is already registered."];

          setErrors((prev) => ({
            ...prev,
            email: "This email address is already registered.",
            form: getAccountCreationErrorMessage({
              email: "This email address is already registered.",
            }),
            formMessages,
          }));
        } else if (isUsernameConflictMessage(msg)) {
          const formMessages = ["This username is already taken."];

          setErrors((prev) => ({
            ...prev,
            username: ["This username is already taken."],
            form: getAccountCreationErrorMessage({
              username: "This username is already taken.",
            }),
            formMessages,
          }));
        } else {
          setErrors((prev) => ({
            ...prev,
            form: msg,
          }));
        }
      }
    } catch (error) {
      resetTurnstile();
      console.error("Full Registration error:", error);
      const msg = error.response?.data?.message || "Registration failed.";

      if (isEmailConflictMessage(msg)) {
        const formMessages = ["This email address is already registered."];

        setErrors((prev) => ({
          ...prev,
          email: "This email address is already registered.",
          form: getAccountCreationErrorMessage({
            email: "This email address is already registered.",
          }),
          formMessages,
        }));
      } else if (isUsernameConflictMessage(msg)) {
        const formMessages = ["This username is already taken."];

        setErrors((prev) => ({
          ...prev,
          username: ["This username is already taken."],
          form: getAccountCreationErrorMessage({
            username: "This username is already taken.",
          }),
          formMessages,
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          form: msg,
        }));
      }
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

  const usernameErrorMessages = Array.isArray(errors.username)
    ? errors.username
    : errors.username
      ? [errors.username]
      : [];

  const passwordErrorMessages = Array.isArray(errors.password)
    ? errors.password
    : errors.password
      ? [errors.password]
      : [];
  const formErrorMessages = Array.isArray(errors.formMessages)
    ? errors.formMessages
    : [];

  const renderFormAlert = (className = "") => {
    if (!errors.form) return null;

    return (
      <div className="flex w-full justify-center">
        <Alert
          type="error"
        message={errors.form}
        onClose={clearFormError}
        autoCloseMs={10000}
          className={className}
        >
          {formErrorMessages.length > 0 ? (
            <div className="text-left">
              <p className="font-medium">
                Account could not be created. Please fix:
              </p>
              <ul className="mt-2 list-disc space-y-0.5 pl-5">
                {formErrorMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          ) : (
            errors.form
          )}
        </Alert>
      </div>
    );
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
              <Alert
                type={resendStatus === "sent" ? "success" : "error"}
                message={resendMessage}
                onClose={() => setResendMessage("")}
                className="mb-4 w-full shadow-sm"
              />
            )}

            <div className="flex flex-col gap-2 w-full">
              <Link to="/login" className="btn btn-primary w-fit self-center px-6">
                Go to Login
              </Link>

              <button
                type="button"
                className="btn btn-ghost btn-sm w-fit self-center px-4"
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
          <h2 className="card-title text-2xl font-bold text-center justify-center mb-4 text-success">
            Create Account
          </h2>
          <p className="text-center text-base-content/70 mb-6">
            Join Lomir and start building teams
          </p>

          {renderFormAlert(`mb-4 ${formAlertClassName}`)}

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
                      usernameErrorMessages.length > 0 ? "input-error" : ""
                    }`}
                    value={formData.username}
                    onChange={handleChange}
                    onFocus={() => clearFieldError("username")}
                    onBlur={handleUsernameBlur}
                    onKeyDown={handleUsernameKeyDown}
                    name="username"
                  />
                  {usernameErrorMessages.length === 0 && (
                    <p className="form-helper-text mt-2 px-1">
                      3–30 characters, letters and numbers only (no spaces).
                    </p>
                  )}
                  {usernameErrorMessages.length > 0 && (
                    <div className="mt-2 px-1 flex flex-col gap-0.5">
                      {usernameErrorMessages.map((err) => (
                        <p
                          key={err}
                          className={`text-xs text-error${getAvailabilityErrorClass(
                            err,
                          )}`}
                        >
                          {err}
                        </p>
                      ))}
                    </div>
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
                    onFocus={handleEmailFocus}
                    onBlur={handleEmailBlur}
                    onKeyDown={handleEmailKeyDown}
                    name="email"
                  />
                  {errors.email && (
                    <p
                      className={`text-xs text-error mt-2 px-1${getAvailabilityErrorClass(
                        errors.email,
                      )}`}
                    >
                      {errors.email}
                    </p>
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
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters, with letters and numbers"
                      className={`input input-bordered w-full pr-12 ${
                        passwordErrorMessages.length > 0 ? "input-error" : ""
                      }`}
                      value={formData.password}
                      onChange={handleChange}
                      onFocus={() => clearFieldError("password")}
                      onBlur={handlePasswordBlur}
                      name="password"
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
                  {passwordErrorMessages.length === 0 && (
                    <p className="form-helper-text mt-2 px-1">
                      At least 8 characters with at least one letter and one
                      number.
                    </p>
                  )}
                  {passwordErrorMessages.length > 0 && (
                    <div className="mt-2 px-1 flex flex-col gap-0.5">
                      {passwordErrorMessages.map((passwordError) => (
                        <p key={passwordError} className="text-xs text-error">
                          {passwordError}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">
                      Confirm Password <span className="text-error">*</span>
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      className={`input input-bordered w-full pr-12 ${
                        errors.confirmPassword ? "input-error" : ""
                      }`}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      onFocus={() => clearFieldError("confirmPassword")}
                      onBlur={handleConfirmPasswordBlur}
                      name="confirmPassword"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-base-content/60 transition-colors hover:text-base-content"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      onMouseDown={(e) => e.preventDefault()}
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                      aria-pressed={showConfirmPassword}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-error mt-2 px-1">
                      {errors.confirmPassword}
                    </p>
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
              {renderFormAlert(formAlertClassName)}

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

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <p className="text-left text-sm sm:pt-1">
                  Already have an account?{" "}
                  <Link to="/login" className="link link-primary">
                    Login
                  </Link>
                </p>

                {hasTurnstile && (
                  <div className="form-control w-full sm:w-auto sm:items-end">
                    <div className="flex w-full justify-end">
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
                      <label className="label flex w-full justify-end px-0">
                        <span className="label-text-alt text-error">
                          {errors.turnstile}
                        </span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            </section>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default RegisterForm;
