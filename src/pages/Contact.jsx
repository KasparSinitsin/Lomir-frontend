import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  MessageCircle,
  Send,
} from "lucide-react";
import Alert from "../components/common/Alert";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import FormGroup from "../components/common/FormGroup";
import TurnstileWidget from "../components/common/TurnstileWidget";
import { useAuth } from "../contexts/AuthContext";
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
  const hasTurnstile = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);

  const [formValues, setFormValues] = useState(initialFormValues);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [isEmailFormOpen, setIsEmailFormOpen] = useState(false);
  const turnstileRef = useRef(null);

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

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setStatus("submitting");
    setStatusMessage("");

    try {
      const response = await api.post("/api/contact", {
        name: formValues.name.trim(),
        email: formValues.email.trim(),
        topic: formValues.topic,
        message: formValues.message.trim(),
        ...(hasTurnstile ? { turnstile_token: turnstileToken } : {}),
      });

      setStatus("success");
      setStatusMessage(
        response.data?.message ||
          "Thanks, your message has been sent to the Lomir team.",
      );
      setFormValues(initialFormValues);
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
        {status === "success" && (
          <Alert
            type="success"
            message={statusMessage}
            className="mb-5 w-full shadow-sm"
          />
        )}

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
              <textarea
                id="contact-message"
                className={`textarea textarea-bordered min-h-40 w-full resize-y ${
                  errors.message ? "textarea-error" : ""
                }`}
                value={formValues.message}
                onChange={(event) => updateField("message", event.target.value)}
                placeholder="Tell us what is on your mind"
                disabled={isSubmitting}
              />
            </FormGroup>

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
          <div className="mt-6 rounded-lg bg-base-100/60 p-4 text-sm text-base-content/70">
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
