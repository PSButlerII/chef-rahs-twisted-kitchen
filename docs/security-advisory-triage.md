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

## Brace-expansion 1.x follow-up

GitHub subsequently reported `CVE-2026-14257` / `GHSA-mh99-v99m-4gvg`
against `brace-expansion@1.1.18`. The remaining development-only path was
`eslint@9.39.4 > minimatch@3.1.5 > brace-expansion@1.1.18`. The npm registry
audit returned zero vulnerabilities because its current advisory data did not
classify that installed 1.x version as vulnerable, while GitHub Dependabot's
advisory treats versions through `5.0.7` as affected.

The latest compatible ESLint 9 release still depends on `minimatch@^3.1.5`, so
a non-major parent upgrade cannot remove the path. A direct override from
brace-expansion 1.x to 5.x was rejected during testing because the module API is
not compatible with minimatch 3. The remediation instead overrides legacy
`minimatch@^3.1.0` requests to the already-installed `10.2.5` line. After a
clean npm install, the dependency tree contains one deduplicated
`minimatch@10.2.5 > brace-expansion@5.0.9` copy; no 1.x copy remains. ESLint,
the full application check and build, both audit modes, Prisma validation and
generation, TypeScript, migration status, and lockfile checks pass.

## js-yaml development dependency follow-up

On August 7, 2026, `npm audit` reported `CVE-2026-59870` /
`GHSA-5p4m-2wfm-xmqj` against `js-yaml@4.3.0`. The affected range reported by
npm is `4.0.0` through `4.3.0`; `4.3.1` is the first patched 4.x release. The
only installed path was development-only:
`eslint@9.39.4 > @eslint/eslintrc@3.3.5 > js-yaml@4.3.0`.

Repository source does not import `js-yaml` or parse customer-controlled YAML,
and `npm audit --omit=dev` remained clean, so this advisory did not expose a
production request or payment path. It could still affect local or CI linting
if untrusted YAML were introduced into that tooling flow.

The remediation updates the compatible transitive parent
`@eslint/eslintrc` from `3.3.5` to `3.3.6` and resolves its `js-yaml` dependency
to patched `4.3.1`. Both changes stay within their existing major versions and
require no override, direct dependency, or application-code change. After
installation, both audit modes report zero vulnerabilities and the dependency
tree contains only `js-yaml@4.3.1`. Prisma validation and generation,
TypeScript, ESLint, and lockfile checks pass. The full application check,
production build, and migration-status check were retried but remain blocked
at Prisma's connection to the validation database at `192.168.8.195:3306`;
the build does not begin because its migration preflight stops with a schema
engine error. No Square provider call was made.

## Alert-by-alert triage

| GitHub alert / advisory    | Package and vulnerable range                            | Dependency path and scope                                                                      | Application exposure                                                                                                                                                                                            | Fix applied                                                                                                      | Remaining risk and validation                                                                                            |
| -------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| #48, `GHSA-mh99-v99m-4gvg` | `brace-expansion >=4.0.0 <5.0.8`; first patched `5.0.8` | `react-email > glob > minimatch > brace-expansion`; transitive runtime classification          | The app does not accept customer-controlled glob patterns. The vulnerable expansion path is not used by payment or request handling, but the package ships in the dependency graph.                             | Override the 5.x line to `5.0.9`, which also includes the follow-up mitigation.                                  | No vulnerable 5.x copy remains; audits and dependency-tree inspection pass.                                              |
| #45, `GHSA-r28c-9q8g-f849` | `postcss <=8.5.17`; first patched `8.5.18`              | `next > postcss` and `@tailwindcss/postcss > postcss`; transitive runtime/build classification | PostCSS runs during trusted application builds. The app has no endpoint that processes user-supplied CSS or `sourceMappingURL` comments.                                                                        | Raise the existing PostCSS override from `8.5.10` to `8.5.25`.                                                   | Current patch includes later incomplete-fix corrections; audits and production build pass.                               |
| #43, `GHSA-6g55-p6wh-862q` | `postcss <=8.5.11`; first patched `8.5.12`              | Same Next and Tailwind PostCSS paths; transitive runtime/build classification                  | No untrusted CSS-processing feature exists, so the arbitrary-file-read path was not application-reachable. Build tooling was still vulnerable if fed a malicious source.                                        | Same `postcss@8.5.25` override.                                                                                  | No vulnerable PostCSS copy remains; audits and build pass.                                                               |
| #32, `GHSA-3jxr-9vmj-r5cp` | `brace-expansion <1.1.16`; first patched `1.1.16`       | `eslint > minimatch > brace-expansion`; transitive development scope                           | ESLint uses trusted repository patterns during local/CI checks. No production request path used this dependency chain.                                                                                          | Superseded by the `minimatch@10.2.5` override, which resolves to `brace-expansion@5.0.9`.                        | No brace-expansion 1.x copy remains; lint and full audit pass.                                                           |
| #24, `GHSA-f88m-g3jw-g9cj` | `sharp <0.35.0`; first patched `0.35.0`                 | `next > sharp`; optional transitive runtime dependency                                         | Next image optimization uses Sharp. Site/admin images can reach this runtime path, although uploads are authenticated and restricted by application validation. This was the most relevant production exposure. | Override Sharp to `0.35.3`, bringing the patched libvips release, and update its install-script allowlist entry. | Image/build compatibility validated by the Next production build and page smoke tests. No vulnerable Sharp copy remains. |
| #17, `GHSA-3jxr-9vmj-r5cp` | `brace-expansion >=3.0.0 <5.0.7`; first patched `5.0.7` | `react-email > glob > minimatch > brace-expansion`; transitive runtime classification          | No attacker-controlled glob input is passed through the email/rendering flow.                                                                                                                                   | Override the installed 5.x line to `5.0.9`.                                                                      | No vulnerable runtime copy remains; production-only audit passes.                                                        |

