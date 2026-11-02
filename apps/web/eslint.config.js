import { next } from "@pintopets/config/eslint/next";

const config = [
  { ignores: [".next/**", "playwright-report/**", "test-results/**", "next-env.d.ts"] },
  ...next,
];

export default config;
