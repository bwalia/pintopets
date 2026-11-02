// Flat ESLint config for the Next.js app (adds Next, React, a11y rules).
import nextVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";
import { base } from "./base.js";

/** @type {import("eslint").Linter.Config[]} */
export const next = [
  // Next first: it sets its own parser, and the typescript-eslint parser from
  // `base` must win for TypeScript rules to work.
  ...nextVitals,
  ...base,
  {
    rules: {
      // Accessibility is a requirement (WCAG 2.2 AA), so a11y rules are errors.
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/label-has-associated-control": "error",
    },
  },
  prettier,
];

export default next;