## Additional npm audit coverage

The registry audit also reported `GHSA-rgw5-rvv9-x895`, a follow-up
brace-expansion denial-of-service advisory, and `GHSA-fxqj-rqcc-2cmp`, an
incomplete PostCSS source-map fix. They were not among the six open GitHub
alerts returned during this review. The selected `brace-expansion@5.0.9` and
`postcss@8.5.25` overrides cover them as well.

## Package changes

- `brace-expansion` 1.x: eliminated by replacing legacy minimatch 3 requests
  with `minimatch@10.2.5`, which resolves to `brace-expansion@5.0.9`.
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

## Prisma / deepmerge-ts and nanoid follow-up

Date: August 26, 2026

### Scope and policy

This review covers the npm audit findings for `deepmerge-ts` and `nanoid`.
Neither package is imported directly by application code. No payment, Square,
refund, webhook, authentication, or production-gate code changed.

### GHSA-ggr8-5vv4-36mx — deepmerge-ts recursive merge exhaustion

- Severity reported by npm: high.
- Vulnerable installed version: `7.1.5`; patched range: `>=8.0.0`.
- Dependency path: root dev dependency `prisma@7.9.1` →
  `@prisma/config@7.9.1` → `deepmerge-ts@7.1.5`.
- Production impact: Prisma config/CLI and build/deploy tooling only. No
  untrusted hosted-request path to the merge API was found. Exploitation would
  require control of trusted Prisma/build configuration or another tooling
  input.
- Fix: parent-scoped npm override for only `@prisma/config@7.9.1`, resolving
  `deepmerge-ts` to `8.0.2`. Prisma itself remains unchanged. Version 8.0.2
  preserves the named `deepmerge` export Prisma uses and passed Prisma
  validation, generation, migration status, and the complete application build.
- Remaining risk: this override crosses Prisma's exact transitive dependency
  major. It is deliberately scoped to the current Prisma config version and
  should be removed when Prisma adopts deepmerge-ts 8 directly.

### GHSA-2v37-7h3g-55p8 — nanoid zero-size custom generator loop

- Severity reported by npm: high.
- Vulnerable installed version: `3.3.17`; patched range: `>=3.3.18`.
- Dependency path: `next@16.2.12` and development dependency
  `@tailwindcss/postcss@4.2.4` → overridden `postcss@8.5.25` →
  `nanoid@3.3.17`.
- Production impact: Nano ID is present in the production install graph through
  Next/PostCSS, but no application import, custom generator call, user-supplied
  CSS processing route, or payment/order/token ID use was found.
- Fix: the existing PostCSS override now scopes Nano ID to `3.3.18`, the first
  patched release. This patch version satisfies PostCSS's declared range and
  preserves its `nanoid/non-secure` API and ID behavior.

### Result

- `npm audit`: zero vulnerabilities.
- `npm audit --omit=dev`: zero vulnerabilities.
- Installed affected versions: `deepmerge-ts@8.0.2` and `nanoid@3.3.18`.
- No vulnerable versions remain in the installed dependency graph.
