/* The password rules, in one place for the whole frontend.

   This mirrors backend/utils/password.js. The server is what actually enforces them — this
   copy exists so the person sees the rules as they type rather than discovering them in an
   error message after submitting. If the policy changes, both files change together. */

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 64;

// The same checks the server makes, each with a label for the live checklist.
export const PASSWORD_RULES = [
  { label: `At least ${PASSWORD_MIN_LENGTH} characters`, test: (p) => p.length >= PASSWORD_MIN_LENGTH },
  { label: "A lower-case letter", test: (p) => /[a-z]/.test(p) },
  { label: "An upper-case letter", test: (p) => /[A-Z]/.test(p) },
  { label: "A number", test: (p) => /\d/.test(p) },
];

// The rules still unmet, as labels — drives the checklist on the sign-up and reset forms.
export const unmetPasswordRules = (password = "") =>
  PASSWORD_RULES.filter((rule) => !rule.test(String(password))).map((rule) => rule.label);

// The one-line summary for a form that has no room for a checklist.
export const passwordHint = `At least ${PASSWORD_MIN_LENGTH} characters, with upper and lower case and a number.`;
