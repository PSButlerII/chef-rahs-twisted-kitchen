# Dependency Security Advisory Triage

Date: August 3, 2026

Scope: six open high-severity GitHub Dependabot alerts on the default branch,
plus any additional advisories reported by the current npm registry audit.

## Outcome

All vulnerable installed versions were replaced through targeted npm overrides.
No framework, payment, database, authentication, React, Tailwind, or Square
package was upgraded across a major version. Both `npm audit` and
`npm audit --omit=dev` report zero vulnerabilities after installation.

GitHub alerts will remain open until this commit reaches the default branch and
Dependabot rescans `package-lock.json`.

## Alert-by-alert triage

| GitHub alert / advisory    | Package and vulnerable range                            | Dependency path and scope                                                                      | Application exposure                                                                                                                                                                                            | Fix applied                                                                                                      | Remaining risk and validation                                                                                            |
| -------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| #48, `GHSA-mh99-v99m-4gvg` | `brace-expansion >=4.0.0 <5.0.8`; first patched `5.0.8` | `react-email > glob > minimatch > brace-expansion`; transitive runtime classification          | The app does not accept customer-controlled glob patterns. The vulnerable expansion path is not used by payment or request handling, but the package ships in the dependency graph.                             | Override the 5.x line to `5.0.9`, which also includes the follow-up mitigation.                                  | No vulnerable 5.x copy remains; audits and dependency-tree inspection pass.                                              |
| #45, `GHSA-r28c-9q8g-f849` | `postcss <=8.5.17`; first patched `8.5.18`              | `next > postcss` and `@tailwindcss/postcss > postcss`; transitive runtime/build classification | PostCSS runs during trusted application builds. The app has no endpoint that processes user-supplied CSS or `sourceMappingURL` comments.                                                                        | Raise the existing PostCSS override from `8.5.10` to `8.5.25`.                                                   | Current patch includes later incomplete-fix corrections; audits and production build pass.                               |
| #43, `GHSA-6g55-p6wh-862q` | `postcss <=8.5.11`; first patched `8.5.12`              | Same Next and Tailwind PostCSS paths; transitive runtime/build classification                  | No untrusted CSS-processing feature exists, so the arbitrary-file-read path was not application-reachable. Build tooling was still vulnerable if fed a malicious source.                                        | Same `postcss@8.5.25` override.                                                                                  | No vulnerable PostCSS copy remains; audits and build pass.                                                               |
| #32, `GHSA-3jxr-9vmj-r5cp` | `brace-expansion <1.1.16`; first patched `1.1.16`       | `eslint > minimatch > brace-expansion`; transitive development scope                           | ESLint uses trusted repository patterns during local/CI checks. No production request path uses this 1.x copy.                                                                                                  | Override the 1.x line to `1.1.18`.                                                                               | Development-only denial-of-service risk removed; lint and full audit pass.                                               |
| #24, `GHSA-f88m-g3jw-g9cj` | `sharp <0.35.0`; first patched `0.35.0`                 | `next > sharp`; optional transitive runtime dependency                                         | Next image optimization uses Sharp. Site/admin images can reach this runtime path, although uploads are authenticated and restricted by application validation. This was the most relevant production exposure. | Override Sharp to `0.35.3`, bringing the patched libvips release, and update its install-script allowlist entry. | Image/build compatibility validated by the Next production build and page smoke tests. No vulnerable Sharp copy remains. |
| #17, `GHSA-3jxr-9vmj-r5cp` | `brace-expansion >=3.0.0 <5.0.7`; first patched `5.0.7` | `react-email > glob > minimatch > brace-expansion`; transitive runtime classification          | No attacker-controlled glob input is passed through the email/rendering flow.                                                                                                                                   | Override the installed 5.x line to `5.0.9`.                                                                      | No vulnerable runtime copy remains; production-only audit passes.                                                        |

## Additional npm audit coverage

The registry audit also reported `GHSA-rgw5-rvv9-x895`, a follow-up
brace-expansion denial-of-service advisory, and `GHSA-fxqj-rqcc-2cmp`, an
incomplete PostCSS source-map fix. They were not among the six open GitHub
alerts returned during this review. The selected `brace-expansion@5.0.9`,
`brace-expansion@1.1.18`, and `postcss@8.5.25` overrides cover them as well.

## Package changes

- `brace-expansion` 1.x: `1.1.14` to `1.1.18`.
- `brace-expansion` 5.x: `5.0.6` to `5.0.9`.
- `postcss`: `8.5.10` to `8.5.25`.
- `sharp`: `0.34.5` to `0.35.3` with matching platform/libvips packages.
- Prisma install-script allowlist entries were synchronized to the already
  installed `7.9.1` toolchain so clean installs remain warning-free.

These are transitive overrides only. Application source, Square payment logic,
the production readiness gate, CSP behavior, and environment defaults were not
changed.

## Validation

- `npm audit`: zero vulnerabilities.
- `npm audit --omit=dev`: zero vulnerabilities.
- Installed tree contains only the patched versions listed above.
- Prisma validation/client generation, lint, TypeScript, Next production build,
  migration status, checkout/admin smoke tests, and `git diff --check` passed.
- No production Square call was made and production payments remain disabled.
