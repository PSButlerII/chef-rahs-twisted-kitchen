export const SQUARE_CUSTOMER_UNAVAILABLE_MESSAGE =
  "Online payment is temporarily unavailable. Please try again later.";

export type SquareEnvironment = "sandbox" | "production" | "invalid";

export type SquareReadiness = {
  environment: SquareEnvironment;
  enabled: boolean;
  productionGateEnabled: boolean;
  missingVariables: string[];
  blockingReasons: string[];
  customerMessage: string | null;
  adminMessage: string;
};

const PRODUCTION_WEBHOOK_URL =
  "https://rahstwistedkitchen.com/api/webhooks/square";

function value(name: string) {
  return process.env[name]?.trim() ?? "";
}

function validHttpsUrl(raw: string) {
  try {
    return new URL(raw).protocol === "https:";
  } catch {
    return false;
  }
}

export function getSquareReadiness(): SquareReadiness {
  const rawEnvironment = value("SQUARE_ENVIRONMENT");
  const environment: SquareEnvironment =
    rawEnvironment === "sandbox" || rawEnvironment === "production"
      ? rawEnvironment
      : "invalid";
  const productionGateEnabled =
    value("SQUARE_PRODUCTION_PAYMENTS_ENABLED") === "true";
  const required = [
    "SQUARE_APPLICATION_ID",
    "SQUARE_LOCATION_ID",
    "SQUARE_ACCESS_TOKEN",
  ];
  if (environment === "production") {
    required.push(
      "SQUARE_PRODUCTION_PAYMENTS_ENABLED",
      "SQUARE_CSP_MODE",
      "SQUARE_WEBHOOK_SIGNATURE_KEY",
      "SQUARE_WEBHOOK_NOTIFICATION_URL",
      "NEXT_PUBLIC_APP_URL",
    );
  }
  const missingVariables = required.filter((name) => !value(name));
  const blockingReasons: string[] = [];

  if (environment === "invalid") {
    blockingReasons.push(
      "SQUARE_ENVIRONMENT must be explicitly set to sandbox or production.",
    );
  }
  if (environment === "production" && !productionGateEnabled) {
    blockingReasons.push(
      "SQUARE_PRODUCTION_PAYMENTS_ENABLED is not explicitly true.",
    );
  }
  if (missingVariables.length) {
    blockingReasons.push(
      `Missing required variables: ${missingVariables.join(", ")}.`,
    );
  }

  if (environment === "production") {
    const webhookUrl = value("SQUARE_WEBHOOK_NOTIFICATION_URL");
    if (webhookUrl && webhookUrl !== PRODUCTION_WEBHOOK_URL) {
      blockingReasons.push(
        `SQUARE_WEBHOOK_NOTIFICATION_URL must exactly match ${PRODUCTION_WEBHOOK_URL}.`,
      );
    }
    const appUrl = value("NEXT_PUBLIC_APP_URL");
    if (appUrl && !validHttpsUrl(appUrl)) {
      blockingReasons.push(
        "NEXT_PUBLIC_APP_URL must be a valid HTTPS URL in production.",
      );
    }
    if (value("SQUARE_CSP_MODE") !== "production") {
      blockingReasons.push(
        "SQUARE_CSP_MODE must be explicitly set to production after CSP rehearsal approval.",
      );
    }
  }

  const enabled = blockingReasons.length === 0;
  return {
    environment,
    enabled,
    productionGateEnabled,
    missingVariables,
    blockingReasons,
    customerMessage: enabled ? null : SQUARE_CUSTOMER_UNAVAILABLE_MESSAGE,
    adminMessage: enabled
      ? environment === "production"
        ? "Production Square payments are unblocked by configuration."
        : "Square Sandbox payment actions are available."
      : `Square payment actions are blocked: ${blockingReasons.join(" ")}`,
  };
}

export function requireSquarePaymentReadiness() {
  const readiness = getSquareReadiness();
  if (!readiness.enabled) throw new SquareReadinessError(readiness);
  return readiness;
}

export class SquareReadinessError extends Error {
  constructor(public readonly readiness: SquareReadiness) {
    super(readiness.adminMessage);
    this.name = "SquareReadinessError";
  }
}
