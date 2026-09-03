import React from "react";
import { MessagesSquare } from "lucide-react";
import FormSectionDivider from "./FormSectionDivider";
import LanguageSelect from "./LanguageSelect";
import { LANGUAGE_FEATURE_VISIBLE } from "../../constants/languages";

/**
 * CommunicationSection
 *
 * How Lomir talks to the user. Shared by the registration form and the
 * profile's edit mode so the two cannot drift apart - the same reason
 * LocationInput is one component across five forms.
 *
 * Named broadly on purpose: the language is its first setting, and later
 * communication preferences (email notification opt-outs and the like) have
 * an obvious home here rather than a second settings-shaped place.
 *
 * ⚠️ Renders nothing while LANGUAGE_FEATURE_VISIBLE is false. Offering
 * "Deutsch" in a UI that then renders English is a promise the app cannot
 * keep; the section appears when the shell is actually translated. Callers
 * must gate the *payload* on the same flag - see the note there.
 *
 * @param {Object} props
 * @param {string} props.value - selected language code
 * @param {Function} props.onChange - receives { target: { name, value } }
 * @param {string} props.name - form field name (camelCase in the profile,
 *   snake_case in the registration form, which posts multipart)
 * @param {boolean} props.disabled
 * @param {string} props.helperText - the sentence under the field
 */
const CommunicationSection = ({
  value,
  onChange,
  name = "preferredLanguage",
  disabled = false,
  helperText = "Lomir uses this language for the app and for the emails we send you. Without a choice, we follow the country in your profile and otherwise your browser.",
}) => {
  if (!LANGUAGE_FEATURE_VISIBLE) return null;

  const fieldId = `communication-${name}`;

  return (
    <section className="space-y-4">
      <FormSectionDivider text="Communication" icon={MessagesSquare} />

      <div className="form-control w-full">
        <label className="label" htmlFor={fieldId}>
          <span className="label-text">Lomir App Language</span>
        </label>

        <LanguageSelect
          id={fieldId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />

        <p className="form-helper-text mt-2 px-1">{helperText}</p>
      </div>
    </section>
  );
};

export default CommunicationSection;
