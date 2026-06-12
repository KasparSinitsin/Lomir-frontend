import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  MessageCircle,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import Alert from "../components/common/Alert";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import FormGroup from "../components/common/FormGroup";
import TurnstileWidget from "../components/common/TurnstileWidget";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import api from "../services/api";

const LOMIR_CONTACT_USER_ID = (
  import.meta.env.VITE_LOMIR_CONTACT_USER_ID || ""
).trim();

const initialFormValues = {
  name: "",
  email: "",
  topic: "General question",
  message: "",
};

const topicOptions = [
  "General question",
  "Account support",
  "Privacy request",
  "Feedback",
];

const Contact = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const showToast = useToast();
  const hasTurnstile = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);

  const [formValues, setFormValues] = useState(initialFormValues);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [isEmailFormOpen, setIsEmailFormOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const ATTACHMENT_MAX_FILES = 5;
  const turnstileRef = useRef(null);
  const fileInputRef = useRef(null);

  const ATTACHMENT_MAX_MB = 25;
  const ATTACHMENT_MAX_BYTES = ATTACHMENT_MAX_MB * 1024 * 1024;
  const ATTACHMENT_ALLOWED_TYPES = [
    // Images (matches chatImage)
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    // Documents (matches chatFile)
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "application/zip",
    "application/x-rar-compressed",
  ];

  const canUseInAppContact =
    isAuthenticated && Boolean(LOMIR_CONTACT_USER_ID);

  const updateField = (field, value) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: "",
    }));
    setStatus("idle");
    setStatusMessage("");
  };

  const validateForm = () => {
    const nextErrors = {};
    const trimmedEmail = formValues.email.trim();

    if (!formValues.name.trim()) {
      nextErrors.name = "Name is required";
    }

    if (!trimmedEmail) {
      nextErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      nextErrors.email = "Please enter a valid email address";
    }

    if (!formValues.message.trim()) {
      nextErrors.message = "Message is required";
    }

    if (hasTurnstile && !turnstileToken) {
      nextErrors.turnstile = "Please complete the CAPTCHA verification";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetTurnstile = () => {
    turnstileRef.current?.reset();
    setTurnstileToken(null);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!ATTACHMENT_ALLOWED_TYPES.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        attachment: "File type not supported. Accepted: images, PDF, Word, Excel, PowerPoint, TXT, ZIP",
      }));
      return;
    }

    if (file.size > ATTACHMENT_MAX_BYTES) {
      setErrors((prev) => ({
        ...prev,
        attachment: `File must be ${ATTACHMENT_MAX_MB} MB or smaller.`,
      }));
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.attachment;
      return next;
    });
    setAttachments((prev) => [...prev, file]);
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.attachment;
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setStatus("submitting");
    setStatusMessage("");

    try {
      let body;
      if (attachments.length > 0) {
        body = new FormData();
        body.append("name", formValues.name.trim());
        body.append("email", formValues.email.trim());
        body.append("topic", formValues.topic);
        body.append("message", formValues.message.trim());
        if (hasTurnstile) body.append("turnstile_token", turnstileToken);
        attachments.forEach((file) => body.append("attachments", file));
      } else {
        body = {
          name: formValues.name.trim(),
          email: formValues.email.trim(),
          topic: formValues.topic,
          message: formValues.message.trim(),
          ...(hasTurnstile ? { turnstile_token: turnstileToken } : {}),
        };
      }

      const response = await api.post("/api/contact", body);

      showToast(
        response.data?.message ||
          "Thanks, your message has been sent to the Lomir team.",
      );
      setFormValues(initialFormValues);
      setAttachments([]);
      setStatus("idle");
      setStatusMessage("");
      setIsEmailFormOpen(false);
      resetTurnstile();
    } catch (error) {
      console.error("Contact form submission error:", error);
      setStatus("error");
      setStatusMessage(
        error.response?.data?.message ||
          "Something went wrong while sending your message. Please try again.",
      );
      resetTurnstile();
    }
  };

  const handleTurnstileVerify = (token) => {
    setTurnstileToken(token);
    setErrors((currentErrors) => {
      if (!currentErrors.turnstile) {
        return currentErrors;
      }

      const remainingErrors = { ...currentErrors };
      delete remainingErrors.turnstile;
      return remainingErrors;
    });
  };

  const renderContactForm = () => {
    const isSubmitting = status === "submitting";
    const emailSubtitle = isAuthenticated
      ? "We will reply by email."
      : "We will reply by email. Create an account for direct in-app messaging with the Lomir team.";

    if (!isEmailFormOpen) {
      return (
        <Card
          hoverable={false}
          truncateContent={false}
          contentClassName="pt-4 sm:pt-7"
          className="h-full"
          marginClassName="mb-0"
        >
          <div className="flex gap-3">
            <div className="avatar placeholder relative">
              <div className="rounded-full w-12 h-12 relative flex items-center justify-center overflow-hidden">
                <Send size={28} className="text-primary" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-[var(--color-primary-focus)] leading-[120%] mb-1 text-lg">
                Send us a message
              </h3>
              <p className="max-h-[2.75em] overflow-hidden">
                {emailSubtitle}
              </p>
            </div>
          </div>

          <div className="mt-auto flex justify-end pt-6">
            <Button
              type="button"
              variant="primary"
              icon={<Mail size={16} />}
              className="w-full sm:w-auto"
              onClick={() => setIsEmailFormOpen(true)}
            >
              Compose Email
            </Button>
          </div>

          {!isAuthenticated && (
            <div className="mt-6 rounded-lg bg-base-100/60 text-left text-sm text-base-content/70 sm:text-right">
              <p>
                Already part of Lomir?{" "}
                <Link to="/login" className="link link-primary">
                  Log in
                </Link>{" "}
                to contact us through the app chat.
              </p>
            </div>
          )}
        </Card>
      );
    }

    return (
      <Card
        title="Send us a message"
        subtitle={emailSubtitle}
        hoverable={false}
        truncateContent={false}
        imageSize="small"
        imageReplacement={<Send size={28} className="text-primary" />}
        className="h-full"
        marginClassName="mb-0"
      >
        {status === "error" && (
          <Alert
            type="error"
            message={statusMessage}
            className="mb-5 w-full shadow-sm"
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormGroup
                label="Name"
                htmlFor="contact-name"
                error={errors.name}
                required
                className="mb-0"
              >
                <input
                  id="contact-name"
                  type="text"
                  className={`input input-bordered w-full ${
                    errors.name ? "input-error" : ""
                  }`}
                  value={formValues.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Your name"
                  disabled={isSubmitting}
                />
              </FormGroup>

              <FormGroup
                label="Email"
                htmlFor="contact-email"
                error={errors.email}
                required
                className="mb-0"
              >
                <input
                  id="contact-email"
                  type="email"
                  className={`input input-bordered w-full ${
                    errors.email ? "input-error" : ""
                  }`}
                  value={formValues.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="you@example.com"
                  disabled={isSubmitting}
                />
              </FormGroup>
            </div>

            <FormGroup label="Topic" htmlFor="contact-topic" className="mb-0">
              <select
                id="contact-topic"
                className="select select-bordered w-full"
                value={formValues.topic}
                onChange={(event) => updateField("topic", event.target.value)}
                disabled={isSubmitting}
              >
                {topicOptions.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </FormGroup>

            <FormGroup
              label="Message"
              htmlFor="contact-message"
              error={errors.message}
              required
              className="mb-0"
            >
              <div className="relative">
                <textarea
                  id="contact-message"
                  className={`textarea textarea-bordered min-h-40 w-full resize-y pb-10 ${
                    errors.message ? "textarea-error" : ""
                  }`}
                  value={formValues.message}
                  onChange={(event) => updateField("message", event.target.value)}
                  placeholder="Tell us what is on your mind"
                  disabled={isSubmitting}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.zip,.rar"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                />
                {attachments.length < ATTACHMENT_MAX_FILES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="absolute bottom-2 right-2 btn btn-ghost btn-xs gap-1 px-2 text-base-content/40 hover:text-base-content/70"
                  >
                    <Paperclip size={13} />
                    Attach file
                  </button>
                )}
              </div>
            </FormGroup>

            {(attachments.length > 0 || errors.attachment) && (
              <div className="space-y-1.5">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-lg border border-base-300 bg-base-200/50 px-3 py-2 text-sm"
                  >
                    <Paperclip size={14} className="shrink-0 text-base-content/60" />
                    <span className="min-w-0 truncate text-base-content/80">
                      {file.name}
                    </span>
                    <span className="shrink-0 text-base-content/50">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      disabled={isSubmitting}
                      className="btn btn-ghost btn-xs ml-auto shrink-0 p-0.5"
                      aria-label="Remove attachment"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {errors.attachment && (
                  <p className="text-xs text-error">{errors.attachment}</p>
                )}
              </div>
            )}

            <p className="form-helper-text rounded-lg border border-base-300 bg-base-100/70 p-3">
              By submitting this form, you agree that we process your name,
              email address, message, and any attachments you provide in order
              to respond to your inquiry. For details, please see our{" "}
              <Link to="/privacy" className="link link-primary">
                Privacy Policy
              </Link>
              .
            </p>

            <div className="pt-3 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="sm:pt-0">
                <Button
                  type="submit"
                  variant="primary"
                  icon={!isSubmitting ? <Send size={16} /> : null}
                  className="w-full sm:w-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Sending...
                    </>
                  ) : (
                    "Send Message"
                  )}
                </Button>
              </div>

              {hasTurnstile && (
                <div className="form-control w-full sm:w-auto sm:items-end">
                  <div className="flex justify-center sm:justify-end">
                    <TurnstileWidget
                      ref={turnstileRef}
                      onVerify={handleTurnstileVerify}
                      onExpire={() => setTurnstileToken(null)}
                      onError={() => setTurnstileToken(null)}
                    />
                  </div>
                  {errors.turnstile && (
                    <label className="label justify-center sm:justify-end">
                      <span className="label-text-alt text-error">
                        {errors.turnstile}
                      </span>
                    </label>
                  )}
                </div>
              )}
            </div>
        </form>

        {!isAuthenticated && (
          <div className="mt-6 rounded-lg bg-base-100/60 text-sm text-base-content/70">
            <p>
              Already part of Lomir?{" "}
              <Link to="/login" className="link link-primary">
                Log in
              </Link>{" "}
              to contact us through the app chat.
            </p>
          </div>
        )}
      </Card>
    );
  };

  const renderAuthenticatedContact = () => {
    return (
      <Card
        hoverable={false}
        truncateContent={false}
        contentClassName="pt-4 sm:pt-7"
        className="h-full"
        marginClassName="mb-0"
      >
        <div className="mb-5 flex gap-3">
          <div className="avatar placeholder relative">
            <div className="rounded-full w-12 h-12 relative flex items-center justify-center overflow-hidden">
              <MessageCircle size={28} className="text-primary" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-[var(--color-primary-focus)] leading-[120%] mb-1 text-lg">
              Talk to the Lomir Team
            </h3>
            <p className="max-h-[2.75em] overflow-hidden">
              Use your Lomir account to reach us directly in the app.
            </p>
          </div>
        </div>

        <p className="text-base-content/75">
          The Lomir Team account is available for account questions, privacy
          requests, feedback, and anything that needs a little human context.
        </p>

        <div className="mt-auto flex justify-end pt-6">
          <Button
            type="button"
            variant="primary"
            icon={<MessageCircle size={16} />}
            className="w-full sm:w-auto"
            onClick={() =>
              navigate(`/chat/${LOMIR_CONTACT_USER_ID}?type=direct`)
            }
          >
            Send Chat Message
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <section className="background-opacity rounded-xl shadow-soft px-6 py-10 sm:px-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Mail size={30} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-primary">
          Contact Lomir
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base-content/75">
          Questions, feedback, account help, or privacy requests can all start here.
          <br />
          We will get your message to the right place.
        </p>
      </section>

      {canUseInAppContact ? (
        <div
          className={
            isEmailFormOpen
              ? "grid gap-5"
              : "grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:items-stretch"
          }
        >
          {renderAuthenticatedContact()}

          {renderContactForm()}
        </div>
      ) : (
        <div className="grid gap-5">{renderContactForm()}</div>
      )}
    </div>
  );
};

export default Contact;
