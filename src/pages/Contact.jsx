import { useState } from "react";
import { Mail, MessageCircle, Send, ShieldCheck } from "lucide-react";
import Alert from "../components/common/Alert";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import FormGroup from "../components/common/FormGroup";

const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || "contact@lomir.app";

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
  const [formValues, setFormValues] = useState(initialFormValues);
  const [errors, setErrors] = useState({});
  const [messageSent, setMessageSent] = useState(false);

  const updateField = (field, value) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: "",
    }));
    setMessageSent(false);
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

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const subject = `Lomir contact: ${formValues.topic}`;
    const body = [
      `Name: ${formValues.name.trim()}`,
      `Email: ${formValues.email.trim()}`,
      `Topic: ${formValues.topic}`,
      "",
      formValues.message.trim(),
    ].join("\n");

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    setMessageSent(true);
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
          Questions, feedback, account help, or privacy requests can all start
          here. We will get your message to the right place.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] items-start">
        <Card
          title="Send us a message"
          subtitle="Use your email client to send a prepared message to the Lomir team."
          hoverable={false}
          truncateContent={false}
        >
          {messageSent && (
            <Alert
              type="success"
              message="Your email client should open with the message ready to send."
              className="mb-5 w-full shadow-sm"
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-1">
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
                />
              </FormGroup>
            </div>

            <FormGroup label="Topic" htmlFor="contact-topic" className="mb-0">
              <select
                id="contact-topic"
                className="select select-bordered w-full"
                value={formValues.topic}
                onChange={(event) => updateField("topic", event.target.value)}
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
                onChange={(event) =>
                  updateField("message", event.target.value)
                }
                placeholder="Tell us what is on your mind"
              />
            </FormGroup>

            <div className="pt-3">
              <Button
                type="submit"
                variant="primary"
                icon={<Send size={16} />}
                className="w-full sm:w-auto"
              >
                Prepare Email
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card
            title="Direct email"
            subtitle="Prefer a blank email? Write to us directly."
            hoverable={false}
            truncateContent={false}
            marginClassName="mb-0"
            imageReplacement={<Mail size={26} className="text-primary" />}
          >
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="link link-primary break-all text-sm sm:text-base"
            >
              {CONTACT_EMAIL}
            </a>
          </Card>

          <Card
            title="Account and privacy"
            subtitle="For profile, email, deletion, or data questions."
            hoverable={false}
            truncateContent={false}
            marginClassName="mb-0"
            imageReplacement={
              <ShieldCheck size={26} className="text-primary" />
            }
          >
            <p className="text-base-content/75">
              Include the email address connected to your Lomir account so we
              can help faster.
            </p>
          </Card>

          <Card
            title="Feedback"
            subtitle="Ideas, bugs, or rough edges are welcome."
            hoverable={false}
            truncateContent={false}
            marginClassName="mb-0"
            imageReplacement={
              <MessageCircle size={26} className="text-primary" />
            }
          >
            <p className="text-base-content/75">
              Tell us what you were trying to do and where the app surprised
              you.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Contact;
