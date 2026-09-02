# Dependency Security Advisory Triage

## September 2, 2026 — Fast URI transitive dependency remediation

### Baseline and exposure

Base: `e07f3c1c972b0e558afd06d478985c748fe21e88`, synchronized with `origin/main` before creating `fix/fast-uri-advisories-2026-09-02` from a clean working tree.

Both baseline audit commands reported one high-severity vulnerable package, `fast-uri@3.1.5`, with four distinct advisories:

| Advisory | Affected installed 3.x range | Issue | Final result |
| --- | --- | --- | --- |
| [GHSA-5jgf-p345-68v8](https://github.com/advisories/GHSA-5jgf-p345-68v8) | `>=3.1.3 <3.1.6` | Scheme-relative IDN host confusion | Cleared |
| [GHSA-f65p-4m7j-42xc](https://github.com/advisories/GHSA-f65p-4m7j-42xc) | `>=3.0.0 <3.1.6` | Malformed IPv6 normalization | Cleared |
| [GHSA-fph4-wmhf-6fwf](https://github.com/advisories/GHSA-fph4-wmhf-6fwf) | `>=3.1.2 <3.1.6` | Repeated hostname percent-decoding | Cleared |
| [GHSA-jqff-g426-hqxp](https://github.com/advisories/GHSA-jqff-g426-hqxp) | `>=3.0.0 <3.1.6` | Percent-encoded scheme confusion | Cleared |

There was one deduplicated fast-uri instance, reached through these paths:

```text
react-email@6.4.0 (production dependency)
└─ conf@15.1.0
   ├─ ajv@8.20.0 → fast-uri
   └─ ajv-formats@3.0.1 → ajv@8.20.0 → fast-uri
prisma@7.9.1 (development CLI dependency)
└─ @prisma/dev@0.24.17
   └─ @prisma/streams-local@0.1.11 → ajv@8.20.0 → fast-uri
```

All three AJV copies declare `fast-uri: ^3.0.1`; none pins 3.1.5. ESLint's separate `ajv@6.15.0` uses uri-js, not fast-uri. The production audit includes fast-uri through React Email/conf. Inspection locates conf in React Email's CLI, not its public rendering entry point: installed production dependency presence is not proof of a remotely reachable application request path. Repository source searches found no direct fast-uri or AJV imports. Current application URL-policy helpers use native `URL`; `resolve()` matches are filesystem paths or Promise callbacks, not fast-uri calls. No application-level exploit path was established, but the vulnerable installed dependency was removed.

### Decision and final resolution

The configured registry was `https://registry.npmjs.org/`. Registry metadata confirmed 3.1.6 exists and is outside every baseline vulnerable range. It has no declared Node engine restriction and satisfies every parent. At execution time the registry's `three` tag had advanced to **3.1.7** (latest overall: 4.1.4). The supported `npm update fast-uri` command selected **3.1.7**, changing only the version, resolved tarball URL, and integrity of the existing lockfile node. Retaining the newer compatible patch avoids an unnecessary override or artificial downgrade to the minimum patched release. 3.1.7 likewise has no declared engine restriction and is outside all four ranges. No 4.x upgrade was needed.

No project-owned fast-uri override was added. The patched version is maintained through normal parent semver ranges and the lockfile.

Every path above now deduplicates to `fast-uri@3.1.7`; no older or 4.x instance, invalid node, or extraneous node was reported by the focused dependency checks. `package.json` is unchanged, including all prior overrides. No direct fast-uri, mysql2, or mariadb dependency was added. Existing overrides remain effective:

```text
prisma@7.9.1 → mysql2@3.24.2 overridden
@prisma/adapter-mariadb@7.8.0 → mariadb@3.5.3 overridden
```

### Verification

Runtime: Node.js **v26.4.0**, npm **12.0.2**, Windows. No existing nvm/fnm installation or Node 24 runtime was found through the available runtime-manager checks. System tooling was not installed or changed; Node 24 LTS release parity remains an owner/deployment check.

- `npm install` and `npm ci` passed; clean install reproduced only fast-uri 3.1.7, with no SWC lock issue.
- React Email resolved/loaded, and `node node_modules/react-email/dist/cli/index.mjs --help` passed, exercising its conf/AJV imports.
- `node --import tsx -e ...` rendered all eight existing `emailPreviews` from `lib/dev-email-preview-data.ts` through `react-email.render`: order submitted/approved/denied, payment received, catering/personal-chef submitted, catering approved, and deposit paid. Each produced HTML. Delivery wrappers were not invoked; no email was sent.
- Direct conf schema checks in a disposable OS temporary directory accepted a string and rejected a number. All three actual AJV 8.20.0 copies accepted a valid object and rejected an invalid type.
- Native assertion checks exercised ordinary relative resolution, scheme-relative IDN canonicalization, malformed IPv6 rejection, nested encoded host preservation, invalid encoded-scheme rejection, and valid encoded HTTPS normalization. All passed. An initial test-harness import used a non-exported conf package subpath; rerunning through the exact installed filesystem paths passed without changing dependencies or source.
- `npx prisma validate` and `npm run prisma:generate` passed. Prisma loaded configuration without AJV/fast-uri errors.
- A fresh, disposable `chef_fast_uri_qa_20260902` database used MariaDB 11.4.10 bound only to `127.0.0.1:33307`. Initial `prisma migrate status` correctly reported ten unapplied migrations (expected nonzero on an empty database). `prisma migrate deploy` applied all ten committed migrations; `npm run db:seed` created ten baseline allergens; a second deploy reported no pending migrations; final status was up to date. A normal read through `lib/prisma.ts` returned all ten allergens. Only fictional local QA data was created.
- `npm run lint`, `npm run typecheck`, `npm run gallery:qa-ordering`, and `node --import tsx scripts/qa-admin-help.ts` passed.
- `npx next build` and the full `npm run build` lifecycle both passed. The latter explicitly targeted the disposable database; its prebuild generation and migration deploy passed. The existing Node 26 `module.register()` deprecation warning appeared, with no new AJV/fast-uri/driver error.
- Built-server HTTP verification remains **blocked**: the execution environment rejected both the initial and simplified localhost `npm run start -- --hostname 127.0.0.1 --port 3013` launch commands before execution. No alternative launch mechanism was used to bypass that restriction. Public-page, Prisma-backed-page, and authenticated Admin Help HTTP smoke requests against the built application were therefore not performed. The separate direct Prisma read and both builds passed, but they do not replace the requested startup checks. Complete these checks before committing/integrating this remediation.
- `npm audit --json`, `npm audit --omit=dev --json`, `npm audit --audit-level=high`, and `npm audit --omit=dev --audit-level=high` all exited successfully with **zero vulnerabilities**. All four baseline advisories are absent; no unrelated finding remains. No audit suppression, exception, or npm configuration change was added.

Baseline/final dependency commands: `npm ls fast-uri --all`, `npm explain fast-uri`, `npm ls ajv conf react-email prisma --all`, `npm ls mysql2 mariadb --all`, `npm explain mysql2`, and `npm explain mariadb`. Registry checks covered `npm view fast-uri version dist-tags --json`, exact fast-uri 3.1.5/3.1.6/3.1.7/4.1.3 metadata, `npm view ajv version`, `npm view ajv@8 dependencies`, `npm view conf version dependencies`, `npm view react-email version dependencies`, and `npm view prisma@7.9.1 dependencies`, alongside the exact installed manifests.

Independent read-only compatibility investigation and candidate review found no surviving vulnerable path or concrete regression in this narrow dependency diff. No override removal condition is needed. No application, payment, Square, authentication, upload, gallery, help, schema, migration, or client-document behavior was changed. Production services and databases were not contacted for QA.

Verification outcome: dependency advisories are cleared, but release verification is blocked on the built-server smoke checks above. The two-file patch remains uncommitted pending those checks; no push, pull request, or merge was performed.

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

## MariaDB Connector/Node.js dependency remediation

Date: August 29, 2026

### Scope and dependency decision

The original production dependency path was
`@prisma/adapter-mariadb@7.8.0 -> mariadb@3.4.5`. That connector release was
affected by `GHSA-cqhc-2h57-wpxf`, `GHSA-42r5-vhpq-m858`, and
`GHSA-g5xc-5w98-jfvm`.

Repository inspection found no direct import, require, dynamic import, type
import, pool creation, or script usage of the root `mariadb` dependency. The
unused root dependency was removed. A project-owned, adapter-scoped npm
override now resolves only `@prisma/adapter-mariadb`'s connector dependency to
`mariadb@3.5.3`:

```json
"@prisma/adapter-mariadb": {
  "mariadb": "3.5.3"
}
```

The configured official npm registry did not publish the expected `3.4.6`,
`3.4.7`, or `3.5.4` versions when queried. Version `3.5.3` was the newest
available official release, supports the active Node.js runtime, is outside
all three vulnerable ranges, and passed clean-install and application
compatibility checks. Prisma and the Prisma adapter were not upgraded or
patched.

Final resolved tree:

```text
@prisma/adapter-mariadb@7.8.0
└── mariadb@3.5.3 overridden
```

### Database configuration review

Runtime and maintenance clients initialize `PrismaMariaDb` from a parsed
`DATABASE_URL`, passing host, port, user, password, and database only. Current
production documentation and the environment example use `127.0.0.1`, so the
documented Hostinger connection is local TCP rather than a remote database
transport or Unix socket.

- No explicit TLS, CA, client certificate, fingerprint,
  `rejectUnauthorized`, or `sslMode` option is configured. TLS verification
  was not disabled or weakened. If the database moves off-host, verified TLS
  with operator-provided CA/server identity material must be designed and
  tested before changing this configuration.
- No PAM/dialog, `mysql_clear_password`, `restrictedAuth`, or other custom
  authentication-plugin option is configured.
- No legacy East Asian client character set is configured; in particular, no
  `big5`, `gbk`, `sjis`, `cp932`, or `gb18030` setting was found.
- The only application raw SQL uses Prisma tagged `$executeRaw` with string ID
  parameters for atomic weekly-capacity counters. No unsafe raw-query variant,
  direct connector query/execute call, or database Buffer parameter was found.
  Buffer usage is limited to image-upload and upload-QA byte handling.
- No `permitLocalInfile`, `permitSetMultiParamEntries`, or
  `NO_BACKSLASH_ESCAPES` setting was found.

No connection configuration was changed because the repository contains no
explicit unsafe option and does not contain CA infrastructure that could be
safely invented in this dependency-only pass.

### Verification and maintenance

`npm install` regenerated the lockfile, and `npm ci` reproduced the tree.
`npm ls mariadb --all` and `npm explain mariadb` confirmed that `3.4.5` is
absent. Full and production-only npm audits report zero vulnerabilities, so all
three original advisory IDs are cleared. Prisma validation, client generation,
lint, TypeScript, the Next.js production build, and lockfile/diff checks passed.
The repository has no `test` script, so no unsupported test command was
invented.

This scoped override is temporary project-owned security policy. Reevaluate
and remove it when `@prisma/adapter-mariadb` directly declares a sufficiently
patched MariaDB connector version, after the normal clean-install and
application validation suite passes without the override.

## Browserslist and Prisma MySQL2 remediation

Date: September 1, 2026

### Original findings and exposure

- `browserslist@4.28.2` was installed through the development-only path
  `eslint-config-next@16.2.6 -> eslint-plugin-react-hooks@7.1.1 ->
  @babel/core@7.29.6 -> @babel/helper-compilation-targets@7.28.6 ->
  browserslist@4.28.2`. The application does not import Browserslist directly.
  The full audit reported `GHSA-c83g-rgw3-j3cx` and
  `GHSA-73wf-gq98-2v4g`; the production-only audit did not include this
  development path.
- `mysql2@3.15.3` was installed only through `prisma@7.9.1 ->
  mysql2@3.15.3`. There was no root MySQL2 dependency or application import.
  Hosted application database access continues to use
  `@prisma/adapter-mariadb`, while Prisma CLI migration work in build/deploy
  can exercise MySQL2. Both full and production-only audit accounting reported
  `GHSA-3f6p-5ww8-9rcr` through Prisma.

NPM's proposed force remediation would downgrade Prisma to `6.19.3`. That was
rejected because it would cross the active Prisma toolchain boundary and was
not required to obtain patched transitive packages. The non-force audit-fix
dry run was also not accepted because it proposed a broader Prisma `7.10.0`
upgrade and would have reverted the existing patched `deepmerge-ts` resolution.
Registry inspection confirmed that stable Prisma `7.10.0` still directly
declared vulnerable `mysql2@3.15.3`.

### Remediation

Browserslist was updated normally through its compatible parent range and the
lockfile now resolves `browserslist@4.28.8`. No direct dependency or override
was added. Its related compatible data packages were refreshed by the targeted
update. Because there is no project override to remove, future normal lockfile
maintenance may supersede this version as long as the resolved release remains
outside the vulnerable range.

Prisma remains `7.9.1`. A parent-scoped override changes only Prisma's MySQL2
child dependency:

```json
"prisma": {
  "mysql2": "3.24.2"
}
```

The official stable `mysql2@3.24.2` release supports the project's Node
runtime and is newer than the patched floor of `3.22.0`. The existing
`@prisma/adapter-mariadb -> mariadb@3.5.3` override remains unchanged. Remove
the Prisma/MySQL2 override only when a stable supported Prisma release directly
declares a patched MySQL2 version and the complete clean-install,
Prisma/MariaDB migration, seed, application-read, build, and audit suite passes
without the override.

### Isolated verification and result

Verification used Node.js `26.4.0`, which satisfies Prisma's Node `>=24.0`
engine range and the production runbook's Node 24-or-newer requirement. A
portable MariaDB Community Server `11.4.10` instance was bound only to
`127.0.0.1:33307` with a fresh `chef_security_qa` database. All 10 committed
migrations applied, the foundation seed created 10 baseline allergens, a
second migration deploy reported no pending migrations, and an application
Prisma read returned the 10 seeded records. The exact `npm run build`
prebuild/migration/build lifecycle also passed against this disposable
database. The server was then shut down; no production or shared database was
contacted or modified.

`npm install` and an isolated `npm ci` reproduced the resolved dependency
tree. The workspace clean install was initially blocked because a running
Next process held the Windows SWC binary open, so lockfile reproducibility was
verified in a fresh temporary directory instead of terminating an
owner-controlled process. Lint, TypeScript, focused gallery-ordering and
late-fee QA, direct `next build`, the exact build lifecycle, and diff checks
passed. The existing Node `module.register()` deprecation warning remained;
no new dependency warning or Prisma/MySQL2 connection error appeared.

Final resolutions are `browserslist@4.28.8` and overridden
`prisma@7.9.1 -> mysql2@3.24.2`. Full and production-only npm audits report
zero vulnerabilities, clearing `GHSA-c83g-rgw3-j3cx`,
`GHSA-73wf-gq98-2v4g`, and `GHSA-3f6p-5ww8-9rcr` with no unrelated findings.
