import "dotenv/config";
import path from "node:path";

const reportOnly = process.argv.includes("--report");
const errors = [];
const warnings = [];
const passes = [];

function readEnv(name) {
  return (process.env[name] ?? "").trim();
}

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

function addPass(message) {
  passes.push(message);
}

function isMissingOrPlaceholder(value) {
  return (
    !value ||
    /replace|example\.com|user:password|your-|changeme|placeholder/i.test(value)
  );
}

function requireValue(name, description) {
  const value = readEnv(name);

  if (isMissingOrPlaceholder(value)) {
    addError(
      `${name} is missing or still using a placeholder (${description}).`,
    );
    return "";
  }

  addPass(`${name} is set.`);
  return value;
}

function hostnameLooksLocal(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".local")
  );
}

function requireProductionUrl(name) {
  const value = requireValue(name, "production public URL");

  if (!value) {
    return null;
  }

  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    addError(`${name} must be a valid absolute URL.`);
    return null;
  }

  if (parsed.protocol !== "https:") {
    addError(`${name} must use https:// for production.`);
  }

  if (hostnameLooksLocal(parsed.hostname)) {
    addError(`${name} must not point at localhost or a local-only hostname.`);
  }

  return parsed;
}

const databaseUrl = requireValue(
  "DATABASE_URL",
  "production MySQL/MariaDB URL",
);

if (databaseUrl) {
  try {
    const parsedDatabaseUrl = new URL(databaseUrl);
    const supportedDatabaseProtocols = new Set(["mysql:"]);
    const unsupportedDatabaseProtocols = new Set([
      "postgresql:",
      "postgres:",
      "sqlite:",
      "file:",
    ]);

    if (unsupportedDatabaseProtocols.has(parsedDatabaseUrl.protocol)) {
      addError(
        "DATABASE_URL must use a MySQL/MariaDB-compatible mysql:// connection string, not PostgreSQL, SQLite, or file storage.",
      );
    } else if (!supportedDatabaseProtocols.has(parsedDatabaseUrl.protocol)) {
      addError(
        "DATABASE_URL must use a MySQL/MariaDB-compatible mysql:// connection string.",
      );
    } else {
      addPass("DATABASE_URL uses a MySQL/MariaDB-compatible scheme.");
    }

    if (hostnameLooksLocal(parsedDatabaseUrl.hostname)) {
      addError("DATABASE_URL must not point at localhost for production.");
    }
  } catch {
    addError("DATABASE_URL must be a valid database URL.");
  }
}

const authSecret = requireValue("AUTH_SECRET", "generated Auth.js secret");

if (authSecret && authSecret.length < 32) {
  addError("AUTH_SECRET should be at least 32 characters long.");
}

const appUrl = requireProductionUrl("NEXT_PUBLIC_APP_URL");
const authUrl = requireProductionUrl("AUTH_URL");
const nextAuthUrl = requireProductionUrl("NEXTAUTH_URL");

if (appUrl && authUrl && appUrl.origin !== authUrl.origin) {
  addError("AUTH_URL should use the same origin as NEXT_PUBLIC_APP_URL.");
}

if (appUrl && nextAuthUrl && appUrl.origin !== nextAuthUrl.origin) {
  addError("NEXTAUTH_URL should use the same origin as NEXT_PUBLIC_APP_URL.");
}

requireValue(
  "BUSINESS_TIME_ZONE",
  "business date and weekly menu calculations",
);

const uploadDriver = readEnv("UPLOAD_STORAGE_DRIVER");
const uploadDirectory = readEnv("UPLOAD_FILESYSTEM_DIR");
const uploadPublicBaseUrl = readEnv("NEXT_PUBLIC_UPLOAD_BASE_URL");

if (uploadDriver !== "filesystem") {
  addError(
    'UPLOAD_STORAGE_DRIVER must be "filesystem" for durable admin uploads.',
  );
}

if (!uploadDirectory) {
  addError("UPLOAD_FILESYSTEM_DIR is required for durable admin uploads.");
} else if (
  !path.posix.isAbsolute(uploadDirectory) &&
  !path.win32.isAbsolute(uploadDirectory)
) {
  addError("UPLOAD_FILESYSTEM_DIR must be an absolute path.");
}

if (!uploadPublicBaseUrl) {
  addError(
    "NEXT_PUBLIC_UPLOAD_BASE_URL is required for durable admin uploads.",
  );
} else {
  try {
    const uploadUrl = new URL(uploadPublicBaseUrl);
    if (uploadUrl.protocol !== "https:") {
      addError("NEXT_PUBLIC_UPLOAD_BASE_URL must use HTTPS in production.");
    } else {
      addPass("Durable admin upload storage is configured.");
    }
  } catch {
    addError("NEXT_PUBLIC_UPLOAD_BASE_URL must be a valid URL.");
  }
}

requireValue("RESEND_API_KEY", "production email provider key");

const emailFromAddress = requireValue(
  "EMAIL_FROM_ADDRESS",
  "verified sender address",
);

if (emailFromAddress && /example\.com/i.test(emailFromAddress)) {
  addError("EMAIL_FROM_ADDRESS must use a verified production sender domain.");
}

if (readEnv("EMAIL_DRY_RUN") !== "false") {
  addError("EMAIL_DRY_RUN must be false before production email delivery.");
} else {
  addPass("EMAIL_DRY_RUN is disabled for live delivery.");
}

if (readEnv("EMAIL_PREVIEW_FILES") === "true") {
  addWarning(
    "EMAIL_PREVIEW_FILES is enabled. Keep preview file output disabled in production unless this is intentional.",
  );
}

const stripeValues = [
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
].map((name) => [name, readEnv(name)]);
const configuredStripeValues = stripeValues.filter(([, value]) => value);

if (configuredStripeValues.length > 0) {
  addWarning(
    "Legacy Stripe variables are present, but Stripe is no longer the planned launch provider. Keep online checkout disabled until Square/PayPal integration is implemented.",
  );
} else {
  addPass(
    "Legacy Stripe variables are blank; Square/PayPal automated checkout is future work.",
  );
}

if (!readEnv("OWNER_EMAIL")) {
  if (readEnv("ADMIN_EMAIL")) {
    addWarning(
      "OWNER_EMAIL is not set. ADMIN_EMAIL is supported only by the legacy admin:promote command.",
    );
  } else {
    addWarning(
      "OWNER_EMAIL is not set. Set it before bootstrapping the first owner with npm run owner:promote.",
    );
  }
}

console.log("Production environment check");
console.log("");

for (const message of passes) {
  console.log(`PASS ${message}`);
}

for (const message of warnings) {
  console.warn(`WARN ${message}`);
}

for (const message of errors) {
  console.error(`ERROR ${message}`);
}

console.log("");

if (errors.length > 0) {
  console.error(
    `${errors.length} blocking issue${errors.length === 1 ? "" : "s"} found.`,
  );

  if (reportOnly) {
    console.error("Report-only mode enabled; exiting without failure.");
  } else {
    process.exitCode = 1;
  }
} else {
  console.log("Production environment settings passed the blocking checks.");
}
