import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Kept as "warn" instead of "error" because:
      // 1. React Hook Form's handleSubmit callback types are structurally `any` in the library's own generics.
      // 2. Axios error objects from catch blocks are typed as `any` in the Axios types themselves.
      // 3. API response `.data` shapes are validated at runtime via Zod on the backend; not re-validated on the frontend.
      // This does NOT suppress the rule globally in the way "off" would — violations still appear as warnings
      // and will surface in IDE tooling.
      "@typescript-eslint/no-explicit-any": "warn"
    }
  }
]);

export default eslintConfig;
