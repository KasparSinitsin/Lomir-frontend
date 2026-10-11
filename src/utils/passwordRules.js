/**
 * The checks of the password rule: at least one letter and one number.
 *
 * "Letter" and "number" mean any script. The checks were `[A-Za-z]` and `\d`,
 * which refused a password whose only letter was ß, ä or a Cyrillic one. The
 * backend repeats the rule (BE `utils/passwordRules.js`, the register, reset and
 * change handlers) and the two must change together.
 *
 * ⚠️ The rule is not the industry standard (NIST SP 800-63B-4 and OWASP ASVS
 * advise against composition rules). Julia, 2026-10-11: keep it for now; a
 * change of policy is its own decision and a leaked-password check through an
 * outside service needs a data-protection review first.
 */
export const hasLetter = (password) => /\p{L}/u.test(password);
export const hasNumber = (password) => /\p{Nd}/u.test(password);
