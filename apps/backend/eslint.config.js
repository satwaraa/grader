import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
    globalIgnores([
        "dist",
        "node_modules",
        "generated",
        "workers/python",
        ".venv",
        "**/.venv/**",
    ]),
    {
        files: ["**/*.{ts,js}"],
        extends: [js.configs.recommended, tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: 2020,
            globals: {
                ...globals.node,
                Bun: "readonly",
            },
        },
        rules: {
            // Allow unused vars prefixed with _
            "@typescript-eslint/no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
            // Allow explicit any in some cases (can tighten later)
            "@typescript-eslint/no-explicit-any": "warn",
            // Prefer const
            "prefer-const": "warn",
            // No console in production (warn only)
            "no-console": "off",
        },
    },
    // Disable all checks for catchAsyncWrapper
    {
        files: ["**/catchAsyncWrapper.ts"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
        },
    },
]);
