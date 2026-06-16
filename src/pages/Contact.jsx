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

const REPORT_TOPIC = "Report content or abuse";

const topicOptions = [
  "General question",
  "Account support",
  "Privacy request",
  REPORT_TOPIC,
  "Feedback",
];

const ATTACHMENT_MAX_FILES = 3;
const ATTACHMENT_MAX_MB = 5;
const ATTACHMENT_TOTAL_MAX_MB = 10;
const ATTACHMENT_MAX_BYTES = ATTACHMENT_MAX_MB * 1024 * 1024;
const ATTACHMENT_TOTAL_MAX_BYTES = ATTACHMENT_TOTAL_MAX_MB * 1024 * 1024;
const ATTACHMENT_ALLOWED_LABEL = "JPG, PNG, WebP, PDF, TXT, CSV";
const ATTACHMENT_ALLOWED_FILE_TYPES = [
  {
    extensions: [".jpg", ".jpeg"],
    mimeTypes: ["image/jpeg", "image/pjpeg"],
  },
  {
    extensions: [".png"],
    mimeTypes: ["image/png", "image/x-png"],
  },
  {
    extensions: [".webp"],
    mimeTypes: ["image/webp"],
  },
  {
    extensions: [".pdf"],
    mimeTypes: ["application/pdf", "application/x-pdf"],
  },
  {
    extensions: [".txt"],
    mimeTypes: ["text/plain"],
  },
  {
    extensions: [".csv"],
    mimeTypes: [
      "text/csv",
      "application/csv",
      "application/vnd.ms-excel",
      "text/plain",
    ],
  },
];

const ATTACHMENT_ALLOWED_BY_EXTENSION = ATTACHMENT_ALLOWED_FILE_TYPES.reduce(
  (map, fileType) => {
    fileType.extensions.forEach((extension) => {
      map.set(extension, new Set(fileType.mimeTypes));
    });
    return map;
  },
  new Map(),
);

const ATTACHMENT_ACCEPT = ATTACHMENT_ALLOWED_FILE_TYPES.flatMap((fileType) => [
  ...fileType.extensions,
  ...fileType.mimeTypes,
]).join(",");

const ATTACHMENT_HELPER_TEXT = `Accepted: ${ATTACHMENT_ALLOWED_LABEL}. Max ${ATTACHMENT_MAX_FILES} files, ${ATTACHMENT_MAX_MB} MB each, ${ATTACHMENT_TOTAL_MAX_MB} MB total.`;

const getFileExtension = (fileName = "") => {
  const match = fileName.toLowerCase().match(/\.[^.]+$/);
  return match ? match[0] : "";
};

const getAttachmentDisplayName = (fileName = "") => {
  const sanitizedName = fileName
    .replace(/[\u0000-\u001f\u007f/\\]/g, "")
    .trim();

  if (!sanitizedName) {
    return "Selected file";
  }

  return sanitizedName.length > 80
    ? `${sanitizedName.slice(0, 77)}...`
    : sanitizedName;
};

const hasUnsafeFileName = (fileName = "") => {
  const trimmedFileName = fileName.trim();

  return (
    !trimmedFileName ||
    fileName.length > 120 ||
    trimmedFileName.startsWith(".") ||
    /[\u0000-\u001f\u007f/\\]/.test(fileName)
  );
};

const isAllowedAttachmentType = (file) => {
  const extension = getFileExtension(file.name);
  const allowedMimeTypes = ATTACHMENT_ALLOWED_BY_EXTENSION.get(extension);

  if (!allowedMimeTypes) {
    return false;
  }

  const mimeType = (file.type || "").toLowerCase();
  return !mimeType || allowedMimeTypes.has(mimeType);
};

const isSameAttachment = (firstFile, secondFile) =>
  firstFile.name === secondFile.name &&
  firstFile.size === secondFile.size &&
  firstFile.lastModified === secondFile.lastModified;

const getTotalAttachmentBytes = (files) =>
  files.reduce((totalBytes, file) => totalBytes + file.size, 0);

