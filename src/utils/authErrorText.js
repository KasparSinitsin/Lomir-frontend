/**
 * Words a failure from the account endpoints (login, registration, email
 * verification, password reset, the password and email changes, the password
 * that confirms an account deletion) in the reader's language.
 *
 * The backend names what went wrong with a `code` — see
 * `Lomir-backend/src/config/authErrors.js` — and sends it beside the English
 * `message`. Same rule as `teamErrorText.js`: **a response without a known code
 * shows `fallback`, never the backend `message`.** The uncoded answers are the
 * guards the UI already prevents and English sentences nobody translated.
 *
 * The code is read from `error.response.data` (a thrown axios error) or from
 * `error.errorCode` (the result object `AuthContext.login` and `register`
 * return). It is NOT read from `error.code`: axios puts its own codes there
 * (`ERR_NETWORK`).
 *
 * Keys are written out literally so `npm run i18n:check` can see them. Where a
 * page already had the right sentence, the code points at it.
 */
export const getAuthErrorCode = (error) => {
  const code = error?.response?.data?.code ?? error?.errorCode;
  return typeof code === "string" ? code : null;
};

export const getAuthErrorText = (error, t, fallback) => {
  switch (getAuthErrorCode(error)) {
    case "INVALID_CREDENTIALS":
      return t("auth:errors.invalidCredentials");
    case "EMAIL_NOT_VERIFIED":
      return t("auth:errors.emailNotVerified");
    case "USERNAME_TAKEN":
      return t("auth:register.errors.usernameTaken");
    case "CAPTCHA_REQUIRED":
      return t("auth:register.errors.turnstile");
    case "CAPTCHA_FAILED":
      return t("auth:errors.captchaFailed");
    case "VERIFICATION_TOKEN_INVALID":
      return t("auth:verifyEmail.fallbackError");
    case "EMAIL_CHANGE_TOKEN_INVALID":
      return t("auth:verifyEmailChange.fallbackError");
    case "RESET_TOKEN_INVALID":
      return t("auth:resetPassword.fallbackError");
    case "PASSWORD_INCORRECT":
      return t("auth:errors.passwordIncorrect");
    case "PASSWORD_UNCHANGED":
      return t("auth:errors.passwordUnchanged");
    case "EMAIL_UNCHANGED":
      return t("auth:errors.emailUnchanged");
    case "EMAIL_IN_USE":
      return t("auth:verifyEmailChange.conflictFallback");
    case "RATE_LIMITED":
      return t("auth:errors.rateLimited");
    default:
      return fallback;
  }
};
