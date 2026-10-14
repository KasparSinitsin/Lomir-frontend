import React from "react";
import { useTranslation } from "react-i18next";
import { MessagesSquare } from "lucide-react";
import FormSectionDivider from "./FormSectionDivider";
import LanguageSelect from "./LanguageSelect";

/**
 * CommunicationSection
 *
 * How Lomir talks to the user. Shared by the registration form and the
 * settings page so the two cannot drift apart - the same reason LocationInput
 * is one component across five forms.
 *
 * It lived in the profile's edit mode until 2026-09-04. It is a setting, not
 * part of how someone presents themselves, and on the settings page it also
 * applies immediately instead of waiting behind a Save button.
 *
 * Named broadly on purpose: the language is its first setting, and later
 * communication preferences (email notification opt-outs and the like) have
 * an obvious home here rather than a second settings-shaped place.
 *
 * What the picker shows is what gets stored: on the settings page it saves
 * the moment a language is chosen, and the registration form posts it with
 * the other fields.
 *
 * @param {Object} props
 * @param {string} props.value - selected language code
 * @param {Function} props.onChange - receives { target: { name, value } }
 * @param {string} props.name - form field name (camelCase in the profile,
 *   snake_case in the registration form, which posts multipart)
 * @param {boolean} props.disabled
 */
const CommunicationSection = ({
  value,
  onChange,
  name = "preferredLanguage",
  disabled = false,
}) => {
  const { t } = useTranslation();

  const fieldId = `communication-${name}`;

  return (
    <section className="space-y-4">
      <FormSectionDivider
        text={t("communication.sectionTitle")}
        icon={MessagesSquare}
      />

      <div className="form-control w-full">
        <label className="label" htmlFor={fieldId}>
          <span className="label-text">
            {t("communication.languageLabel")}
          </span>
        </label>

        <LanguageSelect
          id={fieldId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />

        <p className="form-helper-text mt-2 px-1">
          {t("communication.languageHelp")}
        </p>
      </div>
    </section>
  );
};

export default CommunicationSection;
