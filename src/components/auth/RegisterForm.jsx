import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
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
import api from "../../services/api";
import LocationInput from "../common/LocationInput";
import CommunicationSection from "../common/CommunicationSection";
import { LANGUAGE_FEATURE_VISIBLE, getLanguageForCountry } from "../../constants/languages";
import { readStoredLanguage, resolveLanguage } from "../../utils/languageUtils";
import {
  useLocationAutoFill,
  describeLocationBlock,
} from "../../hooks/useLocationAutoFill";
import VisibilityToggle from "../common/VisibilityToggle";
import TurnstileWidget from "../common/TurnstileWidget";

const RegisterForm = () => {
  const { t } = useTranslation("auth");
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
    // Carries a logged-out visitor's choice into the account: someone who
    // read the site in German should not be flipped back to English by the
    // country rule the moment they register. Falls back to the browser.
    preferred_language: resolveLanguage(),
    isPublic: false,
    acceptedLegal: false,
    confirmedAge16: false,
    profile_image: null,
    selectedTags: [],
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const turnstileRef = useRef(null);
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

  const {
    getSuggestedUpdates,
    markFieldAsEdited,
    locationMismatch,
  } = useLocationAutoFill({
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
      newErrors.username = [t("auth:register.errors.usernameRequired")];
    } else {
      const usernameErrors = getUsernameValidationErrors(formData.username);
      if (usernameErrors.length > 0) newErrors.username = usernameErrors;
    }

    if (!formData.email) {
      newErrors.email = t("auth:register.errors.emailRequired");
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t("auth:register.errors.emailInvalid");
    }

    if (!formData.password) {
      newErrors.password = t("auth:register.errors.passwordRequired");
    } else if (formData.password.length < 8) {
      newErrors.password = t("auth:register.errors.passwordLength");
    } else if (
      !/[A-Za-z]/.test(formData.password) ||
      !/\d/.test(formData.password)
    ) {
      newErrors.password =
        t("auth:register.errors.passwordLetterNumber");
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t("auth:register.errors.passwordsMismatch");
    }

    if (hasTurnstile && !turnstileToken) {
      newErrors.turnstile = t("auth:register.errors.turnstile");
    }

    if (!formData.acceptedLegal) {
      newErrors.acceptedLegal = t("auth:register.errors.acceptedLegal");
    }

    if (!formData.confirmedAge16) {
      newErrors.confirmedAge16 = t("auth:register.errors.confirmedAge16");
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
      usernameErrors.push(t("auth:register.errors.usernameTooShort"));
    }

    if (username.length > 30) {
      usernameErrors.push(t("auth:register.errors.usernameTooLong"));
    }

    if (!/^[a-zA-Z0-9]*$/.test(username)) {
      usernameErrors.push(t("auth:register.errors.usernameCharacters"));
    }

    return usernameErrors;
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
          username: [
            message || t("auth:register.errors.usernameTaken"),
          ],
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
      const message =
        response.data.message || t("auth:register.errors.usernameTaken");

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
      passwordValidationErrors.push(t("auth:register.errors.passwordLength"));
    }

    if (!/[A-Za-z]/.test(password)) {
      passwordValidationErrors.push(t("auth:register.errors.passwordLetter"));
    }

    if (!/\d/.test(password)) {
      passwordValidationErrors.push(t("auth:register.errors.passwordNumber"));
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
        nextErrors.confirmPassword = t("auth:register.errors.passwordsMismatch");
      } else {
        delete nextErrors.confirmPassword;
      }

      return nextErrors;
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "username") {
      usernameInputValueRef.current = value;
    }

    if (errors[name]) {
      clearFieldError(name);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // The language follows the country until the visitor picks one themselves -
  // selecting Austria should offer German without a second click. Any explicit
  // choice ends that, including one made while browsing logged out: nothing
  // may quietly overwrite what someone chose. Same rule LocationInput applies
  // to city and country, and wired the same way rather than assumed.
  const languageTouchedRef = useRef(Boolean(readStoredLanguage()));

  const handleLanguageChange = (e) => {
    languageTouchedRef.current = true;
    handleChange(e);
  };

  useEffect(() => {
    if (languageTouchedRef.current || !formData.country) return;

    const fromCountry = getLanguageForCountry(formData.country);

    setFormData((prev) =>
      prev.preferred_language === fromCountry
        ? prev
        : { ...prev, preferred_language: fromCountry },
    );
  }, [formData.country]);

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

  const isUsernameConflictMessage = (message = "") =>
    message.toLowerCase().includes("username already exists") ||
    message.toLowerCase().includes("username is already taken");

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
      return t("auth:register.errors.creationDefault");
    }

    return `${t("auth:register.errors.creationFix")} ${messages.join("; ")}`;
  };

  const getApiErrorMessages = (errorSource) => {
    const responseData = errorSource?.response?.data ?? errorSource ?? {};
    const rawErrors = responseData.errors;

    if (Array.isArray(rawErrors)) {
      return rawErrors
        .map((error) => {
          if (typeof error === "string") return error;
          if (!error || typeof error !== "object") return null;

          const field = error.path || error.param || error.field;
          const message = error.msg || error.message;

          if (field && message) {
            return t("auth:register.errors.fieldApi", { field, message });
          }
          return message || field || null;
        })
        .filter(Boolean);
    }

    if (rawErrors && typeof rawErrors === "object") {
      return getAccountCreationErrorMessages(rawErrors);
    }

    return [];
  };

  const getApiErrorMessage = (
    errorSource,
    fallback = t("auth:register.errors.registrationFailed"),
  ) =>
    errorSource?.response?.data?.message || errorSource?.message || fallback;

  const buildRegistrationErrorState = (errorSource) => {
    const apiMessages = getApiErrorMessages(errorSource);
    const message = getApiErrorMessage(errorSource);

    if (apiMessages.length > 0) {
      return {
        form: getAccountCreationErrorMessage({ api: apiMessages }),
        formMessages: apiMessages,
      };
    }

    if (isUsernameConflictMessage(message)) {
      const formMessages = [t("auth:register.errors.usernameTaken")];

      return {
        username: [t("auth:register.errors.usernameTaken")],
        form: getAccountCreationErrorMessage({
          username: t("auth:register.errors.usernameTaken"),
        }),
        formMessages,
      };
    }

    return { form: message };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // The location fields disagree, or one of them could not be confirmed. What
    // that means per case - which value goes, what the user is told - lives in
    // describeLocationBlock so the five forms cannot drift apart.
    if (locationMismatch?.blocksSubmit) {
      const { clearField, message } = describeLocationBlock(locationMismatch);

      if (clearField) {
        // This form keeps its location fields in snake_case.
        const fieldName = clearField === "postalCode" ? "postal_code" : clearField;
        setFormData((prev) => ({ ...prev, [fieldName]: "" }));
      }

      setErrors((prev) => ({ ...prev, form: message }));
      return;
    }

    setIsSubmitting(true);

    try {
      const trimmedEmail = formData.email.trim();
      const trimmedUsername = formData.username.trim();
      const validationErrors = getFormValidationErrors();
      const cachedUsernameAvailability = lastUsernameAvailabilityRef.current;

      const blockingErrors = {
        ...validationErrors,
      };

      if (
        !blockingErrors.username &&
        cachedUsernameAvailability.username === trimmedUsername &&
        cachedUsernameAvailability.available === false
      ) {
        blockingErrors.username = [
          cachedUsernameAvailability.message ||
            t("auth:register.errors.usernameTaken"),
        ];
      }

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

      const selectedTagObjects =
        formData.selectedTags.length > 0
          ? formData.selectedTags
              .map((id) => Number(id))
              .filter((n) => Number.isFinite(n))
              .map((id) => ({ tag_id: id }))
          : [];

      // Send registration as multipart/form-data so the avatar is uploaded
      // to ImageKit server-side, only after the account is actually created.
      // This avoids exposing the image (and an ImageKit auth token) from the
      // browser before a valid registration exists.
      const registrationData = new FormData();
      registrationData.append("username", trimmedUsername);
      registrationData.append("email", trimmedEmail);
      registrationData.append("password", formData.password);
      registrationData.append("first_name", formData.first_name);
      registrationData.append("last_name", formData.last_name);
      registrationData.append("bio", formData.bio);
      registrationData.append("postal_code", formData.postal_code);
      registrationData.append("city", formData.city);
      registrationData.append("country", formData.country);
      // Only sent while the picker is on screen. Storing a language nobody was
      // shown would make the guess an explicit choice and outrank the country
      // rule for good.
      if (LANGUAGE_FEATURE_VISIBLE) {
        registrationData.append("preferred_language", formData.preferred_language);
      }
      registrationData.append("accepted_terms", "true");
      registrationData.append("accepted_privacy", "true");
      registrationData.append("confirmed_age_16", "true");
      registrationData.append("tags", JSON.stringify(selectedTagObjects));

      if (hasTurnstile) {
        registrationData.append("turnstile_token", turnstileToken);
      }

      if (formData.profile_image) {
        registrationData.append("avatar", formData.profile_image);
      }

      const result = await register(registrationData);

      if (result.success) {
        if (result.requiresVerification) {
          setRegistrationSuccess(true);
        } else {
          localStorage.setItem(
            "registrationMessage",
            t("auth:register.successProfileCreated"),
          );
          navigate("/profile");
        }
      } else {
        resetTurnstile();
        setErrors((prev) => ({
          ...prev,
          ...buildRegistrationErrorState(result),
        }));
      }
    } catch (error) {
      resetTurnstile();
      console.error("Full Registration error:", error);
      setErrors((prev) => ({
        ...prev,
        ...buildRegistrationErrorState(error),
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
      setResendMessage(t("auth:register.resendSuccess"));

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
          t("auth:register.resendFailure"),
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
                {t("auth:register.errors.creationFix")}
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
              {t("auth:register.successTitle")}
            </h2>
            <p className="text-base-content/70 mb-4">
              {t("auth:register.successMessage", { email: formData.email })}
            </p>
            <p className="text-sm text-base-content/60 mb-6">
              {t("auth:register.successHelp")}
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
                {t("auth:common.goToLogin")}
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
                    {t("auth:common.sending")}
                  </>
                ) : resendCooldown > 0 ? (
                  t("auth:register.resendCooldown", {
                    seconds: resendCooldown,
                  })
                ) : (
                  t("auth:register.resendButton")
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
            {t("auth:register.title")}
          </h2>
          <p className="text-center text-base-content/70 mb-6">
            {t("auth:register.subtitle")}
          </p>

          {renderFormAlert(`mb-4 ${formAlertClassName}`)}

          <form onSubmit={handleSubmit} className="space-y-12">
            {/* Account Information */}
            <section className="space-y-4">
              <FormSectionDivider
                text={t("auth:register.sections.account")}
                icon={KeyRound}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">
                      {t("auth:register.fields.username")}{" "}
                      <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder={t("auth:register.fields.usernamePlaceholder")}
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
                      {t("auth:register.fields.usernameHelp")}
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
                      {t("auth:common.email")}{" "}
                      <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    type="email"
                    placeholder={t("auth:register.fields.emailPlaceholder")}
                    className={`input input-bordered w-full ${
                      errors.email ? "input-error" : ""
                    }`}
                    value={formData.email}
                    onChange={handleChange}
                    onFocus={() => clearFieldError("email")}
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
                      {t("auth:common.password")}{" "}
                      <span className="text-error">*</span>
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder={t("auth:register.fields.passwordPlaceholder")}
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
                      aria-label={
                        showPassword
                          ? t("auth:common.hidePassword")
                          : t("auth:common.showPassword")
                      }
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
                      {t("auth:register.fields.passwordHelp")}
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
                      {t("auth:common.confirmPassword")}{" "}
                      <span className="text-error">*</span>
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder={t(
                        "auth:register.fields.confirmPasswordPlaceholder",
                      )}
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
                        showConfirmPassword
                          ? t("auth:common.hidePassword")
                          : t("auth:common.showPassword")
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
              <FormSectionDivider
                text={t("auth:register.sections.profile")}
                icon={User}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label">
                  <span className="label-text">
                    {t("auth:register.fields.firstName")}
                  </span>
                  </label>
                  <input
                    type="text"
                    placeholder={t("auth:register.fields.firstName")}
                    className="input input-bordered w-full"
                    value={formData.first_name}
                    onChange={handleChange}
                    name="first_name"
                  />
                </div>

                <div className="form-control w-full">
                  <label className="label">
                  <span className="label-text">
                    {t("auth:register.fields.lastName")}
                  </span>
                  </label>
                  <input
                    type="text"
                    placeholder={t("auth:register.fields.lastName")}
                    className="input input-bordered w-full"
                    value={formData.last_name}
                    onChange={handleChange}
                    name="last_name"
                  />
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">
                    {t("auth:register.fields.bio")}
                  </span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  placeholder={t("auth:register.fields.bioPlaceholder")}
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
                  label={t("auth:register.fields.profileVisibility")}
                  entityType="profile"
                  visibleLabel={t("auth:register.fields.publicProfile")}
                  hiddenLabel={t("auth:register.fields.privateProfile")}
                  hiddenDescription={t(
                    "auth:register.fields.privateDuringRegistration",
                  )}
                  disabled={true}
                />
                <p className="form-helper-text mt-2 px-1">
                  {t("auth:register.fields.visibilityLocked")}
                </p>
              </div>
            </section>

            {/* Location */}
            <section>
              <LocationInput
                onFieldEdited={markFieldAsEdited}
                mismatch={locationMismatch}
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
                dividerText={t("auth:register.sections.location")}
                privacyNotice={t("common:privacy.userLocation")}
              />
            </section>

            {/* Communication - under Location, because that is where the
                default comes from when nothing has been chosen. */}
            <CommunicationSection
              value={formData.preferred_language}
              onChange={handleLanguageChange}
              name="preferred_language"
              disabled={isSubmitting}
            />

            {/* Profile Picture */}
            <section className="space-y-4">
              <FormSectionDivider
                text={t("auth:register.sections.picture")}
                icon={Camera}
              />

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
                    helpText={t("common:privacy.avatarUpload")}
                  />
                </div>
              </div>
            </section>

            {/* Focus Areas */}
            <section className="space-y-4">
              <FormSectionDivider
                text={t("auth:register.sections.focusAreas")}
                icon={Tag}
              />

              <div className="form-control w-full">
                <label className="label whitespace-normal">
                  <span className="label-text">
                    {t("auth:register.fields.focusAreasLabel")}
                  </span>
                </label>

                <TagInput
                  selectedTags={formData.selectedTags}
                  onTagsChange={handleTagsChange}
                  placeholder={t("auth:register.fields.focusAreasPlaceholder")}
                />
              </div>
            </section>

            <div className="divider mt-12 mb-0"></div>

            <section className="space-y-4 !mt-4">
              {renderFormAlert(formAlertClassName)}

              <div className="form-control">
                <label className="label flex w-full cursor-pointer items-start justify-start gap-3 whitespace-normal rounded-lg border border-base-300 bg-base-100/70 p-4">
                  <input
                    type="checkbox"
                    name="acceptedLegal"
                    checked={formData.acceptedLegal}
                    onChange={handleChange}
                    className={`checkbox checkbox-primary mt-0.5 ${
                      errors.acceptedLegal ? "checkbox-error" : ""
                    }`}
                    disabled={isSubmitting}
                  />
                  <span className="label-text leading-relaxed">
                    {t("auth:register.legal.agreePrefix")}{" "}
                    <Link to="/terms" className="link link-primary">
                      {t("auth:register.legal.terms")}
                    </Link>{" "}
                    {t("auth:register.legal.andAcknowledge")}{" "}
                    <Link to="/privacy" className="link link-primary">
                      {t("auth:register.legal.privacy")}
                    </Link>
                    {t("auth:register.legal.afterPrivacy")}
                    .
                  </span>
                </label>
                {errors.acceptedLegal && (
                  <p className="text-xs text-error mt-2 px-1">
                    {errors.acceptedLegal}
                  </p>
                )}
              </div>

              <div className="form-control">
                <label className="label flex w-full cursor-pointer items-start justify-start gap-3 whitespace-normal rounded-lg border border-base-300 bg-base-100/70 p-4">
                  <input
                    type="checkbox"
                    name="confirmedAge16"
                    checked={formData.confirmedAge16}
                    onChange={handleChange}
                    className={`checkbox checkbox-primary mt-0.5 ${
                      errors.confirmedAge16 ? "checkbox-error" : ""
                    }`}
                    disabled={isSubmitting}
                  />
                  <span className="label-text leading-relaxed">
                    {t("auth:register.legal.age")}
                  </span>
                </label>
                {errors.confirmedAge16 && (
                  <p className="text-xs text-error mt-2 px-1">
                    {errors.confirmedAge16}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    {t("auth:register.submit.submitting")}
                  </>
                ) : (
                  t("auth:register.submit.idle")
                )}
              </Button>

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <p className="text-left text-sm sm:pt-1">
                  {t("auth:register.alreadyHaveAccount")}{" "}
                  <Link to="/login" className="link link-primary">
                    {t("auth:common.login")}
                  </Link>
                </p>

                {hasTurnstile && (
                  <div className="form-control w-full sm:w-auto sm:items-end">
                    <div className="flex w-full justify-center sm:justify-end">
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
                      <label className="label flex w-full justify-center px-0 sm:justify-end">
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
