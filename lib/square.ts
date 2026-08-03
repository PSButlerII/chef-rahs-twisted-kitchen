import "server-only";

import { SquareClient, SquareEnvironment } from "square";
import {
  getSquareReadiness,
  requireSquarePaymentReadiness,
} from "@/lib/square-readiness";

export type SquarePublicConfig = {
  enabled: boolean;
  applicationId: string | null;
  locationId: string | null;
  environment: "sandbox" | "production" | "invalid";
  disabledReason: string | null;
};

function readEnvironmentValue(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function getSquarePublicConfig(): SquarePublicConfig {
  const readiness = getSquareReadiness();
  const applicationId = readEnvironmentValue("SQUARE_APPLICATION_ID");
  const locationId = readEnvironmentValue("SQUARE_LOCATION_ID");
  const accessToken = readEnvironmentValue("SQUARE_ACCESS_TOKEN");

  if (!readiness.enabled || !applicationId || !locationId || !accessToken) {
    return {
      enabled: false,
      applicationId: null,
      locationId: null,
      environment: readiness.environment,
      disabledReason: readiness.customerMessage,
    };
  }

  return {
    enabled: true,
    applicationId,
    locationId,
    environment: readiness.environment,
    disabledReason: null,
  };
}

export function getSquareServerConfig() {
  requireSquarePaymentReadiness();
  const publicConfig = getSquarePublicConfig();
  const accessToken = readEnvironmentValue("SQUARE_ACCESS_TOKEN");

  if (
    !publicConfig.enabled ||
    !publicConfig.applicationId ||
    !publicConfig.locationId ||
    !accessToken
  ) {
    throw new Error("Square payment actions are not configured.");
  }

  return {
    ...publicConfig,
    applicationId: publicConfig.applicationId,
    locationId: publicConfig.locationId,
    accessToken,
  };
}

export function createSquareClient() {
  const config = getSquareServerConfig();

  return new SquareClient({
    token: config.accessToken,
    environment:
      config.environment === "production"
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
  });
}

// Reconciliation intentionally ignores the production creation gate. Verified
// webhooks and read-only provider checks must continue during a rollback.
export function getSquareReconciliationConfig() {
  const environment = readEnvironmentValue("SQUARE_ENVIRONMENT");
  const locationId = readEnvironmentValue("SQUARE_LOCATION_ID");
  const accessToken = readEnvironmentValue("SQUARE_ACCESS_TOKEN");
  if (
    (environment !== "sandbox" && environment !== "production") ||
    !locationId ||
    !accessToken
  ) {
    throw new Error("Square reconciliation is not configured.");
  }
  return { environment, locationId, accessToken };
}

export function createSquareReconciliationClient() {
  const config = getSquareReconciliationConfig();
  return new SquareClient({
    token: config.accessToken,
    environment:
      config.environment === "production"
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
  });
}

export function getSquareWebhookConfig() {
  const signatureKey = readEnvironmentValue("SQUARE_WEBHOOK_SIGNATURE_KEY");
  const notificationUrl = readEnvironmentValue(
    "SQUARE_WEBHOOK_NOTIFICATION_URL",
  );

  if (!signatureKey || !notificationUrl) {
    return null;
  }

  return { signatureKey, notificationUrl };
}
