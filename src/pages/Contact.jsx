import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import {
  Mail,
  MessageCircle,
  Paperclip,
  PenLine,
  Send,
  X,
} from "lucide-react";
import Alert from "../components/common/Alert";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import FormGroup from "../components/common/FormGroup";
import TurnstileWidget from "../components/common/TurnstileWidget";
import { useAuth } from "../contexts/AuthContext";
import { getActiveLocale } from "../utils/languageUtils";
import { useLanguage } from "../contexts/LanguageContext";
import api from "../services/api";

const LOMIR_CONTACT_USER_ID = (
  import.meta.env.VITE_LOMIR_CONTACT_USER_ID || ""
).trim();

const REPORT_TOPIC_CODE = "report";

/**
 * The topic dropdown, in display order. Values only — the labels live in the
 * locale files and are resolved by `topicLabel()` below.
 *
 * ⚠️ The value and the label were one and the same English string until
 * 2026-09-12, and the backend decides whether a submission becomes a DSA
 * report by comparing it (`topic.trim() === "Report content or abuse"`).
 * Translating the label — which is exactly what has now happened — would have
 * meant no report row, no reference code and no receipt email: the legally
 * required channel failing silently, with no test to catch it, because both
 * repos read the same constant.
 *
 * The backend keeps its own copy in `src/config/contactTopics.js` and maps the
 * code back to the English label it stores. The two repos deploy separately,
 * so a new topic changes both.
 */
const topicCodes = [
  "general",
  "account",
  "privacy",
  REPORT_TOPIC_CODE,
  "feedback",
];

const initialFormValues = {
  name: "",
  email: "",
  topic: topicCodes[0],
  message: "",
};

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

const getFileExtension = (fileName = "") => {
  const match = fileName.toLowerCase().match(/\.[^.]+$/);
  return match ? match[0] : "";
};

const isUnsafeFileNameCharacter = (char) => {
  const code = char.charCodeAt(0);
  return code <= 31 || code === 127 || char === "/" || char === "\\";
};

/**
 * The file name as it can safely be shown, or "" when nothing is left of it.
 *
 * ⚠️ Returns "" rather than a placeholder on purpose. It used to return the
 * finished English words "Selected file" — a pure helper handing a sentence to
 * a component that cannot translate it, which is the shape that left
 * `MessageBubble` and `MessageInput` marked translated while they rendered
 * English (see `utils/fileExpiration.js`). The caller supplies the label,
 * because the caller is what has `t`.
 */