const formatAttachmentSize = (bytes) => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const formatAttachmentErrors = (messages) => {
  const uniqueMessages = [...new Set(messages.filter(Boolean))];

  if (uniqueMessages.length <= 2) {
    return uniqueMessages.join(" ");
  }

  return `${uniqueMessages.slice(0, 2).join(" ")} ${
    uniqueMessages.length - 2
  } more file(s) were skipped.`;
};

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
  const turnstileRef = useRef(null);
  const fileInputRef = useRef(null);

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

    const attachmentError = validateAttachmentsForSubmit(attachments);
    if (attachmentError) {
      nextErrors.attachment = attachmentError;
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

  const validateAttachment = (file, currentAttachments) => {
    if (hasUnsafeFileName(file.name)) {
      return "File name is not supported. Please rename the file and try again.";
    }

    if (!isAllowedAttachmentType(file)) {
      return `File type not supported. Accepted: ${ATTACHMENT_ALLOWED_LABEL}.`;
    }

    if (file.size <= 0) {
      return "File is empty and cannot be attached.";
    }

    if (file.size > ATTACHMENT_MAX_BYTES) {
      return `Each file must be ${ATTACHMENT_MAX_MB} MB or smaller.`;
    }

    if (
      currentAttachments.some((attachment) =>
        isSameAttachment(attachment, file),
      )
    ) {
      return "This file is already attached.";
    }

    const totalBytes = getTotalAttachmentBytes(currentAttachments) + file.size;
    if (totalBytes > ATTACHMENT_TOTAL_MAX_BYTES) {
      return `Attachments must be ${ATTACHMENT_TOTAL_MAX_MB} MB total or smaller.`;
    }

    return "";
  };

  const validateAttachmentsForSubmit = (files) => {
    if (files.length > ATTACHMENT_MAX_FILES) {
      return `You can attach up to ${ATTACHMENT_MAX_FILES} files.`;
    }

    let checkedAttachments = [];

    for (const file of files) {
      const error = validateAttachment(file, checkedAttachments);
      if (error) {
        return error;
      }

      checkedAttachments = [...checkedAttachments, file];
    }

    return "";
  };

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";

    if (selectedFiles.length === 0) return;

    const nextAttachments = [...attachments];
    const attachmentErrors = [];

    selectedFiles.forEach((file) => {
      if (nextAttachments.length >= ATTACHMENT_MAX_FILES) {
        attachmentErrors.push(
          `You can attach up to ${ATTACHMENT_MAX_FILES} files.`,
        );
        return;
      }

      const attachmentError = validateAttachment(file, nextAttachments);
      if (attachmentError) {
        attachmentErrors.push(
          `${getAttachmentDisplayName(file.name)}: ${attachmentError}`,
        );
        return;
      }

      nextAttachments.push(file);
    });

    if (attachmentErrors.length > 0) {
      setErrors((prev) => ({
        ...prev,
        attachment: formatAttachmentErrors(attachmentErrors),
      }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.attachment;
        return next;
      });
    }

    if (nextAttachments.length !== attachments.length) {
      setAttachments(nextAttachments);
    }
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
      const wasReportTopic = formValues.topic === REPORT_TOPIC;
      const referenceId = response.data?.data?.referenceId;
      const successMessage =
        response.data?.message ||
        (referenceId
          ? `Your report has been received. Reference ID: ${referenceId}.`
          : "Thanks, your message has been sent to the Lomir team.");

      showToast(successMessage);
      setFormValues(initialFormValues);
      setAttachments([]);
      setStatus(wasReportTopic ? "success" : "idle");
      setStatusMessage(wasReportTopic ? successMessage : "");
      setIsEmailFormOpen(wasReportTopic);
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
    const isReportTopic = formValues.topic === REPORT_TOPIC;
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
        {status === "success" && (
          <Alert
            type="success"
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

            <FormGroup
              label="Topic"
              htmlFor="contact-topic"
              helperText={
                isReportTopic
                  ? "Use this topic to report illegal content, abuse, harassment, spam, privacy issues, or security concerns."
                  : ""
              }
              className="mb-0"
            >
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
              helperText={
                isReportTopic
                  ? "Please include enough detail to find the content or account, such as usernames, team names, message context, links, screenshots, and why you believe it should be reviewed."
                  : ""
              }
              required
              className="mb-0"
            >
              <div className="relative">
                <textarea
                  id="contact-message"
                  className={`textarea textarea-bordered min-h-40 w-full resize-y pb-24 ${
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
                  accept={ATTACHMENT_ACCEPT}
                  multiple
                  onChange={handleFileChange}
                  disabled={
                    isSubmitting || attachments.length >= ATTACHMENT_MAX_FILES
                  }
                />
                <div className="pointer-events-none absolute inset-x-3 bottom-2 flex flex-col items-end gap-1 sm:flex-row-reverse sm:items-center sm:gap-3">
                  {attachments.length < ATTACHMENT_MAX_FILES && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSubmitting}
                      aria-describedby="contact-attachment-rules"
                      className="pointer-events-auto btn btn-ghost btn-xs gap-1 px-2 text-base-content/40 hover:text-base-content/70"
                    >
                      <Paperclip size={13} />
                      Attach files
                    </button>
                  )}
                  <p
                    id="contact-attachment-rules"
                    className="w-full text-right text-xs leading-[115%] text-[#9ca3af] sm:flex-1 sm:text-left"
                  >
                    {ATTACHMENT_HELPER_TEXT}
                  </p>
                </div>
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
                      {getAttachmentDisplayName(file.name)}
                    </span>
                    <span className="shrink-0 text-base-content/50">
                      ({formatAttachmentSize(file.size)})
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

            <div className="flex flex-col gap-5">
              <p className="text-xs text-base-content/50 leading-[115%]">
                By submitting this form, your name and email address will be processed
                to respond to your inquiry. See our{" "}
                <Link to="/privacy" className="link link-primary">
                  Privacy Policy
                </Link>{" "}
                for details on how we handle your data.
              </p>

              <div className="flex justify-end">
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
            </div>
        </form>

        {(!isAuthenticated || hasTurnstile) && (
          <div className="mt-12 flex flex-wrap items-end justify-between gap-4">
            {!isAuthenticated && (
              <div className="rounded-lg bg-base-100/60 text-sm text-base-content/70">
                <p>
                  Already part of Lomir?{" "}
                  <Link to="/login" className="link link-primary">
                    Log in
                  </Link>{" "}
                  to contact us through the app chat.
                </p>
              </div>
            )}

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
          Questions, feedback, account help, privacy requests, or content reports
          can all start here.
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
