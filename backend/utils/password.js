/* ------------------------------------------------------------------------------------------
   One definition of an acceptable password, used everywhere one is set.

   The rules follow the current NIST guidance (SP 800-63B) and OWASP's authentication
   cheat sheet: length is what matters most, so the bar is 12 characters rather than 8.
   A mix of upper case, lower case and a number is asked for as well, which knocks out the
   passwords people reach for first (a single dictionary word, a name, "password123").

   What is deliberately NOT done, because the same guidance warns against it:
     - no forced symbol, no "must change every 90 days" — both push people towards
       predictable patterns like "Summer2026!" written on a sticky note;
     - no maximum length below 64, so a passphrase is welcome;
     - no composition rule so strict that only one shape of password passes.

   The message names every unmet rule at once, so nobody has to submit repeatedly to
   discover the whole list.
------------------------------------------------------------------------------------------ */

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 64;

// Each check is a plain predicate so the wording can be built from whatever is unmet.
const RULES = [
    { test: (p) => p.length >= PASSWORD_MIN_LENGTH, label: `at least ${PASSWORD_MIN_LENGTH} characters` },
    { test: (p) => /[a-z]/.test(p), label: "a lower-case letter" },
    { test: (p) => /[A-Z]/.test(p), label: "an upper-case letter" },
    { test: (p) => /\d/.test(p), label: "a number" },
];

// The rules a given password still fails, as a list of human-readable labels.
export function unmetPasswordRules(password = "") {
    return RULES.filter((rule) => !rule.test(String(password))).map((rule) => rule.label);
}

// "at least 12 characters, an upper-case letter and a number" — an Oxford-comma-free list.
export function passwordRuleList(labels) {
    if (labels.length <= 1) return labels[0] || "";
    return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

/* Returns null when the password is fine, or the sentence to show the person when it is
   not. Both the register, reset and admin routes return this straight to the client, so
   the wording a customer reads is the same in every place. */
export function checkPassword(password) {
    const value = String(password ?? "");

    if (value.length > PASSWORD_MAX_LENGTH) {
        return `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`;
    }

    const unmet = unmetPasswordRules(value);
    if (unmet.length) {
        return `Password must contain ${passwordRuleList(unmet)}.`;
    }

    return null;
}