const getAttachmentDisplayName = (fileName = "") => {
  const sanitizedName = fileName
    .split("")
    .filter((char) => !isUnsafeFileNameCharacter(char))
    .join("")
    .trim();

  if (!sanitizedName) {
    return "";
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
    [...fileName].some(isUnsafeFileNameCharacter)
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

/**
 * An attachment's size, in the reader's own conventions.
 *
 * ⚠️ Was `${(bytes / 1048576).toFixed(1)} MB`, which is a decimal point in
 * every language — "1.5 MB" to a German reader, where the separator means
 * nothing or, worse, reads as a thousands group. `toFixed` is not a
 * formatter, it is a string operation that happens to look like one.
 *
 * Built the same way as `formatDistance` in `locationUtils.js`: through
 * `Intl` with `getActiveLocale()`, so nothing here decides what a number
 * looks like. That is the rule FE #614 established for dates.
 *
 * ⚠️ One visible consequence: Intl writes the SI-correct "kB", not "KB".
 * Accepted — the same trade as English moving to a 24-hour clock, where the
 * formatter's answer wins over the previous hand-built string.
 */
const formatAttachmentSize = (bytes) => {
  const isMegabytes = bytes >= 1024 * 1024;
  const value = isMegabytes
    ? bytes / (1024 * 1024)
    : Math.max(1, Math.round(bytes / 1024));

  return new Intl.NumberFormat(getActiveLocale(), {
    style: "unit",
    unit: isMegabytes ? "megabyte" : "kilobyte",
    unitDisplay: "short",
    maximumFractionDigits: isMegabytes ? 1 : 0,
    minimumFractionDigits: isMegabytes ? 1 : 0,
  }).format(value);
};

/**
 * Which of several attachment errors to show, and how many are left over.
 *
 * Deliberately returns numbers rather than a sentence: the leftover count
 * needs a plural, and German does not form it the way the old
 * `"N more file(s) were skipped."` pretended English did either. The caller
 * renders it through ICU.
 */
const summariseAttachmentErrors = (messages) => {
  const uniqueMessages = [...new Set(messages.filter(Boolean))];

  return {
    shown: uniqueMessages.slice(0, 2),
    skipped: Math.max(0, uniqueMessages.length - 2),
  };
};

const Contact = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  // The receipt email for an abuse report is chosen from this, because there
  // is no account to resolve it from — a DSA report may be filed by anyone.
  // `language` is what the app is actually rendered in, not what the
  // precedence chain resolved to, so the mail matches the page the reporter
  // read. While LANGUAGE_FEATURE_VISIBLE is false that is "en" for everyone,
  // which is correct: the form they just filled in was English too.
  //
  // ⚠️ Not gated on the flag, unlike RegisterForm. That gate exists because
  // registration *stores* a value and a stored guess would outrank the country
  // rule forever. This value is thrown away after one email.
  const { language } = useLanguage();
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
      nextErrors.name = t("contact.validation.name");
    }

    if (!trimmedEmail) {
      nextErrors.email = t("contact.validation.email");
    } else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      nextErrors.email = t("contact.validation.emailInvalid");
    }

    if (!formValues.message.trim()) {
      nextErrors.message = t("contact.validation.message");
    }

    const attachmentError = validateAttachmentsForSubmit(attachments);
    if (attachmentError) {
      nextErrors.attachment = attachmentErrorText(attachmentError);
    }

    if (hasTurnstile && !turnstileToken) {
      nextErrors.turnstile = t("contact.validation.captcha");
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetTurnstile = () => {
    turnstileRef.current?.reset();
    setTurnstileToken(null);
  };

  /**
   * Which rule an attachment breaks, as a code — never as a sentence.
   *
   * The values every message needs (the size limits, the type list) are
   * module constants, so the resolver below can supply them without this
   * having to carry them.
   */
  const validateAttachment = (file, currentAttachments) => {
    if (hasUnsafeFileName(file.name)) return "unsafeName";
    if (!isAllowedAttachmentType(file)) return "wrongType";
    if (file.size <= 0) return "empty";
    if (file.size > ATTACHMENT_MAX_BYTES) return "tooLarge";

    if (
      currentAttachments.some((attachment) =>
        isSameAttachment(attachment, file),
      )
    ) {
      return "duplicate";
    }

    const totalBytes = getTotalAttachmentBytes(currentAttachments) + file.size;
    if (totalBytes > ATTACHMENT_TOTAL_MAX_BYTES) return "totalTooLarge";

    return "";
  };

  /**
   * One code -> one sentence.
   *
   * ⚠️ Written as an explicit switch of literal keys rather than
   * `t(`contact.attachment.${code}`)`, which would be shorter and would read
   * fine. A template key is invisible to `npm run i18n:check`: it reports the
   * call as unverifiable and every one of these keys as unused, so a typo or a
   * deleted German string would pass. Seven literals keep the check meaningful.
   */
  const attachmentErrorText = (code) => {
    switch (code) {
      case "unsafeName":
        return t("contact.attachment.unsafeName");
      case "wrongType":
        return t("contact.attachment.wrongType", {
          types: ATTACHMENT_ALLOWED_LABEL,
        });
      case "empty":
        return t("contact.attachment.empty");
      case "tooLarge":
        return t("contact.attachment.tooLarge", { maxMb: ATTACHMENT_MAX_MB });
      case "duplicate":
        return t("contact.attachment.duplicate");
      case "totalTooLarge":
        return t("contact.attachment.totalTooLarge", {
          totalMb: ATTACHMENT_TOTAL_MAX_MB,
        });
      case "tooMany":
        return t("contact.attachment.tooMany", {
          maxFiles: ATTACHMENT_MAX_FILES,
        });
      default:
        return "";
    }
  };

  const validateAttachmentsForSubmit = (files) => {
    if (files.length > ATTACHMENT_MAX_FILES) {
      return "tooMany";
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

  /**
   * One topic code -> its label. Same reasoning as `attachmentErrorText`:
   * literal keys so `npm run i18n:check` can actually verify them, rather
   * than a template key it has to report as unverifiable.
   */
  const topicLabel = (code) => {
    switch (code) {
      case "general":
        return t("contact.topics.general");
      case "account":
        return t("contact.topics.account");
      case "privacy":
        return t("contact.topics.privacy");
      case REPORT_TOPIC_CODE:
        return t("contact.topics.report");
      case "feedback":
        return t("contact.topics.feedback");
      default:
        return code;
    }
  };

  /** The file name, or the placeholder when nothing safe is left of it. */
  const attachmentDisplayName = (fileName) =>
    getAttachmentDisplayName(fileName) || t("contact.attachment.selectedFile");

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";

    if (selectedFiles.length === 0) return;

    const nextAttachments = [...attachments];
    const attachmentErrors = [];

    selectedFiles.forEach((file) => {
      if (nextAttachments.length >= ATTACHMENT_MAX_FILES) {
        attachmentErrors.push(attachmentErrorText("tooMany"));
        return;
      }

      const attachmentError = validateAttachment(file, nextAttachments);
      if (attachmentError) {
        attachmentErrors.push(
          t("contact.attachment.fileError", {
            name: attachmentDisplayName(file.name),
            message: attachmentErrorText(attachmentError),
          }),
        );
        return;
      }

      nextAttachments.push(file);
    });

    if (attachmentErrors.length > 0) {
      const { shown, skipped } = summariseAttachmentErrors(attachmentErrors);
      const summary = skipped
        ? `${shown.join(" ")} ${t("contact.attachment.moreSkipped", {
            count: skipped,
          })}`
        : shown.join(" ");

      setErrors((prev) => ({ ...prev, attachment: summary }));
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
        body.append("language", language);
        attachments.forEach((file) => body.append("attachments", file));
      } else {
        body = {
          name: formValues.name.trim(),
          email: formValues.email.trim(),
          topic: formValues.topic,
          message: formValues.message.trim(),
          language,
          ...(hasTurnstile ? { turnstile_token: turnstileToken } : {}),
        };
      }

      const response = await api.post("/api/contact", body);
      const referenceId = response.data?.data?.referenceId;
      // ⚠️ `response.data.message` is deliberately NOT read here, though the
      // backend always sends one. On success it is pure prose restating what
      // `success` and `data.referenceId` already say — and it is English, so
      // reading it turned the most visible moment of a German form back into
      // English. Seen in the browser 2026-09-13, right after the reference
      // code came back correctly.
      //
      // This is decision 7 applied rather than deferred: the backend emits the
      // data, the frontend formulates. No wire-format change was needed,
      // because the datum was already there. The error path below still falls
      // back to the backend's text — there the frontend genuinely does not
      // know what went wrong, and those messages do need codes (their own
      // change, tracked in STATUS.md).
      const successMessage = referenceId
        ? t("contact.status.reportReceived", { reference: referenceId })
        : t("contact.status.sent");

      setFormValues(initialFormValues);
      setAttachments([]);
      setStatus("success");
      setStatusMessage(successMessage);
      setIsEmailFormOpen(false);
      resetTurnstile();
    } catch (error) {
      console.error("Contact form submission error:", error);
      setStatus("error");
      setStatusMessage(
        error.response?.data?.message || t("contact.status.error"),
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
    const hasSuccessMessage = status === "success" && Boolean(statusMessage);
    const isReportTopic = formValues.topic === REPORT_TOPIC_CODE;
    const emailSubtitle = isAuthenticated
      ? t("contact.email.subtitle")
      : t("contact.email.subtitleGuest");

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
                {hasSuccessMessage
                  ? t("contact.email.titleAgain")
                  : t("contact.email.title")}
              </h3>
              {/* Not clamped: see the note beside the open card below. */}
              <p>{emailSubtitle}</p>
            </div>
          </div>

          {hasSuccessMessage && (
            <Alert
              type="success"
              message={statusMessage}
              className="mt-5 w-full shadow-[0_4px_10px_rgba(0,0,0,0.12),0_12px_30px_rgba(0,0,0,0.18),0_28px_56px_rgba(0,0,0,0.14)]"
            />
          )}

          <div className="mt-auto flex justify-end pt-6">
            <Button
              type="button"
              variant="primary"
              icon={<PenLine size={16} />}
              className="w-full sm:w-auto"
              onClick={() => {
                setStatus("idle");
                setStatusMessage("");
                setIsEmailFormOpen(true);
              }}
            >
              {t("contact.email.compose")}
            </Button>
          </div>

          {!isAuthenticated && (
            <div className="mt-6 rounded-lg bg-base-100/60 text-left text-sm text-base-content/70 sm:text-right">
              <p>
                <Trans
                  i18nKey="contact.loginHint"
                  components={[
                    <Link key="login" to="/login" className="link link-primary" />,
                  ]}
                />
              </p>
            </div>
          )}
        </Card>
      );
    }

    return (
      <Card
        title={t("contact.email.title")}
        subtitle={emailSubtitle}
        /* ⚠️ Card clamps a subtitle to two lines so cards in a grid match in
           height. On this page that only ever loses text: the long subtitle is
           the one for signed-out visitors, and a signed-out visitor sees this
           card ALONE — `canUseInAppContact` requires being signed in. So the
           clamp never balanced anything here, it only cut.
           Found on a phone, 2026-09-13, reading the German page: the sentence
           stopped after "…schreibst du dem". Pre-existing and not a German
           problem — the English is 89 characters against German's 92 and was
           being cut in the same place. Nobody had read it. */
        clampSubtitle={false}
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormGroup
                label={t("contact.form.name")}
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
                  placeholder={t("contact.form.namePlaceholder")}
                  disabled={isSubmitting}
                />
              </FormGroup>

              <FormGroup
                label={t("contact.form.email")}
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
                  placeholder={t("contact.form.emailPlaceholder")}
                  disabled={isSubmitting}
                />
              </FormGroup>
              <FormGroup
                label={t("contact.form.topic")}
                htmlFor="contact-topic"
                helperText={isReportTopic ? t("contact.report.topicHelp") : ""}
                className="mb-0"
              >
                <select
                  id="contact-topic"
                  className="select select-bordered w-full"
                  value={formValues.topic}
                  onChange={(event) => updateField("topic", event.target.value)}
                  disabled={isSubmitting}
                >
                  {topicCodes.map((code) => (
                    <option key={code} value={code}>
                      {topicLabel(code)}
                    </option>
                  ))}
                </select>
              </FormGroup>
            </div>

            <FormGroup
              label={t("contact.form.message")}
              htmlFor="contact-message"
              error={errors.message}
              helperText={isReportTopic ? t("contact.report.messageHelp") : ""}
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
                  placeholder={t("contact.form.messagePlaceholder")}
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
                      {t("contact.attachment.attach")}
                    </button>
                  )}
                  <p
                    id="contact-attachment-rules"
                    className="w-full text-right text-xs leading-[115%] text-[#9ca3af] sm:flex-1 sm:text-left"
                  >
                    {t("contact.attachment.rules", {
                      types: ATTACHMENT_ALLOWED_LABEL,
                      maxFiles: ATTACHMENT_MAX_FILES,
                      maxMb: ATTACHMENT_MAX_MB,
                      totalMb: ATTACHMENT_TOTAL_MAX_MB,
                    })}
                  </p>
                </div>
              </div>
            </FormGroup>

            {(attachments.length > 0 || errors.attachment) && (
              <div className="space-y-1.5">
                <div className="grid gap-1.5 lg:grid-cols-2">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex min-w-0 items-center gap-2 rounded-lg border border-base-300 bg-base-200/50 px-3 py-2 text-sm"
                    >
                      <Paperclip size={14} className="shrink-0 text-base-content/60" />
                      <span className="min-w-0 truncate text-base-content/80">
                        {attachmentDisplayName(file.name)}
                      </span>
                      <span className="shrink-0 text-base-content/50">
                        ({formatAttachmentSize(file.size)})
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        disabled={isSubmitting}
                        className="btn btn-ghost btn-xs ml-auto shrink-0 p-0.5"
                        aria-label={t("contact.attachment.remove")}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                {errors.attachment && (
                  <p className="text-xs text-error">{errors.attachment}</p>
                )}
              </div>
            )}

            <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              {hasTurnstile && (
                <div className="form-control">
                  <div className="flex justify-center">
                    <TurnstileWidget
                      ref={turnstileRef}
                      size="normal"
                      onVerify={handleTurnstileVerify}
                      onExpire={() => setTurnstileToken(null)}
                      onError={() => setTurnstileToken(null)}
                    />
                  </div>
                  {errors.turnstile && (
                    <p className="mt-1 text-center text-xs text-error sm:text-left">
                      {errors.turnstile}
                    </p>
                  )}
                </div>
              )}
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
                    {t("contact.form.submitting")}
                  </>
                ) : (
                  t("contact.form.submit")
                )}
              </Button>
            </div>
        </form>

        {!isAuthenticated && (
          <div className="mt-12 rounded-lg bg-base-100/60 text-sm text-base-content/70">
            <p>
              <Trans
                i18nKey="contact.loginHint"
                components={[
                  <Link key="login" to="/login" className="link link-primary" />,
                ]}
              />
            </p>
          </div>
        )}

        <p className="mt-6 text-xs text-base-content/50">
          <Trans
            i18nKey="contact.privacyNote"
            components={[
              <Link key="privacy" to="/privacy" className="link link-primary" />,
            ]}
          />
        </p>
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
              {t("contact.inApp.title")}
            </h3>
            {/* Not clamped, same reasoning as the card above. */}
            <p>{t("contact.inApp.subtitle")}</p>
          </div>
        </div>

        <p className="text-base-content/75">
          {t("contact.inApp.body")}
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
            {t("contact.inApp.button")}
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
          {t("contact.title")}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base-content/75">
          {t("contact.intro")}
          <br />
          {t("contact.introSecondLine")}
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
